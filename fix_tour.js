const fs = require('fs');
const file = 'src/components/tutorial/app-tour.tsx';
let content = fs.readFileSync(file, 'utf8');

// For Prof:
content = content.replace(
  /target: "nav a\[href='\/prof\/groupes'\]",\n\s*content: ".*?",\n\s*skipBeacon: true,/g,
  'target: "nav a[href=\'/prof/groupes\']",\n      content: "Les groupes sont le cœur de la plateforme. Cliquez sur \'Mes Groupes\' pour continuer.",\n      hideFooter: true,\n      skipBeacon: true,'
);
content = content.replace(
  /target: ".tour-prof-group-card",\n\s*content: ".*?",\n\s*skipBeacon: true,/g,
  'target: ".tour-prof-group-card",\n      content: "Cliquez sur un groupe pour voir les détails.",\n      hideFooter: true,\n      skipBeacon: true,'
);
content = content.replace(
  /target: "nav a\[href='\/prof\/edt'\]",\n\s*content: ".*?",\n\s*skipBeacon: true,/g,
  'target: "nav a[href=\'/prof/edt\']",\n      content: "L\'emploi du temps permet de planifier les séances. Cliquez pour le découvrir !",\n      hideFooter: true,\n      skipBeacon: true,'
);

// For Eleve:
content = content.replace(
  /target: "nav a\[href='\/eleve\/cours'\]",\n\s*content: ".*?",\n\s*skipBeacon: true,/g,
  'target: "nav a[href=\'/eleve/cours\']",\n      content: "Ici tu retrouves tous les documents fournis par ton professeur. Clique dessus pour y accéder.",\n      hideFooter: true,\n      skipBeacon: true,'
);
content = content.replace(
  /target: "nav a\[href='\/eleve\/edt'\]",\n\s*content: ".*?",\n\s*skipBeacon: true,/g,
  'target: "nav a[href=\'/eleve/edt\']",\n      content: "Découvre ton emploi du temps ! Clique ici.",\n      hideFooter: true,\n      skipBeacon: true,'
);
content = content.replace(
  /target: "nav a\[href='\/eleve\/chat'\]",\n\s*content: ".*?",\n\s*skipBeacon: true,/g,
  'target: "nav a[href=\'/eleve/chat\']",\n      content: "Allons voir l\'assistant IA, le cœur de la plateforme ! Clique sur le Chat.",\n      hideFooter: true,\n      skipBeacon: true,'
);
content = content.replace(
  /target: ".tour-eleve-chat-demo-start",\n\s*content: ".*?",\n\s*skipBeacon: true,/g,
  'target: ".tour-eleve-chat-demo-start",\n      content: "Regarde cette simulation pour voir comment l\'IA fouille dans les documents du prof pour t\'aider. Clique sur \'Lancer la simulation\' !",\n      hideFooter: true,\n      skipBeacon: true,'
);

fs.writeFileSync(file, content);
console.log('Tour fixed!');
