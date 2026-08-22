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
  Activity,
  Compass,
} from 'lucide-react';
import { useVoicePrompt } from '../hooks/useVoicePrompt';

interface LandingScreenProps {
  onStartSimulation: (prompt: string) => void;
  isLiveMode: boolean;
  onToggleLiveMode: (live: boolean) => void;
}

interface PresetItem {
  id: string;
  name: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

const PRESET_WORLDS: PresetItem[] = [
  {
    id: 'orbital',
    name: 'Orbital Station',
    tag: 'Deep Space',
    icon: Orbit,
    prompt: 'Abandoned Orbital Station adrift near Saturn rings with flickering emergency lights',
  },
  {
    id: 'manor',
    name: 'Victorian Manor',
    tag: 'Gothic Mystery',
    icon: Castle,
    prompt: 'Victorian Manor in a dense midnight thunderstorm with torchlit hallways',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Alley',
    tag: 'Neo-Tokyo',
    icon: Cpu,
    prompt: 'Cyberpunk Alley drenched in neon rain with flying holograms and steam vents',
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
    <div className="relative w-full h-full min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center px-4 overflow-hidden select-none">
      
      {/* 1. Background Grid & Ambient Lighting Glows */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 85%)',
        }}
      />

      {/* Multi-layered blurred ambient color orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/15 via-cyan-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 2. Top-Right Mode Switcher Pill */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggleLiveMode(!isLiveMode)}
          className={`group flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-mono tracking-wider backdrop-blur-xl border transition-all duration-300 active:scale-95 shadow-2xl ${
            isLiveMode
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-300 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
          }`}
          title="Switch between Live GPU Generation and Free Mock Engine"
        >
          {isLiveMode ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">LIVE REACTOR API</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">FREE MOCK ENGINE (0 CREDITS)</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Hero Content Center Container */}
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center space-y-8 py-10">
        
        {/* Top Header & Badge */}
        <div className="space-y-4 flex flex-col items-center">
          {/* Glass Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 text-[11px] font-mono tracking-widest uppercase backdrop-blur-xl shadow-lg hover:border-white/20 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span>Generative Interactive Environment</span>
          </div>

          {/* Linear / Vercel style Gradient Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extralight tracking-tight font-sans bg-gradient-to-b from-white via-zinc-100 to-zinc-400/80 bg-clip-text text-transparent drop-shadow-sm">
            Inception Engine
          </h1>

          <p className="text-sm md:text-base text-zinc-400 font-light max-w-lg mx-auto leading-relaxed">
            Step into infinite real-time generative neural worlds. Steer reality via keyboard and voice dictation.
          </p>
        </div>

        {/* 4. Glassmorphic Prompt Input Box */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative group w-full">
            {/* Outer Glow Ring on Focus / Listening */}
            <div
              className={`absolute -inset-1 rounded-3xl blur-md transition-all duration-500 ${
                isListening
                  ? 'bg-gradient-to-r from-rose-500 via-rose-400 to-rose-500 opacity-80 animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20 opacity-30 group-focus-within:opacity-80 group-hover:opacity-50'
              }`}
            />

            {/* Input Frosted Card */}
            <div
              className={`relative flex items-center bg-zinc-950/70 border rounded-2xl p-2 backdrop-blur-2xl transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                isListening
                  ? 'border-rose-500/70 shadow-[0_0_40px_rgba(244,63,94,0.25)]'
                  : 'border-white/10 group-focus-within:border-white/25'
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

              {/* Submit Pill Arrow */}
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
          <div className="pt-3 flex flex-col items-center space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono tracking-wider">
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span>FEATURED PRESETS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              {PRESET_WORLDS.map((preset) => {
                const IconComponent = preset.icon;
                const isSelected = prompt === preset.prompt;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.prompt)}
                    className={`group relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-200 backdrop-blur-xl active:scale-[0.98] ${
                      isSelected
                        ? 'bg-white/[0.08] border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'bg-zinc-950/50 border-white/[0.07] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white/[0.05] text-zinc-300 group-hover:text-cyan-400 transition-colors">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
                          {preset.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">
                        {preset.tag}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 font-light line-clamp-1 leading-relaxed">
                      {preset.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* 6. Clean Telemetry Footer Bar */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>60 FPS REAL-TIME</span>
          </div>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>WEBRTC LOW-LATENCY</span>
          </div>
          <span className="text-zinc-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5">
            <span>WASD & LOOK CAMERA READY</span>
          </div>
        </div>

      </div>
    </div>
  );
};
export default LandingScreen;
