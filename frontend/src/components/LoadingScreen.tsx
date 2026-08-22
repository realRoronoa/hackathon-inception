import React from 'react';

interface LoadingScreenProps {
  prompt?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ prompt }) => {
  return (
    <div className="relative w-full h-full min-h-screen bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Background vignette & dark overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.8)_0%,rgba(0,0,0,1)_100%)] pointer-events-none" />

      {/* Radar sweep / Pulsing Ring Visual */}
      <div className="relative flex items-center justify-center mb-8">
        {/* Outer expanding pulsing wave */}
        <div className="absolute w-36 h-36 rounded-full border border-zinc-700/40 animate-ping opacity-30" />
        
        {/* Secondary pulse ring */}
        <div className="absolute w-28 h-28 rounded-full border border-zinc-600/30 animate-pulse duration-1000" />
        
        {/* Radar Center Ring */}
        <div className="relative w-20 h-20 rounded-full border border-zinc-600/80 bg-zinc-950/80 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          {/* Rotating radar line / sweep */}
          <div className="absolute inset-0 rounded-full border-t border-r border-zinc-200/90 animate-spin" />
          
          {/* Center glowing beacon dot */}
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-100 shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse" />
        </div>
      </div>

      {/* Pulsing Status Text */}
      <div className="relative z-10 text-center space-y-2">
        <h2 className="text-base md:text-lg font-mono tracking-widest text-zinc-300 uppercase flex items-center justify-center gap-2">
          <span>Collapsing World Probabilities...</span>
          <span className="inline-block w-1.5 h-4 bg-zinc-400 animate-[pulse_0.8s_infinite]" />
        </h2>

        {prompt && (
          <p className="text-xs md:text-sm text-zinc-500 font-mono italic max-w-md mx-auto truncate px-4">
            &ldquo;{prompt}&rdquo;
          </p>
        )}
      </div>

      {/* Bottom loading indicator status */}
      <div className="absolute bottom-10 text-center">
        <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-600">
          Synthesizing Stream Latent Space • 2.5s Latency
        </span>
      </div>
    </div>
  );
};
export default LoadingScreen;
