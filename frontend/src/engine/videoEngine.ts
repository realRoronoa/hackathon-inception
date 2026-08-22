import type { MovementDirection, LookDirection } from '../types/simulation';

/**
 * Stream source representation (either a WebRTC MediaStream or a video stream URL)
 */
export type VideoStreamSource = MediaStream | string;

/**
 * Video Engine Interface for WebRTC / generative video streaming
 */
export interface IVideoEngine {
  /**
   * Initializes the video engine with an environment prompt and callback for when stream is ready
   */
  initialize(prompt: string, onStreamReady: (source: VideoStreamSource) => void): Promise<void> | void;

  /**
   * Sends movement command to the stream
   */
  sendMovement(direction: MovementDirection): void;

  /**
   * Sends look/camera command to the stream
   */
  sendLook(direction: LookDirection): void;

  /**
   * Updates prompt mid-stream without disconnecting
   */
  setPrompt?(prompt: string): Promise<void> | void;

  /**
   * Disconnects the active video stream session
   */
  disconnect(): void;
}

export type VideoEngine = IVideoEngine;
