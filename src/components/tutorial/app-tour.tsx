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

  const profSteps: Step[] = [
    {
      target: "body",
      placement: "center",
      content: "Bienvenue sur le compte de démonstration Professeur ! Faisons un tour rapide des fonctionnalités.",
      disableBeacon: true,
    },
    {
      target: "nav a[href='/prof/groupes']",
      content: "Les groupes sont le cœur de la plateforme. Cliquez sur 'Mes Groupes' pour continuer.",
      spotlightClicks: true,
      hideNextButton: true,
      disableBeacon: true,
    },
    {
      target: ".tour-prof-create-group",
      content: "Ici vous pouvez créer vos classes. Pour la démo, nous avons pré-généré 2 groupes.",
      disableBeacon: true,
    },
    {
      target: ".tour-prof-group-card",
      content: "Cliquez sur 'Terminale Spé Maths' pour voir les détails d'un groupe.",
      spotlightClicks: true,
      hideNextButton: true,
      disableBeacon: true,
    },
    {
      target: ".tour-prof-add-doc",
      content: "C'est ici que vous uploadez vos cours et TD. L'IA les lira automatiquement et fera le lien avec les questions des élèves !",
      disableBeacon: true,
    },
    {
      target: ".tour-prof-add-ds",
      content: "Planifiez des DS. L'IA générera des révisions ciblées pour les élèves à l'approche de cette date.",
      disableBeacon: true,
    },
    {
      target: "nav a[href='/prof/dashboard']",
      content: "Enfin, cliquez sur 'Tableau de bord' pour voir les statistiques globales.",
      spotlightClicks: true,
      hideNextButton: true,
      disableBeacon: true,
    },
    {
      target: "body",
      placement: "center",
      content: "C'est la fin du tutoriel Professeur ! Vous allez être déconnecté.",
      disableBeacon: true,
    }
  ];

  const eleveSteps: Step[] = [
    {
      target: "body",
      placement: "center",
      content: "Bienvenue sur le compte de démonstration Élève ! Découvrons ce que l'IA peut faire pour toi.",
      disableBeacon: true,
    },
    {
      target: "nav a[href='/eleve/cours']",
      content: "Ici tu retrouves tous les documents fournis par ton professeur. Clique dessus pour y accéder.",
      spotlightClicks: true,
      hideNextButton: true,
      disableBeacon: true,
    },
    {
      target: "nav a[href='/eleve/chat']",
      content: "Allons voir l'assistant IA, le cœur de la plateforme ! Clique sur le Chat.",
      spotlightClicks: true,
      hideNextButton: true,
      disableBeacon: true,
    },
    {
      target: ".tour-eleve-chat-modes",
      content: "Tu peux choisir entre deux modes : 'Explique-moi le cours' ou 'Fais-moi réviser' (QCM).",
      disableBeacon: true,
    },
    {
      target: ".tour-eleve-chat-ds",
      content: "En mode révision, tu peux cibler un DS à venir. L'IA générera des questions adaptées.",
      disableBeacon: true,
    },
    {
      target: ".tour-eleve-chat-image",
      content: "Tu peux envoyer une photo de ton brouillon. L'IA est capable de lire ton écriture et de corriger tes erreurs !",
      disableBeacon: true,
    },
    {
      target: ".tour-eleve-chat-demo-start",
      content: "Regarde cette simulation pour voir comment l'IA fouille dans les documents du prof pour t'aider. Clique sur 'Lancer la simulation' !",
      spotlightClicks: true,
      hideNextButton: true,
      disableBeacon: true,
    },
    {
      target: "body",
      placement: "center",
      content: "C'est la fin de la démonstration Élève. Fin de session !",
      disableBeacon: true,
    }
  ];

  const steps = identifiant === "p.prof" ? profSteps : eleveSteps;

  useEffect(() => {
    const timer = setTimeout(() => {
      setRun(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Listen for path changes to advance steps automatically
  useEffect(() => {
    if (identifiant === "p.prof") {
      if (stepIndex === 1 && pathname === "/prof/groupes") setStepIndex(2);
      if (stepIndex === 3 && pathname.includes("/prof/groupes/")) setStepIndex(4);
      if (stepIndex === 6 && pathname === "/prof/dashboard") setStepIndex(7);
    }
    
    if (identifiant === "e.eleve") {
      if (stepIndex === 1 && pathname === "/eleve/cours") setStepIndex(2);
      if (stepIndex === 2 && pathname === "/eleve/chat") setStepIndex(3);
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
      styles={{
        options: {
          primaryColor: "#3b82f6",
        }
      }}
    />
  );
}
