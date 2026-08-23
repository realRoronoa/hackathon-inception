import React, { useState, useEffect, useCallback } from 'react';
import { Lock, AlertCircle, Delete, ArrowRight } from 'lucide-react';
import { soundFx } from '../engine/soundFx';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const handleKeyPress = useCallback((digit: string) => {
    soundFx.playClick(1200);
    setErrorMessage(null);
    setPin((prev) => (prev.length < 8 ? prev + digit : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    soundFx.playClick(900);
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    soundFx.playClick(800);
    setErrorMessage(null);
    setPin('');
  }, []);

  const handleVerify = useCallback(async () => {
    if (!pin.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        soundFx.playSuccessChime();
        onUnlock();
      } else {
        triggerError(data.message || 'Access Denied: Invalid Key');
      }
    } catch (err) {
      console.warn('[LOCK SCREEN] Backend unreachable, verifying offline demo key:', err);
      // Offline fallback: Accept default '2026' or '1337'
      if (pin.trim() === '2026' || pin.trim() === '1337') {
        soundFx.playSuccessChime();
        onUnlock();
      } else {
        triggerError('Access Denied: Invalid Key');
      }
    } finally {
      setIsLoading(false);
    }
  }, [pin, onUnlock]);

  const triggerError = (msg: string) => {
    soundFx.playModeSwitch();
    setErrorMessage(msg);
    setIsShaking(true);
    setPin('');
    setTimeout(() => setIsShaking(false), 500);
  };

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleVerify();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleBackspace, handleVerify, handleClear]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex items-center justify-center select-none font-mono p-4"
      style={{
        backgroundColor: '#090C11',
        color: '#E7ECF3',
        backgroundImage: `
          linear-gradient(rgba(150, 170, 200, 0.10) 1px, transparent 1px),
          linear-gradient(90deg, rgba(150, 170, 200, 0.10) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
      }}
    >
      {/* Background Radial Glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #4FD8E8 0%, transparent 70%)',
        }}
      />

      {/* Main Lock Card */}
      <div
        className={`relative max-w-sm w-full rounded-3xl border border-cyan-500/30 bg-zinc-950/85 backdrop-blur-2xl p-7 text-center shadow-[0_0_60px_rgba(79,216,232,0.18)] transition-transform duration-200 ${
          isShaking ? 'animate-bounce border-rose-500 shadow-[0_0_60px_rgba(244,63,94,0.3)]' : ''
        }`}
      >
        {/* Top Security Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 text-[10px] font-mono tracking-widest uppercase border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>SECURITY PROTOCOL 2.0</span>
        </div>

        {/* Header Title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            Clearance Required
          </h2>
        </div>
        <p className="text-xs text-zinc-400 font-sans mb-6">
          Enter VIP Access Key to decrypt Spatial Studio
        </p>

        {/* PIN Masked Display */}
        <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 mb-6 shadow-inner">
          {[0, 1, 2, 3].map((slotIdx) => {
            const hasChar = pin.length > slotIdx;
            return (
              <div
                key={slotIdx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  hasChar
                    ? 'bg-cyan-400 shadow-[0_0_12px_#4FD8E8] scale-110'
                    : 'bg-zinc-800 border border-zinc-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-mono mb-4 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 3x4 Mobile Numpad Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {digits.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="py-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-lg font-semibold text-zinc-200 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-zinc-800/80 hover:shadow-[0_0_15px_rgba(79,216,232,0.2)] active:scale-95 transition-all duration-150 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Clear / Backspace Button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer"
            title="Delete (Backspace)"
          >
            <Delete className="w-4 h-4" />
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-lg font-semibold text-zinc-200 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-zinc-800/80 hover:shadow-[0_0_15px_rgba(79,216,232,0.2)] active:scale-95 transition-all duration-150 cursor-pointer"
          >
            0
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={isLoading || !pin.trim()}
            className={`py-3.5 rounded-2xl border text-xs font-bold uppercase transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-lg ${
              pin.trim() && !isLoading
                ? 'bg-cyan-500 border-cyan-400 text-zinc-950 hover:bg-cyan-400 shadow-[0_0_20px_rgba(79,216,232,0.4)]'
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Enter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Footer Hint */}
        <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between border-t border-zinc-900 pt-3">
          <span>ENCRYPTED GATEWAY</span>
          <span className="text-cyan-400/80">DEFAULT: 2026</span>
        </div>
      </div>
    </div>
  );
};
export default LockScreen;
