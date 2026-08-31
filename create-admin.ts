import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  // Supprimer les utilisateurs existants pour éviter les conflits
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      firstName: "Tom",
      lastName: "Schippke",
      identifiant: "t.schippke",
      passwordHash,
      role: "PROF",
      tenantId: "temp",
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { tenantId: user.id },
  });

  console.log("Utilisateur créé : t.schippke / password123");
}

main().finally(() => prisma.$disconnect());
