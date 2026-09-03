import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "PROF") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { groupeId } = await params;
    const user = session.user as { tenantId: string; id: string };

    // Check permissions
    const groupe = await prisma.groupe.findFirst({
      where: { 
        id: groupeId, 
        OR: [
          { profId: user.id },
          { memberships: { some: { eleveId: user.id } } }
        ]
      },
    });
    
    if (!groupe) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Get all students in the group
    const memberships = await prisma.groupeMembership.findMany({
      where: { groupeId },
      include: {
        eleve: {
          select: { id: true, firstName: true, lastName: true, identifiant: true }
        }
      }
    });

    const studentIds = memberships.map(m => m.eleveId);

    // Get student levels
    const levels = await prisma.studentChapterLevel.findMany({
      where: {
        eleveId: { in: studentIds },
        chapitre: { groupeId }
      },
      include: {
        chapitre: {
          select: { id: true, title: true, order: true }
        },
        eleve: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { chapitre: { order: 'asc' } }
    });

    // Get engagement metrics: conversation and message counts
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const conversations = await prisma.conversation.findMany({
      where: {
        eleveId: { in: studentIds },
        groupeId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        id: true,
        eleveId: true,
        mode: true,
        createdAt: true,
        _count: {
          select: { messages: true }
        }
      }
    });

    // Get mistake logs
    const mistakes = await prisma.studentMistakeLog.findMany({
      where: {
        eleveId: { in: studentIds },
        chapitre: { groupeId }
      },
      select: {
        id: true,
        eleveId: true,
        chapitreId: true,
        errorType: true,
        tags: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      levels,
      conversations,
      students: memberships.map(m => ({ ...m.eleve, teacherNote: m.teacherNote })),
      mistakes
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
