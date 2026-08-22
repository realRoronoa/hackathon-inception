/**
 * Application lifecycle states
 */
export enum AppState {
  LANDING = 'landing',
  LOADING = 'loading',
  ACTIVE = 'active',
  ENDED = 'ended',
}

/**
 * Movement direction commands for WASD / keyboard navigation
 */
export type MovementDirection = 'forward' | 'backward' | 'left' | 'right' | 'idle';

/**
 * Camera / look direction commands
 */
export type LookDirection = 'up' | 'down' | 'left' | 'right' | 'idle';
