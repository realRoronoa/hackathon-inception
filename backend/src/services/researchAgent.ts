import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

export interface SpatialResearchResult {
  reactor_prompt: string;
  hud_insights: string[];
  deep_research: string;
  base_image: string;
}

export const ANIME_CYBERPUNK_SUFFIX =
  ', high-end anime cyberpunk art style, bold outlines, flat cel-shaded color blocks, neon lighting in high-contrast pairs, dark urban environment, kinetic atmospheric anime aesthetic.';

/**
 * Generates an Anime Cyberpunk Base Initialization Image using Gemini Imagen 3
 * with a high-fidelity SVG/Canvas neural seed fallback.
 */
async function generateBaseImage(prompt: string, apiKey?: string): Promise<string> {
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      console.log('[IMAGEN] Attempting Imagen 3 generation for prompt:', prompt.slice(0, 60));
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
        {
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            outputOptions: {
              mimeType: 'image/jpeg',
            },
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      const b64 = response.data?.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        console.log('[IMAGEN] Successfully generated base image via Imagen 3 API');
        return `data:image/jpeg;base64,${b64}`;
      }
    } catch (err: any) {
      console.warn('[IMAGEN] Imagen 3 API unavailable, falling back to neural seed synthesizer:', err?.message);
    }
  }

  // High-fidelity Anime Cyberpunk SVG Neural Seed Fallback
  return generateProceduralAnimeCyberpunkSeed(prompt);
}

/**
 * Procedural Anime Cyberpunk Concept Seed Generator (16:9 SVG Data URI)
 */
