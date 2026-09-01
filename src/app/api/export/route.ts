import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const eleveId = searchParams.get("eleveId");

  if (!eleveId) return NextResponse.json({ error: "eleveId requis" }, { status: 400 });

  // Verify tenant
  const eleve = await prisma.user.findFirst({
    where: { id: eleveId, tenantId: user.tenantId, role: "ELEVE" },
    include: {
      memberships: { include: { groupe: { select: { name: true } } } },
      conversations: {
        include: { messages: { select: { role: true, content: true, createdAt: true } } },
      },
      quotas: true,
    },
  });

  if (!eleve) return NextResponse.json({ error: "Élève non trouvé" }, { status: 404 });

  const exportData = {
    eleve: {
      firstName: eleve.firstName,
      lastName: eleve.lastName,
      identifiant: eleve.identifiant,
      createdAt: eleve.createdAt,
    },
    groupes: eleve.memberships.map((m) => m.groupe.name),
    conversations: eleve.conversations.map((c) => ({
      mode: c.mode,
      createdAt: c.createdAt,
      messages: c.messages.map((m) => ({
        role: m.role,
        content: m.content,
        date: m.createdAt,
      })),
    })),
    quotas: eleve.quotas,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="export-${eleve.firstName}-${eleve.lastName}.json"`,
    },
  });
}
