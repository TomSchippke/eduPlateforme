"use client";

import { useEffect, useState } from "react";
import { BarChart, Activity, BookOpen, Brain, Users, Search } from "lucide-react";
import { calculateDecayedLevel } from "@/lib/level/calculator";

interface LevelData {
  id: string;
  eleveId: string;
  level: number;
  updatedAt: string;
  chapitre: {
    id: string;
    title: string;
    order: number;
  };
  eleve: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ConversationData {
  id: string;
  eleveId: string;
  mode: string;
  createdAt: string;
  _count: {
    messages: number;
  };
}

interface StudentData {
  id: string;
  firstName: string;
  lastName: string;
  identifiant: string;
  teacherNote?: string | null;
}

interface MistakeData {
  id: string;
  eleveId: string;
  chapitreId: string | null;
  errorType: string;
  tags: string[];
  createdAt: string;
}

interface StatsResponse {
  levels: LevelData[];
  conversations: ConversationData[];
  students: StudentData[];
  mistakes: MistakeData[];
}

export function GroupeStats({ groupeId }: { groupeId: string }) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>("GENERAL");
  const [editingElo, setEditingElo] = useState<{ eleveId: string, chapitreId: string, currentVal: number } | null>(null);
  const [editingNote, setEditingNote] = useState<{ eleveId: string, currentVal: string } | null>(null);
  const [binomeChapterId, setBinomeChapterId] = useState<string>("GENERAL");

