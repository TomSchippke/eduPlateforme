import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ELEVE") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = session.user as { id: string };

    const flashcards = await prisma.flashcard.findMany({
      where: { eleveId: user.id },
      include: {
        chapitre: { select: { title: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const memberships = await prisma.groupeMembership.findMany({
      where: { 
        eleveId: user.id,
        groupe: { isArchived: false }
      },
      include: {
        groupe: {
          select: { id: true, name: true }
        }
      }
    });

    const groupes = memberships
      .filter((m) => m.groupe)
      .map((m) => m.groupe);

    return NextResponse.json({ flashcards, groupes });
  } catch (error) {
    console.error("Flashcards GET error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
