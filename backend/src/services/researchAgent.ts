import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SpatialResearchResult {
  reactor_prompt: string;
  hud_insights: string[];
  deep_research: string;
}

export const ANIME_CYBERPUNK_SUFFIX =
  ', high-end anime cyberpunk art style, bold outlines, flat cel-shaded color blocks, neon lighting in high-contrast pairs, dark urban environment, kinetic atmospheric anime aesthetic.';

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

  return {
    reactor_prompt: (parsed.reactor_prompt || query).trim(),
    hud_insights: Array.isArray(parsed.hud_insights) && parsed.hud_insights.length >= 3
      ? parsed.hud_insights.slice(0, 3)
      : [
          `Spatial Vector: ${query.slice(0, 24)}...`,
          'Neural Sync: 99.4% Active',
          'Telemetry Stream: Nominal',
        ],
    deep_research: parsed.deep_research || `Comprehensive spatial analysis compiled for ${query}.`,
  };
}

/**
 * Anthropic Claude Adapter (Stub for final presentation swap)
 */
async function fetchClaude(query: string): Promise<SpatialResearchResult> {
  console.log('[RESEARCH AGENT] Claude Adapter selected for query:', query);
  // Swap with @anthropic-ai/sdk when Claude API key is provided
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

  return {
    reactor_prompt: spatialSubject,
    hud_insights: [insight1, insight2, insight3],
    deep_research: `Spatial intelligence analysis indicates optimal environmental ergonomics for "${query}". The blueprint emphasizes unobstructed pedestrian navigation, high-contrast focal points, and cohesive architectural flow. Recommended zoning allows seamless operational access while preserving immersive spatial aesthetics.`,
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
