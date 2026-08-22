import { useState } from 'react';
import { AppState } from './types/simulation';
import { LandingScreen } from './components/LandingScreen';
import { ActiveSimulation } from './components/ActiveSimulation';

export function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(
    import.meta.env.VITE_USE_LIVE_API === 'true'
  );

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
        <LandingScreen
          onStartSimulation={handleStartSimulation}
          isLiveMode={isLiveMode}
          onToggleLiveMode={setIsLiveMode}
        />
      )}

      {appState === AppState.ACTIVE && (
        <ActiveSimulation
          prompt={userPrompt}
          isLiveMode={isLiveMode}
          onExit={handleExitSimulation}
        />
      )}
    </main>
  );
}

export default App;
