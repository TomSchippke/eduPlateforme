import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText, BookOpen, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function CoursPage(props: { searchParams: Promise<{ groupeId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string };
  const searchParams = await props.searchParams;
  const urlGroupeId = searchParams?.groupeId;

  const memberships = await prisma.groupeMembership.findMany({
    where: { 
      eleveId: user.id,
      groupe: { isArchived: false }
    },
    include: {
      groupe: {
        include: { prof: { select: { firstName: true, lastName: true, title: true } }, chapitres: {
            orderBy: { order: "asc" },
            include: {
              documents: {
                where: { 
                  indexStatus: "INDEXED",
                  visibility: { in: ["STUDENTS_ONLY", "BOTH"] }
                },
                orderBy: { createdAt: "desc" },
                select: {
                  id: true,
                  fileName: true,
                  fileType: true,
                  storageUrl: true,
                  fileSize: true,
                  docType: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const groupes = memberships.filter((m) => m.groupe).map((m) => m.groupe);
  const currentGroupe = urlGroupeId ? groupes.find(g => g.id === urlGroupeId) : groupes[0];
  const displayGroupes = currentGroupe ? [currentGroupe] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {groupes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {groupes.map((g) => (
            <Link key={g.id} href={`/eleve/cours?groupeId=${g.id}`}>
              <Badge
                variant={currentGroupe?.id === g.id ? "info" : "outline"}
                size="md"
                className="cursor-pointer whitespace-nowrap hover:bg-blue-50 transition-colors"
              >
                {g.name} - {g.prof.title} {g.prof.lastName}
              </Badge>
            </Link>
          ))}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes cours</h1>
        <p className="text-slate-500 mt-1">Documents organisés par chapitre</p>
      </div>

      {displayGroupes.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun cours disponible</p>
        </div>
      ) : (
        displayGroupes.map((groupe) => (
          <div key={groupe.id} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">{groupe.name}</h2>

            {groupe.chapitres.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Aucun chapitre</p>
            ) : (
              groupe.chapitres.map((chapitre) => (
                <details
                  key={chapitre.id}
                  className="card group"
                  open
                >
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {chapitre.order}
                      </div>
                      <span className="font-medium text-slate-900">
                        {chapitre.title}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {chapitre.documents.length} doc(s)
                    </span>
                  </summary>

                  <div className="px-4 pb-4 space-y-2">
                    {chapitre.documents.length === 0 ? (
                      <p className="text-sm text-slate-400 italic pl-11">
                        Aucun document
                      </p>
                    ) : (
                      chapitre.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tour-eleve-download-doc flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors ml-11"
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {doc.fileName}
                              </p>
                              {doc.docType && doc.docType !== "AUTRE" && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium border border-blue-100">
                                  {doc.docType.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            {doc.fileSize && (
                              <p className="text-xs text-slate-400">
                                {(doc.fileSize / 1024).toFixed(0)} Ko
                              </p>
                            )}
                          </div>
                          <Download className="h-4 w-4 text-slate-400" />
                        </a>
                      ))
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        ))
      )}
    </div>
  );
}
