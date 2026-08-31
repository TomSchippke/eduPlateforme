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

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      chapitre: {
        include: {
          groupe: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
  }

  if (document.chapitre.groupe.profId !== user.tenantId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.document.delete({
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

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      chapitre: {
        include: {
          groupe: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document non trouvé" }, { status: 404 });
  }

  if (document.chapitre.groupe.profId !== user.tenantId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = z.object({
    visibility: z.enum(["BOTH", "STUDENTS_ONLY", "AI_ONLY"]).optional(),
    docType: z.enum(["COURS", "EXERCICES", "SUJET_DS", "CORRECTION_DS", "CORRECTION_EXERCICES", "SUJET_DM", "COMPLEMENTS", "AUTRE"]).optional(),
    keywords: z.array(z.string()).optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const updatedDoc = await prisma.document.update({
    where: { id },
    data: {
      ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}),
      ...(parsed.data.docType ? { docType: parsed.data.docType } : {}),
      ...(parsed.data.keywords ? { keywords: parsed.data.keywords } : {}),
    },
  });

  return NextResponse.json(updatedDoc);
}
