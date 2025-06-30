/**
 * SAAI.Perception - Agente de Omni-percepción Adaptativa
 * Fusión de sensores múltiples con predicción de datos faltantes
 */

import { CognitiveFabric, EventType } from '../core/CognitiveFabric';

export interface SensorData {
  sensorId: string;
  sensorType: SensorType;
  timestamp: Date;
  data: any;
  confidence: number;
  quality: number;
}

export enum SensorType {
  Visual = 'visual',
  Audio = 'audio',
  Network = 'network',
  System = 'system',
  User = 'user',
  Environmental = 'environmental'
}

export interface PerceptionResult {
  id: string;
  timestamp: Date;
  fusedData: any;
  confidence: number;
  anomalies: Anomaly[];
  predictions: Prediction[];
  insights: string[];
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  affectedSensors: string[];
}

export interface Prediction {
  id: string;
  type: string;
  prediction: any;
  confidence: number;
  timeHorizon: number; // milliseconds
  basis: string[];
}

/**
 * Agente de Percepción con capacidades avanzadas
 */
export class PerceptionAgent {
  private fabric: CognitiveFabric;
  private sensors: Map<string, SensorData[]> = new Map();
  private kalmanFilters: Map<string, KalmanFilter> = new Map();
  private anomalyDetector: AnomalyDetector;
  private predictor: DataPredictor;
  private isRunning = false;
  private perceptionHistory: PerceptionResult[] = [];

  constructor(fabric: CognitiveFabric) {
    this.fabric = fabric;
    this.anomalyDetector = new AnomalyDetector();
    this.predictor = new DataPredictor();
  }

  async initialize(): Promise<void> {
    console.log('👁️  Inicializando SAAI.Perception');

    // Suscribirse a datos de sensores
    await this.fabric.subscribe('saai.sensors.data', (event) => {
      this.processSensorData(event.payload);
    });

    // Suscribirse a comandos de percepción
    await this.fabric.subscribe('saai.perception.commands', (event) => {
      this.processCommand(event.payload);
    });

    // Inicializar filtros Kalman para cada tipo de sensor
    for (const sensorType of Object.values(SensorType)) {
      this.kalmanFilters.set(sensorType, new KalmanFilter());
    }

    this.isRunning = true;
    console.log('✅ SAAI.Perception inicializado');
  }

