/**
 * Motor de Evolución Local - Implementación sin dependencias externas
 */

import { LocalCognitiveFabric } from '../../core/local/LocalCognitiveFabric';

export interface LocalMutation {
  id: string;
  type: 'performance' | 'efficiency' | 'reliability';
  code: string;
  fitness: number;
  generation: number;
  parent?: string;
  timestamp: Date;
}

export interface EvolutionConfig {
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
  elitismRate: number;
  maxGenerations: number;
}

export class LocalEvolutionEngine {
  private fabric: LocalCognitiveFabric;
  private config: EvolutionConfig;
  private population: LocalMutation[] = [];
  private generation = 0;
  private isRunning = false;
  private evolutionInterval?: NodeJS.Timeout;

  constructor(fabric: LocalCognitiveFabric) {
    this.fabric = fabric;
    this.config = {
      populationSize: 20,
      mutationRate: 0.1,
      crossoverRate: 0.7,
      elitismRate: 0.2,
      maxGenerations: 100
    };
  }

  async initialize(): Promise<void> {
    this.generateInitialPopulation();
    
    await this.fabric.subscribe('evolution.commands', (event) => {
      this.handleCommand(event.payload);
    });

    console.log('Local Evolution Engine initialized');
  }

  private generateInitialPopulation(): void {
    const codeTemplates = [
      'function optimize() { return Math.random() * 2; }',
      'function process(data) { return data.map(x => x * 1.1); }',
      'function cache(key, value) { localStorage.setItem(key, value); }',
      'function validate(input) { return input != null && input.length > 0; }'
    ];

    for (let i = 0; i < this.config.populationSize; i++) {
      const template = codeTemplates[i % codeTemplates.length];
      
      this.population.push({
        id: `mut-${i}-${Date.now()}`,
        type: ['performance', 'efficiency', 'reliability'][i % 3] as any,
        code: this.mutateCode(template),
        fitness: 0,
        generation: 0,
        timestamp: new Date()
      });
    }
  }

  async startEvolution(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.evolutionInterval = setInterval(() => {
      this.runEvolutionCycle();
    }, 5000);
    
    console.log('Evolution started');
  }

  async stopEvolution(): Promise<void> {
    this.isRunning = false;
    
    if (this.evolutionInterval) {
      clearInterval(this.evolutionInterval);
      this.evolutionInterval = undefined;
    }
    
    console.log('Evolution stopped');
  }

  private async runEvolutionCycle(): Promise<void> {
    if (!this.isRunning || this.generation >= this.config.maxGenerations) {
      await this.stopEvolution();
      return;
    }

    // Evaluar fitness de la población
    await this.evaluatePopulation();
    
    // Selección y reproducción
    const newPopulation = await this.reproduce();
    
    // Reemplazar población
    this.population = newPopulation;
    this.generation++;
    
    // Publicar estadísticas
    await this.fabric.publish('evolution.stats', {
      generation: this.generation,
      bestFitness: Math.max(...this.population.map(m => m.fitness)),
      averageFitness: this.population.reduce((sum, m) => sum + m.fitness, 0) / this.population.length,
      populationSize: this.population.length
    });
  }

  private async evaluatePopulation(): Promise<void> {
    for (const mutation of this.population) {
      if (mutation.fitness === 0) {
        mutation.fitness = await this.evaluateFitness(mutation);
      }
    }
  }

  private async evaluateFitness(mutation: LocalMutation): Promise<number> {
    try {
      // Ejecutar código en sandbox y medir rendimiento
      const startTime = performance.now();
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Simular ejecución
      const func = new Function(mutation.code);
      const result = func();
      
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Calcular fitness basado en rendimiento
      const executionTime = endTime - startTime;
      const memoryUsage = endMemory - startMemory;
      
      // Fitness inverso al tiempo y uso de memoria
      const timeFitness = Math.max(0, 1 - executionTime / 1000);
      const memoryFitness = Math.max(0, 1 - memoryUsage / 1000000);
      
      return (timeFitness + memoryFitness) / 2;
      
    } catch (error) {
      return 0; // Código inválido
    }
  }

