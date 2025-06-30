/**
 * Optimizador de Rendimiento SAAI
 * Sistema de optimización automática con ML y análisis predictivo
 */

import { CognitiveFabric, EventType } from '../core/CognitiveFabric';
import { LoggingAuditor, LogLevel } from '../infrastructure/LoggingAuditor';
import { ConfigManager } from '../infrastructure/ConfigManager';

export interface PerformanceMetric {
  id: string;
  name: string;
  category: MetricCategory;
  value: number;
  unit: string;
  timestamp: Date;
  source: string;
  threshold: PerformanceThreshold;
}

export enum MetricCategory {
  CPU = 'cpu',
  Memory = 'memory',
  Network = 'network',
  Disk = 'disk',
  Application = 'application',
  Database = 'database',
  Cache = 'cache'
}

export interface PerformanceThreshold {
  warning: number;
  critical: number;
  optimal: number;
}

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  condition: OptimizationCondition;
  action: OptimizationAction;
  priority: number;
  enabled: boolean;
}

export interface OptimizationCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration: number; // milliseconds
}

export interface OptimizationAction {
  type: ActionType;
  parameters: Record<string, any>;
  estimatedImpact: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export enum ActionType {
  ScaleUp = 'scale_up',
  ScaleDown = 'scale_down',
  CacheOptimization = 'cache_optimization',
  ResourceReallocation = 'resource_reallocation',
  ConfigurationTuning = 'configuration_tuning',
  LoadBalancing = 'load_balancing',
  GarbageCollection = 'garbage_collection'
}

export interface OptimizationExecution {
  id: string;
  ruleId: string;
  startTime: Date;
  endTime?: Date;
  status: OptimizationStatus;
  beforeMetrics: PerformanceMetric[];
  afterMetrics: PerformanceMetric[];
  impact: OptimizationImpact;
  rollbackPlan?: RollbackPlan;
}

export enum OptimizationStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  RolledBack = 'rolled_back'
}

export interface OptimizationImpact {
  performanceGain: number;
  resourceSavings: number;
  stabilityImpact: number;
  userExperienceImprovement: number;
}

export interface RollbackPlan {
  canRollback: boolean;
  rollbackActions: (() => Promise<void>)[];
  timeWindow: number;
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: ModelType;
  accuracy: number;
  lastTrained: Date;
  predictions: Prediction[];
}

export enum ModelType {
  ResourceUsage = 'resource_usage',
  PerformanceTrend = 'performance_trend',
  AnomalyDetection = 'anomaly_detection',
  CapacityPlanning = 'capacity_planning'
}

export interface Prediction {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeHorizon: number;
  timestamp: Date;
}

/**
 * Optimizador de Rendimiento con IA y ML
 */
export class PerformanceOptimizer {
  private fabric: CognitiveFabric;
  private auditor: LoggingAuditor;
  private configManager: ConfigManager;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private optimizationRules: Map<string, OptimizationRule> = new Map();
  private activeOptimizations: Map<string, OptimizationExecution> = new Map();
  private optimizationHistory: OptimizationExecution[] = [];
  private predictiveModels: Map<string, PredictiveModel> = new Map();
  private isRunning = false;
  private optimizationInterval?: NodeJS.Timeout;

  constructor(
    fabric: CognitiveFabric,
    auditor: LoggingAuditor,
    configManager: ConfigManager
  ) {
    this.fabric = fabric;
    this.auditor = auditor;
    this.configManager = configManager;
  }

  async initialize(): Promise<void> {
    console.log('⚡ Inicializando Optimizador de Rendimiento');
    
    // Registrar reglas de optimización predefinidas
    await this.registerDefaultOptimizationRules();
    
    // Inicializar modelos predictivos
    await this.initializePredictiveModels();
    
    // Suscribirse a métricas del sistema
    await this.fabric.subscribe('saai.metrics', (event) => {
      this.handleMetricEvent(event.payload);
    });
    
    // Iniciar ciclo de optimización
    this.startOptimizationCycle();
    
    this.isRunning = true;
    this.auditor.info('performance-optimizer', 'Optimizador de rendimiento inicializado', {
      rules: this.optimizationRules.size,
      models: this.predictiveModels.size
    }, ['optimization', 'initialization']);
    
    console.log('✅ Optimizador de Rendimiento inicializado');
  }

