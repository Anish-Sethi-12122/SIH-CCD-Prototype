import type { WSMessage } from '../types';

const WS_URL = 'ws://localhost:8000/ws';

type MessageHandler = (msg: WSMessage) => void;

class WSService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldConnect = false;

  connect() {
    this.shouldConnect = true;
    this._connect();
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private _connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.ws = new WebSocket(WS_URL);

    this.ws.onmessage = (e) => {
      try {
        const msg: WSMessage = JSON.parse(e.data);
        this.handlers.forEach(h => h(msg));
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };

    this.ws.onclose = () => {
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(() => this._connect(), 2000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

export const wsService = new WSService();
