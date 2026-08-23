import { useState } from 'react';
import { AppState } from './types/simulation';
import type { SpatialResearchPayload } from './types/simulation';
import { LockScreen } from './components/LockScreen';
import { LandingPage } from './components/LandingPage';
import { LandingScreen } from './components/LandingScreen';
import { ActiveSimulation } from './components/ActiveSimulation';

export function App() {
  // Gatekeeper Authorization State (Persisted in sessionStorage)
  const [isAuthorized, setIsAuthorized] = useState<boolean>(
    () => sessionStorage.getItem('inception_auth') === 'true'
  );

  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [researchData, setResearchData] = useState<SpatialResearchPayload | null>(null);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(
    import.meta.env.VITE_USE_LIVE_API === 'true'
  );

  // Handle successful PIN unlock
  const handleUnlock = () => {
    sessionStorage.setItem('inception_auth', 'true');
    setIsAuthorized(true);
  };

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

  // 1. GATEKEEPER LOCK SCREEN (If not authorized)
  if (!isAuthorized) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  // 2. MAIN APPLICATION 3-STEP ROUTING MACHINE
  return (
    <main className="w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* STEP 1: MARKETING LANDING PAGE */}
      {appState === AppState.LANDING && (
        <LandingPage
          onLaunchStudio={handleLaunchStudio}
          isLiveMode={isLiveMode}
          onToggleLiveMode={setIsLiveMode}
        />
      )}

      {/* STEP 2: SPATIAL STUDIO WORKSPACE */}
      {appState === AppState.STUDIO && (
        <LandingScreen
          onStartSimulation={handleStartSimulation}
          isLiveMode={isLiveMode}
          onToggleLiveMode={setIsLiveMode}
          onBackToLanding={handleBackToLanding}
        />
      )}

      {/* STEP 3: ACTIVE GENERATIVE SIMULATION */}
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
