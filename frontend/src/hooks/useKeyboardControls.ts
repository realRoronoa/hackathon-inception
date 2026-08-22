import { useEffect, useRef } from 'react';
import type { MovementDirection, LookDirection } from '../types/simulation';

export type MovementChangeHandler = (direction: MovementDirection) => void;
export type LookChangeHandler = (direction: LookDirection) => void;

export interface KeyboardControlsOptions {
  onMovementChange?: MovementChangeHandler;
  onLookChange?: LookChangeHandler;
  enabled?: boolean;
}

/**
 * High-Performance WASD & Arrow Key Controller Hook
 * 
 * Uses refs and requestAnimationFrame to avoid triggering unnecessary React re-renders.
 * Only invokes callbacks when the resolved direction changes state.
 */
export function useKeyboardControls(
  onMovementChangeOrOptions?: MovementChangeHandler | KeyboardControlsOptions,
  onLookChangeArg?: LookChangeHandler
) {
  // Normalize arguments whether passed as individual callbacks or an options object
  const isOptionsObj =
    typeof onMovementChangeOrOptions === 'object' &&
    onMovementChangeOrOptions !== null;

  const onMovementChange = isOptionsObj
    ? onMovementChangeOrOptions.onMovementChange
    : onMovementChangeOrOptions;

  const onLookChange = isOptionsObj
    ? onMovementChangeOrOptions.onLookChange
    : onLookChangeArg;

  const enabled = isOptionsObj && onMovementChangeOrOptions.enabled !== undefined
    ? onMovementChangeOrOptions.enabled
    : true;

  // Store latest callbacks in refs to avoid re-binding event listeners
  const onMovementChangeRef = useRef<MovementChangeHandler | undefined>(onMovementChange);
  const onLookChangeRef = useRef<LookChangeHandler | undefined>(onLookChange);

  useEffect(() => {
    onMovementChangeRef.current = onMovementChange;
  }, [onMovementChange]);

  useEffect(() => {
    onLookChangeRef.current = onLookChange;
  }, [onLookChange]);

  // Key state map stored in ref for zero re-renders
  const keysPressedRef = useRef<{
    KeyW: boolean;
    KeyA: boolean;
    KeyS: boolean;
    KeyD: boolean;
    ArrowUp: boolean;
    ArrowDown: boolean;
    ArrowLeft: boolean;
    ArrowRight: boolean;
  }>({
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  // Track previous states to ONLY fire callbacks on actual state changes
  const lastMovementRef = useRef<MovementDirection>('idle');
  const lastLookRef = useRef<LookDirection>('idle');

  useEffect(() => {
    if (!enabled) {
      // Reset to idle if disabled
      if (lastMovementRef.current !== 'idle') {
        lastMovementRef.current = 'idle';
        onMovementChangeRef.current?.('idle');
      }
      if (lastLookRef.current !== 'idle') {
        lastLookRef.current = 'idle';
        onLookChangeRef.current?.('idle');
      }
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in form inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;
      const keys = keysPressedRef.current;

      if (code === 'KeyW' || key === 'w') keys.KeyW = true;
      if (code === 'KeyA' || key === 'a') keys.KeyA = true;
      if (code === 'KeyS' || key === 's') keys.KeyS = true;
      if (code === 'KeyD' || key === 'd') keys.KeyD = true;

      if (code === 'ArrowUp' || key === 'arrowup') keys.ArrowUp = true;
      if (code === 'ArrowDown' || key === 'arrowdown') keys.ArrowDown = true;
      if (code === 'ArrowLeft' || key === 'arrowleft') keys.ArrowLeft = true;
      if (code === 'ArrowRight' || key === 'arrowright') keys.ArrowRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      const keys = keysPressedRef.current;

      if (code === 'KeyW' || key === 'w') keys.KeyW = false;
      if (code === 'KeyA' || key === 'a') keys.KeyA = false;
      if (code === 'KeyS' || key === 's') keys.KeyS = false;
      if (code === 'KeyD' || key === 'd') keys.KeyD = false;

      if (code === 'ArrowUp' || key === 'arrowup') keys.ArrowUp = false;
      if (code === 'ArrowDown' || key === 'arrowdown') keys.ArrowDown = false;
      if (code === 'ArrowLeft' || key === 'arrowleft') keys.ArrowLeft = false;
      if (code === 'ArrowRight' || key === 'arrowright') keys.ArrowRight = false;
    };

    const handleBlur = () => {
      // Reset all keys when window loses focus
      const keys = keysPressedRef.current;
      keys.KeyW = false;
      keys.KeyA = false;
      keys.KeyS = false;
      keys.KeyD = false;
      keys.ArrowUp = false;
      keys.ArrowDown = false;
      keys.ArrowLeft = false;
      keys.ArrowRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    let animationFrameId: number;

    const tick = () => {
      const keys = keysPressedRef.current;

      // 1. Calculate Priority Movement Direction
      let currentMovement: MovementDirection = 'idle';
      if (keys.KeyW && !keys.KeyS) {
        currentMovement = 'forward';
      } else if (keys.KeyS && !keys.KeyW) {
        currentMovement = 'backward';
      } else if (keys.KeyA && !keys.KeyD) {
        currentMovement = 'left';
      } else if (keys.KeyD && !keys.KeyA) {
        currentMovement = 'right';
      }

      // Fire movement callback ONLY when direction changes
      if (currentMovement !== lastMovementRef.current) {
        lastMovementRef.current = currentMovement;
        onMovementChangeRef.current?.(currentMovement);
      }

      // 2. Calculate Priority Look Direction
      let currentLook: LookDirection = 'idle';
      if (keys.ArrowUp && !keys.ArrowDown) {
        currentLook = 'up';
      } else if (keys.ArrowDown && !keys.ArrowUp) {
        currentLook = 'down';
      } else if (keys.ArrowLeft && !keys.ArrowRight) {
        currentLook = 'left';
      } else if (keys.ArrowRight && !keys.ArrowLeft) {
        currentLook = 'right';
      }

      // Fire look callback ONLY when direction changes
      if (currentLook !== lastLookRef.current) {
        lastLookRef.current = currentLook;
        onLookChangeRef.current?.(currentLook);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);

  return {
    getLastMovement: () => lastMovementRef.current,
    getLastLook: () => lastLookRef.current,
  };
}
