import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  if (user.role !== "ELEVE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultQuota: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Upsert the quota to ensure it exists, and set hasRequestedMore to true
    await prisma.quotaChat.upsert({
      where: { eleveId_date: { eleveId: user.id, date: today } },
      update: { hasRequestedMore: true } as any,
      create: {
        eleveId: user.id,
        date: today,
        chatsUsed: dbUser.defaultQuota, // Assuming they used it all if they request more
        chatsMax: dbUser.defaultQuota,
        hasRequestedMore: true,
      } as any,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur request-chats:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
