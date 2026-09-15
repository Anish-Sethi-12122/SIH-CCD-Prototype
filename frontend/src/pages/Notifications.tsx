import React, { useEffect, useState } from 'react';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';
import { AlertDetail } from '../components/AlertDetail';
import { AlertTriangle, Filter } from 'lucide-react';
import { formatIST } from '../utils/time';
import type { Alert } from '../types';

const PAGE_SIZE = 20;

export const Notifications: React.FC = () => {
  const { alerts, setAlerts, markAlertsRead } = useSurveillanceStore();
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    markAlertsRead();
    fetchAlerts();
  }, [page]);

  const fetchAlerts = async () => {
    const data = await api.getAlerts(PAGE_SIZE, page * PAGE_SIZE);
    setAlerts(data);
    setTotal(data.length === PAGE_SIZE ? (page + 2) * PAGE_SIZE : page * PAGE_SIZE + data.length);
  };

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter || a.status === filter);

  return (
    <div className="flex flex-col h-full bg-surface-900">
      {/* Header */}
      <div className="flex items-center gap-6 px-6 py-4 border-b border-surface-700 bg-surface-800 shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-gray-400" />
          <h1 className="text-sm font-bold font-sans tracking-widest text-gray-200">OPERATIONAL EVENT LOG</h1>
        </div>
        
        <div className="w-px h-4 bg-surface-600" />
        
        <div className="flex gap-2">
          {['all', 'critical', 'warning', 'acknowledged', 'false_positive'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-1 font-mono uppercase tracking-wider border transition-colors ${
                filter === f ? 'bg-surface-600 text-gray-100 border-surface-500' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-surface-600 text-gray-500 font-mono text-[10px] uppercase">
              <th className="py-2 px-2 font-normal w-32">Time</th>
              <th className="py-2 px-2 font-normal w-24">Severity</th>
              <th className="py-2 px-2 font-normal">Event</th>
              <th className="py-2 px-2 font-normal w-32">Camera</th>
              <th className="py-2 px-2 font-normal w-24">Track</th>
              <th className="py-2 px-2 font-normal w-32">Status</th>
              <th className="py-2 px-2 font-normal">Operator Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(alert => {
              const isCritical = alert.severity === 'critical';
              const color = isCritical ? 'text-alert-critical' : alert.severity === 'warning' ? 'text-alert-warning' : 'text-alert-info';
              
              return (
                <tr
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="border-b border-surface-700/50 hover:bg-surface-800 transition-colors group cursor-pointer"
                >
                  <td className="py-2 px-2 font-mono text-gray-400">
                    {formatIST(alert.created_at)}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`font-mono font-bold text-[10px] ${color}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-bold text-gray-200">
                    {alert.title}
                  </td>
                  <td className="py-2 px-2 font-mono text-gray-400 text-[10px]">
                    {alert.camera_code || '—'}
                  </td>
                  <td className="py-2 px-2 font-mono text-gray-400 text-[10px]">
                    {alert.track_uid ? `${alert.object_type?.toUpperCase() || 'OBJECT'} · ${alert.track_uid}` : '—'}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`font-mono text-[10px] ${
                      alert.status === 'active' ? 'text-alert-critical font-bold' :
                      alert.status === 'acknowledged' ? 'text-track-normal font-bold' : 'text-gray-500'
                    }`}>
                      {alert.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-gray-500 truncate max-w-[200px] text-[10px] font-mono">
                    {alert.operator_note ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 font-mono text-xs uppercase">
            System monitoring normally. No events match filter.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-surface-700 bg-surface-800 shrink-0">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="text-[10px] font-mono text-gray-400 hover:text-gray-100 disabled:opacity-30 uppercase"
        >
          ← Prev
        </button>
        <span className="text-[10px] font-mono text-gray-500">PAGE {page + 1}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={alerts.length < PAGE_SIZE}
          className="text-[10px] font-mono text-gray-400 hover:text-gray-100 disabled:opacity-30 uppercase"
        >
          Next →
        </button>
      </div>

      {selectedAlert && <AlertDetail alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
    </div>
  );
};
