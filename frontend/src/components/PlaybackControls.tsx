import React from 'react';
import { Play, Pause, RotateCcw, Radio, Zap, AlertOctagon, RefreshCw } from 'lucide-react';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';

export const PlaybackControls: React.FC = () => {
  const { frameData, systemStatus } = useSurveillanceStore();
  const [loading, setLoading] = React.useState<string | null>(null);

  const act = async (name: string, fn: () => Promise<any>) => {
    setLoading(name);
    try { await fn(); } catch (e) { console.error(e); } finally { setLoading(null); }
  };

  const isPaused = systemStatus.feed === 'paused';
  const isLive = frameData?.is_live ?? true;
  const behind = frameData?.behind_live_seconds ?? 0;
  const progress = frameData && frameData.total_frames > 0 ? frameData.frame_num / frameData.total_frames : 0;

  return (
    <div className="flex items-center gap-4 w-full text-xs font-mono select-none">
      {/* Transport controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => act('restart', api.restartCamera)}
          className="text-gray-400 hover:text-gray-100 p-1"
          title="Restart"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => isPaused ? act('resume', api.resumeCamera) : act('pause', api.pauseCamera)}
          className={`p-1.5 ${isPaused ? 'text-gray-100 bg-surface-600 rounded' : 'text-gray-400 hover:text-gray-100'}`}
          title={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="w-px h-4 bg-surface-600 shrink-0" />

      {/* Timeline */}
      <div className="flex-1 flex flex-col justify-center relative h-full">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-surface-600">
          <div
            className="h-full bg-gray-400 transition-all duration-300"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
        {/* Playhead */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-gray-200 transition-all duration-300 shadow-[0_0_4px_rgba(0,0,0,0.5)]"
          style={{ left: `calc(${Math.min(100, progress * 100)}% - 3px)` }}
        />
      </div>

      {/* State info */}
      <div className="flex items-center gap-4 shrink-0">
        {isPaused && (
          <span className="text-alert-warning tracking-wider">PAUSED</span>
        )}
        
        {!isLive && behind > 0 && (
          <span className="text-alert-warning tracking-wider">-{behind}s</span>
        )}

        <button
          onClick={() => act('golive', api.goLive)}
          disabled={isLive && !isPaused}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
            isLive && !isPaused
              ? 'text-track-normal'
              : 'text-gray-400 bg-surface-700 hover:text-gray-200 border border-surface-600'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${isLive && !isPaused ? 'bg-track-normal' : 'bg-transparent'}`} />
          {isLive && !isPaused ? 'LIVE' : 'GO LIVE'}
        </button>

        <div className="w-px h-4 bg-surface-600" />
        <span className="text-gray-500 w-8 text-right">1×</span>
      </div>

      {/* Dev Controls - kept subtle */}
      <div className="flex items-center gap-1 shrink-0 ml-2 border-l border-surface-600 pl-4">
        <button
          onClick={() => act('fail', api.simulateFailure)}
          className="text-[10px] text-gray-500 hover:text-alert-critical"
          title="Simulate Failure"
        >
          SIM-FAIL
        </button>
        <button
          onClick={() => act('recover', api.recoverCamera)}
          className="text-[10px] text-gray-500 hover:text-gray-300"
          title="Recover"
        >
          RECOVER
        </button>
      </div>
    </div>
  );
};
