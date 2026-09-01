import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Calendar, Clock, MapPin, FolderOpen } from "lucide-react";

export default async function ProfEDTPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; tenantId: string; role: string };

  // Fetch all cours for this professor (either they created the group or are a member)
  const cours = await prisma.coursPlanifie.findMany({
    where: {
      groupe: {
        isArchived: false,
        OR: [
          { profId: user.id },
          { memberships: { some: { eleveId: user.id } } }
        ]
      },
      dateTime: { gte: new Date() },
    },
    include: { groupe: { select: { name: true } } },
    orderBy: { dateTime: "asc" },
    take: 30,
  });

  // Group by day
  const byDay = new Map<string, typeof cours>();
  for (const c of cours) {
    const key = new Date(c.dateTime).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(c);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Emploi du temps</h1>
        <p className="text-slate-500 mt-1">Prochains cours - tous groupes confondus</p>
      </div>

      {cours.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun cours planifié</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byDay.entries()).map(([day, coursList]) => (
            <div key={day}>
              <h2 className="text-sm font-medium text-slate-500 uppercase mb-3 capitalize">
                {day}
              </h2>
              <div className="space-y-2">
                {coursList.map((c) => (
                  <div key={c.id} className="card p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${c.isCancelled ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-bold shrink-0 text-sm`}>
                      {new Date(c.dateTime).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${c.isCancelled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {c.title}
                        </p>
                        {c.isDS && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">DS</span>}
                        {c.isCancelled && <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Annulé</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {c.groupe.name}
                        </span>
                        {c.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.room}
                          </span>
                        )}
                        {c.endTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Jusqu'à {new Date(c.endTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
