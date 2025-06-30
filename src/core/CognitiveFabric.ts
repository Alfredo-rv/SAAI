/**
 * Cognitive Fabric - Bus de eventos cuántico
 * Sistema de comunicación ultra-baja latencia simulado para WebContainer
 */

export interface CognitiveEvent {
  id: string;
  eventType: EventType;
  source: string;
  target?: string;
  timestamp: Date;
  payload: any;
  priority: EventPriority;
  correlationId?: string;
}

export enum EventType {
  SystemMetrics = 'system_metrics',
  AgentCommand = 'agent_command',
  ConsensusVote = 'consensus_vote',
  MutationRequest = 'mutation_request',
  HealthCheck = 'health_check',
  SecurityAlert = 'security_alert',
  UserInteraction = 'user_interaction',
  NanoCoreStatus = 'nano_core_status'
}

export enum EventPriority {
  Critical = 0,
  High = 1,
  Normal = 2,
  Low = 3
}

export type EventHandler = (event: CognitiveEvent) => void | Promise<void>;

/**
 * Cliente del Cognitive Fabric simulado
 */
export class CognitiveFabricClient {
  private subscriptions: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: CognitiveEvent[] = [];
  private isConnected = false;
  private clientId: string;

  constructor() {
    this.clientId = `saai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect(): Promise<void> {
    // Simular conexión
    await new Promise(resolve => setTimeout(resolve, 100));
    this.isConnected = true;
    console.log(`🧠 Cognitive Fabric conectado: ${this.clientId}`);
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Cliente no conectado al Cognitive Fabric');
    }

    const event: CognitiveEvent = {
      id: this.generateEventId(),
      eventType: this.getEventTypeFromSubject(subject),
      source: this.clientId,
      timestamp: new Date(),
      payload: data,
      priority: EventPriority.Normal
    };

    // Almacenar en historial
    this.eventHistory.push(event);
    
    // Mantener solo los últimos 1000 eventos
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    // Notificar suscriptores
    const handlers = this.subscriptions.get(subject);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error en handler para ${subject}:`, error);
        }
      }
    }

    console.log(`📤 Evento publicado: ${subject}`, event);
  }

  async subscribe(subject: string, handler: EventHandler): Promise<void> {
    if (!this.subscriptions.has(subject)) {
      this.subscriptions.set(subject, new Set());
    }
    
    this.subscriptions.get(subject)!.add(handler);
    console.log(`📥 Suscrito a: ${subject}`);
  }

  async unsubscribe(subject: string, handler?: EventHandler): Promise<void> {
    if (handler) {
      this.subscriptions.get(subject)?.delete(handler);
    } else {
      this.subscriptions.delete(subject);
    }
    console.log(`📤 Desuscrito de: ${subject}`);
  }

  getEventHistory(): CognitiveEvent[] {
    return [...this.eventHistory];
  }

  getStatistics() {
    const eventsByType = this.eventHistory.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      subscriptions: this.subscriptions.size,
      isConnected: this.isConnected
    };
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEventTypeFromSubject(subject: string): EventType {
    if (subject.includes('metrics')) return EventType.SystemMetrics;
    if (subject.includes('agent')) return EventType.AgentCommand;
    if (subject.includes('consensus')) return EventType.ConsensusVote;
    if (subject.includes('mutation')) return EventType.MutationRequest;
    if (subject.includes('health')) return EventType.HealthCheck;
    if (subject.includes('security')) return EventType.SecurityAlert;
    if (subject.includes('nano-core')) return EventType.NanoCoreStatus;
    return EventType.UserInteraction;
  }

  async shutdown(): Promise<void> {
    this.subscriptions.clear();
    this.isConnected = false;
    console.log('✅ Cognitive Fabric desconectado');
  }
}

/**
 * Fabric principal del sistema
 */
export class CognitiveFabric {
  private client: CognitiveFabricClient;
  private eventStats = {
    totalEvents: 0,
    averageLatency: 0,
    errorCount: 0
  };

  constructor() {
    this.client = new CognitiveFabricClient();
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async publishEvent(event: Partial<CognitiveEvent>): Promise<void> {
    const startTime = performance.now();
    
    try {
      await this.client.publish(
        this.getSubjectForEvent(event.eventType!),
        event.payload
      );
      
      const latency = performance.now() - startTime;
      this.updateStats(latency, false);
    } catch (error) {
      this.updateStats(0, true);
      throw error;
    }
  }

  async subscribe(subject: string, handler: EventHandler): Promise<void> {
    await this.client.subscribe(subject, handler);
  }

  getStatistics() {
    return {
      ...this.eventStats,
      ...this.client.getStatistics()
    };
  }

  private getSubjectForEvent(eventType: EventType): string {
    const subjectMap = {
      [EventType.SystemMetrics]: 'saai.metrics',
      [EventType.AgentCommand]: 'saai.agents.commands',
      [EventType.ConsensusVote]: 'saai.consensus.votes',
      [EventType.MutationRequest]: 'saai.meca.mutations',
      [EventType.HealthCheck]: 'saai.health',
      [EventType.SecurityAlert]: 'saai.security.alerts',
      [EventType.UserInteraction]: 'saai.ui.interactions',
      [EventType.NanoCoreStatus]: 'saai.nano-cores.status'
    };
    
    return subjectMap[eventType] || 'saai.general';
  }

  private updateStats(latency: number, isError: boolean): void {
    this.eventStats.totalEvents++;
    
    if (isError) {
      this.eventStats.errorCount++;
    } else {
      // Calcular latencia promedio (media móvil)
      this.eventStats.averageLatency = 
        (this.eventStats.averageLatency * (this.eventStats.totalEvents - 1) + latency) 
        / this.eventStats.totalEvents;
    }
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
  }
}