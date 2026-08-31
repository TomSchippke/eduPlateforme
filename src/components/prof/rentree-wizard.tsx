"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcw,
  AlertTriangle,
  Archive,
  FolderPlus,
  Copy,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface Groupe {
  id: string;
  name: string;
  schoolYear: string;
  _count: { memberships: number; chapitres: number };
}

export function RentreeWizard({ groupes }: { groupes: Groupe[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGroupes, setSelectedGroupes] = useState<string[]>([]);
  const [newSchoolYear, setNewSchoolYear] = useState(getNextSchoolYear());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleTransition() {
    setLoading(true);
    try {
      await fetch("/api/prof/rentree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupeIds: selectedGroupes,
          newSchoolYear,
        }),
      });
      setDone(true);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">C&apos;est fait !</h2>
        <p className="text-slate-500 mb-6">
          Les anciens groupes ont été archivés et les nouveaux créés avec la structure de chapitres copiée.
        </p>
        <Button onClick={() => router.push("/prof/groupes")}>
          Voir mes groupes <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transition de rentrée</h1>
        <p className="text-slate-500 mt-1">
          Archivez les groupes de l&apos;année passée et recréez-les pour la nouvelle année
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            }`}>
              {s}
            </div>
            {s < 2 && <div className={`w-16 h-0.5 ${step > s ? "bg-blue-600" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Sélectionnez les groupes à archiver et reconduire
          </h2>
          <p className="text-sm text-slate-500">
            Les groupes sélectionnés seront archivés. Leur structure de chapitres sera copiée dans de nouveaux groupes.
            Les élèves ne seront PAS transférés.
          </p>

          <div className="space-y-2">
            {groupes.map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedGroupes.includes(g.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedGroupes([...selectedGroupes, g.id]);
                    } else {
                      setSelectedGroupes(selectedGroupes.filter((id) => id !== g.id));
                    }
                  }}
                  className="rounded border-slate-300 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{g.name}</p>
                  <p className="text-sm text-slate-500">
                    {g.schoolYear} · {g._count.memberships} élèves · {g._count.chapitres} chapitres
                  </p>
                </div>
              </label>
            ))}
          </div>

          <Input
            label="Nouvelle année scolaire"
            value={newSchoolYear}
            onChange={(e) => setNewSchoolYear(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={selectedGroupes.length === 0}
            >
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Confirmation</h2>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-medium mb-2">Cette action va :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Archiver {selectedGroupes.length} groupe(s)</li>
              <li>Créer {selectedGroupes.length} nouveau(x) groupe(s) pour {newSchoolYear}</li>
              <li>Copier les chapitres (sans les documents ni les élèves)</li>
            </ul>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button onClick={handleTransition} loading={loading}>
              <RefreshCcw className="h-4 w-4" />
              Lancer la transition
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 6) return `${year}-${year + 1}`;
  return `${year}-${year + 1}`;
}