function generateProceduralAnimeCyberpunkSeed(prompt: string): string {
  const norm = prompt.toLowerCase();

  let primaryColor = '#4FD8E8'; // Cyan
  let secondaryColor = '#F0A93F'; // Amber
  let accentColor = '#A78BFA'; // Purple
  let themeTitle = 'SPATIAL CYBERPUNK SEED';

  if (norm.includes('kitchen') || norm.includes('bommanahalli')) {
    primaryColor = '#4FD8E8';
    secondaryColor = '#06B6D4';
    accentColor = '#10B981';
    themeTitle = 'SMART KITCHEN HUB // BOMMANAHALLI';
  } else if (norm.includes('ev') || norm.includes('indiranagar') || norm.includes('car')) {
    primaryColor = '#F0A93F';
    secondaryColor = '#EF4444';
    accentColor = '#3B82F6';
    themeTitle = 'URBAN EV SHOWROOM // INDIRANAGAR';
  } else if (norm.includes('flagship') || norm.includes('opera') || norm.includes('ai')) {
    primaryColor = '#A78BFA';
    secondaryColor = '#EC4899';
    accentColor = '#4FD8E8';
    themeTitle = 'AI CONNECTED FLAGSHIP // OPERA HOUSE';
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576" width="1024" height="576">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050811" />
      <stop offset="50%" stop-color="#0B1220" />
      <stop offset="100%" stop-color="#141E33" />
    </linearGradient>
    <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#04060A" />
      <stop offset="100%" stop-color="#0D1119" />
    </linearGradient>
    <linearGradient id="neonBeam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="${secondaryColor}" stop-opacity="0.6" />
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.8" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Sky & Dark Urban Environment -->
  <rect width="1024" height="576" fill="url(#skyGrad)" />

  <!-- Cel-Shaded Anime City Silhouettes -->
  <path d="M 0 320 L 80 320 L 80 180 L 160 180 L 160 320 L 260 320 L 260 120 L 380 120 L 380 320 L 460 320 L 460 220 L 580 220 L 580 320 L 720 320 L 720 140 L 840 140 L 840 320 L 940 320 L 940 200 L 1024 200 L 1024 576 L 0 576 Z" fill="#070A12" stroke="#101827" stroke-width="3" />

  <!-- Neon Glowing Billboards & High-Contrast Anime Lighting -->
  <rect x="275" y="140" width="90" height="40" fill="${primaryColor}" opacity="0.85" filter="url(#glow)" rx="4" />
  <text x="320" y="165" fill="#04262B" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">INCEPTION</text>

  <rect x="735" y="160" width="90" height="50" fill="${secondaryColor}" opacity="0.85" filter="url(#glow)" rx="4" />
  <text x="780" y="190" fill="#04262B" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">SPATIAL</text>

  <!-- Reflective Ground Plane & Perspective Grid -->
  <polygon points="0,320 1024,320 1024,576 0,576" fill="url(#groundGrad)" />

  <!-- Perspective Vanishing Lines (Cel-Shaded Outlines) -->
  <line x1="512" y1="320" x2="0" y2="576" stroke="${primaryColor}" stroke-width="2" stroke-opacity="0.6" filter="url(#glow)" />
  <line x1="512" y1="320" x2="256" y2="576" stroke="${primaryColor}" stroke-width="1.5" stroke-opacity="0.4" />
  <line x1="512" y1="320" x2="512" y2="576" stroke="${secondaryColor}" stroke-width="2" stroke-opacity="0.7" filter="url(#glow)" />
  <line x1="512" y1="320" x2="768" y2="576" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.4" />
  <line x1="512" y1="320" x2="1024" y2="576" stroke="${accentColor}" stroke-width="2" stroke-opacity="0.6" filter="url(#glow)" />

  <!-- Horizontal Grid Lines -->
  <line x1="120" y1="360" x2="904" y2="360" stroke="#1F2937" stroke-width="1.5" />
  <line x1="60" y1="410" x2="964" y2="410" stroke="${primaryColor}" stroke-width="1.5" stroke-opacity="0.3" />
  <line x1="0" y1="480" x2="1024" y2="480" stroke="${secondaryColor}" stroke-width="2" stroke-opacity="0.4" />

  <!-- Center Holographic Target Anchor -->
  <circle cx="512" cy="320" r="16" fill="none" stroke="${primaryColor}" stroke-width="3" filter="url(#glow)" />
  <circle cx="512" cy="320" r="4" fill="${primaryColor}" />

  <!-- Top Cyberpunk HUD Header -->
  <rect x="24" y="24" width="360" height="36" fill="#090C11" stroke="${primaryColor}" stroke-width="1.5" rx="6" />
  <text x="40" y="47" fill="${primaryColor}" font-family="monospace" font-size="11" font-weight="bold" letter-spacing="2">INITIALIZATION SEED // ${themeTitle}</text>
</svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

/**
 * Gemini LLM Spatial Intelligence Adapter
 */
async function fetchGemini(query: string): Promise<SpatialResearchResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[RESEARCH AGENT] GEMINI_API_KEY not configured. Using deterministic synthesis fallback.');
    return generateFallbackResearch(query);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const systemPrompt = `You are an Elite Spatial Intelligence Architect.
The user is testing a real-world product launch, architecture, or spatial exploration scenario: "${query}".

Analyze the physical space, demographic flow, and structural layout.
Return a STRICT JSON object with these EXACT keys:
1. "reactor_prompt": A 1-2 sentence descriptive prompt specifying the spatial environment, lighting, architecture, and focal objects (without any art style tags).
2. "hud_insights": An array of 3 short, high-contrast, punchy telemetry bullet points for a tactical HUD (e.g. "Footfall Vector: 4.2m/s East", "Acoustic Reflection: 18dB Damped", "Thermal Dissipation: Optimal").
3. "deep_research": A 2-paragraph strategic analysis of this environment, spatial layout bottlenecks, and customer/operator experience recommendations.

Output valid JSON only.`;

  const result = await model.generateContent(systemPrompt);
  const text = result.response.text();
  const parsed = JSON.parse(text);

  const rawPrompt = (parsed.reactor_prompt || query).trim();
  const styledPrompt = `${rawPrompt}${ANIME_CYBERPUNK_SUFFIX}`;

  // Generate Base Initialization Image
  const baseImage = await generateBaseImage(styledPrompt, apiKey);

  return {
    reactor_prompt: rawPrompt,
    hud_insights: Array.isArray(parsed.hud_insights) && parsed.hud_insights.length >= 3
      ? parsed.hud_insights.slice(0, 3)
      : [
          `Spatial Vector: ${query.slice(0, 24)}...`,
          'Neural Sync: 99.4% Active',
          'Telemetry Stream: Nominal',
        ],
    deep_research: parsed.deep_research || `Comprehensive spatial analysis compiled for ${query}.`,
    base_image: baseImage,
  };
}

/**
 * Anthropic Claude Adapter (Stub for final presentation swap)
 */
async function fetchClaude(query: string): Promise<SpatialResearchResult> {
  console.log('[RESEARCH AGENT] Claude Adapter selected for query:', query);
  return fetchGemini(query);
}

/**
 * Fallback spatial research generator (zero API credits required)
 */
function generateFallbackResearch(query: string): SpatialResearchResult {
  const norm = query.toLowerCase();

  let spatialSubject = 'Urban architectural environment';
  let insight1 = 'Spatial Flow: 4.6 m/s';
  let insight2 = 'Acoustic Absorption: 22dB';
  let insight3 = 'Lighting: 4500K Ambient';

  if (norm.includes('kitchen') || norm.includes('bommanahalli')) {
    spatialSubject = 'Operational smart kitchen hub with polished steel counters and digital displays';
    insight1 = 'IoT Sensor Telemetry: 98.2%';
    insight2 = 'Thermal Index: 24°C Balanced';
    insight3 = 'Ergonomic Reach: 0.85m Radius';
  } else if (norm.includes('ev') || norm.includes('indiranagar') || norm.includes('car')) {
    spatialSubject = 'Minimalist futuristic electric vehicle showroom with glossy epoxy reflection floors';
    insight1 = 'Customer Footfall: 142 p/hr';
    insight2 = 'Glare Dispersion: Polarized 94%';
    insight3 = 'Power Grid: 350kW DC Rapid';
  } else if (norm.includes('flagship') || norm.includes('opera') || norm.includes('ai')) {
    spatialSubject = 'Multi-zone consumer technology lounge with interactive curved ambient screens';
    insight1 = 'Display Luminescence: 1200 nits';
    insight2 = 'Spatial Resonance: 48Hz Sub';
    insight3 = 'Engagement Zone: 12.4m Depth';
  } else {
    spatialSubject = `${query} with volumetric depth and reflective materials`;
    insight1 = `Sector Density: 88.4%`;
    insight2 = `Optical Clearance: Optimal`;
    insight3 = `Neural Alignment: 99.8%`;
  }

  const baseImage = generateProceduralAnimeCyberpunkSeed(query);

  return {
    reactor_prompt: spatialSubject,
    hud_insights: [insight1, insight2, insight3],
    deep_research: `Spatial intelligence analysis indicates optimal environmental ergonomics for "${query}". The blueprint emphasizes unobstructed pedestrian navigation, high-contrast focal points, and cohesive architectural flow. Recommended zoning allows seamless operational access while preserving immersive spatial aesthetics.`,
    base_image: baseImage,
  };
}

/**
 * Master Spatial Research Dispatcher (Adapter Pattern)
 */
export async function conductSpatialResearch(query: string): Promise<SpatialResearchResult> {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  let research: SpatialResearchResult;

  try {
    if (provider === 'claude') {
      research = await fetchClaude(query);
    } else {
      research = await fetchGemini(query);
    }
  } catch (error) {
    console.error('[RESEARCH AGENT] LLM generation error, utilizing deterministic fallback:', error);
    research = generateFallbackResearch(query);
  }

  // Forceful Anime Cyberpunk Injection
  if (!research.reactor_prompt.includes('anime cyberpunk')) {
    research.reactor_prompt = `${research.reactor_prompt}${ANIME_CYBERPUNK_SUFFIX}`;
  }

  return research;
}
