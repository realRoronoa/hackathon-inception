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
 * Creates a high-definition seed image canvas to anchor LingBot world generation
 */
async function createSeedImageBlob(prompt: string): Promise<Blob> {
  if (typeof document === 'undefined') {
    return new Blob([], { type: 'image/jpeg' });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Blob([], { type: 'image/jpeg' });

  const norm = prompt.toLowerCase();
  let grad1 = '#090d16';
  let grad2 = '#131e3a';
  let accent = '#38bdf8';

  if (norm.includes('victorian')) {
    grad1 = '#1a0f0f';
    grad2 = '#361818';
    accent = '#fb7185';
  } else if (norm.includes('cyberpunk')) {
    grad1 = '#0f051d';
    grad2 = '#290b3a';
    accent = '#e879f9';
  } else if (norm.includes('orbital') || norm.includes('space')) {
    grad1 = '#030712';
    grad2 = '#0f172a';
    accent = '#38bdf8';
  }

  // Draw deep ambient radial backdrop
  const grad = ctx.createRadialGradient(512, 288, 50, 512, 288, 600);
  grad.addColorStop(0, grad2);
  grad.addColorStop(1, grad1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 576);

  // Draw perspective 3D grid
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;

  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 576);
    ctx.lineTo(512 + (x - 512) * 0.15, 288);
    ctx.stroke();
  }

  for (let y = 288; y <= 576; y += 28) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Draw glowing horizon core
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(512, 288, 90, 0, Math.PI * 2);
  ctx.fill();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob([], { type: 'image/jpeg' }));
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

    try {
      // 1. Exchange API Key for scoped JWT token
      const jwtToken = await resolveReactorJwt(apiKey);
      console.log('[REACTOR ENGINE] Successfully acquired scoped JWT token.');

      // 2. Initialize Reactor client instance with official slug
      this.client = new Reactor({
        modelName: 'reactor/lingbot',
        apiUrl: 'https://api.reactor.inc',
      });

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
          onStreamReady(mediaStream);
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
      console.log('[REACTOR ENGINE] Connection ready. Staging base concept image and prompt...');

      // 5. Upload base concept image to anchor LingBot neural generation (Image-to-World)
      try {
        let file: File | null = null;
        if (baseImage && baseImage.startsWith('data:image/svg+xml')) {
          const seedBlob = await createSeedImageBlob(prompt);
          file = new File([seedBlob], 'seed.jpg', { type: 'image/jpeg' });
        } else if (baseImage && baseImage.startsWith('data:')) {
          const res = await fetch(baseImage);
          const blob = await res.blob();
          file = new File([blob], 'seed.jpg', { type: 'image/jpeg' });
        } else if (baseImage) {
          const res = await fetch(baseImage);
          const blob = await res.blob();
          file = new File([blob], 'seed.jpg', { type: 'image/jpeg' });
        }

        if (file) {
          console.log('[REACTOR ENGINE] Uploading seed image to Reactor session...');
          const imageRef = await this.client.uploadFile(file);
          console.log('✅ BASE CONCEPT IMAGE UPLOADED TO REACTOR:', imageRef);
          await this.client.sendCommand('set_image', { image: imageRef });
          console.log('[REACTOR ENGINE] Sent set_image with base concept anchor.');
        }
      } catch (uploadErr) {
        console.error('❌ SEED IMAGE UPLOAD FAILED (Booting text-only simulation):', uploadErr);
      }

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
    } catch (error) {
      console.error('[REACTOR ENGINE] Failed to initialize Reactor stream:', error);
      throw error;
    }
  }

  public sendMovement(direction: MovementDirection): void {
    if (!this.client || this.client.getStatus() !== 'ready') return;
    try {
      // Map to official LingBot wire protocol: "idle" | "forward" | "back" | "strafe_left" | "strafe_right"
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
      // Map to official LingBot wire protocol: set_look_horizontal & set_look_vertical
      if (direction === 'left' || direction === 'right' || direction === 'idle') {
        const horizontalValue = direction === 'left' ? 'left' : direction === 'right' ? 'right' : 'idle';
        this.client.sendCommand('set_look_horizontal', { look_horizontal: horizontalValue });
        console.log('[REACTOR ENGINE] Sent set_look_horizontal ->', horizontalValue);
      }

      if (direction === 'up' || direction === 'down' || direction === 'idle') {
        const verticalValue = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'idle';
        this.client.sendCommand('set_look_vertical', { look_vertical: verticalValue });
        console.log('[REACTOR ENGINE] Sent set_look_vertical ->', verticalValue);
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
        this.client.disconnect();
        console.log('[REACTOR ENGINE] Reactor client disconnected.');
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
