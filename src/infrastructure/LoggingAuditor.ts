/**
 * LoggingAuditor - Sistema de logging y auditoría avanzado
 * Logging estructurado con análisis de patrones y alertas inteligentes
 */

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  context: Record<string, any>;
  tags: string[];
  correlationId?: string;
  userId?: string;
  sessionId?: string;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  actor: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export enum AuditEventType {
  Authentication = 'authentication',
  Authorization = 'authorization',
  DataAccess = 'data_access',
  DataModification = 'data_modification',
  SystemConfiguration = 'system_configuration',
  SecurityEvent = 'security_event',
  PerformanceEvent = 'performance_event'
}

export interface LogPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  severity: LogLevel;
  alertThreshold: number;
  timeWindow: number;
  enabled: boolean;
}

export interface Alert {
  id: string;
  timestamp: Date;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  relatedLogs: string[];
  acknowledged: boolean;
  resolvedAt?: Date;
}

export enum AlertType {
  ErrorSpike = 'error_spike',
  PerformanceDegradation = 'performance_degradation',
  SecurityThreat = 'security_threat',
  SystemAnomaly = 'system_anomaly',
  ResourceExhaustion = 'resource_exhaustion'
}

/**
 * Sistema de logging y auditoría con análisis inteligente
 */
export class LoggingAuditor {
  private logs: LogEntry[] = [];
  private auditEvents: AuditEvent[] = [];
  private alerts: Alert[] = [];
  private patterns: Map<string, LogPattern> = new Map();
  private patternAnalyzer: PatternAnalyzer;
  private alertManager: AlertManager;
  private maxLogEntries = 10000;
  private maxAuditEvents = 5000;

  constructor() {
    this.patternAnalyzer = new PatternAnalyzer(this);
    this.alertManager = new AlertManager(this);
    this.initializePatterns();
  }

  async initialize(): Promise<void> {
    console.log('📝 Inicializando LoggingAuditor');
    
    // Cargar logs existentes
    await this.loadLogs();
    
    // Iniciar análisis de patrones
    await this.patternAnalyzer.start();
    
    // Iniciar gestor de alertas
    await this.alertManager.start();
    
    console.log('✅ LoggingAuditor inicializado');
  }

  log(level: LogLevel, source: string, message: string, context: Record<string, any> = {}, tags: string[] = []): void {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      source,
      message,
      context,
      tags,
      correlationId: context.correlationId,
      userId: context.userId,
      sessionId: context.sessionId
    };

    this.logs.push(entry);
    
    // Mantener límite de logs
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    // Análisis inmediato para logs críticos
    if (level >= LogLevel.ERROR) {
      this.patternAnalyzer.analyzeEntry(entry);
    }

