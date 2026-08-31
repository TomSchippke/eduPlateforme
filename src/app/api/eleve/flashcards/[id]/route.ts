import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  if (user.role !== "ELEVE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const flashcard = await prisma.flashcard.findUnique({
      where: { id },
    });

    if (!flashcard || flashcard.eleveId !== user.id) {
      return NextResponse.json(
        { error: "Flashcard non trouvée ou non autorisée" },
        { status: 404 }
      );
    }

    await prisma.flashcard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE flashcard:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
