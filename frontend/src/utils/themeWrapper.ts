/**
 * Master Style Modifier for Reactor Generative World Models
 * Ensures 100% stylistic and atmospheric consistency across all streams.
 */
export const MASTER_STYLE_SUFFIX =
  'cinematic exploration aesthetic, high-end sci-fi atmosphere, dramatic volumetric lighting, hyper-detailed textures, cohesive color grading, photorealistic 8k';

/**
 * Wraps user and preset prompts with the master style modifiers
 *
 * @param userPrompt - Raw user prompt or sector title
 * @returns Styled cinematic prompt ready for neural diffusion
 */
export function applyMasterTheme(userPrompt: string): string {
  const trimmed = (userPrompt || '').trim();

  if (!trimmed) {
    return `An immersive atmospheric world, ${MASTER_STYLE_SUFFIX}`;
  }

  // Avoid duplicate appending if style is already present
  if (trimmed.toLowerCase().includes('cinematic exploration aesthetic')) {
    return trimmed;
  }

  return `${trimmed}, ${MASTER_STYLE_SUFFIX}`;
}
