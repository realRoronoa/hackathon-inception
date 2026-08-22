import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  ArrowRight,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { useVoicePrompt } from '../hooks/useVoicePrompt';
import { LogbookModal } from './LogbookModal';
import type { SnapshotItem } from './LogbookModal';
import { expandCinematicPrompt } from '../utils/themeWrapper';

interface LandingScreenProps {
  onStartSimulation: (prompt: string) => void;
  isLiveMode: boolean;
  onToggleLiveMode: (live: boolean) => void;
}

interface SectorCard {
  id: string;
  icon: string;
  tag: string;
  title: string;
  description: string;
  prompt: string;
}

const SECTORS: SectorCard[] = [
  {
    id: 'smart-kitchen',
    icon: '◒',
    tag: 'BOMMANAHALLI • IOT',
    title: 'Smart Kitchen Hub',
    description:
      'High-end operational smart kitchen showroom with polished stainless steel counters, embedded digital displays, and warm LED lighting.',
    prompt:
      'A high-end operational smart kitchen showroom with polished stainless steel counters, embedded digital displays, and warm architectural LED lighting, cinematic exploration aesthetic',
  },
  {
    id: 'ev-showroom',
    icon: '▦',
    tag: 'INDIRANAGAR • EV',
    title: 'Urban EV Showroom',
    description:
      'Minimalist futuristic electric vehicle showroom with glossy epoxy floors, neon accent strips, and a sleek vehicle platform.',
    prompt:
      'A minimalist futuristic electric vehicle showroom with glossy epoxy floors, neon accent strips, and a sleek vehicle platform, high-end sci-fi atmosphere',
  },
  {
    id: 'ai-flagship',
    icon: '◫',
    tag: 'OPERA HOUSE • TECH',
    title: 'AI Connected Flagship',
    description:
      'Multi-zone interactive consumer electronics flagship lounge with curved ambient screens and futuristic smart home displays.',
    prompt:
      'A multi-zone interactive consumer electronics flagship lounge with curved ambient screens and futuristic smart home displays, cinematic lighting',
  },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onStartSimulation,
  isLiveMode,
  onToggleLiveMode,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLogbookOpen, setIsLogbookOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Load saved snapshots from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('inception_snapshots') || '[]';
      setSnapshots(JSON.parse(raw));
    } catch {}
  }, [isLogbookOpen]);

  const handleClearSnapshots = () => {
    localStorage.removeItem('inception_snapshots');
    setSnapshots([]);
  };

  // AI Prompt Expansion
  const handleEnhancePrompt = () => {
    setIsEnhancing(true);
    const expanded = expandCinematicPrompt(prompt);
    setPrompt(expanded);
    setTimeout(() => setIsEnhancing(false), 600);
  };

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

  const handleSelectSector = (sectorPrompt: string) => {
    setPrompt(sectorPrompt);
  };

  const toggleVoiceDictation = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div
      className="relative w-full h-full min-h-screen overflow-x-hidden overflow-y-auto select-none"
      style={{
        backgroundColor: '#090C11',
        color: '#E7ECF3',
        fontFamily: "'Inter', sans-serif",
        backgroundImage: `
          linear-gradient(rgba(150, 170, 200, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(150, 170, 200, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        backgroundPosition: 'center -1px',
      }}
    >
      {/* Logbook Gallery Modal */}
      <LogbookModal
        isOpen={isLogbookOpen}
        onClose={() => setIsLogbookOpen(false)}
        snapshots={snapshots}
        onClear={handleClearSnapshots}
      />

      {/* 1. TOP BAR */}
      <header
        className="w-full flex items-center justify-between px-6 sm:px-10 py-5 border-b"
        style={{
          borderColor: 'rgba(150, 170, 200, 0.14)',
          background: 'linear-gradient(180deg, rgba(9,12,17,0.92), rgba(9,12,17,0.5))',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 flex items-center justify-center text-sm font-bold border"
            style={{
              borderColor: '#4FD8E8',
              color: '#4FD8E8',
              backgroundColor: 'rgba(79,216,232,0.06)',
            }}
          >
            ◆
          </div>
          <div
            className="text-[13px] tracking-wider"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <b className="font-semibold text-[#E7ECF3]">INCEPTION</b>{' '}
            <span className="text-[#5B6577]">/ ENGINE 2.0</span>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          {/* Flight Logbook Button */}
          <button
            type="button"
            onClick={() => setIsLogbookOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] tracking-wider border text-[#8E9AAE] hover:text-[#E7ECF3] hover:border-[#4FD8E8] transition-all"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              borderColor: 'rgba(150,170,200,0.18)',
              backgroundColor: 'rgba(16,21,29,0.8)',
            }}
            title="Open Mission Logbook (Past Snapshots)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#4FD8E8]" />
            <span>LOGBOOK ({snapshots.length})</span>
          </button>

          {/* Interactive Mode Toggle Pill */}
          <button
            type="button"
            onClick={() => onToggleLiveMode(!isLiveMode)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: isLiveMode ? 'rgba(240,169,63,0.12)' : 'rgba(79,216,232,0.12)',
              borderColor: isLiveMode ? 'rgba(240,169,63,0.35)' : 'rgba(79,216,232,0.35)',
              borderWidth: '1px',
              borderStyle: 'solid',
              color: isLiveMode ? '#F0A93F' : '#4FD8E8',
            }}
            title="Click to toggle between Live Reactor API and Free Mock Engine"
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: isLiveMode ? '#F0A93F' : '#4FD8E8' }}
            />
            <span className="font-medium">
              {isLiveMode ? 'LIVE REACTOR API' : 'FREE MOCK MODE (0 CREDITS)'}
            </span>
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <main className="max-w-[760px] mx-auto px-6 pt-16 sm:pt-24 pb-12 text-center">
        {/* Eyebrow Pill */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] tracking-widest uppercase mb-7"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            backgroundColor: 'rgba(79,216,232,0.12)',
            borderColor: 'rgba(79,216,232,0.35)',
            borderWidth: '1px',
            borderStyle: 'solid',
            color: '#4FD8E8',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#4FD8E8]" />
          <span>REAL-TIME WORLD GENERATION</span>
        </div>

        {/* Hero Title in Space Grotesk */}
        <h1
          className="text-4xl sm:text-6xl font-semibold tracking-tight mb-5"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#E7ECF3',
          }}
        >
          Inception Engine
        </h1>

        {/* Subtitle */}
        <p
          className="text-[15px] sm:text-[17px] leading-relaxed max-w-[540px] mx-auto mb-10 text-[#8E9AAE] font-normal"
        >
          Step inside infinite, steerable generative worlds — driven by real-time neural diffusion,
          spoken directives, and consequences that remember your decisions.
        </p>

        {/* 3. SIGNATURE HUD CONSOLE INPUT FRAME */}
        <form onSubmit={handleSubmit} className="relative max-w-[640px] mx-auto p-5 group">
          {/* Top-Left & Top-Right Corner Ticks */}
          <div
            className="absolute top-0 left-0 w-4 h-4 border-t border-l pointer-events-none transition-colors duration-300"
            style={{
              borderColor: isListening ? '#4FD8E8' : 'rgba(150,170,200,0.35)',
            }}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 border-t border-r pointer-events-none transition-colors duration-300"
            style={{
              borderColor: isListening ? '#4FD8E8' : 'rgba(150,170,200,0.35)',
            }}
          />

          {/* Console Inner Container */}
          <div className="relative">
            {/* Bottom-Left & Bottom-Right Corner Ticks */}
            <div
              className="absolute bottom-0 left-0 w-4 h-4 border-b border-l pointer-events-none transition-colors duration-300"
              style={{
                borderColor: isListening ? '#4FD8E8' : 'rgba(150,170,200,0.35)',
              }}
            />
            <div
              className="absolute bottom-0 right-0 w-4 h-4 border-b border-r pointer-events-none transition-colors duration-300"
              style={{
                borderColor: isListening ? '#4FD8E8' : 'rgba(150,170,200,0.35)',
              }}
            />

            {/* Input Row Box */}
            <div
              className="flex items-center gap-3 pl-5 pr-1.5 py-1.5 transition-all duration-300"
              style={{
                backgroundColor: '#10151D',
                borderColor: isListening ? '#4FD8E8' : 'rgba(150,170,200,0.18)',
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: isListening ? '0 0 30px rgba(79,216,232,0.2)' : 'none',
              }}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening to your voice…'
                    : 'Describe the world you want to step into…'
                }
                className="flex-1 bg-transparent border-none outline-none text-[#E7ECF3] text-[15px] py-3 font-normal placeholder-[#5B6577]"
                autoFocus
              />

              {/* AI Prompt Enhancer Button */}
              <button
                type="button"
                onClick={handleEnhancePrompt}
                className={`flex items-center gap-1.5 px-3 py-2 border text-[11px] font-mono transition-all duration-200 cursor-pointer active:scale-95 ${
                  isEnhancing
                    ? 'border-[#4FD8E8] text-[#4FD8E8] bg-[#4FD8E8]/20 shadow-[0_0_20px_rgba(79,216,232,0.4)] animate-pulse'
                    : 'border-[rgba(150,170,200,0.18)] text-[#8E9AAE] hover:text-[#4FD8E8] hover:border-[#4FD8E8]/60 bg-white/[0.02]'
                }`}
                title="Enhance prompt with cinematic atmosphere"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin text-[#4FD8E8]' : 'text-[#4FD8E8]'}`} />
                <span className="hidden sm:inline">Enhance</span>
              </button>

              {/* Voice Input Button */}
              <button
                type="button"
                onClick={toggleVoiceDictation}
                disabled={!isSupported}
                className="w-10 h-10 flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 border"
                style={{
                  backgroundColor: isListening ? 'rgba(79,216,232,0.18)' : 'transparent',
                  borderColor: isListening ? '#4FD8E8' : 'rgba(150,170,200,0.18)',
                  color: isListening ? '#4FD8E8' : '#8E9AAE',
                }}
                title={isListening ? 'Stop recording' : 'Dictate prompt via microphone'}
                aria-label="Voice input"
              >
                {isListening ? (
                  <Mic className="w-4 h-4 animate-bounce text-[#4FD8E8]" />
                ) : !isSupported ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="w-11 h-11 flex items-center justify-center transition-opacity duration-200 cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                style={{
                  backgroundColor: '#4FD8E8',
                  color: '#04262B',
                }}
                aria-label="Generate world"
              >
                <ArrowRight className="w-4 h-4 font-bold" />
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* 4. SECTORS EXPLORE CARDS */}
      <section className="max-w-[920px] mx-auto px-6 mt-4">
        <div
          className="flex justify-between items-center mb-4 text-[11px] tracking-wider text-[#5B6577]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <span>EXPLORE SECTORS</span>
          <b className="font-medium text-[#8E9AAE]">3 AVAILABLE</b>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {SECTORS.map((sector) => {
            const isSelected = prompt === sector.prompt;

            return (
              <div
                key={sector.id}
                onClick={() => handleSelectSector(sector.prompt)}
                className="p-5 text-left cursor-pointer transition-all duration-200 border"
                style={{
                  backgroundColor: isSelected ? 'rgba(79,216,232,0.06)' : '#0D1119',
                  borderColor: isSelected ? '#4FD8E8' : 'rgba(150,170,200,0.14)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4FD8E8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(150,170,200,0.14)';
                    e.currentTarget.style.transform = 'none';
                  }
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="w-8 h-8 flex items-center justify-center text-sm border text-[#8E9AAE]"
                    style={{ borderColor: 'rgba(150,170,200,0.14)' }}
                  >
                    {sector.icon}
                  </div>
                  <div
                    className="text-[10px] tracking-wider px-2 py-1 border text-[#5B6577]"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      borderColor: 'rgba(150,170,200,0.14)',
                    }}
                  >
                    {sector.tag}
                  </div>
                </div>

                <h3 className="text-[15px] font-medium mb-2 text-[#E7ECF3]">
                  {sector.title}
                </h3>
                <p className="text-[13px] leading-relaxed text-[#8E9AAE] line-clamp-2">
                  {sector.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. STATUS BAR */}
      <footer
        className="max-w-[920px] mx-auto mt-14 mb-8 px-6 py-4 border-t flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-9 text-[11px] text-[#5B6577]"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          borderColor: 'rgba(150,170,200,0.14)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4FD8E8]" />
          <b className="font-normal text-[#8E9AAE]">WebRTC stream ready</b>
        </div>
        <div className="flex items-center gap-2">
          <b className="font-normal text-[#8E9AAE]">WASD &amp; voice active</b>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Directive console</span>
          <kbd
            className="px-1.5 py-0.5 text-[#4FD8E8] border text-[10px]"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              borderColor: 'rgba(150,170,200,0.18)',
              backgroundColor: 'rgba(79,216,232,0.06)',
            }}
          >
            TAB
          </kbd>
        </div>
      </footer>
    </div>
  );
};
export default LandingScreen;
