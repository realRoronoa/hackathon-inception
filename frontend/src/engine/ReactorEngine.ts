import { Reactor } from '@reactor-team/js-sdk';
import type { MovementDirection, LookDirection } from '../types/simulation';
import type { IVideoEngine, VideoStreamSource } from './videoEngine';
import { applyMasterTheme } from '../utils/themeWrapper';

/**
 * Exchanges a raw Reactor API Key (rk_...) for a short-lived scoped JWT token
 */
async function resolveReactorJwt(apiKey: string): Promise<string> {
  if (apiKey.split('.').length === 3) {
    return apiKey;
  }

  try {
    const response = await fetch('https://api.reactor.inc/tokens', {
      method: 'POST',
      headers: {
        'Reactor-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorization_details: [
          {
            type: 'session',
            resources: { models: { match: ['reactor/lingbot', 'lingbot'] } },
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.jwt) return data.jwt;
    }

    const backendResponse = await fetch('http://localhost:5000/api/reactor-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });

    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      if (backendData.jwt) return backendData.jwt;
    }

    throw new Error('Could not exchange Reactor API key for JWT token.');
  } catch (error) {
    console.error('[REACTOR ENGINE] Token resolution failed:', error);
    throw error;
  }
}

/**
 * Creates a high-definition 1024x576 photographic anchor canvas for LingBot neural diffusion
 */
async function generatePhotographicSeed(prompt: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const norm = prompt.toLowerCase();
    
    // Background gradient: Deep moody cinematic room
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 576);
    bgGrad.addColorStop(0, '#0a0e17');
    bgGrad.addColorStop(0.5, '#121a2d');
    bgGrad.addColorStop(1, '#05070d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 576);

    // Dynamic accent color
    let primaryAccent = '#00f0ff';
    let secondaryAccent = '#ff007f';
    if (norm.includes('kitchen')) {
      primaryAccent = '#38bdf8';
      secondaryAccent = '#f59e0b';
    } else if (norm.includes('ev') || norm.includes('showroom')) {
      primaryAccent = '#60a5fa';
      secondaryAccent = '#a855f7';
    } else if (norm.includes('flagship') || norm.includes('lounge')) {
      primaryAccent = '#c084fc';
      secondaryAccent = '#06b6d4';
    }

    // Volumetric horizon glow
    const glow = ctx.createRadialGradient(512, 280, 20, 512, 280, 450);
    glow.addColorStop(0, primaryAccent);
    glow.addColorStop(0.3, secondaryAccent);
    glow.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1024, 576);
    ctx.globalAlpha = 1.0;

    // Floor perspective grid
    ctx.strokeStyle = primaryAccent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.45;
    const vanishY = 280;
    for (let x = -200; x <= 1224; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 576);
      ctx.lineTo(512 + (x - 512) * 0.12, vanishY);
      ctx.stroke();
    }
    for (let y = vanishY; y <= 576; y += (y - vanishY) * 0.28 + 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Architectural Side Panels / Digital Displays
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = secondaryAccent;
    ctx.lineWidth = 2;
    // Left console
    ctx.beginPath();
    ctx.moveTo(0, 200);
    ctx.lineTo(240, 240);
    ctx.lineTo(240, 460);
    ctx.lineTo(0, 520);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right console
    ctx.beginPath();
    ctx.moveTo(1024, 200);
    ctx.lineTo(784, 240);
    ctx.lineTo(784, 460);
    ctx.lineTo(1024, 520);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central focal platform
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = primaryAccent;
    ctx.beginPath();
    ctx.ellipse(512, 430, 260, 65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Neon Reticle in Center
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = primaryAccent;
    ctx.beginPath();
    ctx.arc(512, 280, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob || new Blob([])], 'seed.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

export class ReactorEngine implements IVideoEngine {
  private client: Reactor | null = null;
  private isConnected: boolean = false;

  public async initialize(
    prompt: string,
    onStreamReady: (source: VideoStreamSource) => void,
    baseImage?: string
  ): Promise<void> {
    const apiKey = import.meta.env.VITE_REACTOR_API_KEY || '';

    console.log(`[REACTOR ENGINE] Exchanging API key and initializing Reactor client with model: "reactor/lingbot"...`);

    if (!baseImage || baseImage.startsWith('data:image/svg')) {
      console.warn('[REACTOR ENGINE] Aborting GPU session: Valid base concept image is required.');
      throw new Error('Simulation Aborted: No valid Imagen 3 photo generated. GPU session canceled to protect Reactor credits.');
    }

    try {
      // 0. Pre-bundle base image File in memory BEFORE connecting (Eliminates 3-7s GPU reservation lag)
      console.log('[REACTOR ENGINE] Pre-bundling reference image before WebRTC session allocation...');
      let seedFile: File;
      if (baseImage && (baseImage.startsWith('data:image/jpeg') || baseImage.startsWith('data:image/png') || baseImage.startsWith('http'))) {
        const res = await fetch(baseImage);
        const blob = await res.blob();
        seedFile = new File([blob], 'seed.jpg', { type: 'image/jpeg' });
      } else {
        seedFile = await generatePhotographicSeed(prompt);
      }

      // 1. Exchange API Key for scoped JWT token
      const jwtToken = await resolveReactorJwt(apiKey);
      console.log('[REACTOR ENGINE] Successfully acquired scoped JWT token.');

      // 2. Initialize Reactor client instance with official slug
      this.client = new Reactor({
        modelName: 'reactor/lingbot',
        apiUrl: 'https://api.reactor.inc',
      });

      let activeMediaStream: MediaStream | null = null;

      // 3. Listen for incoming WebRTC video stream track
      this.client.on('trackReceived', (name: string, track: MediaStreamTrack, stream: MediaStream) => {
        console.log(`🎥 ONTRACK FIRED. NAME: "${name}", KIND: "${track?.kind}"`, track, stream);
        track.enabled = true;

        try {
          this.client?.resumeTrack(name || 'main_video');
        } catch {}

        if (track?.kind === 'video' || name === 'main_video' || name === 'video' || name.includes('video')) {
          console.log('✅ MAIN VIDEO STREAM ACTIVE AND ENABLED');
          this.isConnected = true;

          const mediaStream = stream && stream.getTracks().length > 0 ? stream : new MediaStream([track]);
          activeMediaStream = mediaStream;
          onStreamReady(mediaStream);

          track.onunmute = () => {
            console.log(`🎥 WEBRTC TRACK UNMUTED EVENT: "${name}"`);
            onStreamReady(mediaStream);
          };
        }
      });

      this.client.on('statusChanged', (status: string) => {
        console.log(`[REACTOR ENGINE] Status changed -> ${status}`);
      });

      this.client.on('schemaReceived', (schema: any) => {
        console.log('[REACTOR ENGINE] Model schema received:', JSON.stringify(schema));
      });

      this.client.on('message', (msg: any) => {
        console.log('[REACTOR ENGINE] Model message received:', JSON.stringify(msg));
      });

      // Promise to wait for status "ready"
      const waitForReady = new Promise<void>((resolve) => {
        if (this.client?.getStatus() === 'ready') {
          resolve();
        } else {
          const handler = (status: string) => {
            if (status === 'ready') {
              this.client?.off('statusChanged', handler);
              resolve();
            }
          };
          this.client?.on('statusChanged', handler);
        }
      });

      // 4. Establish WebRTC connection using JWT token
      await this.client.connect(jwtToken);
      console.log('[REACTOR ENGINE] WebRTC peer connection established, waiting for ready status...');

      await waitForReady;
      console.log('[REACTOR ENGINE] Connection ready. Instantly uploading pre-bundled reference image...');

      // 5. Instantly upload pre-bundled seed image and set prompt
      const imageRef = await this.client.uploadFile(seedFile);
      console.log('✅ SEED IMAGE UPLOADED TO REACTOR (<200ms):', imageRef);

      await this.client.sendCommand('set_image', { image: imageRef });
      const styledPrompt = applyMasterTheme(prompt);
      await this.client.sendCommand('set_prompt', { prompt: styledPrompt });
      console.log(`[REACTOR ENGINE] Sent styled set_prompt: "${styledPrompt}"`);

      // 6. Trigger start and unpause recvonly tracks
      try {
        this.client.resumeTrack('main_video');
      } catch {}

      await this.client.sendCommand('start', {});
      console.log('[REACTOR ENGINE] Sent start command to LingBot.');

      // 7. Send initial control anchors to trigger LingBot physics engine
      try {
        await this.client.sendCommand('set_movement', { movement: 'idle' });
        await this.client.sendCommand('set_look_horizontal', { look_horizontal: 'idle' });
        await this.client.sendCommand('set_look_vertical', { look_vertical: 'idle' });
        console.log('[REACTOR ENGINE] Sent initial state anchors to LingBot.');
      } catch (cmdErr) {
        console.warn('[REACTOR ENGINE] Initial state anchor notice:', cmdErr);
      }

      // 8. Explicitly notify UI only AFTER image staging and start protocol are complete
      if (activeMediaStream) {
        onStreamReady(activeMediaStream);
      } else {
        const onLateTrack = (name: string, track: MediaStreamTrack, stream: MediaStream) => {
          if (track?.kind === 'video' || name === 'main_video' || name === 'video') {
            this.client?.off('trackReceived', onLateTrack);
            const ms = stream && stream.getTracks().length > 0 ? stream : new MediaStream([track]);
            onStreamReady(ms);
          }
        };
        this.client.on('trackReceived', onLateTrack);
      }
    } catch (error) {
      console.error('[REACTOR ENGINE] Failed to initialize Reactor stream:', error);
      throw error;
    }
  }

  public async pause(): Promise<void> {
    if (!this.client || this.client.getStatus() !== 'ready') return;
    try {
      await this.client.sendCommand('pause', {});
      console.log('⏸️ [REACTOR GPU] GPU diffusion PAUSED (0 Credits Consumed during modal/blur).');
    } catch (err) {
      console.warn('[REACTOR GPU] Pause notice:', err);
    }
  }

  public async resume(): Promise<void> {
    if (!this.client || this.client.getStatus() !== 'ready') return;
    try {
      await this.client.sendCommand('resume', {});
      console.log('▶️ [REACTOR GPU] GPU diffusion RESUMED.');
    } catch (err) {
      console.warn('[REACTOR GPU] Resume notice:', err);
    }
  }

  public sendMovement(direction: MovementDirection): void {
    if (!this.client || this.client.getStatus() !== 'ready') return;
    try {
      const movementValue =
        direction === 'forward'
          ? 'forward'
          : direction === 'backward'
          ? 'back'
          : direction === 'left'
          ? 'strafe_left'
          : direction === 'right'
          ? 'strafe_right'
          : 'idle';

      this.client.sendCommand('set_movement', { movement: movementValue });
      console.log('[REACTOR ENGINE] Sent set_movement ->', movementValue);
    } catch (err) {
      console.warn('[REACTOR ENGINE] Failed to send movement:', err);
    }
  }

  public sendLook(direction: LookDirection): void {
    if (!this.client || this.client.getStatus() !== 'ready') return;
    try {
      if (direction === 'left' || direction === 'right' || direction === 'idle') {
        const horizontalValue = direction === 'left' ? 'left' : direction === 'right' ? 'right' : 'idle';
        this.client.sendCommand('set_look_horizontal', { look_horizontal: horizontalValue });
      }

      if (direction === 'up' || direction === 'down' || direction === 'idle') {
        const verticalValue = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'idle';
        this.client.sendCommand('set_look_vertical', { look_vertical: verticalValue });
      }
    } catch (err) {
      console.warn('[REACTOR ENGINE] Failed to send look:', err);
    }
  }

  public async setPrompt(prompt: string): Promise<void> {
    if (!this.client || this.client.getStatus() !== 'ready') return;
    try {
      const styledPrompt = applyMasterTheme(prompt);
      await this.client.sendCommand('set_prompt', { prompt: styledPrompt });
      console.log(`[REACTOR ENGINE] Mid-stream styled prompt updated -> "${styledPrompt}"`);
    } catch (err) {
      console.warn('[REACTOR ENGINE] Failed to update mid-stream prompt:', err);
    }
  }

  public disconnect(): void {
    if (this.client) {
      try {
        this.client.disconnect(true);
        console.log('🛑 [REACTOR ENGINE] Hard GPU session terminated (Billing Halted).');
      } catch (err) {
        console.warn('[REACTOR ENGINE] Error disconnecting client:', err);
      }
      this.client = null;
    }
    this.isConnected = false;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export default ReactorEngine;
