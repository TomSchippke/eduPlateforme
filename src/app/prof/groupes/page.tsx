import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { GroupesList } from "@/components/prof/groupes-list";

export default async function GroupesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; tenantId: string; role: string };

  const groupes = await prisma.groupe.findMany({
    where: {
      OR: [
        { profId: user.id },
        { memberships: { some: { eleveId: user.id } } }
      ]
    },
    include: {
      _count: { select: { memberships: true, chapitres: true } },
    },
    orderBy: [{ isArchived: "asc" }, { createdAt: "desc" }],
  });

  return <GroupesList groupes={groupes} />;
}
