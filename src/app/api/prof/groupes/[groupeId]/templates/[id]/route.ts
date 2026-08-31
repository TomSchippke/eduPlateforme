import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupeId: string, id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  const template = await prisma.coursTemplate.findUnique({
    where: { id },
    include: { groupe: true }
  });

  if (!template || template.groupe.profId !== user.tenantId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.coursTemplate.delete({
    where: { id },
  });

  // Prisma cascade deletes CoursPlanifie items where templateId = id ? 
  // Wait, in schema, template is onDelete: SetNull! 
  // So we should delete future non-exception classes manually!
  
  const now = new Date();
  await prisma.coursPlanifie.deleteMany({
    where: {
      templateId: id,
      dateTime: { gte: now },
      isException: false
    }
  });

  return NextResponse.json({ success: true });
}
