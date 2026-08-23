import React from 'react';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onLaunchStudio: () => void;
  isLiveMode: boolean;
  onToggleLiveMode: (live: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchStudio,
  isLiveMode,
  onToggleLiveMode,
}) => {
  return (
    <div
      className="relative w-full h-full min-h-screen overflow-x-hidden overflow-y-auto select-none flex flex-col justify-between"
      style={{
        backgroundColor: '#07090B',
        color: '#F4F4F0',
        fontFamily: "'Inter', sans-serif",
        backgroundImage: `
          radial-gradient(circle at 50% 30%, rgba(79, 216, 232, 0.05) 0%, transparent 55%),
          radial-gradient(circle at center, rgba(150, 170, 200, 0.12) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 64px 64px',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* 1. TOP BAR */}
      <header
        className="w-full flex items-center justify-between px-6 sm:px-10 py-5 border-b"
        style={{
          borderColor: 'rgba(150, 170, 200, 0.12)',
          background: 'linear-gradient(180deg, rgba(7,9,11,0.94), rgba(7,9,11,0.6))',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 flex items-center justify-center text-sm font-bold border"
            style={{
              borderColor: '#4FD8E8',
              color: '#4FD8E8',
              backgroundColor: 'rgba(79,216,232,0.08)',
            }}
          >
            ◆
          </div>
          <div
            className="text-[13px] tracking-wider"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <b className="font-semibold text-[#F4F4F0]">INCEPTION</b>{' '}
            <span className="text-[#98A29A]">/ SPATIAL</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <button
          type="button"
          onClick={() => onToggleLiveMode(!isLiveMode)}
          className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] tracking-wider transition-all duration-200 active:scale-95 cursor-pointer border"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            backgroundColor: isLiveMode ? 'rgba(240,169,63,0.12)' : 'rgba(79,216,232,0.10)',
            borderColor: isLiveMode ? 'rgba(240,169,63,0.35)' : 'rgba(79,216,232,0.32)',
            color: isLiveMode ? '#F0A93F' : '#4FD8E8',
          }}
          title="Toggle between Live Reactor API and Free Mock Engine"
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: isLiveMode ? '#F0A93F' : '#4FD8E8' }}
          />
          <span className="font-medium">
            {isLiveMode ? 'LIVE REACTOR API' : 'FREE MOCK MODE (0 CREDITS)'}
          </span>
        </button>
      </header>

      {/* 2. HERO SECTION */}
      <main className="max-w-[800px] mx-auto px-6 py-20 sm:py-28 text-center my-auto flex flex-col items-center">
        {/* Eyebrow Pill */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] tracking-widest uppercase mb-10 border"
          style={{
            borderColor: 'rgba(79,216,232,0.32)',
            backgroundColor: 'rgba(79,216,232,0.10)',
            color: '#4FD8E8',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
          </svg>
          <span>REAL-TIME GENERATIVE SPATIAL INTELLIGENCE</span>
        </div>

        {/* Hero Title */}
        <h1
          className="text-4xl sm:text-5xl md:text-[58px] font-semibold tracking-tight max-w-[620px] mx-auto mb-6"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.08,
            letterSpacing: '-0.025em',
            color: '#F4F4F0',
          }}
        >
          Step into the space <span style={{ color: '#4FD8E8', fontStyle: 'normal' }}>before</span> you build it.
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-[17px] leading-relaxed max-w-[520px] mx-auto mb-11"
          style={{ color: '#98A29A', lineHeight: 1.65 }}
        >
          Turn a floor plan, a pitch deck, or a rough idea into a{' '}
          <b style={{ color: '#F4F4F0', fontWeight: 500 }}>navigable, real-time world</b>. Walk the layout, test how it
          flows, and feel the space before a single wall goes up.
        </p>

        {/* CTA Button with Alakazam-Style Breathing Glow */}
        <button
          onClick={onLaunchStudio}
          className="group inline-flex items-center gap-2.5 px-8 py-4 text-[13px] tracking-wider transition-all duration-300 cursor-pointer active:scale-95 shadow-[0_0_35px_rgba(79,216,232,0.32)] hover:shadow-[0_0_50px_rgba(79,216,232,0.5)] hover:-translate-y-0.5"
          style={{
            backgroundColor: '#4FD8E8',
            color: '#04262B',
            border: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            letterSpacing: '0.06em',
          }}
        >
          <span>ENTER SPATIAL STUDIO</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </button>

        {/* Meta Stats */}
        <div
          className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-7 text-[11px] tracking-wider"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            color: '#717D8A',
            letterSpacing: '0.05em',
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: '#4FD8E8', fontSize: '12px' }}>◆</span>
            <span>60fps WebRTC render</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#4FD8E8', fontSize: '12px' }}>◆</span>
            <span>No install required</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#4FD8E8', fontSize: '12px' }}>◆</span>
            <span>Voice + WASD navigation</span>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer
        className="w-full max-w-[900px] mx-auto px-6 py-6 border-t flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px]"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          borderColor: 'rgba(150, 170, 200, 0.12)',
          color: '#717D8A',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4FD8E8] animate-pulse" />
          <span>INCEPTION ENGINE 2.0 • POWERED BY REACTOR WEBRTC</span>
        </div>
        <div>
          <span>BENGALURU SPATIAL SIMULATION ENGINE</span>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
