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
import type { SpatialResearchPayload } from '../types/simulation';

interface LandingScreenProps {
  onStartSimulation: (payload: SpatialResearchPayload) => void;
  isLiveMode: boolean;
  onToggleLiveMode: (live: boolean) => void;
  onBackToLanding?: () => void;
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
    id: 'wireless-earbuds',
    icon: '🎧',
    tag: 'CONSUMER AUDIO • HARDWARE',
    title: 'Minimalist Wireless Earbuds',
    description:
      'Clean professional product photography studio shot of sleek matte black wireless earbuds with an open charging case on a soft neutral studio backdrop.',
    prompt:
      'A clean product photography studio shot of sleek minimalist wireless earbuds in a charging case, soft neutral background, professional commercial lighting, sharp focus, high-end e-commerce product catalog style.',
  },
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
  onBackToLanding,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLogbookOpen, setIsLogbookOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [blueprintPreview, setBlueprintPreview] = useState<SpatialResearchPayload | null>(null);

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

  const synthesizeAndLaunch = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    if (isListening) {
      stopListening();
    }

    setIsSynthesizing(true);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });

      if (res.ok) {
        const payload: SpatialResearchPayload = await res.json();
        if (!payload.base_image) {
          throw new Error('Failed to generate concept blueprint image.');
        }
        setIsSynthesizing(false);
        setBlueprintPreview(payload);
        return;
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Backend failed to synthesize spatial blueprint.');
      }
    } catch (err: any) {
      console.error('[STUDIO] Image generation aborted:', err);
      setIsSynthesizing(false);
      setBlueprintPreview(null);
      alert(`⚠️ SIMULATION ABORTED (0 Credits Used):\n\n${err.message || 'Image generation failed.'}\n\nThe Reactor WebRTC GPU session was NOT started to protect your API credits.`);
    }
  };

  const handleConfirmLaunch = () => {
    if (blueprintPreview) {
      onStartSimulation(blueprintPreview);
      setBlueprintPreview(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    synthesizeAndLaunch(prompt);
  };

  const handleSelectSector = (sectorPrompt: string) => {
    setPrompt(sectorPrompt);
    synthesizeAndLaunch(sectorPrompt);
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
        backgroundColor: '#07090B',
        color: '#F4F4F0',
        fontFamily: "'Inter', sans-serif",
        backgroundImage: `
          radial-gradient(circle at 50% 25%, rgba(79, 216, 232, 0.04) 0%, transparent 60%),
          radial-gradient(circle at center, rgba(150, 170, 200, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 64px 64px',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* High-Tech LLM Synthesis Overlay */}
      {isSynthesizing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none animate-fade-in">
          <div className="max-w-md w-full rounded-2xl border border-cyan-500/50 bg-zinc-950/95 p-8 text-center space-y-6 shadow-[0_0_60px_rgba(6,182,212,0.35)]">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-cyan-500/20 border-l-transparent animate-spin" />
              <Sparkles className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-mono tracking-widest uppercase border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>SPATIAL INTELLIGENCE AGENT</span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white font-['Space_Grotesk']">
                Synthesizing 4K Neural Blueprint & Compiling Spatial Matrix...
              </h3>
              <p className="text-xs font-mono text-cyan-300/80 leading-relaxed">
                Compiling spatial intelligence, acoustic clearance, and neural telemetry...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Concept Blueprint Preview Modal (Image-to-World Initialization) */}
      {blueprintPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-6 select-none animate-fade-in">
          <div className="max-w-2xl w-full rounded-3xl border border-cyan-500/50 bg-zinc-950/95 p-6 sm:p-8 space-y-6 shadow-[0_0_60px_rgba(6,182,212,0.3)] font-mono">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                  CONCEPT BLUEPRINT GENERATED
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded">
                IMAGEN 3 • ANIME CYBERPUNK SEED
              </span>
            </div>

            {/* Base Image Container with Cinematic Glow */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] bg-zinc-900 group">
              {blueprintPreview.base_image && (
                <img
                  src={blueprintPreview.base_image}
                  alt="Spatial Base Concept"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              
              {/* Corner Bracket Overlays */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 border border-cyan-500/30 rounded text-[10px] text-cyan-300 font-mono">
                1024 × 576 SEED
              </div>
            </div>

            {/* Telemetry Preview Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {blueprintPreview.hud_insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-900/80 border border-cyan-500/20 text-[11px] text-zinc-300 flex items-start gap-1.5"
                >
                  <span className="text-cyan-400 font-bold">▶</span>
                  <span className="leading-tight">{insight}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBlueprintPreview(null)}
                className="px-5 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all cursor-pointer"
              >
                Back / Edit
              </button>

              <button
                type="button"
                onClick={handleConfirmLaunch}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_0_30px_rgba(79,216,232,0.4)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>INITIALIZE SIMULATION</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
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
        {/* Brand & Overview Back Button */}
        <div className="flex items-center gap-4">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="px-2.5 py-1 text-[11px] font-mono border text-[#8E9AAE] hover:text-[#E7ECF3] hover:border-[#4FD8E8] transition-all"
              style={{
                borderColor: 'rgba(150,170,200,0.18)',
                backgroundColor: 'rgba(16,21,29,0.8)',
              }}
              title="Return to Marketing Overview"
            >
              ← OVERVIEW
            </button>
          )}

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
              <span className="text-[#5B6577]">/ SPATIAL STUDIO</span>
            </div>
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
