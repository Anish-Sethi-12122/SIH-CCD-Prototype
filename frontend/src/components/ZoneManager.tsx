import React from 'react';
import { Plus, Trash2, Eye, EyeOff, MapPin } from 'lucide-react';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';
import type { Zone } from '../types';

export const ZoneManager: React.FC = () => {
  const { zones, setIsDrawingZone, removeZone, addOrUpdateZone } = useSurveillanceStore();

  const handleDelete = async (id: string) => {
    await api.deleteZone(id);
    removeZone(id);
  };

  const handleToggle = async (zone: Zone) => {
    const updated = await api.toggleZone(zone.id, !zone.active);
    addOrUpdateZone(updated);
  };

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-alert-critical" />
          <span className="text-xs font-mono font-semibold text-gray-300">RESTRICTED ZONES</span>
        </div>
        <button
          onClick={() => setIsDrawingZone(true)}
          className="btn-primary text-xs py-1 px-2"
        >
          <Plus className="w-3 h-3" /> Draw Zone
        </button>
      </div>
      <div className="p-2 space-y-1">
        {zones.length === 0 && (
          <div className="text-center py-3 text-gray-600 text-xs font-mono">
            No zones defined — click Draw Zone
          </div>
        )}
        {zones.map(zone => (
          <div key={zone.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-surface-700 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full ${ zone.active ? 'bg-alert-critical' : 'bg-gray-600'}`} />
              <span className="text-xs text-gray-300 truncate">{zone.name}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleToggle(zone)} className="p-1 hover:bg-surface-600 rounded">
                {zone.active ? <Eye className="w-3 h-3 text-gray-400" /> : <EyeOff className="w-3 h-3 text-gray-600" />}
              </button>
              <button onClick={() => handleDelete(zone.id)} className="p-1 hover:bg-alert-critical/20 rounded">
                <Trash2 className="w-3 h-3 text-alert-critical" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
