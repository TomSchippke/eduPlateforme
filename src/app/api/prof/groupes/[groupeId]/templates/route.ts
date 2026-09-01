import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateScheduleForTemplate } from "@/lib/schedule";
import { z } from "zod";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupeId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { groupeId } = await params;

  const templates = await prisma.coursTemplate.findMany({
    where: { 
      groupeId,
      groupe: { profId: user.id }
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(templates);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupeId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { groupeId } = await params;

  // Verify group belongs to prof
  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, profId: user.id }
  });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json();
  const parsed = z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    room: z.string().optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const template = await prisma.coursTemplate.create({
    data: {
      groupeId,
      ...parsed.data,
    },
  });

  // Generate instances
  await generateScheduleForTemplate(template.id);

  return NextResponse.json(template, { status: 201 });
}
