export interface Track {
  track_id: number;
  bbox: [number, number, number, number];
  bbox_norm: [number, number, number, number];
  centroid_norm: [number, number];
  confidence: number;
  class_id: number;
  object_type: 'human' | 'vehicle';
  object_class: string;
  track_uid: string;
  state: 'active' | 'temporarily_missed' | 'exited';
}

export interface TrackedEntity {
  id: string;
  internal_id?: string;
  session_id?: string;
  track_uid: string;
  track_id: number;
  camera_id: string;
  object_type: 'human' | 'vehicle';
  object_class: string;
  confidence: number;
  first_seen: string;
  last_seen: string;
  in_frame: boolean;
  status: 'IN_FRAME' | 'OUT_OF_FRAME' | 'SUSPICIOUS';
  mock_name?: string;
  mock_age?: number;
  mock_id_doc?: string;
  mock_vehicle_color?: string;
  mock_plate?: string;
  identity_state?: 'NO_MATCH' | 'CANDIDATE' | 'VERIFIED';
  identity_match_score?: number;
  anpr_state?: 'READ' | 'UNREADABLE' | 'UNAVAILABLE';
  anpr_reason?: string;
}

export interface Alert {
  id: string;
  internal_id?: string;
  session_id?: string;
  event_id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  camera_id?: string;
  camera_code?: string;
  track_id?: number;
  track_uid?: string;
  object_type?: 'human' | 'vehicle';
  zone_id?: string;
  status: 'active' | 'acknowledged' | 'false_positive';
  operator_note?: string;
  operator_correction?: { operator_disposition: string; values: Record<string, string | number>; operator_note?: string; recorded_at: string } | null;
  created_at: string;
  acknowledged_at?: string;
}

export interface Zone {
  id: string;
  camera_id: string;
  camera_code?: string;
  name: string;
  polygon: [number, number][]; // normalized [0-1]
  active: boolean;
  created_at: string;
}

export interface FramePayload {
  image: string; // base64 JPEG
  frame_num: number;
  total_frames: number;
  fps: number;
  is_live: boolean;
  behind_live_seconds: number;
  camera_id: string;
  camera_code?: string;
  session_id?: string;
  frame_w?: number;
  frame_h?: number;
}

export interface TracksPayload {
  tracks: Track[];
  camera_id: string;
  session_id?: string;
  alerted_track_ids: number[];
  timestamp: string;
}

export interface WSMessage {
  type: 'frame' | 'tracks' | 'alert' | 'alert_update' | 'intrusion_event' | 'status' | 'zone_update' | 'heartbeat';
  payload: any;
}

export interface SystemStatus {
  feed: 'live' | 'paused' | 'unavailable';
  camera_id?: string;
  camera_code?: string;
}

export type Severity = 'info' | 'warning' | 'critical';
