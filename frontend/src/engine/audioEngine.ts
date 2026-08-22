/**
 * Audio Engine Interface for ambient soundscapes, movement sound effects, and narration
 */
export interface IAudioEngine {
  /**
   * Starts ambient environmental noise/soundtrack
   */
  startAmbient(): void;

  /**
   * Updates whether the player/camera is currently moving (for footsteps, engine sounds, etc.)
   */
  setMovementState(isMoving: boolean): void;

  /**
   * Plays text-to-speech audio narration for environmental events or guides
   */
  playNarration(text: string, onComplete?: () => void): Promise<void> | void;

  /**
   * Toggles master audio mute state
   */
  setMuted(isMuted: boolean): void;

  /**
   * Stops all playing and queued audio
   */
  stopAll(): void;
}

export type AudioEngine = IAudioEngine;
