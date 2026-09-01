import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Reset student password
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eleveId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { eleveId } = await params;

  // Verify the student belongs to this tenant
  const eleve = await prisma.user.findFirst({
    where: { id: eleveId, tenantId: user.tenantId, role: "ELEVE" },
  });

  if (!eleve) {
    return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });
  }

  // Generate a simple temporary password
  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: eleveId },
    data: { passwordHash },
  });

  return NextResponse.json({
    message: "Mot de passe réinitialisé",
    temporaryPassword: tempPassword,
  });
}
