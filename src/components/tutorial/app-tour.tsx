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
    },
    {
      target: "nav a[href='/prof/eleves']",
      content: "Dans cet onglet, vous pouvez gérer vos élèves : créer de nouveaux comptes élèves, réinitialiser leurs mots de passe ou les désactiver.",
    },
    {
      target: "nav a[href='/prof/professeurs']",
      content: "Vous pouvez également inviter d'autres professeurs et leur attribuer des classes.",
    },
    {
      target: "nav a[href='/prof/edt']",
      content: "L'Emploi du Temps permet de planifier vos cours. Vous pouvez ajouter des cours uniques ou utiliser la fonction de récurrence (templates) pour gagner du temps.",
    },
    {
      target: "nav a[href='/prof/groupes']",
      content: "L'onglet Groupes est le cœur de la plateforme. C'est ici que vous gérez le contenu pédagogique de chaque classe.",
    },
    {
      target: "nav a[href='/prof/groupes']",
      content: "Dans un groupe, vous pourrez uploader des documents (PDF, etc.) pour nourrir l'IA. C'est ce qu'on appelle le RAG.",
    },
    {
      target: "nav a[href='/prof/groupes']",
      content: "Vous pourrez aussi planifier des DS. L'IA utilisera cette date pour proposer des révisions ciblées aux élèves.",
    },
    {
      target: "nav a[href='/prof/dashboard']",
      content: "Sur le tableau de bord, vous avez accès aux statistiques globales. Dans chaque groupe, vous aurez des statistiques détaillées et des outils pédagogiques.",
    },
    {
      target: "body",
      placement: "center",
      content: "C'est la fin du tutoriel Professeur ! Vous allez être déconnecté.",
    }
  ];

  const eleveSteps: Step[] = [
    {
      target: "body",
      placement: "center",
      content: "Bienvenue sur le compte de démonstration Élève ! Découvrons ce que l'IA peut faire pour toi.",
    },
    {
      target: "nav a[href='/eleve/cours']",
      content: "Ici, tu as accès à tous les documents (PDF, cours) fournis par ton professeur. Tu peux les télécharger (installer) pour les consulter.",
    },
    {
      target: "nav a[href='/eleve/edt']",
      content: "L'Emploi du temps te montre tes prochains cours et tes dates de DS pour te préparer spécifiquement.",
    },
    {
      target: "nav a[href='/eleve/chat']",
      content: "Voici l'assistant IA, le cœur de la plateforme ! Allons voir de plus près.",
    },
    {
      target: ".tour-eleve-chat-modes",
      content: "Tu peux choisir entre deux modes : 'Explique-moi le cours' pour poser des questions ou 'Fais-moi réviser' pour t'entraîner (QCM, exercices).",
    },
    {
      target: ".tour-eleve-chat-ds",
      content: "En mode révision, tu peux cibler spécifiquement un DS à venir. L'IA générera des questions adaptées !",
    },
    {
      target: ".tour-eleve-chat-input",
      content: "Dans le chat, tu peux poser tes questions... mais pas seulement !",
    },
    {
      target: ".tour-eleve-chat-image",
      content: "Tu peux envoyer une photo de ton exercice ou de ton brouillon. L'IA est capable de lire ton écriture et de corriger tes erreurs pas à pas !",
    },
    {
      target: ".tour-eleve-chat-rag",
      content: "Magie de la base de données : Si tu écris 'Aide-moi sur l'exercice 3', l'IA va chercher automatiquement l'énoncé dans les documents de ton prof !",
    },
    {
      target: "body",
      placement: "center",
      content: "C'est la fin de la démonstration Élève. Fin de session !",
    }
  ];

  const steps = identifiant === "p.prof" ? profSteps : eleveSteps;

  useEffect(() => {
    // Wait for hydration and layout
    const timer = setTimeout(() => {
      setRun(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { action, index, status, type } = data;

    if (type === "step:after" && action === "next") {
      const nextIndex = index + 1;
      
      if (identifiant === "p.prof") {
        if (nextIndex === 1) router.push("/prof/eleves");
        if (nextIndex === 2) router.push("/prof/professeurs");
        if (nextIndex === 3) router.push("/prof/edt");
        if (nextIndex >= 4 && nextIndex <= 6) router.push("/prof/groupes");
        if (nextIndex === 7) router.push("/prof/dashboard");
      }
      
      if (identifiant === "e.eleve") {
        if (nextIndex === 1) router.push("/eleve/cours");
        if (nextIndex === 2) router.push("/eleve/edt");
        if (nextIndex >= 3 && nextIndex <= 8) {
          if (pathname !== "/eleve/chat") {
            router.push("/eleve/chat");
          }
        }
      }

      setStepIndex(nextIndex);
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
