import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as { tenantId: string; role: string };

  if (user.role !== "PROF") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const ds = await prisma.dateDS.findUnique({
    where: { id },
    include: {
      groupe: true,
    },
  });

  if (!ds) {
    return NextResponse.json({ error: "DS non trouvé" }, { status: 404 });
  }

  if (ds.groupe.profId !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.dateDS.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as { tenantId: string; role: string };

  if (user.role !== "PROF") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const ds = await prisma.dateDS.findUnique({
    where: { id },
    include: {
      groupe: true,
    },
  });

  if (!ds) {
    return NextResponse.json({ error: "DS non trouvé" }, { status: 404 });
  }

  if (ds.groupe.profId !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = z.object({
    title: z.string().min(1).optional(),
    date: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    chapitreIds: z.array(z.string()).optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  // Update logic: we must also update DateDSChapitre if chapitreIds are provided
  const updateData: any = {
    ...(parsed.data.title ? { title: parsed.data.title } : {}),
    ...(parsed.data.date ? { date: new Date(parsed.data.date) } : {}),
    ...(parsed.data.keywords ? { keywords: parsed.data.keywords } : {}),
  };

  if (parsed.data.chapitreIds) {
    updateData.chapitres = {
      deleteMany: {}, // Remove old chapters
      create: parsed.data.chapitreIds.map((chapitreId) => ({ chapitreId })),
    };
  }

  const updatedDS = await prisma.dateDS.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updatedDS);
}
