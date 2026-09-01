import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

// List profs
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const profs = await prisma.user.findMany({
    where: { tenantId: user.id, role: "PROF" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(profs);
}

// Create a prof
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as { tenantId: string; role: string; id: string };
  if (user.role !== "PROF_PRINCIPAL") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    title: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    identifiant: z.string().min(2),
    password: z.string().min(4),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, firstName, lastName, identifiant, password } = parsed.data;

  // Check existing identifiant
  let finalIdentifiant = identifiant;
  let counter = 1;
  while (await prisma.user.findUnique({ where: { identifiant: finalIdentifiant } })) {
    finalIdentifiant = `${identifiant}${counter}`;
    counter++;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const prof = await prisma.user.create({
    data: {
      title,
      firstName,
      lastName,
      identifiant: finalIdentifiant,
      passwordHash,
      role: "PROF",
      tenantId: user.id, // Share tenantId with PROF_PRINCIPAL
    },
  });

  return NextResponse.json(prof, { status: 201 });
}
