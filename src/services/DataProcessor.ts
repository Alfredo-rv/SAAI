/**
 * Procesador de Datos Real - Análisis de CSV/Excel
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { mean, median, mode, standardDeviation, variance, min, max } from 'simple-statistics';

export interface DatasetInfo {
  name: string;
  rows: number;
  columns: number;
  size: number;
  type: 'csv' | 'excel';
  encoding?: string;
}

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text';
  nullCount: number;
  uniqueCount: number;
  stats?: NumericStats | CategoricalStats;
}

export interface NumericStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  outliers: number[];
}

export interface CategoricalStats {
  mode: string;
  frequency: Record<string, number>;
  topValues: Array<{ value: string; count: number; percentage: number }>;
}

export interface DataQualityReport {
  overallScore: number;
  issues: DataQualityIssue[];
  recommendations: string[];
  summary: string;
}

export interface DataQualityIssue {
  type: 'missing_values' | 'duplicates' | 'outliers' | 'inconsistent_format' | 'low_variance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  column?: string;
  description: string;
  affectedRows: number;
  suggestion: string;
}

export class DataProcessor {
  async processFile(file: File): Promise<{
    data: any[];
    info: DatasetInfo;
    columns: ColumnInfo[];
    qualityReport: DataQualityReport;
  }> {
    console.log(`📊 Procesando archivo: ${file.name}`);
    
    let data: any[];
    const info: DatasetInfo = {
      name: file.name,
      rows: 0,
      columns: 0,
      size: file.size,
      type: file.name.endsWith('.csv') ? 'csv' : 'excel'
    };

    // Procesar según el tipo de archivo
    if (info.type === 'csv') {
      data = await this.processCSV(file);
    } else {
      data = await this.processExcel(file);
    }

    // Analizar estructura de datos
    info.rows = data.length;
    info.columns = data.length > 0 ? Object.keys(data[0]).length : 0;

    // Analizar columnas
    const columns = await this.analyzeColumns(data);
    
    // Generar reporte de calidad
    const qualityReport = await this.generateQualityReport(data, columns);

    console.log(`✅ Archivo procesado: ${info.rows} filas, ${info.columns} columnas`);

    return { data, info, columns, qualityReport };
  }

  private async processCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('⚠️ Errores en CSV:', results.errors);
          }
          resolve(results.data as any[]);
        },
        error: (error) => {
          reject(new Error(`Error procesando CSV: ${error.message}`));
        }
      });
    });
  }

  private async processExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Usar la primera hoja
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: null
          });
          
          // Convertir a formato con headers
          if (jsonData.length === 0) {
            resolve([]);
            return;
          }
          
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          const result = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] ?? null;
            });
            return obj;
          });
          
          resolve(result);
        } catch (error) {
          reject(new Error(`Error procesando Excel: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Error leyendo archivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async analyzeColumns(data: any[]): Promise<ColumnInfo[]> {
    if (data.length === 0) return [];

    const columns: ColumnInfo[] = [];
    const columnNames = Object.keys(data[0]);

    for (const columnName of columnNames) {
      const values = data.map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== '');
      const allValues = data.map(row => row[columnName]);
      
      const nullCount = allValues.length - values.length;
      const uniqueValues = [...new Set(values)];
      const uniqueCount = uniqueValues.length;

      // Determinar tipo de columna
      const type = this.detectColumnType(values);
      
      // Generar estadísticas según el tipo
      let stats: NumericStats | CategoricalStats | undefined;
      
      if (type === 'numeric' && values.length > 0) {
        const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        if (numericValues.length > 0) {
          stats = this.calculateNumericStats(numericValues);
        }
      } else if (type === 'categorical' && values.length > 0) {
        stats = this.calculateCategoricalStats(values);
      }

      columns.push({
        name: columnName,
        type,
        nullCount,
        uniqueCount,
        stats
      });
    }

    return columns;
  }

  private detectColumnType(values: any[]): 'numeric' | 'categorical' | 'datetime' | 'text' {
    if (values.length === 0) return 'text';

    // Verificar si es numérico
    const numericValues = values.filter(v => {
      const num = Number(v);
      return !isNaN(num) && isFinite(num);
    });

    if (numericValues.length / values.length > 0.8) {
      return 'numeric';
    }

    // Verificar si es fecha
    const dateValues = values.filter(v => {
      const date = new Date(v);
      return !isNaN(date.getTime());
    });

    if (dateValues.length / values.length > 0.8) {
      return 'datetime';
    }

    // Verificar si es categórico (pocas categorías únicas)
    const uniqueValues = new Set(values);
    if (uniqueValues.size <= Math.min(20, values.length * 0.1)) {
      return 'categorical';
    }

    return 'text';
  }

  private calculateNumericStats(values: number[]): NumericStats {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    // Detectar outliers usando IQR
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter(v => v < lowerBound || v > upperBound);

    return {
      mean: mean(values),
      median: median(values),
      std: standardDeviation(values),
      min: min(values),
      max: max(values),
      q1,
      q3,
      outliers
    };
  }

  private calculateCategoricalStats(values: any[]): CategoricalStats {
    const frequency: Record<string, number> = {};
    
    for (const value of values) {
      const key = String(value);
      frequency[key] = (frequency[key] || 0) + 1;
    }

    const topValues = Object.entries(frequency)
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / values.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const modeValue = topValues[0]?.value || '';

    return {
      mode: modeValue,
      frequency,
      topValues
    };
  }

  private async generateQualityReport(data: any[], columns: ColumnInfo[]): Promise<DataQualityReport> {
    const issues: DataQualityIssue[] = [];
    let totalScore = 100;

    // Verificar valores faltantes
    for (const column of columns) {
      const missingPercentage = (column.nullCount / data.length) * 100;
      
      if (missingPercentage > 50) {
        issues.push({
          type: 'missing_values',
          severity: 'critical',
          column: column.name,
          description: `${missingPercentage.toFixed(1)}% de valores faltantes`,
          affectedRows: column.nullCount,
          suggestion: 'Considerar eliminar columna o imputar valores'
        });
        totalScore -= 20;
      } else if (missingPercentage > 20) {
        issues.push({
          type: 'missing_values',
          severity: 'medium',
          column: column.name,
          description: `${missingPercentage.toFixed(1)}% de valores faltantes`,
          affectedRows: column.nullCount,
          suggestion: 'Imputar valores faltantes'
        });
        totalScore -= 10;
      }
    }

    // Verificar duplicados
    const uniqueRows = new Set(data.map(row => JSON.stringify(row)));
    const duplicateCount = data.length - uniqueRows.size;
    
    if (duplicateCount > 0) {
      const duplicatePercentage = (duplicateCount / data.length) * 100;
      issues.push({
        type: 'duplicates',
        severity: duplicatePercentage > 10 ? 'high' : 'medium',
        description: `${duplicateCount} filas duplicadas (${duplicatePercentage.toFixed(1)}%)`,
        affectedRows: duplicateCount,
        suggestion: 'Eliminar filas duplicadas'
      });
      totalScore -= duplicatePercentage > 10 ? 15 : 5;
    }

    // Verificar outliers en columnas numéricas
    for (const column of columns) {
      if (column.type === 'numeric' && column.stats && 'outliers' in column.stats) {
        const outlierCount = column.stats.outliers.length;
        if (outlierCount > 0) {
          const outlierPercentage = (outlierCount / data.length) * 100;
          if (outlierPercentage > 5) {
            issues.push({
              type: 'outliers',
              severity: outlierPercentage > 15 ? 'high' : 'medium',
              column: column.name,
              description: `${outlierCount} valores atípicos detectados`,
              affectedRows: outlierCount,
              suggestion: 'Revisar y posiblemente filtrar valores atípicos'
            });
            totalScore -= outlierPercentage > 15 ? 10 : 5;
          }
        }
      }
    }

    // Generar recomendaciones
    const recommendations: string[] = [];
    
    if (issues.some(i => i.type === 'missing_values')) {
      recommendations.push('Implementar estrategia de imputación de valores faltantes');
    }
    
    if (issues.some(i => i.type === 'outliers')) {
      recommendations.push('Aplicar técnicas de detección y tratamiento de outliers');
    }
    
    if (duplicateCount > 0) {
      recommendations.push('Eliminar filas duplicadas antes del análisis');
    }

    if (columns.filter(c => c.type === 'numeric').length === 0) {
      recommendations.push('Considerar convertir variables categóricas a numéricas para análisis');
    }

    const summary = this.generateQualitySummary(totalScore, issues.length, data.length, columns.length);

    return {
      overallScore: Math.max(0, totalScore),
      issues,
      recommendations,
      summary
    };
  }

  private generateQualitySummary(score: number, issueCount: number, rows: number, columns: number): string {
    let quality = 'excelente';
    if (score < 90) quality = 'buena';
    if (score < 70) quality = 'regular';
    if (score < 50) quality = 'pobre';

    return `Dataset con ${rows} filas y ${columns} columnas. Calidad ${quality} (${score.toFixed(0)}/100). ${issueCount} problemas detectados.`;
  }

  async cleanData(data: any[], columns: ColumnInfo[]): Promise<any[]> {
    console.log('🧹 Limpiando datos...');
    
    let cleanedData = [...data];

    // Eliminar filas completamente vacías
    cleanedData = cleanedData.filter(row => 
      Object.values(row).some(value => value !== null && value !== undefined && value !== '')
    );

    // Eliminar duplicados
    const seen = new Set();
    cleanedData = cleanedData.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Limpiar columnas numéricas
    for (const column of columns) {
      if (column.type === 'numeric') {
        cleanedData = this.cleanNumericColumn(cleanedData, column.name);
      }
    }

    console.log(`✅ Datos limpiados: ${data.length} → ${cleanedData.length} filas`);
    return cleanedData;
  }

  private cleanNumericColumn(data: any[], columnName: string): any[] {
    const values = data.map(row => row[columnName]).filter(v => v !== null && v !== undefined);
    const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    
    if (numericValues.length === 0) return data;

    // Calcular límites para outliers
    const sorted = [...numericValues].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Filtrar outliers extremos (opcional)
    return data.map(row => {
      const value = Number(row[columnName]);
      if (!isNaN(value) && (value < lowerBound - iqr || value > upperBound + iqr)) {
        // Marcar outliers extremos como null para revisión
        return { ...row, [`${columnName}_outlier_flag`]: true };
      }
      return row;
    });
  }

  async generateFeatures(data: any[], targetColumn?: string): Promise<{
    features: string[];
    engineeredFeatures: any[];
    featureImportance?: Record<string, number>;
  }> {
    console.log('🔧 Generando características...');

    const features = Object.keys(data[0] || {});
    const engineeredFeatures = [...data];

    // Generar características derivadas
    for (const feature of features) {
      const values = data.map(row => row[feature]);
      
      // Si es numérico, crear características derivadas
      if (this.isNumericColumn(values)) {
        const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        
        if (numericValues.length > 0) {
          const meanValue = mean(numericValues);
          const stdValue = standardDeviation(numericValues);
          
          // Crear características normalizadas
          engineeredFeatures.forEach((row, index) => {
            const value = Number(row[feature]);
            if (!isNaN(value)) {
              row[`${feature}_normalized`] = (value - meanValue) / stdValue;
              row[`${feature}_squared`] = value * value;
              row[`${feature}_log`] = value > 0 ? Math.log(value) : 0;
            }
          });
        }
      }
    }

    // Simular importancia de características si hay target
    let featureImportance: Record<string, number> | undefined;
    if (targetColumn) {
      featureImportance = {};
      const allFeatures = Object.keys(engineeredFeatures[0] || {});
      
      for (const feature of allFeatures) {
        if (feature !== targetColumn) {
          featureImportance[feature] = Math.random(); // Simulado por ahora
        }
      }
    }

    console.log(`✅ Características generadas: ${Object.keys(engineeredFeatures[0] || {}).length} features`);

    return {
      features: Object.keys(engineeredFeatures[0] || {}),
      engineeredFeatures,
      featureImportance
    };
  }

  private isNumericColumn(values: any[]): boolean {
    const numericCount = values.filter(v => {
      const num = Number(v);
      return !isNaN(num) && isFinite(num);
    }).length;
    
    return numericCount / values.length > 0.8;
  }

  async createDataSummary(data: any[], columns: ColumnInfo[]): Promise<string> {
    const numericColumns = columns.filter(c => c.type === 'numeric').length;
    const categoricalColumns = columns.filter(c => c.type === 'categorical').length;
    const textColumns = columns.filter(c => c.type === 'text').length;
    
    const totalNulls = columns.reduce((sum, col) => sum + col.nullCount, 0);
    const nullPercentage = (totalNulls / (data.length * columns.length)) * 100;

    return `
📊 **Resumen del Dataset**

**Estructura:**
- ${data.length} filas y ${columns.length} columnas
- ${numericColumns} columnas numéricas
- ${categoricalColumns} columnas categóricas  
- ${textColumns} columnas de texto

**Calidad de Datos:**
- ${nullPercentage.toFixed(1)}% de valores faltantes
- ${new Set(data.map(row => JSON.stringify(row))).size} filas únicas

**Columnas Principales:**
${columns.slice(0, 5).map(col => 
  `- **${col.name}**: ${col.type} (${col.uniqueCount} valores únicos)`
).join('\n')}

${columns.length > 5 ? `... y ${columns.length - 5} columnas más` : ''}
    `.trim();
  }
}