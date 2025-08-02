/**
 * Cognitive Fabric Local - Bus de eventos local sin dependencias externas
 * Reemplaza NATS con implementación local basada en EventEmitter
 */

export interface LocalEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  payload: any;
  timestamp: Date;
}

export type EventHandler = (event: LocalEvent) => void | Promise<void>;

export class LocalCognitiveFabric {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: LocalEvent[] = [];
  private isRunning = false;
  private maxHistorySize = 1000;

  async initialize(): Promise<void> {
    this.isRunning = true;
    console.log('Local Cognitive Fabric initialized');
  }

  async publish(channel: string, payload: any): Promise<void> {
    if (!this.isRunning) return;

    const event: LocalEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: channel,
      source: 'local-fabric',
      payload,
      timestamp: new Date()
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    const handlers = this.handlers.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Handler error for ${channel}:`, error);
        }
      }
    }
  }

  async subscribe(channel: string, handler: EventHandler): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
  }

  async unsubscribe(channel: string, handler?: EventHandler): Promise<void> {
    if (handler) {
      this.handlers.get(channel)?.delete(handler);
    } else {
      this.handlers.delete(channel);
    }
  }

  getEventHistory(): LocalEvent[] {
    return [...this.eventHistory];
  }

  getStats() {
    return {
      totalEvents: this.eventHistory.length,
      activeChannels: this.handlers.size,
      isRunning: this.isRunning
    };
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.handlers.clear();
    this.eventHistory = [];
  }
}