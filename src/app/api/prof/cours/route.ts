import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    groupeId: z.string(),
    title: z.string().min(1),
    dateTime: z.string(),
    room: z.string().nullable().optional(),
  }).safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const groupe = await prisma.groupe.findFirst({
    where: { id: parsed.data.groupeId, profId: user.id },
  });
  if (!groupe) return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });

  const cours = await prisma.coursPlanifie.create({
    data: {
      groupeId: parsed.data.groupeId,
      title: parsed.data.title,
      dateTime: new Date(parsed.data.dateTime),
      room: parsed.data.room,
    },
  });

  return NextResponse.json(cours, { status: 201 });
}
