import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    groupeIds: z.array(z.string()).min(1),
    newSchoolYear: z.string().min(1),
  }).safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { groupeIds, newSchoolYear } = parsed.data;

  // Verify all groups belong to this tenant
  const groupes = await prisma.groupe.findMany({
    where: { id: { in: groupeIds }, profId: user.tenantId, isArchived: false },
    include: {
      chapitres: { orderBy: { order: "asc" }, select: { title: true, order: true } },
    },
  });

  if (groupes.length !== groupeIds.length) {
    return NextResponse.json({ error: "Groupes invalides" }, { status: 400 });
  }

  // Archive old groups and create new ones
  for (const groupe of groupes) {
    // Archive
    await prisma.groupe.update({
      where: { id: groupe.id },
      data: { isArchived: true },
    });

    // Create new group with copied chapters
    await prisma.groupe.create({
      data: {
        profId: user.tenantId,
        name: groupe.name,
        schoolYear: newSchoolYear,
        chapitres: {
          create: groupe.chapitres.map((ch) => ({
            title: ch.title,
            order: ch.order,
          })),
        },
      },
    });
  }

  return NextResponse.json({ message: "Transition effectuée" });
}
