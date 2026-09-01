"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Joyride, STATUS, Step } from "react-joyride";
import { signOut } from "next-auth/react";

interface AppTourProps {
  identifiant: string;
}

export function AppTour({ identifiant }: AppTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // If we are not a demo user, don't run anything.
  if (identifiant !== "p.prof" && identifiant !== "e.eleve") {
    return null;
  }

  const profSteps: any[] = [
    {
      target: "body",
      placement: "center",
      content: "Bienvenue sur le compte de démonstration Professeur ! Faisons un tour rapide des fonctionnalités.",
      skipBeacon: true,
    },
    {
      target: "nav a[href='/prof/groupes']",
      content: "Les groupes sont le cœur de la plateforme. Cliquez sur 'Mes Groupes' pour continuer.",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: ".tour-prof-create-group",
      content: "Ici vous pouvez créer vos classes. Pour la démo, nous avons pré-généré 2 groupes.",
      skipBeacon: true,
    },
    {
      target: ".tour-prof-group-card-terminale",
      content: "Cliquez sur Terminale Spé Maths pour voir les détails.",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: ".tour-prof-doc-item",
      content: "Voici les documents que vous avez partagés (PDF, DOCX). L'IA les lira automatiquement pour aider les élèves.",
      skipBeacon: true,
    },
    {
      target: ".tour-prof-add-doc",
      content: "C'est ici que vous uploadez de nouveaux cours et TD.",
      skipBeacon: true,
    },
    {
      target: ".tour-prof-edit-doc",
      content: "Vous pouvez modifier ou supprimer un document à tout moment.",
      skipBeacon: true,
    },
    {
      target: ".tour-prof-add-ds",
      content: "Planifiez des DS. L'IA générera des révisions ciblées pour les élèves à l'approche de cette date.",
      skipBeacon: true,
    },
    {
      target: ".tour-prof-stats",
      content: "Cet onglet rassemble toutes les statistiques du groupe (erreurs fréquentes, notions mal comprises).",
      skipBeacon: true,
    },
    {
      target: "nav a[href='/prof/edt']",
      content: "L'emploi du temps permet de planifier les séances. Cliquez pour le découvrir !",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: "body",
      placement: "center",
      content: "C'est la fin du tutoriel Professeur ! Vous allez être déconnecté.",
      skipBeacon: true,
    }
  ];

  const eleveSteps: any[] = [
    {
      target: "body",
      placement: "center",
      content: "Bienvenue sur le compte de démonstration Élève ! Découvrons ce que l'IA peut faire pour toi.",
      skipBeacon: true,
    },
    {
      target: "nav a[href='/eleve/cours']",
      content: "Ici tu retrouves tous les documents fournis par ton professeur. Clique dessus pour y accéder.",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: ".tour-eleve-download-doc",
      content: "Tu peux télécharger et consulter le cours ou le TD de ton professeur ici.",
      skipBeacon: true,
    },
    {
      target: "nav a[href='/eleve/edt']",
      content: "Découvre ton emploi du temps ! Clique ici.",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: "nav a[href='/eleve/chat']",
      content: "Allons voir l'assistant IA, le cœur de la plateforme ! Clique sur le Chat.",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: ".tour-eleve-chat-modes",
      content: "Clique sur 'Fais-moi réviser' pour découvrir le mode QCM.",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: ".tour-eleve-chat-ds",
      content: "En mode révision, tu peux cibler un DS à venir. L'IA générera des questions adaptées.",
      skipBeacon: true,
    },
    {
      target: ".tour-eleve-chat-image",
      content: "Tu peux envoyer une photo de ton brouillon. L'IA est capable de lire ton écriture et de corriger tes erreurs !",
      skipBeacon: true,
    },
    {
      target: ".tour-eleve-chat-demo-start",
      content: "Regarde cette simulation pour voir comment l'IA fouille dans les documents du prof pour t'aider. Clique sur 'Lancer la simulation' !",
      hideFooter: true,
      skipBeacon: true,
    },
    {
      target: "body",
      placement: "center",
      content: "C'est la fin de la démonstration Élève. Fin de session !",
      skipBeacon: true,
    }
  ];

  const steps = identifiant === "p.prof" ? profSteps : eleveSteps;

  useEffect(() => {
    const timer = setTimeout(() => {
      setRun(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Allow clicking the target to advance the tour since spotlightClicks was removed in v3
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const currentStep = steps[stepIndex];
      if (!currentStep || !currentStep.target) return;
      
      try {
        const targetElement = typeof currentStep.target === 'string' 
          ? document.querySelector(currentStep.target)
          : null;
          
        if (targetElement && targetElement.contains(e.target as Node)) {
          // If it's a link that changes the route, the route effect will handle it.
          // But for state changes or just advancing, we do it here.
          // Wait a tiny bit to let the React state update if it was a toggle
          setTimeout(() => {
            setStepIndex((prev) => prev + 1);
          }, 50);
        }
      } catch (err) {
        // ignore invalid selectors
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [stepIndex, steps]);

  // Listen for path changes to advance steps automatically
  useEffect(() => {
    if (identifiant === "p.prof") {
      if (stepIndex === 1 && pathname === "/prof/groupes") setStepIndex(2);
      if (stepIndex === 3 && pathname.includes("/prof/groupes/")) setStepIndex(4);
      if (stepIndex === 9 && pathname === "/prof/edt") setStepIndex(10);
    }
    
    if (identifiant === "e.eleve") {
      if (stepIndex === 1 && pathname === "/eleve/cours") setStepIndex(2);
      if (stepIndex === 3 && pathname === "/eleve/edt") setStepIndex(4);
      if (stepIndex === 4 && pathname === "/eleve/chat") setStepIndex(5);
    }
  }, [pathname, stepIndex, identifiant]);

  // Expose a global method to advance the tour from external components (like Chat Simulator finishing)
  useEffect(() => {
    (window as any).__advanceTour = () => {
      setStepIndex((prev) => prev + 1);
    };
    return () => {
      delete (window as any).__advanceTour;
    };
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { action, index, status, type } = data;

    if (type === "step:after" && action === "next") {
      setStepIndex(index + 1);
    } else if (type === "step:after" && action === "prev") {
      setStepIndex(index - 1);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      signOut({ callbackUrl: "/login" });
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      onEvent={handleJoyrideCallback}
      continuous
    />
  );
}
