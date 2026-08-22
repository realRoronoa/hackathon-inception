import React from 'react';
import { Award, Compass, RotateCcw, ShieldCheck, Sparkles, Zap, Activity } from 'lucide-react';

interface MissionStats {
  sector: string;
  durationSeconds: number;
  distanceKm: number;
  anomaliesScanned: number;
  decisionsMade: number;
  neuralStability: number;
}

interface MissionDebriefModalProps {
  stats: MissionStats;
  onReturnToBase: () => void;
  onRestart: () => void;
}

export const MissionDebriefModal: React.FC<MissionDebriefModalProps> = ({
  stats,
  onReturnToBase,
  onRestart,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  const score =
    Math.round(stats.distanceKm * 120) +
    stats.anomaliesScanned * 500 +
    stats.decisionsMade * 300 +
    Math.round(stats.neuralStability * 10);

  const getRank = (sc: number) => {
    if (sc > 3000) return { title: 'GRADE S+ EXPLORER', color: '#4FD8E8' };
    if (sc > 1500) return { title: 'GRADE A NAVIGATOR', color: '#10B981' };
    return { title: 'GRADE B RECON', color: '#F0A93F' };
  };

  const rank = getRank(score);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none font-mono">
      <div className="max-w-lg w-full rounded-2xl border border-cyan-500/40 bg-zinc-950/95 p-6 space-y-6 shadow-[0_0_60px_rgba(79,216,232,0.2)]">
        
        {/* Header Badge */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Award className="w-5 h-5 text-cyan-400" />
            <span>Mission Debriefing Summary</span>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded border"
            style={{
              color: rank.color,
              borderColor: `${rank.color}40`,
              backgroundColor: `${rank.color}15`,
            }}
          >
            {rank.title}
          </span>
        </div>

        {/* Sector Name */}
        <div className="space-y-1 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Sector Explored</span>
          <p className="text-sm text-zinc-200 font-light truncate">{stats.sector}</p>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 text-left space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>TIME IN SECTOR</span>
            </div>
            <p className="text-base font-bold text-zinc-100">{formatTime(stats.durationSeconds)}</p>
          </div>

          <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 text-left space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>DISTANCE TRAVERSED</span>
            </div>
            <p className="text-base font-bold text-zinc-100">{stats.distanceKm.toFixed(2)} KM</p>
          </div>

          <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 text-left space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>ANOMALIES SCANNED</span>
            </div>
            <p className="text-base font-bold text-zinc-100">{stats.anomaliesScanned} DISCOVERED</p>
          </div>

          <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 text-left space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <span>NEURAL STABILITY</span>
            </div>
            <p className="text-base font-bold text-zinc-100">{stats.neuralStability.toFixed(1)}%</p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>TOTAL EXPLORATION SCORE</span>
          </div>
          <span className="text-lg font-bold text-cyan-300 tracking-wider">{score.toLocaleString()} PTS</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 border border-zinc-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Re-Enter Sector</span>
          </button>

          <button
            onClick={onReturnToBase}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg"
          >
            <span>Return to Base</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default MissionDebriefModal;
