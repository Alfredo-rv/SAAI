/**
 * Agente de Memoria Local - Base de datos semántica local con IndexedDB
 */

import { LocalCognitiveFabric } from '../../core/local/LocalCognitiveFabric';

export interface MemoryEntry {
  id: string;
  content: any;
  embedding?: number[];
  tags: string[];
  importance: number;
  timestamp: Date;
  lastAccessed: Date;
  accessCount: number;
}

export interface QueryResult {
  entries: MemoryEntry[];
  scores: number[];
  totalResults: number;
}

export class LocalMemoryAgent {
  private fabric: LocalCognitiveFabric;
  private db?: IDBDatabase;
  private isRunning = false;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(fabric: LocalCognitiveFabric) {
    this.fabric = fabric;
  }

  async initialize(): Promise<void> {
    await this.initializeDatabase();
    
    await this.fabric.subscribe('memory.store', (event) => {
      this.storeMemory(event.payload);
    });

    await this.fabric.subscribe('memory.query', (event) => {
      this.queryMemory(event.payload);
    });

    this.isRunning = true;
    console.log('Local Memory Agent initialized');
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SAAIMemory', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('memories')) {
          const store = db.createObjectStore('memories', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('importance', 'importance');
          store.createIndex('tags', 'tags', { multiEntry: true });
        }
      };
    });
  }

  async storeMemory(payload: any): Promise<string> {
    const { content, tags = [], importance = 0.5 } = payload;
    
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      embedding: await this.generateEmbedding(content),
      tags,
      importance,
      timestamp: new Date(),
      lastAccessed: new Date(),
      accessCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      const request = store.add(entry);
      
      request.onsuccess = () => resolve(entry.id);
      request.onerror = () => reject(request.error);
    });
  }

  async queryMemory(payload: any): Promise<QueryResult> {
    const { query, limit = 10, tags, minImportance } = payload;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const request = store.getAll();
      
      request.onsuccess = async () => {
        let entries: MemoryEntry[] = request.result;
        
        // Filtrar por tags
        if (tags && tags.length > 0) {
          entries = entries.filter(entry => 
            tags.some((tag: string) => entry.tags.includes(tag))
          );
        }
        
        // Filtrar por importancia mínima
        if (minImportance !== undefined) {
          entries = entries.filter(entry => entry.importance >= minImportance);
        }
        
        // Búsqueda semántica si hay query
        let scores: number[] = [];
        if (query) {
          const queryEmbedding = await this.generateEmbedding(query);
          scores = entries.map(entry => 
            entry.embedding ? this.cosineSimilarity(queryEmbedding, entry.embedding) : 0
          );
          
          // Ordenar por similitud
          const indexed = entries.map((entry, index) => ({ entry, score: scores[index] }));
          indexed.sort((a, b) => b.score - a.score);
          
          entries = indexed.slice(0, limit).map(item => item.entry);
          scores = indexed.slice(0, limit).map(item => item.score);
        } else {
          // Ordenar por importancia y recencia
          entries.sort((a, b) => {
            const importanceDiff = b.importance - a.importance;
            if (Math.abs(importanceDiff) > 0.1) return importanceDiff;
            return b.timestamp.getTime() - a.timestamp.getTime();
          });
          entries = entries.slice(0, limit);
          scores = entries.map(() => 1.0);
        }
        
        // Actualizar contadores de acceso
        for (const entry of entries) {
          entry.lastAccessed = new Date();
          entry.accessCount++;
          this.updateMemoryEntry(entry);
        }
        
        resolve({
          entries,
          scores,
          totalResults: request.result.length
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async updateMemoryEntry(entry: MemoryEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      const request = store.put(entry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async generateEmbedding(content: any): Promise<number[]> {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    
    // Embedding simple basado en hash de caracteres
    const embedding: number[] = [];
    const dimensions = 128;
    
    for (let i = 0; i < dimensions; i++) {
      let value = 0;
      for (let j = 0; j < text.length; j++) {
        value += text.charCodeAt(j) * (i + 1) * (j + 1);
      }
      embedding.push((value % 1000) / 1000 - 0.5);
    }
    
    // Normalizar
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
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

  async getMemoryStats() {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const request = store.count();
      
      request.onsuccess = () => {
        resolve({
          totalEntries: request.result,
          cacheSize: this.embeddingCache.size,
          isRunning: this.isRunning
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.embeddingCache.clear();
    
    if (this.db) {
      this.db.close();
    }
  }
}