/**
 * SAAI.Memory - Agente de Memoria Temporal y Permanente Neuronal
 * Sistema de memoria distribuida con grafo de conocimiento
 */

import { CognitiveFabric, EventType } from '../core/CognitiveFabric';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: any;
  timestamp: Date;
  importance: number;
  accessCount: number;
  lastAccessed: Date;
  tags: string[];
  connections: string[];
  embedding?: number[];
}

export enum MemoryType {
  Episodic = 'episodic',      // Eventos específicos
  Semantic = 'semantic',      // Conocimiento general
  Procedural = 'procedural',  // Habilidades y procedimientos
  Working = 'working',        // Memoria de trabajo temporal
  Sensory = 'sensory'        // Datos sensoriales procesados
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}

export interface GraphNode {
  id: string;
  type: string;
  data: any;
  importance: number;
  lastUpdated: Date;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  metadata?: any;
}

export interface MemoryQuery {
  query: string;
  type?: MemoryType;
  timeRange?: { start: Date; end: Date };
  importance?: { min: number; max: number };
  tags?: string[];
  limit?: number;
}

export interface MemorySearchResult {
  entries: MemoryEntry[];
  relevanceScores: number[];
  totalResults: number;
  searchTime: number;
}

/**
 * Agente de Memoria con capacidades avanzadas
 */
export class MemoryAgent {
  private fabric: CognitiveFabric;
  private shortTermMemory: Map<string, MemoryEntry> = new Map();
  private longTermMemory: Map<string, MemoryEntry> = new Map();
  private knowledgeGraph: KnowledgeGraph;
  private vectorIndex: VectorIndex;
  private forgettingCurve: ForgettingCurve;
  private isRunning = false;
  private memoryStats = {
    totalEntries: 0,
    shortTermEntries: 0,
    longTermEntries: 0,
    averageImportance: 0,
    consolidationRate: 0
  };

  constructor(fabric: CognitiveFabric) {
    this.fabric = fabric;
    this.knowledgeGraph = {
      nodes: new Map(),
      edges: new Map()
    };
    this.vectorIndex = new VectorIndex();
    this.forgettingCurve = new ForgettingCurve();
  }

  async initialize(): Promise<void> {
    console.log('🧠 Inicializando SAAI.Memory');

    // Suscribirse a eventos de memoria
    await this.fabric.subscribe('saai.memory.store', (event) => {
      this.storeMemory(event.payload);
    });

    await this.fabric.subscribe('saai.memory.query', (event) => {
      this.processQuery(event.payload);
    });

    await this.fabric.subscribe('saai.memory.commands', (event) => {
      this.processCommand(event.payload);
    });

    this.isRunning = true;
    console.log('✅ SAAI.Memory inicializado');
  }

