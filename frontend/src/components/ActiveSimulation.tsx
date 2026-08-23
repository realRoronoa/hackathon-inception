import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  AlertTriangle,
  RotateCcw,
  Camera,
  Terminal,
  Send,
  Video,
  Clock,
  Compass,
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
import { MissionDebriefModal } from './MissionDebriefModal';
import { soundFx } from '../engine/soundFx';
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

  // In-Game Directive Console State
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleInput, setConsoleInput] = useState<string>('');

  // Video Clip Recorder State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Snapshot flash state
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // 120-Second Strict Session Countdown
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(120);

  // Mission Stats & Debrief State
  const [missionStartTime] = useState<number>(Date.now());
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [showDebrief, setShowDebrief] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const videoEngineRef = useRef<IVideoEngine | null>(null);
  const audioEngineRef = useRef<IAudioEngine | null>(null);

  // Handle keyboard & mouse movement changes
  const handleMovementChange = useCallback((direction: MovementDirection) => {
    setActiveMovement(direction);

    if (direction === 'forward') {
      setDistanceKm((prev) => prev + 0.08);
    } else if (direction === 'backward') {
      setDistanceKm((prev) => prev + 0.03);
    } else if (direction === 'left' || direction === 'right') {
      setDistanceKm((prev) => prev + 0.05);
    }

    if (videoEngineRef.current) {
      videoEngineRef.current.sendMovement(direction);
    }
    if (audioEngineRef.current) {
      audioEngineRef.current.setMovementState(direction !== 'idle');
    }
  }, []);

  // Handle mouse & arrow look changes
  const handleLookChange = useCallback((direction: LookDirection) => {
    setActiveLook(direction);

    if (videoEngineRef.current) {
      videoEngineRef.current.sendLook(direction);
    }
  }, []);

  // Toggle Audio Mute
  const handleToggleAudio = () => {
    soundFx.playClick();
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    if (audioEngineRef.current) {
      audioEngineRef.current.setMuted(nextMuted);
    }
  };

  // Keyboard and mouse controls active
  useKeyboardControls({
    onMovementChange: handleMovementChange,
    onLookChange: handleLookChange,
    enabled: isStreamReady && !errorMessage && !isConsoleOpen && !showDebrief,
  });

  // Handle Snapshot Capture
  const handleCaptureSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      soundFx.playCameraShutter();
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');

        try {
          const raw = localStorage.getItem('inception_snapshots') || '[]';
          const list = JSON.parse(raw);
          list.unshift({
            id: `snap_${Date.now()}`,
            dataUrl,
            sector: currentPrompt,
            timestamp: Date.now(),
          });
          localStorage.setItem('inception_snapshots', JSON.stringify(list.slice(0, 20)));
        } catch {}

        const link = document.createElement('a');
        link.download = `inception-snapshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.warn('[ACTIVE SIMULATION] Snapshot note:', err);
    }
  }, [currentPrompt]);

  // Video Clip Recording Toggle
  const toggleRecording = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isRecording) {
      soundFx.playClick();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setRecordSeconds(0);
    } else {
      try {
        soundFx.playSuccessChime();
        const stream = (video as any).captureStream ? (video as any).captureStream() : null;
        if (!stream) return;

        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inception-clip-${Date.now()}.webm`;
          a.click();
          URL.revokeObjectURL(url);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordSeconds(0);
      } catch (err) {
        console.warn('[RECORDING] Start error:', err);
      }
    }
  }, [isRecording]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // 120-Second Strict Session Countdown Timer
  useEffect(() => {
    if (!isStreamReady || errorMessage || showDebrief) return;

    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCaptureSnapshot();
          soundFx.playSuccessChime();
          setShowDebrief(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStreamReady, errorMessage, showDebrief, handleCaptureSnapshot]);

  // Submit new In-Game Directive
  const handleConsoleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = consoleInput.trim();
    if (!trimmed) return;

    soundFx.playSuccessChime();
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

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConsoleOpen) {
        if (e.key === 'Escape' || e.key === 'Tab') {
          e.preventDefault();
          setIsConsoleOpen(false);
        }
        return;
      }

      if (e.key === 'Tab' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        soundFx.playClick();
        setIsConsoleOpen(true);
        setTimeout(() => consoleInputRef.current?.focus(), 50);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleCaptureSnapshot();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        toggleRecording();
      } else if (e.key === 'Escape') {
        if (!showDebrief) {
          setShowDebrief(true);
        } else {
          onExit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isConsoleOpen,
    showDebrief,
    onExit,
    handleCaptureSnapshot,
    toggleRecording,
  ]);

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
        el.play().catch(() => {});
      } catch {}
    };

    attach(false);

    if (streamSource instanceof MediaStream) {
      const tracks = streamSource.getTracks();
      const onUnmute = () => attach(true);
      for (const track of tracks) track.addEventListener('unmute', onUnmute);
      return () => {
        for (const track of tracks) track.removeEventListener('unmute', onUnmute);
      };
    }
  }, [streamSource]);

  // Mount effect: Initialize video & audio engine
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
          setStreamSource(source);
          setIsStreamReady(true);
        });

        if (!isSubscribed) return;
        audioEngine.startAmbient();
        audioEngine.playNarration(`Entering ${initialPrompt}`);
      } catch (error: any) {
        if (!isSubscribed) return;
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
      
      {/* 1. Loading Screen */}
      {!isStreamReady && !errorMessage && <LoadingScreen prompt={currentPrompt} />}

      {/* 2. Crystal-Clear Full-Screen Video Stream (No Scanlines, No Grain Filter) */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 [transform:translateZ(0)] ${
          isStreamReady && !errorMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 3. Subtle Edge Vignette (Non-intrusive) */}
      {isStreamReady && !errorMessage && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 70%, rgba(0,0,0,0.5) 100%)',
          }}
        />
      )}

      {/* 4. Shutter Camera Flash */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none opacity-90 transition-opacity duration-200" />
      )}

      {/* 5. Error Modal */}
      {errorMessage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6">
          <div className="max-w-md w-full rounded-2xl border border-rose-900/80 bg-zinc-950/95 p-6 text-center space-y-6 shadow-[0_0_50px_rgba(225,29,72,0.25)]">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-600/50 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-wide text-rose-300 uppercase">
                {errorMessage}
              </h3>
              <p className="text-xs text-zinc-400">
                {errorMessage.includes('Cooldown')
                  ? 'Reactor rate limit reached. Please wait 5 seconds before starting a new session.'
                  : 'Unable to connect to remote neural stream.'}
              </p>
            </div>
            <button
              onClick={onExit}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs uppercase font-semibold transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return to Base</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Mission Debrief Modal on Exit */}
      {showDebrief && (
        <MissionDebriefModal
          stats={{
            sector: currentPrompt,
            durationSeconds: Math.floor((Date.now() - missionStartTime) / 1000),
            distanceKm: distanceKm,
            anomaliesScanned: 2,
            decisionsMade: 1,
            neuralStability: 99.4,
          }}
          onReturnToBase={onExit}
          onRestart={() => setShowDebrief(false)}
        />
      )}

      {/* 7. CLEAN CINEMATIC HUD OVERLAY */}
      {isStreamReady && !errorMessage && !showDebrief && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-8">
          
          {/* TOP BAR */}
          <div className="flex items-center justify-between w-full">
            {/* Top-Left: Exit Button & Status */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDebrief(true)}
                className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-zinc-300 text-xs font-mono uppercase tracking-wider backdrop-blur-md hover:bg-zinc-800 hover:text-white transition-all active:scale-95 shadow-lg"
              >
                <X className="w-4 h-4 text-zinc-400" />
                <span>Exit</span>
                <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700">
                  ESC
                </kbd>
              </button>

              <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 backdrop-blur-md text-xs font-mono text-zinc-300 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isLiveMode ? 'LIVE WEBRTC' : 'MOCK ENGINE'}</span>
              </div>
            </div>

            {/* Top-Right: Timer, Snap, Clip & Audio */}
            <div className="flex items-center gap-2.5">
              {/* Session Countdown Timer */}
              <div
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border backdrop-blur-md text-xs font-mono tracking-wider ${
                  sessionTimeLeft <= 30
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                    : 'bg-zinc-950/70 border-zinc-800 text-cyan-300'
                }`}
                title="Exploration Session Countdown"
              >
                <Clock className={`w-3.5 h-3.5 ${sessionTimeLeft <= 30 ? 'text-rose-400 animate-spin' : 'text-cyan-400'}`} />
                <span>
                  {Math.floor(sessionTimeLeft / 60)}:
                  {sessionTimeLeft % 60 < 10 ? '0' : ''}
                  {sessionTimeLeft % 60}
                </span>
              </div>

              {/* Snapshot Button */}
              <button
                onClick={handleCaptureSnapshot}
                className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800 text-zinc-300 text-xs backdrop-blur-md hover:border-cyan-500 hover:text-white transition-all active:scale-95 shadow-lg"
                title="Capture Snapshot (F)"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">SNAP</span>
                <kbd className="text-[10px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400 border border-zinc-700">F</kbd>
              </button>

              {/* Clip Recorder Button */}
              <button
                onClick={toggleRecording}
                className={`pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl border backdrop-blur-md text-xs transition-all active:scale-95 shadow-lg ${
                  isRecording
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
                    : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-rose-500'
                }`}
                title="Record Video Clip (R)"
              >
                <Video className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-400' : 'text-zinc-400'}`} />
                <span className="hidden md:inline">{isRecording ? `REC ${recordSeconds}s` : 'CLIP'}</span>
                <kbd className="text-[10px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400 border border-zinc-700">R</kbd>
              </button>

              {/* Audio Toggle */}
              <button
                onClick={handleToggleAudio}
                className={`pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl border backdrop-blur-md text-xs transition-all active:scale-95 shadow-lg ${
                  isAudioMuted
                    ? 'bg-zinc-950/70 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    : 'bg-zinc-950/70 border-zinc-700 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                }`}
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
              </button>
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
                  Update environment directive live without disconnecting the stream:
                </p>

                <form onSubmit={handleConsoleSubmit} className="flex gap-2">
                  <input
                    ref={consoleInputRef}
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="e.g. Add warm architectural lighting and reflections..."
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

          {/* BOTTOM BAR */}
          <div className="flex items-end justify-between w-full">
            {/* Bottom-Left: Sector Description */}
            <div className="max-w-lg p-3.5 rounded-2xl bg-zinc-950/75 border border-zinc-800/80 backdrop-blur-md text-xs space-y-1 shadow-2xl">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] uppercase tracking-wider font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Active Spatial Simulation</span>
              </div>
              <p className="text-zinc-200 text-xs font-light tracking-wide line-clamp-2">
                {currentPrompt}
              </p>
            </div>

            {/* Bottom-Right: Controls Bar */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/75 border border-zinc-800/80 backdrop-blur-md text-xs shadow-2xl">
              <button
                onClick={() => setIsConsoleOpen(true)}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[11px] hover:bg-cyan-900/60 transition-all active:scale-95"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>DIRECTIVE [TAB]</span>
              </button>

              <div className="h-5 w-[1px] bg-zinc-800" />

              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <div className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-zinc-400" />
                  <span>MOVE:</span>
                  <span className={`font-bold uppercase ${activeMovement !== 'idle' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {activeMovement}
                  </span>
                </div>
                <span className="text-zinc-700">|</span>
                <div className="flex items-center gap-1">
                  <span>LOOK:</span>
                  <span className={`font-bold uppercase ${activeLook !== 'idle' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {activeLook}
                  </span>
                </div>
                <span className="text-zinc-700 hidden md:inline">|</span>
                <span className="hidden md:inline text-cyan-400 font-medium">WASD + MOUSE</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
export default ActiveSimulation;
