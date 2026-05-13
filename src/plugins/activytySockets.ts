// services/activitySocket.ts
import { ref } from "vue";

type EventType = "price" | "alert" | "transaction" | "metric" | "system";

export interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  data?: {
    price?: number;
    change?: number;
    amount?: number;
    from?: string;
    to?: string;
    symbol?: string;
    volume?: number;
  };
}

class ActivityWebSocket {
  private socket: WebSocket | null = null;
  private subscribers: Map<string, Set<(event: ActivityEvent) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(private url: string) {}

  connect() {
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log("Activity WebSocket connected");
        this.reconnectAttempts = 0;
        this.subscribeToChannels();
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.socket.onerror = (error) => {
        console.error("Activity WebSocket error:", error);
      };

      this.socket.onclose = () => {
        console.log("Activity WebSocket disconnected");
        this.reconnect();
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      this.reconnect();
    }
  }

  private subscribeToChannels() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const channels = ["price_alerts", "transactions", "system_events", "metric_updates"];
    channels.forEach((channel) => {
      this.socket?.send(
        JSON.stringify({
          type: "subscribe",
          channel: channel,
        }),
      );
    });
  }

  private handleMessage(data: any) {
    // Transform different data formats to ActivityEvent
    const event = this.transformToActivityEvent(data);

    // Notify all subscribers
    this.subscribers.forEach((callbacks) => {
      callbacks.forEach((callback) => callback(event));
    });
  }

  private transformToActivityEvent(data: any): ActivityEvent {
    // Handle different message types
    if (data.type === "price") {
      return {
        id: `${Date.now()}_${Math.random()}`,
        type: "price",
        title: `${data.symbol} Price Alert`,
        description: `${data.symbol} price ${data.change > 0 ? "increased" : "decreased"} to $${data.price.toLocaleString()}`,
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        data: {
          price: data.price,
          change: data.change,
          symbol: data.symbol,
        },
      };
    }

    if (data.type === "trade") {
      return {
        id: `${Date.now()}_${Math.random()}`,
        type: "transaction",
        title: "Trade Executed",
        description: `${data.side === "buy" ? "Bought" : "Sold"} ${data.amount} ${data.symbol} at $${data.price.toLocaleString()}`,
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        data: {
          amount: data.amount,
          price: data.price,
          from: data.from,
          to: data.to,
        },
      };
    }

    if (data.type === "alert") {
      return {
        id: `${Date.now()}_${Math.random()}`,
        type: "alert",
        title: "Technical Alert",
        description: data.message,
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        data: data.metadata,
      };
    }

    // Default event
    return {
      id: `${Date.now()}_${Math.random()}`,
      type: "system",
      title: "System Update",
      description: data.message || "New system event",
      timestamp: new Date(Date.now()),
      read: false,
    };
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`Reconnecting attempt ${this.reconnectAttempts}...`);
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  subscribe(eventType: string, callback: (event: ActivityEvent) => void) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);
  }

  unsubscribe(eventType: string, callback: (event: ActivityEvent) => void) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Singleton instance
export const activitySocket = new ActivityWebSocket("wss://your-websocket-server.com/activity");
