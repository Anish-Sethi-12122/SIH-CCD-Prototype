import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { api } from '../services/api';
import type { Track, TrackedEntity } from '../types';
import { formatIST } from '../utils/time';
import { RegistryStatus } from '../components/RegistryStatus';
import { useSurveillanceStore } from '../store';

export const Humans: React.FC = () => {
  const [rows, setRows] = useState<TrackedEntity[]>([]);
  useEffect(() => {
    const load = () => api.getTracks().then(data => setRows(data.filter((track: TrackedEntity) => track.object_type === 'human'))).catch(() => {});
    load(); const timer = setInterval(load, 1500); return () => clearInterval(timer);
  }, []);
  return <Registry title="HUMAN TRACK REGISTRY" icon={<Users className="w-4 h-4 text-gray-400" />} rows={rows} />;
};

export const Registry = ({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: TrackedEntity[] }) => {
  const setSelectedTrack = useSurveillanceStore(state => state.setSelectedTrack);
  const inFrame = rows.filter(row => row.status === 'IN_FRAME').length;
  const suspicious = rows.filter(row => row.status === 'SUSPICIOUS').length;
  return <div className="flex flex-col h-full min-w-0 bg-surface-900">
    <div className="flex items-center gap-4 px-6 py-4 border-b border-surface-700 bg-surface-800 shrink-0">
      <div className="flex items-center gap-2 min-w-0">{icon}<h1 className="text-sm font-bold tracking-widest text-gray-200 truncate">{title}</h1></div>
      <div className="w-px h-4 bg-surface-600 shrink-0" />
      <div className="flex gap-4 shrink-0 text-[10px] font-mono"><span className="text-track-normal">IN FRAME {inFrame}</span><span className="text-alert-warning">OUT OF FRAME {rows.length - inFrame - suspicious}</span><span className="text-alert-critical">SUSPICIOUS {suspicious}</span></div>
    </div>
    <div className="flex-1 overflow-auto p-4">
      {rows.length === 0 ? <div className="py-16 text-center text-xs font-mono text-gray-600">NO TRACKS REGISTERED IN THIS SESSION</div> :
        <table className="w-full min-w-[760px] table-fixed text-left text-xs"><thead><tr className="border-b border-surface-600 text-gray-500 font-mono text-[10px] uppercase"><th className="w-28 py-2 px-2 font-normal">UID</th><th className="w-24 py-2 px-2 font-normal">Class</th><th className="w-32 py-2 px-2 font-normal">Status</th><th className="w-32 py-2 px-2 font-normal">Enrichment</th><th className="w-24 py-2 px-2 font-normal">Confidence</th><th className="w-48 py-2 px-2 font-normal">Last seen</th></tr></thead><tbody>
          {rows.map(row => <tr key={row.id} onClick={() => setSelectedTrack(toTrack(row))} className="cursor-pointer border-b border-surface-700/50 hover:bg-surface-800"><td className="py-2 px-2 font-mono font-bold text-gray-200">{row.track_uid}</td><td className="py-2 px-2 uppercase text-gray-300">{row.object_class}</td><td className="py-2 px-2"><RegistryStatus status={row.status} /></td><td className="py-2 px-2 font-mono text-[10px] text-gray-400">{row.object_type === 'human' ? (row.identity_state || 'NO MATCH') : `ANPR: ${row.anpr_state || 'UNAVAILABLE'}`}</td><td className="py-2 px-2 font-mono text-gray-400">{(row.confidence * 100).toFixed(0)}%</td><td className="py-2 px-2 font-mono text-[10px] text-gray-400 whitespace-nowrap">{formatIST(row.last_seen)}</td></tr>)}
        </tbody></table>}
    </div>
  </div>;
};

const toTrack = (row: TrackedEntity): Track => ({
  track_id: row.track_id, track_uid: row.track_uid, object_type: row.object_type,
  object_class: row.object_class, confidence: row.confidence, class_id: 0,
  bbox: [0, 0, 0, 0], bbox_norm: [0, 0, 0, 0], centroid_norm: [0, 0],
  state: row.status === 'OUT_OF_FRAME' ? 'exited' : 'active',
});