  const fetchStats = () => {
    fetch(`/api/prof/groupes/${groupeId}/stats`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load stats", e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, [groupeId]);

  const handleSaveElo = async (eleveId: string, chapitreId: string, newElo: number) => {
    try {
      await fetch(`/api/prof/groupes/${groupeId}/stats/elo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eleveId, chapitreId, score: newElo })
      });
      setEditingElo(null);
      fetchStats();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleSaveNote = async (eleveId: string, note: string) => {
    try {
      await fetch(`/api/prof/groupes/${groupeId}/stats/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eleveId, note })
      });
      setEditingNote(null);
      fetchStats();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde de la note.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-slate-500">Erreur de chargement</div>;

  // Compute metrics
  const decayedLevels = data.levels.map(l => ({
    ...l,
    currentLevel: calculateDecayedLevel(l.level, new Date(l.updatedAt))
  }));

  const chapterMap = new Map<string, { id: string; title: string; order: number; sum: number; count: number }>();
  decayedLevels.forEach(l => {
    if (!chapterMap.has(l.chapitre.id)) {
      chapterMap.set(l.chapitre.id, { id: l.chapitre.id, title: l.chapitre.title, order: l.chapitre.order, sum: 0, count: 0 });
    }
    const c = chapterMap.get(l.chapitre.id)!;
    c.sum += l.currentLevel;
    c.count += 1;
  });

  const avgLevelsPerChapter = Array.from(chapterMap.values())
    .map(c => ({ ...c, avg: c.sum / c.count }))
    .sort((a, b) => a.order - b.order);

  // Use of the app (30 days total)
  const msgCountExplique = data.conversations.filter(c => c.mode === 'EXPLIQUE').reduce((acc, c) => acc + c._count.messages, 0);
  const msgCountRevise = data.conversations.filter(c => c.mode === 'REVISE').reduce((acc, c) => acc + c._count.messages, 0);

  // Use of the app (last 7 days - hebdomadaire)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const msgCountExpliqueHebdo = data.conversations
    .filter(c => c.mode === 'EXPLIQUE' && new Date(c.createdAt) >= sevenDaysAgo)
    .reduce((acc, c) => acc + c._count.messages, 0);
  const msgCountReviseHebdo = data.conversations
    .filter(c => c.mode === 'REVISE' && new Date(c.createdAt) >= sevenDaysAgo)
    .reduce((acc, c) => acc + c._count.messages, 0);

  // Student list with individual averages
  const studentsWithStats = data.students.map(s => {
    const sLevels = decayedLevels.filter(l => l.eleveId === s.id);
    const avgLevel = sLevels.length > 0 ? sLevels.reduce((acc, l) => acc + l.currentLevel, 0) / sLevels.length : 0;
    const sConvs = data.conversations.filter(c => c.eleveId === s.id);
    const totalMsgs = sConvs.reduce((acc, c) => acc + c._count.messages, 0);
    return { ...s, avgLevel, totalMsgs };
  }).sort((a, b) => b.avgLevel - a.avgLevel); // sort by level descending

  // RCA Computation
  let filteredMistakes = data.mistakes || [];
  if (selectedChapterFilter !== "GENERAL") {
    filteredMistakes = filteredMistakes.filter(m => m.chapitreId === selectedChapterFilter);
  }

  const totalMistakes = filteredMistakes.length;
  const errorTypeCounts = filteredMistakes.reduce((acc, curr) => {
    acc[curr.errorType] = (acc[curr.errorType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tagCounts = filteredMistakes.reduce((acc, curr) => {
    curr.tags.forEach(t => {
      acc[t] = (acc[t] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedErrorTypes = Object.entries(errorTypeCounts).sort((a, b) => b[1] - a[1]);
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const errorTypeColors: Record<string, string> = {
    'COURS': 'bg-blue-500',
    'APPLICATION_SIMPLE': 'bg-indigo-400',
    'APPLICATION_DURE': 'bg-indigo-600',
    'METHODOLOGIE': 'bg-amber-500',
    'CALCUL': 'bg-rose-500',
    'UNITE': 'bg-emerald-500'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Vue d'ensemble du groupe</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border-t-4 border-t-indigo-500">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            <h3 className="font-medium text-slate-700">Taux d'Engagement</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{data.conversations.length} <span className="text-sm font-normal text-slate-500">sessions (30j)</span></p>
          <p className="text-sm text-slate-500 mt-1">{msgCountExplique + msgCountRevise} messages échangés</p>
        </div>

        <div className="card p-5 border-t-4 border-t-blue-500">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <h3 className="font-medium text-slate-700">Mode Explication</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{msgCountExpliqueHebdo} <span className="text-sm font-normal text-slate-500">messages (7j)</span></p>
          <p className="text-sm text-slate-400 mt-1">{msgCountExplique} messages au total (30j)</p>
        </div>

        <div className="card p-5 border-t-4 border-t-emerald-500">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Brain className="h-5 w-5 text-emerald-500" />
            <h3 className="font-medium text-slate-700">Mode Révision</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{msgCountReviseHebdo} <span className="text-sm font-normal text-slate-500">messages (7j)</span></p>
          <p className="text-sm text-slate-400 mt-1">{msgCountRevise} messages au total (30j)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Niveau moyen (Elo)</h3>
            <select
              value={selectedChapterFilter}
              onChange={(e) => setSelectedChapterFilter(e.target.value)}
              className="text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium py-1 max-w-[150px]"
            >
              <option value="GENERAL">Tous les chapitres</option>
              {avgLevelsPerChapter.map(chap => (
                <option key={chap.id} value={chap.id}>{chap.title}</option>
              ))}
            </select>
          </div>
          {avgLevelsPerChapter.length === 0 ? (
            <p className="text-sm text-slate-500">Pas encore assez de données d'évaluation.</p>
          ) : (
            <div className="space-y-4">
              {(() => {
                let displayedElo = null;
                if (selectedChapterFilter === "GENERAL") {
                  const totalSum = avgLevelsPerChapter.reduce((acc, c) => acc + c.sum, 0);
                  const totalCount = avgLevelsPerChapter.reduce((acc, c) => acc + c.count, 0);
                  displayedElo = { title: "Général", avg: totalCount > 0 ? totalSum / totalCount : 0 };
                } else {
                  const chap = avgLevelsPerChapter.find(c => c.id === selectedChapterFilter);
                  if (chap) displayedElo = { title: chap.title, avg: chap.avg };
                }

                if (!displayedElo) return null;

                return (
                  <div className="flex items-center gap-4">
                    <div className="w-1/3 truncate text-sm font-medium text-slate-700" title={displayedElo.title}>
                      {displayedElo.title}
                    </div>
                    <div className="w-2/3 flex items-center gap-2">
                      <div className="h-4 bg-slate-100 rounded-full flex-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${displayedElo.avg >= 4 ? 'bg-emerald-500' : displayedElo.avg >= 2.5 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                          style={{ width: `${(displayedElo.avg / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-10 text-right text-slate-600">{displayedElo.avg.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-slate-900">Root Cause Analysis</h3>
            <select
              value={selectedChapterFilter}
              onChange={(e) => setSelectedChapterFilter(e.target.value)}
              className="text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium py-1"
            >
              <option value="GENERAL">Tous les chapitres</option>
              {avgLevelsPerChapter.map(chap => (
                <option key={chap.id} value={chap.id}>{chap.title}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 mb-4">Analyse des {totalMistakes} erreurs recensées {selectedChapterFilter !== "GENERAL" ? "sur ce chapitre" : "au global"}.</p>

          {totalMistakes === 0 ? (
            <p className="text-sm text-slate-500 italic">Aucune erreur enregistrée pour le moment.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Répartition des types d'erreurs</h4>
                <div className="space-y-3">
                  {sortedErrorTypes.map(([type, count]) => {
                    const percent = Math.round((count / totalMistakes) * 100);
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className="w-1/3 text-xs text-slate-600 font-medium truncate">{type.replace("_", " ")}</div>
                        <div className="w-2/3 flex items-center gap-2">
                          <div className="h-2.5 bg-slate-100 rounded-full flex-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${errorTypeColors[type] || 'bg-slate-400'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500 w-8 text-right">{percent}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {sortedTags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Tags spécifiques les plus fréquents</h4>
                  <div className="flex flex-wrap gap-2">
                    {sortedTags.map(([tag, count]) => (
                      <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                        {tag} <span className="opacity-70">({count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Détail par élève</h3>
          <select
            value={selectedChapterFilter}
            onChange={(e) => setSelectedChapterFilter(e.target.value)}
            className="text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="GENERAL">Score Global</option>
            {avgLevelsPerChapter.map(chap => (
              <option key={chap.id} value={chap.id}>{chap.title}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600 whitespace-nowrap">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium text-center">Score ({selectedChapterFilter === "GENERAL" ? "Global" : "Chapitre"})</th>
                <th className="px-4 py-3 font-medium">Note secrète (IA)</th>
                <th className="px-4 py-3 font-medium text-right">Messages échangés</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithStats.map((student) => {
                let scoreToDisplay: number | null = null;
                let chapLvl: (LevelData & { currentLevel: number }) | undefined = undefined;

                if (selectedChapterFilter === "GENERAL") {
                  scoreToDisplay = student.avgLevel > 0 ? student.avgLevel : null;
                } else {
                  chapLvl = decayedLevels.find(l => l.eleveId === student.id && l.chapitre.id === selectedChapterFilter);
                  scoreToDisplay = chapLvl ? chapLvl.currentLevel : null;
                }

                const isEditing = editingElo?.eleveId === student.id && editingElo?.chapitreId === selectedChapterFilter;

                return (
                  <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 bg-white">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              value={editingElo.currentVal}
                              onChange={(e) => setEditingElo({ ...editingElo, currentVal: parseFloat(e.target.value) })}
                              className="w-16 px-1 py-0.5 text-xs border rounded"
                            />
                            <button
                              onClick={() => handleSaveElo(student.id, selectedChapterFilter, editingElo.currentVal)}
                              className="text-emerald-600 hover:bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setEditingElo(null)}
                              className="text-slate-400 hover:bg-slate-100 px-2 py-0.5 rounded text-xs font-medium"
                            >
                              x
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${scoreToDisplay !== null && scoreToDisplay >= 4 ? 'bg-emerald-100 text-emerald-700' :
                                scoreToDisplay !== null && scoreToDisplay >= 2.5 ? 'bg-indigo-100 text-indigo-700' :
                                  scoreToDisplay !== null && scoreToDisplay > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                              {scoreToDisplay !== null ? scoreToDisplay.toFixed(1) : '-'}
                            </span>

                            {selectedChapterFilter !== "GENERAL" && (
                              <button
                                onClick={() => setEditingElo({ eleveId: student.id, chapitreId: selectedChapterFilter, currentVal: scoreToDisplay ?? 3.0 })}
                                className="text-slate-300 hover:text-indigo-600 transition-colors"
                                title="Modifier manuellement l'Elo"
                              >
                                ✎
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingNote?.eleveId === student.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingNote.currentVal}
                            onChange={(e) => setEditingNote({ ...editingNote, currentVal: e.target.value })}
                            className="text-xs border rounded px-2 py-1 flex-1"
                            placeholder="Ex: A du mal avec les unités"
                          />
                          <button
                            onClick={() => handleSaveNote(student.id, editingNote.currentVal)}
                            className="text-emerald-600 font-medium text-xs"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 max-w-[200px] truncate" title={student.teacherNote || ""}>
                            {student.teacherNote || <i className="text-slate-300">Aucune</i>}
                          </span>
                          <button
                            onClick={() => setEditingNote({ eleveId: student.id, currentVal: student.teacherNote || "" })}
                            className="text-slate-300 hover:text-indigo-600 transition-colors"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {student.totalMsgs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6 border-t-4 border-t-purple-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              Suggérer des binômes intelligents
            </h3>
            <p className="text-sm text-slate-500 mt-1">Créez des paires "Tuteur/Tutoré" basées sur les niveaux de maîtrise.</p>
          </div>
          <select
            value={binomeChapterId}
            onChange={(e) => setBinomeChapterId(e.target.value)}
            className="text-sm border-slate-300 rounded-md shadow-sm focus:border-purple-500 focus:ring-purple-500 min-w-[200px]"
          >
            <option value="GENERAL" disabled>Sélectionner un chapitre...</option>
            {avgLevelsPerChapter.map(chap => (
              <option key={chap.id} value={chap.id}>{chap.title}</option>
            ))}
          </select>
        </div>

        {binomeChapterId !== "GENERAL" && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const chLvls = decayedLevels.filter(l => l.chapitre.id === binomeChapterId);
              chLvls.sort((a, b) => b.currentLevel - a.currentLevel);
              const binomes = [];
              let left = 0;
              let right = chLvls.length - 1;
              while (left < right) {
                binomes.push([chLvls[left], chLvls[right]]);
                left++;
                right--;
              }
              if (left === right) {
                binomes.push([chLvls[left]]); // un élève tout seul si nombre impair
              }

              if (binomes.length === 0) {
                return <p className="text-sm text-slate-500">Pas assez d'élèves évalués sur ce chapitre.</p>;
              }

              return binomes.map((binome, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                      {binome[0].eleve.firstName} {binome[0].eleve.lastName} (Tuteur)
                    </span>
                    <span className="text-xs font-bold text-emerald-600">{binome[0].currentLevel.toFixed(1)}</span>
                  </div>
                  {binome.length > 1 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        {binome[1].eleve.firstName} {binome[1].eleve.lastName} (Tutoré)
                      </span>
                      <span className="text-xs font-bold text-amber-600">{binome[1].currentLevel.toFixed(1)}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic text-center">Élève sans binôme (nombre impair)</div>
                  )}
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
