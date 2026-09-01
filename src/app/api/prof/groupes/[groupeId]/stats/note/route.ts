import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupeId: string }> }
) {
  const { groupeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as {
    id: string;
    role: string;
  };
  
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { eleveId, note } = body;

    if (!eleveId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Verify prof owns the group
    const groupe = await prisma.groupe.findFirst({
      where: {
        id: groupeId,
        profId: user.id
      }
    });

    if (!groupe) {
      return NextResponse.json({ error: "Groupe non trouvé ou accès refusé" }, { status: 404 });
    }

    // Update teacherNote
    await prisma.groupeMembership.update({
      where: {
        eleveId_groupeId: {
          eleveId: eleveId,
          groupeId: groupeId
        }
      },
      data: {
        teacherNote: note || null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating teacher note:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
