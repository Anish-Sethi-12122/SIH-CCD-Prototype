import React, { useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import { api } from '../services/api';
import type { TrackedEntity } from '../types';
import { Registry } from './Humans';

export const Vehicles: React.FC = () => {
  const [rows, setRows] = useState<TrackedEntity[]>([]);
  useEffect(() => {
    const load = () => api.getTracks().then(data => setRows(data.filter((track: TrackedEntity) => track.object_type === 'vehicle'))).catch(() => {});
    load(); const timer = setInterval(load, 1500); return () => clearInterval(timer);
  }, []);
  return <Registry title="VEHICLE TRACK REGISTRY" icon={<Car className="w-4 h-4 text-gray-400" />} rows={rows} />;
};
