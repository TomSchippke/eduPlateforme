const fs = require('fs');
const file = 'src/components/tutorial/app-tour.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace disableBeacon with skipBeacon
content = content.replace(/disableBeacon: true/g, 'skipBeacon: true');

// Remove spotlightClicks
content = content.replace(/spotlightClicks: true,/g, '');

// Remove hideNextButton (or I can keep it if I typecast it)
content = content.replace(/hideNextButton: true,/g, '');

// Fix Type
content = content.replace(/const profSteps: Step\[\] = \[/g, 'const profSteps: any[] = [');
content = content.replace(/const eleveSteps: Step\[\] = \[/g, 'const eleveSteps: any[] = [');

fs.writeFileSync(file, content);
console.log('Fix done!');
