"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, User, GraduationCap } from "lucide-react";

export default function ProfComptePage() {
  const [loading, setLoading] = useState(true);
  const [savingCivility, setSavingCivility] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [title, setTitle] = useState("M/Mme");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/compte")
      .then(res => res.json())
      .then(data => {
        if (data.identifiant) {
          setIdentifiant(data.identifiant);
          if (data.title) setTitle(data.title);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTitleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCivility(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/compte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Erreur");
      setMessage({ type: "success", text: "Civilité modifiée avec succès !" });
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de la modification de la civilité." });
    } finally {
      setSavingCivility(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!password || password.length < 4) {
      setMessage({ type: "error", text: "Le mot de passe doit faire au moins 4 caractères." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/user/compte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error("Erreur");

      setMessage({ type: "success", text: "Mot de passe modifié avec succès !" });
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de la modification du mot de passe." });
    } finally {
      setSavingPassword(false);
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
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon Compte Professeur</h1>
        <p className="text-slate-500 mt-1">Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IDENTIFIANT */}
        <div className="card p-6 border-blue-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Identifiant de connexion</h2>
              <p className="text-sm text-slate-500">Utilisé pour vous connecter</p>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg font-mono text-center text-lg text-slate-700 border border-slate-200">
            {identifiant}
          </div>
        </div>

        {/* SECURITY */}
        <div className="card p-6 border-indigo-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Mot de passe</h2>
              <p className="text-sm text-slate-500">Sécurisez votre espace</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={savingPassword} className="w-full">
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Modifier le mot de passe"
              )}
            </Button>
          </form>
        </div>

        {/* CIVILITY */}
        <div className="card p-6 border-amber-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Civilité</h2>
              <p className="text-sm text-slate-500">Comment les élèves vous voient</p>
            </div>
          </div>

          <form onSubmit={handleTitleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Civilité affichée
              </label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="M">Masculin (M)</option>
                <option value="Mme">Féminin (Mme)</option>
                <option value="M/Mme">Autre (M / Mme)</option>
              </select>
            </div>
            <Button type="submit" disabled={savingCivility} className="w-full" variant="outline">
              {savingCivility ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Sauvegarder"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
