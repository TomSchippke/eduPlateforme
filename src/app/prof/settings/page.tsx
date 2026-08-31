"use client";

import { useState, useEffect } from "react";
import { Calendar, Trash2, Plus, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function SettingsPage() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/prof/holidays");
      if (res.ok) {
        setHolidays(await res.json());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    try {
      const res = await fetch("/api/prof/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate, endDate }),
      });
      if (res.ok) {
        setName("");
        setStartDate("");
        setEndDate("");
        fetchHolidays();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette vacance ? L'emploi du temps sera recalculé.")) return;
    try {
      const res = await fetch(`/api/prof/holidays/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchHolidays();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres du Lycée</h1>
        <p className="text-slate-500 mt-1">Gérez le calendrier et les vacances scolaires de l'année.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Périodes de Vacances
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Définissez les semaines de vacances. L'emploi du temps récurrent ne sera pas généré pour ces semaines.
        </p>

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Toussaint"
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Début (Inclus)</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fin (Inclus)</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input w-full"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full h-[42px] flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Clock className="h-6 w-6 text-slate-300 animate-spin" />
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Aucune vacance configurée
          </div>
        ) : (
          <div className="space-y-3">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div>
                  <h3 className="font-semibold text-slate-900">{h.name}</h3>
                  <p className="text-sm text-slate-500">
                    Du {new Date(h.startDate).toLocaleDateString()} au {new Date(h.endDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(h.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
