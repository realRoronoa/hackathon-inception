import { Reactor } from '@reactor-team/js-sdk';
import type { MovementDirection, LookDirection } from '../types/simulation';
import type { IVideoEngine, VideoStreamSource } from './videoEngine';

/**
 * Exchanges a raw Reactor API Key (rk_...) for a short-lived scoped JWT token
 */
async function resolveReactorJwt(apiKey: string): Promise<string> {
  // If the key is already a JWT (contains 3 dot-separated parts), use it directly
  if (apiKey.split('.').length === 3) {
    return apiKey;
  }

  try {
    // 1. Direct exchange with Reactor token endpoint
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

    // 2. Fallback to backend proxy endpoint
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
      this.client.on('trackReceived', (name: string, _track: MediaStreamTrack, stream: MediaStream) => {
        console.log(`[REACTOR ENGINE] WebRTC track received: "${name}"`);
        if (name === 'main_video' || name === 'video') {
          console.log('[REACTOR ENGINE] Main video stream active.');
          this.isConnected = true;
          onStreamReady(stream);
        }
      });

      // 4. Establish WebRTC connection using JWT token
      await this.client.connect(jwtToken);
      console.log('[REACTOR ENGINE] WebRTC peer connection established.');

      // 5. Send the initial world prompt as object payload
      await this.client.sendCommand('set_prompt', { prompt });
      console.log(`[REACTOR ENGINE] Sent world prompt: "${prompt}"`);
    } catch (error) {
      console.error('[REACTOR ENGINE] Failed to initialize Reactor stream:', error);
      throw error;
    }
  }

  public sendMovement(direction: MovementDirection): void {
    if (!this.client) return;
    try {
      // Pass object payload to satisfy Reactor data channel serializer
      this.client.sendCommand('set_movement', { direction, movement: direction });
      console.log('[REACTOR ENGINE] Sent movement ->', direction);
    } catch (err) {
      console.warn('[REACTOR ENGINE] Failed to send movement:', err);
    }
  }

  public sendLook(direction: LookDirection): void {
    if (!this.client) return;
    try {
      // Pass object payload to satisfy Reactor data channel serializer
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
