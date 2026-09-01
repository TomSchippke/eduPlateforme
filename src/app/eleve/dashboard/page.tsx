import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  BookOpen,
  Bell,
  MessageCircle,
  ChevronRight,
  Clock,
  Sparkles,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function EleveDashboardPage(props: {
  searchParams: Promise<{ groupeId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; tenantId: string; firstName: string };
  const searchParams = await props.searchParams;
  const urlGroupeId = searchParams?.groupeId;

  // Get student's groups
  const memberships = await prisma.groupeMembership.findMany({
    where: { eleveId: user.id },
    include: {
      groupe: {
        include: {
          prof: {
            select: { firstName: true, lastName: true },
          },
          annonces: { orderBy: { publishedAt: "desc" }, take: 3 },
          cours: {
            where: { dateTime: { gte: new Date() } },
            orderBy: { dateTime: "asc" },
            take: 3,
          },
          chapitres: {
            orderBy: { order: "asc" },
            include: {
              documents: {
                where: { indexStatus: "INDEXED" },
                select: { id: true, fileName: true },
              },
            },
          },
          datesDS: {
            where: { date: { gte: new Date() } },
            orderBy: { date: "asc" },
            take: 2,
            include: {
              chapitres: {
                include: {
                  chapitre: {
                    select: { id: true, title: true }
                  }
                }
              }
            }
          },
        },
      },
    },
  });

  const groupes = memberships
    .map((m) => m.groupe)
    .filter((g) => !g.isArchived);

  // Use requested group or first group by default
  const currentGroupe = urlGroupeId
    ? groupes.find(g => g.id === urlGroupeId) || groupes[0]
    : groupes[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bonjour, {user.firstName}
          </h1>
          <p className="text-slate-500 mt-1">Ton espace de cours</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/eleve/flashcards">
            <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Mes Flashcards</span>
            </Button>
          </Link>
          <Link href="/eleve/chat">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Learn with IA</span>
              <span className="sm:hidden">IA</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Group selector (if multiple) */}
      {groupes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {groupes.map((g, i) => (
            <Link key={g.id} href={`/eleve/dashboard?groupeId=${g.id}`}>
              <Badge
                variant={currentGroupe?.id === g.id ? "info" : "outline"}
                size="md"
                className="cursor-pointer whitespace-nowrap hover:bg-blue-50 transition-colors"
              >
                {g.name} - M/Mme {g.prof.lastName}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {!currentGroupe ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg text-slate-500">
            Tu n&apos;es inscrit dans aucun groupe pour le moment.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Ton professeur doit t&apos;ajouter à un groupe.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Prochain cours */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              Prochains cours
            </h2>
            {currentGroupe.cours.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">Aucun cours planifié</p>
            ) : (
              <div className="space-y-3">
                {currentGroupe.cours.map((cours, i) => (
                  <div
                    key={cours.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? "bg-blue-50 border border-blue-200" : "bg-slate-50"
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 ${i === 0 ? "bg-blue-600 text-white" : "bg-white text-blue-600"
                      }`}>
                      <span className="text-[10px] font-medium uppercase">
                        {new Date(cours.dateTime).toLocaleDateString("fr-FR", { weekday: "short" })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {new Date(cours.dateTime).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{cours.title}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(cours.dateTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {cours.room ? ` · ${cours.room}` : ""}
                      </p>
                    </div>
                    {i === 0 && <Badge variant="info" className="ml-auto">Prochain</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Annonces */}
          <div className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <Bell className="h-5 w-5 text-amber-500" />
              Annonces récentes
            </h2>
            {currentGroupe.annonces.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">Aucune annonce</p>
            ) : (
              <div className="space-y-3">
                {currentGroupe.annonces.map((annonce) => (
                  <div key={annonce.id} className="p-3 rounded-lg bg-slate-50">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-slate-900 text-sm">{annonce.title}</p>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">
                        {formatRelative(annonce.publishedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{annonce.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DS à venir */}
          {currentGroupe.datesDS.length > 0 && (
            <div className="card p-6 md:col-span-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                📝 Prochaines évaluations
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {currentGroupe.datesDS.map((ds) => (
                  <div key={ds.id} className="p-4 rounded-lg bg-red-50 border border-red-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-red-900">{ds.title}</p>
                        <Badge variant="danger">{formatDateTime(ds.date).split(",")[0]}</Badge>
                      </div>
                      {ds.keywords && ds.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {ds.keywords.map((kw) => (
                            <Badge key={kw} variant="outline" size="sm">{kw}</Badge>
                          ))}
                        </div>
                      )}
                      {ds.chapitres && ds.chapitres.length > 0 && (
                        <div className="mt-2 text-sm text-red-800">
                          <span className="font-medium underline decoration-red-300 underline-offset-2">Programme :</span>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {ds.chapitres.map(c => (
                              <li key={c.chapitre.id} className="text-red-700 truncate">{c.chapitre.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chapitres / Cours rapide */}
          <div className="card p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                Mes cours
              </h2>
              <Link href="/eleve/cours">
                <Button variant="ghost" size="sm">
                  Voir tout <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentGroupe.chapitres.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/eleve/cours?chapitre=${ch.id}`}
                  className="p-4 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors group"
                >
                  <p className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                    {ch.title}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {ch.documents.length} document(s)
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
