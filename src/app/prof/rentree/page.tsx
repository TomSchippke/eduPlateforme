import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { RentreeWizard } from "@/components/prof/rentree-wizard";

export default async function RentreePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { tenantId: string };

  const groupes = await prisma.groupe.findMany({
    where: { profId: user.tenantId, isArchived: false },
    include: { _count: { select: { memberships: true, chapitres: true } } },
    orderBy: { name: "asc" },
  });

  return <RentreeWizard groupes={groupes} />;
}
