import type { MovementDirection, LookDirection } from '../types/simulation';
import type { IVideoEngine, VideoStreamSource } from './videoEngine';

export class MockVideoEngine implements IVideoEngine {
  private initTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isConnected: boolean = false;

  public initialize(
    prompt: string,
    onStreamReady: (source: VideoStreamSource) => void,
    baseImage?: string
  ): Promise<void> {
    console.log(`[MOCK VIDEO] Initializing stream with prompt: "${prompt}"...`);

    return new Promise((resolve) => {
      if (this.initTimeoutId) {
        clearTimeout(this.initTimeoutId);
      }

      this.initTimeoutId = setTimeout(() => {
        this.isConnected = true;
        this.initTimeoutId = null;
        console.log(`[MOCK VIDEO] Spatial stream initialized.`);
        if (baseImage) {
          onStreamReady(baseImage);
        }
        resolve();
      }, 400);
    });
  }

  public sendMovement(direction: MovementDirection): void {
    console.log('[MOCK VIDEO] Movement ->', direction);
  }

  public sendLook(direction: LookDirection): void {
    console.log('[MOCK VIDEO] Look ->', direction);
  }

  public setPrompt(prompt: string): void {
    console.log(`[MOCK VIDEO] Mid-stream prompt updated -> "${prompt}"`);
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

export default MockVideoEngine;