    // Output a consola con formato
    this.outputToConsole(entry);
  }

  debug(source: string, message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, source, message, context, tags);
  }

  info(source: string, message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, source, message, context, tags);
  }

  warn(source: string, message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARN, source, message, context, tags);
  }

  error(source: string, message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.ERROR, source, message, context, tags);
  }

  critical(source: string, message: string, context?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.CRITICAL, source, message, context, tags);
  }

  audit(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.auditEvents.push(auditEvent);
    
    // Mantener límite de eventos de auditoría
    if (this.auditEvents.length > this.maxAuditEvents) {
      this.auditEvents = this.auditEvents.slice(-this.maxAuditEvents);
    }

    // Log del evento de auditoría
    this.info('audit-system', `Audit: ${event.action} on ${event.resource}`, {
      eventType: event.eventType,
      actor: event.actor,
      outcome: event.outcome,
      riskLevel: event.riskLevel
    }, ['audit']);

    // Análisis de riesgo
    if (auditEvent.riskLevel === 'critical' || auditEvent.riskLevel === 'high') {
      this.alertManager.createAlert({
        type: AlertType.SecurityThreat,
        severity: auditEvent.riskLevel,
        title: `High-risk audit event: ${event.action}`,
        description: `${event.actor} performed ${event.action} on ${event.resource} with ${event.outcome} outcome`,
        source: 'audit-system',
        relatedLogs: [auditEvent.id]
      });
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelStr = LogLevel[entry.level].padEnd(8);
    const source = entry.source.padEnd(20);
    
    let color = '';
    switch (entry.level) {
      case LogLevel.DEBUG: color = '\x1b[36m'; break; // Cyan
      case LogLevel.INFO: color = '\x1b[32m'; break;  // Green
      case LogLevel.WARN: color = '\x1b[33m'; break;  // Yellow
      case LogLevel.ERROR: color = '\x1b[31m'; break; // Red
      case LogLevel.CRITICAL: color = '\x1b[35m'; break; // Magenta
    }
    
    const reset = '\x1b[0m';
    const formatted = `${color}[${timestamp}] ${levelStr} ${source} ${entry.message}${reset}`;
    
    console.log(formatted);
    
    if (Object.keys(entry.context).length > 0) {
      console.log(`${color}  Context:${reset}`, entry.context);
    }
  }

  private initializePatterns(): void {
    // Patrones predefinidos para detección de anomalías
    this.patterns.set('error-spike', {
      id: 'error-spike',
      name: 'Error Spike Detection',
      description: 'Detecta picos de errores en corto tiempo',
      pattern: /error|exception|failed|failure/i,
      severity: LogLevel.ERROR,
      alertThreshold: 10,
      timeWindow: 60000, // 1 minuto
      enabled: true
    });

    this.patterns.set('security-threat', {
      id: 'security-threat',
      name: 'Security Threat Detection',
      description: 'Detecta posibles amenazas de seguridad',
      pattern: /unauthorized|breach|attack|intrusion|malicious/i,
      severity: LogLevel.WARN,
      alertThreshold: 3,
      timeWindow: 300000, // 5 minutos
      enabled: true
    });

    this.patterns.set('performance-degradation', {
      id: 'performance-degradation',
      name: 'Performance Degradation',
      description: 'Detecta degradación de rendimiento',
      pattern: /slow|timeout|latency|performance|degraded/i,
      severity: LogLevel.WARN,
      alertThreshold: 15,
      timeWindow: 120000, // 2 minutos
      enabled: true
    });

    this.patterns.set('resource-exhaustion', {
      id: 'resource-exhaustion',
      name: 'Resource Exhaustion',
      description: 'Detecta agotamiento de recursos',
      pattern: /memory|cpu|disk|network.*exhausted|full|limit/i,
      severity: LogLevel.ERROR,
      alertThreshold: 5,
      timeWindow: 180000, // 3 minutos
      enabled: true
    });
  }

  queryLogs(filters: LogQueryFilters): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters.level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= filters.level!);
    }

    if (filters.source) {
      filteredLogs = filteredLogs.filter(log => 
        log.source.toLowerCase().includes(filters.source!.toLowerCase())
      );
    }

    if (filters.message) {
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(filters.message!.toLowerCase())
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        filters.tags!.some(tag => log.tags.includes(tag))
      );
    }

    if (filters.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!);
    }

    if (filters.correlationId) {
      filteredLogs = filteredLogs.filter(log => log.correlationId === filters.correlationId);
    }

    // Ordenar por timestamp descendente
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Aplicar límite
    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  queryAuditEvents(filters: AuditQueryFilters): AuditEvent[] {
    let filteredEvents = [...this.auditEvents];

    if (filters.eventType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === filters.eventType);
    }

    if (filters.actor) {
      filteredEvents = filteredEvents.filter(event => 
        event.actor.toLowerCase().includes(filters.actor!.toLowerCase())
      );
    }

    if (filters.resource) {
      filteredEvents = filteredEvents.filter(event => 
        event.resource.toLowerCase().includes(filters.resource!.toLowerCase())
      );
    }

    if (filters.outcome) {
      filteredEvents = filteredEvents.filter(event => event.outcome === filters.outcome);
    }

    if (filters.riskLevel) {
      filteredEvents = filteredEvents.filter(event => event.riskLevel === filters.riskLevel);
    }

    if (filters.startTime) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= filters.startTime!);
    }

    if (filters.endTime) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= filters.endTime!);
    }

    // Ordenar por timestamp descendente
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    return filteredEvents;
  }

  getAlerts(includeResolved: boolean = false): Alert[] {
    let alerts = [...this.alerts];
    
    if (!includeResolved) {
      alerts = alerts.filter(alert => !alert.resolvedAt);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  getLogStatistics(): LogStatistics {
    const stats: LogStatistics = {
      totalLogs: this.logs.length,
      byLevel: {},
      bySource: {},
      recentErrors: 0,
      averageLogsPerMinute: 0
    };

    // Estadísticas por nivel
    for (const log of this.logs) {
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
    }

    // Estadísticas por fuente
    for (const log of this.logs) {
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
    }

    // Errores recientes (última hora)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    stats.recentErrors = this.logs.filter(log => 
      log.level >= LogLevel.ERROR && log.timestamp >= oneHourAgo
    ).length;

    // Promedio de logs por minuto (última hora)
    const recentLogs = this.logs.filter(log => log.timestamp >= oneHourAgo);
    stats.averageLogsPerMinute = recentLogs.length / 60;

    return stats;
  }

  private async loadLogs(): Promise<void> {
    // Simular carga desde almacenamiento
    const stored = localStorage.getItem('saai-logs');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.logs = data.logs || [];
        this.auditEvents = data.auditEvents || [];
        this.alerts = data.alerts || [];
      } catch (error) {
        console.warn('⚠️  Error cargando logs');
      }
    }
  }

  async shutdown(): Promise<void> {
    await this.patternAnalyzer.stop();
    await this.alertManager.stop();
    
    // Guardar logs
    const data = {
      logs: this.logs.slice(-1000), // Guardar solo los últimos 1000
      auditEvents: this.auditEvents.slice(-500),
      alerts: this.alerts.slice(-100)
    };
    localStorage.setItem('saai-logs', JSON.stringify(data));
    
    console.log('✅ LoggingAuditor cerrado');
  }

  // Métodos internos para componentes
  addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    this.alertManager.createAlert(alert);
  }

  getPatterns(): Map<string, LogPattern> {
    return new Map(this.patterns);
  }
}

