import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    eleveId: z.string(),
    action: z.enum(["increment", "decrement", "bonus"]),
  }).safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  // Verify tenant
  const eleve = await prisma.user.findFirst({
    where: { id: parsed.data.eleveId, tenantId: user.tenantId, role: "ELEVE" },
  });
  if (!eleve) return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsed.data.action === "increment" || parsed.data.action === "decrement") {
    const delta = parsed.data.action === "increment" ? 1 : -1;
    const newQuota = Math.max(1, eleve.defaultQuota + delta);

    await prisma.user.update({
      where: { id: eleve.id },
      data: { defaultQuota: newQuota },
    });
  } else {
    // Bonus: add 1 bonus chat for today
    await prisma.quotaChat.upsert({
      where: { eleveId_date: { eleveId: eleve.id, date: today } },
      update: { bonusChats: { increment: 1 }, hasRequestedMore: false } as any,
      create: {
        eleveId: eleve.id,
        date: today,
        chatsUsed: 0,
        chatsMax: eleve.defaultQuota,
        bonusChats: 1,
      },
    });
  }

  return NextResponse.json({ message: "Mis à jour" });
}
