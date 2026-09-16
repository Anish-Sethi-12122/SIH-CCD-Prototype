import React, { useRef, useCallback, useState } from 'react';
import { VideoOff } from 'lucide-react';
import { useSurveillanceStore } from '../store';
import { TrackOverlay } from './TrackOverlay';
import { ZoneDrawer } from './ZoneDrawer';
import { ZoneOverlay } from './ZoneOverlay';

export const VideoFeed: React.FC = () => {
  const { frameData, systemStatus, nightVisionEnabled, isDrawingZone } = useSurveillanceStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ w: 0, h: 0 });
  const [dotCount, setDotCount] = useState(3);

  React.useEffect(() => {
    if (systemStatus.feed !== 'unavailable') return;
    const interval = setInterval(() => {
      setDotCount(prev => (prev >= 5 ? 3 : prev + 1));
    }, 500);
    return () => clearInterval(interval);
  }, [systemStatus.feed]);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const feedUnavailable = systemStatus.feed === 'unavailable';
  const hasFrame = !!frameData?.image;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden rounded-lg"
      style={{ minHeight: '300px' }}
    >
      {/* Scanline overlay for military aesthetic */}
      <div className="absolute inset-0 scanline pointer-events-none z-10" />

      {feedUnavailable || !hasFrame ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-900">
          <VideoOff className="w-12 h-12 text-alert-critical mb-3" />
          <div className="text-alert-critical font-mono text-lg font-bold tracking-widest">VIDEO FEED NOT FOUND</div>
          <div className="text-gray-500 text-xs mt-1 font-mono">
            {feedUnavailable ? 'CAMERA OFFLINE — ATTEMPTING RECOVERY' : 'WAITING FOR STREAM...'}
          </div>
          {feedUnavailable && (
            <div className="mt-3 flex gap-1 justify-center w-12">
              {[...Array(dotCount)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-alert-critical"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <img
            src={`data:image/jpeg;base64,${frameData.image}`}
            alt="Camera feed"
            className={`absolute inset-0 w-full h-full object-contain ${
              nightVisionEnabled ? 'hue-rotate-90 saturate-50 brightness-90' : ''
            }`}
            style={{ imageRendering: 'crisp-edges' }}
          />
          {/* Overlays — rendered in canvas coordinate space */}
          <ZoneOverlay containerSize={containerSize} />
          <TrackOverlay containerSize={containerSize} />
        </>
      )}

      {/* Zone drawing overlay */}
      {isDrawingZone && <ZoneDrawer containerSize={containerSize} />}

      {/* Corner decorations */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-accent/60 pointer-events-none z-20" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent/60 pointer-events-none z-20" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent/60 pointer-events-none z-20" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent/60 pointer-events-none z-20" />
    </div>
  );
};
