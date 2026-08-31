"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { countWords } from "@/lib/utils";
import {
  Send,
  Sparkles,
  BookOpen,
  Brain,
  MessageCircle,
  ChevronDown,
  AlertCircle,
  X,
} from "lucide-react";
import React from "react";

// Simple markdown formatter for **bold** and *italic*
function FormattedMessage({ content }: { content: string }) {
  // Use a regex to split by both **...** and *...*
  // The capturing groups keep the delimiter in the result array
  const parts = content.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
          return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

interface ChatGroup {
  id: string;
  name: string;
  chapitres: Array<{ id: string; title: string; focusConcepts?: string[] }>;
  datesDS: Array<{
    id: string;
    title: string;
    date: string;
    keywords: string[];
    chapitreIds: string[];
  }>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sourceCitations?: Array<{
    documentName: string;
    chapitreTitle: string;
    page?: number;
    section?: string;
    excerpt: string;
  }>;
  chapterName?: string;
  createdAt?: string | Date;
}

interface ChatInterfaceProps {
  groupes: ChatGroup[];
  quotaRemaining: number;
  quotaMax: number;
  userId: string;
}

const MAX_WORDS = 50;

export function ChatInterface({
  groupes,
  quotaRemaining: initialQuota,
  quotaMax,
  userId,
}: ChatInterfaceProps) {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotaRemaining, setQuotaRemaining] = useState(initialQuota);

  // Mode & scope
  const [mode, setMode] = useState<"EXPLIQUE" | "REVISE">("EXPLIQUE");
  const [selectedGroupe, setSelectedGroupe] = useState<ChatGroup | null>(
    groupes[0] || null
  );
  const [selectedChapitre, setSelectedChapitre] = useState<string>("");
  const [selectedDS, setSelectedDS] = useState<string>("");
  const [selectedChapitresRevise, setSelectedChapitresRevise] = useState<string[]>([]);
  const [difficultyMode, setDifficultyMode] = useState<"AUTO" | "FACILE" | "MOYEN" | "AVANCE">("AUTO");
  const [exerciseTypes, setExerciseTypes] = useState<string[]>(["EXERCICE", "QCM", "OPEN"]);
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const [showConfig, setShowConfig] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [requestedBonus, setRequestedBonus] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = countWords(input);
  const isOverLimit = wordCount > MAX_WORDS;
  const canSend = input.trim().length > 0 && !isOverLimit && !loading && quotaRemaining > 0;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const messageContent = overrideMessage || input;
    if (!messageContent.trim() || !selectedGroupe) return;
    if (!overrideMessage && !canSend) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideMessage) setInput("");
    setLoading(true);
    setShowConfig(false);

    try {
      const body: any = {
        message: userMessage.content,
        mode,
        groupeId: selectedGroupe.id,
        conversationId,
      };

      if (mode === "EXPLIQUE" && selectedChapitre) {
        body.chapitreId = selectedChapitre;
      } else if (mode === "REVISE") {
        body.difficultyMode = difficultyMode;
        body.exerciseTypes = exerciseTypes;
        if (selectedKeyword) {
          body.selectedKeyword = selectedKeyword;
        }
        if (selectedDS) {
          body.dateDSId = selectedDS;
        } else if (selectedChapitresRevise.length > 0) {
          body.chapitresIdsRevise = selectedChapitresRevise;
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur serveur");
      }

      const data = await res.json();

      // Save conversation ID for subsequent messages
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const finalResponse: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.content,
        sourceCitations: data.citations,
        chapterName: data.chapterName,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, finalResponse]);
      setQuotaRemaining((prev) => Math.max(0, prev - 1));
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ ${error instanceof Error ? error.message : "Une erreur est survenue"}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [canSend, selectedGroupe, input, mode, selectedChapitre, selectedDS, conversationId, difficultyMode, selectedChapitresRevise]);

  function handleNewConversation() {
    setMessages([]);
    setConversationId(null);
    setShowConfig(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (groupes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <MessageCircle className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          Pas encore de groupe
        </h2>
        <p className="text-slate-500 max-w-md">
          Ton professeur doit t&apos;ajouter à un groupe avec des documents de cours
          pour que tu puisses utiliser l&apos;assistant IA.
        </p>
      </div>
    );
  }

  let headerSubtitle = "Sélectionne un groupe";
  if (selectedGroupe) {
    headerSubtitle = selectedGroupe.name;
    if (!showConfig) {
      if (mode === "EXPLIQUE") {
        if (selectedChapitre) {
          const ch = selectedGroupe.chapitres.find(c => c.id === selectedChapitre);
          if (ch) headerSubtitle += ` — ${ch.title}`;
        } else {
          headerSubtitle += " — Programme complet";
        }
      } else {
        if (selectedDS) {
          const ds = selectedGroupe.datesDS.find(d => d.id === selectedDS);
          if (ds) headerSubtitle += ` — DS: ${ds.title}`;
        } else if (selectedChapitresRevise.length > 0) {
          if (selectedChapitresRevise.length === 1) {
            const ch = selectedGroupe.chapitres.find(c => c.id === selectedChapitresRevise[0]);
            if (ch) headerSubtitle += ` — ${ch.title}`;
          } else {
            headerSubtitle += ` — ${selectedChapitresRevise.length} chapitres`;
          }
        } else {
          headerSubtitle += " — Programme complet";
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Learn with IA</h1>
            <p className="text-xs text-slate-500 truncate max-w-[200px] md:max-w-[400px]" title={headerSubtitle}>
              {headerSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quota counter */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${quotaRemaining <= 2
              ? "bg-red-100 text-red-700"
              : quotaRemaining <= 5
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
              }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {quotaRemaining}/{quotaMax}
          </div>

          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleNewConversation}>
              Nouveau chat
            </Button>
          )}
        </div>
      </div>

      {/* Mode selector + config */}
      {showConfig && (
        <div className="card p-5 mb-4 space-y-4 animate-fade-in">
          {/* Mode toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("EXPLIQUE")}
                title="Pour expliquer le cours et les exercices vus avec le prof et disponibles en ligne, approfondir certaines notions ou demander de l'aide sur un exercice."
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${mode === "EXPLIQUE"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <BookOpen className="h-4 w-4" />
                Explique-moi le cours
              </button>
              <button
                onClick={() => setMode("REVISE")}
                title="Pour s'entraîner sous forme d'exercices interactifs pour un DS ou sur des chapitres spécifiques."
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${mode === "REVISE"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <Brain className="h-4 w-4" />
                Fais-moi réviser
              </button>
            </div>
          </div>

          {/* Group selector */}
          {groupes.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Groupe
              </label>
              <select
                value={selectedGroupe?.id || ""}
                onChange={(e) => {
                  const g = groupes.find((g) => g.id === e.target.value);
                  setSelectedGroupe(g || null);
                  setSelectedChapitre("");
                  setSelectedDS("");
                }}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                {groupes.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chapter selector for EXPLIQUE mode */}
          {mode === "EXPLIQUE" && selectedGroupe && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Chapitre
              </label>
              <select
                value={selectedChapitre}
                onChange={(e) => setSelectedChapitre(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les chapitres</option>
                {selectedGroupe.chapitres.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* DS selector for REVISE mode */}
          {mode === "REVISE" && selectedGroupe && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Scope prédéfini (DS)
                </label>
                <select
                  value={selectedDS}
                  onChange={(e) => {
                    setSelectedDS(e.target.value);
                    if (e.target.value) setSelectedChapitresRevise([]); // Clear manual selection if DS selected
                  }}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Aucun (choix manuel)</option>
                  {selectedGroupe.datesDS.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.title} — {new Date(ds.date).toLocaleDateString("fr-FR")}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedDS && selectedGroupe.chapitres.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ou sélectionner des chapitres spécifiques
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {selectedGroupe.chapitres.map((ch) => (
                      <label key={ch.id} className="flex items-start gap-3 cursor-pointer group">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={selectedChapitresRevise.includes(ch.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedChapitresRevise([...selectedChapitresRevise, ch.id]);
                              } else {
                                setSelectedChapitresRevise(selectedChapitresRevise.filter((id) => id !== ch.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 bg-white"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                            {ch.title}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedChapitresRevise.length === 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      Si aucun chapitre n'est sélectionné, la révision portera sur tout le programme.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Types d'exercices
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "EXERCICE", label: "Exercices" },
                    { id: "QCM", label: "QCM" },
                    { id: "OPEN", label: "Questions de cours" }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        if (exerciseTypes.includes(type.id)) {
                          setExerciseTypes(exerciseTypes.filter(t => t !== type.id));
                        } else {
                          setExerciseTypes([...exerciseTypes, type.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        exerciseTypes.includes(type.id)
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedChapitresRevise.length === 1 && 
                (selectedGroupe.chapitres.find(c => c.id === selectedChapitresRevise[0])?.focusConcepts?.length ?? 0) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Concept clé à cibler (optionnel)
                  </label>
                  <select
                    value={selectedKeyword}
                    onChange={(e) => setSelectedKeyword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucun (Global au chapitre)</option>
                    {selectedGroupe.chapitres
                      .find(c => c.id === selectedChapitresRevise[0])
                      ?.focusConcepts?.map((concept, idx) => (
                        <option key={idx} value={concept}>{concept}</option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Niveau de difficulté initial
                </label>
                <select
                  value={difficultyMode}
                  onChange={(e) => setDifficultyMode(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AUTO">Automatique (basé sur tes performances)</option>
                  <option value="FACILE">Facile (Questions très guidées)</option>
                  <option value="MOYEN">Moyen (Questions classiques)</option>
                  <option value="AVANCE">Avancé (Raisonnement poussé)</option>
                </select>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => {
              setShowConfig(false);
              let chapitreName = "tous les chapitres";
              if (selectedChapitre && selectedGroupe) {
                const ch = selectedGroupe.chapitres.find(c => c.id === selectedChapitre);
                if (ch) chapitreName = `le chapitre "${ch.title}"`;
              }
              if (mode === "EXPLIQUE") {
                setMessages([{
                  id: Date.now().toString(),
                  role: "assistant",
                  content: `Bonjour ! Comment veux-tu que je t'aide sur ${chapitreName} ?`,
                  createdAt: new Date().toISOString(),
                }]);
              } else {
                handleSend("Je suis prêt(e) à réviser, pose-moi la première question !");
              }
            }}
            disabled={(mode === "EXPLIQUE" && !selectedGroupe) || (mode === "REVISE" && exerciseTypes.length === 0)}
          >
            <Sparkles className="h-4 w-4" />
            Commencer
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && !showConfig && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
              {mode === "EXPLIQUE" ? (
                <BookOpen className="h-8 w-8 text-blue-600" />
              ) : (
                <Brain className="h-8 w-8 text-indigo-600" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-1">
              {mode === "EXPLIQUE"
                ? "Pose ta question sur le cours"
                : "Prêt(e) à réviser !"}
            </h2>
            <p className="text-sm text-slate-500 max-w-md">
              {mode === "EXPLIQUE"
                ? "Je t'expliquerai la notion en m'appuyant sur ton cours."
                : "Envoie \"C'est parti\" pour commencer les questions."}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 shadow-sm ${message.role === "user"
                ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm"
                : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm"
                }`}
            >
              <div className="prose prose-sm prose-slate max-w-none break-words whitespace-pre-wrap">
                <FormattedMessage content={message.content} />
              </div>
              {(message.createdAt || message.chapterName) && (
                <div className={`flex justify-between items-center text-[10px] ${message.role === "user"
                  ? "mt-1 pt-1 text-indigo-200 justify-end"
                  : "mt-2 pt-2 border-t border-slate-100 text-slate-400"
                  }`}>
                  {message.role !== "user" && (
                    <span>{message.chapterName ? `Chapitre : ${message.chapterName}` : ""}</span>
                  )}
                  <span>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {messages.length === 1 && mode === "EXPLIQUE" && !loading && (
          <div className="flex flex-col gap-2 mt-2 mb-4 animate-fade-in">
            <p className="text-xs text-slate-500 font-medium ml-2">Exemples pour commencer :</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSend("Je ne comprends pas l'exercice 1 question 2")}
                className="text-left text-sm bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-3 py-2 rounded-xl transition-colors border border-slate-200 hover:border-blue-200 shadow-sm"
              >
                Je ne comprends pas l'exercice 1 question 2
              </button>
              <button
                onClick={() => handleSend("Je ne comprends pas la notion de période")}
                className="text-left text-sm bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-3 py-2 rounded-xl transition-colors border border-slate-200 hover:border-blue-200 shadow-sm"
              >
                Je ne comprends pas la notion de période
              </button>
              <button
                onClick={() => handleSend("Je n'ai pas compris la formule de l'énergie cinétique dans le cours")}
                className="text-left text-sm bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-3 py-2 rounded-xl transition-colors border border-slate-200 hover:border-blue-200 shadow-sm"
              >
                Je n'ai pas compris la formule de l'énergie cinétique dans le cours
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="chat-bubble-assistant px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                Réflexion en cours...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quota warning */}
      {quotaRemaining <= 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm mb-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Tu as utilisé tous tes chats du jour. Reviens demain ou 
          {requestedBonus ? (
            <span className="font-medium text-emerald-600">demande envoyée au professeur !</span>
          ) : (
            <button 
              onClick={async () => {
                try {
                  await fetch("/api/eleve/request-chats", { method: "POST" });
                  setRequestedBonus(true);
                } catch (err) {
                  console.error(err);
                }
              }}
              className="underline font-medium hover:text-red-900"
            >
              demande à ton professeur des chats bonus
            </button>
          )}
          .
        </div>
      )}

      {/* Input */}
      {!showConfig && (
        <div className="border-t border-slate-200 pt-3">
          <p className="text-[10px] text-slate-400 text-center mb-2">
            L'IA peut faire des erreurs, pensez à toujours vérifier les réponses générées.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  quotaRemaining <= 0
                    ? "Quota épuisé pour aujourd'hui"
                    : mode === "EXPLIQUE"
                      ? "Pose ta question sur le cours..."
                      : "Ta réponse..."
                }
                disabled={quotaRemaining <= 0 || loading}
                rows={1}
                className="w-full px-4 py-3 pr-16 rounded-xl border border-slate-300 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 max-h-32"
              />
              {/* Word counter */}
              <div
                className={`absolute bottom-2 right-14 text-xs px-1.5 py-0.5 rounded ${isOverLimit
                  ? "text-red-600 bg-red-50 font-medium"
                  : wordCount > MAX_WORDS * 0.8
                    ? "text-amber-600"
                    : "text-slate-400"
                  }`}
              >
                {wordCount}/{MAX_WORDS}
              </div>
            </div>

            <Button
              onClick={() => handleSend()}
              disabled={!canSend}
              className="shrink-0 h-[46px] w-[46px] rounded-xl p-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {isOverLimit && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Limite de {MAX_WORDS} mots par message dépassée
            </p>
          )}
        </div>
      )}
    </div>
  );
}
