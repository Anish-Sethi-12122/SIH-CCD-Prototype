import React from 'react';
import { Bell } from 'lucide-react';
import { useSurveillanceStore } from '../store';
import { formatIST } from '../utils/time';

interface TopBarProps {
  onNotificationsClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onNotificationsClick }) => {
  const { liveTracks, alerts, systemStatus, unreadAlertCount, cameraCode } = useSurveillanceStore();
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const humans = liveTracks.filter(t => t.object_type === 'human').length;
  const vehicles = liveTracks.filter(t => t.object_type === 'vehicle').length;

  return (
    <header className="flex items-center justify-between px-3 py-1.5 bg-surface-900 border-b border-surface-600 shrink-0 select-none">
      <div className="flex items-center gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <img src="/operator-mark.svg" alt="" className="w-5 h-5" />
          <div className="text-xs font-bold tracking-widest text-gray-200 font-sans">
            OPERATOR DASHBOARD
          </div>
        </div>
        
        <div className="w-px h-4 bg-surface-600" />
        
        {/* Camera Info */}
        <div className="text-xs font-mono text-gray-400">
          {cameraCode || 'NO SOURCE'}
        </div>

        <div className="w-px h-4 bg-surface-600" />

        {/* System Status */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            systemStatus.feed === 'live' ? 'bg-track-normal' :
            systemStatus.feed === 'paused' ? 'bg-alert-warning' : 'bg-alert-critical'
          }`} />
          <span className="text-[10px] font-mono text-gray-400 uppercase">
            {systemStatus.feed === 'live' ? 'LIVE' :
             systemStatus.feed === 'paused' ? 'PAUSED' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Telemetry */}
        <div className="flex items-center gap-4">
          <Stat name="HUMANS" value={String(humans).padStart(2, '0')} color="text-gray-300" />
          <Stat name="VEHICLES" value={String(vehicles).padStart(2, '0')} color="text-gray-300" />
          <Stat name="TRACKS" value={String(humans + vehicles).padStart(2, '0')} color="text-gray-300" />
          <Stat 
            name="ALERTS" 
            value={String(activeAlerts).padStart(2, '0')} 
            color={activeAlerts > 0 ? 'text-alert-critical' : 'text-gray-500'} 
          />
        </div>

        <div className="w-px h-4 bg-surface-600" />

        {/* Time */}
        <div className="text-[11px] font-mono text-gray-400">
          {formatIST(time)}
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="relative text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-alert-critical text-[8px] flex items-center justify-center font-bold text-white">
              {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

const Stat = ({ name, value, color }: { name: string; value: string; color: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-mono text-gray-500">{name}</span>
    <span className={`text-[11px] font-mono font-bold ${color}`}>{value}</span>
  </div>
);
