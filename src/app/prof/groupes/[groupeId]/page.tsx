import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { GroupeDetail } from "@/components/prof/groupe-detail";

export default async function GroupeDetailPage({
  params,
}: {
  params: Promise<{ groupeId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; tenantId: string; role: string };
  const { groupeId } = await params;

  const groupe = await prisma.groupe.findFirst({
    where: { 
      id: groupeId, 
      OR: [
        { profId: user.id },
        { memberships: { some: { eleveId: user.id } } }
      ]
    },
    include: {
      chapitres: {
        orderBy: { order: "asc" },
        include: {
          documents: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              fileName: true,
              fileType: true,
              indexStatus: true,
              indexError: true,
              fileSize: true,
              visibility: true,
              docType: true,
              keywords: true,
              createdAt: true,
            },
          },
        },
      },
      memberships: {
        include: {
          eleve: {
            select: { id: true, firstName: true, lastName: true, identifiant: true, isActive: true },
          },
        },
      },
      annonces: {
        orderBy: { publishedAt: "desc" },
        take: 10,
      },
      cours: {
        where: { dateTime: { gte: new Date() } },
        orderBy: { dateTime: "asc" },
        take: 10,
      },
      datesDS: {
        orderBy: { date: "asc" },
        include: {
          chapitres: {
            include: { chapitre: { select: { id: true, title: true } } },
          },
        },
      },
      coursTemplates: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!groupe) notFound();

  // Get all students for this tenant (for the add student picker)
  const allEleves = await prisma.user.findMany({
    where: { 
      tenantId: user.tenantId, 
      role: { in: ["ELEVE", "PROF"] }, 
      isActive: true,
      id: { not: user.id }
    },
    select: { id: true, firstName: true, lastName: true, identifiant: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const formattedGroupe = {
    ...groupe,
    chapitres: groupe.chapitres.map(c => ({
      ...c,
      documents: c.documents.map(d => ({
        ...d,
        createdAt: d.createdAt.toISOString()
      }))
    }))
  };

  return <GroupeDetail groupe={formattedGroupe as any} allEleves={allEleves} />;
}
