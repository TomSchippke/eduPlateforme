import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = z.object({
      chapitres: z.array(
        z.object({
          id: z.string(),
          order: z.number().int(),
        })
      ),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { chapitres } = parsed.data;

    // Verify all chapitres belong to groups owned by the prof
    const dbChapitres = await prisma.chapitre.findMany({
      where: { id: { in: chapitres.map(c => c.id) } },
      include: { groupe: { select: { profId: true } } },
    });

    const allValid = dbChapitres.every((c) => c.groupe.profId === user.id);
    if (!allValid || dbChapitres.length !== chapitres.length) {
      return NextResponse.json({ error: "Chapitres non trouvés ou accès refusé" }, { status: 404 });
    }

    // Execute bulk update using transaction
    await prisma.$transaction(
      chapitres.map((c) =>
        prisma.chapitre.update({
          where: { id: c.id },
          data: { order: c.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PUT chapitres/reorder:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
