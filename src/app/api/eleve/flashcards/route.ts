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

    return NextResponse.json(flashcards);
  } catch (error) {
    console.error("Flashcards GET error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
