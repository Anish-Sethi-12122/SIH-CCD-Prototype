import React, { useEffect, useState } from 'react';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';
import { X, Activity } from 'lucide-react';

export const DebugPanel: React.FC = () => {
  const store = useSurveillanceStore();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<any>(null);
  
  // Track WS message time
  const [lastMessage, setLastMessage] = useState(Date.now());
  useEffect(() => {
    setLastMessage(Date.now());
  }, [store.frameData, store.liveTracks, store.alerts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(async () => {
      try {
        const s = await api.status();
        setStatus(s);
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const wsLatency = Date.now() - lastMessage;
  const isWsConnected = wsLatency < 5000;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-surface-900 border border-surface-600 shadow-2xl z-50 p-4 font-mono text-xs flex flex-col gap-4 text-gray-300">
      <div className="flex items-center justify-between border-b border-surface-700 pb-2">
        <div className="flex items-center gap-2 text-accent font-bold">
          <Activity className="w-4 h-4" />
          SYSTEM DEBUG (Shift+D)
        </div>
        <button onClick={() => setOpen(false)} className="hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-gray-500 font-bold mb-1">VIDEO</div>
          <div className="flex justify-between gap-3"><span>Camera:</span><span className="text-gray-100 truncate">{status?.pipeline?.camera_code || store.cameraCode || 'None'}</span></div>
          <div className="flex justify-between gap-3"><span>Internal ID:</span><span className="text-gray-100 truncate" title={status?.pipeline?.camera_id || store.cameraId}>{status?.pipeline?.camera_id || store.cameraId || 'None'}</span></div>
          <div className="flex justify-between gap-3"><span>Session ID:</span><span className="text-gray-100 truncate" title={status?.pipeline?.session_id || store.sessionId}>{status?.pipeline?.session_id || store.sessionId || 'None'}</span></div>
          <div className="flex justify-between"><span>Resolution:</span><span className="text-gray-100">{status?.telemetry?.source_resolution?.join('×') || '—'}</span></div>
          <div className="flex justify-between"><span>Source FPS:</span><span className="text-gray-100">{status?.pipeline?.fps?.toFixed(2) || '0.00'}</span></div>
          <div className="flex justify-between"><span>State:</span><span className={status?.pipeline?.active ? 'text-track-normal' : 'text-gray-500'}>{status?.pipeline?.active ? 'PROCESSING' : 'IDLE'}</span></div>
        </div>

        <div>
          <div className="text-gray-500 font-bold mb-1">VISION</div>
          <div className="flex justify-between"><span>Model:</span><span className="text-gray-100">YOLOv8n</span></div>
          <div className="flex justify-between"><span>Active Tracks:</span><span className="text-gray-100">{store.liveTracks.length}</span></div>
          <div className="flex justify-between"><span>Detection:</span><span className={store.detectionEnabled ? 'text-track-normal' : 'text-gray-500'}>{store.detectionEnabled ? 'ON' : 'OFF'}</span></div>
          <div className="flex justify-between"><span>Tracking:</span><span className={store.trackingEnabled ? 'text-track-normal' : 'text-gray-500'}>{store.trackingEnabled ? 'ON' : 'OFF'}</span></div>
          <div className="flex justify-between"><span>Inference FPS:</span><span className="text-gray-100">{status?.telemetry?.inference_fps || '—'}</span></div>
          <div className="flex justify-between"><span>Processed FPS:</span><span className="text-gray-100">{status?.telemetry?.processed_fps || '—'}</span></div>
          <div className="flex justify-between"><span>Avg inference:</span><span className="text-gray-100">{status?.telemetry?.average_inference_ms || '—'}ms</span></div>
        </div>

        <div>
          <div className="text-gray-500 font-bold mb-1">EVENT ENGINE</div>
          <div className="flex justify-between"><span>Active Zones:</span><span className="text-gray-100">{store.zones.filter(z => z.active).length}</span></div>
          <div className="flex justify-between"><span>Total Alerts:</span><span className="text-gray-100">{store.alerts.length}</span></div>
          <div className="flex justify-between"><span>Fencing:</span><span className={store.fencingEnabled ? 'text-track-normal' : 'text-gray-500'}>{store.fencingEnabled ? 'ON' : 'OFF'}</span></div>
          <div className="flex justify-between"><span>Event latency:</span><span className="text-gray-100">{status?.telemetry?.approx_event_latency_ms || '—'}ms</span></div>
        </div>

        <div>
          <div className="text-gray-500 font-bold mb-1">WEBSOCKET</div>
          <div className="flex justify-between"><span>Status:</span><span className={isWsConnected ? 'text-track-normal' : 'text-alert-critical'}>{isWsConnected ? 'CONNECTED' : 'DISCONNECTED'}</span></div>
          <div className="flex justify-between"><span>Last Msg:</span><span className="text-gray-100">{wsLatency}ms ago</span></div>
        </div>
      </div>
    </div>
  );
};
