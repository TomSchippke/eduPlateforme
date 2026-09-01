import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const profId = 'demo_prof_cuid_1';
  const eleveId = 'demo_eleve_cuid_2';

  // Cleanup old demo data
  await prisma.groupe.deleteMany({ where: { id: { in: ['demo_groupe_maths', 'demo_groupe_physique'] } } });

  // 1. Groupes
  const groupeMaths = await prisma.groupe.create({
    data: { id: 'demo_groupe_maths', profId, name: 'Terminale Spé Maths (Démo)', schoolYear: '2023-2024' },
  });
  const groupePhysique = await prisma.groupe.create({
    data: { id: 'demo_groupe_physique', profId, name: '1ère Spé Physique (Démo)', schoolYear: '2023-2024' },
  });

  // 2. Memberships
  await prisma.groupeMembership.create({
    data: { id: 'demo_membership_1', groupeId: groupeMaths.id, eleveId },
  });
  await prisma.groupeMembership.create({
    data: { id: 'demo_membership_2', groupeId: groupePhysique.id, eleveId },
  });

  // 3. Chapitres
  const chapMath1 = await prisma.chapitre.create({
    data: { id: 'demo_chap_maths_1', groupeId: groupeMaths.id, title: '1. Dérivation et Convexité', order: 1 },
  });
  const chapMath2 = await prisma.chapitre.create({
    data: { id: 'demo_chap_maths_2', groupeId: groupeMaths.id, title: '2. Suites Numériques', order: 2 },
  });
  const chapPhys1 = await prisma.chapitre.create({
    data: { id: 'demo_chap_phys_1', groupeId: groupePhysique.id, title: '1. Énergie Cinétique (La Ferrari)', order: 1 },
  });

  // 4. Documents
  await prisma.document.create({
    data: { id: 'demo_doc_1', chapitreId: chapMath1.id, fileName: 'Cours complet - Dérivation.pdf', fileType: 'application/pdf', storageUrl: 'https://example.com/demo.pdf', docType: 'COURS', indexStatus: 'INDEXED' },
  });
  await prisma.document.create({
    data: { id: 'demo_doc_2', chapitreId: chapPhys1.id, fileName: 'TD - Exercices sur l\'énergie.pdf', fileType: 'application/pdf', storageUrl: 'https://example.com/demo2.pdf', docType: 'EXERCICES', indexStatus: 'INDEXED' },
  });

  // 5. DateDS
  const dateDS = await prisma.dateDS.create({
    data: { id: 'demo_ds_1', groupeId: groupeMaths.id, title: 'DS N°1 - Dérivation', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  await prisma.dateDSChapitre.create({
    data: { dateDSId: dateDS.id, chapitreId: chapMath1.id },
  });

  // 6. Statistics (StudentChapterLevel)
  await prisma.studentChapterLevel.create({
    data: { id: 'demo_level_1', eleveId, chapitreId: chapMath1.id, level: 2.5, history: [] },
  });
  await prisma.studentChapterLevel.create({
    data: { id: 'demo_level_2', eleveId, chapitreId: chapMath2.id, level: 1.2, history: [] },
  });

  // 7. Mistake Logs
  const conv = await prisma.conversation.create({
    data: { id: 'demo_conv_1', eleveId, groupeId: groupeMaths.id, mode: 'REVISE' },
  });
  
  await prisma.studentMistakeLog.createMany({
    data: [
      { id: 'demo_mistake_1', eleveId, chapitreId: chapMath1.id, conversationId: conv.id, errorType: 'CALCUL', tags: ['Signes', 'Dérivée'] },
      { id: 'demo_mistake_2', eleveId, chapitreId: chapMath1.id, conversationId: conv.id, errorType: 'METHODOLOGIE', tags: ['Tableau de signe'] },
      { id: 'demo_mistake_3', eleveId, chapitreId: chapMath1.id, conversationId: conv.id, errorType: 'CALCUL', tags: ['Fraction'] },
    ]
  });

  console.log("Demo Seed Completed via Prisma!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
