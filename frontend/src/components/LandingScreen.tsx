import React, { useState } from 'react';
import { Mic, ArrowRight, Sparkles } from 'lucide-react';

interface LandingScreenProps {
  onStartSimulation: (prompt: string) => void;
}

const PRESET_WORLDS = [
  'Abandoned Orbital Station',
  'Victorian Manor',
  'Cyberpunk Alley',
];

export const LandingScreen: React.FC<LandingScreenProps> = ({ onStartSimulation }) => {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (trimmed) {
      onStartSimulation(trimmed);
    }
  };

  const handleSelectPreset = (preset: string) => {
    setPrompt(preset);
  };

  const toggleMic = () => {
    setIsListening((prev) => !prev);
    // Voice dictation simulation / integration placeholder (Willow)
    if (!isListening && !prompt) {
      setPrompt('Neon-lit subterranean biosphere');
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-black flex flex-col items-center justify-center px-4 overflow-hidden select-none">
      {/* Subtle background ambient radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.5)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center space-y-8">
        
        {/* Header Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-mono tracking-widest uppercase mb-2 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            <span>Generative Interactive Environment</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extralight tracking-tight text-zinc-100 font-sans">
            Inception Engine
          </h1>
          <p className="text-sm md:text-base text-zinc-400 font-light max-w-md mx-auto">
            Step into infinite real-time generative worlds driven by your movement.
          </p>
        </div>

        {/* Input Form Box */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative group w-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 rounded-2xl blur-sm opacity-25 group-focus-within:opacity-75 transition duration-500" />
            
            <div className="relative flex items-center bg-zinc-950/90 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-2 transition-colors duration-300 focus-within:border-zinc-500">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the world you want to step into..."
                className="w-full bg-transparent px-4 py-3.5 text-base md:text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none font-light"
                autoFocus
              />

              {/* Mic Icon Button (Willow dictation) */}
              <button
                type="button"
                onClick={toggleMic}
                title={isListening ? "Listening (Willow)..." : "Voice Dictation (Willow)"}
                className={`p-2.5 rounded-xl transition-all duration-200 mr-2 flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Sleek Primary Enter Button */}
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="flex items-center justify-center px-4 py-3 rounded-xl bg-zinc-100 text-zinc-950 font-medium text-sm transition-all duration-200 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-zinc-500 font-mono mr-1">Presets:</span>
            {PRESET_WORLDS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wide border border-zinc-800/90 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all duration-200 backdrop-blur-sm"
              >
                {preset}
              </button>
            ))}
          </div>
        </form>

        {/* Footer Hint */}
        <div className="pt-8 text-xs text-zinc-600 font-mono">
          <span>WASD / Arrow Keys Controller enabled</span>
        </div>
      </div>
    </div>
  );
};
export default LandingScreen;
