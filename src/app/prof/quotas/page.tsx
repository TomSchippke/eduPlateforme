import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { QuotasManager } from "@/components/prof/quotas-manager";

export default async function QuotasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { tenantId: string };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eleves = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: "ELEVE", isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      defaultQuota: true,
      quotas: {
        where: { date: today },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const data = eleves.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    defaultQuota: e.defaultQuota,
    todayUsed: e.quotas[0]?.chatsUsed ?? 0,
    todayMax: e.quotas[0]?.chatsMax ?? e.defaultQuota,
    todayBonus: e.quotas[0]?.bonusChats ?? 0,
  }));

  return <QuotasManager eleves={data} />;
}