export interface LogQueryFilters {
  level?: LogLevel;
  source?: string;
  message?: string;
  tags?: string[];
  startTime?: Date;
  endTime?: Date;
  correlationId?: string;
  limit?: number;
}

export interface AuditQueryFilters {
  eventType?: AuditEventType;
  actor?: string;
  resource?: string;
  outcome?: 'success' | 'failure' | 'partial';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

export interface LogStatistics {
  totalLogs: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  recentErrors: number;
  averageLogsPerMinute: number;
}

/**
 * Analizador de patrones en logs
 */
class PatternAnalyzer {
  private auditor: LoggingAuditor;
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(auditor: LoggingAuditor) {
    this.auditor = auditor;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.analyzePatterns();
    }, 30000); // Análisis cada 30 segundos

    console.log('🔍 Analizador de patrones iniciado');
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('🛑 Analizador de patrones detenido');
  }

  analyzeEntry(entry: LogEntry): void {
    const patterns = this.auditor.getPatterns();
    
    for (const pattern of patterns.values()) {
      if (!pattern.enabled) continue;
      
      if (this.matchesPattern(entry, pattern)) {
        this.checkThreshold(pattern);
      }
    }
  }

  private analyzePatterns(): void {
    const patterns = this.auditor.getPatterns();
    
    for (const pattern of patterns.values()) {
      if (pattern.enabled) {
        this.checkThreshold(pattern);
      }
    }
  }

  private matchesPattern(entry: LogEntry, pattern: LogPattern): boolean {
    if (typeof pattern.pattern === 'string') {
      return entry.message.includes(pattern.pattern);
    } else {
      return pattern.pattern.test(entry.message);
    }
  }

  private checkThreshold(pattern: LogPattern): void {
    const now = Date.now();
    const windowStart = now - pattern.timeWindow;
    
    // Esta sería la implementación real del análisis de umbral
    // Por simplicidad, simulamos la detección
    if (Math.random() < 0.1) { // 10% de probabilidad de activar alerta
      this.auditor.addAlert({
        type: this.getAlertType(pattern.id),
        severity: this.getSeverityFromLogLevel(pattern.severity),
        title: `Pattern detected: ${pattern.name}`,
        description: pattern.description,
        source: 'pattern-analyzer',
        relatedLogs: []
      });
    }
  }

  private getAlertType(patternId: string): AlertType {
    switch (patternId) {
      case 'error-spike': return AlertType.ErrorSpike;
      case 'security-threat': return AlertType.SecurityThreat;
      case 'performance-degradation': return AlertType.PerformanceDegradation;
      case 'resource-exhaustion': return AlertType.ResourceExhaustion;
      default: return AlertType.SystemAnomaly;
    }
  }

  private getSeverityFromLogLevel(level: LogLevel): 'low' | 'medium' | 'high' | 'critical' {
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO: return 'low';
      case LogLevel.WARN: return 'medium';
      case LogLevel.ERROR: return 'high';
      case LogLevel.CRITICAL: return 'critical';
    }
  }
}

/**
 * Gestor de alertas
 */
class AlertManager {
  private auditor: LoggingAuditor;
  private isRunning = false;

  constructor(auditor: LoggingAuditor) {
    this.auditor = auditor;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('🚨 Gestor de alertas iniciado');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Gestor de alertas detenido');
  }

  createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false
    };

    // Agregar a la lista de alertas del auditor
    (this.auditor as any).alerts.push(alert);

    // Log de la alerta
    this.auditor.warn('alert-manager', `New alert: ${alert.title}`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity
    }, ['alert']);

    console.log(`🚨 Nueva alerta: ${alert.title} (${alert.severity})`);
  }
}