import React, { useState, useEffect } from 'react';
import { VideoFeed } from '../components/VideoFeed';
import { AlertPanel } from '../components/AlertPanel';
import { AlertDetail } from '../components/AlertDetail';
import { TrackDetail } from '../components/TrackDetail';
import { PlaybackControls } from '../components/PlaybackControls';
import { ZoneManager } from '../components/ZoneManager';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';
import type { Alert } from '../types';

export const CommandCenter: React.FC = () => {
  const { setAlerts, setZones } = useSurveillanceStore();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Both endpoints are scoped by the backend to the fresh session.
  useEffect(() => {
    const init = async () => {
      try {
        const [alerts, zones] = await Promise.all([
          api.getAlerts(),
          api.getZones(),
        ]);
        setAlerts(alerts);
        setZones(zones);
      } catch {}
    };
    init();
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-900">
      {/* Main content */}
      <div className="flex flex-1 min-h-0 border-t border-surface-600">
        {/* Video + controls (approx 75%) */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-surface-600 relative">
          <div className="flex-1 min-h-0">
            <VideoFeed />
          </div>
          {/* Playback bar attached directly below */}
          <div className="h-12 shrink-0 bg-surface-800 border-t border-surface-600 px-3 flex items-center">
            <PlaybackControls />
          </div>
        </div>

        {/* Right panel (approx 25%) */}
        <div className="w-1/4 min-w-[320px] max-w-[400px] flex flex-col shrink-0 bg-surface-800">
          <div className="flex-1 min-h-0 overflow-hidden">
            <AlertPanel onSelectAlert={setSelectedAlert} />
          </div>
          <div className="border-t border-surface-600">
            <ZoneManager />
          </div>
        </div>
      </div>

      {/* Track detail popup */}
      <TrackDetail />

      {/* Alert detail drawer */}
      {selectedAlert && (
        <AlertDetail alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
};
