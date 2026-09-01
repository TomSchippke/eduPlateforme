import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function PATCH(request: Request, context: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { groupeId } = await context.params;

  try {
    const body = await request.json();
    const parsed = z.object({ 
      name: z.string().min(1).optional(),
      focusConcepts: z.array(z.string()).optional(),
      availableTags: z.array(z.string()).optional(),
    }).safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (parsed.data.name !== undefined) dataToUpdate.name = parsed.data.name;
    if (parsed.data.focusConcepts !== undefined) dataToUpdate.focusConcepts = parsed.data.focusConcepts;
    if (parsed.data.availableTags !== undefined) dataToUpdate.availableTags = parsed.data.availableTags;

    const groupe = await prisma.groupe.updateMany({
      where: { id: groupeId, profId: user.id },
      data: dataToUpdate,
    });

    if (groupe.count === 0) {
      return NextResponse.json({ error: "Groupe non trouvé ou accès refusé" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PATCH groupe:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { groupeId } = await context.params;

  try {
    // Verifier que le groupe appartient bien au prof
    const groupe = await prisma.groupe.findUnique({
      where: { id: groupeId },
    });

    if (!groupe || groupe.profId !== user.id) {
      return NextResponse.json({ error: "Groupe non trouvé ou accès refusé" }, { status: 404 });
    }

    await prisma.groupe.delete({
      where: { id: groupeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE groupe:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
