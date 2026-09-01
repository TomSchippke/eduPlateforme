const fs = require('fs');
const file = 'src/components/tutorial/app-tour.tsx';
let content = fs.readFileSync(file, 'utf8');

const profSteps = `
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
      target: ".tour-prof-doc-item",
      content: "Voici les documents que vous avez partagés (PDF, DOCX). L'IA les lira automatiquement pour aider les élèves.",
      disableBeacon: true,
    },
    {
      target: ".tour-prof-add-doc",
      content: "C'est ici que vous uploadez de nouveaux cours et TD.",
      disableBeacon: true,
    },
    {
      target: ".tour-prof-edit-doc",
      content: "Vous pouvez modifier ou supprimer un document à tout moment.",
      disableBeacon: true,
    },
    {
      target: ".tour-prof-add-ds",
      content: "Planifiez des DS. L'IA générera des révisions ciblées pour les élèves à l'approche de cette date.",
      disableBeacon: true,
    },
    {
      target: ".tour-prof-stats",
      content: "Cet onglet rassemble toutes les statistiques du groupe (erreurs fréquentes, notions mal comprises).",
      disableBeacon: true,
    },
    {
      target: "nav a[href='/prof/edt']",
      content: "L'emploi du temps permet de planifier les séances. Cliquez pour le découvrir !",
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
`;

const eleveSteps = `
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
      target: ".tour-eleve-download-doc",
      content: "Tu peux télécharger et consulter le cours ou le TD de ton professeur ici.",
      disableBeacon: true,
    },
    {
      target: "nav a[href='/eleve/edt']",
      content: "Découvre ton emploi du temps ! Clique ici.",
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
`;

content = content.replace(/const profSteps: Step\[\] = \[([\s\S]*?)\];/g, profSteps.trim());
content = content.replace(/const eleveSteps: Step\[\] = \[([\s\S]*?)\];/g, eleveSteps.trim());

const useEffects = `
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
`;

content = content.replace(/\/\/ Listen for path changes to advance steps automatically[\s\S]*?}, \[pathname, stepIndex, identifiant\]\);/g, useEffects.trim());

fs.writeFileSync(file, content);
