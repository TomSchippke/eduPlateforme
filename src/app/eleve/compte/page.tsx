"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X, Heart, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ComptePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [passions, setPassions] = useState<string[]>([]);
  const [newPassion, setNewPassion] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/compte")
      .then(res => res.json())
      .then(data => {
        if (data.identifiant) {
          setIdentifiant(data.identifiant);
          setPassions(data.passions || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddPassion = () => {
    if (newPassion.trim() && passions.length < 3 && !passions.includes(newPassion.trim())) {
      setPassions([...passions, newPassion.trim()]);
      setNewPassion("");
    }
  };

  const handleRemovePassion = (p: string) => {
    setPassions(passions.filter(x => x !== p));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password && password.length < 4) {
      setMessage({ type: "error", text: "Le mot de passe doit faire au moins 4 caractères." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/compte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passions, password: password || undefined }),
      });

      if (!res.ok) throw new Error("Erreur");

      setMessage({ type: "success", text: "Compte mis à jour avec succès !" });
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de la mise à jour." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="h-6 w-6 text-blue-600" />
          Mon Compte
        </h1>
        <p className="text-slate-500 mt-1">Gère tes informations personnelles et personnalise ton IA.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-slate-400" />
            Informations de connexion
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Identifiant</label>
              <input
                type="text"
                value={identifiant}
                disabled
                className="w-full border-slate-300 rounded-md shadow-sm bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="card p-6 border-t-4 border-t-blue-500">
          <h2 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Heart className="h-5 w-5 text-blue-500" />
            Mes Centres d'Intérêt (Personnalisation de l'IA)
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Ajoute jusqu'à 3 centres d'intérêt (ex: Football, Jeux Vidéo, Cuisine...).
            L'IA utilisera ces informations pour créer des parallèles sur mesure afin de mieux t'expliquer une notion!
          </p>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPassion}
                onChange={(e) => setNewPassion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPassion())}
                placeholder="Ajouter un centre d'intérêt..."
                className="flex-1 border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={passions.length >= 3}
              />
              <Button type="button" onClick={handleAddPassion} disabled={passions.length >= 3 || !newPassion.trim()}>
                <Plus className="h-4 w-4 mr-2" /> Ajouter
              </Button>
            </div>

            {passions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {passions.map((p, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-200">
                    {p}
                    <button type="button" onClick={() => handleRemovePassion(p)} className="hover:text-blue-900 hover:bg-blue-200 rounded-full p-0.5 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {passions.length === 3 && (
              <p className="text-xs text-amber-600 font-medium">Nombre maximum de centres d'intérêts atteint (3/3).</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-400" />
            Mot de passe
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            {password && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le nouveau mot de passe"
                  className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}
