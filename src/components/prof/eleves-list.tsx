"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Search,
  Key,
  Trash2,
  UserX,
  UserCheck,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { generateIdentifiantBase } from "@/lib/utils";

interface Eleve {
  id: string;
  firstName: string;
  lastName: string;
  identifiant: string;
  isActive: boolean;
  memberships: Array<{ groupe: { id: string; name: string } }>;
}

export function ElevesList({ eleves: initialEleves, groupes }: {
  eleves: Eleve[];
  groupes: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ eleveId: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    identifiant: "",
    password: "",
    groupeIds: [] as string[],
  });
  const [isIdManual, setIsIdManual] = useState(false);

  function updateForm(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      
      if (!isIdManual && (field === "firstName" || field === "lastName")) {
        next.identifiant = generateIdentifiantBase(next.firstName, next.lastName);
      }
      
      return next;
    });
  }

  const filtered = initialEleves.filter(
    (e) =>
      e.firstName.toLowerCase().includes(search.toLowerCase()) ||
      e.lastName.toLowerCase().includes(search.toLowerCase()) ||
      e.identifiant.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/prof/eleves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ firstName: "", lastName: "", identifiant: "", password: "", groupeIds: [] });
        setIsIdManual(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(eleveId: string) {
    const res = await fetch(`/api/prof/eleves/${eleveId}/reset-password`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setTempPassword({ eleveId, password: data.temporaryPassword });
    }
  }

  async function handleToggleActive(eleveId: string, currentlyActive: boolean) {
    await fetch(`/api/prof/eleves/${eleveId}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentlyActive }),
    });
    router.refresh();
  }

  async function handleExport(eleveId: string) {
    window.open(`/api/export?eleveId=${eleveId}`, "_blank");
  }

  function copyPassword(password: string) {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes élèves</h1>
          <p className="text-slate-500 mt-1">{initialEleves.length} élève(s)</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Nouvel élève
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un élève..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun élève trouvé</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Nom</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Identifiant</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Groupes</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((eleve) => (
                  <tr key={eleve.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {eleve.firstName} {eleve.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{eleve.identifiant}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {eleve.memberships.map((m) => (
                          <Badge key={m.groupe.id} variant="outline" size="sm">
                            {m.groupe.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={eleve.isActive ? "success" : "danger"}>
                        {eleve.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleResetPassword(eleve.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Réinitialiser le mot de passe"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(eleve.id, eleve.isActive)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title={eleve.isActive ? "Désactiver" : "Réactiver"}
                        >
                          {eleve.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleExport(eleve.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Exporter les données"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Temp password display */}
      <Modal
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title="Mot de passe réinitialisé"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Le nouveau mot de passe temporaire est :
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-100 font-mono text-lg text-slate-900">
            <span className="flex-1">{tempPassword?.password}</span>
            <button
              onClick={() => copyPassword(tempPassword?.password || "")}
              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Communiquez ce mot de passe à l&apos;élève. Il pourra le changer plus tard.
          </p>
          <Button className="w-full" onClick={() => setTempPassword(null)}>
            Fermer
          </Button>
        </div>
      </Modal>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvel élève" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" value={form.firstName} onChange={(e) => updateForm("firstName", e.target.value)} required />
            <Input label="Nom" value={form.lastName} onChange={(e) => updateForm("lastName", e.target.value)} required />
          </div>
          <Input 
            label="Identifiant" 
            type="text" 
            value={form.identifiant} 
            onChange={(e) => {
              setIsIdManual(true);
              updateForm("identifiant", e.target.value);
            }} 
            required 
          />
          <Input label="Mot de passe" type="text" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="Mot de passe initial" required />
          {groupes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Groupes</label>
              <div className="space-y-2">
                {groupes.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.groupeIds.includes(g.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...form.groupeIds, g.id]
                          : form.groupeIds.filter((id) => id !== g.id);
                        setForm({ ...form, groupeIds: ids });
                      }}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" loading={loading}>Créer l&apos;élève</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
