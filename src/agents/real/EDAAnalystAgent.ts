/**
 * Agente EDA Analyst Real - Análisis Exploratorio de Datos
 */

import { AIService } from '../../services/AIService';
import { ColumnInfo, NumericStats, CategoricalStats } from '../../services/DataProcessor';

export interface EDAReport {
  id: string;
  timestamp: Date;
  summary: string;
  insights: DataInsight[];
  visualizations: VisualizationSpec[];
  correlations: CorrelationMatrix;
  recommendations: string[];
}

export interface DataInsight {
  type: 'distribution' | 'correlation' | 'outlier' | 'pattern' | 'trend';
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  evidence: any;
  actionable: boolean;
}

export interface VisualizationSpec {
  id: string;
  type: 'histogram' | 'scatter' | 'boxplot' | 'heatmap' | 'bar' | 'line';
  title: string;
  xAxis: string;
  yAxis?: string;
  data: any[];
  config: any;
}

export interface CorrelationMatrix {
  variables: string[];
  matrix: number[][];
  strongCorrelations: Array<{
    var1: string;
    var2: string;
    correlation: number;
    interpretation: string;
  }>;
}

export class EDAAnalystAgent {
  private aiService: AIService;
  private analysisHistory: EDAReport[] = [];

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async performEDA(data: any[], columns: ColumnInfo[], objective?: string): Promise<EDAReport> {
    console.log('📊 EDA Analyst: Realizando análisis exploratorio...');

    const reportId = `eda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generar insights
    const insights = await this.generateInsights(data, columns);
    
    // Crear visualizaciones
    const visualizations = await this.createVisualizations(data, columns);
    
    // Calcular correlaciones
    const correlations = await this.calculateCorrelations(data, columns);
    
    // Generar recomendaciones
    const recommendations = await this.generateRecommendations(data, columns, insights, objective);
    
    // Crear resumen con IA
    const summary = await this.generateSummary(data, columns, insights, objective);

    const report: EDAReport = {
      id: reportId,
      timestamp: new Date(),
      summary,
      insights,
      visualizations,
      correlations,
      recommendations
    };

    this.analysisHistory.push(report);
    console.log(`✅ EDA completado: ${insights.length} insights, ${visualizations.length} visualizaciones`);

    return report;
  }

  private async generateInsights(data: any[], columns: ColumnInfo[]): Promise<DataInsight[]> {
    const insights: DataInsight[] = [];

    // Insights sobre distribuciones
    for (const column of columns) {
      if (column.type === 'numeric' && column.stats && 'mean' in column.stats) {
        const stats = column.stats as NumericStats;
        
        // Detectar distribución sesgada
        const skewness = this.calculateSkewness(data.map(row => Number(row[column.name])).filter(v => !isNaN(v)));
        if (Math.abs(skewness) > 1) {
          insights.push({
            type: 'distribution',
            title: `Distribución Sesgada: ${column.name}`,
            description: `La variable ${column.name} tiene una distribución ${skewness > 0 ? 'sesgada a la derecha' : 'sesgada a la izquierda'} (skewness: ${skewness.toFixed(2)})`,
            importance: 'medium',
            evidence: { skewness, mean: stats.mean, median: stats.median },
            actionable: true
          });
        }

        // Detectar outliers significativos
        if (stats.outliers.length > data.length * 0.05) {
          insights.push({
            type: 'outlier',
            title: `Outliers Detectados: ${column.name}`,
            description: `Se detectaron ${stats.outliers.length} valores atípicos (${((stats.outliers.length / data.length) * 100).toFixed(1)}% del dataset)`,
            importance: 'high',
            evidence: { outliers: stats.outliers, percentage: (stats.outliers.length / data.length) * 100 },
            actionable: true
          });
        }
      }

      // Insights sobre variables categóricas
      if (column.type === 'categorical' && column.stats && 'topValues' in column.stats) {
        const stats = column.stats as CategoricalStats;
        
        // Detectar desbalance de clases
        const topPercentage = stats.topValues[0]?.percentage || 0;
        if (topPercentage > 80) {
          insights.push({
            type: 'distribution',
            title: `Desbalance de Clases: ${column.name}`,
            description: `La categoría "${stats.topValues[0].value}" representa ${topPercentage.toFixed(1)}% de los datos`,
            importance: 'high',
            evidence: { topCategory: stats.topValues[0], distribution: stats.topValues },
            actionable: true
          });
        }
      }
    }

    // Insights sobre completitud de datos
    const totalCells = data.length * columns.length;
    const totalNulls = columns.reduce((sum, col) => sum + col.nullCount, 0);
    const nullPercentage = (totalNulls / totalCells) * 100;

    if (nullPercentage > 20) {
      insights.push({
        type: 'pattern',
        title: 'Alto Porcentaje de Datos Faltantes',
        description: `${nullPercentage.toFixed(1)}% de los datos están faltantes`,
        importance: 'high',
        evidence: { nullPercentage, totalNulls, totalCells },
        actionable: true
      });
    }

    return insights;
  }

  private calculateSkewness(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    
    if (std === 0) return 0;

    const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / values.length;
    return skewness;
  }

  private async createVisualizations(data: any[], columns: ColumnInfo[]): Promise<VisualizationSpec[]> {
    const visualizations: VisualizationSpec[] = [];

    // Histogramas para variables numéricas
    const numericColumns = columns.filter(col => col.type === 'numeric').slice(0, 4);
    for (const column of numericColumns) {
      const values = data.map(row => Number(row[column.name])).filter(v => !isNaN(v));
      
      if (values.length > 0) {
        // Crear bins para histograma
        const bins = this.createHistogramBins(values, 20);
        
        visualizations.push({
          id: `hist-${column.name}`,
          type: 'histogram',
          title: `Distribución de ${column.name}`,
          xAxis: column.name,
          data: bins,
          config: {
            binCount: 20,
            showMean: true,
            showMedian: true
          }
        });
      }
    }

    // Scatter plots para correlaciones
    const numericCols = columns.filter(col => col.type === 'numeric').slice(0, 3);
    if (numericCols.length >= 2) {
      for (let i = 0; i < numericCols.length - 1; i++) {
        const col1 = numericCols[i];
        const col2 = numericCols[i + 1];
        
        const scatterData = data
          .filter(row => !isNaN(Number(row[col1.name])) && !isNaN(Number(row[col2.name])))
          .map(row => ({
            x: Number(row[col1.name]),
            y: Number(row[col2.name])
          }));

        if (scatterData.length > 0) {
          visualizations.push({
            id: `scatter-${col1.name}-${col2.name}`,
            type: 'scatter',
            title: `${col1.name} vs ${col2.name}`,
            xAxis: col1.name,
            yAxis: col2.name,
            data: scatterData,
            config: {
              showTrendLine: true,
              pointSize: 3
            }
          });
        }
      }
    }

    // Box plots para detectar outliers
    for (const column of numericColumns.slice(0, 3)) {
      const values = data.map(row => Number(row[column.name])).filter(v => !isNaN(v));
      
      if (values.length > 0 && column.stats && 'q1' in column.stats) {
        const stats = column.stats as NumericStats;
        
        visualizations.push({
          id: `box-${column.name}`,
          type: 'boxplot',
          title: `Box Plot: ${column.name}`,
          xAxis: column.name,
          data: [{
            min: stats.min,
            q1: stats.q1,
            median: stats.median,
            q3: stats.q3,
            max: stats.max,
            outliers: stats.outliers
          }],
          config: {
            showOutliers: true,
            showMean: true
          }
        });
      }
    }

    return visualizations;
  }

  private createHistogramBins(values: number[], binCount: number): Array<{ bin: string; count: number; range: [number, number] }> {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / binCount;
    
    const bins: Array<{ bin: string; count: number; range: [number, number] }> = [];
    
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      const count = values.filter(v => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)).length;
      
      bins.push({
        bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        count,
        range: [binStart, binEnd]
      });
    }
    
    return bins;
  }

  private async calculateCorrelations(data: any[], columns: ColumnInfo[]): Promise<CorrelationMatrix> {
    const numericColumns = columns.filter(col => col.type === 'numeric');
    const variables = numericColumns.map(col => col.name);
    
    if (variables.length < 2) {
      return {
        variables: [],
        matrix: [],
        strongCorrelations: []
      };
    }

    // Calcular matriz de correlación
    const matrix: number[][] = [];
    
    for (let i = 0; i < variables.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < variables.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const correlation = this.calculatePearsonCorrelation(
            data.map(row => Number(row[variables[i]])).filter(v => !isNaN(v)),
            data.map(row => Number(row[variables[j]])).filter(v => !isNaN(v))
          );
          row.push(correlation);
        }
      }
      matrix.push(row);
    }

    // Identificar correlaciones fuertes
    const strongCorrelations: Array<{
      var1: string;
      var2: string;
      correlation: number;
      interpretation: string;
    }> = [];

    for (let i = 0; i < variables.length; i++) {
      for (let j = i + 1; j < variables.length; j++) {
        const correlation = matrix[i][j];
        
        if (Math.abs(correlation) > 0.7) {
          strongCorrelations.push({
            var1: variables[i],
            var2: variables[j],
            correlation,
            interpretation: this.interpretCorrelation(correlation)
          });
        }
      }
    }

    return {
      variables,
      matrix,
      strongCorrelations
    };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private interpretCorrelation(correlation: number): string {
    const abs = Math.abs(correlation);
    const direction = correlation > 0 ? 'positiva' : 'negativa';
    
    if (abs > 0.9) return `Correlación ${direction} muy fuerte`;
    if (abs > 0.7) return `Correlación ${direction} fuerte`;
    if (abs > 0.5) return `Correlación ${direction} moderada`;
    if (abs > 0.3) return `Correlación ${direction} débil`;
    return 'Sin correlación significativa';
  }

  private async generateRecommendations(
    data: any[], 
    columns: ColumnInfo[], 
    insights: DataInsight[],
    objective?: string
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Recomendaciones basadas en insights
    const criticalInsights = insights.filter(i => i.importance === 'critical');
    const highInsights = insights.filter(i => i.importance === 'high');

    if (criticalInsights.length > 0) {
      recommendations.push('🚨 Atender problemas críticos detectados en el análisis');
    }

    if (highInsights.some(i => i.type === 'outlier')) {
      recommendations.push('🎯 Implementar estrategia para manejo de outliers');
    }

    if (highInsights.some(i => i.type === 'correlation')) {
      recommendations.push('🔗 Considerar reducción de dimensionalidad por multicolinealidad');
    }

    // Recomendaciones específicas por objetivo
    if (objective) {
      if (objective.toLowerCase().includes('predicción') || objective.toLowerCase().includes('regresión')) {
        recommendations.push('📈 Evaluar modelos de regresión (Linear, Random Forest, XGBoost)');
        recommendations.push('🎯 Considerar validación cruzada para evaluación robusta');
      }
      
      if (objective.toLowerCase().includes('clasificación') || objective.toLowerCase().includes('categoría')) {
        recommendations.push('🏷️ Evaluar modelos de clasificación (Logistic Regression, SVM, Random Forest)');
        recommendations.push('⚖️ Verificar balance de clases en variable objetivo');
      }
    }

    // Recomendaciones generales
    const numericColumns = columns.filter(c => c.type === 'numeric').length;
    if (numericColumns > 10) {
      recommendations.push('📊 Considerar selección de características para reducir dimensionalidad');
    }

    if (data.length < 100) {
      recommendations.push('📈 Dataset pequeño: considerar técnicas de aumento de datos');
    }

    return recommendations;
  }

  private async generateSummary(
    data: any[], 
    columns: ColumnInfo[], 
    insights: DataInsight[],
    objective?: string
  ): Promise<string> {
    const numericCols = columns.filter(c => c.type === 'numeric').length;
    const categoricalCols = columns.filter(c => c.type === 'categorical').length;
    const criticalInsights = insights.filter(i => i.importance === 'critical').length;
    const highInsights = insights.filter(i => i.importance === 'high').length;

    // Usar IA para generar resumen inteligente
    try {
      const prompt = `
Como analista de datos experto, crea un resumen ejecutivo de este análisis exploratorio:

**Dataset:** ${data.length} filas, ${columns.length} columnas
**Composición:** ${numericCols} numéricas, ${categoricalCols} categóricas
**Objetivo:** ${objective || 'Análisis general'}
**Insights:** ${criticalInsights} críticos, ${highInsights} importantes

**Problemas Principales:**
${insights.filter(i => i.importance === 'critical' || i.importance === 'high')
  .map(i => `- ${i.title}: ${i.description}`)
  .join('\n')}

Crea un resumen ejecutivo en español, conciso pero completo, que incluya:
1. Estado general del dataset
2. Principales hallazgos
3. Recomendaciones clave
4. Próximos pasos sugeridos
`;

      const aiResponse = await this.aiService.generateResponse({
        provider: 'local',
        model: 'local-llm',
        prompt,
        temperature: 0.4
      });

      return aiResponse.content;

    } catch (error) {
      // Fallback a resumen manual
      return `
📊 **Análisis Exploratorio Completado**

**Estado del Dataset:** ${data.length} filas × ${columns.length} columnas
- ${numericCols} variables numéricas
- ${categoricalCols} variables categóricas

**Hallazgos Principales:**
- ${insights.length} insights detectados
- ${criticalInsights} problemas críticos
- ${highInsights} oportunidades de mejora

**Recomendación:** ${criticalInsights > 0 ? 'Resolver problemas críticos antes de continuar' : 'Dataset listo para modelado'}
      `.trim();
    }
  }

  async suggestModelingApproach(
    data: any[], 
    columns: ColumnInfo[], 
    targetColumn: string,
    objective: string
  ): Promise<string> {
    const targetCol = columns.find(col => col.name === targetColumn);
    if (!targetCol) {
      throw new Error(`Columna objetivo no encontrada: ${targetColumn}`);
    }

    const prompt = `
Como experto en Machine Learning, sugiere el mejor enfoque de modelado:

**Objetivo:** ${objective}
**Variable Objetivo:** ${targetColumn} (${targetCol.type})
**Dataset:** ${data.length} filas, ${columns.length} características
**Variables Numéricas:** ${columns.filter(c => c.type === 'numeric').length}
**Variables Categóricas:** ${columns.filter(c => c.type === 'categorical').length}

${targetCol.stats && 'mean' in targetCol.stats ? 
  `**Estadísticas Target:** Media=${targetCol.stats.mean.toFixed(2)}, Std=${targetCol.stats.std.toFixed(2)}` : 
  ''}

Proporciona:
1. Tipo de problema (regresión/clasificación)
2. Algoritmos recomendados (3-5)
3. Métricas de evaluación apropiadas
4. Estrategia de validación
5. Preprocesamiento necesario
`;

    const response = await this.aiService.generateResponse({
      provider: 'local',
      model: 'local-llm',
      prompt,
      temperature: 0.3
    });

    return response.content;
  }

  getAnalysisHistory(): EDAReport[] {
    return [...this.analysisHistory];
  }

  getAgentStats() {
    const totalAnalyses = this.analysisHistory.length;
    const avgInsights = totalAnalyses > 0 
      ? this.analysisHistory.reduce((sum, report) => sum + report.insights.length, 0) / totalAnalyses
      : 0;

    return {
      totalAnalyses,
      avgInsights,
      avgVisualizations: totalAnalyses > 0 
        ? this.analysisHistory.reduce((sum, report) => sum + report.visualizations.length, 0) / totalAnalyses
        : 0,
      isActive: true
    };
  }
}