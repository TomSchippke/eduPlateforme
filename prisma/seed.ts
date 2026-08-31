import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.documentChunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.dateDSChapitre.deleteMany();
  await prisma.dateDS.deleteMany();
  await prisma.annonce.deleteMany();
  await prisma.coursPlanifie.deleteMany();
  await prisma.chapitre.deleteMany();
  await prisma.quotaChat.deleteMany();
  await prisma.groupeMembership.deleteMany();
  await prisma.groupe.deleteMany();
  await prisma.user.deleteMany();

  console.log("  ✓ Cleaned existing data");

  const passwordHashProf = await bcrypt.hash("jojo", 12);
  const passwordHashEleve = await bcrypt.hash("tomtom", 12);
  const passwordHash = await bcrypt.hash("password123", 12); // Fallback pour les autres

  // Create professor
  const prof = await prisma.user.create({
    data: {
      firstName: "Joël",
      lastName: "Schippke",
      identifiant: "j.schippke",
      passwordHash: passwordHashProf,
      role: "PROF",
      tenantId: "temp",
    },
  });

  // Set tenantId to own id
  await prisma.user.update({
    where: { id: prof.id },
    data: { tenantId: prof.id },
  });

  console.log("  ✓ Created professor: j.schippke / jojo");

  // Create 2 groups
  const groupeTerminale = await prisma.groupe.create({
    data: {
      profId: prof.id,
      name: "Terminale STMG 1",
      schoolYear: "2025-2026",
    },
  });

  const groupeBTS = await prisma.groupe.create({
    data: {
      profId: prof.id,
      name: "BTS SAM 2",
      schoolYear: "2025-2026",
    },
  });

  console.log("  ✓ Created 2 groups");

  // Create chapters for Terminale
  const ch1 = await prisma.chapitre.create({
    data: { groupeId: groupeTerminale.id, title: "Chapitre 1 : L'entreprise et son environnement", order: 1 },
  });
  const ch2 = await prisma.chapitre.create({
    data: { groupeId: groupeTerminale.id, title: "Chapitre 2 : Le management stratégique", order: 2 },
  });
  const ch3 = await prisma.chapitre.create({
    data: { groupeId: groupeTerminale.id, title: "Chapitre 3 : La politique de prix", order: 3 },
  });

  // Chapters for BTS
  await prisma.chapitre.create({
    data: { groupeId: groupeBTS.id, title: "Module 1 : Optimisation des processus administratifs", order: 1 },
  });
  await prisma.chapitre.create({
    data: { groupeId: groupeBTS.id, title: "Module 2 : Gestion de projet", order: 2 },
  });

  console.log("  ✓ Created chapters");

  // Create 5 students (including Tom)
  const eleves = await Promise.all([
    prisma.user.create({
      data: {
        firstName: "Tom",
        lastName: "Schippke",
        identifiant: "t.schippke",
        passwordHash: passwordHashEleve,
        role: "ELEVE",
        tenantId: prof.id,
      },
    }),
    prisma.user.create({
      data: {
        firstName: "Lucas",
        lastName: "Martin",
        identifiant: "l.martin",
        passwordHash,
        role: "ELEVE",
        tenantId: prof.id,
      },
    }),
    prisma.user.create({
      data: {
        firstName: "Emma",
        lastName: "Bernard",
        identifiant: "e.bernard",
        passwordHash,
        role: "ELEVE",
        tenantId: prof.id,
      },
    }),
    prisma.user.create({
      data: {
        firstName: "Noa",
        lastName: "Petit",
        identifiant: "n.petit",
        passwordHash,
        role: "ELEVE",
        tenantId: prof.id,
      },
    }),
    prisma.user.create({
      data: {
        firstName: "Léa",
        lastName: "Robert",
        identifiant: "l.robert",
        passwordHash,
        role: "ELEVE",
        tenantId: prof.id,
      },
    }),
  ]);

  console.log("  ✓ Created 5 students (Tom: tomtom, Others: password123)");

  // Add students to groups
  await Promise.all([
    // Tom, Lucas, Emma, Noa → Terminale
    prisma.groupeMembership.create({ data: { eleveId: eleves[0].id, groupeId: groupeTerminale.id } }),
    prisma.groupeMembership.create({ data: { eleveId: eleves[1].id, groupeId: groupeTerminale.id } }),
    prisma.groupeMembership.create({ data: { eleveId: eleves[2].id, groupeId: groupeTerminale.id } }),
    prisma.groupeMembership.create({ data: { eleveId: eleves[3].id, groupeId: groupeTerminale.id } }),
    // Emma, Léa → BTS
    prisma.groupeMembership.create({ data: { eleveId: eleves[2].id, groupeId: groupeBTS.id } }),
    prisma.groupeMembership.create({ data: { eleveId: eleves[4].id, groupeId: groupeBTS.id } }),
  ]);

  console.log("  ✓ Added students to groups");

  // Create announcements
  await prisma.annonce.create({
    data: {
      groupeId: groupeTerminale.id,
      title: "Rappel DS n°1",
      content: "Le DS portera sur les chapitres 1 et 2. Révisez bien les notions de stratégie globale et de domaine.",
    },
  });

  await prisma.annonce.create({
    data: {
      groupeId: groupeTerminale.id,
      title: "Bienvenue !",
      content: "Bonjour à tous, bienvenue sur la plateforme ! Vous trouverez ici vos cours et pourrez poser vos questions à l'IA.",
    },
  });

  console.log("  ✓ Created announcements");

  // Create scheduled classes
  const now = new Date();
  await prisma.coursPlanifie.create({
    data: {
      groupeId: groupeTerminale.id,
      title: "Cours — Chapitre 3 : La politique de prix",
      dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      room: "Salle B204",
    },
  });

  await prisma.coursPlanifie.create({
    data: {
      groupeId: groupeTerminale.id,
      title: "TD — Études de cas management",
      dateTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      room: "Salle A101",
    },
  });

  await prisma.coursPlanifie.create({
    data: {
      groupeId: groupeBTS.id,
      title: "Cours — Optimisation des processus",
      dateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      room: "Salle C312",
    },
  });

  console.log("  ✓ Created scheduled classes");

  // Create DS date
  await prisma.dateDS.create({
    data: {
      groupeId: groupeTerminale.id,
      title: "DS n°1 — Management stratégique",
      date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      keywords: ["stratégie globale", "stratégie de domaine", "diagnostic stratégique", "SWOT"],
      chapitres: {
        create: [
          { chapitreId: ch1.id },
          { chapitreId: ch2.id },
        ],
      },
    },
  });

  console.log("  ✓ Created DS date");

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Login credentials:");
  console.log("  Prof : j.schippke / jojo");
  console.log("  Élève : t.schippke / tomtom");
  console.log("  Élève : l.martin / password123");
  console.log("  Élève : e.bernard / password123");
  console.log("  Élève : n.petit / password123");
  console.log("  Élève : l.robert / password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
