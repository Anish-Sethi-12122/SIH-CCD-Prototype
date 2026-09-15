import React, { useState, useCallback, useRef } from 'react';
import { useSurveillanceStore } from '../store';
import { api } from '../services/api';

interface Props {
  containerSize: { w: number; h: number };
}

export const ZoneDrawer: React.FC<Props> = ({ containerSize }) => {
  const { cameraId, setIsDrawingZone, addOrUpdateZone, frameData } = useSurveillanceStore();
  const [points, setPoints] = useState<[number, number][]>([]);
  const [hovering, setHovering] = useState<[number, number] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nativeW = frameData?.frame_w || 1280;
  const nativeH = frameData?.frame_h || 720;
  const scale = Math.min(containerSize.w / nativeW, containerSize.h / nativeH);
  const displayW = nativeW * scale;
  const displayH = nativeH * scale;
  const offsetX = (containerSize.w - displayW) / 2;
  const offsetY = (containerSize.h - displayH) / 2;

  const toNorm = (px: number, py: number): [number, number] => {
    // Clamp to valid image area
    const clampedPx = Math.max(offsetX, Math.min(offsetX + displayW, px));
    const clampedPy = Math.max(offsetY, Math.min(offsetY + displayH, py));
    return [
      (clampedPx - offsetX) / displayW,
      (clampedPy - offsetY) / displayH,
    ];
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setPoints(prev => [...prev, toNorm(px, py)]);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // Only show hover cursor if inside image bounds
    if (px >= offsetX && px <= offsetX + displayW && py >= offsetY && py <= offsetY + displayH) {
      setHovering([px, py]);
    } else {
      setHovering(null);
    }
  };

  const handleSave = async () => {
    if (points.length < 3) return;
    const name = `Zone ${new Date().toLocaleTimeString()}`;
    try {
      const zone = await api.createZone({ camera_id: cameraId, name, polygon: points });
      addOrUpdateZone(zone);
      setIsDrawingZone(false);
      setPoints([]);
    } catch (e) {
      console.error('Failed to save zone', e);
    }
  };

  const pixelPoints = points.map(([nx, ny]) => [
    offsetX + nx * displayW,
    offsetY + ny * displayH,
  ] as [number, number]);

  const allPoints = hovering ? [...pixelPoints, hovering] : pixelPoints;
  const polyStr = allPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div className="absolute inset-0 z-30">
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      >
        {allPoints.length >= 2 && (
          <polygon
            points={polyStr}
            fill="rgba(245,158,11,0.15)"
            stroke="var(--color-alert-warning)"
            strokeWidth={2}
            strokeDasharray="6 3"
          />
        )}
        {pixelPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill="var(--color-alert-warning)" stroke="var(--color-surface-900)" strokeWidth={1.5} />
        ))}
      </svg>
      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-40">
        <div className="bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-xs text-gray-300 font-mono">
          {points.length < 3 ? `Click to add points (${points.length}/3 min)` : `${points.length} points — save or keep clicking`}
        </div>
        {points.length >= 3 && (
          <button onClick={handleSave} className="btn-primary text-xs">
            Save Zone
          </button>
        )}
        <button
          onClick={() => { setIsDrawingZone(false); setPoints([]); }}
          className="btn-ghost text-xs border border-surface-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
