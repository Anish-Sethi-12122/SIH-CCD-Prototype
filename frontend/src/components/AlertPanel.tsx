import React from 'react';
import { AlertTriangle, X, ChevronRight, Clock } from 'lucide-react';
import { useSurveillanceStore } from '../store';
import { formatIST } from '../utils/time';
import type { Alert } from '../types';

interface Props {
  onSelectAlert: (a: Alert) => void;
}

export const AlertPanel: React.FC<Props> = ({ onSelectAlert }) => {
  const { alerts } = useSurveillanceStore();
  const recent = alerts.slice(0, 12);

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-alert-critical" />
          <span className="text-xs font-mono font-semibold text-gray-300">LIVE ALERTS</span>
        </div>
        <span className="badge-critical">{alerts.filter(a => a.status === 'active').length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <AlertTriangle className="w-6 h-6 mb-1" />
            <span className="text-xs font-mono">No alerts</span>
          </div>
        ) : (
          <div className="divide-y divide-surface-700">
            {recent.map(alert => (
              <AlertRow key={alert.id} alert={alert} onSelect={onSelectAlert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AlertRow = ({ alert, onSelect }: { alert: Alert; onSelect: (a: Alert) => void }) => {
  const isCritical = alert.severity === 'critical';
  const color = isCritical ? 'text-alert-critical' : alert.severity === 'warning' ? 'text-alert-warning' : 'text-alert-info';
  
  return (
    <button
      onClick={() => onSelect(alert)}
      className="w-full min-w-0 text-left px-3 py-1.5 hover:bg-surface-700 transition-colors flex flex-col gap-0.5 border-b border-surface-700 last:border-0"
    >
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className={`font-bold ${color}`}>
          {alert.severity.toUpperCase()}
        </span>
        <span className="text-gray-500">
          {formatIST(alert.created_at)}
        </span>
      </div>
      
      <div className="text-xs text-gray-200 font-bold truncate">
        {alert.title}
      </div>
      
      <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mt-0.5">
        <span className="truncate pr-2">{alert.camera_code || 'CAMERA'}</span>
        <span className="shrink-0">{alert.object_type?.toUpperCase() || 'OBJECT'} · {alert.track_uid || '—'}</span>
      </div>
      
      {alert.status !== 'active' && (
        <div className="text-[9px] font-mono text-gray-500 mt-0.5">
          STATUS: {alert.status.toUpperCase()}
        </div>
      )}
    </button>
  );
};
