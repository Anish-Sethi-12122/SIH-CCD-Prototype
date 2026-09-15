const BASE = 'http://localhost:8000/api';

export interface VideoSource {
  id: string;
  name: string;
  camera_code: string;
  filename: string;
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as T;
}

export const api = {
  health: () => req<any>('/health'),
  status: () => req<any>('/status'),

  // Camera / pipeline
  getVideos: () => req<VideoSource[]>('/videos'),
  startCamera: (videoId: string) => req<{ session_id: string; camera_id: string; camera_code: string }>('/cameras/start', {
    method: 'POST', 
    body: JSON.stringify({ video_id: videoId })
  }),
  stopCamera: () => req<any>('/cameras/stop', { method: 'POST' }),
  pauseCamera: () => req<any>('/cameras/pause', { method: 'POST' }),
  resumeCamera: () => req<any>('/cameras/resume', { method: 'POST' }),
  goLive: () => req<any>('/cameras/golive', { method: 'POST' }),
  restartCamera: () => req<any>('/cameras/restart', { method: 'POST' }),
  simulateFailure: () => req<any>('/cameras/simulate-failure', { method: 'POST' }),
  recoverCamera: () => req<any>('/cameras/recover', { method: 'POST' }),

  updatePipelineSettings: (s: Record<string, boolean>) =>
    req<any>('/pipeline/settings', { method: 'POST', body: JSON.stringify(s) }),

  // Zones
  getZones: (cameraId?: string) => req<any[]>(`/zones${cameraId ? `?camera_id=${cameraId}` : ''}`),
  createZone: (data: { camera_id: string; name: string; polygon: number[][] }) =>
    req<any>('/zones', { method: 'POST', body: JSON.stringify(data) }),
  deleteZone: (id: string) => req<any>(`/zones/${id}`, { method: 'DELETE' }),
  toggleZone: (id: string, active: boolean) =>
    req<any>(`/zones/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ active }) }),

  // Alerts
  getAlerts: (limit = 50, offset = 0) => req<any[]>(`/alerts?limit=${limit}&offset=${offset}`),
  getAlert: (id: string) => req<any>(`/alerts/${id}`),
  alertFeedback: (id: string, status: string, note?: string, correction?: Record<string, string | number>) =>
    req<any>(`/alerts/${id}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify({ status, operator_note: note, operator_correction: correction }),
    }),

  // Tracks
  getTracks: (cameraId?: string, inFrame?: boolean) => {
    const params = new URLSearchParams();
    if (cameraId) params.set('camera_id', cameraId);
    if (inFrame !== undefined) params.set('in_frame', String(inFrame));
    return req<any[]>(`/tracks?${params}`);
  },
};
