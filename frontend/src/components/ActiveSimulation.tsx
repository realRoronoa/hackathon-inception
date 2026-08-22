import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Radio, Compass } from 'lucide-react';
import { MockVideoEngine } from '../engine/mockVideoEngine';
import { MockAudioEngine } from '../engine/mockAudioEngine';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { LoadingScreen } from './LoadingScreen';
import type { MovementDirection, LookDirection } from '../types/simulation';

interface ActiveSimulationProps {
  prompt: string;
  onExit: () => void;
}

export const ActiveSimulation: React.FC<ActiveSimulationProps> = ({ prompt, onExit }) => {
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [activeMovement, setActiveMovement] = useState<MovementDirection>('idle');
  const [activeLook, setActiveLook] = useState<LookDirection>('idle');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Persistent engine instances across component lifetime
  const videoEngineRef = useRef<MockVideoEngine | null>(null);
  if (!videoEngineRef.current) {
    videoEngineRef.current = new MockVideoEngine();
  }

  const audioEngineRef = useRef<MockAudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new MockAudioEngine();
  }

  // Handle keyboard movement changes
  const handleMovementChange = useCallback((direction: MovementDirection) => {
    setActiveMovement(direction);
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
    if (videoEngineRef.current) {
      videoEngineRef.current.sendLook(direction);
    }
  }, []);

  // Keyboard controls hook active during simulation
  useKeyboardControls({
    onMovementChange: handleMovementChange,
    onLookChange: handleLookChange,
    enabled: isStreamReady,
  });

  // ESC key listener for quick exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // Mount effect: Initialize stream and ambient audio
  useEffect(() => {
    const videoEngine = videoEngineRef.current;
    const audioEngine = audioEngineRef.current;

    let isSubscribed = true;

    if (videoEngine && audioEngine) {
      // 1. Initialize video stream
      videoEngine.initialize(prompt, (source) => {
        if (!isSubscribed) return;

        if (videoRef.current) {
          if (typeof source === 'string') {
            videoRef.current.src = source;
          } else if (source instanceof MediaStream) {
            videoRef.current.srcObject = source;
          }
          videoRef.current.play().catch((err) => {
            console.warn('[ACTIVE SIMULATION] Video play prevented:', err);
          });
        }
        setIsStreamReady(true);
      });

      // 2. Start ambient audio
      audioEngine.startAmbient();

      // Optional narration greeting
      audioEngine.playNarration(`Entering ${prompt}`);
    }

    // Cleanup effect: Disconnect engines on unmount
    return () => {
      isSubscribed = false;
      if (videoEngine) {
        videoEngine.disconnect();
      }
      if (audioEngine) {
        audioEngine.stopAll();
      }
    };
  }, [prompt]);

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden select-none">
      {/* 1. Loading Screen if stream is not ready */}
      {!isStreamReady && <LoadingScreen prompt={prompt} />}

      {/* 2. Full-screen Video Stream Element */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          isStreamReady ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 3. HUD Overlay (Always on top of video) */}
      {isStreamReady && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
          
          {/* TOP BAR */}
          <div className="flex items-center justify-between w-full">
            {/* Top-Left: Exit Button */}
            <button
              onClick={onExit}
              className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-zinc-300 text-xs font-mono uppercase tracking-wider backdrop-blur-md hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all active:scale-95 shadow-lg"
              title="Exit Simulation (ESC)"
            >
              <X className="w-4 h-4 text-zinc-400" />
              <span>Exit</span>
              <kbd className="text-[10px] bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700">ESC</kbd>
            </button>

            {/* Top-Right: Stream Status Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 backdrop-blur-md text-xs font-mono tracking-widest text-zinc-300 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>LIVE | FEED STABLE</span>
            </div>
          </div>

          {/* CENTER: Subtle Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
            <span className="text-white/40 text-2xl font-light leading-none select-none drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              +
            </span>
          </div>

          {/* BOTTOM BAR: Telemetry & Controls HUD */}
          <div className="flex items-end justify-between w-full">
            {/* Bottom-Left: World Info */}
            <div className="max-w-md px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md text-xs font-mono text-zinc-400 space-y-1 shadow-lg">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                <Radio className="w-3 h-3 text-zinc-400" />
                <span>Sector Stream</span>
              </div>
              <p className="text-zinc-200 truncate max-w-xs">{prompt}</p>
            </div>

            {/* Bottom-Right: Active Controls Telemetry */}
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 backdrop-blur-md text-xs font-mono text-zinc-400 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-zinc-400" />
                <span>MOVE:</span>
                <span className={`font-semibold uppercase ${activeMovement !== 'idle' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {activeMovement}
                </span>
              </div>
              <span className="text-zinc-700">|</span>
              <div className="flex items-center gap-1.5">
                <span>LOOK:</span>
                <span className={`font-semibold uppercase ${activeLook !== 'idle' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {activeLook}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
export default ActiveSimulation;
