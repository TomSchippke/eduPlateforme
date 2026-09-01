import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupeId: string }> }
) {
  const { groupeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as {
    id: string;
    role: string;
  };
  
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { eleveId, chapitreId, score } = body;

    if (!eleveId || !chapitreId || score === undefined) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    if (score < 1 || score > 5) {
      return NextResponse.json({ error: "Score invalide (doit être entre 1 et 5)" }, { status: 400 });
    }

    // Verify prof owns the group
    const groupe = await prisma.groupe.findFirst({
      where: {
        id: groupeId,
        profId: user.id
      }
    });

    if (!groupe) {
      return NextResponse.json({ error: "Groupe non trouvé ou accès refusé" }, { status: 404 });
    }

    // Ensure student is in the group
    const membership = await prisma.groupeMembership.findFirst({
      where: {
        groupeId: groupeId,
        eleveId: eleveId
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Élève non trouvé dans le groupe" }, { status: 404 });
    }

    // Create a manual history entry
    const historyEntry = {
      date: new Date().toISOString(),
      evaluation: "MANUAL",
      oldLevel: 0, // Not critical for manual override tracking
      newLevel: score,
      type: "MANUAL"
    };

    // Upsert the level
    await prisma.studentChapterLevel.upsert({
      where: {
        eleveId_chapitreId: {
          eleveId: eleveId,
          chapitreId: chapitreId
        }
      },
      update: {
        level: score,
        updatedAt: new Date(), // Reset decay
      },
      create: {
        eleveId: eleveId,
        chapitreId: chapitreId,
        level: score,
        history: [historyEntry] as any
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating Elo:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
