"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Users,
  Plus,
  Search,
  Key,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { generateIdentifiantBase } from "@/lib/utils";

interface Professeur {
  id: string;
  firstName: string;
  lastName: string;
  identifiant: string;
}

export function ProfesseursList({ professeurs }: { professeurs: Professeur[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ profId: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    identifiant: "",
    password: "",
  });

  const filteredProfs = professeurs.filter(
    (p) =>
      p.firstName.toLowerCase().includes(search.toLowerCase()) ||
      p.lastName.toLowerCase().includes(search.toLowerCase()) ||
      p.identifiant.toLowerCase().includes(search.toLowerCase())
  );

  const handleNameChange = (first: string, last: string) => {
    setForm({
      ...form,
      firstName: first,
      lastName: last,
      identifiant: generateIdentifiantBase(first, last),
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/prof/professeurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setShowCreate(false);
      setForm({ firstName: "", lastName: "", identifiant: "", password: "" });
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce professeur ?")) return;
    try {
      await fetch(`/api/prof/professeurs/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let p = "";
    for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, password: p });
  };

  const resetPassword = async (id: string) => {
    if (!confirm("Voulez-vous générer un nouveau mot de passe pour ce professeur ?")) return;
    
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let p = "";
    for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];

    try {
      await fetch(`/api/prof/professeurs/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: p }),
      });
      setTempPassword({ profId: id, password: p });
    } catch (error) {
      alert("Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Équipe pédagogique</h1>
          <p className="text-slate-500">Gérez les professeurs de votre établissement</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Ajouter un professeur
        </Button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher un professeur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Professeur</th>
                <th className="px-6 py-4 font-medium">Identifiant</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfs.map((prof) => (
                <tr key={prof.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {prof.firstName} {prof.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600">{prof.identifiant}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPassword(prof.id)}
                        title="Réinitialiser le mot de passe"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(prof.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {tempPassword?.profId === prof.id && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-center justify-between">
                        <span>Nouveau MDP: <span className="font-mono font-bold">{tempPassword.password}</span></span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProfs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    Aucun professeur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nouveau Professeur">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prénom</label>
              <Input
                required
                value={form.firstName}
                onChange={(e) => handleNameChange(e.target.value, form.lastName)}
                placeholder="Ex: Jean"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                required
                value={form.lastName}
                onChange={(e) => handleNameChange(form.firstName, e.target.value)}
                placeholder="Ex: Dupont"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Identifiant</label>
            <Input
              required
              value={form.identifiant}
              onChange={(e) => setForm({ ...form, identifiant: e.target.value })}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">Généré automatiquement, modifiable si besoin.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mot de passe provisoire</label>
            <div className="flex gap-2">
              <Input
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="font-mono text-sm"
                placeholder="Mot de passe"
              />
              <Button type="button" variant="outline" onClick={generatePassword}>
                Générer
              </Button>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le compte"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
