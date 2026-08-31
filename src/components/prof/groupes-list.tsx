"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FolderOpen,
  Users,
  BookOpen,
  Archive,
  ArrowRight,
  Search,
} from "lucide-react";

interface Groupe {
  id: string;
  name: string;
  schoolYear: string;
  isArchived: boolean;
  _count: {
    memberships: number;
    chapitres: number;
  };
}

export function GroupesList({ groupes: initialGroupes }: { groupes: Groupe[] }) {
  const router = useRouter();
  const [groupes] = useState(initialGroupes);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = groupes.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesArchive = showArchived || !g.isArchived;
    return matchesSearch && matchesArchive;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/prof/groupes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, schoolYear }),
      });

      if (res.ok) {
        setShowCreate(false);
        setName("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes groupes</h1>
          <p className="text-slate-500 mt-1">
            {groupes.filter((g) => !g.isArchived).length} groupe(s) actif(s)
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Nouveau groupe
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un groupe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showArchived
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Archive className="h-4 w-4" />
          Archives
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Aucun groupe trouvé</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setShowCreate(true)}
          >
            Créer votre premier groupe
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((groupe) => (
            <Link
              key={groupe.id}
              href={`/prof/groupes/${groupe.id}`}
              className="card card-lift p-5 block"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                {groupe.isArchived && (
                  <Badge variant="warning">Archivé</Badge>
                )}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{groupe.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{groupe.schoolYear}</p>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {groupe._count.memberships}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {groupe._count.chapitres}
                </span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau groupe">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nom du groupe"
            placeholder="Ex: Terminale STMG 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Année scolaire"
            placeholder="Ex: 2025-2026"
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