  private async registerDefaultOptimizationRules(): Promise<void> {
    // Regla de optimización de CPU
    await this.registerOptimizationRule({
      id: 'cpu-high-usage',
      name: 'Optimización de CPU Alto',
      description: 'Optimizar cuando el uso de CPU es consistentemente alto',
      category: MetricCategory.CPU,
      condition: {
        metric: 'cpu_usage',
        operator: 'gt',
        value: 80,
        duration: 300000 // 5 minutos
      },
      action: {
        type: ActionType.ScaleUp,
        parameters: { factor: 1.2 },
        estimatedImpact: 0.3,
        riskLevel: 'medium'
      },
      priority: 8,
      enabled: true
    });

    // Regla de optimización de memoria
    await this.registerOptimizationRule({
      id: 'memory-optimization',
      name: 'Optimización de Memoria',
      description: 'Optimizar uso de memoria cuando está alto',
      category: MetricCategory.Memory,
      condition: {
        metric: 'memory_usage',
        operator: 'gt',
        value: 85,
        duration: 180000 // 3 minutos
      },
      action: {
        type: ActionType.GarbageCollection,
        parameters: { aggressive: true },
        estimatedImpact: 0.25,
        riskLevel: 'low'
      },
      priority: 7,
      enabled: true
    });

    // Regla de optimización de cache
    await this.registerOptimizationRule({
      id: 'cache-hit-rate-low',
      name: 'Optimización de Cache',
      description: 'Optimizar cache cuando la tasa de aciertos es baja',
      category: MetricCategory.Cache,
      condition: {
        metric: 'cache_hit_rate',
        operator: 'lt',
        value: 70,
        duration: 600000 // 10 minutos
      },
      action: {
        type: ActionType.CacheOptimization,
        parameters: { 
          increaseSize: true,
          optimizeEviction: true 
        },
        estimatedImpact: 0.4,
        riskLevel: 'low'
      },
      priority: 6,
      enabled: true
    });

    // Regla de balanceeo de carga
    await this.registerOptimizationRule({
      id: 'load-imbalance',
      name: 'Balanceeo de Carga',
      description: 'Rebalancear carga cuando hay desequilibrio',
      category: MetricCategory.Application,
      condition: {
        metric: 'load_variance',
        operator: 'gt',
        value: 0.3,
        duration: 240000 // 4 minutos
      },
      action: {
        type: ActionType.LoadBalancing,
        parameters: { algorithm: 'weighted_round_robin' },
        estimatedImpact: 0.2,
        riskLevel: 'medium'
      },
      priority: 5,
      enabled: true
    });
  }

  private async initializePredictiveModels(): Promise<void> {
    // Modelo de predicción de uso de recursos
    this.predictiveModels.set('resource-usage', {
      id: 'resource-usage',
      name: 'Predicción de Uso de Recursos',
      type: ModelType.ResourceUsage,
      accuracy: 0.85,
      lastTrained: new Date(),
      predictions: []
    });

    // Modelo de detección de anomalías
    this.predictiveModels.set('anomaly-detection', {
      id: 'anomaly-detection',
      name: 'Detección de Anomalías de Rendimiento',
      type: ModelType.AnomalyDetection,
      accuracy: 0.92,
      lastTrained: new Date(),
      predictions: []
    });

    // Modelo de planificación de capacidad
    this.predictiveModels.set('capacity-planning', {
      id: 'capacity-planning',
      name: 'Planificación de Capacidad',
      type: ModelType.CapacityPlanning,
      accuracy: 0.78,
      lastTrained: new Date(),
      predictions: []
    });
  }

  async registerOptimizationRule(rule: OptimizationRule): Promise<void> {
    this.optimizationRules.set(rule.id, rule);
    
    this.auditor.info('performance-optimizer', `Regla de optimización registrada: ${rule.name}`, {
      ruleId: rule.id,
      category: rule.category,
      priority: rule.priority
    }, ['optimization', 'rule-registration']);
  }

