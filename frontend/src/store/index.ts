import { create } from 'zustand';
import type { Alert, Track, Zone, FramePayload, SystemStatus } from '../types';

interface SurveillanceState {
  // Live frame
  frameData: FramePayload | null;
  setFrame: (f: FramePayload) => void;

  // Tracks
  liveTracks: Track[];
  alertedTrackIds: Set<number>;
  setTracks: (tracks: Track[], alerted: number[]) => void;

  // Alerts
  alerts: Alert[];
  unreadAlertCount: number;
  addAlert: (a: Alert) => void;
  setAlerts: (alerts: Alert[]) => void;
  updateAlertStatus: (id: string, status: string, note?: string) => void;
  markAlertsRead: () => void;

  // Selected
  selectedTrack: Track | null;
  selectedAlert: Alert | null;
  setSelectedTrack: (t: Track | null) => void;
  setSelectedAlert: (a: Alert | null) => void;

  // System
  systemStatus: SystemStatus;
  setSystemStatus: (s: SystemStatus) => void;
  cameraId: string;
  setCameraId: (id: string) => void;
  cameraCode: string;
  setCameraCode: (code: string) => void;
  sessionId: string | null;
  setSessionId: (id: string) => void;
  beginSession: (sessionId: string, cameraId: string, cameraCode: string) => void;
  resetSession: () => void;

  // Zones
  zones: Zone[];
  setZones: (z: Zone[]) => void;
  addOrUpdateZone: (z: Zone) => void;
  removeZone: (id: string) => void;

  // UI settings
  detectionEnabled: boolean;
  trackingEnabled: boolean;
  fencingEnabled: boolean;
  anprEnabled: boolean;
  identityEnabled: boolean;
  nightVisionEnabled: boolean;
  showBboxes: boolean;
  toggleSetting: (key: string) => void;

  // Drawing
  isDrawingZone: boolean;
  setIsDrawingZone: (v: boolean) => void;
}

export const useSurveillanceStore = create<SurveillanceState>((set, get) => ({
  frameData: null,
  setFrame: (f) => set({ frameData: f }),

  liveTracks: [],
  alertedTrackIds: new Set(),
  setTracks: (tracks, alerted) => set(state => {
    const next = new Map(state.liveTracks.map(track => [track.track_id, track]));
    for (const track of tracks) {
      if (track.state === 'exited') next.delete(track.track_id);
      else next.set(track.track_id, track);
    }
    return { liveTracks: [...next.values()], alertedTrackIds: new Set(alerted) };
  }),

  alerts: [],
  unreadAlertCount: 0,
  addAlert: (a) => set(s => {
    if (s.alerts.some(existing => existing.id === a.id || existing.event_id === a.event_id)) return s;
    return { alerts: [a, ...s.alerts], unreadAlertCount: s.unreadAlertCount + 1 };
  }),
  setAlerts: (alerts) => set({ alerts }),
  updateAlertStatus: (id, status, note) =>
    set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, status: status as any, operator_note: note } : a) })),
  markAlertsRead: () => set({ unreadAlertCount: 0 }),

  selectedTrack: null,
  selectedAlert: null,
  setSelectedTrack: (t) => set({ selectedTrack: t }),
  setSelectedAlert: (a) => set({ selectedAlert: a }),

  systemStatus: { feed: 'live' },
  setSystemStatus: (s) => set({ systemStatus: s }),
  cameraId: '',
  setCameraId: (id) => set({ cameraId: id }),
  cameraCode: '',
  setCameraCode: (code) => set({ cameraCode: code }),
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),
  beginSession: (sessionId, cameraId, cameraCode) => set({
    sessionId,
    cameraId,
    cameraCode,
    frameData: null,
    liveTracks: [],
    alertedTrackIds: new Set(),
    alerts: [],
    unreadAlertCount: 0,
    selectedTrack: null,
    selectedAlert: null,
    zones: [],
    isDrawingZone: false,
    systemStatus: { feed: 'live', camera_id: cameraId, camera_code: cameraCode } as any,
  }),
  resetSession: () => set({
    frameData: null,
    liveTracks: [],
    alertedTrackIds: new Set(),
    alerts: [],
    unreadAlertCount: 0,
    selectedTrack: null,
    selectedAlert: null,
    zones: [],
    cameraId: '',
    cameraCode: '',
    sessionId: null,
    isDrawingZone: false,
    systemStatus: { feed: 'unavailable' },
  }),

  zones: [],
  setZones: (z) => set({ zones: z }),
  addOrUpdateZone: (z) => set(s => {
    const existing = s.zones.findIndex(x => x.id === z.id);
    if (existing >= 0) {
      const next = [...s.zones];
      next[existing] = z;
      return { zones: next };
    }
    return { zones: [...s.zones, z] };
  }),
  removeZone: (id) => set(s => ({ zones: s.zones.filter(z => z.id !== id) })),

  detectionEnabled: true,
  trackingEnabled: true,
  fencingEnabled: true,
  anprEnabled: true,
  identityEnabled: true,
  nightVisionEnabled: false,
  showBboxes: true,
  toggleSetting: (key) => set(s => ({ [key]: !(s as any)[key] } as any)),

  isDrawingZone: false,
  setIsDrawingZone: (v) => set({ isDrawingZone: v }),
}));
