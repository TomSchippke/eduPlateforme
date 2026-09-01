import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    eleveId: z.string(),
    groupeId: z.string(),
  }).safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  // Verify both belong to this tenant
  const [eleve, groupe] = await Promise.all([
    prisma.user.findFirst({ where: { id: parsed.data.eleveId, tenantId: user.tenantId, role: "ELEVE" } }),
    prisma.groupe.findFirst({ where: { id: parsed.data.groupeId, profId: user.id } }),
  ]);

  if (!eleve || !groupe) return NextResponse.json({ error: "Élève ou groupe non trouvé" }, { status: 404 });

  try {
    const membership = await prisma.groupeMembership.create({
      data: { eleveId: parsed.data.eleveId, groupeId: parsed.data.groupeId },
    });
    return NextResponse.json(membership, { status: 201 });
  } catch {
    return NextResponse.json({ error: "L'élève est déjà dans ce groupe" }, { status: 409 });
  }
}
