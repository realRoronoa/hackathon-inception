import type { IAudioEngine } from './audioEngine';

const BACKEND_TTS_URL = 'http://localhost:5000/api/tts';

export class FishAudioEngine implements IAudioEngine {
  private currentNarrationAudio: HTMLAudioElement | null = null;
  private narrationBlobUrl: string | null = null;
  private audioContext: AudioContext | null = null;
  
  // Ambient synthesizers
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private isAmbientStarted: boolean = false;

  // Movement synthesizers
  private movementGain: GainNode | null = null;
  private movementOscillator: OscillatorNode | null = null;
  private isMovementOscillatorStarted: boolean = false;

  private isMuted: boolean = false;

  /**
   * Initializes the Web Audio API context and audio nodes graph lazily
   */
  private ensureAudioContext(): void {
    if (typeof window === 'undefined') return;

    if (!this.audioContext) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();

      // --- Ambient Synth Graph ---
      this.ambientGain = this.audioContext.createGain();
      this.ambientGain.gain.setValueAtTime(0, this.audioContext.currentTime);

      const ambientFilter = this.audioContext.createBiquadFilter();
      ambientFilter.type = 'lowpass';
      ambientFilter.frequency.setValueAtTime(200, this.audioContext.currentTime);

      this.ambientOsc1 = this.audioContext.createOscillator();
      this.ambientOsc1.type = 'sine';
      this.ambientOsc1.frequency.setValueAtTime(55, this.audioContext.currentTime); // Deep A1 note

      this.ambientOsc2 = this.audioContext.createOscillator();
      this.ambientOsc2.type = 'triangle';
      this.ambientOsc2.frequency.setValueAtTime(110, this.audioContext.currentTime); // A2 harmonic

      this.ambientOsc1.connect(ambientFilter);
      this.ambientOsc2.connect(ambientFilter);
      ambientFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.audioContext.destination);

      // --- Movement Rumble Synth Graph ---
      this.movementGain = this.audioContext.createGain();
      this.movementGain.gain.setValueAtTime(0, this.audioContext.currentTime);

      this.movementOscillator = this.audioContext.createOscillator();
      this.movementOscillator.type = 'triangle';
      this.movementOscillator.frequency.setValueAtTime(75, this.audioContext.currentTime); // Low rumble

