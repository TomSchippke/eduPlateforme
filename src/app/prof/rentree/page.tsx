import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { RentreeWizard } from "@/components/prof/rentree-wizard";

export default async function RentreePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; tenantId: string; role: string };

  const groupes = await prisma.groupe.findMany({
    where: { 
      isArchived: false,
      OR: [
        { profId: user.id },
        { memberships: { some: { eleveId: user.id } } }
      ]
    },
    include: { _count: { select: { memberships: true, chapitres: true } } },
    orderBy: { name: "asc" },
  });

  return <RentreeWizard groupes={groupes} />;
}
