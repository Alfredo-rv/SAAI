/**
 * Sistema SAAI Local - Orquestador principal sin dependencias externas
 */

import { LocalCognitiveFabric } from '../core/local/LocalCognitiveFabric';
import { LocalResourceMonitor } from '../core/local/LocalResourceMonitor';
import { LocalPerceptionAgent } from '../agents/local/LocalPerceptionAgent';
import { LocalMemoryAgent } from '../agents/local/LocalMemoryAgent';
import { LocalActionAgent } from '../agents/local/LocalActionAgent';
import { LocalEvolutionEngine } from '../meca/local/LocalEvolutionEngine';

export interface LocalSystemState {
  isInitialized: boolean;
  isRunning: boolean;
  components: {
    fabric: boolean;
    monitor: boolean;
    perception: boolean;
    memory: boolean;
    action: boolean;
    evolution: boolean;
  };
  resources: any;
  capabilities: any;
  stats: any;
}

export class LocalSAAISystem {
  private fabric: LocalCognitiveFabric;
  private resourceMonitor: LocalResourceMonitor;
  private perceptionAgent: LocalPerceptionAgent;
  private memoryAgent: LocalMemoryAgent;
  private actionAgent: LocalActionAgent;
  private evolutionEngine: LocalEvolutionEngine;
  
  private state: LocalSystemState = {
    isInitialized: false,
    isRunning: false,
    components: {
      fabric: false,
      monitor: false,
      perception: false,
      memory: false,
      action: false,
      evolution: false
    },
    resources: {},
    capabilities: {},
    stats: {}
  };

  constructor() {
    this.fabric = new LocalCognitiveFabric();
    this.resourceMonitor = new LocalResourceMonitor();
    this.perceptionAgent = new LocalPerceptionAgent(this.fabric);
    this.memoryAgent = new LocalMemoryAgent(this.fabric);
    this.actionAgent = new LocalActionAgent(this.fabric);
    this.evolutionEngine = new LocalEvolutionEngine(this.fabric);
  }

  async initialize(): Promise<void> {
    console.log('Initializing Local SAAI System');
    
    try {
      // Inicializar Cognitive Fabric
      await this.fabric.initialize();
      this.state.components.fabric = true;
      
      // Inicializar Monitor de Recursos
      await this.resourceMonitor.initialize();
      this.state.components.monitor = true;
      
      // Inicializar Agentes
      await this.perceptionAgent.initialize();
      this.state.components.perception = true;
      
      await this.memoryAgent.initialize();
      this.state.components.memory = true;
      
      await this.actionAgent.initialize();
      this.state.components.action = true;
      
      // Inicializar Motor de Evolución
      await this.evolutionEngine.initialize();
      this.state.components.evolution = true;
      
      this.state.isInitialized = true;
      console.log('Local SAAI System initialized');
      
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('System not initialized');
    }

    // Iniciar monitoreo de recursos
    this.resourceMonitor.startMonitoring((resources) => {
      this.state.resources = resources;
      this.fabric.publish('system.resources', resources);
    });

    // Obtener capacidades de percepción
    this.state.capabilities = this.perceptionAgent.getCapabilities();

    this.state.isRunning = true;
    console.log('Local SAAI System started');
  }

  async stop(): Promise<void> {
    this.resourceMonitor.stopMonitoring();
    await this.evolutionEngine.stopEvolution();
    
    this.state.isRunning = false;
    console.log('Local SAAI System stopped');
  }

  async executeAction(type: string, parameters: any): Promise<any> {
    const request = {
      id: `action-${Date.now()}`,
      type: type as any,
      description: `Local action: ${type}`,
      code: parameters.code || '',
      parameters,
      sandbox: true,
      timeout: 10000
    };

    return await this.actionAgent.executeAction(request);
  }

  async storeMemory(content: any, tags: string[] = [], importance: number = 0.5): Promise<string> {
    await this.fabric.publish('memory.store', { content, tags, importance });
    return 'stored';
  }

  async queryMemory(query: string, limit: number = 10): Promise<any> {
    await this.fabric.publish('memory.query', { query, limit });
    return 'queried';
  }

  async startPerception(type: 'camera' | 'audio' | 'files' | 'location'): Promise<void> {
    const commandMap = {
      camera: 'start_camera',
      audio: 'start_audio',
      files: 'read_files',
      location: 'get_location'
    };

    await this.fabric.publish('perception.commands', { 
      command: commandMap[type] 
    });
  }

  async startEvolution(): Promise<void> {
    await this.evolutionEngine.startEvolution();
  }

  async stopEvolution(): Promise<void> {
    await this.evolutionEngine.stopEvolution();
  }

  getState(): LocalSystemState {
    return { ...this.state };
  }

  getStats() {
    return {
      fabric: this.fabric.getStats(),
      perception: this.perceptionAgent.getCapabilities(),
      memory: this.memoryAgent.getMemoryStats(),
      action: this.actionAgent.getActionStats(),
      evolution: this.evolutionEngine.getStats()
    };
  }

  async shutdown(): Promise<void> {
    await this.stop();
    
    await this.evolutionEngine.shutdown();
    await this.actionAgent.shutdown();
    await this.memoryAgent.shutdown();
    await this.perceptionAgent.shutdown();
    await this.resourceMonitor.shutdown();
    await this.fabric.shutdown();
    
    this.state.isInitialized = false;
    console.log('Local SAAI System shutdown complete');
  }
}