import { useState } from 'react';
import { AppState } from './types/simulation';
import { LandingPage } from './components/LandingPage';
import { LandingScreen } from './components/LandingScreen';
import { ActiveSimulation } from './components/ActiveSimulation';

export function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isLiveMode, setIsLiveMode] = useState<boolean>(
    import.meta.env.VITE_USE_LIVE_API === 'true'
  );

  // Transition from Landing Page to Studio
  const handleLaunchStudio = () => {
    setAppState(AppState.STUDIO);
  };

  // Transition from Studio to Active Simulation
  const handleStartSimulation = (prompt: string) => {
    setUserPrompt(prompt);
    setAppState(AppState.ACTIVE);
  };

  // Return to Studio or Landing
  const handleExitSimulation = () => {
    setAppState(AppState.STUDIO);
  };

  const handleBackToLanding = () => {
    setAppState(AppState.LANDING);
  };

  return (
    <main className="w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* 1. MARKETING LANDING PAGE */}
      {appState === AppState.LANDING && (
        <LandingPage
          onLaunchStudio={handleLaunchStudio}
          isLiveMode={isLiveMode}
          onToggleLiveMode={setIsLiveMode}
        />
      )}

      {/* 2. SPATIAL STUDIO WORKSPACE */}
      {appState === AppState.STUDIO && (
        <LandingScreen
          onStartSimulation={handleStartSimulation}
          isLiveMode={isLiveMode}
          onToggleLiveMode={setIsLiveMode}
          onBackToLanding={handleBackToLanding}
        />
      )}

      {/* 3. ACTIVE GENERATIVE SIMULATION */}
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
