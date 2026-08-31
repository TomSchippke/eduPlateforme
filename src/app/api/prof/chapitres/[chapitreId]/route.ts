import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function PATCH(request: Request, context: { params: Promise<{ chapitreId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { chapitreId } = await context.params;

  try {
    const body = await request.json();
    const parsed = z.object({ title: z.string().min(1) }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Titre invalide" }, { status: 400 });
    }

    const chapitre = await prisma.chapitre.findUnique({
      where: { id: chapitreId },
      include: { groupe: { select: { profId: true } } },
    });

    if (!chapitre || chapitre.groupe.profId !== user.tenantId) {
      return NextResponse.json({ error: "Chapitre non trouvé ou accès refusé" }, { status: 404 });
    }

    await prisma.chapitre.update({
      where: { id: chapitreId },
      data: { title: parsed.data.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PATCH chapitre:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ chapitreId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { chapitreId } = await context.params;

  try {
    const chapitre = await prisma.chapitre.findUnique({
      where: { id: chapitreId },
      include: { groupe: { select: { profId: true } } },
    });

    if (!chapitre || chapitre.groupe.profId !== user.tenantId) {
      return NextResponse.json({ error: "Chapitre non trouvé ou accès refusé" }, { status: 404 });
    }

    await prisma.chapitre.delete({
      where: { id: chapitreId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE chapitre:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
