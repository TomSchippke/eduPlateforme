import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eleveId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { eleveId } = await params;
  const body = await request.json();
  const parsed = z.object({ isActive: z.boolean() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const eleve = await prisma.user.findFirst({
    where: { id: eleveId, tenantId: user.tenantId, role: "ELEVE" },
  });
  if (!eleve) return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });

  await prisma.user.update({
    where: { id: eleveId },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ message: "Mis à jour" });
}