  async processCycle(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Consolidar memorias de corto a largo plazo
      await this.consolidateMemories();
      
      // Aplicar curva de olvido
      await this.applyForgetting();
      
      // Actualizar grafo de conocimiento
      await this.updateKnowledgeGraph();
      
      // Optimizar índices
      await this.optimizeIndices();
      
      // Actualizar estadísticas
      this.updateStats();

    } catch (error) {
      console.error('❌ Error en ciclo de memoria:', error);
    }
  }

  async storeMemory(payload: any): Promise<string> {
    const { content, type, importance = 0.5, tags = [] } = payload;
    
    const memoryEntry: MemoryEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type || MemoryType.Working,
      content,
      timestamp: new Date(),
      importance,
      accessCount: 0,
      lastAccessed: new Date(),
      tags,
      connections: [],
      embedding: await this.generateEmbedding(content)
    };

    // Almacenar en memoria de corto plazo inicialmente
    this.shortTermMemory.set(memoryEntry.id, memoryEntry);
    
    // Agregar al índice vectorial
    if (memoryEntry.embedding) {
      this.vectorIndex.add(memoryEntry.id, memoryEntry.embedding);
    }

    // Crear nodo en el grafo de conocimiento
    await this.addToKnowledgeGraph(memoryEntry);

    console.log(`🧠 Memoria almacenada: ${memoryEntry.id} (${type})`);
    return memoryEntry.id;
  }

  async queryMemory(query: MemoryQuery): Promise<MemorySearchResult> {
    const startTime = Date.now();
    let results: MemoryEntry[] = [];

    // Búsqueda vectorial si hay query de texto
    if (query.query) {
      const queryEmbedding = await this.generateEmbedding(query.query);
      const vectorResults = this.vectorIndex.search(queryEmbedding, query.limit || 10);
      
      for (const result of vectorResults) {
        const memory = this.getMemoryById(result.id);
        if (memory) {
          results.push(memory);
        }
      }
    }

    // Filtrar por tipo
    if (query.type) {
      results = results.filter(entry => entry.type === query.type);
    }

    // Filtrar por rango de tiempo
    if (query.timeRange) {
      results = results.filter(entry => 
        entry.timestamp >= query.timeRange!.start && 
        entry.timestamp <= query.timeRange!.end
      );
    }

    // Filtrar por importancia
    if (query.importance) {
      results = results.filter(entry => 
        entry.importance >= query.importance!.min && 
        entry.importance <= query.importance!.max
      );
    }

    // Filtrar por tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(entry => 
        query.tags!.some(tag => entry.tags.includes(tag))
      );
    }

    // Calcular puntuaciones de relevancia
    const relevanceScores = results.map(entry => 
      this.calculateRelevance(entry, query)
    );

    // Ordenar por relevancia
    const sortedResults = results
      .map((entry, index) => ({ entry, score: relevanceScores[index] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit || 10);

    // Actualizar contadores de acceso
    for (const result of sortedResults) {
      result.entry.accessCount++;
      result.entry.lastAccessed = new Date();
    }

    const searchTime = Date.now() - startTime;

    return {
      entries: sortedResults.map(r => r.entry),
      relevanceScores: sortedResults.map(r => r.score),
      totalResults: results.length,
      searchTime
    };
  }

  private getMemoryById(id: string): MemoryEntry | undefined {
    return this.shortTermMemory.get(id) || this.longTermMemory.get(id);
  }

  private calculateRelevance(entry: MemoryEntry, query: MemoryQuery): number {
    let relevance = 0;

    // Relevancia por importancia
    relevance += entry.importance * 0.3;

    // Relevancia por recencia
    const daysSinceCreation = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-daysSinceCreation / 30); // Decae exponencialmente
    relevance += recencyScore * 0.2;

    // Relevancia por frecuencia de acceso
    const accessScore = Math.min(entry.accessCount / 10, 1);
    relevance += accessScore * 0.2;

    // Relevancia por conexiones en el grafo
    const connectionScore = Math.min(entry.connections.length / 5, 1);
    relevance += connectionScore * 0.3;

    return Math.min(relevance, 1);
  }

  private async consolidateMemories(): Promise<void> {
    const consolidationThreshold = 0.7;
    const ageThreshold = 24 * 60 * 60 * 1000; // 24 horas

    for (const [id, memory] of this.shortTermMemory) {
      const age = Date.now() - memory.timestamp.getTime();
      const shouldConsolidate = 
        memory.importance > consolidationThreshold || 
        age > ageThreshold ||
        memory.accessCount > 5;

      if (shouldConsolidate) {
        // Mover a memoria de largo plazo
        this.longTermMemory.set(id, memory);
        this.shortTermMemory.delete(id);
        
        console.log(`🧠 Memoria consolidada: ${id}`);
      }
    }
  }

  private async applyForgetting(): Promise<void> {
    const forgettingThreshold = 0.1;

    // Aplicar olvido a memoria de corto plazo
    for (const [id, memory] of this.shortTermMemory) {
      const forgettingFactor = this.forgettingCurve.calculate(
        memory.timestamp,
        memory.importance,
        memory.accessCount
      );

      if (forgettingFactor < forgettingThreshold) {
        this.shortTermMemory.delete(id);
        this.vectorIndex.remove(id);
        this.removeFromKnowledgeGraph(id);
        
        console.log(`🧠 Memoria olvidada: ${id}`);
      }
    }

    // Aplicar olvido más gradual a memoria de largo plazo
    for (const [id, memory] of this.longTermMemory) {
      const forgettingFactor = this.forgettingCurve.calculate(
        memory.timestamp,
        memory.importance,
        memory.accessCount
      );

      if (forgettingFactor < forgettingThreshold / 10) { // Umbral más bajo
        this.longTermMemory.delete(id);
        this.vectorIndex.remove(id);
        this.removeFromKnowledgeGraph(id);
        
        console.log(`🧠 Memoria de largo plazo olvidada: ${id}`);
      }
    }
  }

  private async updateKnowledgeGraph(): Promise<void> {
    // Encontrar nuevas conexiones entre memorias
    const allMemories = [
      ...Array.from(this.shortTermMemory.values()),
      ...Array.from(this.longTermMemory.values())
    ];

    for (let i = 0; i < allMemories.length; i++) {
      for (let j = i + 1; j < allMemories.length; j++) {
        const memory1 = allMemories[i];
        const memory2 = allMemories[j];
        
        const similarity = this.calculateSimilarity(memory1, memory2);
        
        if (similarity > 0.7 && !memory1.connections.includes(memory2.id)) {
          // Crear conexión bidireccional
          memory1.connections.push(memory2.id);
          memory2.connections.push(memory1.id);
          
          // Agregar arista al grafo
          const edgeId = `edge-${memory1.id}-${memory2.id}`;
          this.knowledgeGraph.edges.set(edgeId, {
            id: edgeId,
            source: memory1.id,
            target: memory2.id,
            type: 'similarity',
            weight: similarity
          });
        }
      }
    }
  }

  private calculateSimilarity(memory1: MemoryEntry, memory2: MemoryEntry): number {
    let similarity = 0;

    // Similitud por tipo
    if (memory1.type === memory2.type) {
      similarity += 0.2;
    }

    // Similitud por tags
    const commonTags = memory1.tags.filter(tag => memory2.tags.includes(tag));
    const tagSimilarity = commonTags.length / Math.max(memory1.tags.length, memory2.tags.length, 1);
    similarity += tagSimilarity * 0.3;

    // Similitud vectorial
    if (memory1.embedding && memory2.embedding) {
      const vectorSimilarity = this.cosineSimilarity(memory1.embedding, memory2.embedding);
      similarity += vectorSimilarity * 0.5;
    }

    return Math.min(similarity, 1);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async addToKnowledgeGraph(memory: MemoryEntry): Promise<void> {
    const node: GraphNode = {
      id: memory.id,
      type: memory.type,
      data: {
        content: memory.content,
        tags: memory.tags,
        importance: memory.importance
      },
      importance: memory.importance,
      lastUpdated: memory.timestamp
    };

    this.knowledgeGraph.nodes.set(memory.id, node);
  }

  private removeFromKnowledgeGraph(memoryId: string): void {
    // Remover nodo
    this.knowledgeGraph.nodes.delete(memoryId);
    
    // Remover aristas relacionadas
    for (const [edgeId, edge] of this.knowledgeGraph.edges) {
      if (edge.source === memoryId || edge.target === memoryId) {
        this.knowledgeGraph.edges.delete(edgeId);
      }
    }
  }

  private async optimizeIndices(): Promise<void> {
    // Reindexar vectores si es necesario
    if (this.vectorIndex.needsOptimization()) {
      await this.vectorIndex.optimize();
    }
  }

  private updateStats(): void {
    this.memoryStats = {
      totalEntries: this.shortTermMemory.size + this.longTermMemory.size,
      shortTermEntries: this.shortTermMemory.size,
      longTermEntries: this.longTermMemory.size,
      averageImportance: this.calculateAverageImportance(),
      consolidationRate: this.calculateConsolidationRate()
    };
  }

  private calculateAverageImportance(): number {
    const allMemories = [
      ...Array.from(this.shortTermMemory.values()),
      ...Array.from(this.longTermMemory.values())
    ];

    if (allMemories.length === 0) return 0;

    const totalImportance = allMemories.reduce((sum, memory) => sum + memory.importance, 0);
    return totalImportance / allMemories.length;
  }

  private calculateConsolidationRate(): number {
    const total = this.shortTermMemory.size + this.longTermMemory.size;
    if (total === 0) return 0;
    
    return this.longTermMemory.size / total;
  }

  private async generateEmbedding(content: any): Promise<number[]> {
    // Simulación de generación de embeddings
    // En una implementación real, usaríamos un modelo de embeddings
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const embedding: number[] = [];
    
    // Generar embedding de 128 dimensiones basado en el contenido
    for (let i = 0; i < 128; i++) {
      let value = 0;
      for (let j = 0; j < text.length; j++) {
        value += text.charCodeAt(j) * (i + 1) * (j + 1);
      }
      embedding.push((value % 1000) / 1000 - 0.5); // Normalizar a [-0.5, 0.5]
    }
    
    return embedding;
  }

  private async processQuery(payload: any): Promise<void> {
    const { query, responseChannel } = payload;
    
    try {
      const results = await this.queryMemory(query);
      
      await this.fabric.publishEvent({
        eventType: EventType.AgentCommand,
        source: 'saai-memory',
        target: responseChannel,
        payload: {
          type: 'query_results',
          results
        }
      });
      
    } catch (error) {
      console.error('❌ Error procesando consulta de memoria:', error);
    }
  }

  private async processCommand(payload: any): Promise<void> {
    switch (payload.command) {
      case 'get_memory_stats':
        await this.sendMemoryStats();
        break;
      case 'consolidate_now':
        await this.consolidateMemories();
        break;
      case 'optimize_indices':
        await this.optimizeIndices();
        break;
      case 'clear_working_memory':
        await this.clearWorkingMemory();
        break;
      default:
        console.log(`Comando de memoria no reconocido: ${payload.command}`);
    }
  }

  private async sendMemoryStats(): Promise<void> {
    await this.fabric.publishEvent({
      eventType: EventType.AgentCommand,
      source: 'saai-memory',
      payload: {
        type: 'memory_stats',
        stats: this.memoryStats
      }
    });
  }

  private async clearWorkingMemory(): Promise<void> {
    // Limpiar solo memorias de trabajo
    for (const [id, memory] of this.shortTermMemory) {
      if (memory.type === MemoryType.Working) {
        this.shortTermMemory.delete(id);
        this.vectorIndex.remove(id);
        this.removeFromKnowledgeGraph(id);
      }
    }
    
    console.log('🧠 Memoria de trabajo limpiada');
  }

  getMemoryStats() {
    return {
      ...this.memoryStats,
      knowledgeGraphNodes: this.knowledgeGraph.nodes.size,
      knowledgeGraphEdges: this.knowledgeGraph.edges.size
    };
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.shortTermMemory.clear();
    this.longTermMemory.clear();
    this.knowledgeGraph.nodes.clear();
    this.knowledgeGraph.edges.clear();
    console.log('✅ SAAI.Memory cerrado');
  }
}

