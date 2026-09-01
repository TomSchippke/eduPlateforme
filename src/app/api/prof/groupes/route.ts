import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Create a new groupe
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    name: z.string().min(1),
    schoolYear: z.string().min(1),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const groupe = await prisma.groupe.create({
    data: {
      profId: user.id,
      name: parsed.data.name,
      schoolYear: parsed.data.schoolYear,
    },
  });

  return NextResponse.json(groupe, { status: 201 });
}

// List groupes
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const groupes = await prisma.groupe.findMany({
    where: { profId: user.id },
    include: { _count: { select: { memberships: true, chapitres: true } } },
    orderBy: [{ isArchived: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(groupes);
}
