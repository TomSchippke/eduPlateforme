import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function EleveAnnoncesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string };

  const memberships = await prisma.groupeMembership.findMany({
    where: { 
      eleveId: user.id,
      groupe: { isArchived: false }
    },
    include: {
      groupe: {
        include: {
          annonces: {
            orderBy: { publishedAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  const allAnnonces = memberships
    .filter((m) => m.groupe)
    .flatMap((m) =>
      m.groupe.annonces.map((a) => ({ ...a, groupeName: m.groupe.name }))
    )
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Annonces</h1>
        <p className="text-slate-500 mt-1">
          Les annonces de tes professeurs
        </p>
      </div>

      {allAnnonces.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune annonce</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allAnnonces.map((annonce) => (
            <div key={annonce.id} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {annonce.title}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {annonce.groupeName} · {formatDate(annonce.publishedAt)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {annonce.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
