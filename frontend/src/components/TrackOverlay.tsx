import React from 'react';
import { useSurveillanceStore } from '../store';
import type { Track } from '../types';

interface Props {
  containerSize: { w: number; h: number };
}

export const TrackOverlay: React.FC<Props> = ({ containerSize }) => {
  const { liveTracks, alertedTrackIds, frameData, selectedTrack, setSelectedTrack, showBboxes } = useSurveillanceStore();

  if (!showBboxes || !frameData || containerSize.w === 0) return null;

  // Compute letterbox offsets (object-contain)
  const nativeW = frameData.frame_w || 1280;
  const nativeH = frameData.frame_h || 720;
  const scale = Math.min(containerSize.w / nativeW, containerSize.h / nativeH);
  const displayW = nativeW * scale;
  const displayH = nativeH * scale;
  const offsetX = (containerSize.w - displayW) / 2;
  const offsetY = (containerSize.h - displayH) / 2;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {liveTracks.map(track => (
        <TrackBox
          key={track.track_id}
          track={track}
          isAlerted={alertedTrackIds.has(track.track_id)}
          isSelected={selectedTrack?.track_id === track.track_id}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
          onSelect={(t) => setSelectedTrack(selectedTrack?.track_id === t.track_id ? null : t)}
        />
      ))}
    </div>
  );
};

const TrackBox = ({
  track, isAlerted, isSelected, scale, offsetX, offsetY, onSelect
}: {
  track: Track; isAlerted: boolean; isSelected: boolean;
  scale: number; offsetX: number; offsetY: number;
  onSelect: (t: Track) => void;
}) => {
  const [x1, y1, x2, y2] = track.bbox;
  const left = offsetX + x1 * scale;
  const top = offsetY + y1 * scale;
  const width = (x2 - x1) * scale;
  const height = (y2 - y1) * scale;

  const color = isAlerted ? 'var(--color-track-alerted)' : 'var(--color-track-normal)';
  const label = `${track.track_uid} ${track.object_class}`;

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer"
      style={{ left, top, width, height, transition: 'left 120ms linear, top 120ms linear, width 120ms linear, height 120ms linear', opacity: track.state === 'temporarily_missed' ? 0.65 : 1 }}
      onClick={() => onSelect(track)}
    >
      {/* Box */}
      <div
        className="absolute inset-0 transition-all duration-100"
        style={{
          border: `${isAlerted ? 2 : 1}px solid ${color}`,
          backgroundColor: isAlerted ? 'color-mix(in srgb, var(--color-track-alerted) 10%, transparent)' : 'transparent',
          animation: isAlerted ? 'pulse 2s infinite' : undefined,
        }}
      />
      {/* Label */}
      <div
        className="absolute top-0 left-0 -translate-y-full text-[10px] font-mono px-1 py-0.5 whitespace-nowrap"
        style={{ background: 'var(--color-surface-900)', color, border: `1px solid ${color}`, borderBottom: 'none' }}
      >
        {label}
      </div>
      {/* Corner markers when selected */}
      {isSelected && (
        <div
          className="absolute inset-0 rounded-sm"
          style={{ border: `2px dashed ${color}`, opacity: 0.7 }}
        />
      )}
    </div>
  );
};
