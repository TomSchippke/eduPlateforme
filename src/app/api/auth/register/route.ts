import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  title: z.string().min(1, "Civilité requise"),
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  identifiant: z.string().min(2, "Identifiant requis"),
  password: z.string().min(6, "6 caractères minimum"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { title, firstName, lastName, identifiant, password } = parsed.data;

    // Check if identifiant already exists
    const existing = await prisma.user.findUnique({
      where: { identifiant },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet identifiant" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create the prof user — tenantId is their own ID
    const user = await prisma.user.create({
      data: {
        title,
        firstName,
        lastName,
        identifiant,
        passwordHash,
        role: Role.PROF_PRINCIPAL,
        tenantId: "temp", // Will update after creation
      },
    });

    // Update tenantId to be the user's own ID
    await prisma.user.update({
      where: { id: user.id },
      data: { tenantId: user.id },
    });

    return NextResponse.json(
      { message: "Compte créé avec succès" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
