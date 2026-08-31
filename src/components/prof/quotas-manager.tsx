"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Plus, Minus, Gift } from "lucide-react";

interface EleveQuota {
  id: string;
  firstName: string;
  lastName: string;
  defaultQuota: number;
  todayUsed: number;
  todayMax: number;
  todayBonus: number;
  hasRequestedMore: boolean;
}

export function QuotasManager({ eleves }: { eleves: EleveQuota[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpdateQuota(eleveId: string, action: "increment" | "decrement" | "bonus") {
    setLoading(eleveId);
    try {
      await fetch("/api/prof/quotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eleveId, action }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quotas IA</h1>
        <p className="text-slate-500 mt-1">
          Gérez le nombre de chats IA quotidiens par élève
        </p>
      </div>

      {eleves.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun élève actif</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Élève</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase text-center">Quota / jour</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase text-center">Utilisé</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase text-center">Bonus</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eleves.map((e) => {
                const remaining = e.todayMax + e.todayBonus - e.todayUsed;
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 flex items-center gap-2">
                      {e.firstName} {e.lastName}
                      {e.hasRequestedMore && (
                        <span className="flex h-2 w-2 relative" title="Demande de chats en attente">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-700">{e.defaultQuota}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          remaining <= 0 ? "danger" : remaining <= 2 ? "warning" : "success"
                        }
                      >
                        {e.todayUsed} / {e.todayMax + e.todayBonus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-blue-600 font-medium">+{e.todayBonus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleUpdateQuota(e.id, "decrement")}
                          disabled={loading === e.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Réduire le quota"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateQuota(e.id, "increment")}
                          disabled={loading === e.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                          title="Augmenter le quota"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateQuota(e.id, "bonus")}
                          disabled={loading === e.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                          title="Ajouter un bonus pour aujourd'hui"
                        >
                          <Gift className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
