import { Reactor } from '@reactor-team/js-sdk';
import type { MovementDirection, LookDirection } from '../types/simulation';
import type { IVideoEngine, VideoStreamSource } from './videoEngine';

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
            resources: { models: { match: ['lingbot'] } },
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
    onStreamReady: (source: VideoStreamSource) => void
  ): Promise<void> {
    const apiKey = import.meta.env.VITE_REACTOR_API_KEY || '';

    console.log(`[REACTOR ENGINE] Exchanging API key and initializing Reactor client with model: "lingbot"...`);

    try {
      // 1. Exchange API Key for scoped JWT token
      const jwtToken = await resolveReactorJwt(apiKey);
      console.log('[REACTOR ENGINE] Successfully acquired scoped JWT token.');

      // 2. Initialize Reactor client instance
      this.client = new Reactor({
        modelName: 'lingbot',
        apiUrl: 'https://api.reactor.inc',
      });

      // 3. Listen for incoming WebRTC video stream track
      this.client.on('trackReceived', (name: string, track: MediaStreamTrack, stream: MediaStream) => {
        console.log(`[REACTOR ENGINE] WebRTC track received: "${name}"`, track);
        if (name === 'main_video' || name === 'video') {
          console.log('[REACTOR ENGINE] Main video stream active.');
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

      this.client.on('runtimeMessage', (msg: any) => {
        console.log('[REACTOR ENGINE] Runtime message received:', JSON.stringify(msg));
      });

      // 4. Establish WebRTC connection using JWT token
      await this.client.connect(jwtToken);
      console.log('[REACTOR ENGINE] WebRTC peer connection established.');

      // 5. Upload seed image to anchor LingBot neural generation
      try {
        console.log('[REACTOR ENGINE] Creating and uploading seed image for prompt:', prompt);
        const seedBlob = await createSeedImageBlob(prompt);
        const file = new File([seedBlob], 'seed.jpg', { type: 'image/jpeg' });
        const imageRef = await this.client.uploadFile(file);
        console.log('[REACTOR ENGINE] Seed image uploaded successfully:', imageRef);

        // 6. Send set_image and set_prompt
        await this.client.sendCommand('set_image', { image: imageRef });
        console.log('[REACTOR ENGINE] Sent set_image command.');
      } catch (uploadErr) {
        console.warn('[REACTOR ENGINE] Seed image upload note:', uploadErr);
      }

      await this.client.sendCommand('set_prompt', { prompt });
      console.log(`[REACTOR ENGINE] Sent world prompt: "${prompt}"`);

      // 7. Trigger the start command to begin real-time neural frame generation
      try {
        await this.client.sendCommand('start', {});
        console.log('[REACTOR ENGINE] Sent start command to LingBot.');
      } catch (startErr) {
        console.warn('[REACTOR ENGINE] Start command note:', startErr);
      }
    } catch (error) {
      console.error('[REACTOR ENGINE] Failed to initialize Reactor stream:', error);
      throw error;
    }
  }

  public sendMovement(direction: MovementDirection): void {
    if (!this.client) return;
    try {
      this.client.sendCommand('set_movement', { direction, movement: direction });
      console.log('[REACTOR ENGINE] Sent movement ->', direction);
    } catch (err) {
      console.warn('[REACTOR ENGINE] Failed to send movement:', err);
    }
  }

  public sendLook(direction: LookDirection): void {
    if (!this.client) return;
    try {
      this.client.sendCommand('set_look', { direction, look: direction });
      console.log('[REACTOR ENGINE] Sent look ->', direction);
    } catch (err) {
      console.warn('[REACTOR ENGINE] Failed to send look:', err);
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