/**
 * Índice vectorial para búsqueda semántica
 */
class VectorIndex {
  private vectors: Map<string, number[]> = new Map();
  private needsOptimizationFlag = false;

  add(id: string, vector: number[]): void {
    this.vectors.set(id, vector);
    this.needsOptimizationFlag = true;
  }

  remove(id: string): void {
    this.vectors.delete(id);
  }

  search(queryVector: number[], limit: number): Array<{ id: string; similarity: number }> {
    const results: Array<{ id: string; similarity: number }> = [];

    for (const [id, vector] of this.vectors) {
      const similarity = this.cosineSimilarity(queryVector, vector);
      results.push({ id, similarity });
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  needsOptimization(): boolean {
    return this.needsOptimizationFlag;
  }

  async optimize(): Promise<void> {
    // Simulación de optimización del índice
    console.log('🔧 Optimizando índice vectorial...');
    await new Promise(resolve => setTimeout(resolve, 100));
    this.needsOptimizationFlag = false;
    console.log('✅ Índice vectorial optimizado');
  }
}

/**
 * Curva de olvido para gestión de memoria
 */
class ForgettingCurve {
  calculate(timestamp: Date, importance: number, accessCount: number): number {
    const daysSinceCreation = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    
    // Fórmula de Ebbinghaus modificada
    const baseRetention = Math.exp(-daysSinceCreation / 30);
    
    // Factores que afectan la retención
    const importanceFactor = 0.5 + importance * 0.5;
    const accessFactor = Math.min(1 + accessCount * 0.1, 2);
    
    return baseRetention * importanceFactor * accessFactor;
  }
}