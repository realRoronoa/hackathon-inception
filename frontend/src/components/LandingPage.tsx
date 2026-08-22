import React from 'react';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Cpu,
  Store,
} from 'lucide-react';

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
      className="relative w-full h-full min-h-screen overflow-x-hidden overflow-y-auto select-none"
      style={{
        backgroundColor: '#090C11',
        color: '#E7ECF3',
        fontFamily: "'Inter', sans-serif",
        backgroundImage: `
          linear-gradient(rgba(150, 170, 200, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(150, 170, 200, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        backgroundPosition: 'center -1px',
      }}
    >
      {/* 1. TOP BAR */}
      <header
        className="w-full flex items-center justify-between px-6 sm:px-10 py-5 border-b sticky top-0 z-30"
        style={{
          borderColor: 'rgba(150, 170, 200, 0.14)',
          background: 'linear-gradient(180deg, rgba(9,12,17,0.95), rgba(9,12,17,0.75))',
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
              backgroundColor: 'rgba(79,216,232,0.06)',
            }}
          >
            ◆
          </div>
          <div
            className="text-[13px] tracking-wider"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            <b className="font-semibold text-[#E7ECF3]">INCEPTION</b>{' '}
            <span className="text-[#5B6577]">/ SPATIAL SIMULATION</span>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleLiveMode(!isLiveMode)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] tracking-wider transition-all duration-200 active:scale-95 cursor-pointer border"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              backgroundColor: isLiveMode ? 'rgba(240,169,63,0.12)' : 'rgba(79,216,232,0.12)',
              borderColor: isLiveMode ? 'rgba(240,169,63,0.35)' : 'rgba(79,216,232,0.35)',
              color: isLiveMode ? '#F0A93F' : '#4FD8E8',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: isLiveMode ? '#F0A93F' : '#4FD8E8' }}
            />
            <span>{isLiveMode ? 'LIVE REACTOR API' : 'FREE MOCK MODE'}</span>
          </button>

          <button
            onClick={onLaunchStudio}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-lg"
            style={{
              backgroundColor: '#4FD8E8',
              color: '#04262B',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. HERO MARKETING SECTION */}
      <section className="max-w-[860px] mx-auto px-6 pt-20 sm:pt-28 pb-16 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 text-[11px] tracking-widest uppercase mb-7 border"
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            backgroundColor: 'rgba(79,216,232,0.12)',
            borderColor: 'rgba(79,216,232,0.35)',
            color: '#4FD8E8',
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#4FD8E8]" />
          <span>REAL-TIME GENERATIVE SPATIAL INTELLIGENCE</span>
        </div>

        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.02,
            letterSpacing: '-0.025em',
            color: '#E7ECF3',
          }}
        >
          Simulate Any Physical Space Before Building It.
        </h1>

        <p
          className="text-base sm:text-lg leading-relaxed max-w-[620px] mx-auto mb-10 text-[#8E9AAE] font-normal"
        >
          Inception Engine turns spoken and written concepts into <b>navigable, 60fps WebRTC world models</b>.
          Walk through operational environments, test consumer footfall, and experience spatial designs in real time.
        </p>

        {/* Primary CTA Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onLaunchStudio}
            className="flex items-center justify-center gap-3 px-8 py-4 text-sm font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-[0_0_40px_rgba(79,216,232,0.35)] hover:shadow-[0_0_60px_rgba(79,216,232,0.5)] cursor-pointer"
            style={{
              backgroundColor: '#4FD8E8',
              color: '#04262B',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <span>Launch Spatial Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 3. BENGALURU PRODUCT LAUNCH CASE STUDIES */}
      <section className="max-w-[1000px] mx-auto px-6 py-12 border-t" style={{ borderColor: 'rgba(150, 170, 200, 0.14)' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-2">
          <div>
            <span
              className="text-xs font-semibold text-[#4FD8E8] uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Proven Case Studies
            </span>
            <h2
              className="text-2xl sm:text-3xl font-semibold text-[#E7ECF3] mt-1"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Bengaluru Spatial Product Launches
            </h2>
          </div>
          <span className="text-xs text-[#5B6577] font-mono">
            OPERATIONAL DEPLOYMENTS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div
            className="p-6 border flex flex-col justify-between transition-all duration-200"
            style={{
              backgroundColor: '#10151D',
              borderColor: 'rgba(150, 170, 200, 0.14)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center border text-[#4FD8E8]"
                  style={{
                    borderColor: 'rgba(79,216,232,0.3)',
                    backgroundColor: 'rgba(79,216,232,0.06)',
                  }}
                >
                  <Store className="w-5 h-5" />
                </div>
                <span
                  className="text-[10px] tracking-wider px-2 py-1 border text-[#4FD8E8]"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderColor: 'rgba(79,216,232,0.3)',
                    backgroundColor: 'rgba(79,216,232,0.06)',
                  }}
                >
                  BOMMANAHALLI
                </span>
              </div>
              <h3
                className="text-lg font-semibold text-[#E7ECF3] mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Smart Kitchen Hub
              </h3>
              <p className="text-xs leading-relaxed text-[#8E9AAE] font-light mb-4">
                Simulated an operational IoT kitchen showroom with embedded counters, smart cooking displays, and customer traffic flows.
              </p>
            </div>
            <div className="pt-4 border-t text-[11px] font-mono text-[#5B6577] flex items-center justify-between" style={{ borderColor: 'rgba(150, 170, 200, 0.1)' }}>
              <span>CATEGORY: IOT &amp; RETAIL</span>
              <span className="text-[#4FD8E8]">60 FPS</span>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="p-6 border flex flex-col justify-between transition-all duration-200"
            style={{
              backgroundColor: '#10151D',
              borderColor: 'rgba(150, 170, 200, 0.14)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center border text-[#F0A93F]"
                  style={{
                    borderColor: 'rgba(240,169,63,0.3)',
                    backgroundColor: 'rgba(240,169,63,0.06)',
                  }}
                >
                  <Zap className="w-5 h-5" />
                </div>
                <span
                  className="text-[10px] tracking-wider px-2 py-1 border text-[#F0A93F]"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderColor: 'rgba(240,169,63,0.3)',
                    backgroundColor: 'rgba(240,169,63,0.06)',
                  }}
                >
                  INDIRANAGAR
                </span>
              </div>
              <h3
                className="text-lg font-semibold text-[#E7ECF3] mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Urban EV Showroom
              </h3>
              <p className="text-xs leading-relaxed text-[#8E9AAE] font-light mb-4">
                Interactive spatial model of a minimalist electric vehicle lounge with epoxy reflection floors and autonomous vehicle staging.
              </p>
            </div>
            <div className="pt-4 border-t text-[11px] font-mono text-[#5B6577] flex items-center justify-between" style={{ borderColor: 'rgba(150, 170, 200, 0.1)' }}>
              <span>CATEGORY: EV MOBILITY</span>
              <span className="text-[#F0A93F]">LOW LATENCY</span>
            </div>
          </div>

          {/* Card 3 */}
          <div
            className="p-6 border flex flex-col justify-between transition-all duration-200"
            style={{
              backgroundColor: '#10151D',
              borderColor: 'rgba(150, 170, 200, 0.14)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center border text-[#A78BFA]"
                  style={{
                    borderColor: 'rgba(167,139,250,0.3)',
                    backgroundColor: 'rgba(167,139,250,0.06)',
                  }}
                >
                  <Cpu className="w-5 h-5" />
                </div>
                <span
                  className="text-[10px] tracking-wider px-2 py-1 border text-[#A78BFA]"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    borderColor: 'rgba(167,139,250,0.3)',
                    backgroundColor: 'rgba(167,139,250,0.06)',
                  }}
                >
                  OPERA HOUSE
                </span>
              </div>
              <h3
                className="text-lg font-semibold text-[#E7ECF3] mb-2"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                AI Connected Flagship
              </h3>
              <p className="text-xs leading-relaxed text-[#8E9AAE] font-light mb-4">
                Multi-zone consumer technology lounge with interactive curved screens and ambient audio spatial test environments.
              </p>
            </div>
            <div className="pt-4 border-t text-[11px] font-mono text-[#5B6577] flex items-center justify-between" style={{ borderColor: 'rgba(150, 170, 200, 0.1)' }}>
              <span>CATEGORY: CONSUMER TECH</span>
              <span className="text-[#A78BFA]">NEURAL SYNC</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER TELEMETRY */}
      <footer
        className="max-w-[1000px] mx-auto mt-8 mb-10 px-6 py-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-[#5B6577]"
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          borderColor: 'rgba(150, 170, 200, 0.14)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#4FD8E8] animate-pulse" />
          <span>INCEPTION ENGINE 2.0 • BUILT ON REACTOR WEBRTC</span>
        </div>
        <div>
          <span>BENGALURU SPATIAL SIMULATION CLUSTER</span>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
