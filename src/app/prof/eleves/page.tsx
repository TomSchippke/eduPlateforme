import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ElevesList } from "@/components/prof/eleves-list";

export default async function ElevesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { tenantId: string; role: string; id: string };

  if (user.role !== "PROF_PRINCIPAL") {
    redirect("/prof/dashboard");
  }

  const [eleves, groupes] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: "ELEVE" },
      include: {
        memberships: {
          include: { groupe: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.groupe.findMany({
      where: { profId: user.id, isArchived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <ElevesList eleves={eleves} groupes={groupes} />;
}
