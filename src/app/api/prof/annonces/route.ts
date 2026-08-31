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
    groupeId: z.string(),
    title: z.string().min(1),
    content: z.string().min(1),
  }).safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const groupe = await prisma.groupe.findFirst({
    where: { id: parsed.data.groupeId, profId: user.tenantId },
  });
  if (!groupe) return NextResponse.json({ error: "Groupe non trouvé" }, { status: 404 });

  const annonce = await prisma.annonce.create({
    data: { groupeId: parsed.data.groupeId, title: parsed.data.title, content: parsed.data.content },
  });

  return NextResponse.json(annonce, { status: 201 });
}
