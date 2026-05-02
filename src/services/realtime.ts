import { API_BASE } from './http';
import { notifyDataChanged } from './subscriptions';

interface RealtimeEvent {
  topic: string;
  payload?: Record<string, unknown>;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const HEARTBEAT_MS = 30000;

export function connectRealtime() {
  if (!('WebSocket' in window)) return () => {};

  let socket: WebSocket | null = null;
  let stopped = false;
  let reconnectTimer: number | undefined;
  let heartbeatTimer: number | undefined;
  let attempts = 0;

  const connect = () => {
    if (stopped) return;
    const url = realtimeUrl();
    socket = new WebSocket(url);

    socket.addEventListener('open', () => {
      attempts = 0;
      heartbeatTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
      }, HEARTBEAT_MS);
    });

    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string' || event.data === 'pong') return;
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;
        if (data.topic && data.topic !== 'realtime:ready') notifyDataChanged(data.topic);
      } catch (error) {
        console.warn('Realtime event ignored:', error);
      }
    });

    socket.addEventListener('close', scheduleReconnect);
    socket.addEventListener('error', scheduleReconnect);
  };

  const scheduleReconnect = () => {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    if (stopped || reconnectTimer) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
    attempts += 1;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  };

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    socket?.close();
  };
}

function realtimeUrl() {
  const url = new URL(`${API_BASE}/api/realtime`, window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
