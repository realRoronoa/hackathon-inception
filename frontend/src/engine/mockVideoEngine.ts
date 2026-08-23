import type { MovementDirection, LookDirection } from '../types/simulation';
import type { IVideoEngine, VideoStreamSource } from './videoEngine';

const PRESET_VIDEO_SOURCES: Record<string, string> = {
  kitchen: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  smart: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  ev: 'https://vjs.zencdn.net/v/oceans.mp4',
  showroom: 'https://vjs.zencdn.net/v/oceans.mp4',
  flagship: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  orbital: 'https://vjs.zencdn.net/v/oceans.mp4',
  manor: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  cyberpunk: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  earbuds: 'https://vjs.zencdn.net/v/oceans.mp4',
};

const DEFAULT_VIDEO_URL = 'https://media.w3.org/2010/05/sintel/trailer.mp4';

export class MockVideoEngine implements IVideoEngine {
  private initTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isConnected: boolean = false;

  public initialize(
    prompt: string,
    onStreamReady: (source: VideoStreamSource) => void,
    _baseImage?: string
  ): Promise<void> {
    console.log(`[MOCK VIDEO] Initializing stream with prompt: "${prompt}"...`);

    return new Promise((resolve) => {
      if (this.initTimeoutId) {
        clearTimeout(this.initTimeoutId);
      }

      // Pick corresponding world video source or default
      const normalizedPrompt = prompt.toLowerCase();
      let selectedVideoUrl = DEFAULT_VIDEO_URL;

      for (const [key, url] of Object.entries(PRESET_VIDEO_SOURCES)) {
        if (normalizedPrompt.includes(key)) {
          selectedVideoUrl = url;
          break;
        }
      }

      this.initTimeoutId = setTimeout(() => {
        this.isConnected = true;
        this.initTimeoutId = null;
        console.log(`[MOCK VIDEO] Stream initialized with URL: ${selectedVideoUrl}`);
        onStreamReady(selectedVideoUrl);
        resolve();
      }, 1800);
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
