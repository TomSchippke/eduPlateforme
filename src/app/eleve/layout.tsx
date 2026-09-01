import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EleveHeader } from "@/components/layout/eleve-header";

export default async function EleveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { role?: string; firstName?: string; lastName?: string };

  if (user.role !== "ELEVE") {
    redirect("/prof/dashboard");
  }

  const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return (
    <div className="min-h-screen bg-blue-50/30">
      <EleveHeader userName={userName} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
}
