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
  userId: string;
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
}

interface StatsResponse {
  levels: LevelData[];
  conversations: ConversationData[];
  students: StudentData[];
}

export function GroupeStats({ groupeId }: { groupeId: string }) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [groupeId]);

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

  const chapterMap = new Map<string, { title: string; order: number; sum: number; count: number }>();
  decayedLevels.forEach(l => {
    if (!chapterMap.has(l.chapitre.id)) {
      chapterMap.set(l.chapitre.id, { title: l.chapitre.title, order: l.chapitre.order, sum: 0, count: 0 });
    }
    const c = chapterMap.get(l.chapitre.id)!;
    c.sum += l.currentLevel;
    c.count += 1;
  });
  
  const avgLevelsPerChapter = Array.from(chapterMap.values())
    .map(c => ({ ...c, avg: c.sum / c.count }))
    .sort((a, b) => a.order - b.order);

  // Use of the app
  const msgCountExplique = data.conversations.filter(c => c.mode === 'EXPLIQUE').reduce((acc, c) => acc + c._count.messages, 0);
  const msgCountRevise = data.conversations.filter(c => c.mode === 'REVISE').reduce((acc, c) => acc + c._count.messages, 0);

  // Student list with individual averages
  const studentsWithStats = data.students.map(s => {
    const sLevels = decayedLevels.filter(l => l.eleveId === s.id);
    const avgLevel = sLevels.length > 0 ? sLevels.reduce((acc, l) => acc + l.currentLevel, 0) / sLevels.length : 0;
    const sConvs = data.conversations.filter(c => c.userId === s.id);
    const totalMsgs = sConvs.reduce((acc, c) => acc + c._count.messages, 0);
    return { ...s, avgLevel, totalMsgs };
  }).sort((a, b) => b.avgLevel - a.avgLevel); // sort by level descending

  return (
    <div className="space-y-6 animate-fade-in">
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
          <p className="text-3xl font-bold text-slate-900">{msgCountExplique} <span className="text-sm font-normal text-slate-500">messages</span></p>
        </div>

        <div className="card p-5 border-t-4 border-t-emerald-500">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Brain className="h-5 w-5 text-emerald-500" />
            <h3 className="font-medium text-slate-700">Mode Révision</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{msgCountRevise} <span className="text-sm font-normal text-slate-500">messages</span></p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Niveau de maîtrise moyen par chapitre (Elo 1 à 5)</h3>
        {avgLevelsPerChapter.length === 0 ? (
          <p className="text-sm text-slate-500">Pas encore assez de données d'évaluation.</p>
        ) : (
          <div className="space-y-4">
            {avgLevelsPerChapter.map(chap => (
              <div key={chap.title} className="flex items-center gap-4">
                <div className="w-1/3 truncate text-sm font-medium text-slate-700" title={chap.title}>
                  {chap.title}
                </div>
                <div className="w-2/3 flex items-center gap-2">
                  <div className="h-3 bg-slate-100 rounded-full flex-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        chap.avg >= 4 ? 'bg-emerald-500' : chap.avg >= 2.5 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${(chap.avg / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-8 text-right text-slate-600">{chap.avg.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Détail par élève</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Élève</th>
                <th className="px-4 py-3 font-medium text-center">Score Global (Elo)</th>
                <th className="px-4 py-3 font-medium text-right">Messages échangés</th>
              </tr>
            </thead>
            <tbody>
              {studentsWithStats.map((student) => (
                <tr key={student.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${
                      student.avgLevel >= 4 ? 'bg-emerald-100 text-emerald-700' : 
                      student.avgLevel >= 2.5 ? 'bg-indigo-100 text-indigo-700' : 
                      student.avgLevel > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {student.avgLevel > 0 ? student.avgLevel.toFixed(1) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {student.totalMsgs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
