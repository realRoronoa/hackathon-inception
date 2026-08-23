/**
 * Application lifecycle states
 */
export enum AppState {
  LANDING = 'landing',
  STUDIO = 'studio',
  ACTIVE = 'active',
}

/**
 * Movement direction commands for WASD / keyboard navigation
 */
export type MovementDirection = 'forward' | 'backward' | 'left' | 'right' | 'idle';

/**
 * Camera / look direction commands
 */
export type LookDirection = 'up' | 'down' | 'left' | 'right' | 'idle';

/**
 * LLM Spatial Intelligence Research Payload
 */
export interface SpatialResearchPayload {
  reactor_prompt: string;
  hud_insights: string[];
  deep_research: string;
}
