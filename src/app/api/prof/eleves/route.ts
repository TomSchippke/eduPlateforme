import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Create a new student
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    identifiant: z.string().min(2),
    password: z.string().min(4),
    groupeIds: z.array(z.string()).optional(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { firstName, lastName, identifiant, password, groupeIds } = parsed.data;

  // Check existing identifiant
  let finalIdentifiant = identifiant;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { identifiant: finalIdentifiant } })) {
    finalIdentifiant = `${identifiant}${counter}`;
    counter++;
  }

  // Verify groupes belong to this tenant
  if (groupeIds && groupeIds.length > 0) {
    const validGroupes = await prisma.groupe.count({
      where: { id: { in: groupeIds }, profId: user.tenantId },
    });
    if (validGroupes !== groupeIds.length) {
      return NextResponse.json({ error: "Groupe(s) invalide(s)" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const eleve = await prisma.user.create({
    data: {
      firstName,
      lastName,
      identifiant: finalIdentifiant,
      passwordHash,
      role: "ELEVE",
      tenantId: user.tenantId,
      ...(groupeIds && groupeIds.length > 0
        ? {
            memberships: {
              create: groupeIds.map((groupeId) => ({ groupeId })),
            },
          }
        : {}),
    },
  });

  return NextResponse.json(eleve, { status: 201 });
}

// List students
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string };
  if (user.role !== "PROF") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const eleves = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: "ELEVE" },
    include: {
      memberships: {
        include: { groupe: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(eleves);
}
