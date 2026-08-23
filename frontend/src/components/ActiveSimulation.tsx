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
  Radar,
  Radio,
  Footprints,
  Gauge,
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

const DEFAULT_STREET_FEED = 'https://vjs.zencdn.net/v/oceans.mp4';

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

  const [activeVideoUrl] = useState<string>(DEFAULT_STREET_FEED);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Animated AR Scan Reticle on Connection
  const [showScanReticle, setShowScanReticle] = useState(true);

  // Active Control Direction States
  const [activeMovement, setActiveMovement] = useState<MovementDirection>('idle');
  const [activeLook, setActiveLook] = useState<LookDirection>('idle');

  // Walking Speed Telemetry (km/h)
  const [walkingSpeed, setWalkingSpeed] = useState<number>(0);

  // 3rd Person Character & Camera Kinematics State
  const simState = useRef({
    charX: 0,
    charY: 0,
    walkCycle: 0,
    isWalking: false,
    charFacingAngle: 0,
    camPanX: 0,
    camPanY: 0,
    camZoom: 1.05,
    targetPanX: 0,
    targetPanY: 0,
    targetZoom: 1.05,
    tiltX: 0,
    tiltY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const backdropImgRef = useRef<HTMLImageElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const leftLegRef = useRef<HTMLDivElement>(null);
  const rightLegRef = useRef<HTMLDivElement>(null);

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
      setDistanceKm((prev) => prev + 0.05);
      setWalkingSpeed(5.4);
    } else if (direction === 'backward') {
      setDistanceKm((prev) => prev + 0.02);
      setWalkingSpeed(3.1);
    } else if (direction === 'left' || direction === 'right') {
      setDistanceKm((prev) => prev + 0.03);
      setWalkingSpeed(4.2);
    } else {
      setWalkingSpeed(0);
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

  // 60FPS 3rd-Person Street Walking & Camera Kinematics Loop
  useEffect(() => {
    let animId: number;

    const updateSimulationLoop = () => {
      const s = simState.current;

      // 1. Process 3rd-Person Locomotion
      s.isWalking = activeMovement !== 'idle' || activeLook !== 'idle';

      if (activeMovement === 'forward') {
        s.targetZoom = Math.min(s.targetZoom + 0.006, 2.2);
        s.charFacingAngle = 0;
        s.walkCycle += 0.22;
      } else if (activeMovement === 'backward') {
        s.targetZoom = Math.max(s.targetZoom - 0.006, 1.0);
        s.charFacingAngle = 180;
        s.walkCycle += 0.16;
      } else if (activeMovement === 'left') {
        s.targetPanX = Math.min(s.targetPanX + 5, 260);
        s.charFacingAngle = -45;
        s.walkCycle += 0.18;
      } else if (activeMovement === 'right') {
        s.targetPanX = Math.max(s.targetPanX - 5, -260);
        s.charFacingAngle = 45;
        s.walkCycle += 0.18;
      }

      if (activeLook === 'left') {
        s.targetPanX = Math.min(s.targetPanX + 4, 300);
        s.tiltY = Math.min(s.tiltY + 0.2, 8);
      } else if (activeLook === 'right') {
        s.targetPanX = Math.max(s.targetPanX - 4, -300);
        s.tiltY = Math.max(s.tiltY - 0.2, -8);
      } else if (activeLook === 'up') {
        s.targetPanY = Math.min(s.targetPanY + 3, 160);
        s.tiltX = Math.max(s.tiltX - 0.2, -6);
      } else if (activeLook === 'down') {
        s.targetPanY = Math.max(s.targetPanY - 3, -160);
        s.tiltX = Math.min(s.tiltX + 0.2, 6);
      } else {
        s.tiltX *= 0.92;
        s.tiltY *= 0.92;
      }

      // 2. Smooth Lerp Camera Interpolation
      s.camPanX += (s.targetPanX - s.camPanX) * 0.12;
      s.camPanY += (s.targetPanY - s.camPanY) * 0.12;
      s.camZoom += (s.targetZoom - s.camZoom) * 0.12;

      // 3. Apply Camera Transforms to Background Street Layers
      const transformStyle = `translate3d(${s.camPanX.toFixed(2)}px, ${s.camPanY.toFixed(2)}px, 0) scale(${s.camZoom.toFixed(3)}) rotateX(${s.tiltX.toFixed(2)}deg) rotateY(${s.tiltY.toFixed(2)}deg)`;
      
      if (backdropImgRef.current) {
        backdropImgRef.current.style.transform = transformStyle;
      }
      if (videoRef.current) {
        videoRef.current.style.transform = transformStyle;
      }

      // 4. Animate 3rd-Person Character Walking Motion & Step Strides
      if (characterRef.current) {
        // Vertical step bobbing
        const stepBob = s.isWalking ? Math.sin(s.walkCycle * 2) * 6 : Math.sin(Date.now() * 0.002) * 2;
        const charLateral = (s.camPanX * -0.15).toFixed(1);
        characterRef.current.style.transform = `translate3d(${charLateral}px, ${stepBob.toFixed(1)}px, 0) rotate(${s.charFacingAngle}deg)`;

        // Leg stride swinging
        if (leftLegRef.current && rightLegRef.current) {
          const legAngle = s.isWalking ? Math.sin(s.walkCycle) * 28 : 0;
          leftLegRef.current.style.transform = `rotate(${legAngle.toFixed(1)}deg)`;
          rightLegRef.current.style.transform = `rotate(${(-legAngle).toFixed(1)}deg)`;
        }
      }

      animId = requestAnimationFrame(updateSimulationLoop);
    };

    animId = requestAnimationFrame(updateSimulationLoop);
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
      audioEngine.playNarration(`3rd Person Street Navigation Locked on ${effectivePrompt.split(',')[0]}`);
    }, 350);

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
      if (ctx && backdropImgRef.current) {
        ctx.drawImage(backdropImgRef.current, 0, 0, 1280, 720);

        // Watermark 3rd Person Telemetry HUD
        ctx.fillStyle = 'rgba(9, 12, 17, 0.85)';
        ctx.fillRect(20, 650, 520, 50);
        ctx.fillStyle = '#4FD8E8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`INCEPTION 3RD PERSON STREET EXPLORER // ${currentPrompt.slice(0, 35)}...`, 35, 680);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const existing = JSON.parse(localStorage.getItem('inception_snapshots') || '[]');
        const snapshotItem = {
          id: `snap_${Date.now()}`,
          timestamp: Date.now(),
          dataUrl: dataUrl,
          sectorPrompt: currentPrompt,
          cameraVector: `3rd Person Zoom ${(simState.current.camZoom * 100).toFixed(0)}%`,
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
    'Street Density: 88.4% Optimal',
    'Optical Alignment: 99.8% Calibrated',
    'Locomotion Rate: 5.4 km/h Active',
  ];

  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden select-none font-mono">
      {/* 1. Loading Screen */}
      {!isStreamReady && <LoadingScreen prompt={currentPrompt} />}

      {/* 2. Interactive 3rd-Person Dynamic Environment Viewport */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full overflow-hidden bg-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Layer A: High-Resolution Street Backdrop */}
        <img
          ref={backdropImgRef}
          src={activeImage}
          alt="Street Environment"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-[opacity] duration-700 [transform-origin:center_center] [will-change:transform]"
          style={{
            opacity: isStreamReady ? 1 : 0,
          }}
        />

        {/* Layer B: Animated Ambient Video Atmosphere Overlay */}
        <video
          ref={videoRef}
          src={activeVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none mix-blend-screen opacity-35 [transform-origin:center_center] [will-change:transform]"
        />
      </div>

      {/* 3. Authentic 3rd-Person Walking Character Silhouette with Animated Strides */}
      {isStreamReady && (
        <div className="absolute inset-x-0 bottom-12 z-25 pointer-events-none flex flex-col items-center justify-end">
          <div
            ref={characterRef}
            className="relative flex flex-col items-center [transform-origin:bottom_center]"
          >
            {/* Cyber Operator Torso & Holographic Cyber Jacket */}
            <div className="relative flex flex-col items-center">
              {/* Head & Cyber Visor */}
              <div className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_#4FD8E8]">
                <div className="w-5 h-2 rounded bg-cyan-400 shadow-[0_0_10px_#4FD8E8]" />
              </div>
              
              {/* Armored Cyber Torso */}
              <div className="w-14 h-18 bg-zinc-950 border border-cyan-500/60 rounded-xl mt-1 flex items-center justify-center shadow-2xl relative">
                <div className="w-8 h-10 border border-cyan-400/40 rounded bg-cyan-950/40 flex items-center justify-center">
                  <span className="text-[8px] text-cyan-300 font-bold tracking-widest">3RD</span>
                </div>
                {/* Tactical Backpack Luminescence */}
                <div className="absolute -top-1 w-3 h-3 rounded-full bg-cyan-400/80 animate-ping" />
              </div>

              {/* Animated Walking Strides (Dual Kinetic Legs) */}
              <div className="flex gap-3 mt-0.5">
                <div
                  ref={leftLegRef}
                  className="w-3.5 h-12 bg-zinc-900 border border-cyan-500/50 rounded-b-lg [transform-origin:top_center] transition-transform"
                >
                  <div className="w-full h-2.5 bg-cyan-400 rounded-b-lg mt-9 shadow-[0_0_10px_#4FD8E8]" />
                </div>
                <div
                  ref={rightLegRef}
                  className="w-3.5 h-12 bg-zinc-900 border border-cyan-500/50 rounded-b-lg [transform-origin:top_center] transition-transform"
                >
                  <div className="w-full h-2.5 bg-cyan-400 rounded-b-lg mt-9 shadow-[0_0_10px_#4FD8E8]" />
                </div>
              </div>
            </div>

            {/* Dynamic Ground Holographic Ripple on Walking */}
            <div
              className={`w-28 h-6 rounded-full bg-cyan-400/20 blur-md border border-cyan-400/50 transition-all duration-150 ${
                activeMovement !== 'idle' ? 'scale-125 opacity-100 animate-pulse' : 'scale-90 opacity-40'
              }`}
            />

            {/* 3rd Person Orientation Reticle */}
            <div className="mt-2 px-3 py-0.5 rounded-full bg-zinc-950/90 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 tracking-widest shadow-xl flex items-center gap-1.5">
              <Footprints className="w-3 h-3 text-cyan-400" />
              <span>3RD-PERSON STREET EXPLORER</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Subtle Clean Edge Vignette & Cyber Grid Overlay */}
      {isStreamReady && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.75) 100%)',
          }}
        />
      )}

      {/* 5. Holographic AR Scan Reticle on Connection */}
      {isStreamReady && showScanReticle && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center transition-opacity duration-1000">
          <div className="relative w-44 h-44 border border-cyan-500/40 rounded-full flex items-center justify-center animate-pulse">
            <div
              className="absolute inset-2 border border-dashed border-cyan-400/40 rounded-full animate-spin"
              style={{ animationDuration: '6s' }}
            />
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_20px_#4FD8E8]" />
            <div className="absolute -bottom-6 text-[10px] font-mono text-cyan-300 tracking-widest bg-zinc-950/90 px-3 py-1 border border-cyan-500/40 rounded shadow-xl">
              3RD-PERSON TELEMETRY LOCKED
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
                  3RD PERSON STREET POV
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-emerald-400 font-mono text-[11px] font-bold">
                  0 CREDITS (FREE)
                </span>
              </div>

              {/* Speedometer Telemetry */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md text-xs text-zinc-300 shadow-2xl">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-bold text-cyan-300">{walkingSpeed.toFixed(1)}</span>
                <span className="text-[10px] text-zinc-500">KM/H</span>
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
                Street Coordinates
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
                <span>MODE: ACTIVE WALKING</span>
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
                    <span>3rd-Person Street Directive Terminal</span>
                  </div>
                  <kbd className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 border border-zinc-700">
                    [TAB] CLOSE
                  </kbd>
                </div>

                <p className="text-xs text-zinc-400">
                  Morph street environment live — Powered by Pollinations (0 Credits):
                </p>

                <form onSubmit={handleConsoleSubmit} className="flex gap-2">
                  <input
                    ref={consoleInputRef}
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="e.g. Add rain reflections, ramen stalls, and flying neon signs..."
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
                <span>Active 3rd-Person Street Walk</span>
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
                  <span className="font-bold text-zinc-200">WALK STREET</span>
                </div>
                <span className="text-zinc-700">|</span>
                <span className="hidden md:inline text-emerald-400 font-medium">3RD PERSON POV</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ActiveSimulation;
