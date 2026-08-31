import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  FolderOpen,
  FileText,
  Calendar,
  Plus,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function ProfDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; tenantId: string; firstName: string };
  const tenantId = user.tenantId;

  // Fetch dashboard data
  const [groupes, eleveCount, documentCount, prochainsCours] = await Promise.all([
    prisma.groupe.findMany({
      where: { profId: tenantId, isArchived: false },
      include: {
        _count: { select: { memberships: true, chapitres: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({
      where: { tenantId, role: "ELEVE", isActive: true },
    }),
    prisma.document.count({
      where: {
        chapitre: { groupe: { profId: tenantId } },
      },
    }),
    prisma.coursPlanifie.findMany({
      where: {
        groupe: { profId: tenantId, isArchived: false },
        dateTime: { gte: new Date() },
      },
      include: { groupe: { select: { name: true } } },
      orderBy: { dateTime: "asc" },
      take: 5,
    }),
  ]);

  const indexedDocs = await prisma.document.count({
    where: {
      chapitre: { groupe: { profId: tenantId } },
      indexStatus: "INDEXED",
    },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bonjour, {user.firstName}
        </h1>
        <p className="text-slate-500 mt-1">
          Voici un aperçu de votre espace
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Groupes actifs", value: groupes.length, icon: FolderOpen, color: "text-blue-600 bg-blue-100" },
          { label: "Élèves", value: eleveCount, icon: Users, color: "text-emerald-600 bg-emerald-100" },
          { label: "Documents", value: documentCount, icon: FileText, color: "text-amber-600 bg-amber-100" },
          { label: "Docs indexés", value: indexedDocs, icon: MessageCircle, color: "text-purple-600 bg-purple-100" },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Groupes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Mes groupes</h2>
            <Link href="/prof/groupes">
              <Button variant="ghost" size="sm">
                <Plus className="h-4 w-4" />
                Nouveau
              </Button>
            </Link>
          </div>

          {groupes.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun groupe créé</p>
              <Link href="/prof/groupes">
                <Button variant="secondary" size="sm" className="mt-3">
                  Créer un groupe
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {groupes.slice(0, 4).map((groupe) => (
                <Link
                  key={groupe.id}
                  href={`/prof/groupes/${groupe.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                      {groupe.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {groupe._count.memberships} élèves · {groupe._count.chapitres} chapitres · {groupe.schoolYear}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Prochains cours */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Prochains cours</h2>
            <Link href="/prof/edt">
              <Button variant="ghost" size="sm">Voir tout</Button>
            </Link>
          </div>

          {prochainsCours.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun cours planifié</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prochainsCours.map((cours) => (
                <div key={cours.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs text-blue-600 font-medium">
                      {new Date(cours.dateTime).toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-bold text-blue-700">
                      {new Date(cours.dateTime).getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{cours.title}</p>
                    <p className="text-sm text-slate-500">
                      {cours.groupe.name} · {new Date(cours.dateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {cours.room ? ` · ${cours.room}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
