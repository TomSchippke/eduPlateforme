import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { regenerateAllSchedules } from "@/lib/schedule";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  const holiday = await prisma.schoolHoliday.findUnique({
    where: { id },
  });

  if (!holiday || holiday.profId !== user.tenantId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.schoolHoliday.delete({
    where: { id },
  });

  // Regenerate schedules since holidays changed
  await regenerateAllSchedules(user.tenantId);

  return NextResponse.json({ success: true });
}
