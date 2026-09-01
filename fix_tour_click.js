const fs = require('fs');
const file = 'src/components/tutorial/app-tour.tsx';
let content = fs.readFileSync(file, 'utf8');

const useClickEffect = `
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

  // Listen for path changes
`;

content = content.replace(/\/\/ Listen for path changes/g, useClickEffect.trim());
fs.writeFileSync(file, content);
console.log('Click handler added');
