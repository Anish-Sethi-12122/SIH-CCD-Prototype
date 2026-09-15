import React, { useEffect, useState } from 'react';
import { X, User, Car, Shield, Activity } from 'lucide-react';
import type { Track } from '../types';
import { useSurveillanceStore } from '../store';

export const TrackDetail: React.FC = () => {
  const { selectedTrack, alertedTrackIds, setSelectedTrack } = useSurveillanceStore();
  const [record, setRecord] = useState<any>(null);
  useEffect(() => {
    if (!selectedTrack) { setRecord(null); return; }
    fetch('http://localhost:8000/api/tracks').then(r => r.json()).then(rows => setRecord(rows.find((row: any) => row.track_uid === selectedTrack.track_uid))).catch(() => {});
  }, [selectedTrack?.track_uid]);
  if (!selectedTrack) return null;

  const t = selectedTrack;
  const isAlerted = alertedTrackIds.has(t.track_id);
  const trackLabel = t.track_uid;
  const color = isAlerted ? 'text-alert-critical border-alert-critical/30 bg-alert-critical/10' :
    t.object_type === 'human' ? 'text-track-human border-track-human/20 bg-track-human/5' :
    'text-track-vehicle border-track-vehicle/20 bg-track-vehicle/5';

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-surface-800 border-l border-surface-600 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-surface-600 bg-surface-900 ${color}`}>
        <div className="flex items-center gap-2">
          {t.object_type === 'human' ? <User className="w-4 h-4" /> : <Car className="w-4 h-4" />}
          <span className="text-sm font-mono font-bold">TRACK {trackLabel}</span>
          {isAlerted && <span className="text-[9px] px-1.5 py-0.5 bg-alert-critical/20 text-alert-critical border border-alert-critical font-bold">ALERT</span>}
        </div>
        <button onClick={() => setSelectedTrack(null)} className="p-1 hover:bg-surface-700 rounded text-gray-400 hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        <div className="space-y-2">
          <Row label="TYPE" value={t.object_type.toUpperCase()} />
          <Row label="CLASS" value={t.object_class.toUpperCase()} />
          <Row label="STATUS" value={isAlerted ? 'SUSPICIOUS' : t.state === 'exited' ? 'OUT OF FRAME' : 'IN FRAME'} highlight />
          <Row label="CONFIDENCE" value={`${(t.confidence * 100).toFixed(1)}%`} />
        </div>
        
        {t.object_type === 'human' && (
          <div className="border-t border-surface-600 pt-4 space-y-2">
            <div className="text-[10px] font-mono text-gray-500 mb-2">IDENTITY ENRICHMENT</div>
            <Row label="IDENTITY" value={record?.identity_state || 'NO MATCH'} />
            <Row label="NAME" value={record?.mock_name || '—'} />
            <Row label="AGE" value={record?.mock_age ? String(record.mock_age) : '—'} />
            <Row label="REFERENCE ID" value={record?.mock_id_doc || '—'} />
          </div>
        )}
        
        {t.object_type === 'vehicle' && (
          <div className="border-t border-surface-600 pt-4 space-y-2">
            <div className="text-[10px] font-mono text-gray-500 mb-2">ANPR ENRICHMENT</div>
            <Row label="ANPR STATE" value={record?.anpr_state || 'UNAVAILABLE'} />
            <Row label="PLATE" value={record?.mock_plate || '—'} />
            <Row label="REASON" value={record?.anpr_reason || 'INSUFFICIENT IMAGE QUALITY'} />
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex justify-between items-center py-1 border-b border-surface-700/50 last:border-0">
    <span className="text-[10px] text-gray-500 font-mono tracking-wider">{label}</span>
    <span className={`font-mono text-xs ${highlight ? 'text-gray-100 font-bold' : 'text-gray-300'}`}>{value}</span>
  </div>
);
