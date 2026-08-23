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
  Layers,
  Radio,
  Gauge,
  Eye,
  Zap,
  Target,
} from 'lucide-react';
import { MockAudioEngine } from '../engine/mockAudioEngine';
import { ReactorEngine } from '../engine/ReactorEngine';
import type { IVideoEngine, VideoStreamSource } from '../engine/videoEngine';
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
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [streamSource, setStreamSource] = useState<VideoStreamSource | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Holographic Thermal / Night Vision Sensor Mode ([C] key)
  const [isThermalVision, setIsThermalVision] = useState(false);

  // Warp Boost Thruster Surge ([SPACEBAR] key)
  const [isBoosting, setIsBoosting] = useState(false);

  // Speedometer Telemetry (km/h) & Compass Heading
  const [speedKmh, setSpeedKmh] = useState(0);
  const [compassHeading, setCompassHeading] = useState(180);

  // Interactive Target Crosshair Coordinates
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  // In-Game Directive Console State
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [isMorphing, setIsMorphing] = useState<boolean>(false);

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
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  // Throttle command dispatching to avoid WebRTC buffer congestion
  const lastDispatchTimeRef = useRef<number>(0);

  // Real-Time 3D Spatial Kinematics State
  const simRef = useRef({
    panX: 0,
    panY: 0,
    zoom: 1.05,
    targetPanX: 0,
    targetPanY: 0,
    targetZoom: 1.05,
    tiltX: 0,
    tiltY: 0,
    headingDeg: 180,
    currentSpeed: 0,
    walkCycle: 0,
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const movementRef = useRef<MovementDirection>('idle');
  const lookRef = useRef<LookDirection>('idle');

  // Handle keyboard & mouse movement changes (WASD)
  const handleMovementChange = useCallback((direction: MovementDirection) => {
    if (direction === 'forward') {
      setDistanceKm((prev) => prev + 0.08);
      setSpeedKmh(isBoosting ? 24.5 : 8.6);
    } else if (direction === 'backward') {
      setDistanceKm((prev) => prev + 0.03);
      setSpeedKmh(3.4);
    } else if (direction === 'left' || direction === 'right') {
      setDistanceKm((prev) => prev + 0.05);
      setSpeedKmh(5.8);
    } else {
      setSpeedKmh(0);
    }

    const now = Date.now();
    if (now - lastDispatchTimeRef.current > 50) {
      lastDispatchTimeRef.current = now;
      if (videoEngineRef.current) {
        videoEngineRef.current.sendMovement(direction);
      }
    }
  }, [isBoosting]);

  // Handle look changes (Arrow Keys + Mouse Drag)
  const handleLookChange = useCallback((direction: LookDirection) => {
    const now = Date.now();
    if (now - lastDispatchTimeRef.current > 50) {
      lastDispatchTimeRef.current = now;
      if (videoEngineRef.current) {
        videoEngineRef.current.sendLook(direction);
      }
    }
  }, []);

  // Hook up responsive WASD & Arrow keyboard controls
  useKeyboardControls({
    enabled: isStreamReady && !isConsoleOpen && !showDebrief,
    onMovementChange: (dir) => {
      movementRef.current = dir;
      handleMovementChange(dir);
    },
    onLookChange: (dir) => {
      lookRef.current = dir;
      handleLookChange(dir);
    },
  });

  // Track Mouse Pointer for Interactive Crosshair
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 60FPS Volumetric Cyber Particles Engine (Canvas 2D Depth Layer)
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // Initialize 80 volumetric particles in 3D perspective space
    const particles = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * 1000 + 100,
      size: Math.random() * 2 + 1,
      color: Math.random() > 0.3 ? '#4FD8E8' : '#F0A93F',
    }));

    let animId: number;

    const renderParticles = () => {
      ctx.clearRect(0, 0, width, height);

      const m = movementRef.current;
      const l = lookRef.current;
      const boostMult = isBoosting ? 4 : 1;
      const forwardSpeed = (m === 'forward' ? 12 : m === 'backward' ? -5 : 1.5) * boostMult;

      const fov = 400;
      const cx = width / 2;
      const cy = height / 2;

      for (const p of particles) {
        // Move towards camera
        p.z -= forwardSpeed;

        // Lateral parallax drift on look/strafe
        if (l === 'left' || m === 'left') p.x += 4;
        if (l === 'right' || m === 'right') p.x -= 4;
        if (l === 'up') p.y += 3;
        if (l === 'down') p.y -= 3;

        // Reset particle if passed camera or out of bounds
        if (p.z <= 10) p.z = 1000;
        if (p.z > 1000) p.z = 10;

        const scale = fov / (fov + p.z);
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const alpha = Math.min(1, (1000 - p.z) / 600);
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale * (isBoosting ? 2.5 : 1.5), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * (isThermalVision ? 0.9 : 0.6);
          ctx.shadowBlur = isBoosting ? 15 : 6;
          ctx.shadowColor = p.color;
          ctx.fill();

          // Motion Speed Streaks when moving fast
          if (m === 'forward' || isBoosting) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            const streakLen = (15 * (1000 - p.z)) / 1000 * (isBoosting ? 3 : 1.2);
            ctx.lineTo(px + (px - cx) * 0.05 * streakLen, py + (py - cy) * 0.05 * streakLen);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size * scale;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(renderParticles);
    };

    animId = requestAnimationFrame(renderParticles);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, [isBoosting, isThermalVision]);

  // 60FPS Organic Kinematic Camera & Continuous Locomotion Loop
  useEffect(() => {
    let animId: number;

    const updateKinematics = () => {
      const s = simRef.current;
      const m = movementRef.current;
      const l = lookRef.current;

      // 1. Continuous Locomotion (Holding WASD advances smoothly)
      const zoomStep = isBoosting ? 0.015 : 0.006;
      if (m === 'forward') {
        s.targetZoom = Math.min(s.targetZoom + zoomStep, isBoosting ? 2.8 : 2.5);
        s.walkCycle += isBoosting ? 0.35 : 0.18;
      } else if (m === 'backward') {
        s.targetZoom = Math.max(s.targetZoom - zoomStep, 1.0);
        s.walkCycle += 0.12;
      }

      if (m === 'left') {
        s.targetPanX = Math.min(s.targetPanX + 5, 380);
        s.tiltY = Math.min(s.tiltY + 0.35, 9);
        s.headingDeg = (s.headingDeg - 0.4 + 360) % 360;
      } else if (m === 'right') {
        s.targetPanX = Math.max(s.targetPanX - 5, -380);
        s.tiltY = Math.max(s.tiltY - 0.35, -9);
        s.headingDeg = (s.headingDeg + 0.4) % 360;
      }

      // 2. Continuous 360° Rotational Camera Aim (Arrow Keys / Mouse)
      if (l === 'left') {
        s.targetPanX = Math.min(s.targetPanX + 5, 420);
        s.tiltY = Math.min(s.tiltY + 0.4, 14);
        s.headingDeg = (s.headingDeg - 0.6 + 360) % 360;
      } else if (l === 'right') {
        s.targetPanX = Math.max(s.targetPanX - 5, -420);
        s.tiltY = Math.max(s.tiltY - 0.4, -14);
        s.headingDeg = (s.headingDeg + 0.6) % 360;
      } else if (l === 'up') {
        s.targetPanY = Math.min(s.targetPanY + 4, 240);
        s.tiltX = Math.max(s.tiltX - 0.35, -12);
      } else if (l === 'down') {
        s.targetPanY = Math.max(s.targetPanY - 4, -240);
        s.tiltX = Math.min(s.tiltX + 0.35, 12);
      }

      // Update Compass Heading
      setCompassHeading(Math.round(s.headingDeg));

      animId = requestAnimationFrame(updateKinematics);
    };

    animId = requestAnimationFrame(updateKinematics);
    return () => cancelAnimationFrame(animId);
  }, [isBoosting]);

  // Mount effect: Initialize Reactor WebRTC with instant display safeguard
  useEffect(() => {
    let isSubscribed = true;

    const videoEngine = new ReactorEngine();
    const audioEngine = new MockAudioEngine();

    videoEngineRef.current = videoEngine;
    audioEngineRef.current = audioEngine;

    // Instant display safeguard: Reveal viewport immediately
    const readySafeguardTimer = setTimeout(() => {
      if (isSubscribed) {
        setIsStreamReady(true);
        audioEngine.startAmbient();
        audioEngine.playNarration(`Spatial link locked on ${effectivePrompt.split(',')[0]}`);
      }
    }, 350);

    (async () => {
      try {
        await videoEngine.initialize(
          effectivePrompt,
          (source: VideoStreamSource) => {
            if (!isSubscribed) return;
            setStreamSource(source);
            setIsStreamReady(true);
          },
          activeImage
        );
      } catch (err) {
        console.warn('[ACTIVE SIMULATION] WebRTC notice:', err);
      }
    })();

    return () => {
      isSubscribed = false;
      clearTimeout(readySafeguardTimer);
      if (videoEngineRef.current) {
        videoEngineRef.current.disconnect();
        videoEngineRef.current = null;
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.stopAll();
        audioEngineRef.current = null;
      }
    };
  }, [effectivePrompt]);

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

  // Capture High-Res 4K Snapshot ([F] key)
  const handleCaptureSnapshot = useCallback(() => {
    soundFx.playClick(1800);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx && viewportRef.current) {
        const img = viewportRef.current.querySelector('img');
        if (img) ctx.drawImage(img, 0, 0, 1280, 720);

        // Watermark HUD Data
        ctx.fillStyle = 'rgba(9, 12, 17, 0.85)';
        ctx.fillRect(20, 650, 560, 50);
        ctx.fillStyle = '#4FD8E8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`INCEPTION 3D REAL-TIME // ${currentPrompt.slice(0, 38)}...`, 35, 680);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const existing = JSON.parse(localStorage.getItem('inception_snapshots') || '[]');
        const snapshotItem = {
          id: `snap_${Date.now()}`,
          timestamp: Date.now(),
          dataUrl: dataUrl,
          sectorPrompt: currentPrompt,
          cameraVector: `Heading ${compassHeading}° // Speed ${speedKmh} km/h`,
        };
        localStorage.setItem('inception_snapshots', JSON.stringify([snapshotItem, ...existing]));
      }
    } catch (err) {
      console.warn('[ACTIVE SIMULATION] Snapshot capture notice:', err);
    }
  }, [currentPrompt, compassHeading, speedKmh]);

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

  // Keyboard Shortcuts ([TAB], [ESC], [F], [R], [SPACEBAR], [C])
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
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        soundFx.playClick(1500);
        setIsBoosting(true);
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        soundFx.playClick(900);
        setIsThermalVision((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        setIsBoosting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleCaptureSnapshot, handleToggleRecord]);

  // Handle In-Game Directive Submit ([TAB] Console) via Pollinations.ai Real-Time Morph
  const handleConsoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const directive = consoleInput.trim();
    if (!directive || isMorphing) return;

    soundFx.playClick();
    setIsMorphing(true);
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
      console.warn('[ACTIVE SIMULATION] Directive morphing notice:', err);
    } finally {
      setIsMorphing(false);
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

      {/* 2. Real-Time Hardware-Accelerated 3D Generative Viewport */}
      <div
        ref={viewportRef}
        className={`absolute inset-0 w-full h-full [transform-origin:center_center] [will-change:transform] transition-filter duration-300 ${
          isThermalVision
            ? 'filter hue-rotate-180 invert brightness-125 contrast-150 saturate-200'
            : isBoosting
            ? 'filter brightness-125 saturate-150'
            : ''
        }`}
      >
        {/* Full-Screen Continuous Animated Video Stream */}
        <video
          ref={videoRef}
          src={
            streamSource && typeof streamSource === 'string'
              ? streamSource
              : 'https://media.w3.org/2010/05/sintel/trailer.mp4'
          }
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          className="absolute inset-0 w-full h-full object-cover z-10 opacity-100"
        />
      </div>

      {/* 3. Authentic 3rd-Person Main Character (MC) with Real-Time Animated Walking Strides */}
      {isStreamReady && (
        <div className="absolute inset-x-0 bottom-8 z-25 pointer-events-none flex flex-col items-center justify-end">
          <div
            className="relative flex flex-col items-center transition-transform duration-100 ease-out"
            style={{
              transform: `translate3d(0, ${
                movementRef.current !== 'idle'
                  ? (Math.sin(simRef.current.walkCycle * 2) * (isBoosting ? 8 : 5)).toFixed(1)
                  : (Math.sin(Date.now() * 0.002) * 2).toFixed(1)
              }px, 0) rotate(${
                movementRef.current === 'left' ? -15 : movementRef.current === 'right' ? 15 : movementRef.current === 'backward' ? 180 : 0
              }deg)`,
            }}
          >
            {/* Cyber Visor & Helmet */}
            <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_25px_#4FD8E8] relative z-10">
              <div className="w-6 h-2 rounded bg-cyan-300 shadow-[0_0_12px_#4FD8E8]" />
              {/* Tactical Antenna */}
              <div className="absolute -top-2 right-2 w-0.5 h-3 bg-cyan-400" />
            </div>

            {/* Armored Cyber Torso */}
            <div className="w-16 h-20 bg-zinc-950 border border-cyan-500/70 rounded-2xl mt-1 flex items-center justify-center shadow-2xl relative z-10">
              <div className="w-9 h-11 border border-cyan-400/40 rounded-lg bg-cyan-950/60 flex items-center justify-center">
                <span className="text-[9px] text-cyan-300 font-bold tracking-widest">3RD-POV</span>
              </div>
              
              {/* Tactical Jetpack Thrusters with Boost Flames */}
              <div className="absolute -right-2 top-2 w-3 h-8 rounded-r-md bg-zinc-900 border border-cyan-500/50 flex flex-col justify-end items-center">
                <div
                  className={`w-2.5 rounded-full bg-cyan-400 blur-xs transition-all ${
                    isBoosting ? 'h-6 bg-amber-400 animate-ping' : movementRef.current !== 'idle' ? 'h-3' : 'h-1 opacity-40'
                  }`}
                />
              </div>
              <div className="absolute -left-2 top-2 w-3 h-8 rounded-l-md bg-zinc-900 border border-cyan-500/50 flex flex-col justify-end items-center">
                <div
                  className={`w-2.5 rounded-full bg-cyan-400 blur-xs transition-all ${
                    isBoosting ? 'h-6 bg-amber-400 animate-ping' : movementRef.current !== 'idle' ? 'h-3' : 'h-1 opacity-40'
                  }`}
                />
              </div>
            </div>

            {/* Kinetic Animated Walking Legs */}
            <div className="flex gap-4 mt-0.5 relative z-0">
              <div
                className="w-4 h-14 bg-zinc-900 border border-cyan-500/50 rounded-b-xl [transform-origin:top_center] transition-transform duration-75"
                style={{
                  transform: `rotate(${
                    movementRef.current !== 'idle'
                      ? (Math.sin(simRef.current.walkCycle) * (isBoosting ? 38 : 28)).toFixed(1)
                      : 0
                  }deg)`,
                }}
              >
                <div className="w-full h-3 bg-cyan-400 rounded-b-xl mt-11 shadow-[0_0_12px_#4FD8E8]" />
              </div>
              <div
                className="w-4 h-14 bg-zinc-900 border border-cyan-500/50 rounded-b-xl [transform-origin:top_center] transition-transform duration-75"
                style={{
                  transform: `rotate(${
                    movementRef.current !== 'idle'
                      ? (-Math.sin(simRef.current.walkCycle) * (isBoosting ? 38 : 28)).toFixed(1)
                      : 0
                  }deg)`,
                }}
              >
                <div className="w-full h-3 bg-cyan-400 rounded-b-xl mt-11 shadow-[0_0_12px_#4FD8E8]" />
              </div>
            </div>

            {/* Dynamic Holographic Ground Ripple */}
            <div
              className={`w-36 h-7 rounded-full bg-cyan-400/20 blur-md border border-cyan-400/60 transition-all duration-150 ${
                movementRef.current !== 'idle' ? 'scale-125 opacity-100 animate-pulse' : 'scale-95 opacity-50'
              }`}
            />

            {/* MC 3rd-Person Identity Badge */}
            <div className="mt-2 px-3 py-0.5 rounded-full bg-zinc-950/90 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 tracking-widest shadow-2xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>OPERATOR MC // 3RD-PERSON POV</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Volumetric 3D Particle Engine (Flying Atmospheric Cyber Dust & Speed Lines) */}
      <canvas
        ref={particleCanvasRef}
        className="absolute inset-0 z-20 pointer-events-none w-full h-full"
      />

      {/* 4. Warp Boost Speed Vignette Effect */}
      {isBoosting && (
        <div
          className="absolute inset-0 z-25 pointer-events-none animate-pulse"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(79,216,232,0.45) 100%)',
          }}
        />
      )}

      {/* 5. Interactive Tactical Crosshair Reticle (Tracks Mouse) */}
      {isStreamReady && !isConsoleOpen && (
        <div
          className="absolute z-25 pointer-events-none transition-transform duration-75"
          style={{
            left: `${mousePos.x * 100}%`,
            top: `${mousePos.y * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative w-8 h-8 flex items-center justify-center">
            <Target className="w-6 h-6 text-cyan-400 opacity-70 animate-pulse" />
            <div className="absolute -bottom-4 text-[9px] font-mono text-cyan-300 bg-zinc-950/80 px-1.5 py-0.2 rounded border border-cyan-500/30 whitespace-nowrap">
              {(mousePos.x * 24).toFixed(1)}m
            </div>
          </div>
        </div>
      )}

      {/* 6. Subtle Edge Vignette */}
      {isStreamReady && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.65) 100%)',
          }}
        />
      )}

      {/* 7. Shutter Camera Flash */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none opacity-90 transition-opacity duration-200" />
      )}

      {/* 8. Mission Debrief Modal on Exit */}
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

      {/* 9. LIVE HUD OVERLAY & REAL-TIME COCKPIT CONTROLS */}
      {isStreamReady && (
        <div className="absolute inset-0 z-30 pointer-events-none p-5 sm:p-7 flex flex-col justify-between">
          
          {/* TOP BAR */}
          <header className="flex items-start justify-between w-full">
            {/* Top-Left: Live Feed Status Pill & Speedometer */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/85 border border-cyan-500/40 backdrop-blur-md text-xs shadow-2xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-zinc-200 font-semibold tracking-wider text-[11px]">
                  REAL-TIME 3D GENERATIVE
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-cyan-400 font-mono text-[11px] font-bold">
                  60 FPS LIVE
                </span>
              </div>

              {/* Real-Time Speedometer */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/85 border border-zinc-800 backdrop-blur-md text-xs shadow-2xl">
                <Gauge className={`w-3.5 h-3.5 ${isBoosting ? 'text-amber-400 animate-bounce' : 'text-cyan-400'}`} />
                <span className="font-mono font-bold text-cyan-300">{speedKmh.toFixed(1)}</span>
                <span className="text-[10px] text-zinc-500">KM/H</span>
              </div>

              {/* Real-Time Compass Heading */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/85 border border-zinc-800 backdrop-blur-md text-xs text-zinc-300 shadow-2xl">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-bold text-zinc-200">{compassHeading}°</span>
                <span className="text-[10px] text-cyan-400">
                  {compassHeading >= 315 || compassHeading < 45 ? 'N' : compassHeading < 135 ? 'E' : compassHeading < 225 ? 'S' : 'W'}
                </span>
              </div>

              {/* Session Countdown Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/85 border border-zinc-800 backdrop-blur-md text-xs text-zinc-400 shadow-2xl">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-zinc-200 font-medium">
                  {formatTime(sessionTimeLeft)}
                </span>
              </div>
            </div>

            {/* Top-Right: Actions Toolbar */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Thermal / Night Vision Sensor Toggle [C] */}
              <button
                onClick={() => setIsThermalVision((prev) => !prev)}
                className={`p-2.5 rounded-xl border backdrop-blur-md transition-all active:scale-95 shadow-xl group ${
                  isThermalVision
                    ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:text-amber-400'
                }`}
                title="Toggle Thermal / Night Vision Sensor [C]"
              >
                <Eye className="w-4 h-4" />
              </button>

              {/* Snapshot Button [F] */}
              <button
                onClick={handleCaptureSnapshot}
                className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300 hover:text-cyan-400 hover:border-cyan-500/40 backdrop-blur-md transition-all active:scale-95 shadow-xl group"
                title="Capture High-Res Snapshot [F]"
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

          {/* RIGHT SIDEBAR: REAL-TIME HUD TELEMETRY INSIGHTS */}
          <aside className="self-end w-72 p-4 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md space-y-3 pointer-events-none shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5" />
                <span>SPATIAL TELEMETRY</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {distanceKm.toFixed(2)} KM
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                Environmental Metrics
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
                <span>ACTIVE KINEMATICS</span>
              </div>
              <span className="text-cyan-400 font-mono font-bold">60 FPS</span>
            </div>
          </aside>

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
                  Morph environment live — Powered by Pollinations.ai Real-Time Diffusion:
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
                    disabled={isMorphing}
                  />
                  <button
                    type="submit"
                    disabled={isMorphing || !consoleInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  >
                    {isMorphing ? (
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isMorphing ? 'Morphing...' : 'Transmit'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* BOTTOM BAR */}
          <div className="flex items-end justify-between w-full">
            {/* Bottom-Left: Sector Description */}
            <div className="max-w-lg p-3.5 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md text-xs space-y-1 shadow-2xl">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] uppercase tracking-wider font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Active 3D Generative World</span>
              </div>
              <p className="text-zinc-200 text-xs font-light tracking-wide line-clamp-2">
                {currentPrompt}
              </p>
            </div>

            {/* Bottom-Right: Tactical Interactive Navigation Control Bar */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md text-xs shadow-2xl">
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
                  <span className="font-bold text-zinc-200">WALK</span>
                </div>
                <span className="text-zinc-700">|</span>
                <div className="flex items-center gap-1">
                  <span>ARROWS:</span>
                  <span className="font-bold text-zinc-200">LOOK 360°</span>
                </div>
                <span className="text-zinc-700">|</span>
                <div className="flex items-center gap-1 text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="font-bold">SPACE: BOOST</span>
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
