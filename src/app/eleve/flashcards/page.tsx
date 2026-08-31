"use client";

import { useEffect, useState } from "react";
import { Sparkles, Brain, ArrowRight, ArrowLeft, FlipHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Flashcard {
  id: string;
  question: string;
  reponse: string;
  chapitre?: { title: string } | null;
}

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/eleve/flashcards")
      .then(res => res.json())
      .then(data => {
        setFlashcards(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, flashcards.length - 1));
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, 150);
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card flip
    if (!confirm("Es-tu sûr(e) de vouloir supprimer définitivement cette flashcard ?")) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/eleve/flashcards/${flashcards[currentIndex].id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      
      const newFlashcards = [...flashcards];
      newFlashcards.splice(currentIndex, 1);
      
      setIsFlipped(false);
      setTimeout(() => {
        setFlashcards(newFlashcards);
        if (currentIndex >= newFlashcards.length) {
          setCurrentIndex(Math.max(0, newFlashcards.length - 1));
        }
        setIsDeleting(false);
      }, 150);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
      alert("Une erreur est survenue lors de la suppression.");
    }
  };

  const handleFlip = () => {
    if (!isDeleting) setIsFlipped(!isFlipped);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-3">
          <Brain className="h-8 w-8 text-indigo-500" />
          Mes Flashcards
        </h1>
        <p className="text-slate-500 mt-2">
          Créées automatiquement lors de tes révisions pour t'aider à mémoriser tes faiblesses.
        </p>
      </div>

      {flashcards.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-lg">Tu n'as pas encore de flashcards.</p>
          <p className="text-sm">Elles apparaîtront ici quand tu feras des erreurs en mode "Révise".</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center text-sm font-medium text-slate-500 px-4">
            <span>Carte {currentIndex + 1} sur {flashcards.length}</span>
            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
              {flashcards[currentIndex].chapitre?.title || "Général"}
            </span>
          </div>

          <div
            className="relative h-[300px] sm:h-[400px] w-full perspective-1000 cursor-pointer group"
            onClick={handleFlip}
          >
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>

              {/* Front (Question) */}
              <div className="absolute inset-0 backface-hidden card p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-white border-2 border-indigo-100 shadow-lg hover:border-indigo-300 transition-colors">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                  title="Supprimer la flashcard définitivement"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-6">Question</p>
                <h3 className="text-xl sm:text-3xl font-medium text-slate-800 leading-relaxed">
                  {flashcards[currentIndex].question}
                </h3>
                <div className="absolute bottom-6 flex items-center gap-2 text-sm text-slate-400 group-hover:text-indigo-400 transition-colors">
                  <FlipHorizontal className="h-4 w-4" />
                  <span>Clique pour retourner</span>
                </div>
              </div>

              {/* Back (Answer) */}
              <div className="absolute inset-0 backface-hidden card p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-indigo-50 border-2 border-indigo-200 rotate-y-180 shadow-lg">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10"
                  title="Supprimer la flashcard définitivement"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-6">Réponse</p>
                <div className="text-lg sm:text-2xl font-medium text-slate-700 leading-relaxed max-h-full overflow-y-auto">
                  {flashcards[currentIndex].reponse}
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ArrowLeft className="h-5 w-5 mr-2" /> Précédente
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
            >
              Suivante <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
