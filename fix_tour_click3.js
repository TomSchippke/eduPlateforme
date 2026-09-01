const fs = require('fs');
const file = 'src/components/tutorial/app-tour.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(!currentStep \|\| !currentStep\.target \|\| !currentStep\.hideFooter\) return;/;
const replacement = `if (!currentStep || !currentStep.target || !currentStep.hideFooter) return;
      if (currentStep.target === '.tour-eleve-chat-demo-start') return; // Handled internally by simulation`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Fixed chat demo click handler');
