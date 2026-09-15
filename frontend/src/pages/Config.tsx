import React from 'react';
import { Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';

const SETTINGS = [
  { key: 'detectionEnabled', label: 'Human Detection', desc: 'YOLO person detection', backend: true },
  { key: 'trackingEnabled', label: 'Human Tracking', desc: 'ByteTrack stable IDs', backend: true },
  { key: 'detectionEnabled', label: 'Vehicle Detection', desc: 'YOLO vehicle classes', backend: false },
  { key: 'trackingEnabled', label: 'Vehicle Tracking', desc: 'ByteTrack vehicles', backend: false },
  { key: 'fencingEnabled', label: 'Virtual Fencing', desc: 'Zone intrusion detection', backend: true },
  { key: 'fencingEnabled', label: 'Intrusion Alerts', desc: 'Real-time alert generation', backend: false },
  { key: 'anprEnabled', label: 'ANPR', desc: 'License plate recognition (DEMO)', backend: false },
  { key: 'identityEnabled', label: 'Identity Enrichment', desc: 'Biometric match (DEMO)', backend: false },
  { key: 'nightVisionEnabled', label: 'Night Vision Filter', desc: 'Visual enhancement only', backend: false },
  { key: 'showBboxes', label: 'Show Bounding Boxes', desc: 'Display detection overlays', backend: false },
];

export const Config: React.FC = () => {
  const store = useSurveillanceStore();

  const handleToggle = async (key: string, isBackend: boolean) => {
    store.toggleSetting(key);
    if (isBackend) {
      const newVal = !(store as any)[key];
      try {
        await api.updatePipelineSettings({ [key]: newVal });
      } catch {}
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-900">
      {/* Header */}
      <div className="flex items-center gap-6 px-6 py-4 border-b border-surface-700 bg-surface-800 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <h1 className="text-sm font-bold font-sans tracking-widest text-gray-200">SYSTEM CONFIGURATION</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-3xl">
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          {/* Modules Column */}
          <div>
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-gray-500 mb-4 border-b border-surface-700 pb-2">ACTIVE MODULES</h2>
            <div className="space-y-1">
              {SETTINGS.slice(0, 8).map(({ key, label, desc, backend }) => {
                const val = (store as any)[key] as boolean;
                return (
                  <div key={`${key}-${label}`} className="flex items-center justify-between py-2 border-b border-surface-700/50 last:border-0 group hover:bg-surface-800 transition-colors px-2 -mx-2 rounded">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{label}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{desc}</div>
                    </div>
                    <button onClick={() => handleToggle(key, backend)} className="flex items-center gap-2 cursor-pointer outline-none">
                      <span className={`text-[10px] font-mono font-bold ${val ? 'text-track-normal' : 'text-gray-600'}`}>{val ? 'ON' : 'OFF'}</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${val ? 'bg-track-normal/20 border border-track-normal/50' : 'bg-surface-700 border border-surface-600'}`}>
                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${val ? 'translate-x-4 bg-track-normal' : 'translate-x-1 bg-gray-500'}`} />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UI Column */}
          <div>
            <h2 className="text-[10px] font-mono font-bold tracking-wider text-gray-500 mb-4 border-b border-surface-700 pb-2">DISPLAY / UI</h2>
            <div className="space-y-1">
              {SETTINGS.slice(8).map(({ key, label, desc, backend }) => {
                const val = (store as any)[key] as boolean;
                return (
                  <div key={`${key}-${label}`} className="flex items-center justify-between py-2 border-b border-surface-700/50 last:border-0 group hover:bg-surface-800 transition-colors px-2 -mx-2 rounded">
                    <div>
                      <div className="text-xs font-bold text-gray-200">{label}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{desc}</div>
                    </div>
                    <button onClick={() => handleToggle(key, backend)} className="flex items-center gap-2 cursor-pointer outline-none">
                      <span className={`text-[10px] font-mono font-bold ${val ? 'text-track-normal' : 'text-gray-600'}`}>{val ? 'ON' : 'OFF'}</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${val ? 'bg-track-normal/20 border border-track-normal/50' : 'bg-surface-700 border border-surface-600'}`}>
                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform ${val ? 'translate-x-4 bg-track-normal' : 'translate-x-1 bg-gray-500'}`} />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            <h2 className="text-[10px] font-mono font-bold tracking-wider text-gray-500 mt-8 mb-4 border-b border-surface-700 pb-2">PRESETS</h2>
            <div className="p-3 bg-surface-800 border border-surface-600 rounded flex flex-col gap-2">
              <div className="text-xs font-bold text-gray-200">Full Demo Sequence</div>
              <div className="text-[10px] text-gray-500 font-mono">Enables all detection pipelines and generates a central restricted zone to guarantee intrusion events from moving objects.</div>
              <button 
                onClick={async () => {
                  store.toggleSetting('detectionEnabled');
                  store.toggleSetting('trackingEnabled');
                  store.toggleSetting('fencingEnabled');
                  if (!store.detectionEnabled) store.toggleSetting('detectionEnabled');
                  if (!store.trackingEnabled) store.toggleSetting('trackingEnabled');
                  if (!store.fencingEnabled) store.toggleSetting('fencingEnabled');
                  await api.updatePipelineSettings({ detection_enabled: true, tracking_enabled: true, fencing_enabled: true });
                  
                  // Predefined central zone
                  const demoZone = {
                    camera_id: store.cameraId,
                    name: "DEMO ZONE",
                    polygon: [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]]
                  };
                  await api.createZone(demoZone);
                  alert('Demo Mode engaged. A central zone was created and all systems enabled.');
                }}
                className="mt-2 bg-accent/20 text-accent border border-accent/40 text-xs font-mono font-bold py-1.5 rounded hover:bg-accent hover:text-surface-900 transition-colors"
              >
                ENGAGE DEMO MODE
              </button>
            </div>

            <h2 className="text-[10px] font-mono font-bold tracking-wider text-gray-500 mt-8 mb-4 border-b border-surface-700 pb-2">SYSTEM INFO</h2>
            <div className="space-y-2 text-[10px] font-mono">
              <div className="flex justify-between"><span className="text-gray-500">Version</span><span className="text-gray-300">1.0.0-prototype</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Detection Model</span><span className="text-gray-300">YOLOv8n</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tracker</span><span className="text-gray-300">ByteTrack</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Video Backend</span><span className="text-gray-300">OpenCV</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Real-time</span><span className="text-gray-300">WebSocket</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