  private async reproduce(): Promise<LocalMutation[]> {
    const newPopulation: LocalMutation[] = [];
    
    // Ordenar por fitness
    this.population.sort((a, b) => b.fitness - a.fitness);
    
    // Elitismo - mantener mejores
    const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRate);
    newPopulation.push(...this.population.slice(0, eliteCount));
    
    // Reproducción
    while (newPopulation.length < this.config.populationSize) {
      const parent1 = this.selectParent();
      const parent2 = this.selectParent();
      
      let offspring: LocalMutation;
      
      if (Math.random() < this.config.crossoverRate) {
        offspring = this.crossover(parent1, parent2);
      } else {
        offspring = { ...parent1 };
      }
      
      if (Math.random() < this.config.mutationRate) {
        offspring = this.mutate(offspring);
      }
      
      offspring.id = `mut-${this.generation}-${newPopulation.length}`;
      offspring.generation = this.generation + 1;
      offspring.fitness = 0; // Resetear para re-evaluación
      offspring.timestamp = new Date();
      
      newPopulation.push(offspring);
    }
    
    return newPopulation;
  }

  private selectParent(): LocalMutation {
    // Selección por torneo
    const tournamentSize = 3;
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }
    
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
  }

  private crossover(parent1: LocalMutation, parent2: LocalMutation): LocalMutation {
    // Crossover simple de código
    const code1Lines = parent1.code.split('\n');
    const code2Lines = parent2.code.split('\n');
    
    const crossoverPoint = Math.floor(Math.random() * Math.min(code1Lines.length, code2Lines.length));
    
    const newCode = [
      ...code1Lines.slice(0, crossoverPoint),
      ...code2Lines.slice(crossoverPoint)
    ].join('\n');
    
    return {
      id: '',
      type: Math.random() < 0.5 ? parent1.type : parent2.type,
      code: newCode,
      fitness: 0,
      generation: 0,
      parent: `${parent1.id}+${parent2.id}`,
      timestamp: new Date()
    };
  }

  private mutate(mutation: LocalMutation): LocalMutation {
    const mutatedCode = this.mutateCode(mutation.code);
    
    return {
      ...mutation,
      code: mutatedCode,
      parent: mutation.id
    };
  }

  private mutateCode(code: string): string {
    const lines = code.split('\n');
    const mutationTypes = ['modify_constant', 'change_operator', 'add_line'];
    const mutationType = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];
    
    switch (mutationType) {
      case 'modify_constant':
        return lines.map(line => {
          if (Math.random() < 0.3 && /\d+/.test(line)) {
            return line.replace(/\d+/g, (match) => {
              const num = parseInt(match);
              return String(num + Math.floor(Math.random() * 10) - 5);
            });
          }
          return line;
        }).join('\n');
        
      case 'change_operator':
        return lines.map(line => {
          if (Math.random() < 0.2) {
            return line
              .replace(/\+/g, Math.random() < 0.5 ? '-' : '*')
              .replace(/</g, Math.random() < 0.5 ? '>' : '<=');
          }
          return line;
        }).join('\n');
        
      case 'add_line':
        const insertIndex = Math.floor(Math.random() * lines.length);
        const newLines = [...lines];
        newLines.splice(insertIndex, 0, '// Optimización evolutiva');
        return newLines.join('\n');
        
      default:
        return code;
    }
  }

  private async handleCommand(payload: any): Promise<void> {
    switch (payload.command) {
      case 'start':
        await this.startEvolution();
        break;
      case 'stop':
        await this.stopEvolution();
        break;
      case 'get_stats':
        await this.fabric.publish('evolution.stats', this.getStats());
        break;
    }
  }

  getStats() {
    return {
      generation: this.generation,
      populationSize: this.population.length,
      isRunning: this.isRunning,
      bestFitness: this.population.length > 0 ? Math.max(...this.population.map(m => m.fitness)) : 0,
      averageFitness: this.population.length > 0 
        ? this.population.reduce((sum, m) => sum + m.fitness, 0) / this.population.length 
        : 0
    };
  }

  async shutdown(): Promise<void> {
    await this.stopEvolution();
    this.population = [];
  }
}