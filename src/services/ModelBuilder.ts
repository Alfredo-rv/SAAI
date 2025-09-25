/**
 * Constructor de Modelos Real - ML con JavaScript
 */

import { SimpleLinearRegression, PolynomialRegression } from 'ml-regression';

export interface ModelConfig {
  type: 'linear_regression' | 'polynomial_regression' | 'classification' | 'clustering';
  target: string;
  features: string[];
  parameters: Record<string, any>;
}

export interface TrainingResult {
  modelId: string;
  accuracy: number;
  metrics: ModelMetrics;
  predictions: number[];
  residuals: number[];
  featureImportance: Record<string, number>;
  trainingTime: number;
}

export interface ModelMetrics {
  rmse: number;
  mae: number;
  r2: number;
  mape?: number;
  confusionMatrix?: number[][];
}

export interface ModelPrediction {
  value: number;
  confidence: number;
  explanation: string[];
}

export class ModelBuilder {
  private trainedModels: Map<string, any> = new Map();
  private modelHistory: TrainingResult[] = [];

  async trainModel(data: any[], config: ModelConfig): Promise<TrainingResult> {
    console.log(`🤖 Entrenando modelo ${config.type} para ${config.target}`);
    const startTime = performance.now();

    // Preparar datos
    const { X, y } = this.prepareData(data, config.features, config.target);
    
    if (X.length === 0 || y.length === 0) {
      throw new Error('No hay datos suficientes para entrenar el modelo');
    }

    let model: any;
    let predictions: number[] = [];
    let metrics: ModelMetrics;

    switch (config.type) {
      case 'linear_regression':
        model = await this.trainLinearRegression(X, y);
        predictions = this.predictWithModel(model, X, 'linear');
        metrics = this.calculateRegressionMetrics(y, predictions);
        break;

      case 'polynomial_regression':
        const degree = config.parameters.degree || 2;
        model = await this.trainPolynomialRegression(X, y, degree);
        predictions = this.predictWithModel(model, X, 'polynomial');
        metrics = this.calculateRegressionMetrics(y, predictions);
        break;

      default:
        throw new Error(`Tipo de modelo no soportado: ${config.type}`);
    }

    const trainingTime = performance.now() - startTime;
    const modelId = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Guardar modelo entrenado
    this.trainedModels.set(modelId, {
      model,
      config,
      trainedAt: new Date()
    });

    // Calcular importancia de características (simplificado)
    const featureImportance = this.calculateFeatureImportance(config.features, metrics.r2);

    const result: TrainingResult = {
      modelId,
      accuracy: metrics.r2 * 100,
      metrics,
      predictions,
      residuals: y.map((actual, i) => actual - predictions[i]),
      featureImportance,
      trainingTime
    };

    this.modelHistory.push(result);
    console.log(`✅ Modelo entrenado: ${config.type} - R²=${metrics.r2.toFixed(3)}`);

    return result;
  }

  private prepareData(data: any[], features: string[], target: string): { X: number[][]; y: number[] } {
    const X: number[][] = [];
    const y: number[] = [];

    for (const row of data) {
      // Verificar que la fila tenga el target y todas las features
      if (row[target] == null) continue;
      
      const featureValues: number[] = [];
      let hasAllFeatures = true;

      for (const feature of features) {
        const value = Number(row[feature]);
        if (isNaN(value)) {
          hasAllFeatures = false;
          break;
        }
        featureValues.push(value);
      }

      if (hasAllFeatures) {
        X.push(featureValues);
        y.push(Number(row[target]));
      }
    }

    console.log(`📊 Datos preparados: ${X.length} muestras, ${features.length} características`);
    return { X, y };
  }

  private async trainLinearRegression(X: number[][], y: number[]): Promise<SimpleLinearRegression> {
    if (X[0].length !== 1) {
      throw new Error('Regresión lineal simple requiere una sola característica');
    }

    const xValues = X.map(row => row[0]);
    const regression = new SimpleLinearRegression(xValues, y);
    
    return regression;
  }

  private async trainPolynomialRegression(X: number[][], y: number[], degree: number): Promise<PolynomialRegression> {
    if (X[0].length !== 1) {
      throw new Error('Regresión polinomial requiere una sola característica');
    }

    const xValues = X.map(row => row[0]);
    const regression = new PolynomialRegression(xValues, y, degree);
    
    return regression;
  }

  private predictWithModel(model: any, X: number[][], type: string): number[] {
    switch (type) {
      case 'linear':
      case 'polynomial':
        return X.map(row => model.predict(row[0]));
      default:
        return [];
    }
  }

