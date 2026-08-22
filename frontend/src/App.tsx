import { useState } from 'react';
import { AppState } from './types/simulation';
import { LandingScreen } from './components/LandingScreen';
import { ActiveSimulation } from './components/ActiveSimulation';

export function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [userPrompt, setUserPrompt] = useState<string>('');

  const handleStartSimulation = (prompt: string) => {
    setUserPrompt(prompt);
    setAppState(AppState.ACTIVE);
  };

  const handleExitSimulation = () => {
    setAppState(AppState.LANDING);
  };

  return (
    <main className="w-screen h-screen overflow-hidden bg-black text-white select-none">
      {appState === AppState.LANDING && (
        <LandingScreen onStartSimulation={handleStartSimulation} />
      )}

      {appState === AppState.ACTIVE && (
        <ActiveSimulation
          prompt={userPrompt}
          onExit={handleExitSimulation}
        />
      )}
    </main>
  );
}

export default App;
