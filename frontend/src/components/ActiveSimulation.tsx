import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Compass,
  Zap,
  Volume2,
  VolumeX,
  AlertTriangle,
  RotateCcw,
  Camera,
  Terminal,
  Send,
  Crosshair,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { MockVideoEngine } from '../engine/mockVideoEngine';
import { MockAudioEngine } from '../engine/mockAudioEngine';
import { ReactorEngine } from '../engine/ReactorEngine';
import { FishAudioEngine } from '../engine/FishAudioEngine';
import type { IVideoEngine, VideoStreamSource } from '../engine/videoEngine';
import type { IAudioEngine } from '../engine/audioEngine';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { LoadingScreen } from './LoadingScreen';
import type { MovementDirection, LookDirection } from '../types/simulation';

interface ActiveSimulationProps {
  prompt: string;
  isLiveMode?: boolean;
  onExit: () => void;
}

export const ActiveSimulation: React.FC<ActiveSimulationProps> = ({
  prompt: initialPrompt,
  isLiveMode = false,
  onExit,
}) => {
  const [currentPrompt, setCurrentPrompt] = useState<string>(initialPrompt);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [streamSource, setStreamSource] = useState<VideoStreamSource | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Active Control States
  const [activeMovement, setActiveMovement] = useState<MovementDirection>('idle');
  const [activeLook, setActiveLook] = useState<LookDirection>('idle');
  const [thrustLevel, setThrustLevel] = useState<number>(0);
  const [headingDeg, setHeadingDeg] = useState<number>(45);

  // In-Game Directive Console State
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleInput, setConsoleInput] = useState<string>('');

  // Snapshot flash state
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const videoEngineRef = useRef<IVideoEngine | null>(null);
  const audioEngineRef = useRef<IAudioEngine | null>(null);

  // Handle keyboard movement changes
  const handleMovementChange = useCallback((direction: MovementDirection) => {
    setActiveMovement(direction);
    if (direction === 'forward') {
      setThrustLevel(100);
    } else if (direction === 'backward') {
      setThrustLevel(40);
    } else if (direction === 'left' || direction === 'right') {
      setThrustLevel(65);
    } else {
      setThrustLevel(0);
    }

    if (videoEngineRef.current) {
      videoEngineRef.current.sendMovement(direction);
    }
    if (audioEngineRef.current) {
      audioEngineRef.current.setMovementState(direction !== 'idle');
    }
  }, []);

  // Handle keyboard look changes
  const handleLookChange = useCallback((direction: LookDirection) => {
    setActiveLook(direction);
    if (direction === 'left') {
      setHeadingDeg((prev) => (prev - 15 + 360) % 360);
    } else if (direction === 'right') {
      setHeadingDeg((prev) => (prev + 15) % 360);
    }

    if (videoEngineRef.current) {
      videoEngineRef.current.sendLook(direction);
    }
  }, []);

  // Toggle Audio Mute
  const handleToggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    if (audioEngineRef.current) {
      audioEngineRef.current.setMuted(nextMuted);
    }
  };

  // Keyboard controls active only when console is closed
  useKeyboardControls({
    onMovementChange: handleMovementChange,
    onLookChange: handleLookChange,
    enabled: isStreamReady && !errorMessage && !isConsoleOpen,
  });

  // Handle Snapshot Capture
  const handleCaptureSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 250);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `inception-snapshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.warn('[ACTIVE SIMULATION] Snapshot note:', err);
    }
  }, []);

  // Submit new In-Game Directive
  const handleConsoleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = consoleInput.trim();
    if (!trimmed) return;

    setCurrentPrompt(trimmed);
    setConsoleInput('');
    setIsConsoleOpen(false);

    if (videoEngineRef.current?.setPrompt) {
      await videoEngineRef.current.setPrompt(trimmed);
    }

    if (audioEngineRef.current) {
      audioEngineRef.current.playNarration(`Directive updated: ${trimmed}`);
    }
  };

  // Global hotkey listeners for [TAB], [C], [F], [ESC]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Console with TAB or C (when not typing in an input)
      if (e.key === 'Tab' || (e.key.toLowerCase() === 'c' && !isConsoleOpen)) {
        e.preventDefault();
        setIsConsoleOpen((prev) => {
          const next = !prev;
          if (next) {
            setTimeout(() => consoleInputRef.current?.focus(), 50);
          }
          return next;
        });
      } else if (e.key.toLowerCase() === 'f' && !isConsoleOpen) {
        e.preventDefault();
        handleCaptureSnapshot();
      } else if (e.key === 'Escape') {
        if (isConsoleOpen) {
          setIsConsoleOpen(false);
        } else {
          onExit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConsoleOpen, onExit, handleCaptureSnapshot]);

  // Attach stream source to HTML5 video element
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !streamSource) return;

    const attach = (reset = false) => {
      try {
        if (reset) {
          el.srcObject = null;
        }
        if (streamSource instanceof MediaStream) {
          el.srcObject = streamSource;
          el.src = '';
        } else if (typeof streamSource === 'string') {
          el.srcObject = null;
          el.src = streamSource;
        }
        el.play().catch((err) => {
          console.warn('[ACTIVE SIMULATION] Video playback note:', err);
        });
      } catch (err) {
        console.error('[ACTIVE SIMULATION] Stream attachment error:', err);
      }
    };

    attach(false);

    if (streamSource instanceof MediaStream) {
      const tracks = streamSource.getTracks();
      const onUnmute = () => {
        console.log('[ACTIVE SIMULATION] MediaStream track unmuted — rendering video frames.');
        attach(true);
      };

      for (const track of tracks) {
        track.addEventListener('unmute', onUnmute);
      }

      return () => {
        for (const track of tracks) {
          track.removeEventListener('unmute', onUnmute);
        }
      };
    }
  }, [streamSource]);

  // Mount effect: Initialize single video & audio engine instance
  useEffect(() => {
    let isSubscribed = true;

    const videoEngine = isLiveMode ? new ReactorEngine() : new MockVideoEngine();
    const audioEngine = isLiveMode ? new FishAudioEngine() : new MockAudioEngine();

    videoEngineRef.current = videoEngine;
    audioEngineRef.current = audioEngine;

    (async () => {
      try {
        await videoEngine.initialize(initialPrompt, (source: VideoStreamSource) => {
          if (!isSubscribed) return;
          console.log('[ACTIVE SIMULATION] Stream ready received.');
          setStreamSource(source);
          setIsStreamReady(true);
        });

        if (!isSubscribed) return;
        audioEngine.startAmbient();
        audioEngine.playNarration(`Entering ${initialPrompt}`);
      } catch (error: any) {
        if (!isSubscribed) return;
        console.error('[ACTIVE SIMULATION] Initialization error:', error);
        const msg = error?.message?.includes('429')
          ? 'Quota Cooldown (Wait 5s) — Reactor Rate Limit'
          : 'Connection Failed — Reactor Stream Offline';
        setErrorMessage(msg);
      }
    })();

    return () => {
      isSubscribed = false;
      videoEngine.disconnect();
      audioEngine.stopAll();
      videoEngineRef.current = null;
      audioEngineRef.current = null;
    };
  }, [initialPrompt, isLiveMode]);

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden select-none font-mono">
      {/* 1. Loading Screen if stream is not ready and no error */}
      {!isStreamReady && !errorMessage && <LoadingScreen prompt={currentPrompt} />}

      {/* 2. Video Stream Element */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          isStreamReady && !errorMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 3. Cinematic CRT Scanline & Anamorphic Vignette Overlay */}
      {isStreamReady && !errorMessage && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.95) 100%),
              repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)
            `,
          }}
        />
      )}

      {/* 4. Shutter Camera Flash Animation */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white transition-opacity duration-200 pointer-events-none opacity-90" />
      )}

      {/* 5. Error Modal */}
      {errorMessage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-900/80 bg-zinc-950/95 p-6 text-center space-y-6 shadow-[0_0_50px_rgba(225,29,72,0.25)]">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-600/50 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-mono font-semibold tracking-wide text-rose-300 uppercase">
                {errorMessage}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                {errorMessage.includes('Cooldown')
                  ? 'Reactor enforces a maximum of 10 session creations per minute. Please wait 5-10 seconds before starting the next session.'
                  : 'Unable to establish peer connection with the remote neural stream. Verify your API credentials and network access.'}
              </p>
            </div>

            <button
              onClick={onExit}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase tracking-widest font-semibold transition-all shadow-lg active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return to Base</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. AAA TACTICAL GAMING HUD OVERLAY */}
      {isStreamReady && !errorMessage && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
          
          {/* TOP BAR: Telemetry & Radar */}
          <div className="flex items-start justify-between w-full">
            {/* Top-Left: Neural Link & Status */}
            <div className="flex items-center gap-3">
              <button
                onClick={onExit}
                className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs font-mono uppercase tracking-wider backdrop-blur-md hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all active:scale-95 shadow-lg"
                title="Exit Simulation (ESC)"
              >
                <X className="w-4 h-4 text-zinc-400" />
                <span>Abort</span>
                <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700">
                  ESC
                </kbd>
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800/90 backdrop-blur-md text-xs font-mono text-zinc-300 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-400">NEURAL LINK:</span>
                <span className="text-emerald-300 font-semibold tracking-wider">99.8% SYNC</span>
              </div>
            </div>

            {/* Top-Center: Tactical Radar Minimap */}
            <div className="relative flex flex-col items-center">
              <div className="relative w-20 h-20 rounded-full border border-emerald-500/40 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] overflow-hidden">
                {/* Radar Grid Rings */}
                <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
                <div className="absolute inset-5 rounded-full border border-emerald-500/20" />
                <div className="absolute w-full h-[1px] bg-emerald-500/20" />
                <div className="absolute h-full w-[1px] bg-emerald-500/20" />

                {/* Sweeping radar line */}
                <div
                  className="absolute inset-0 origin-center pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(16,185,129,0.4) 0deg, transparent 60deg)',
                    animation: 'spin 3s linear infinite',
                  }}
                />

                {/* Center player point */}
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />

                {/* Blinking Sensor Targets */}
                <div className="absolute top-4 left-6 w-1 h-1 rounded-full bg-amber-400 animate-ping" />
                <div className="absolute bottom-5 right-5 w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest mt-1">
                RADAR: {String(headingDeg).padStart(3, '0')}°
              </span>
            </div>

            {/* Top-Right: Audio, Mode & Snapshot Tools */}
            <div className="flex items-center gap-2.5">
              {/* Snapshot Button */}
              <button
                onClick={handleCaptureSnapshot}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs font-mono backdrop-blur-md hover:bg-zinc-800 hover:text-white hover:border-cyan-500 transition-all active:scale-95 shadow-lg"
                title="Capture Snapshot (F)"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">SNAP</span>
                <kbd className="text-[10px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400 border border-zinc-700">F</kbd>
              </button>

              {/* Audio Toggle */}
              <button
                onClick={handleToggleAudio}
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md text-xs font-mono tracking-wider transition-all active:scale-95 shadow-lg ${
                  isAudioMuted
                    ? 'bg-zinc-950/80 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    : 'bg-zinc-950/80 border-zinc-700 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-500'
                }`}
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
              </button>

              {/* Engine Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md text-xs font-mono tracking-widest text-zinc-300 shadow-lg">
                {isLiveMode ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                    <Zap className="w-2.5 h-2.5" />
                    <span>REACTOR</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/30">
                    <span>MOCK</span>
                  </span>
                )}
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
            </div>
          </div>

          {/* LEFT SIDEBAR: Dynamic Thrust & Speed Gauge */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <div className="flex flex-col items-center space-y-2 p-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 backdrop-blur-md shadow-2xl">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <div className="relative w-3.5 h-36 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 flex flex-col justify-end p-0.5">
                <div
                  className="w-full rounded-full transition-all duration-150 ease-out"
                  style={{
                    height: `${thrustLevel}%`,
                    background:
                      thrustLevel > 75
                        ? 'linear-gradient(to top, #06b6d4, #10b981)'
                        : thrustLevel > 0
                        ? '#06b6d4'
                        : 'transparent',
                    boxShadow: thrustLevel > 0 ? '0 0 12px rgba(6,182,212,0.6)' : 'none',
                  }}
                />
              </div>
              <span className="text-[9px] text-zinc-400 tracking-tighter">
                {thrustLevel > 0 ? `${thrustLevel}%` : '0%'}
              </span>
              <span className="text-[8px] text-cyan-400 font-bold tracking-widest rotate-180 [writing-mode:vertical-rl]">
                THRUST
              </span>
            </div>
          </div>

          {/* CENTER: Tactical Targeting Reticle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center space-y-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Outer Corner Brackets */}
              <div className="absolute inset-0 border border-white/20 rounded-lg pointer-events-none" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80" />

              {/* Center Crosshair */}
              <Crosshair className="w-8 h-8 text-white/50 animate-pulse" />
            </div>
            <div className="text-[10px] text-cyan-300/80 tracking-widest bg-zinc-950/60 px-2 py-0.5 rounded border border-cyan-500/20 backdrop-blur-sm">
              TARGET LOCK • RNG 128M
            </div>
          </div>

          {/* IN-GAME DIRECTIVE CONSOLE OVERLAY ([TAB]) */}
          {isConsoleOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 pointer-events-auto">
              <div className="w-full max-w-xl rounded-2xl border border-cyan-500/50 bg-zinc-950/95 p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                    <Terminal className="w-4 h-4" />
                    <span>Neural World Directive Terminal</span>
                  </div>
                  <kbd className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 border border-zinc-700">
                    [TAB] CLOSE
                  </kbd>
                </div>

                <p className="text-xs text-zinc-400">
                  Update environment directive live without disconnecting the generative stream:
                </p>

                <form onSubmit={handleConsoleSubmit} className="flex gap-2">
                  <input
                    ref={consoleInputRef}
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="e.g. Add violent lightning storm and neon reflections..."
                    className="flex-1 bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Transmit</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* BOTTOM BAR: Objective & Telemetry */}
          <div className="flex items-end justify-between w-full">
            {/* Bottom-Left: Mission Objective Card */}
            <div className="max-w-md p-3.5 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md text-xs space-y-1.5 shadow-2xl">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>Objective Directive</span>
                </div>
                <span>SECTOR LAT 34.05° N</span>
              </div>
              <p className="text-zinc-200 text-xs font-light tracking-wide line-clamp-2">
                {currentPrompt}
              </p>
            </div>

            {/* Bottom-Right: Gaming Controls Matrix */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md text-xs shadow-2xl">
              {/* Directives button */}
              <button
                onClick={() => setIsConsoleOpen(true)}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono hover:bg-cyan-900/60 transition-all active:scale-95"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>DIRECTIVE [TAB]</span>
              </button>

              <div className="h-5 w-[1px] bg-zinc-800" />

              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <div className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-zinc-400" />
                  <span>MOVE:</span>
                  <span className={`font-bold uppercase ${activeMovement !== 'idle' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {activeMovement}
                  </span>
                </div>
                <span className="text-zinc-700">|</span>
                <div className="flex items-center gap-1">
                  <span>LOOK:</span>
                  <span className={`font-bold uppercase ${activeLook !== 'idle' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {activeLook}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
export default ActiveSimulation;
