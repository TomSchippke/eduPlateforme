import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Delete prof
export async function DELETE(
  request: Request,
  { params }: { params: { profId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const profId = params.profId;

  try {
    await prisma.user.delete({
      where: { id: profId, tenantId: user.id, role: "PROF" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
