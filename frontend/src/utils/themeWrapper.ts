/**
 * Master Style Modifier and Prompt Expansion Engine for Inception World Models
 */
export const MASTER_STYLE_SUFFIX =
  'cinematic exploration aesthetic, high-end sci-fi atmosphere, dramatic volumetric lighting, hyper-detailed textures, cohesive color grading, photorealistic 8k';

/**
 * Wraps user and preset prompts with master style modifiers
 */
export function applyMasterTheme(userPrompt: string): string {
  const trimmed = (userPrompt || '').trim();

  if (!trimmed) {
    return `An immersive atmospheric world, ${MASTER_STYLE_SUFFIX}`;
  }

  if (trimmed.toLowerCase().includes('cinematic exploration aesthetic')) {
    return trimmed;
  }

  return `${trimmed}, ${MASTER_STYLE_SUFFIX}`;
}

/**
 * Expands short phrases into rich, cinematic generative world descriptions
 */
export function expandCinematicPrompt(shortInput: string): string {
  const input = (shortInput || '').trim().toLowerCase();

  const EXPANSIONS: { keywords: string[]; prompt: string }[] = [
    {
      keywords: ['cyber', 'neon', 'city', 'tokyo', 'alley'],
      prompt:
        'Rain-drenched Cyberpunk metropolis at midnight with towering holographic advertisements, steam venting from neon-lit alleyways, and flying retro-futuristic vehicles drifting through the smog',
    },
    {
      keywords: ['space', 'station', 'orbit', 'planet', 'star', 'cosmos'],
      prompt:
        'Derelict deep-space orbital station drifting near the rings of a gas giant, emergency red strobe lights casting long shadows across shattered observation decks',
    },
    {
      keywords: ['manor', 'gothic', 'castle', 'estate', 'haunt', 'forest'],
      prompt:
        'Atmospheric Victorian gothic manor wrapped in dense thunderstorm fog, illuminated by torchlight reflections on damp cobblestones and ancient stained glass',
    },
    {
      keywords: ['ocean', 'water', 'underwater', 'sea', 'atlantis'],
      prompt:
        'Bioluminescent underwater research sanctuary nestled in ancient sunken ruins, deep sea flora glowing cyan in abyssal marine currents',
    },
    {
      keywords: ['mars', 'desert', 'dune', 'sand', 'alien', 'wasteland'],
      prompt:
        'Crimson desert alien outpost engulfed in an electromagnetic dust storm, colossal solar harvesters humming beneath dual amber suns',
    },
  ];

  for (const item of EXPANSIONS) {
    if (item.keywords.some((kw) => input.includes(kw))) {
      return item.prompt;
    }
  }

  // If no specific keyword matched, creatively augment whatever the user typed
  if (input.length > 0) {
    return `${shortInput.trim()} featuring expansive panoramic scale, intricate architectural detail, volumetric mist, and dramatic cinematic lighting`;
  }

  // If completely empty, pick a breathtaking random sci-fi scene
  const RANDOM_SEEDS = [
    'Sub-zero Antarctic research citadel buried beneath glacial ice caves with glowing thermal power conduits',
    'Floating monolith temples above cloud oceans with ancient anti-gravity rings and golden dawn light',
    'Volcanic cyber-forge built into a magma crater with pulsing industrial heat exchangers and glowing embers',
  ];
  return RANDOM_SEEDS[Math.floor(Math.random() * RANDOM_SEEDS.length)];
}