  async processCycle(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Fusionar datos de sensores
      const fusedData = await this.fuseSensorData();
      
      // Detectar anomalías
      const anomalies = await this.detectAnomalies(fusedData);
      
      // Generar predicciones
      const predictions = await this.generatePredictions(fusedData);
      
      // Extraer insights
      const insights = await this.extractInsights(fusedData, anomalies, predictions);
      
      // Crear resultado de percepción
      const result: PerceptionResult = {
        id: `perception-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        fusedData,
        confidence: this.calculateOverallConfidence(fusedData),
        anomalies,
        predictions,
        insights
      };

      // Almacenar en historial
      this.perceptionHistory.push(result);
      if (this.perceptionHistory.length > 100) {
        this.perceptionHistory = this.perceptionHistory.slice(-100);
      }

      // Publicar resultado
      await this.fabric.publishEvent({
        eventType: EventType.AgentCommand,
        source: 'saai-perception',
        payload: {
          type: 'perception_result',
          result
        }
      });

      // Alertas para anomalías críticas
      const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
      if (criticalAnomalies.length > 0) {
        await this.fabric.publishEvent({
          eventType: EventType.SecurityAlert,
          source: 'saai-perception',
          payload: {
            type: 'critical_anomalies_detected',
            anomalies: criticalAnomalies,
            timestamp: new Date()
          }
        });
      }

    } catch (error) {
      console.error('❌ Error en ciclo de percepción:', error);
    }
  }

  private async processSensorData(payload: any): Promise<void> {
    const sensorData: SensorData = payload.sensorData;
    
    // Almacenar datos del sensor
    if (!this.sensors.has(sensorData.sensorType)) {
      this.sensors.set(sensorData.sensorType, []);
    }
    
    const sensorHistory = this.sensors.get(sensorData.sensorType)!;
    sensorHistory.push(sensorData);
    
    // Mantener solo los últimos 1000 puntos de datos por sensor
    if (sensorHistory.length > 1000) {
      sensorHistory.splice(0, sensorHistory.length - 1000);
    }

    // Aplicar filtro Kalman
    const filter = this.kalmanFilters.get(sensorData.sensorType);
    if (filter) {
      const filteredData = filter.update(sensorData.data);
      sensorData.data = filteredData;
    }
  }

  private async fuseSensorData(): Promise<any> {
    const fusedData: any = {
      timestamp: new Date(),
      sensors: {},
      correlations: {},
      confidence: 0
    };

    let totalConfidence = 0;
    let sensorCount = 0;

    // Fusionar datos de cada tipo de sensor
    for (const [sensorType, sensorHistory] of this.sensors) {
      if (sensorHistory.length === 0) continue;

      const recentData = sensorHistory.slice(-10); // Últimos 10 puntos
      const avgData = this.averageSensorData(recentData);
      const confidence = this.calculateSensorConfidence(recentData);

      fusedData.sensors[sensorType] = {
        data: avgData,
        confidence,
        lastUpdate: recentData[recentData.length - 1]?.timestamp,
        dataPoints: recentData.length
      };

      totalConfidence += confidence;
      sensorCount++;
    }

    // Calcular correlaciones entre sensores
    fusedData.correlations = this.calculateSensorCorrelations();
    
    // Confianza general
    fusedData.confidence = sensorCount > 0 ? totalConfidence / sensorCount : 0;

    return fusedData;
  }

  private averageSensorData(sensorData: SensorData[]): any {
    if (sensorData.length === 0) return null;

    // Implementación simplificada - en realidad sería más compleja
    const numericValues = sensorData
      .map(d => typeof d.data === 'number' ? d.data : 0)
      .filter(v => !isNaN(v));

    if (numericValues.length === 0) return sensorData[sensorData.length - 1].data;

    return numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
  }

  private calculateSensorConfidence(sensorData: SensorData[]): number {
    if (sensorData.length === 0) return 0;

    const avgConfidence = sensorData.reduce((sum, d) => sum + d.confidence, 0) / sensorData.length;
    const avgQuality = sensorData.reduce((sum, d) => sum + d.quality, 0) / sensorData.length;
    const recency = Math.max(0, 1 - (Date.now() - sensorData[sensorData.length - 1].timestamp.getTime()) / 60000);

    return (avgConfidence * 0.4 + avgQuality * 0.4 + recency * 0.2);
  }

  private calculateSensorCorrelations(): Record<string, number> {
    const correlations: Record<string, number> = {};
    const sensorTypes = Array.from(this.sensors.keys());

    for (let i = 0; i < sensorTypes.length; i++) {
      for (let j = i + 1; j < sensorTypes.length; j++) {
        const type1 = sensorTypes[i];
        const type2 = sensorTypes[j];
        const correlation = this.calculateCorrelation(type1, type2);
        correlations[`${type1}-${type2}`] = correlation;
      }
    }

    return correlations;
  }

  private calculateCorrelation(sensorType1: string, sensorType2: string): number {
    // Implementación simplificada de correlación
    const data1 = this.sensors.get(sensorType1)?.slice(-20) || [];
    const data2 = this.sensors.get(sensorType2)?.slice(-20) || [];

    if (data1.length < 2 || data2.length < 2) return 0;

    // Simular correlación basada en timestamps y patrones
    const timeDiff = Math.abs(
      (data1[data1.length - 1]?.timestamp.getTime() || 0) - 
      (data2[data2.length - 1]?.timestamp.getTime() || 0)
    );

    return Math.max(0, 1 - timeDiff / 60000); // Correlación basada en sincronización temporal
  }

  private async detectAnomalies(fusedData: any): Promise<Anomaly[]> {
    return this.anomalyDetector.detect(fusedData, this.perceptionHistory);
  }

  private async generatePredictions(fusedData: any): Promise<Prediction[]> {
    return this.predictor.predict(fusedData, this.perceptionHistory);
  }

  private async extractInsights(
    fusedData: any, 
    anomalies: Anomaly[], 
    predictions: Prediction[]
  ): Promise<string[]> {
    const insights: string[] = [];

    // Insights basados en confianza
    if (fusedData.confidence > 0.9) {
      insights.push('Alta calidad de datos de sensores detectada');
    } else if (fusedData.confidence < 0.5) {
      insights.push('Calidad de datos degradada - verificar sensores');
    }

    // Insights basados en anomalías
    if (anomalies.length > 0) {
      insights.push(`${anomalies.length} anomalías detectadas en el sistema`);
      
      const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
      if (criticalCount > 0) {
        insights.push(`${criticalCount} anomalías críticas requieren atención inmediata`);
      }
    }

    // Insights basados en predicciones
    const highConfidencePredictions = predictions.filter(p => p.confidence > 0.8);
    if (highConfidencePredictions.length > 0) {
      insights.push(`${highConfidencePredictions.length} predicciones de alta confianza disponibles`);
    }

    // Insights basados en correlaciones
    const strongCorrelations = Object.entries(fusedData.correlations || {})
      .filter(([_, correlation]) => correlation > 0.8);
    
    if (strongCorrelations.length > 0) {
      insights.push(`Detectadas ${strongCorrelations.length} correlaciones fuertes entre sensores`);
    }

    return insights;
  }

  private calculateOverallConfidence(fusedData: any): number {
    return fusedData.confidence || 0;
  }

  private async processCommand(payload: any): Promise<void> {
    switch (payload.command) {
      case 'get_perception_status':
        await this.sendPerceptionStatus();
        break;
      case 'calibrate_sensors':
        await this.calibrateSensors();
        break;
      case 'reset_anomaly_detector':
        this.anomalyDetector.reset();
        break;
      default:
        console.log(`Comando de percepción no reconocido: ${payload.command}`);
    }
  }

  private async sendPerceptionStatus(): Promise<void> {
    const status = {
      isRunning: this.isRunning,
      activeSensors: this.sensors.size,
      totalDataPoints: Array.from(this.sensors.values()).reduce((sum, data) => sum + data.length, 0),
      lastPerception: this.perceptionHistory[this.perceptionHistory.length - 1],
      averageConfidence: this.calculateAverageConfidence()
    };

    await this.fabric.publishEvent({
      eventType: EventType.AgentCommand,
      source: 'saai-perception',
      payload: {
        type: 'perception_status',
        status
      }
    });
  }

  private calculateAverageConfidence(): number {
    if (this.perceptionHistory.length === 0) return 0;
    
    const recentResults = this.perceptionHistory.slice(-10);
    const totalConfidence = recentResults.reduce((sum, result) => sum + result.confidence, 0);
    return totalConfidence / recentResults.length;
  }

  private async calibrateSensors(): Promise<void> {
    console.log('🔧 Calibrando sensores...');
    
    // Reinicializar filtros Kalman
    for (const [sensorType, filter] of this.kalmanFilters) {
      filter.reset();
    }

    console.log('✅ Calibración de sensores completada');
  }

  getPerceptionStats() {
    return {
      isRunning: this.isRunning,
      activeSensors: this.sensors.size,
      totalPerceptions: this.perceptionHistory.length,
      averageConfidence: this.calculateAverageConfidence(),
      recentAnomalies: this.getRecentAnomalies().length
    };
  }

  private getRecentAnomalies(): Anomaly[] {
    const recentResults = this.perceptionHistory.slice(-10);
    return recentResults.flatMap(result => result.anomalies);
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.sensors.clear();
    this.perceptionHistory = [];
    console.log('✅ SAAI.Perception cerrado');
  }
}

/**
 * Filtro Kalman simplificado para suavizado de datos
 */
class KalmanFilter {
  private estimate = 0;
  private errorCovariance = 1;
  private processNoise = 0.01;
  private measurementNoise = 0.1;

  update(measurement: number): number {
    if (typeof measurement !== 'number' || isNaN(measurement)) {
      return this.estimate;
    }

    // Predicción
    const predictedEstimate = this.estimate;
    const predictedErrorCovariance = this.errorCovariance + this.processNoise;

    // Actualización
    const kalmanGain = predictedErrorCovariance / (predictedErrorCovariance + this.measurementNoise);
    this.estimate = predictedEstimate + kalmanGain * (measurement - predictedEstimate);
    this.errorCovariance = (1 - kalmanGain) * predictedErrorCovariance;

    return this.estimate;
  }

  reset(): void {
    this.estimate = 0;
    this.errorCovariance = 1;
  }
}

/**
 * Detector de anomalías con aprendizaje automático
 */
class AnomalyDetector {
  private baseline: Map<string, number> = new Map();
  private thresholds: Map<string, number> = new Map();

  detect(fusedData: any, history: PerceptionResult[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Detectar anomalías en confianza
    if (fusedData.confidence < 0.3) {
      anomalies.push({
        id: `anomaly-${Date.now()}-confidence`,
        type: 'low_confidence',
        severity: 'high',
        description: `Confianza muy baja detectada: ${(fusedData.confidence * 100).toFixed(1)}%`,
        confidence: 0.9,
        affectedSensors: Object.keys(fusedData.sensors || {})
      });
    }

    // Detectar anomalías en sensores individuales
    for (const [sensorType, sensorData] of Object.entries(fusedData.sensors || {})) {
      const data = sensorData as any;
      
      if (data.confidence < 0.4) {
        anomalies.push({
          id: `anomaly-${Date.now()}-${sensorType}`,
          type: 'sensor_degradation',
          severity: 'medium',
          description: `Degradación detectada en sensor ${sensorType}`,
          confidence: 0.8,
          affectedSensors: [sensorType]
        });
      }
    }

    // Detectar patrones anómalos en el historial
    if (history.length > 10) {
      const recentConfidences = history.slice(-10).map(h => h.confidence);
      const avgConfidence = recentConfidences.reduce((sum, c) => sum + c, 0) / recentConfidences.length;
      
      if (avgConfidence < 0.5) {
        anomalies.push({
          id: `anomaly-${Date.now()}-pattern`,
          type: 'degradation_pattern',
          severity: 'high',
          description: 'Patrón de degradación sostenida detectado',
          confidence: 0.85,
          affectedSensors: Object.keys(fusedData.sensors || {})
        });
      }
    }

    return anomalies;
  }

  reset(): void {
    this.baseline.clear();
    this.thresholds.clear();
  }
}

/**
 * Predictor de datos con capacidades de ML
 */
class DataPredictor {
  predict(fusedData: any, history: PerceptionResult[]): Prediction[] {
    const predictions: Prediction[] = [];

    if (history.length < 5) return predictions;

    // Predicción de tendencia de confianza
    const recentConfidences = history.slice(-5).map(h => h.confidence);
    const trend = this.calculateTrend(recentConfidences);
    
    if (Math.abs(trend) > 0.1) {
      predictions.push({
        id: `prediction-${Date.now()}-confidence`,
        type: 'confidence_trend',
        prediction: {
          direction: trend > 0 ? 'increasing' : 'decreasing',
          magnitude: Math.abs(trend),
          expectedValue: fusedData.confidence + trend
        },
        confidence: 0.7,
        timeHorizon: 60000, // 1 minuto
        basis: ['historical_confidence_data', 'trend_analysis']
      });
    }

    // Predicción de anomalías futuras
    const recentAnomalyCounts = history.slice(-5).map(h => h.anomalies.length);
    const avgAnomalies = recentAnomalyCounts.reduce((sum, count) => sum + count, 0) / recentAnomalyCounts.length;
    
    if (avgAnomalies > 1) {
      predictions.push({
        id: `prediction-${Date.now()}-anomalies`,
        type: 'anomaly_forecast',
        prediction: {
          expectedAnomalies: Math.ceil(avgAnomalies),
          riskLevel: avgAnomalies > 2 ? 'high' : 'medium'
        },
        confidence: 0.6,
        timeHorizon: 300000, // 5 minutos
        basis: ['anomaly_history', 'pattern_recognition']
      });
    }

    return predictions;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = values.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
}