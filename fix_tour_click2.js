const fs = require('fs');
const file = 'src/components/tutorial/app-tour.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /if \(!currentStep \|\| !currentStep\.target\) return;/;
const replacement = `if (!currentStep || !currentStep.target || !currentStep.hideFooter) return;`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Fixed click handler');
