import React from 'react';
import { useSurveillanceStore } from '../store';

interface Props {
  containerSize: { w: number; h: number };
}

export const ZoneOverlay: React.FC<Props> = ({ containerSize }) => {
  const { zones, frameData } = useSurveillanceStore();

  if (!zones || zones.length === 0 || containerSize.w === 0 || !frameData) return null;

  // Compute letterbox offsets (object-contain)
  const nativeW = frameData.frame_w || 1280;
  const nativeH = frameData.frame_h || 720;
  const scale = Math.min(containerSize.w / nativeW, containerSize.h / nativeH);
  const displayW = nativeW * scale;
  const displayH = nativeH * scale;
  const offsetX = (containerSize.w - displayW) / 2;
  const offsetY = (containerSize.h - displayH) / 2;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg className="absolute inset-0 w-full h-full">
        {zones.filter(z => z.active).map(zone => {
          if (!zone.polygon || zone.polygon.length < 3) return null;
          
          const pointsStr = zone.polygon
            .map(pt => `${offsetX + pt[0] * displayW},${offsetY + pt[1] * displayH}`)
            .join(' ');
            
          // Find center for label
          const cx = offsetX + (zone.polygon.reduce((sum, pt) => sum + pt[0], 0) / zone.polygon.length) * displayW;
          const cy = offsetY + (zone.polygon.reduce((sum, pt) => sum + pt[1], 0) / zone.polygon.length) * displayH;

          return (
            <g key={zone.id}>
              <polygon
                points={pointsStr}
                fill="rgba(101,163,13,0.1)" /* Muted olive/green fill */
                stroke="var(--color-track-normal)" /* Muted green stroke */
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="var(--color-track-normal)"
                className="font-mono text-[10px] font-bold tracking-wider"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                RESTRICTED: {zone.name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
