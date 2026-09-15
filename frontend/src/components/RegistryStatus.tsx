import React from 'react';

export const RegistryStatus = ({ status }: { status: 'IN_FRAME' | 'OUT_OF_FRAME' | 'SUSPICIOUS' }) => {
  const color = status === 'SUSPICIOUS' ? 'text-alert-critical' : status === 'OUT_OF_FRAME' ? 'text-alert-warning' : 'text-track-normal';
  return <span className={`font-mono font-bold text-[10px] ${color}`}>{status.replace('_', ' ')}</span>;
};
