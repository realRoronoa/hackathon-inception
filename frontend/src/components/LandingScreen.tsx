import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Orbit,
  Castle,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';
import { useVoicePrompt } from '../hooks/useVoicePrompt';

interface LandingScreenProps {
  onStartSimulation: (prompt: string) => void;
  isLiveMode: boolean;
  onToggleLiveMode: (live: boolean) => void;
}

interface BentoPreset {
  id: string;
  title: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  fullPrompt: string;
}

const BENTO_PRESETS: BentoPreset[] = [
  {
    id: 'orbital',
    title: 'Orbital Station',
    tag: 'Deep Space',
    icon: Orbit,
    description: 'Drifting derelict space habitat near planetary rings with emergency lighting',
    fullPrompt: 'Abandoned Orbital Station adrift near Saturn rings with flickering emergency lights',
  },
  {
    id: 'manor',
    title: 'Victorian Manor',
    tag: 'Atmospheric',
    icon: Castle,
    description: 'Moody gothic architecture enveloped in midnight thunderstorm and fog',
    fullPrompt: 'Victorian Manor in a dense midnight thunderstorm with torchlit hallways',
  },
  {
    id: 'cyberpunk',
    title: 'Cyberpunk Alley',
    tag: 'Neo-Tokyo',
    icon: Cpu,
    description: 'Rain-drenched neon alley with towering holographic billboards and steam',
    fullPrompt: 'Cyberpunk Alley drenched in neon rain with flying holograms and steam vents',
  },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onStartSimulation,
  isLiveMode,
  onToggleLiveMode,
}) => {
  const [prompt, setPrompt] = useState('');

  // Native Web Speech Recognition hook
  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
  } = useVoicePrompt((dictatedText) => {
    setPrompt(dictatedText);
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isListening) {
      stopListening();
    }
    const trimmed = prompt.trim();
    if (trimmed) {
      onStartSimulation(trimmed);
    }
  };

  const handleSelectPreset = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };

  const toggleVoiceDictation = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#030712] text-zinc-100 flex flex-col items-center justify-between p-6 sm:p-10 overflow-hidden select-none">
      
      {/* 1. Background Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* 2. Top-Center Ambient Glow Orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-[350px] bg-gradient-to-b from-cyan-500/15 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[250px] bg-blue-600/5 blur-[140px] pointer-events-none" />

      {/* 3. Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-zinc-300">
          <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-cyan-400 shadow-sm">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-white">INCEPTION</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-normal">ENGINE 2.0</span>
        </div>

        {/* Mode Switcher Pill */}
        <button
          type="button"
          onClick={() => onToggleLiveMode(!isLiveMode)}
          className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono tracking-wider backdrop-blur-xl border transition-all duration-300 active:scale-95 shadow-xl ${
            isLiveMode
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300 hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
          }`}
          title="Toggle between Live GPU Model and Free Mock Engine"
        >
          {isLiveMode ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>LIVE REACTOR API</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>FREE MOCK MODE (0 CREDITS)</span>
            </>
          )}
        </button>
      </header>

      {/* 4. Main Hero & Interactive Workspace */}
      <main className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center space-y-9 my-auto py-8">
        
        {/* Hero Badge & Title */}
        <div className="space-y-4 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-mono tracking-widest uppercase backdrop-blur-xl shadow-lg hover:border-blue-500/30 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse" />
            <Sparkles className="w-3 h-3 text-blue-300" />
            <span>REAL-TIME WORLD GENERATION</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight font-sans bg-gradient-to-b from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent drop-shadow-sm">
            Inception Engine
          </h1>

          <p className="text-sm md:text-base text-zinc-400 font-light max-w-md mx-auto leading-relaxed">
            Step inside infinite, steerable generative 3D spaces driven by real-time neural diffusion and voice.
          </p>
        </div>

        {/* Interactive Command Search Bar */}
        <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
          <div className="relative group w-full">
            {/* Ambient Dual-Layer Glow Border */}
            <div
              className={`absolute -inset-0.5 rounded-2xl blur-md transition-all duration-500 ${
                isListening
                  ? 'bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500 opacity-85 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500/30 via-blue-500/20 to-indigo-500/30 opacity-40 group-hover:opacity-80 group-focus-within:opacity-100'
              }`}
            />

            {/* Inner Glassmorphic Input Card */}
            <div
              className={`relative flex items-center bg-zinc-950/80 border rounded-2xl p-2 backdrop-blur-2xl transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                isListening
                  ? 'border-rose-500/80 shadow-[0_0_40px_rgba(244,63,94,0.3)]'
                  : 'border-white/10 group-focus-within:border-cyan-500/50'
              }`}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening to your voice...'
                    : 'Describe the world you want to step into...'
                }
                className="w-full bg-transparent px-4 py-3.5 text-base md:text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none font-light tracking-wide"
                autoFocus
              />

              {/* Voice Dictation Button */}
              <button
                type="button"
                onClick={toggleVoiceDictation}
                title={
                  !isSupported
                    ? 'Speech Recognition not supported in this browser'
                    : isListening
                    ? 'Stop listening'
                    : 'Dictate prompt via microphone'
                }
                disabled={!isSupported}
                className={`relative p-3 rounded-xl transition-all duration-200 mr-2 flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] disabled:opacity-30'
                }`}
              >
                {isListening ? (
                  <>
                    <Mic className="w-5 h-5 text-rose-400 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    </span>
                  </>
                ) : !isSupported ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Accented Submit Button */}
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="flex items-center justify-center px-5 py-3 rounded-xl bg-white text-zinc-950 font-semibold text-sm transition-all duration-200 hover:bg-zinc-100 hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 5. Bento-Style Preset Cards */}
          <div className="pt-2 w-full space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-mono tracking-wider px-1">
              <span>EXPLORE SCENARIOS</span>
              <span>3 SECTORS AVAILABLE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
              {BENTO_PRESETS.map((preset) => {
                const IconComponent = preset.icon;
                const isSelected = prompt === preset.fullPrompt;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.fullPrompt)}
                    className={`group relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-300 backdrop-blur-xl active:scale-[0.98] ${
                      isSelected
                        ? 'bg-white/[0.08] border-cyan-500/70 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
                        : 'bg-zinc-900/40 border-white/[0.07] hover:border-cyan-500/50 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div className="p-2 rounded-xl bg-white/[0.06] border border-white/5 text-zinc-300 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                        {preset.tag}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors mb-1">
                      {preset.title}
                    </h3>

                    <p className="text-[11px] text-zinc-400 font-light line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

      </main>

      {/* 6. Clean Floating Telemetry Status Bar */}
      <footer className="relative z-20 w-full flex items-center justify-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-zinc-950/70 backdrop-blur-xl text-xs font-mono text-zinc-400 shadow-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-zinc-300">WebRTC Stream Ready</span>
          <span className="text-zinc-700">•</span>
          <span>WASD & Voice Active</span>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <div className="hidden sm:flex items-center gap-1 text-cyan-400">
            <Terminal className="w-3 h-3" />
            <span>DIRECTIVE CONSOLE [TAB]</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
export default LandingScreen;
