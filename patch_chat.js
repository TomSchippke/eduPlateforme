const fs = require('fs');
const file = 'src/components/chat/chat-interface.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add isDemo boolean
content = content.replace(
  '  const [isDragging, setIsDragging] = useState(false);',
  '  const [isDragging, setIsDragging] = useState(false);\n  const isDemo = identifiant === "e.eleve";\n  const [simulationRunning, setSimulationRunning] = useState(false);'
);

// 2. Add runSimulation function
const simCode = `
  const runSimulation = async () => {
    if (simulationRunning) return;
    setSimulationRunning(true);
    setMessages([]);
    
    // Step 1: User message with fake image
    await new Promise(r => setTimeout(r, 500));
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      content: "Je bloque sur la question 3 de cet exercice",
      hasImage: true
    }]);

    // Step 2: AI thinks
    await new Promise(r => setTimeout(r, 1000));
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Je vois que tu as commencé à utiliser la formule de l'énergie potentielle. Mais regarde bien l'énoncé de l'exercice 3, il s'agit d'un calcul d'**énergie cinétique** !",
      chapterName: "Énergie Cinétique (La Ferrari)",
      sourceCitations: [{
        documentName: "TD - Exercices sur l'énergie.pdf",
        chapitreTitle: "Énergie Cinétique",
        excerpt: "Exercice 3 : Une Ferrari de 1500kg roule à 130km/h. Calculer son énergie cinétique."
      }]
    }]);

    // Step 3: User replies
    await new Promise(r => setTimeout(r, 3000));
    setMessages(prev => [...prev, {
      id: (Date.now() + 2).toString(),
      role: "user",
      content: "Ah oui c'est vrai, c'est 1/2 * m * v^2 ! Donc 0.5 * 1500 * 130^2 ?"
    }]);

    // Step 4: AI corrects
    await new Promise(r => setTimeout(r, 1500));
    setMessages(prev => [...prev, {
      id: (Date.now() + 3).toString(),
      role: "assistant",
      content: "Presque ! N'oublie pas que dans la formule $E_c = \\frac{1}{2}mv^2$, la vitesse doit être en **mètres par seconde (m/s)** et non en km/h. Essaie de convertir 130 km/h en m/s d'abord."
    }]);
    
    // Step 5: Advance Joyride if exists
    setTimeout(() => {
      if ((window as any).__advanceTour) (window as any).__advanceTour();
      setSimulationRunning(false);
    }, 2000);
  };
`;
content = content.replace(
  '  const handleSend = useCallback(async (overrideMessage?: string) => {',
  simCode + '\n  const handleSend = useCallback(async (overrideMessage?: string) => {'
);

// 3. Add button in UI
const uiCode = `
          {isDemo && (
            <div className="flex justify-center mt-4">
              <Button onClick={runSimulation} disabled={simulationRunning} className="tour-eleve-chat-demo-start bg-emerald-600 hover:bg-emerald-700">
                <Sparkles className="h-4 w-4 mr-2" />
                Lancer la simulation (Démo)
              </Button>
            </div>
          )}
          
          <div className="flex items-end gap-2">
`;
content = content.replace(
  '          <div className="flex items-end gap-2">',
  uiCode
);

fs.writeFileSync(file, content);
console.log('Patch done!');
