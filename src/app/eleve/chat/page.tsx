import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; tenantId: string; firstName: string };

  // Get student's active groups with their chapters and DS dates
  const memberships = await prisma.groupeMembership.findMany({
    where: { 
      eleveId: user.id,
      groupe: { isArchived: false }
    },
    include: {
      groupe: {
        include: {
          prof: { select: { lastName: true, title: true } },
          chapitres: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, focusConcepts: true },
          },
          datesDS: {
            where: { date: { gte: new Date() } },
            orderBy: { date: "asc" },
            include: {
              chapitres: {
                include: { chapitre: { select: { id: true, title: true } } },
              },
            },
          },
        },
      },
    },
  });

  const groupes = memberships
    .filter((m) => m.groupe)
    .map((m) => ({
      id: m.groupe.id,
      name: `${m.groupe.name} - ${m.groupe.prof.title} ${m.groupe.prof.lastName}`,
      chapitres: m.groupe.chapitres,
      datesDS: m.groupe.datesDS.map((ds) => ({
        id: ds.id,
        title: ds.title,
        date: ds.date.toISOString(),
        keywords: ds.keywords,
        chapitreIds: ds.chapitres.map((c) => c.chapitre.id),
      })),
    }));

  // Get today's quota
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultQuota = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultQuota: true },
  });

  let quota = await prisma.quotaChat.findUnique({
    where: { eleveId_date: { eleveId: user.id, date: today } },
  });

  if (!quota) {
    quota = await prisma.quotaChat.create({
      data: {
        eleveId: user.id,
        date: today,
        chatsUsed: 0,
        chatsMax: defaultQuota?.defaultQuota ?? 10,
        bonusChats: 0,
      },
    });
  }

  const remaining = quota.chatsMax + quota.bonusChats - quota.chatsUsed;

  return (
    <ChatInterface
      groupes={groupes}
      quotaRemaining={remaining}
      quotaMax={quota.chatsMax + quota.bonusChats}
      userId={user.id}
      identifiant={(session.user as any).identifiant}
    />
  );
}
