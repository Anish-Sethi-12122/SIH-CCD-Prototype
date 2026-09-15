import React, { useEffect, useState } from 'react';
import { api, type VideoSource } from '../services/api';
import { useSurveillanceStore } from '../store';

interface Props {
  onEntered: () => void;
}

export const StartupScreen: React.FC<Props> = ({ onEntered }) => {
  const [videos, setVideos] = useState<VideoSource[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [starting, setStarting] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const beginSession = useSurveillanceStore(state => state.beginSession);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const available = await api.getVideos();
        setVideos(available);
        setSelectedVideoId(available[0]?.id ?? '');
      } catch {
        setLoadFailed(true);
      }
    };
    loadVideos();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 12
    ? 'Good morning, Operator'
    : hour >= 12 && hour < 18
      ? 'Good afternoon, Operator'
      : 'Good evening, Operator';
  const selected = videos.find(video => video.id === selectedVideoId);

  const enter = async () => {
    if (!selectedVideoId) return;
    setStarting(true);
    try {
      const session = await api.startCamera(selectedVideoId);
      beginSession(session.session_id, session.camera_id, session.camera_code);
      onEntered();
    } catch {
      setLoadFailed(true);
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-900 px-5 font-mono text-gray-200">
      <section className="w-full max-w-sm border border-surface-600 bg-surface-800 px-8 py-9 shadow-2xl">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <img src="/operator-mark.svg" alt="" className="h-7 w-7" />
            <h1 className="text-xl font-bold tracking-[0.16em] text-white">OPERATOR DASHBOARD</h1>
          </div>
          <p className="mt-4 text-sm text-gray-400">{greeting}</p>
        </div>
        <div className="my-7 h-px bg-surface-600" />
        <p className="text-center text-xs tracking-[0.16em] text-gray-500">SELECT CAMERA FEED</p>
        {videos.length > 0 ? (
          <div className="mt-6 space-y-5">
            <select aria-label="Select camera feed" value={selectedVideoId} onChange={event => setSelectedVideoId(event.target.value)} className="w-full cursor-pointer appearance-none border border-surface-500 bg-surface-900 p-3 text-center text-sm text-gray-200 outline-none focus:border-gray-300" style={{ textAlignLast: 'center' }}>
              {videos.map(video => <option key={video.id} value={video.id}>{video.name}</option>)}
            </select>
            <div className="text-center text-xs text-gray-500">Source:<span className="mt-1 block truncate px-2 text-gray-400">{selected?.filename}</span></div>
            <button onClick={enter} disabled={starting} className="mt-2 flex w-full items-center justify-center bg-gray-100 px-6 py-3 text-sm font-bold tracking-[0.16em] text-black transition-colors hover:bg-white disabled:opacity-50">
              {starting ? 'INITIALIZING...' : '[ ENTER ]'}
            </button>
          </div>
        ) : (
          <div className="mt-6 border border-alert-warning bg-alert-warning/10 p-4 text-center text-xs leading-5 text-alert-warning">
            {loadFailed ? 'CAMERA FEED DISCOVERY UNAVAILABLE' : 'NO CAMERA FEEDS AVAILABLE'}<br /><br />Place a video in data/videos/ to continue.
          </div>
        )}
      </section>
    </main>
  );
};
