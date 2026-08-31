import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Calendar, Clock, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function EleveEDTPage() {
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
          cours: {
            where: { dateTime: { gte: new Date() } },
            orderBy: { dateTime: "asc" },
            take: 20,
          },
        },
      },
    },
  });

  const allCours = memberships
    .filter((m) => m.groupe)
    .flatMap((m) =>
      m.groupe.cours.map((c) => ({ ...c, groupeName: m.groupe.name }))
    )
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emploi du temps</h1>
        <p className="text-slate-500 mt-1">Tes prochains cours</p>
      </div>

      {allCours.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun cours à venir</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allCours.map((cours, i) => (
            <div
              key={cours.id}
              className={`card p-4 flex items-center gap-4 ${
                i === 0 ? "border-blue-300 bg-blue-50/50" : ""
              }`}
            >
              <div
                className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                  i === 0
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-blue-600"
                }`}
              >
                <span className="text-[10px] font-medium uppercase">
                  {new Date(cours.dateTime).toLocaleDateString("fr-FR", {
                    weekday: "short",
                  })}
                </span>
                <span className="text-xl font-bold leading-none">
                  {new Date(cours.dateTime).getDate()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className={`font-medium ${cours.isCancelled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {cours.title}
                  </p>
                  {cours.isDS && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">DS</span>}
                  {cours.isCancelled && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Annulé</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(cours.dateTime).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {cours.endTime && ` - ${new Date(cours.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                  </span>
                  {cours.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {cours.room}
                    </span>
                  )}
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                    {cours.groupeName}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
