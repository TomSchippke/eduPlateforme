const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
INSERT INTO "conversations" (id, eleve_id, groupe_id, title, created_at, updated_at) VALUES 
('demo_conv_1', 'demo_eleve_cuid_2', 'demo_groupe_maths', 'Révision Maths', NOW(), NOW())
ON CONFLICT DO NOTHING;
  `);

  await prisma.$executeRawUnsafe(`
INSERT INTO "student_mistake_logs" (id, eleve_id, chapitre_id, conversation_id, error_type, tags, created_at) VALUES 
('demo_mistake_1', 'demo_eleve_cuid_2', 'demo_chap_maths_1', 'demo_conv_1', 'CALCUL', '{"Signes", "Dérivée"}', NOW() - INTERVAL '2 days'),
('demo_mistake_2', 'demo_eleve_cuid_2', 'demo_chap_maths_1', 'demo_conv_1', 'METHODOLOGIE', '{"Tableau de signe"}', NOW() - INTERVAL '1 days'),
('demo_mistake_3', 'demo_eleve_cuid_2', 'demo_chap_maths_1', 'demo_conv_1', 'CALCUL', '{"Fraction"}', NOW())
ON CONFLICT DO NOTHING;
  `);
  console.log("Seed done");
}
main().catch(console.error).finally(() => prisma.$disconnect());
