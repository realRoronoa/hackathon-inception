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

          activeMediaStream = stream && stream.getTracks().length > 0 ? stream : new MediaStream([track]);
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
        if (baseImage && (baseImage.startsWith('data:image/jpeg') || baseImage.startsWith('data:image/png') || baseImage.startsWith('http'))) {
          console.log('[REACTOR ENGINE] Real concept photo detected, uploading to Reactor session...');
          const res = await fetch(baseImage);
          const blob = await res.blob();
          file = new File([blob], 'seed.jpg', { type: 'image/jpeg' });
        }

        if (file) {
          const imageRef = await this.client.uploadFile(file);
          console.log('✅ BASE CONCEPT PHOTO UPLOADED TO REACTOR:', imageRef);
          await this.client.sendCommand('set_image', { image: imageRef });
          console.log('[REACTOR ENGINE] Sent set_image with photo anchor.');
        } else {
          console.log('[REACTOR ENGINE] Generating direct 3D neural simulation from styled prompt...');
        }
      } catch (uploadErr) {
        console.error('❌ SEED IMAGE UPLOAD FAILED (Proceeding with text simulation):', uploadErr);
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
