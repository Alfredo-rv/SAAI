/**
 * Agente Data Engineer Real - Validación y limpieza de datos
 */

import { DataProcessor, DataQualityReport, ColumnInfo } from '../../services/DataProcessor';
import { AIService } from '../../services/AIService';

export interface DataValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  cleanedData?: any[];
  recommendations: string[];
  summary: string;
}

export interface ValidationIssue {
  type: 'schema' | 'quality' | 'consistency' | 'completeness';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  column?: string;
  affectedRows: number;
  autoFixable: boolean;
}

export class DataEngineerAgent {
  private dataProcessor: DataProcessor;
  private aiService: AIService;
  private validationHistory: DataValidationResult[] = [];

  constructor(aiService: AIService) {
    this.dataProcessor = new DataProcessor();
    this.aiService = aiService;
  }

  async validateAndCleanDataset(file: File): Promise<DataValidationResult> {
    console.log('🔍 Data Engineer: Validando dataset...');

    try {
      // Procesar archivo
      const { data, info, columns, qualityReport } = await this.dataProcessor.processFile(file);
      
      // Validar estructura
      const structuralIssues = await this.validateStructure(data, columns);
      
      // Validar calidad
      const qualityIssues = this.convertQualityToValidationIssues(qualityReport);
      
      // Combinar todos los problemas
      const allIssues = [...structuralIssues, ...qualityIssues];
      
      // Determinar si es válido
      const criticalIssues = allIssues.filter(issue => issue.severity === 'critical');
      const isValid = criticalIssues.length === 0;
      
      // Limpiar datos si es posible
      let cleanedData: any[] | undefined;
      if (isValid || allIssues.every(issue => issue.autoFixable)) {
        cleanedData = await this.dataProcessor.cleanData(data, columns);
      }
      
      // Generar recomendaciones con IA
      const recommendations = await this.generateRecommendations(data, columns, allIssues);
      
      // Crear resumen
      const summary = await this.createValidationSummary(info, allIssues, isValid);

      const result: DataValidationResult = {
        isValid,
        issues: allIssues,
        cleanedData,
        recommendations,
        summary
      };

      this.validationHistory.push(result);
      console.log(`✅ Validación completada: ${isValid ? 'VÁLIDO' : 'REQUIERE ATENCIÓN'}`);

      return result;

    } catch (error) {
      console.error('❌ Error en validación:', error);
      throw new Error(`Error validando dataset: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  private async validateStructure(data: any[], columns: ColumnInfo[]): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Validar que hay datos
    if (data.length === 0) {
      issues.push({
        type: 'completeness',
        severity: 'critical',
        description: 'El dataset está vacío',
        affectedRows: 0,
        autoFixable: false
      });
      return issues;
    }

    // Validar que hay columnas
    if (columns.length === 0) {
      issues.push({
        type: 'schema',
        severity: 'critical',
        description: 'No se detectaron columnas válidas',
        affectedRows: data.length,
        autoFixable: false
      });
      return issues;
    }

    // Validar consistencia de columnas
    const expectedColumns = Object.keys(data[0]);
    for (let i = 1; i < Math.min(data.length, 100); i++) {
      const rowColumns = Object.keys(data[i]);
      if (rowColumns.length !== expectedColumns.length) {
        issues.push({
          type: 'consistency',
          severity: 'high',
          description: `Fila ${i + 1} tiene diferente número de columnas`,
          affectedRows: 1,
          autoFixable: true
        });
      }
    }

    // Validar tamaño mínimo para ML
    if (data.length < 10) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        description: 'Dataset muy pequeño para machine learning (< 10 filas)',
        affectedRows: data.length,
        autoFixable: false
      });
    }

    // Validar que hay al menos una columna numérica
    const numericColumns = columns.filter(col => col.type === 'numeric');
    if (numericColumns.length === 0) {
      issues.push({
        type: 'schema',
        severity: 'medium',
        description: 'No se encontraron columnas numéricas para análisis',
        affectedRows: data.length,
        autoFixable: false
      });
    }

    return issues;
  }

  private convertQualityToValidationIssues(qualityReport: DataQualityReport): ValidationIssue[] {
    return qualityReport.issues.map(issue => ({
      type: 'quality',
      severity: issue.severity,
      description: issue.description,
      column: issue.column,
      affectedRows: issue.affectedRows,
      autoFixable: issue.type === 'duplicates' || issue.type === 'missing_values'
    }));
  }

  private async generateRecommendations(
    data: any[], 
    columns: ColumnInfo[], 
    issues: ValidationIssue[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Recomendaciones basadas en problemas detectados
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Resolver problemas críticos antes de continuar');
      recommendations.push('📋 Verificar la estructura y formato del archivo');
    }

    if (highIssues.length > 0) {
      recommendations.push('⚠️ Atender problemas de alta prioridad');
      recommendations.push('🔧 Aplicar limpieza de datos automática');
    }

    // Recomendaciones específicas por tipo de datos
    const numericColumns = columns.filter(c => c.type === 'numeric').length;
    const categoricalColumns = columns.filter(c => c.type === 'categorical').length;

    if (numericColumns > 0) {
      recommendations.push('📊 Considerar normalización de variables numéricas');
      recommendations.push('🎯 Evaluar correlaciones entre variables numéricas');
    }

    if (categoricalColumns > 0) {
      recommendations.push('🏷️ Aplicar encoding a variables categóricas');
      recommendations.push('📈 Analizar distribución de categorías');
    }

    // Usar IA para recomendaciones adicionales
    try {
      const aiPrompt = `
Como Data Engineer experto, analiza este dataset y proporciona 3 recomendaciones específicas:

Dataset: ${data.length} filas, ${columns.length} columnas
Tipos: ${numericColumns} numéricas, ${categoricalColumns} categóricas
Problemas: ${issues.length} detectados

Proporciona recomendaciones técnicas específicas para mejorar la calidad de datos.
`;

      const aiResponse = await this.aiService.generateResponse({
        provider: 'local',
        model: 'local-llm',
        prompt: aiPrompt,
        temperature: 0.3
      });

      // Extraer recomendaciones del texto de IA
      const aiRecommendations = aiResponse.content
        .split('\n')
        .filter(line => line.includes('-') || line.includes('•'))
        .slice(0, 3)
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(rec => rec.length > 10);

      recommendations.push(...aiRecommendations);

    } catch (error) {
      console.warn('⚠️ No se pudieron generar recomendaciones con IA');
    }

    return recommendations;
  }

  private async createValidationSummary(
    info: any, 
    issues: ValidationIssue[], 
    isValid: boolean
  ): Promise<string> {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;

    let status = '✅ VÁLIDO';
    if (!isValid) {
      status = criticalCount > 0 ? '❌ CRÍTICO' : '⚠️ REQUIERE ATENCIÓN';
    }

    return `
**${status}** - Validación de ${info.name}

📊 **Estructura:** ${info.rows} filas × ${info.columns} columnas (${(info.size / 1024).toFixed(1)} KB)

🔍 **Problemas Detectados:**
${criticalCount > 0 ? `- 🚨 ${criticalCount} críticos` : ''}
${highCount > 0 ? `- ⚠️ ${highCount} alta prioridad` : ''}
${mediumCount > 0 ? `- 📋 ${mediumCount} media prioridad` : ''}
${issues.length === 0 ? '- ✅ No se detectaron problemas' : ''}

🎯 **Estado:** ${isValid ? 'Listo para análisis' : 'Requiere limpieza'}
    `.trim();
  }

  async suggestTargetColumn(columns: ColumnInfo[]): Promise<string[]> {
    // Sugerir columnas que podrían ser buenos targets para ML
    const suggestions: string[] = [];

    // Columnas numéricas con buena varianza
    const numericColumns = columns.filter(col => 
      col.type === 'numeric' && 
      col.stats && 
      'std' in col.stats && 
      col.stats.std > 0
    );

    // Priorizar columnas con nombres que sugieren targets
    const targetKeywords = ['target', 'label', 'class', 'outcome', 'result', 'price', 'value', 'score'];
    
    for (const col of numericColumns) {
      const nameWords = col.name.toLowerCase().split(/[_\s-]/);
      if (targetKeywords.some(keyword => nameWords.includes(keyword))) {
        suggestions.unshift(col.name); // Añadir al principio
      } else {
        suggestions.push(col.name);
      }
    }

    return suggestions.slice(0, 5); // Top 5 sugerencias
  }

  getValidationHistory(): DataValidationResult[] {
    return [...this.validationHistory];
  }

  getAgentStats() {
    const totalValidations = this.validationHistory.length;
    const successfulValidations = this.validationHistory.filter(v => v.isValid).length;
    const successRate = totalValidations > 0 ? (successfulValidations / totalValidations) * 100 : 0;

    return {
      totalValidations,
      successRate,
      avgIssuesPerDataset: totalValidations > 0 
        ? this.validationHistory.reduce((sum, v) => sum + v.issues.length, 0) / totalValidations 
        : 0,
      isActive: true
    };
  }
}