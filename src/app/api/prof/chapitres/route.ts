import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Create chapitre
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    groupeId: z.string(),
    title: z.string().min(1),
    order: z.number().optional(),
    focusConcepts: z.array(z.string()).optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // Verify groupe belongs to this tenant
  const groupe = await prisma.groupe.findFirst({
    where: { id: parsed.data.groupeId, profId: user.id },
  });

  if (!groupe) {
    return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });
  }

  // Get next order
  const maxOrder = await prisma.chapitre.findFirst({
    where: { groupeId: parsed.data.groupeId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const chapitre = await prisma.chapitre.create({
    data: {
      groupeId: parsed.data.groupeId,
      title: parsed.data.title,
      order: parsed.data.order ?? (maxOrder?.order ?? 0) + 1,
      focusConcepts: parsed.data.focusConcepts ?? [],
    },
  });

  return NextResponse.json(chapitre, { status: 201 });
}
