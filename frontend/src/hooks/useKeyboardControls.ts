import { useEffect, useRef } from 'react';
import type { MovementDirection, LookDirection } from '../types/simulation';

export type MovementChangeHandler = (direction: MovementDirection) => void;
export type LookChangeHandler = (direction: LookDirection) => void;

export interface SimulationControlsOptions {
  onMovementChange?: MovementChangeHandler;
  onLookChange?: LookChangeHandler;
  enabled?: boolean;
}

/**
 * Unified Keyboard (WASD) & Mouse Look Controller Hook
 * 
 * - Full WASD keyboard navigation
 * - Real-time Mouse Look & drag-to-aim camera steering (FPS / Cockpit style)
 * - Zero React re-renders via requestAnimationFrame tick loop
 */
export function useKeyboardControls(
  onMovementChangeOrOptions?: MovementChangeHandler | SimulationControlsOptions,
  onLookChangeArg?: LookChangeHandler
) {
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

  const onMovementChangeRef = useRef<MovementChangeHandler | undefined>(onMovementChange);
  const onLookChangeRef = useRef<LookChangeHandler | undefined>(onLookChange);

  useEffect(() => {
    onMovementChangeRef.current = onMovementChange;
  }, [onMovementChange]);

  useEffect(() => {
    onLookChangeRef.current = onLookChange;
  }, [onLookChange]);

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

  // Mouse displacement buffer & timeout
  const mouseDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const mouseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastMovementRef = useRef<MovementDirection>('idle');
  const lastLookRef = useRef<LookDirection>('idle');

  useEffect(() => {
    if (!enabled) {
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

    // 1. Keyboard KeyDown & KeyUp
    const handleKeyDown = (e: KeyboardEvent) => {
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

    // 2. Mouse Move & Pointer Drag (FPS / Cockpit Game Steering)
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'BUTTON')) {
        return;
      }

      const movementX = e.movementX || (e as any).mozMovementX || 0;
      const movementY = e.movementY || (e as any).mozMovementY || 0;

      mouseDeltaRef.current.dx = movementX;
      mouseDeltaRef.current.dy = movementY;

      // Clear previous timeout and set reset
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }

      mouseTimeoutRef.current = setTimeout(() => {
        mouseDeltaRef.current.dx = 0;
        mouseDeltaRef.current.dy = 0;
      }, 140);
    };

    const handleBlur = () => {
      const keys = keysPressedRef.current;
      keys.KeyW = false;
      keys.KeyA = false;
      keys.KeyS = false;
      keys.KeyD = false;
      keys.ArrowUp = false;
      keys.ArrowDown = false;
      keys.ArrowLeft = false;
      keys.ArrowRight = false;
      mouseDeltaRef.current.dx = 0;
      mouseDeltaRef.current.dy = 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('blur', handleBlur);

    let animationFrameId: number;

    const tick = () => {
      const keys = keysPressedRef.current;
      const mouse = mouseDeltaRef.current;

      // 1. Calculate Movement Direction
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

      if (currentMovement !== lastMovementRef.current) {
        lastMovementRef.current = currentMovement;
        onMovementChangeRef.current?.(currentMovement);
      }

      // 2. Calculate Look Direction (Combined Keyboard + Mouse)
      let currentLook: LookDirection = 'idle';

      // Mouse has steering priority if active
      if (mouse.dx < -3) {
        currentLook = 'left';
      } else if (mouse.dx > 3) {
        currentLook = 'right';
      } else if (mouse.dy < -3) {
        currentLook = 'up';
      } else if (mouse.dy > 3) {
        currentLook = 'down';
      } else if (keys.ArrowUp && !keys.ArrowDown) {
        currentLook = 'up';
      } else if (keys.ArrowDown && !keys.ArrowUp) {
        currentLook = 'down';
      } else if (keys.ArrowLeft && !keys.ArrowRight) {
        currentLook = 'left';
      } else if (keys.ArrowRight && !keys.ArrowLeft) {
        currentLook = 'right';
      }

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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('blur', handleBlur);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);

  return {
    getLastMovement: () => lastMovementRef.current,
    getLastLook: () => lastLookRef.current,
  };
}
