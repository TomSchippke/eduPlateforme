import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { regenerateAllSchedules } from "@/lib/schedule";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const holidays = await prisma.schoolHoliday.findMany({
    where: { profId: user.id },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(holidays);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF" && user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { name, startDate, endDate } = parsed.data;

  const holiday = await prisma.schoolHoliday.create({
    data: {
      profId: user.id,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  // Regenerate schedules since holidays changed
  await regenerateAllSchedules(user.id);

  return NextResponse.json(holiday, { status: 201 });
}
