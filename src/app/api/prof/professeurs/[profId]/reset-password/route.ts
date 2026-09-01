import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function POST(
  request: Request,
  { params }: { params: { profId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const profId = params.profId;
  const body = await request.json();
  const parsed = z.object({ newPassword: z.string().min(4) }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: profId, tenantId: user.id, role: "PROF" },
      data: { passwordHash },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }
}