      this.movementOscillator.connect(this.movementGain);
      this.movementGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch((err) => {
        console.warn('[FISH AUDIO] AudioContext resume failed:', err);
      });
    }

    if (this.ambientOsc1 && this.ambientOsc2 && !this.isAmbientStarted) {
      this.ambientOsc1.start();
      this.ambientOsc2.start();
      this.isAmbientStarted = true;
    }

    if (this.movementOscillator && !this.isMovementOscillatorStarted) {
      this.movementOscillator.start();
      this.isMovementOscillatorStarted = true;
    }
  }

  /**
   * Plays speech narration using backend Fish Audio TTS or falls back to Web Speech API
   */
  public async playNarration(text: string, onComplete?: () => void): Promise<void> {
    return new Promise(async (resolve) => {
      if (this.isMuted) {
        onComplete?.();
        resolve();
        return;
      }

      // Helper for browser speech synthesis fallback
      const fallbackToSpeechSynthesis = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          console.log('[FISH AUDIO] Using browser SpeechSynthesis fallback...');
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.onend = () => {
            onComplete?.();
            resolve();
          };
          utterance.onerror = () => {
            onComplete?.();
            resolve();
          };
          window.speechSynthesis.speak(utterance);
        } else {
          onComplete?.();
          resolve();
        }
      };

      try {
        console.log(`[FISH AUDIO] Requesting TTS narration: "${text}"...`);

        // Stop any currently playing narration audio
        this.stopNarration();

        const response = await fetch(BACKEND_TTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          console.warn('[FISH AUDIO] TTS backend proxy 401/unauthorized (Missing or invalid Fish Audio key). Falling back to SpeechSynthesis.');
          fallbackToSpeechSynthesis();
          return;
        }

        const blob = await response.blob();
        this.narrationBlobUrl = URL.createObjectURL(blob);

        const audio = new Audio(this.narrationBlobUrl);
        audio.muted = this.isMuted;
        this.currentNarrationAudio = audio;

        const cleanupAndFinish = () => {
          if (this.narrationBlobUrl) {
            URL.revokeObjectURL(this.narrationBlobUrl);
            this.narrationBlobUrl = null;
          }
          this.currentNarrationAudio = null;
          console.log('[FISH AUDIO] TTS narration completed.');
          onComplete?.();
          resolve();
        };

        audio.addEventListener('ended', cleanupAndFinish, { once: true });
        audio.addEventListener('error', (err) => {
          console.warn('[FISH AUDIO] Narration audio playback error, falling back:', err);
          cleanupAndFinish();
          fallbackToSpeechSynthesis();
        }, { once: true });

        await audio.play();
        console.log('[FISH AUDIO] Playing TTS narration audio stream...');
      } catch (error) {
        console.warn('[FISH AUDIO] Error during TTS fetch, falling back:', error);
        fallbackToSpeechSynthesis();
      }
    });
  }

  /**
   * Stops any ongoing narration audio
   */
  private stopNarration(): void {
    if (this.currentNarrationAudio) {
      this.currentNarrationAudio.pause();
      this.currentNarrationAudio.currentTime = 0;
      this.currentNarrationAudio = null;
    }
    if (this.narrationBlobUrl) {
      URL.revokeObjectURL(this.narrationBlobUrl);
      this.narrationBlobUrl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Starts synthesized ambient soundscape
   */
  public startAmbient(): void {
    this.ensureAudioContext();

    if (!this.audioContext || !this.ambientGain || this.isMuted) return;

    const now = this.audioContext.currentTime;
    this.ambientGain.gain.cancelScheduledValues(now);
    this.ambientGain.gain.setTargetAtTime(0.04, now, 0.5); // Smooth ambient drone fade in
    console.log('[FISH AUDIO] Ambient audio active.');
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
      this.movementGain.gain.cancelScheduledValues(now);
      this.movementGain.gain.setTargetAtTime(0.1, now, 0.08);
    } else {
      this.movementGain.gain.cancelScheduledValues(now);
      this.movementGain.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  /**
   * Toggles mute state on ambient, movement, and narration channels
   */
  public setMuted(isMuted: boolean): void {
    this.isMuted = isMuted;

    if (this.audioContext) {
      const now = this.audioContext.currentTime;
      if (this.ambientGain) {
        this.ambientGain.gain.cancelScheduledValues(now);
        this.ambientGain.gain.setValueAtTime(isMuted ? 0 : 0.04, now);
      }
      if (this.movementGain) {
        this.movementGain.gain.cancelScheduledValues(now);
        this.movementGain.gain.setValueAtTime(0, now);
      }
    }

    if (this.currentNarrationAudio) {
      this.currentNarrationAudio.muted = isMuted;
    }

    if (isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    console.log(`[FISH AUDIO] Audio muted state -> ${isMuted}`);
  }

  /**
   * Cancels active narration, pauses ambient track, and suspends audio context
   */
  public stopAll(): void {
    this.stopNarration();

    if (this.audioContext) {
      const now = this.audioContext.currentTime;
      if (this.ambientGain) {
        this.ambientGain.gain.cancelScheduledValues(now);
        this.ambientGain.gain.setValueAtTime(0, now);
      }
      if (this.movementGain) {
        this.movementGain.gain.cancelScheduledValues(now);
        this.movementGain.gain.setValueAtTime(0, now);
      }

      if (this.audioContext.state !== 'closed') {
        this.audioContext.suspend().catch(() => {});
      }
    }

    console.log('[FISH AUDIO] All audio stopped and suspended.');
  }
}

export default FishAudioEngine;
