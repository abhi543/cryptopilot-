type MessageHandler = (data: any) => void;

class LiveFeedSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;

  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/feed";
  }

  public connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("WebSocket connected to CryptoPilot feed:", this.url);
        this.emit("status", { connected: true });
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          if (event.data === "pong") return;
          const parsed = JSON.parse(event.data);
          if (parsed.type) {
            this.emit(parsed.type, parsed.data);
          }
          this.emit("all", parsed);
        } catch (e) {
          console.warn("Failed to parse websocket message", event.data);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed, attempting reconnect in 3s...");
        this.emit("status", { connected: false });
        this.cleanup();
        this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (error) => {
        console.warn("WebSocket error:", error);
      };
    } catch (e) {
      console.error("WebSocket connection failure:", e);
    }
  }

  public on(event: string, handler: MessageHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off(event: string, handler: MessageHandler) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((handler) => handler(data));
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("ping");
      }
    }, 15000);
  }

  private stopPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  private cleanup() {
    this.stopPing();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
  }

  public disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const liveFeed = new LiveFeedSocket();