  private startOptimizationCycle(): void {
    this.optimizationInterval = setInterval(() => {
      this.runOptimizationCycle();
    }, 30000); // Cada 30 segundos
  }

  private async runOptimizationCycle(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Analizar métricas actuales
      await this.analyzeCurrentMetrics();
      
      // Ejecutar predicciones
      await this.runPredictiveAnalysis();
      
      // Evaluar reglas de optimización
      await this.evaluateOptimizationRules();
      
      // Monitorear optimizaciones activas
      await this.monitorActiveOptimizations();
      
    } catch (error) {
      this.auditor.error('performance-optimizer', 'Error en ciclo de optimización', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      }, ['optimization', 'cycle-error']);
    }
  }

  private async analyzeCurrentMetrics(): Promise<void> {
    // Simular análisis de métricas actuales
    const currentMetrics = this.generateCurrentMetrics();
    
    for (const metric of currentMetrics) {
      if (!this.metrics.has(metric.name)) {
        this.metrics.set(metric.name, []);
      }
      
      const metricHistory = this.metrics.get(metric.name)!;
      metricHistory.push(metric);
      
      // Mantener solo las últimas 100 métricas
      if (metricHistory.length > 100) {
        metricHistory.splice(0, metricHistory.length - 100);
      }
    }
  }

  private generateCurrentMetrics(): PerformanceMetric[] {
    const now = new Date();
    
    return [
      {
        id: `cpu-${now.getTime()}`,
        name: 'cpu_usage',
        category: MetricCategory.CPU,
        value: 20 + Math.random() * 60,
        unit: 'percent',
        timestamp: now,
        source: 'system-monitor',
        threshold: { warning: 70, critical: 90, optimal: 50 }
      },
      {
        id: `memory-${now.getTime()}`,
        name: 'memory_usage',
        category: MetricCategory.Memory,
        value: 30 + Math.random() * 50,
        unit: 'percent',
        timestamp: now,
        source: 'system-monitor',
        threshold: { warning: 80, critical: 95, optimal: 60 }
      },
      {
        id: `cache-${now.getTime()}`,
        name: 'cache_hit_rate',
        category: MetricCategory.Cache,
        value: 60 + Math.random() * 35,
        unit: 'percent',
        timestamp: now,
        source: 'cache-monitor',
        threshold: { warning: 70, critical: 50, optimal: 90 }
      },
      {
        id: `network-${now.getTime()}`,
        name: 'network_latency',
        category: MetricCategory.Network,
        value: 1 + Math.random() * 10,
        unit: 'milliseconds',
        timestamp: now,
        source: 'network-monitor',
        threshold: { warning: 5, critical: 10, optimal: 2 }
      }
    ];
  }

  private async runPredictiveAnalysis(): Promise<void> {
    for (const model of this.predictiveModels.values()) {
      const predictions = await this.generatePredictions(model);
      model.predictions = predictions;
      
      // Analizar predicciones para optimizaciones proactivas
      await this.analyzePredictions(model, predictions);
    }
  }

  private async generatePredictions(model: PredictiveModel): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    const now = new Date();
    
    // Simular predicciones basadas en el tipo de modelo
    switch (model.type) {
      case ModelType.ResourceUsage:
        predictions.push({
          metric: 'cpu_usage',
          predictedValue: 45 + Math.random() * 30,
          confidence: 0.8 + Math.random() * 0.15,
          timeHorizon: 3600000, // 1 hora
          timestamp: now
        });
        break;
        
      case ModelType.AnomalyDetection:
        if (Math.random() < 0.1) { // 10% probabilidad de anomalía
          predictions.push({
            metric: 'anomaly_score',
            predictedValue: 0.8 + Math.random() * 0.2,
            confidence: 0.9,
            timeHorizon: 1800000, // 30 minutos
            timestamp: now
          });
        }
        break;
        
      case ModelType.CapacityPlanning:
        predictions.push({
          metric: 'capacity_utilization',
          predictedValue: 70 + Math.random() * 25,
          confidence: 0.75,
          timeHorizon: 86400000, // 24 horas
          timestamp: now
        });
        break;
    }
    
    return predictions;
  }

  private async analyzePredictions(model: PredictiveModel, predictions: Prediction[]): Promise<void> {
    for (const prediction of predictions) {
      if (prediction.confidence > 0.8) {
        // Predicción de alta confianza
        if (model.type === ModelType.AnomalyDetection && prediction.predictedValue > 0.7) {
          this.auditor.warn('performance-optimizer', 'Anomalía predicha con alta confianza', {
            metric: prediction.metric,
            value: prediction.predictedValue,
            confidence: prediction.confidence
          }, ['optimization', 'prediction', 'anomaly']);
        }
        
        if (model.type === ModelType.ResourceUsage && prediction.predictedValue > 85) {
          this.auditor.info('performance-optimizer', 'Alto uso de recursos predicho', {
            metric: prediction.metric,
            value: prediction.predictedValue,
            timeHorizon: prediction.timeHorizon
          }, ['optimization', 'prediction', 'resource']);
        }
      }
    }
  }

  private async evaluateOptimizationRules(): Promise<void> {
    for (const rule of this.optimizationRules.values()) {
      if (!rule.enabled) continue;
      
      const shouldOptimize = await this.evaluateRule(rule);
      if (shouldOptimize) {
        await this.executeOptimization(rule);
      }
    }
  }

  private async evaluateRule(rule: OptimizationRule): Promise<boolean> {
    const metricHistory = this.metrics.get(rule.condition.metric);
    if (!metricHistory || metricHistory.length === 0) return false;
    
    // Verificar condición durante la duración especificada
    const now = Date.now();
    const relevantMetrics = metricHistory.filter(m => 
      (now - m.timestamp.getTime()) <= rule.condition.duration
    );
    
    if (relevantMetrics.length === 0) return false;
    
    // Evaluar condición
    const avgValue = relevantMetrics.reduce((sum, m) => sum + m.value, 0) / relevantMetrics.length;
    
    switch (rule.condition.operator) {
      case 'gt': return avgValue > rule.condition.value;
      case 'lt': return avgValue < rule.condition.value;
      case 'gte': return avgValue >= rule.condition.value;
      case 'lte': return avgValue <= rule.condition.value;
      case 'eq': return Math.abs(avgValue - rule.condition.value) < 0.1;
      default: return false;
    }
  }

  private async executeOptimization(rule: OptimizationRule): Promise<void> {
    // Verificar si ya hay una optimización activa para esta regla
    const existingOptimization = Array.from(this.activeOptimizations.values())
      .find(opt => opt.ruleId === rule.id && opt.status === OptimizationStatus.InProgress);
    
    if (existingOptimization) return;
    
    const executionId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: OptimizationExecution = {
      id: executionId,
      ruleId: rule.id,
      startTime: new Date(),
      status: OptimizationStatus.Pending,
      beforeMetrics: this.captureCurrentMetrics(),
      afterMetrics: [],
      impact: {
        performanceGain: 0,
        resourceSavings: 0,
        stabilityImpact: 0,
        userExperienceImprovement: 0
      }
    };
    
    this.activeOptimizations.set(executionId, execution);
    
    this.auditor.info('performance-optimizer', `Iniciando optimización: ${rule.name}`, {
      executionId,
      ruleId: rule.id,
      action: rule.action.type
    }, ['optimization', 'execution-start']);
    
    // Ejecutar optimización en background
    this.performOptimization(execution, rule).catch(error => {
      this.auditor.error('performance-optimizer', `Error en optimización ${executionId}`, {
        error: error instanceof Error ? error.message : 'Error desconocido'
      }, ['optimization', 'execution-error']);
    });
  }

  private async performOptimization(execution: OptimizationExecution, rule: OptimizationRule): Promise<void> {
    try {
      execution.status = OptimizationStatus.InProgress;
      
      // Crear plan de rollback
      execution.rollbackPlan = await this.createRollbackPlan(rule);
      
      // Ejecutar acción de optimización
      await this.executeOptimizationAction(rule.action);
      
      // Esperar para medir impacto
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minuto
      
      // Capturar métricas después de la optimización
      execution.afterMetrics = this.captureCurrentMetrics();
      
      // Calcular impacto
      execution.impact = this.calculateOptimizationImpact(
        execution.beforeMetrics,
        execution.afterMetrics,
        rule.action.estimatedImpact
      );
      
      execution.status = OptimizationStatus.Completed;
      execution.endTime = new Date();
      
      this.auditor.info('performance-optimizer', `Optimización completada: ${rule.name}`, {
        executionId: execution.id,
        impact: execution.impact
      }, ['optimization', 'execution-complete']);
      
      // Mover a historial
      this.optimizationHistory.push(execution);
      this.activeOptimizations.delete(execution.id);
      
    } catch (error) {
      execution.status = OptimizationStatus.Failed;
      execution.endTime = new Date();
      
      this.auditor.error('performance-optimizer', `Optimización falló: ${rule.name}`, {
        executionId: execution.id,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }, ['optimization', 'execution-failed']);
      
      // Intentar rollback si es posible
      if (execution.rollbackPlan?.canRollback) {
        await this.executeRollback(execution);
      }
      
      this.optimizationHistory.push(execution);
      this.activeOptimizations.delete(execution.id);
    }
  }

  private async executeOptimizationAction(action: OptimizationAction): Promise<void> {
    switch (action.type) {
      case ActionType.ScaleUp:
        await this.scaleUpResources(action.parameters);
        break;
      case ActionType.ScaleDown:
        await this.scaleDownResources(action.parameters);
        break;
      case ActionType.CacheOptimization:
        await this.optimizeCache(action.parameters);
        break;
      case ActionType.ResourceReallocation:
        await this.reallocateResources(action.parameters);
        break;
      case ActionType.ConfigurationTuning:
        await this.tuneConfiguration(action.parameters);
        break;
      case ActionType.LoadBalancing:
        await this.optimizeLoadBalancing(action.parameters);
        break;
      case ActionType.GarbageCollection:
        await this.performGarbageCollection(action.parameters);
        break;
    }
  }

  // Implementaciones de acciones de optimización
  private async scaleUpResources(parameters: any): Promise<void> {
    const factor = parameters.factor || 1.2;
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.auditor.info('performance-optimizer', `Recursos escalados por factor: ${factor}`, {}, ['optimization', 'scale-up']);
  }

  private async scaleDownResources(parameters: any): Promise<void> {
    const factor = parameters.factor || 0.8;
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.auditor.info('performance-optimizer', `Recursos reducidos por factor: ${factor}`, {}, ['optimization', 'scale-down']);
  }

  private async optimizeCache(parameters: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.auditor.info('performance-optimizer', 'Cache optimizado', parameters, ['optimization', 'cache']);
  }

  private async reallocateResources(parameters: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.auditor.info('performance-optimizer', 'Recursos realocados', parameters, ['optimization', 'reallocation']);
  }

  private async tuneConfiguration(parameters: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.auditor.info('performance-optimizer', 'Configuración ajustada', parameters, ['optimization', 'tuning']);
  }

  private async optimizeLoadBalancing(parameters: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.auditor.info('performance-optimizer', 'Balanceeo de carga optimizado', parameters, ['optimization', 'load-balancing']);
  }

  private async performGarbageCollection(parameters: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.auditor.info('performance-optimizer', 'Garbage collection ejecutado', parameters, ['optimization', 'gc']);
  }

  private captureCurrentMetrics(): PerformanceMetric[] {
    return this.generateCurrentMetrics();
  }

  private calculateOptimizationImpact(
    beforeMetrics: PerformanceMetric[],
    afterMetrics: PerformanceMetric[],
    estimatedImpact: number
  ): OptimizationImpact {
    // Simular cálculo de impacto
    const performanceGain = estimatedImpact * (0.8 + Math.random() * 0.4);
    const resourceSavings = estimatedImpact * 0.6 * (0.7 + Math.random() * 0.6);
    const stabilityImpact = Math.random() * 0.1; // Impacto mínimo en estabilidad
    const userExperienceImprovement = performanceGain * 0.8;
    
    return {
      performanceGain,
      resourceSavings,
      stabilityImpact,
      userExperienceImprovement
    };
  }

  private async createRollbackPlan(rule: OptimizationRule): Promise<RollbackPlan> {
    return {
      canRollback: rule.action.riskLevel !== 'high',
      rollbackActions: [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      ],
      timeWindow: 300000 // 5 minutos
    };
  }

  private async executeRollback(execution: OptimizationExecution): Promise<void> {
    if (!execution.rollbackPlan?.canRollback) return;
    
    this.auditor.warn('performance-optimizer', `Ejecutando rollback para optimización: ${execution.id}`, {}, ['optimization', 'rollback']);
    
    for (const action of execution.rollbackPlan.rollbackActions) {
      try {
        await action();
      } catch (error) {
        this.auditor.error('performance-optimizer', 'Error en rollback', {
          executionId: execution.id,
          error: error instanceof Error ? error.message : 'Error desconocido'
        }, ['optimization', 'rollback-error']);
      }
    }
    
    execution.status = OptimizationStatus.RolledBack;
  }

  private async monitorActiveOptimizations(): Promise<void> {
    for (const execution of this.activeOptimizations.values()) {
      const elapsed = Date.now() - execution.startTime.getTime();
      
      // Timeout para optimizaciones que toman demasiado tiempo
      if (elapsed > 600000) { // 10 minutos
        execution.status = OptimizationStatus.Failed;
        execution.endTime = new Date();
        
        this.auditor.warn('performance-optimizer', `Optimización timeout: ${execution.id}`, {}, ['optimization', 'timeout']);
        
        this.optimizationHistory.push(execution);
        this.activeOptimizations.delete(execution.id);
      }
    }
  }

  private async handleMetricEvent(payload: any): Promise<void> {
    if (payload.type === 'performance_metric') {
      const metric = payload.metric as PerformanceMetric;
      
      if (!this.metrics.has(metric.name)) {
        this.metrics.set(metric.name, []);
      }
      
      this.metrics.get(metric.name)!.push(metric);
    }
  }

  getOptimizationRules(): OptimizationRule[] {
    return Array.from(this.optimizationRules.values());
  }

  getActiveOptimizations(): OptimizationExecution[] {
    return Array.from(this.activeOptimizations.values());
  }

  getOptimizationHistory(): OptimizationExecution[] {
    return [...this.optimizationHistory];
  }

  getPredictiveModels(): PredictiveModel[] {
    return Array.from(this.predictiveModels.values());
  }

  getPerformanceMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  getOptimizationStatistics() {
    const history = this.optimizationHistory.slice(-50);
    
    if (history.length === 0) {
      return {
        totalOptimizations: 0,
        successRate: 0,
        averageImpact: 0,
        totalResourceSavings: 0
      };
    }
    
    const successful = history.filter(opt => opt.status === OptimizationStatus.Completed).length;
    const successRate = (successful / history.length) * 100;
    
    const totalImpact = history.reduce((sum, opt) => sum + opt.impact.performanceGain, 0);
    const averageImpact = totalImpact / history.length;
    
    const totalResourceSavings = history.reduce((sum, opt) => sum + opt.impact.resourceSavings, 0);
    
    return {
      totalOptimizations: history.length,
      successRate,
      averageImpact,
      totalResourceSavings
    };
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    
    // Esperar a que terminen las optimizaciones activas
    await Promise.all(Array.from(this.activeOptimizations.keys()).map(async (id) => {
      const execution = this.activeOptimizations.get(id);
      if (execution && execution.status === OptimizationStatus.InProgress) {
        execution.status = OptimizationStatus.Failed;
        execution.endTime = new Date();
        this.optimizationHistory.push(execution);
      }
    }));
    
    this.activeOptimizations.clear();
    
    this.auditor.info('performance-optimizer', 'Optimizador de rendimiento cerrado', {}, ['optimization', 'shutdown']);
    console.log('✅ Optimizador de Rendimiento cerrado');
  }
}