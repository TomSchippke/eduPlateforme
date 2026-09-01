import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ coursId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { coursId } = await params;

  const cours = await prisma.coursPlanifie.findUnique({
    where: { id: coursId },
    include: { groupe: true }
  });

  if (!cours || cours.groupe.profId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = z.object({
    room: z.string().nullable().optional(),
    isCancelled: z.boolean().optional(),
    isDS: z.boolean().optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const updatedCours = await prisma.coursPlanifie.update({
    where: { id: coursId },
    data: {
      ...parsed.data,
      isException: true, // Mark as modified
    },
  });

  return NextResponse.json(updatedCours);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ coursId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { coursId } = await params;

  const cours = await prisma.coursPlanifie.findUnique({
    where: { id: coursId },
    include: { groupe: true }
  });

  if (!cours || cours.groupe.profId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.coursPlanifie.delete({
    where: { id: coursId },
  });

  return NextResponse.json({ success: true });
}
