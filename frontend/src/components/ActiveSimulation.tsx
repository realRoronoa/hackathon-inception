import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Radio, Compass, Zap, Volume2, VolumeX, AlertTriangle, RotateCcw } from 'lucide-react';
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

export const ActiveSimulation: React.FC<ActiveSimulationProps> = ({ prompt, isLiveMode = false, onExit }) => {
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [streamSource, setStreamSource] = useState<VideoStreamSource | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [activeMovement, setActiveMovement] = useState<MovementDirection>('idle');
  const [activeLook, setActiveLook] = useState<LookDirection>('idle');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Persistent engine instances across component lifetime
  const videoEngineRef = useRef<IVideoEngine | null>(null);
  if (!videoEngineRef.current) {
    videoEngineRef.current = isLiveMode ? new ReactorEngine() : new MockVideoEngine();
  }

  const audioEngineRef = useRef<IAudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = isLiveMode ? new FishAudioEngine() : new MockAudioEngine();
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

  // Toggle Audio Mute
  const handleToggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    if (audioEngineRef.current) {
      audioEngineRef.current.setMuted(nextMuted);
    }
  };

  // Keyboard controls hook active during simulation
  useKeyboardControls({
    onMovementChange: handleMovementChange,
    onLookChange: handleLookChange,
    enabled: isStreamReady && !errorMessage,
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

  // Dedicated effect to attach and play video stream on the HTML5 video element
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
          console.warn('[ACTIVE SIMULATION] Video auto-play prevented:', err);
        });
      } catch (err) {
        console.error('[ACTIVE SIMULATION] Failed to attach stream to video element:', err);
      }
    };

    attach(false);

    // If WebRTC MediaStream, listen for track "unmute" when first video frame arrives from server
    if (streamSource instanceof MediaStream) {
      const tracks = streamSource.getTracks();
      const onUnmute = () => {
        console.log('[ACTIVE SIMULATION] WebRTC video track unmuted — re-attaching element to render incoming frames.');
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

  // Mount effect: Initialize stream and ambient audio
  useEffect(() => {
    const videoEngine = videoEngineRef.current;
    const audioEngine = audioEngineRef.current;

    let isSubscribed = true;

    if (videoEngine && audioEngine) {
      // 1. Initialize video stream with error handling
      (async () => {
        try {
          await videoEngine.initialize(prompt, (source: VideoStreamSource) => {
            if (!isSubscribed) return;
            setStreamSource(source);
            setIsStreamReady(true);
          });

          // 2. Start ambient audio
          audioEngine.startAmbient();

          // Narration greeting
          audioEngine.playNarration(`Entering ${prompt}`);
        } catch (error) {
          if (!isSubscribed) return;
          console.error('[ACTIVE SIMULATION] Initialization error:', error);
          setErrorMessage('Connection Failed — Reactor Stream Offline');
        }
      })();
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
      {/* 1. Loading Screen if stream is not ready and no error */}
      {!isStreamReady && !errorMessage && <LoadingScreen prompt={prompt} />}

      {/* 2. Full-screen Video Stream Element (Always muted to allow autoplay) */}
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
              radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 85%, rgba(0,0,0,0.92) 100%),
              repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0px, rgba(0, 0, 0, 0.18) 1px, transparent 1px, transparent 2px)
            `,
          }}
        />
      )}

      {/* 4. Error Modal (High-Contrast Red Overlay) */}
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
                Unable to establish peer connection with the remote neural stream. Verify your API credentials and network access.
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

      {/* 5. HUD Overlay (Always on top of video) */}
      {isStreamReady && !errorMessage && (
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

            {/* Top-Right: Audio Mute Toggle & Stream Status Indicator */}
            <div className="flex items-center gap-3">
              {/* Interactive Audio Toggle */}
              <button
                onClick={handleToggleAudio}
                className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md text-xs font-mono tracking-wider transition-all active:scale-95 shadow-lg ${
                  isAudioMuted
                    ? 'bg-zinc-950/70 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    : 'bg-zinc-950/70 border-zinc-700 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-500'
                }`}
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isAudioMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                    <span>MUTED</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>AUDIO LIVE</span>
                  </>
                )}
              </button>

              {/* Live Badge */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 backdrop-blur-md text-xs font-mono tracking-widest text-zinc-300 shadow-lg">
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
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>LIVE | FEED STABLE</span>
              </div>
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
