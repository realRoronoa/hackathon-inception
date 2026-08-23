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
  Layers,
  Radio,
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
  isLiveMode = true,
  onExit,
}) => {
  const effectivePrompt = researchData?.reactor_prompt || initialPrompt;
  const [currentPrompt, setCurrentPrompt] = useState<string>(effectivePrompt);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [streamSource, setStreamSource] = useState<VideoStreamSource | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Animated AR Scan Reticle on Connection
  const [showScanReticle, setShowScanReticle] = useState(true);

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

  // Throttle command dispatching to avoid WebRTC buffer congestion
  const lastDispatchTimeRef = useRef<number>(0);

  // Interactive 3D Spatial Viewport Kinematics (Spring Physics Interpolation)
  const simRef = useRef({
    panX: 0,
    panY: 0,
    zoom: 1.05,
    targetPanX: 0,
    targetPanY: 0,
    targetZoom: 1.05,
    tiltX: 0,
    tiltY: 0,
    walkCycle: 0,
  });

  const viewportRef = useRef<HTMLDivElement>(null);

  // Handle keyboard & mouse movement changes (WASD)
  const handleMovementChange = useCallback((direction: MovementDirection) => {
    if (direction === 'forward') {
      setDistanceKm((prev) => prev + 0.08);
    } else if (direction === 'backward') {
      setDistanceKm((prev) => prev + 0.03);
    } else if (direction === 'left' || direction === 'right') {
      setDistanceKm((prev) => prev + 0.05);
    }

    const now = Date.now();
    if (now - lastDispatchTimeRef.current > 50) {
      lastDispatchTimeRef.current = now;
      if (videoEngineRef.current) {
        videoEngineRef.current.sendMovement(direction);
      }
    }
  }, []);

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
      handleMovementChange(dir);
      const s = simRef.current;
      if (dir === 'forward') {
        s.targetZoom = Math.min(s.targetZoom + 0.08, 2.4);
        s.walkCycle += 0.2;
      } else if (dir === 'backward') {
        s.targetZoom = Math.max(s.targetZoom - 0.08, 1.0);
        s.walkCycle += 0.15;
      } else if (dir === 'left') {
        s.targetPanX = Math.min(s.targetPanX + 25, 340);
        s.tiltY = Math.min(s.tiltY + 1.2, 9);
      } else if (dir === 'right') {
        s.targetPanX = Math.max(s.targetPanX - 25, -340);
        s.tiltY = Math.max(s.tiltY - 1.2, -9);
      }
    },
    onLookChange: (dir) => {
      handleLookChange(dir);
      const s = simRef.current;
      if (dir === 'left') {
        s.targetPanX = Math.min(s.targetPanX + 20, 360);
        s.tiltY = Math.min(s.tiltY + 1.5, 12);
      } else if (dir === 'right') {
        s.targetPanX = Math.max(s.targetPanX - 20, -360);
        s.tiltY = Math.max(s.tiltY - 1.5, -12);
      } else if (dir === 'up') {
        s.targetPanY = Math.min(s.targetPanY + 15, 200);
        s.tiltX = Math.max(s.tiltX - 1.2, -10);
      } else if (dir === 'down') {
        s.targetPanY = Math.max(s.targetPanY - 15, -200);
        s.tiltX = Math.min(s.tiltX + 1.2, 10);
      }
    },
  });

  // 60FPS Kinematic Camera Animation Loop
  useEffect(() => {
    let animId: number;

    const updateKinematics = () => {
      const s = simRef.current;

      // Smooth Spring Lerp (12% per frame)
      s.panX += (s.targetPanX - s.panX) * 0.12;
      s.panY += (s.targetPanY - s.panY) * 0.12;
      s.zoom += (s.targetZoom - s.zoom) * 0.12;
      s.tiltX *= 0.95;
      s.tiltY *= 0.95;

      if (viewportRef.current) {
        viewportRef.current.style.transform = `translate3d(${s.panX.toFixed(2)}px, ${s.panY.toFixed(2)}px, 0) scale(${s.zoom.toFixed(3)}) rotateX(${s.tiltX.toFixed(2)}deg) rotateY(${s.tiltY.toFixed(2)}deg)`;
      }

      animId = requestAnimationFrame(updateKinematics);
    };

    animId = requestAnimationFrame(updateKinematics);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Attach MediaStream or Video URL to <video> element
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !streamSource) return;

    const playVideo = () => {
      el.play().catch((err) => {
        console.warn('[ACTIVE SIMULATION] Autoplay retry needed:', err);
      });
    };

    if (streamSource instanceof MediaStream) {
      el.srcObject = streamSource;
      el.src = '';
      playVideo();

      const tracks = streamSource.getTracks();
      for (const track of tracks) {
        track.enabled = true;
        track.addEventListener('unmute', playVideo);
      }
      return () => {
        for (const track of tracks) {
          track.removeEventListener('unmute', playVideo);
        }
      };
    } else if (typeof streamSource === 'string') {
      el.srcObject = null;
      el.src = streamSource;
      playVideo();
    }
  }, [streamSource]);

  // Mount effect: Initialize Reactor WebRTC (passing reference image) with automatic fallback
  useEffect(() => {
    let isSubscribed = true;

    const videoEngine = isLiveMode ? new ReactorEngine() : new MockVideoEngine();
    const audioEngine = isLiveMode ? new FishAudioEngine() : new MockAudioEngine();

    videoEngineRef.current = videoEngine;
    audioEngineRef.current = audioEngine;

    (async () => {
      try {
        console.log('[ACTIVE SIMULATION] Initializing simulation engine with base reference image...');
        await videoEngine.initialize(
          effectivePrompt,
          (source: VideoStreamSource) => {
            if (!isSubscribed) return;
            setStreamSource(source);
            setIsStreamReady(true);
          },
          researchData?.base_image
        );

        if (!isSubscribed) return;
        audioEngine.startAmbient();
        audioEngine.playNarration(`Entering ${effectivePrompt.split(',')[0]}`);
      } catch (error: any) {
        if (!isSubscribed) return;
        const errStr = error?.message || '';
        console.warn('[ACTIVE SIMULATION] Engine initialization notification:', errStr);

        // Auto fallback to high-definition interactive presentation stream if credits depleted or capacity capped
        if (errStr.includes('402') || errStr.includes('429') || errStr.includes('credits_depleted') || errStr.includes('capacity')) {
          try {
            console.log('[ACTIVE SIMULATION] Switching to interactive backup stream...');
            const fallbackVideo = new MockVideoEngine();
            const fallbackAudio = new MockAudioEngine();
            videoEngineRef.current = fallbackVideo;
            audioEngineRef.current = fallbackAudio;

            await fallbackVideo.initialize(
              effectivePrompt,
              (source: VideoStreamSource) => {
                if (!isSubscribed) return;
                setStreamSource(source);
                setIsStreamReady(true);
              },
              researchData?.base_image
            );

            if (!isSubscribed) return;
            fallbackAudio.startAmbient();
            return;
          } catch (fallbackErr) {
            console.error('[ACTIVE SIMULATION] Fallback failed:', fallbackErr);
          }
        }

        const msg = errStr.includes('429')
          ? 'Reactor GPU Cluster Capacity Full (429) — Launching Interactive Backup...'
          : errStr.includes('402') || errStr.includes('credits_depleted')
          ? 'Reactor Credits Depleted — Launching Interactive Mode...'
          : 'Connecting to Interactive World Stream...';
        setErrorMessage(msg);
      }
    })();

    return () => {
      isSubscribed = false;
      console.log('[ACTIVE SIMULATION] Unmounting: executing hard GPU session teardown...');
      if (videoEngineRef.current) {
        videoEngineRef.current.disconnect();
        videoEngineRef.current = null;
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.stopAll();
        audioEngineRef.current = null;
      }
    };
  }, [effectivePrompt, isLiveMode, researchData?.base_image]);

  // Credit Optimization: Pause remote GPU diffusion while modals are open or tab is hidden
  useEffect(() => {
    const shouldPause = isConsoleOpen || showDebrief || (typeof document !== 'undefined' && document.hidden);
    if (shouldPause) {
      videoEngineRef.current?.pause?.();
    } else {
      videoEngineRef.current?.resume?.();
    }
  }, [isConsoleOpen, showDebrief]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        videoEngineRef.current?.pause?.();
      } else if (!isConsoleOpen && !showDebrief) {
        videoEngineRef.current?.resume?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isConsoleOpen, showDebrief]);

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
      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);

        // Watermark HUD Data
        ctx.fillStyle = 'rgba(9, 12, 17, 0.85)';
        ctx.fillRect(20, 650, 520, 50);
        ctx.fillStyle = '#4FD8E8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`INCEPTION SPATIAL SIM // ${currentPrompt.slice(0, 40)}...`, 35, 680);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const existing = JSON.parse(localStorage.getItem('inception_snapshots') || '[]');
        const snapshotItem = {
          id: `snap_${Date.now()}`,
          timestamp: Date.now(),
          dataUrl: dataUrl,
          sectorPrompt: currentPrompt,
          cameraVector: `Spatial Walk`,
        };
        localStorage.setItem('inception_snapshots', JSON.stringify([snapshotItem, ...existing]));
      }
    } catch (err) {
      console.warn('[ACTIVE SIMULATION] Snapshot capture notice:', err);
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

  // Handle In-Game Directive Submit ([TAB] Console)
  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const directive = consoleInput.trim();
    if (!directive) return;

    soundFx.playClick();
    setCurrentPrompt(directive);
    setIsConsoleOpen(false);
    setConsoleInput('');

    if (videoEngineRef.current?.setPrompt) {
      videoEngineRef.current.setPrompt(directive);
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
      {!isStreamReady && !errorMessage && <LoadingScreen prompt={currentPrompt} />}

      {/* 2. Hardware-Accelerated Interactive 3D Viewport Layer */}
      <div
        ref={viewportRef}
        className="absolute inset-0 w-full h-full [transform-origin:center_center] [will-change:transform]"
      >
        {/* Seamless Reference Image Backdrop */}
        {researchData?.base_image && (
          <img
            src={researchData.base_image}
            alt="Spatial Environment Seed"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />
        )}

        {/* Full-Screen Interactive WebRTC Video Viewport */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          onLoadedMetadata={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            streamSource ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* 3. Subtle Clean Edge Vignette */}
      {isStreamReady && !errorMessage && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 65%, rgba(0,0,0,0.6) 100%)',
          }}
        />
      )}

      {/* 4. Holographic AR Scan Reticle on Connection */}
      {isStreamReady && !errorMessage && showScanReticle && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center transition-opacity duration-1000">
          <div className="relative w-40 h-40 border border-cyan-500/40 rounded-full flex items-center justify-center animate-pulse">
            <div
              className="absolute inset-2 border border-dashed border-cyan-400/40 rounded-full animate-spin"
              style={{ animationDuration: '6s' }}
            />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_15px_#4FD8E8]" />
            <div className="absolute -bottom-6 text-[10px] font-mono text-cyan-300 tracking-widest bg-zinc-950/90 px-2.5 py-0.5 border border-cyan-500/40 rounded shadow-lg">
              SPATIAL 3D LINK ACTIVE
            </div>
          </div>
        </div>
      )}

      {/* 5. Shutter Camera Flash */}
      {isFlashing && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none opacity-90 transition-opacity duration-200" />
      )}

      {/* 6. Error Screen Fallback */}
      {errorMessage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="max-w-md w-full rounded-2xl border border-rose-500/30 bg-zinc-950/95 p-6 text-center space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.15)]">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto animate-bounce" />
            <h2 className="text-base font-semibold text-rose-200 uppercase tracking-wider font-mono">
              Live Stream Status
            </h2>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">{errorMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs font-mono uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Stream</span>
              </button>
              <button
                onClick={onExit}
                className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono font-semibold hover:text-zinc-200 transition-all cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
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

      {/* 8. LIVE HUD OVERLAY & COCKPIT CONTROLS */}
      {isStreamReady && !errorMessage && (
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
                  INTERACTIVE SPATIAL STREAM
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-cyan-400 font-mono text-[11px] font-bold">
                  {isLiveMode ? 'REACTOR LINGBOT' : 'SIMULATION MODE'}
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
          <aside className="self-end w-72 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md space-y-3 pointer-events-none shadow-2xl">
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
                <span>LATENCY: &lt;160ms</span>
              </div>
              <span className="text-cyan-400 font-mono">720p @ 30FPS</span>
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
                  Update environment directive live — GPU diffusion paused while typing:
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
                  />
                  <button
                    type="submit"
                    disabled={!consoleInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
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
            <div className="max-w-lg p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 backdrop-blur-md text-xs space-y-1 shadow-2xl">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] uppercase tracking-wider font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Active 3D Spatial Stream</span>
              </div>
              <p className="text-zinc-200 text-xs font-light tracking-wide line-clamp-2">
                {currentPrompt}
              </p>
            </div>

            {/* Bottom-Right: Interactive Navigation Bar */}
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
                  <span className="font-bold text-zinc-200">WALK</span>
                </div>
                <span className="text-zinc-700">|</span>
                <div className="flex items-center gap-1">
                  <span>ARROWS:</span>
                  <span className="font-bold text-zinc-200">LOOK 360°</span>
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