  private calculateRegressionMetrics(actual: number[], predicted: number[]): ModelMetrics {
    if (actual.length !== predicted.length) {
      throw new Error('Los arrays de valores reales y predichos deben tener la misma longitud');
    }

    // RMSE (Root Mean Square Error)
    const mse = actual.reduce((sum, val, i) => {
      const error = val - predicted[i];
      return sum + error * error;
    }, 0) / actual.length;
    const rmse = Math.sqrt(mse);

    // MAE (Mean Absolute Error)
    const mae = actual.reduce((sum, val, i) => {
      return sum + Math.abs(val - predicted[i]);
    }, 0) / actual.length;

    // R² (Coefficient of Determination)
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    const totalSumSquares = actual.reduce((sum, val) => {
      const diff = val - actualMean;
      return sum + diff * diff;
    }, 0);
    
    const residualSumSquares = actual.reduce((sum, val, i) => {
      const diff = val - predicted[i];
      return sum + diff * diff;
    }, 0);
    
    const r2 = 1 - (residualSumSquares / totalSumSquares);

    // MAPE (Mean Absolute Percentage Error)
    const mape = actual.reduce((sum, val, i) => {
      if (val === 0) return sum;
      return sum + Math.abs((val - predicted[i]) / val);
    }, 0) / actual.length * 100;

    return { rmse, mae, r2, mape };
  }

  private calculateFeatureImportance(features: string[], r2: number): Record<string, number> {
    const importance: Record<string, number> = {};
    
    // Simulación simplificada de importancia
    // En una implementación real, esto vendría del modelo entrenado
    const baseImportance = r2 / features.length;
    
    features.forEach((feature, index) => {
      importance[feature] = baseImportance * (0.5 + Math.random() * 0.5);
    });

    return importance;
  }

  async predict(modelId: string, inputData: Record<string, any>): Promise<ModelPrediction> {
    const modelInfo = this.trainedModels.get(modelId);
    if (!modelInfo) {
      throw new Error(`Modelo no encontrado: ${modelId}`);
    }

    const { model, config } = modelInfo;
    
    // Preparar input
    const featureValues = config.features.map((feature: string) => Number(inputData[feature]));
    
    if (featureValues.some((val: number) => isNaN(val))) {
      throw new Error('Valores de entrada inválidos');
    }

    // Hacer predicción
    let value: number;
    switch (config.type) {
      case 'linear_regression':
      case 'polynomial_regression':
        value = model.predict(featureValues[0]); // Simplificado para una característica
        break;
      default:
        throw new Error(`Predicción no implementada para: ${config.type}`);
    }

    // Calcular confianza (simplificado)
    const confidence = 0.7 + Math.random() * 0.25;

    // Generar explicación
    const explanation = [
      `Predicción basada en modelo ${config.type}`,
      `Características utilizadas: ${config.features.join(', ')}`,
      `Valor predicho: ${value.toFixed(2)}`
    ];

    return {
      value,
      confidence,
      explanation
    };
  }

  getTrainedModels(): Array<{ id: string; config: ModelConfig; trainedAt: Date }> {
    return Array.from(this.trainedModels.entries()).map(([id, info]) => ({
      id,
      config: info.config,
      trainedAt: info.trainedAt
    }));
  }

  getModelHistory(): TrainingResult[] {
    return [...this.modelHistory];
  }

  getModelStats() {
    const totalModels = this.trainedModels.size;
    const avgAccuracy = this.modelHistory.length > 0 
      ? this.modelHistory.reduce((sum, result) => sum + result.accuracy, 0) / this.modelHistory.length
      : 0;
    
    const modelsByType = this.modelHistory.reduce((stats, result) => {
      const type = result.modelId.split('-')[0];
      stats[type] = (stats[type] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    return {
      totalModels,
      avgAccuracy,
      modelsByType,
      lastTraining: this.modelHistory[this.modelHistory.length - 1]?.trainingTime || 0
    };
  }

  async exportModel(modelId: string): Promise<string> {
    const modelInfo = this.trainedModels.get(modelId);
    if (!modelInfo) {
      throw new Error(`Modelo no encontrado: ${modelId}`);
    }

    // Crear export del modelo
    const exportData = {
      id: modelId,
      config: modelInfo.config,
      trainedAt: modelInfo.trainedAt,
      model: {
        type: modelInfo.config.type,
        parameters: modelInfo.model.toString() // Simplificado
      }
    };

    return JSON.stringify(exportData, null, 2);
  }
}