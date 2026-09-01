import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { membershipId } = await params;

  const membership = await prisma.groupeMembership.findFirst({
    where: { id: membershipId },
    include: { groupe: { select: { profId: true } } },
  });

  if (!membership || membership.groupe.profId !== user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  }

  await prisma.groupeMembership.delete({ where: { id: membershipId } });

  return NextResponse.json({ message: "Supprimé" });
}
