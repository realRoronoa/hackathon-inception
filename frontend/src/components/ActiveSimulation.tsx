import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Camera,
  Terminal,
  Send,
  Video,
  Clock,
  Compass,
  Sparkles,
  User,
  Radar,
  Radio,
} from 'lucide-react';
import { MockAudioEngine } from '../engine/mockAudioEngine';
import type { IAudioEngine } from '../engine/audioEngine';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { LoadingScreen } from './LoadingScreen';
import { MissionDebriefModal } from './MissionDebriefModal';
import { soundFx } from '../engine/soundFx';
import type { MovementDirection, LookDirection, SpatialResearchPayload } from '../types/simulation';

interface ActiveSimulationProps {
  prompt: string;
  researchData?: SpatialResearchPayload | null;
  isLiveMode?: boolean;
  onExit: () => void;
}

// Preset Dynamic Video Streams for 3rd Person Background Exploration
const DYNAMIC_VIDEO_FEEDS: Record<string, string> = {
  earbuds: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  kitchen: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  ev: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  flagship: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  cyberpunk: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
};

const DEFAULT_VIDEO_FEED =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

export const ActiveSimulation: React.FC<ActiveSimulationProps> = ({
  prompt: initialPrompt,
  researchData,
  onExit,
}) => {
  const effectivePrompt = researchData?.reactor_prompt || initialPrompt;
  const [currentPrompt, setCurrentPrompt] = useState<string>(effectivePrompt);
  const [activeImage, setActiveImage] = useState<string>(
    researchData?.base_image || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80'
  );
  
  // Resolve Dynamic 2D Video Feed URL (Pollinations Video / High-Def Neural Loop)
  const getVideoFeedUrl = (query: string): string => {
    const norm = query.toLowerCase();
    for (const [key, url] of Object.entries(DYNAMIC_VIDEO_FEEDS)) {
      if (norm.includes(key)) return url;
    }
    return `https://gen.pollinations.ai/video/${encodeURIComponent(query)}?width=1280&height=720&nologo=true`;
  };

  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(() => getVideoFeedUrl(effectivePrompt));
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Animated AR Scan Reticle
  const [showScanReticle, setShowScanReticle] = useState(true);

  // Active Control Direction States
  const [activeMovement, setActiveMovement] = useState<MovementDirection>('idle');
  const [activeLook, setActiveLook] = useState<LookDirection>('idle');

  // 3rd Person Character & Camera Spatial Kinematics (Spring Physics Interpolation)
  const avatarRef = useRef({
    charX: 0,
    charY: 0,
    charRotation: 0,
    camPanX: 0,
    camPanY: 0,
    camZoom: 1.08,
    targetPanX: 0,
    targetPanY: 0,
    targetZoom: 1.08,
    tiltX: 0,
    tiltY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarVisualRef = useRef<HTMLDivElement>(null);

  // In-Game Directive Console State
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [isUpdatingDirective, setIsUpdatingDirective] = useState<boolean>(false);

  // Video Clip Recorder State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Snapshot flash state
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // 120-Second Strict Mission Timer
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(120);

  // Mission Stats & Debrief State
  const [missionStartTime] = useState<number>(Date.now());
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [showDebrief, setShowDebrief] = useState<boolean>(false);

  const consoleInputRef = useRef<HTMLInputElement>(null);
  const audioEngineRef = useRef<IAudioEngine | null>(null);

  // Handle keyboard & mouse movement changes
  const handleMovementChange = useCallback((direction: MovementDirection) => {
    setActiveMovement(direction);
    if (direction === 'forward') {
      setDistanceKm((prev) => prev + 0.06);
    } else if (direction === 'backward') {
      setDistanceKm((prev) => prev + 0.02);
    } else if (direction === 'left' || direction === 'right') {
      setDistanceKm((prev) => prev + 0.04);
    }
  }, []);

  const handleLookChange = useCallback((direction: LookDirection) => {
    setActiveLook(direction);
  }, []);

  // Hook up responsive WASD & Arrow keyboard controls
  useKeyboardControls({
    enabled: isStreamReady && !isConsoleOpen && !showDebrief,
    onMovementChange: handleMovementChange,
    onLookChange: handleLookChange,
  });

  // 60FPS 3rd-Person Kinematic Camera & Avatar Motion Loop
  useEffect(() => {
    let animId: number;

    const update3rdPersonKinematics = () => {
      const a = avatarRef.current;

      // 1. Calculate 3rd-Person Locomotion & Character Heading
      if (activeMovement === 'forward') {
        a.targetZoom = Math.min(a.targetZoom + 0.007, 2.4);
        a.charRotation = 0; // facing forward
      } else if (activeMovement === 'backward') {
        a.targetZoom = Math.max(a.targetZoom - 0.007, 1.0);
        a.charRotation = 180; // facing camera
      } else if (activeMovement === 'left') {
        a.targetPanX = Math.min(a.targetPanX + 6, 320);
        a.charRotation = -45; // leaning left
      } else if (activeMovement === 'right') {
        a.targetPanX = Math.max(a.targetPanX - 6, -320);
        a.charRotation = 45; // leaning right
      }

      if (activeLook === 'left') {
        a.targetPanX = Math.min(a.targetPanX + 5, 340);
        a.tiltY = Math.min(a.tiltY + 0.25, 9);
      } else if (activeLook === 'right') {
        a.targetPanX = Math.max(a.targetPanX - 5, -340);
        a.tiltY = Math.max(a.tiltY - 0.25, -9);
      } else if (activeLook === 'up') {
        a.targetPanY = Math.min(a.targetPanY + 4, 200);
        a.tiltX = Math.max(a.tiltX - 0.25, -7);
      } else if (activeLook === 'down') {
        a.targetPanY = Math.max(a.targetPanY - 4, -200);
        a.tiltX = Math.min(a.tiltX + 0.25, 7);
      } else {
        a.tiltX *= 0.92;
        a.tiltY *= 0.92;
      }

      // 2. Smooth Lerp Camera & 3rd-Person Framing Interpolation
      a.camPanX += (a.targetPanX - a.camPanX) * 0.11;
      a.camPanY += (a.targetPanY - a.camPanY) * 0.11;
      a.camZoom += (a.targetZoom - a.camZoom) * 0.11;

      // 3. Apply 3rd-Person Camera Transform to Environment Video Feed
      if (videoRef.current) {
        videoRef.current.style.transform = `translate3d(${a.camPanX.toFixed(2)}px, ${a.camPanY.toFixed(2)}px, 0) scale(${a.camZoom.toFixed(3)}) rotateX(${a.tiltX.toFixed(2)}deg) rotateY(${a.tiltY.toFixed(2)}deg)`;
      }

      // 4. Update 3rd-Person Operator Avatar Stance & Leaning
      if (avatarVisualRef.current) {
        const avatarOffset = (a.camPanX * -0.18).toFixed(1);
        avatarVisualRef.current.style.transform = `translate3d(${avatarOffset}px, 0, 0) rotate(${a.charRotation}deg)`;
      }

      animId = requestAnimationFrame(update3rdPersonKinematics);
    };

    animId = requestAnimationFrame(update3rdPersonKinematics);
    return () => cancelAnimationFrame(animId);
  }, [activeMovement, activeLook]);

  // Mount effect: Instant zero-latency loading and ambient audio boot
  useEffect(() => {
    let isSubscribed = true;
    const audioEngine = new MockAudioEngine();
    audioEngineRef.current = audioEngine;

    const timer = setTimeout(() => {
      if (!isSubscribed) return;
      setIsStreamReady(true);
      audioEngine.startAmbient();
      audioEngine.playNarration(`3rd Person Telemetry Locked on ${effectivePrompt.split(',')[0]}`);
    }, 400);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (audioEngineRef.current) {
        audioEngineRef.current.stopAll();
        audioEngineRef.current = null;
      }
    };
  }, [effectivePrompt]);

  // Dismiss scan reticle after 4 seconds
  useEffect(() => {
    if (isStreamReady) {
      const timer = setTimeout(() => setShowScanReticle(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isStreamReady]);

  // 120s Countdown Timer
  useEffect(() => {
    if (!isStreamReady || showDebrief) return;
    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowDebrief(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isStreamReady, showDebrief]);

  // Toggle Audio Mute
  const handleToggleAudio = () => {
    soundFx.playClick();
    if (isAudioMuted) {
      audioEngineRef.current?.startAmbient();
      setIsAudioMuted(false);
    } else {
      audioEngineRef.current?.stopAll();
      setIsAudioMuted(true);
    }
  };

  // Capture High-Res 3rd-Person Snapshot ([F] key)
  const handleCaptureSnapshot = useCallback(() => {
    soundFx.playClick(1800);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);

        // Watermark 3rd Person Telemetry HUD
        ctx.fillStyle = 'rgba(9, 12, 17, 0.85)';
        ctx.fillRect(20, 650, 520, 50);
        ctx.fillStyle = '#4FD8E8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`INCEPTION 3RD PERSON POV // ${currentPrompt.slice(0, 40)}...`, 35, 680);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const existing = JSON.parse(localStorage.getItem('inception_snapshots') || '[]');
        const snapshotItem = {
          id: `snap_${Date.now()}`,
          timestamp: Date.now(),
          dataUrl: dataUrl,
          sectorPrompt: currentPrompt,
          cameraVector: `3rd-Person Zoom ${(avatarRef.current.camZoom * 100).toFixed(0)}%`,
        };
        localStorage.setItem('inception_snapshots', JSON.stringify([snapshotItem, ...existing]));
      }
    } catch (err) {
      console.warn('[3RD PERSON SIMULATION] Snapshot capture notice:', err);
    }
  }, [currentPrompt]);

  // Handle Video Clip Recording ([R] key)
  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      soundFx.playClick();
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      soundFx.playClick();
      recordedChunksRef.current = [];
      setIsRecording(true);
      setRecordSeconds(0);
    }
  }, [isRecording]);

  // Keyboard Shortcuts ([TAB], [ESC], [F], [R])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Tab') {
          e.preventDefault();
          setIsConsoleOpen(false);
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        soundFx.playClick();
        setIsConsoleOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        soundFx.playClick();
        setShowDebrief(true);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleCaptureSnapshot();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleToggleRecord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCaptureSnapshot, handleToggleRecord]);

  // Handle In-Game Directive Submit ([TAB] Console) via Pollinations.ai
  const handleConsoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const directive = consoleInput.trim();
    if (!directive || isUpdatingDirective) return;

    soundFx.playClick();
    setIsUpdatingDirective(true);
    setCurrentPrompt(directive);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: directive }),
      });

      if (res.ok) {
        const payload: SpatialResearchPayload = await res.json();
        if (payload.base_image) {
          setActiveImage(payload.base_image);
        }
      }
      setActiveVideoUrl(getVideoFeedUrl(directive));
    } catch (err) {
      console.warn('[3RD PERSON SIMULATION] Directive generation notice:', err);
    } finally {
      setIsUpdatingDirective(false);
      setIsConsoleOpen(false);
      setConsoleInput('');
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hudInsights = researchData?.hud_insights || [
    'Spatial Vector: 4.8m/s Flow',
    'Acoustic Clearance: 18dB Damped',
    'Neural Alignment: 99.4% Active',
  ];

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden select-none font-mono">
      {/* 1. Loading Screen */}
      {!isStreamReady && <LoadingScreen prompt={currentPrompt} />}

      {/* 2. Interactive 3rd-Person 2D Video Viewport Stream Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <video
          ref={videoRef}
          src={activeVideoUrl}
          poster={activeImage}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover select-none pointer-events-none transition-[opacity] duration-700 [transform-origin:center_center] [will-change:transform]"
          style={{
            opacity: isStreamReady ? 1 : 0,
          }}
          onError={() => {
            if (activeVideoUrl !== DEFAULT_VIDEO_FEED) {
              setActiveVideoUrl(DEFAULT_VIDEO_FEED);
            }
          }}
        />
      </div>

      {/* 3. Authentic 3rd-Person Cyber Operator / Avatar Frame Overlay */}
      {isStreamReady && (
        <div className="absolute inset-x-0 bottom-16 z-25 pointer-events-none flex flex-col items-center justify-end">
          <div
            ref={avatarVisualRef}
            className="relative flex flex-col items-center transition-transform duration-200 ease-out"
          >
            {/* Cyber Drone / Operator Avatar Silhouette */}
            <div className="relative w-16 h-16 rounded-full border-2 border-cyan-400/80 bg-zinc-950/90 flex items-center justify-center shadow-[0_0_35px_rgba(79,216,232,0.6)]">
              <User className="w-8 h-8 text-cyan-300" />
              {/* Dynamic Propulsion Thruster Glow on Movement */}
              <div
                className={`absolute -bottom-2 w-8 h-2 rounded-full bg-cyan-400 blur-sm transition-opacity duration-150 ${
                  activeMovement !== 'idle' ? 'opacity-100 animate-pulse scale-125' : 'opacity-40'
                }`}
              />
            </div>
            
            {/* 3rd Person Orientation Reticle */}
            <div className="mt-1.5 px-2 py-0.5 rounded bg-zinc-950/90 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 tracking-wider shadow-lg">
              OPERATOR // 3RD-PERSON POV
            </div>
          </div>
        </div>
      )}

      {/* 4. Subtle Clean Edge Vignette & Perspective Grid */}
      {isStreamReady && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.7) 100%)',
          }}
        />
      )}

      {/* 5. Holographic AR Scan Reticle on Connection */}
      {isStreamReady && showScanReticle && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center transition-opacity duration-1000">
          <div className="relative w-40 h-40 border border-cyan-500/40 rounded-full flex items-center justify-center animate-pulse">
            <div
              className="absolute inset-2 border border-dashed border-cyan-400/40 rounded-full animate-spin"
              style={{ animationDuration: '6s' }}
            />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_15px_#4FD8E8]" />
            <div className="absolute -bottom-6 text-[10px] font-mono text-cyan-300 tracking-widest bg-zinc-950/90 px-2.5 py-0.5 border border-cyan-500/40 rounded shadow-lg">
              3RD-PERSON SPATIAL CAM LOCKED
            </div>
          </div>
        </div>
      )}

      {/* 6. Shutter Camera Flash */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none opacity-90 transition-opacity duration-200" />
      )}

      {/* 7. Mission Debrief Modal on Exit */}
      {showDebrief && (
        <MissionDebriefModal
          stats={{
            sector: currentPrompt,
            durationSeconds: Math.floor((Date.now() - missionStartTime) / 1000),
            distanceKm: distanceKm,
            anomaliesScanned: 2,
            decisionsMade: 1,
            neuralStability: 99.8,
          }}
          onReturnToBase={onExit}
          onRestart={() => setShowDebrief(false)}
        />
      )}

      {/* 8. LIVE 3RD-PERSON HUD OVERLAY & COCKPIT CONTROLS */}
      {isStreamReady && (
        <div className="absolute inset-0 z-30 pointer-events-none p-5 sm:p-7 flex flex-col justify-between">
          
          {/* TOP BAR */}
          <header className="flex items-start justify-between w-full">
            {/* Top-Left: Live Feed Status Pill */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-cyan-500/30 backdrop-blur-md text-xs shadow-2xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-zinc-200 font-semibold tracking-wider text-[11px]">
                  3RD PERSON 2D VIDEO
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-emerald-400 font-mono text-[11px] font-bold">
                  0 CREDITS (FREE)
                </span>
              </div>

              {/* Session Countdown Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md text-xs text-zinc-400 shadow-2xl">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-zinc-200 font-medium">
                  {formatTime(sessionTimeLeft)}
                </span>
              </div>
            </div>

            {/* Top-Right: Actions Toolbar */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Snapshot Button [F] */}
              <button
                onClick={handleCaptureSnapshot}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/40 backdrop-blur-md transition-all active:scale-95 shadow-xl group"
                title="Capture 3rd-Person Snapshot [F]"
              >
                <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>

              {/* Video Clip Recording Button [R] */}
              <button
                onClick={handleToggleRecord}
                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all active:scale-95 shadow-xl group ${
                  isRecording
                    ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:text-rose-400 hover:border-rose-500/40'
                }`}
                title={isRecording ? `Recording... (${recordSeconds}s) [R]` : 'Record Clip [R]'}
              >
                <Video className="w-4 h-4" />
              </button>

              {/* Audio Mute Toggle */}
              <button
                onClick={handleToggleAudio}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/40 backdrop-blur-md transition-all active:scale-95 shadow-xl"
                title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>

              {/* Mission Debrief / Exit Button [ESC] */}
              <button
                onClick={() => setShowDebrief(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-rose-500/50 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-400 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-xl"
                title="Complete Mission & Debrief [ESC]"
              >
                <X className="w-3.5 h-3.5" />
                <span>EXIT [ESC]</span>
              </button>
            </div>
          </header>

          {/* RIGHT SIDEBAR: REAL-TIME HUD TELEMETRY & 3RD-PERSON RADAR */}
          <aside className="self-end w-72 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md space-y-3 pointer-events-none shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                <span>3RD-PERSON RADAR</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {distanceKm.toFixed(2)} KM
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                Spatial Coordinates
              </span>
              {hudInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-xl bg-zinc-900/60 border border-cyan-500/10 text-xs"
                >
                  <span className="text-cyan-400 font-bold">▶</span>
                  <span className="text-zinc-300 leading-tight font-light">{insight}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
              <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>POV: 3RD PERSON</span>
              </div>
              <span className="text-cyan-400 font-mono">60 FPS</span>
            </div>
          </aside>

          {/* IN-GAME DIRECTIVE CONSOLE OVERLAY ([TAB]) */}
          {isConsoleOpen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md p-6 pointer-events-auto">
              <div className="w-full max-w-xl rounded-2xl border border-cyan-500/50 bg-zinc-950/95 p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                    <Terminal className="w-4 h-4" />
                    <span>3rd-Person World Directive Terminal</span>
                  </div>
                  <kbd className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 border border-zinc-700">
                    [TAB] CLOSE
                  </kbd>
                </div>

                <p className="text-xs text-zinc-400">
                  Update environment directive live — Powered by Pollinations (0 Credits):
                </p>

                <form onSubmit={handleConsoleSubmit} className="flex gap-2">
                  <input
                    ref={consoleInputRef}
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="e.g. Add glowing anime neon billboards and rainy reflections..."
                    className="flex-1 bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                    autoFocus
                    disabled={isUpdatingDirective}
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingDirective || !consoleInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  >
                    {isUpdatingDirective ? (
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isUpdatingDirective ? 'Morphing...' : 'Transmit'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* BOTTOM BAR */}
          <div className="flex items-end justify-between w-full">
            {/* Bottom-Left: Sector Description */}
            <div className="max-w-lg p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md text-xs space-y-1 shadow-2xl">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] uppercase tracking-wider font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Active 3rd-Person Dynamic Simulation</span>
              </div>
              <p className="text-zinc-200 text-xs font-light tracking-wide line-clamp-2">
                {currentPrompt}
              </p>
            </div>

            {/* Bottom-Right: Interactive 3rd Person Navigation Bar */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md text-xs shadow-2xl">
              <button
                onClick={() => setIsConsoleOpen(true)}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[11px] hover:bg-cyan-900/60 transition-all active:scale-95 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>DIRECTIVE [TAB]</span>
              </button>

              <div className="h-5 w-[1px] bg-zinc-800" />

              <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                <div className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>WASD:</span>
                  <span className="font-bold text-zinc-200">MOVE 3RD-POV</span>
                </div>
                <span className="text-zinc-700">|</span>
                <span className="hidden md:inline text-emerald-400 font-medium">FREE 2D VIDEO</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ActiveSimulation;
