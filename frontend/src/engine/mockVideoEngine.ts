import type { MovementDirection, LookDirection } from '../types/simulation';
import type { IVideoEngine, VideoStreamSource } from './videoEngine';

// Reliable public looping video demo URLs (CORS and format tested)
const PLACEHOLDER_VIDEO_URL =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export class MockVideoEngine implements IVideoEngine {
  private initTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isConnected: boolean = false;

  public initialize(
    prompt: string,
    onStreamReady: (source: VideoStreamSource) => void
  ): Promise<void> {
    console.log(`[MOCK VIDEO] Initializing stream with prompt: "${prompt}"...`);

    return new Promise((resolve) => {
      // Clear existing pending timeouts if any
      if (this.initTimeoutId) {
        clearTimeout(this.initTimeoutId);
      }

      this.initTimeoutId = setTimeout(() => {
        this.isConnected = true;
        this.initTimeoutId = null;
        console.log('[MOCK VIDEO] Stream initialized successfully. Ready to play.');
        onStreamReady(PLACEHOLDER_VIDEO_URL);
        resolve();
      }, 2500);
    });
  }

  public sendMovement(direction: MovementDirection): void {
    console.log('[MOCK VIDEO] Movement ->', direction);
  }

  public sendLook(direction: LookDirection): void {
    console.log('[MOCK VIDEO] Look ->', direction);
  }

  public disconnect(): void {
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
      console.log('[MOCK VIDEO] Pending initialization cancelled.');
    }
    this.isConnected = false;
    console.log('[MOCK VIDEO] Disconnected.');
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}
