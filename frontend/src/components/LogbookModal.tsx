import React from 'react';
import { X, Image as ImageIcon, Trash2, Download } from 'lucide-react';

export interface SnapshotItem {
  id: string;
  dataUrl: string;
  sector: string;
  timestamp: number;
}

interface LogbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SnapshotItem[];
  onClear: () => void;
}

export const LogbookModal: React.FC<LogbookModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none font-mono">
      <div className="max-w-3xl w-full max-h-[85vh] flex flex-col rounded-2xl border border-cyan-500/30 bg-zinc-950/95 shadow-[0_0_50px_rgba(79,216,232,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 text-cyan-400 text-sm font-semibold">
            <ImageIcon className="w-4 h-4" />
            <span>Mission Flight Logbook ({snapshots.length})</span>
          </div>

          <div className="flex items-center gap-3">
            {snapshots.length > 0 && (
              <button
                onClick={onClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-600/30 text-rose-300 text-xs hover:bg-rose-900/50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 text-zinc-500">
              <ImageIcon className="w-10 h-10 stroke-1 text-zinc-600" />
              <p className="text-sm">No mission snapshots recorded yet.</p>
              <p className="text-xs text-zinc-600">
                Press <kbd className="text-cyan-400 bg-zinc-900 px-1 py-0.5 border border-zinc-800 rounded">F</kbd> during exploration to capture polaroid snapshots.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {snapshots.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-cyan-500/50 transition-all shadow-lg"
                >
                  <img
                    src={item.dataUrl}
                    alt={item.sector}
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <p className="text-zinc-200 truncate font-medium">{item.sector}</p>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <a
                      href={item.dataUrl}
                      download={`inception-snapshot-${item.timestamp}.png`}
                      className="p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
                      title="Download PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default LogbookModal;
