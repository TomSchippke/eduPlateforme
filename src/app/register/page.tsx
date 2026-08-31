"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { generateIdentifiantBase } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    identifiant: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          identifiant: form.identifiant,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">EduPlateforme</span>
        </div>

        <div className="card p-8">
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </button>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Créer un espace professeur</h2>
          <p className="text-slate-500 mb-6">
            Inscrivez-vous pour créer votre espace pédagogique
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={form.firstName}
                onChange={(e) => updateForm("firstName", e.target.value)}
                required
              />
              <Input
                label="Nom"
                value={form.lastName}
                onChange={(e) => updateForm("lastName", e.target.value)}
                required
              />
            </div>

            <Input
              label="Identifiant"
              type="text"
              value={form.identifiant}
              onChange={(e) => {
                setIsIdManual(true);
                updateForm("identifiant", e.target.value);
              }}
              placeholder="p.nom"
              required
            />

            <Input
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={(e) => updateForm("password", e.target.value)}
              placeholder="6 caractères minimum"
              required
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateForm("confirmPassword", e.target.value)}
              required
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Créer mon espace
            </Button>
          </form>
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">
          Seuls les professeurs peuvent créer un compte. Les élèves sont créés par leur professeur.
        </p>
      </div>
    </div>
  );
}
