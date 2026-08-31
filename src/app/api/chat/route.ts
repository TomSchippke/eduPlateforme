import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { searchChunks, buildContext, formatCitations, getRandomChunks } from "@/lib/ai/rag";
import { getExpliqueMoiPrompt, getReviseMoiPrompt } from "@/lib/ai/prompts";
import { chat, type LLMMessage } from "@/lib/ai/llm";
import { incrementChatUsage } from "@/lib/utils/quota";
import { countWords } from "@/lib/utils";
import { z } from "zod";
import { calculateDecayedLevel, computeNextLevel, type QuestionType, type AnswerEvaluation } from "@/lib/level/calculator";

const chatSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(["EXPLIQUE", "REVISE"]),
  groupeId: z.string(),
  chapitreId: z.string().optional(),
  dateDSId: z.string().optional(),
  chapitresIdsRevise: z.array(z.string()).optional(),
  conversationId: z.string().nullable().optional(),
  difficultyMode: z.enum(["AUTO", "FACILE", "MOYEN", "AVANCE"]).optional(),
  exerciseTypes: z.array(z.string()).optional(),
  selectedKeyword: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as {
    id: string;
    tenantId: string;
    role: string;
  };
  if (user.role !== "ELEVE")
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { message, mode, groupeId, chapitreId, dateDSId, chapitresIdsRevise, conversationId, difficultyMode, exerciseTypes, selectedKeyword } =
      parsed.data;

    // Validate word count (backend revalidation)
    if (countWords(message) > 50) {
      return NextResponse.json(
        { error: "Message limité à 50 mots maximum" },
        { status: 400 }
      );
    }

    // Check quota
    const allowed = await incrementChatUsage(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Quota de chats épuisé pour aujourd'hui" },
        { status: 429 }
      );
    }

    // Verify group membership
    const membership = await prisma.groupeMembership.findFirst({
      where: { eleveId: user.id, groupeId },
      include: { groupe: { select: { profId: true, isArchived: true } } },
    });

    if (!membership || membership.groupe.isArchived) {
      return NextResponse.json(
        { error: "Groupe non trouvé ou archivé" },
        { status: 404 }
      );
    }

    // Determine which chapters to search
    let chapitreIds: string[] = [];
    let dsKeywords: string[] = [];

    if (mode === "EXPLIQUE") {
      if (chapitreId) {
        // Verify chapter belongs to this group
        const ch = await prisma.chapitre.findFirst({
          where: { id: chapitreId, groupeId },
        });
        if (ch) chapitreIds = [ch.id];
      }
      if (chapitreIds.length === 0) {
        // All chapters of the group
        const chs = await prisma.chapitre.findMany({
          where: { groupeId },
          select: { id: true },
        });
        chapitreIds = chs.map((c) => c.id);
      }
    } else {
      // REVISE mode
      if (dateDSId) {
        // DS-scoped: only selected chapters
        const ds = await prisma.dateDS.findFirst({
          where: { id: dateDSId, groupeId },
          include: {
            chapitres: { select: { chapitreId: true } },
          },
        });
        if (ds) {
          chapitreIds = ds.chapitres.map((c) => c.chapitreId);
          dsKeywords = ds.keywords || [];
        }
      } else if (chapitresIdsRevise && Array.isArray(chapitresIdsRevise) && chapitresIdsRevise.length > 0) {
        // Manually selected chapters for revision
        chapitreIds = chapitresIdsRevise;
      }

      if (chapitreIds.length === 0) {
        // General: all chapters of the group
        const chs = await prisma.chapitre.findMany({
          where: { groupeId },
          select: { id: true },
        });
        chapitreIds = chs.map((c) => c.id);
      }
    }

    // Get or create conversation
    let conversation: any;
    let groupeName = "Nom du Groupe Indisponible"; // default fallback
    let focusConcepts: string[] = [];
    let availableTags: string[] = [];
    let teacherNote: string | null = null;
    let passions: string[] = [];

    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passions: true } });
    if (dbUser && dbUser.passions && dbUser.passions.length > 0) {
      if (mode === "REVISE") {
        // Une chance sur deux d'utiliser une passion, sinon on laisse général
        if (Math.random() < 0.6) {
          const randomPassion = dbUser.passions[Math.floor(Math.random() * dbUser.passions.length)];
          passions = [randomPassion];
        }
      } else {
        passions = dbUser.passions;
      }
    }

    if (groupeId) {
      const groupe = await prisma.groupe.findUnique({
        where: { id: groupeId },
        select: { name: true, focusConcepts: true, availableTags: true }
      });
      if (groupe) {
        groupeName = groupe.name;
        focusConcepts = [...groupe.focusConcepts];
        availableTags = [...groupe.availableTags];
      }

      const membership = await prisma.groupeMembership.findUnique({
        where: { eleveId_groupeId: { eleveId: user.id, groupeId } }
      });
      if (membership) {
        teacherNote = membership.teacherNote;
      }
    }

    if (conversationId) {
      conversation = (await prisma.conversation.findFirst({
        where: { id: conversationId, eleveId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
        },
      })) as any;
    }

    if (!conversation) {
      conversation = (await prisma.conversation.create({
        data: {
          eleveId: user.id,
          groupeId,
          mode,
          chapitreId: mode === "EXPLIQUE" ? chapitreId || null : null,
          dateDSId: mode === "REVISE" ? dateDSId || null : null,
          chapitresReviseIds: mode === "REVISE" && chapitresIdsRevise ? chapitresIdsRevise : [],
          difficultyLevel: 3, // fallback start
          difficultyMode: difficultyMode || "AUTO",
          consecutiveFails: 0,
          notionsToReview: [],
          exerciseTypes: exerciseTypes && exerciseTypes.length > 0 ? exerciseTypes : ["EXERCICE", "QCM", "OPEN"],
          selectedKeyword: selectedKeyword || null,
        } as any,
        include: { messages: true },
      })) as any;
    }

    let chunks: any[] = [];
    let citations: any[] = [];
    let context = "";

    let nextChapterId: string | null = null;
    let nextQuestionType: QuestionType | null = null;
    let chapterStreak = 0;
    let questionTypeStreak = 0;
    let nextQuestionSubtype: string | null = null;
    let currentLevel = 3.0; // fallback

    if (mode === "EXPLIQUE") {
      chunks = await searchChunks(message, chapitreIds);
      context = buildContext(chunks);
      citations = formatCitations(chunks);
    } else {
      // REVISE mode deterministic selection
      let dsKeywords: string[] = [];
      let chapitreIdsToRevise: string[] = [];
      if (conversation.dateDSId) {
        const d = await prisma.dateDS.findUnique({
          where: { id: conversation.dateDSId },
          include: { chapitres: { include: { chapitre: true } } },
        });
        if (d) {
          chapitreIdsToRevise = d.chapitres.map((c) => c.chapitreId);
          dsKeywords = d.keywords || [];
        }
      } else if (conversation.chapitresReviseIds && Array.isArray(conversation.chapitresReviseIds) && conversation.chapitresReviseIds.length > 0) {
        chapitreIdsToRevise = conversation.chapitresReviseIds as string[];
      } else if (groupeId) {
        const chs = await prisma.chapitre.findMany({ where: { groupeId }, select: { id: true, focusConcepts: true, availableTags: true } });
        chapitreIdsToRevise = chs.map((c) => c.id);
      }

      if (chapitreIdsToRevise.length === 0) {
        return NextResponse.json({ error: "Aucun chapitre sélectionné pour la révision." }, { status: 400 });
      }

      const validChapters = chapitreIdsToRevise;

      if (!conversation.currentChapterId || validChapters.length <= 1) {
        nextChapterId = validChapters[Math.floor(Math.random() * validChapters.length)];
        chapterStreak = 1;
      } else {
        const pStay = conversation.chapterStreak < 2 ? 1 : Math.max(0, 1 - (conversation.chapterStreak / 4));
        if (Math.random() < pStay && validChapters.includes(conversation.currentChapterId)) {
          nextChapterId = conversation.currentChapterId;
          chapterStreak = conversation.chapterStreak + 1;
        } else {
          const otherChaps = validChapters.filter(id => id !== conversation.currentChapterId);
          nextChapterId = otherChaps.length > 0 ? otherChaps[Math.floor(Math.random() * otherChaps.length)] : conversation.currentChapterId;
          chapterStreak = 1;
        }
      }

      const baseTypes = conversation.exerciseTypes && conversation.exerciseTypes.length > 0
        ? conversation.exerciseTypes as QuestionType[]
        : ['QCM', 'OPEN', 'EXERCICE'] as QuestionType[];
      const questionTypes: QuestionType[] = baseTypes;

      if (!conversation.currentQuestionType) {
        nextQuestionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        questionTypeStreak = 1;
      } else {
        const pStay = Math.max(0, 1 - (conversation.questionTypeStreak / 3));
        if (Math.random() < pStay && questionTypes.includes(conversation.currentQuestionType as QuestionType)) {
          nextQuestionType = conversation.currentQuestionType as QuestionType;
          questionTypeStreak = conversation.questionTypeStreak + 1;
        } else {
          const otherTypes = questionTypes.filter(t => t !== conversation.currentQuestionType);
          nextQuestionType = otherTypes.length > 0 ? otherTypes[Math.floor(Math.random() * otherTypes.length)] : questionTypes[0];
          questionTypeStreak = 1;
        }
      }

      if (nextQuestionType === 'EXERCICE') {
        const hasExo = await prisma.document.findFirst({
          where: { chapitreId: nextChapterId as string, docType: 'EXERCICES', visibility: { in: ['BOTH', 'AI_ONLY'] }, indexStatus: 'INDEXED' }
        });
        nextQuestionSubtype = (hasExo && Math.random() < 0.5) ? 'ADAPT_EXISTING' : 'CREATE_NEW';
      }

      let newChunks: any[] = [];

      if (conversation.selectedKeyword) {
        if (nextQuestionSubtype === 'ADAPT_EXISTING') {
          const courseChunks = await searchChunks(conversation.selectedKeyword, [nextChapterId as string], { topK: 2 });
          const exoChunks = await searchChunks(conversation.selectedKeyword + " exercice", [nextChapterId as string], { topK: 1 });
          newChunks = [...courseChunks, ...exoChunks];
        } else if (nextQuestionSubtype === 'CREATE_NEW') {
          newChunks = await searchChunks(conversation.selectedKeyword, [nextChapterId as string], { topK: 3 });
        } else {
          newChunks = await searchChunks(conversation.selectedKeyword, [nextChapterId as string], { topK: 2 });
        }
      } else {
        if (nextQuestionSubtype === 'ADAPT_EXISTING') {
          const courseChunks = await getRandomChunks([nextChapterId as string], 2, ['COURS', 'AUTRE']);
          const exoChunks = await getRandomChunks([nextChapterId as string], 1, ['EXERCICES']);
          newChunks = [...courseChunks, ...exoChunks];
        } else if (nextQuestionSubtype === 'CREATE_NEW') {
          newChunks = await getRandomChunks([nextChapterId as string], 3, ['COURS', 'AUTRE']);
        } else {
          newChunks = await getRandomChunks([nextChapterId as string], 2, ['COURS', 'AUTRE']);
        }
      }

      const lastQuestionChunks = conversation.lastQuestionChunks
        ? (typeof conversation.lastQuestionChunks === 'string' ? JSON.parse(conversation.lastQuestionChunks) : conversation.lastQuestionChunks)
        : [];

      context = `[CONTEXTE POUR CORRIGER LA RÉPONSE PRÉCÉDENTE]\n${buildContext(lastQuestionChunks as any)}\n\n[CONTEXTE POUR CRÉER LA PROCHAINE QUESTION]\n${buildContext(newChunks)}`;
      citations = formatCitations(newChunks);
      chunks = newChunks;

      // Si le chapitre est choisi, on fusionne les tags et concepts
      if (nextChapterId) {
        const ch = await prisma.chapitre.findUnique({ where: { id: nextChapterId }, select: { focusConcepts: true, availableTags: true } });
        if (ch) {
          focusConcepts = Array.from(new Set([...focusConcepts, ...ch.focusConcepts]));
          availableTags = Array.from(new Set([...availableTags, ...ch.availableTags]));
        }
      }

      // Fetch level
      const studentLevel = await prisma.studentChapterLevel.findUnique({
        where: { eleveId_chapitreId: { eleveId: user.id, chapitreId: nextChapterId as string } }
      });
      if (studentLevel) {
        currentLevel = calculateDecayedLevel(studentLevel.level, studentLevel.updatedAt);
      } else {
        // Init difficulty mode
        if (conversation.difficultyMode === "AVANCE") currentLevel = 4.0;
        else if (conversation.difficultyMode === "MOYEN") currentLevel = 2.5;
        else if (conversation.difficultyMode === "FACILE") currentLevel = 1.5;
        else currentLevel = 3.0; // AUTO fallback
      }
    }

    // Build prompt
    let systemPrompt: string;
    if (mode === "EXPLIQUE") {
      systemPrompt = getExpliqueMoiPrompt(context, groupeName, teacherNote, focusConcepts, availableTags, passions);
    } else {
      systemPrompt = getReviseMoiPrompt(
        context,
        groupeName,
        currentLevel,
        nextQuestionType as string,
        nextQuestionSubtype,
        conversation.notionsToReview as string[],
        conversation.consecutiveFails,
        dsKeywords,
        teacherNote,
        focusConcepts,
        availableTags,
        passions
      );
    }

    // Build message history
    const history: LLMMessage[] = conversation.messages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    history.push({ role: "user", content: message });

    // Call LLM
    const response = await chat(systemPrompt, history);

    let cleanedResponse = response;

    if (mode === "EXPLIQUE") {
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);

        // Log mistake if present
        if (data.correction && data.correction.est_correct === false && data.correction.error_type) {
          await prisma.studentMistakeLog.create({
            data: {
              eleveId: user.id,
              chapitreId: conversation.currentChapterId,
              conversationId: conversation.id,
              errorType: data.correction.error_type,
              tags: Array.isArray(data.correction.error_tags) ? data.correction.error_tags : [],
            }
          });
        }

        if (data.trouve_dans_cours) {
          cleanedResponse = data.explication;
          if (data.exemple_hors_cours) {
            cleanedResponse += `\n\n**Pour l'illustrer autrement** : ${data.exemple_hors_cours}`;
          }
          if (data.mini_question) {
            cleanedResponse += `\n\n**Question**: ${data.mini_question}`;
          }
        } else {
          cleanedResponse = data.message_si_non_trouve || "Désolé, je n'ai pas pu trouver cela dans ton cours.";
          if (data.explication) {
            cleanedResponse = data.explication;
          }
        }

        if (data.correction) {
          const isCorrect = data.correction.est_correct;
          let correctionText = "";
          if (isCorrect === true) correctionText = "✅ **Correct !**";
          else if (isCorrect === false) correctionText = "❌ **Incorrect.**";
          else correctionText = "💡 **Indication :**";

          // Prepend the correction to the main explication
          cleanedResponse = `${correctionText}\n\n${cleanedResponse}`;
        }
      } catch (e) {
        console.error("Failed to parse EXPLIQUE JSON:", e);
        // cleanedResponse remains the raw response
      }
    } else if (mode === "REVISE") {
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const data = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);

        let isCorrectAnswer: boolean | null = false;

        if (data.correction) {
          isCorrectAnswer = data.correction.est_correct;
        }

        let evaluation: AnswerEvaluation;
        if (isCorrectAnswer === true) {
          evaluation = "CORRECT";
        } else if (isCorrectAnswer === false) {
          evaluation = "INCORRECT";
        } else {
          evaluation = "PARTIAL"; // Je ne sais pas / indice
        }

        let newFails = conversation.consecutiveFails;
        if (evaluation === "CORRECT") {
          newFails = 0;
        } else if (evaluation === "INCORRECT") {
          newFails += 1;
          // Log the mistake if error metadata is present
          if (data.correction) {
            if (data.correction.error_type) {
              await prisma.studentMistakeLog.create({
                data: {
                  eleveId: user.id,
                  chapitreId: conversation.currentChapterId,
                  conversationId: conversation.id,
                  errorType: data.correction.error_type,
                  tags: Array.isArray(data.correction.error_tags) ? data.correction.error_tags : [],
                }
              });
            }
            if (data.correction.flashcard_a_creer) {
              await prisma.flashcard.create({
                data: {
                  eleveId: user.id,
                  chapitreId: conversation.currentChapterId,
                  question: data.correction.flashcard_a_creer.question,
                  reponse: data.correction.flashcard_a_creer.reponse,
                }
              });
            }
          }
        }

        const newNotions = [...(conversation.notionsToReview as string[])];
        if (data.notion_a_revoir && !newNotions.includes(data.notion_a_revoir)) {
          newNotions.push(data.notion_a_revoir);
        }

        // Update Level
        if (conversation.currentChapterId) {
          const prevLevelRow = await prisma.studentChapterLevel.findUnique({
            where: { eleveId_chapitreId: { eleveId: user.id, chapitreId: conversation.currentChapterId } }
          });

          const prevLvl = prevLevelRow ? calculateDecayedLevel(prevLevelRow.level, prevLevelRow.updatedAt) : 3.0;
          const { newLevel, newHistory } = computeNextLevel(
            prevLvl,
            "REVISE",
            conversation.currentQuestionType as QuestionType,
            evaluation,
            prevLevelRow && prevLevelRow.history ? prevLevelRow.history as any : []
          );

          await prisma.studentChapterLevel.upsert({
            where: { eleveId_chapitreId: { eleveId: user.id, chapitreId: conversation.currentChapterId } },
            update: { level: newLevel, history: newHistory as any },
            create: { eleveId: user.id, chapitreId: conversation.currentChapterId, level: newLevel, history: newHistory as any }
          });
        }

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            currentChapterId: nextChapterId,
            chapterStreak,
            currentQuestionType: nextQuestionType,
            questionTypeStreak,
            lastQuestionChunks: chunks,
            consecutiveFails: newFails,
            notionsToReview: newNotions,
          },
        });

        // Format the output
        cleanedResponse = "";
        if (data.intro) {
          cleanedResponse += `${data.intro}\n\n`;
        }

        if (data.correction) {
          const isCorrect = data.correction.est_correct;
          if (isCorrect === true) cleanedResponse += "✅ **Correct !**\n\n";
          else if (isCorrect === false) cleanedResponse += "❌ **Incorrect.**\n\n";
          else cleanedResponse += "💡 **Indication :**\n\n";

          cleanedResponse += `${data.correction.explication}\n\n`;
        }

        if (data.question) {
          cleanedResponse += `**Question / Énoncé** : ${data.question.enonce}\n\n`;
          if (data.question.choix && Array.isArray(data.question.choix)) {
            const labels = ["A", "B", "C", "D"];
            data.question.choix.forEach((choix: string, i: number) => {
              const cleanChoix = choix.replace(/^[A-Da-d]\)\s*/, "").replace(/^[A-Da-d]\.\s*/, "").trim();
              cleanedResponse += `${labels[i] || "•"}) ${cleanChoix}\n`;
            });
          }
        }

        if (data.resume_session) {
          cleanedResponse += `📊 **Résumé de la session**\n\n`;
          cleanedResponse += `- Questions posées : ${data.resume_session.questions_posees}\n`;
          cleanedResponse += `- Bonnes réponses : ${data.resume_session.bonnes_reponses}\n`;
          cleanedResponse += `- Notions à revoir : ${data.resume_session.notions_a_revoir.join(", ")}\n\n`;
          cleanedResponse += `💡 **Conseil** : ${data.resume_session.conseil}`;
        }

        let chapterTitle = null;
        if (nextChapterId) {
          const chapInfo = await prisma.chapitre.findUnique({ where: { id: nextChapterId }, select: { title: true } });
          if (chapInfo) chapterTitle = chapInfo.title;
        }
      } catch (e) {
        console.error("Failed to parse REVISE JSON:", e);
        // Fallback to raw response
      }
    }

    let finalChapterTitle = null;
    if (nextChapterId) {
      const chapInfo = await prisma.chapitre.findUnique({ where: { id: nextChapterId }, select: { title: true } });
      if (chapInfo) finalChapterTitle = chapInfo.title;
    }

    // Save messages
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: "user",
          content: message,
        },
        {
          conversationId: conversation.id,
          role: "assistant",
          content: cleanedResponse,
          sourceCitations: citations.length > 0 ? citations : undefined,
        },
      ],
    });

    return NextResponse.json({
      content: cleanedResponse,
      citations: citations.length > 0 ? citations : undefined,
      conversationId: conversation.id,
      chapterName: finalChapterTitle,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Erreur serveur. Veuillez réessayer." },
      { status: 500 }
    );
  }
}
