import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfSidebar } from "@/components/layout/prof-sidebar";

export default async function ProfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { role?: string; firstName?: string; lastName?: string };

  if (user.role !== "PROF") {
    redirect("/eleve/dashboard");
  }

  const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <div className="min-h-screen bg-slate-50">
      <ProfSidebar userName={userName} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
