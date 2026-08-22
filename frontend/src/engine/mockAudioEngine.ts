import type { IAudioEngine } from './audioEngine';

// Reliable royalty-free ambient atmospheric drone sound
const AMBIENT_SOUND_URL =
  'https://actions.google.com/sounds/v1/ambiences/ambient_hum.ogg';

export class MockAudioEngine implements IAudioEngine {
  private ambientAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private movementGain: GainNode | null = null;
  private movementOscillator: OscillatorNode | null = null;
  private isMovementOscillatorStarted: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    // Ambient Audio setup
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      this.ambientAudio = new Audio(AMBIENT_SOUND_URL);
      this.ambientAudio.loop = true;
      this.ambientAudio.volume = 0.25;
    }
  }

  /**
   * Initializes the Web Audio API context and movement oscillator graph lazily
   */
  private ensureAudioContext(): void {
    if (typeof window === 'undefined') return;

    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.movementGain = this.audioContext.createGain();
      this.movementGain.gain.setValueAtTime(0, this.audioContext.currentTime);

      this.movementOscillator = this.audioContext.createOscillator();
      this.movementOscillator.type = 'triangle';
      this.movementOscillator.frequency.setValueAtTime(75, this.audioContext.currentTime); // Low rumble frequency

      this.movementOscillator.connect(this.movementGain);
      this.movementGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch((err) => {
        console.warn('[MOCK AUDIO] AudioContext resume failed:', err);
      });
    }

    if (this.movementOscillator && !this.isMovementOscillatorStarted) {
      this.movementOscillator.start();
      this.isMovementOscillatorStarted = true;
    }
  }

  /**
   * Plays text-to-speech narration using browser's native SpeechSynthesis API
   */
  public playNarration(text: string, onComplete?: () => void): Promise<void> {
    return new Promise((resolve) => {
      if (this.isMuted) {
        onComplete?.();
        resolve();
        return;
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('[MOCK AUDIO] SpeechSynthesis API not supported in this browser.');
        onComplete?.();
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Stop any overlapping speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        console.log('[MOCK AUDIO] Narration finished:', text);
        onComplete?.();
        resolve();
      };

      utterance.onerror = (event) => {
        console.warn('[MOCK AUDIO] Narration error:', event);
        onComplete?.();
        resolve();
      };

      console.log('[MOCK AUDIO] Speaking narration:', text);
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Starts looping ambient sound
   */
  public startAmbient(): void {
    if (!this.ambientAudio) return;

    if (this.isMuted) {
      this.ambientAudio.muted = true;
    }

    this.ambientAudio.play().catch((err) => {
      console.warn('[MOCK AUDIO] Ambient playback blocked by browser autoplay policy until user interaction:', err);
    });
    console.log('[MOCK AUDIO] Ambient audio started.');
  }

  /**
   * Updates movement state by ramping low-frequency oscillator volume
   */
  public setMovementState(isMoving: boolean): void {
    if (this.isMuted) return;

    this.ensureAudioContext();

    if (!this.audioContext || !this.movementGain) return;

    const now = this.audioContext.currentTime;
    if (isMoving) {
      // Smoothly ramp volume up to 0.1
      this.movementGain.gain.cancelScheduledValues(now);
      this.movementGain.gain.setTargetAtTime(0.1, now, 0.08);
      console.log('[MOCK AUDIO] Movement audio active (ramping up)');
    } else {
      // Smoothly ramp volume back to 0
      this.movementGain.gain.cancelScheduledValues(now);
      this.movementGain.gain.setTargetAtTime(0, now, 0.08);
      console.log('[MOCK AUDIO] Movement audio inactive (ramped down)');
    }
  }

  /**
   * Toggles mute on all audio channels
   */
  public setMuted(isMuted: boolean): void {
    this.isMuted = isMuted;

    if (this.ambientAudio) {
      this.ambientAudio.muted = isMuted;
    }

    if (this.audioContext && this.movementGain) {
      const now = this.audioContext.currentTime;
      this.movementGain.gain.cancelScheduledValues(now);
      this.movementGain.gain.setValueAtTime(isMuted ? 0 : 0.05, now);
    }

    if (isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    console.log(`[MOCK AUDIO] Audio muted state -> ${isMuted}`);
  }

  /**
   * Cancels active speech, pauses ambient track, and suspends audio context
   */
  public stopAll(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (this.ambientAudio) {
      this.ambientAudio.pause();
      this.ambientAudio.currentTime = 0;
    }

    if (this.audioContext && this.movementGain) {
      const now = this.audioContext.currentTime;
      this.movementGain.gain.cancelScheduledValues(now);
      this.movementGain.gain.setValueAtTime(0, now);

      if (this.audioContext.state !== 'closed') {
        this.audioContext.suspend().catch(() => {});
      }
    }

    console.log('[MOCK AUDIO] All audio stopped and suspended.');
  }
}

export default MockAudioEngine;
