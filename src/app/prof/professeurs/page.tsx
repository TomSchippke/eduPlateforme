import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfesseursList } from "@/components/prof/professeurs-list";

export default async function ProfesseursPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role: string; id: string };

  if (user.role !== "PROF_PRINCIPAL") {
    redirect("/prof/dashboard");
  }

  const professeurs = await prisma.user.findMany({
    where: { tenantId: user.id, role: "PROF" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return <ProfesseursList professeurs={professeurs} />;
}
