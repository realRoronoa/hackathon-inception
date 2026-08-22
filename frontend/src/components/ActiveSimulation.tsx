import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Compass,
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
  Video,
  Radio,
  Clock,
} from 'lucide-react';
import { MockVideoEngine } from '../engine/mockVideoEngine';
import { MockAudioEngine } from '../engine/mockAudioEngine';
import { ReactorEngine } from '../engine/ReactorEngine';
import { FishAudioEngine } from '../engine/FishAudioEngine';
import type { IVideoEngine, VideoStreamSource } from '../engine/videoEngine';
import type { IAudioEngine } from '../engine/audioEngine';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { LoadingScreen } from './LoadingScreen';
import { VisorRainCanvas } from './VisorRainCanvas';
import { MissionDebriefModal } from './MissionDebriefModal';
import { soundFx } from '../engine/soundFx';
import type { MovementDirection, LookDirection } from '../types/simulation';

type VisionMode = 'normal' | 'night' | 'thermal' | 'vhs';

interface TacticalEvent {
  id: string;
  title: string;
  options: string[];
}

const TACTICAL_EVENTS: TacticalEvent[] = [
  {
    id: 'evt_1',
    title: 'Gravitational Anomaly Detected in Sector',
    options: ['Reroute auxiliary power to shields', 'Deploy sensor probe into anomaly', 'Overcharge thrusters to break orbit'],
  },
  {
    id: 'evt_2',
    title: 'Atmospheric Density Fluctuating',
    options: ['Calibrate cockpit visor filters', 'Engage stabilization gyros', 'Initiate emergency radar scan'],
  },
];

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

  // Vision Mode (Normal, Night Vision, Thermal, VHS)
  const [visionMode, setVisionMode] = useState<VisionMode>('normal');

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
  const [anomaliesCount, setAnomaliesCount] = useState<number>(1);
  const [decisionsCount, setDecisionsCount] = useState<number>(0);
  const [showDebrief, setShowDebrief] = useState<boolean>(false);

  // Active Tactical Event Popup
  const [activeEvent, setActiveEvent] = useState<TacticalEvent | null>(null);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const consoleInputRef = useRef<HTMLInputElement>(null);
  const videoEngineRef = useRef<IVideoEngine | null>(null);
  const audioEngineRef = useRef<IAudioEngine | null>(null);

  // Handle keyboard movement changes
  const handleMovementChange = useCallback((direction: MovementDirection) => {
    setActiveMovement(direction);
    soundFx.playClick(1000);

    if (direction === 'forward') {
      setThrustLevel(100);
      setDistanceKm((prev) => prev + 0.08);
    } else if (direction === 'backward') {
      setThrustLevel(40);
      setDistanceKm((prev) => prev + 0.03);
    } else if (direction === 'left' || direction === 'right') {
      setThrustLevel(65);
      setDistanceKm((prev) => prev + 0.05);
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
    soundFx.playClick(1400);

    if (direction === 'left') {
      setHeadingDeg((prev) => (prev - 15 + 360) % 360);
    } else if (direction === 'right') {
      setHeadingDeg((prev) => (prev + 15) % 360);
    }

    if (videoEngineRef.current) {
      videoEngineRef.current.sendLook(direction);
    }
  }, []);

  // Cycle Vision Mode
  const cycleVisionMode = useCallback((mode?: VisionMode) => {
    soundFx.playModeSwitch();
    setVisionMode((prev) => {
      if (mode) return mode;
      if (prev === 'normal') return 'night';
      if (prev === 'night') return 'thermal';
      if (prev === 'thermal') return 'vhs';
      return 'normal';
    });
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

  // Keyboard controls active only when console is closed and not in debrief
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
      setTimeout(() => setIsFlashing(false), 250);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');

        // Save to localStorage logbook
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

        // Download PNG file
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
      // Stop recording
      soundFx.playClick();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setRecordSeconds(0);
    } else {
      // Start recording
      try {
        soundFx.playSuccessChime();
        const stream = (video as any).captureStream ? (video as any).captureStream() : null;
        if (!stream) {
          console.warn('[RECORDING] captureStream not supported');
          return;
        }

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
          // Auto snapshot & debrief transition
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

  // Periodic Tactical Events Trigger
  useEffect(() => {
    if (!isStreamReady || errorMessage) return;

    const timer = setTimeout(() => {
      const randomEvent = TACTICAL_EVENTS[Math.floor(Math.random() * TACTICAL_EVENTS.length)];
      setActiveEvent(randomEvent);
      soundFx.playSuccessChime();
    }, 14000);

    return () => clearTimeout(timer);
  }, [isStreamReady, errorMessage]);

  // Handle Event Choice Picked
  const handlePickChoice = (choiceText: string) => {
    soundFx.playSuccessChime();
    setDecisionsCount((prev) => prev + 1);
    setAnomaliesCount((prev) => prev + 1);
    setLastNotification(`Directive Executed: ${choiceText}`);
    setActiveEvent(null);
    setTimeout(() => setLastNotification(null), 4000);
  };

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

  // Global hotkey listeners for [TAB], [C], [F], [R], [N], [T], [V], [1-3], [ESC]
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
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        cycleVisionMode(visionMode === 'night' ? 'normal' : 'night');
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        cycleVisionMode(visionMode === 'thermal' ? 'normal' : 'thermal');
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        cycleVisionMode(visionMode === 'vhs' ? 'normal' : 'vhs');
      } else if (activeEvent && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (activeEvent.options[idx]) {
          handlePickChoice(activeEvent.options[idx]);
        }
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
    visionMode,
    activeEvent,
    showDebrief,
    onExit,
    handleCaptureSnapshot,
    toggleRecording,
    cycleVisionMode,
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

      {/* 2. Video Stream Element with Vision Filters */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          isStreamReady && !errorMessage ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${
          visionMode === 'night'
            ? 'hue-rotate-90 saturate-200 contrast-150 brightness-110 [filter:sepia(100%)_hue-rotate(90deg)_saturate(500%)]'
            : visionMode === 'thermal'
            ? '[filter:invert(100%)_hue-rotate(180deg)_saturate(300%)]'
            : visionMode === 'vhs'
            ? 'contrast-125 saturate-150'
            : ''
        }`}
      />

      {/* 3. Cockpit Visor Rain & Speed Streaks */}
      {isStreamReady && !errorMessage && <VisorRainCanvas thrustLevel={thrustLevel} />}

      {/* 4. VHS Glitch Tracking & Night Vision Overlays */}
      {visionMode === 'vhs' && (
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-30 mix-blend-screen"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, rgba(255, 0, 100, 0.2) 0px, rgba(0, 255, 255, 0.2) 2px, transparent 2px, transparent 4px)`,
          }}
        />
      )}

      {/* 5. CRT Scanline & Anamorphic Vignette */}
      {isStreamReady && !errorMessage && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 80%, rgba(0,0,0,0.95) 100%),
              repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)
            `,
          }}
        />
      )}

      {/* 6. Shutter Camera Flash */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none opacity-90 transition-opacity duration-200" />
      )}

      {/* 7. Error Modal */}
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

      {/* 8. Mission Debrief Modal on Exit */}
      {showDebrief && (
        <MissionDebriefModal
          stats={{
            sector: currentPrompt,
            durationSeconds: Math.floor((Date.now() - missionStartTime) / 1000),
            distanceKm: distanceKm,
            anomaliesScanned: anomaliesCount,
            decisionsMade: decisionsCount,
            neuralStability: 99.4,
          }}
          onReturnToBase={onExit}
          onRestart={() => setShowDebrief(false)}
        />
      )}

      {/* 9. AAA TACTICAL GAMING HUD OVERLAY */}
      {isStreamReady && !errorMessage && !showDebrief && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
          
          {/* TOP BAR */}
          <div className="flex items-start justify-between w-full">
            {/* Top-Left: Exit & Vision Selector */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowDebrief(true)}
                className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs uppercase tracking-wider backdrop-blur-md hover:bg-zinc-800 hover:text-white transition-all active:scale-95 shadow-lg"
              >
                <X className="w-4 h-4 text-zinc-400" />
                <span>Debrief</span>
                <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700">
                  ESC
                </kbd>
              </button>

              {/* Vision Mode Selector Pills */}
              <div className="pointer-events-auto hidden sm:flex items-center gap-1 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800/90 backdrop-blur-md">
                {(['normal', 'night', 'thermal', 'vhs'] as VisionMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => cycleVisionMode(mode)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-semibold transition-all ${
                      visionMode === mode
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {mode === 'normal' ? 'STD' : mode === 'night' ? 'NVG [N]' : mode === 'thermal' ? 'THM [T]' : 'VHS [V]'}
                  </button>
                ))}
              </div>
            </div>

            {/* Top-Center: Tactical Radar Minimap */}
            <div className="relative flex flex-col items-center">
              <div className="relative w-20 h-20 rounded-full border border-emerald-500/40 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)] overflow-hidden">
                <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
                <div className="absolute inset-5 rounded-full border border-emerald-500/20" />
                <div className="absolute w-full h-[1px] bg-emerald-500/20" />
                <div className="absolute h-full w-[1px] bg-emerald-500/20" />
                <div
                  className="absolute inset-0 origin-center pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg, rgba(16,185,129,0.4) 0deg, transparent 60deg)',
                    animation: 'spin 3s linear infinite',
                  }}
                />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                <div className="absolute top-4 left-6 w-1 h-1 rounded-full bg-amber-400 animate-ping" />
              </div>
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest mt-1">
                HDG: {String(headingDeg).padStart(3, '0')}°
              </span>
            </div>

            {/* Top-Right: Capture, Record, Timer, Audio & Mode */}
            <div className="flex items-center gap-2">
              {/* Session Countdown Timer */}
              <div
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md text-xs font-mono tracking-wider ${
                  sessionTimeLeft <= 30
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                    : 'bg-zinc-950/80 border-zinc-800 text-cyan-300'
                }`}
                title="Strict 2-Minute Exploration Countdown"
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
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-xs backdrop-blur-md hover:border-cyan-500 transition-all active:scale-95 shadow-lg"
                title="Capture Snapshot (F)"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">SNAP</span>
                <kbd className="text-[10px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400 border border-zinc-700">F</kbd>
              </button>

              {/* Clip Recorder Button */}
              <button
                onClick={toggleRecording}
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md text-xs transition-all active:scale-95 shadow-lg ${
                  isRecording
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-rose-500'
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
                className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md text-xs transition-all active:scale-95 shadow-lg ${
                  isAudioMuted
                    ? 'bg-zinc-950/80 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    : 'bg-zinc-950/80 border-zinc-700 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                }`}
              >
                {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
              </button>
            </div>
          </div>

          {/* LEFT: Dynamic Thrust Gauge */}
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
              <span className="text-[9px] text-zinc-400">
                {thrustLevel > 0 ? `${thrustLevel}%` : '0%'}
              </span>
              <span className="text-[8px] text-cyan-400 font-bold tracking-widest rotate-180 [writing-mode:vertical-rl]">
                THRUST
              </span>
            </div>
          </div>

          {/* CENTER: Tactical Reticle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center space-y-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border border-white/20 rounded-lg pointer-events-none" />
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400/80" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400/80" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400/80" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400/80" />
              <Crosshair className="w-8 h-8 text-white/50 animate-pulse" />
            </div>
            <div className="text-[10px] text-cyan-300/80 tracking-widest bg-zinc-950/60 px-2 py-0.5 rounded border border-cyan-500/20 backdrop-blur-sm">
              TARGET LOCK • RNG 128M
            </div>
          </div>

          {/* TACTICAL EVENT DECISION PROMPT (Zero API) */}
          {activeEvent && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 max-w-lg w-full p-4 rounded-2xl bg-zinc-950/95 border border-amber-500/60 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.25)] pointer-events-auto space-y-3 animate-bounce">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                <Radio className="w-4 h-4 animate-ping" />
                <span>{activeEvent.title}</span>
              </div>
              <div className="space-y-1.5">
                {activeEvent.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePickChoice(opt)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/80 hover:bg-amber-950/50 border border-zinc-800 hover:border-amber-500/50 text-left text-xs text-zinc-200 transition-all active:scale-95"
                  >
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 text-amber-400 border border-zinc-700 rounded text-[10px] font-bold">
                      [{idx + 1}]
                    </kbd>
                    <span className="flex-1 font-light">{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NOTIFICATION TOAST */}
          {lastNotification && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs shadow-lg backdrop-blur-md flex items-center gap-2 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lastNotification}</span>
            </div>
          )}

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
                <span>DIST: {distanceKm.toFixed(2)} KM</span>
              </div>
              <p className="text-zinc-200 text-xs font-light tracking-wide line-clamp-2">
                {currentPrompt}
              </p>
            </div>

            {/* Bottom-Right: Gaming Controls Matrix */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md text-xs shadow-2xl">
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
                <span className="text-zinc-700 hidden md:inline">|</span>
                <div className="hidden md:flex items-center gap-1 text-[#4FD8E8]">
                  <span>MOUSE / ARROWS</span>
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
