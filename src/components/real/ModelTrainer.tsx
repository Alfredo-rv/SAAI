/**
 * Componente Real de Entrenamiento de Modelos
 */

import React, { useState } from 'react';
import { Brain, Play, BarChart3, Target, Settings, TrendingUp, Download } from 'lucide-react';
import { ModelBuilder, ModelConfig, TrainingResult } from '../../services/ModelBuilder';
import { AIService } from '../../services/AIService';

interface ModelTrainerProps {
  data: any[];
  columns: any[];
  onModelTrained: (result: TrainingResult) => void;
}

export function ModelTrainer({ data, columns, onModelTrained }: ModelTrainerProps) {
  const [selectedTarget, setSelectedTarget] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [modelType, setModelType] = useState<'linear_regression' | 'polynomial_regression'>('linear_regression');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [modelBuilder] = useState(() => new ModelBuilder());
  const [aiService] = useState(() => new AIService());

  const numericColumns = columns.filter((col: any) => col.type === 'numeric');
  const categoricalColumns = columns.filter((col: any) => col.type === 'categorical');

  const handleTrainModel = async () => {
    if (!selectedTarget || selectedFeatures.length === 0) {
      alert('Selecciona una variable objetivo y al menos una característica');
      return;
    }

    setIsTraining(true);
    
    try {
      console.log('🤖 Iniciando entrenamiento de modelo...');
      
      const config: ModelConfig = {
        type: modelType,
        target: selectedTarget,
        features: selectedFeatures,
        parameters: {
          degree: modelType === 'polynomial_regression' ? 2 : undefined
        }
      };

      const result = await modelBuilder.trainModel(data, config);
      
      setTrainingResult(result);
      onModelTrained(result);
      
      console.log('✅ Modelo entrenado exitosamente');
      
    } catch (error) {
      console.error('❌ Error entrenando modelo:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const downloadModel = () => {
    if (!trainingResult) return;

    const modelData = {
      id: trainingResult.modelId,
      config: { target: selectedTarget, features: selectedFeatures, type: modelType },
      metrics: trainingResult.metrics,
      accuracy: trainingResult.accuracy,
      timestamp: new Date()
    };

    const blob = new Blob([JSON.stringify(modelData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${trainingResult.modelId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Configuración del Modelo */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          Configuración del Modelo
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selección de Variable Objetivo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Target className="w-4 h-4 inline mr-1" />
              Variable Objetivo (Target)
            </label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">Seleccionar variable objetivo...</option>
              {numericColumns.map((col: any) => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.stats ? `μ=${col.stats.mean?.toFixed(2)}` : 'numérica'})
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Modelo */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Settings className="w-4 h-4 inline mr-1" />
              Tipo de Modelo
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value as any)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="linear_regression">Regresión Lineal</option>
              <option value="polynomial_regression">Regresión Polinomial</option>
            </select>
          </div>
        </div>

        {/* Selección de Características */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-3">
            <BarChart3 className="w-4 h-4 inline mr-1" />
            Características (Features)
          </label>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {numericColumns
              .filter((col: any) => col.name !== selectedTarget)
              .map((col: any) => (
                <label
                  key={col.name}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFeatures.includes(col.name)
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(col.name)}
                    onChange={() => handleFeatureToggle(col.name)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{col.name}</div>
                    <div className="text-xs text-gray-400">
                      {col.stats && 'mean' in col.stats ? `μ=${col.stats.mean.toFixed(1)}` : 'numérica'}
                    </div>
                  </div>
                </label>
              ))}
          </div>
        </div>

        {/* Botón de Entrenamiento */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleTrainModel}
            disabled={!selectedTarget || selectedFeatures.length === 0 || isTraining}
            className="flex items-center space-x-2 px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isTraining ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Entrenando Modelo...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Entrenar Modelo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultado del Entrenamiento */}
      {trainingResult && (
        <div className="bg-black/20 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-400 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Modelo Entrenado Exitosamente
            </h3>
            
            <button
              onClick={downloadModel}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Modelo</span>
            </button>
          </div>

          {/* Métricas del Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {trainingResult.accuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">Precisión (R²)</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">
                {trainingResult.metrics.rmse.toFixed(3)}
              </div>
              <div className="text-sm text-gray-400">RMSE</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {trainingResult.metrics.mae.toFixed(3)}
              </div>
              <div className="text-sm text-gray-400">MAE</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">
                {trainingResult.trainingTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-400">Tiempo</div>
            </div>
          </div>

          {/* Importancia de Características */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h4 className="font-bold mb-3">🎯 Importancia de Características</h4>
            <div className="space-y-2">
              {Object.entries(trainingResult.featureImportance)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([feature, importance]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <span className="text-white">{feature}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${importance * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-400 w-12">
                        {(importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Interpretación del Modelo */}
          <div className="bg-gray-800/30 rounded-lg p-4 mt-4">
            <h4 className="font-bold mb-2">🧠 Interpretación del Modelo</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <p>• <strong>R² = {trainingResult.metrics.r2.toFixed(3)}</strong>: El modelo explica {(trainingResult.metrics.r2 * 100).toFixed(1)}% de la varianza</p>
              <p>• <strong>RMSE = {trainingResult.metrics.rmse.toFixed(3)}</strong>: Error promedio de predicción</p>
              <p>• <strong>MAE = {trainingResult.metrics.mae.toFixed(3)}</strong>: Error absoluto promedio</p>
              <p>• <strong>Características:</strong> {selectedFeatures.length} variables utilizadas</p>
            </div>
          </div>
        </div>
      )}

      {/* Información de Ayuda */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h4 className="font-bold text-blue-400 mb-2">💡 Consejos para Mejores Modelos</h4>
        <div className="text-sm text-gray-300 space-y-1">
          <p>• <strong>Variable Objetivo:</strong> Elige la columna que quieres predecir</p>
          <p>• <strong>Características:</strong> Selecciona variables que puedan influir en el objetivo</p>
          <p>• <strong>Regresión Lineal:</strong> Mejor para relaciones lineales simples</p>
          <p>• <strong>Regresión Polinomial:</strong> Captura relaciones más complejas</p>
          <p>• <strong>R² > 0.7:</strong> Indica un modelo con buena capacidad predictiva</p>
        </div>
      </div>
    </div>
  );
}