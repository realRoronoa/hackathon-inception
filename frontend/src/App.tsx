import { useState } from 'react';
import { AppState } from './types/simulation';
import type { SpatialResearchPayload } from './types/simulation';
import { LandingPage } from './components/LandingPage';
import { LandingScreen } from './components/LandingScreen';
import { ActiveSimulation } from './components/ActiveSimulation';

export function App() {
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [researchData, setResearchData] = useState<SpatialResearchPayload | null>(null);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(
    import.meta.env.VITE_USE_LIVE_API === 'true'
  );

  // Transition from Landing Page to Studio
  const handleLaunchStudio = () => {
    setAppState(AppState.STUDIO);
  };

  // Transition from Studio to Active Simulation with LLM research data
  const handleStartSimulation = (payload: SpatialResearchPayload) => {
    setResearchData(payload);
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
          prompt={researchData?.reactor_prompt || 'Urban spatial environment'}
          researchData={researchData}
          isLiveMode={isLiveMode}
          onExit={handleExitSimulation}
        />
      )}
    </main>
  );
}

export default App;
