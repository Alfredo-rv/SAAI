/**
 * Componente Real de Subida de Datos
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';
import { DataProcessor } from '../../services/DataProcessor';
import { DataEngineerAgent } from '../../agents/real/DataEngineerAgent';
import { EDAAnalystAgent } from '../../agents/real/EDAAnalystAgent';
import { AIService } from '../../services/AIService';

interface DataUploaderProps {
  onDataProcessed: (result: any) => void;
}

export function DataUploader({ onDataProcessed }: DataUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Inicializar servicios
  const [dataProcessor] = useState(() => new DataProcessor());
  const [aiService] = useState(() => new AIService());
  const [dataEngineer] = useState(() => new DataEngineerAgent(aiService));
  const [edaAnalyst] = useState(() => new EDAAnalystAgent(aiService));

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError('Solo se admiten archivos CSV y Excel (.csv, .xlsx, .xls)');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Paso 1: Procesar archivo
      setProcessingStep('Leyendo archivo...');
      const processResult = await dataProcessor.processFile(file);
      
      // Paso 2: Validar con Data Engineer
      setProcessingStep('Validando calidad de datos...');
      const validationResult = await dataEngineer.validateAndCleanDataset(file);
      
      // Paso 3: Análisis exploratorio
      setProcessingStep('Realizando análisis exploratorio...');
      const edaReport = await edaAnalyst.performEDA(
        validationResult.cleanedData || processResult.data,
        processResult.columns,
        'Análisis general del dataset'
      );

      // Paso 4: Sugerir columnas objetivo
      setProcessingStep('Analizando estructura para ML...');
      const targetSuggestions = await dataEngineer.suggestTargetColumn(processResult.columns);

      const finalResult = {
        file: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        processing: processResult,
        validation: validationResult,
        eda: edaReport,
        targetSuggestions,
        timestamp: new Date()
      };

      setResult(finalResult);
      onDataProcessed(finalResult);
      
      console.log('✅ Procesamiento completo del dataset');

    } catch (error) {
      console.error('❌ Error procesando archivo:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const downloadReport = () => {
    if (!result) return;

    const report = {
      dataset: result.file.name,
      timestamp: result.timestamp,
      summary: result.eda.summary,
      dataQuality: result.validation.summary,
      insights: result.eda.insights,
      recommendations: result.eda.recommendations,
      targetSuggestions: result.targetSuggestions
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.file.name}_analysis_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Área de Subida */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-purple-400 bg-purple-500/10'
            : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/5'
        }`}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-purple-400" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              Sube tu Dataset
            </h3>
            <p className="text-gray-400 mb-4">
              Arrastra y suelta tu archivo CSV o Excel aquí
            </p>
            
            <label className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer transition-colors">
              <FileText className="w-5 h-5 mr-2" />
              Seleccionar Archivo
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
          
          <p className="text-sm text-gray-500">
            Formatos soportados: CSV, Excel (.xlsx, .xls)
          </p>
        </div>
      </div>

      {/* Estado de Procesamiento */}
      {isProcessing && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            <Loader className="w-6 h-6 text-blue-400 animate-spin" />
            <div>
              <h4 className="font-bold text-blue-400">Procesando Dataset</h4>
              <p className="text-gray-300">{processingStep}</p>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-800 rounded-lg p-3">
            <div className="text-sm text-gray-400 space-y-1">
              <div>🔍 Data Engineer: Validando calidad de datos</div>
              <div>📊 EDA Analyst: Analizando patrones y correlaciones</div>
              <div>🤖 AI Service: Generando insights inteligentes</div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <h4 className="font-bold text-red-400">Error de Procesamiento</h4>
              <p className="text-gray-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <h4 className="font-bold text-green-400">Dataset Procesado Exitosamente</h4>
                <p className="text-gray-300">{result.file.name}</p>
              </div>
            </div>
            
            <button
              onClick={downloadReport}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Reporte</span>
            </button>
          </div>

          {/* Resumen Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">
                {result.processing.info.rows.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Filas de Datos</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {result.processing.info.columns}
              </div>
              <div className="text-sm text-gray-400">Columnas</div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round(result.processing.qualityReport.overallScore)}%
              </div>
              <div className="text-sm text-gray-400">Calidad de Datos</div>
            </div>
          </div>

          {/* Insights Principales */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <h5 className="font-bold mb-2">📊 Insights Principales:</h5>
            <div className="space-y-2">
              {result.eda.insights.slice(0, 3).map((insight: any, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    insight.importance === 'critical' ? 'bg-red-400' :
                    insight.importance === 'high' ? 'bg-orange-400' :
                    insight.importance === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}></div>
                  <div>
                    <div className="font-medium text-white">{insight.title}</div>
                    <div className="text-sm text-gray-400">{insight.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sugerencias de Target */}
          {result.targetSuggestions.length > 0 && (
            <div className="bg-gray-800/30 rounded-lg p-4 mt-4">
              <h5 className="font-bold mb-2">🎯 Columnas Sugeridas para Predicción:</h5>
              <div className="flex flex-wrap gap-2">
                {result.targetSuggestions.map((target: string) => (
                  <span
                    key={target}
                    className="px-3 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-sm"
                  >
                    {target}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}