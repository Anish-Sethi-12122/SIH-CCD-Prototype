import { useEffect } from 'react';
import { wsService } from '../services/ws';
import { useSurveillanceStore } from '../store';
import type { WSMessage, Alert, Zone } from '../types';

export function useWebSocket(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    wsService.connect();

    const unsub = wsService.subscribe((msg: WSMessage) => {
      if (msg.type !== 'frame') console.log("WS received:", msg.type);
      const currentState = useSurveillanceStore.getState();
      const messageSessionId = msg.payload?.session_id;
      if (messageSessionId && messageSessionId !== currentState.sessionId) return;
      switch (msg.type) {
        case 'frame': {
          const payload = msg.payload;
          if (payload.session_id !== currentState.sessionId) return;
          currentState.setFrame(payload);
          break;
        }
        case 'tracks':
          useSurveillanceStore.getState().setTracks(msg.payload.tracks, msg.payload.alerted_track_ids ?? []);
          if (msg.payload.camera_id && !useSurveillanceStore.getState().cameraId) {
            useSurveillanceStore.getState().setCameraId(msg.payload.camera_id);
          }
          if (msg.payload.camera_code) useSurveillanceStore.getState().setCameraCode(msg.payload.camera_code);
          break;
        case 'alert':
          useSurveillanceStore.getState().addAlert(msg.payload as Alert);
          break;
        case 'alert_update':
          useSurveillanceStore.getState().updateAlertStatus(msg.payload.id, msg.payload.status, msg.payload.operator_note);
          break;
        case 'status':
          useSurveillanceStore.getState().setSystemStatus(msg.payload);
          if (msg.payload.camera_id) useSurveillanceStore.getState().setCameraId(msg.payload.camera_id);
          if (msg.payload.camera_code) useSurveillanceStore.getState().setCameraCode(msg.payload.camera_code);
          break;
        case 'zone_update': {
          const { action, zone, zone_id } = msg.payload;
          if (action === 'deleted') useSurveillanceStore.getState().removeZone(zone_id);
          else if (zone) useSurveillanceStore.getState().addOrUpdateZone(zone as Zone);
          break;
        }
        default:
          break;
      }
    });

    return () => {
      unsub();
      // Don't disconnect on component unmount — keep WS alive for app lifetime
    };
  }, [enabled]);
}
