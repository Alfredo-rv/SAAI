/**
 * Gestor de Despliegue Empresarial SAAI
 * Sistema de despliegue automatizado con validación y rollback
 */

import { CognitiveFabric, EventType } from '../core/CognitiveFabric';
import { LoggingAuditor, LogLevel } from '../infrastructure/LoggingAuditor';
import { ConfigManager } from '../infrastructure/ConfigManager';

export interface DeploymentPlan {
  id: string;
  name: string;
  version: string;
  description: string;
  environment: DeploymentEnvironment;
  components: DeploymentComponent[];
  strategy: DeploymentStrategy;
  validations: ValidationStep[];
  rollbackPlan: RollbackPlan;
  createdAt: Date;
  createdBy: string;
}

export enum DeploymentEnvironment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Testing = 'testing'
}

export interface DeploymentComponent {
  id: string;
  name: string;
  type: ComponentType;
  version: string;
  dependencies: string[];
  configuration: any;
  healthChecks: HealthCheck[];
}

export enum ComponentType {
  NanoCore = 'nano_core',
  Agent = 'agent',
  MECAEngine = 'meca_engine',
  CognitiveFabric = 'cognitive_fabric',
  Infrastructure = 'infrastructure',
  UI = 'ui'
}

export interface DeploymentStrategy {
  type: StrategyType;
  parameters: StrategyParameters;
}

export enum StrategyType {
  BlueGreen = 'blue_green',
  Canary = 'canary',
  Rolling = 'rolling',
  Recreate = 'recreate'
}

export interface StrategyParameters {
  batchSize?: number;
  maxUnavailable?: number;
  canaryPercentage?: number;
  validationTimeout?: number;
  autoRollback?: boolean;
}

export interface ValidationStep {
  id: string;
  name: string;
  type: ValidationType;
  timeout: number;
  retries: number;
  validator: () => Promise<ValidationResult>;
}

export enum ValidationType {
  HealthCheck = 'health_check',
  PerformanceTest = 'performance_test',
  SecurityScan = 'security_scan',
  IntegrationTest = 'integration_test',
  UserAcceptance = 'user_acceptance'
}

export interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
  metrics?: any;
}

export interface HealthCheck {
  endpoint: string;
  method: string;
  expectedStatus: number;
  timeout: number;
  interval: number;
}

export interface RollbackPlan {
  strategy: RollbackStrategy;
  triggers: RollbackTrigger[];
  steps: RollbackStep[];
  dataBackup: boolean;
  configBackup: boolean;
}

export enum RollbackStrategy {
  Automatic = 'automatic',
  Manual = 'manual',
  Conditional = 'conditional'
}

export enum RollbackTrigger {
  HealthCheckFailure = 'health_check_failure',
  PerformanceDegradation = 'performance_degradation',
  ErrorRateThreshold = 'error_rate_threshold',
  UserRequest = 'user_request',
  SecurityAlert = 'security_alert'
}

export interface RollbackStep {
  id: string;
  name: string;
  action: () => Promise<void>;
  timeout: number;
}

export interface DeploymentExecution {
  id: string;
  planId: string;
  status: DeploymentStatus;
  startTime: Date;
  endTime?: Date;
  currentStep: string;
  progress: number;
  logs: DeploymentLog[];
  validationResults: ValidationResult[];
  rollbackExecuted: boolean;
}

export enum DeploymentStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Validating = 'validating',
  Completed = 'completed',
  Failed = 'failed',
  RolledBack = 'rolled_back',
  Cancelled = 'cancelled'
}

export interface DeploymentLog {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  details?: any;
}

/**
 * Gestor de Despliegue con capacidades empresariales
 */
export class DeploymentManager {
  private fabric: CognitiveFabric;
  private auditor: LoggingAuditor;
  private configManager: ConfigManager;
  private deploymentPlans: Map<string, DeploymentPlan> = new Map();
  private activeDeployments: Map<string, DeploymentExecution> = new Map();
  private deploymentHistory: DeploymentExecution[] = [];

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
    console.log('🚀 Inicializando Gestor de Despliegue');
    
    // Crear planes de despliegue predefinidos
    await this.createDefaultDeploymentPlans();
    
    // Suscribirse a eventos del sistema
    await this.fabric.subscribe('saai.deployment.events', (event) => {
      this.handleDeploymentEvent(event.payload);
    });
    
    this.auditor.info('deployment-manager', 'Gestor de despliegue inicializado', {
      plans: this.deploymentPlans.size
    }, ['deployment', 'initialization']);
    
    console.log('✅ Gestor de Despliegue inicializado');
  }

  private async createDefaultDeploymentPlans(): Promise<void> {
    // Plan de despliegue para desarrollo
    await this.createDeploymentPlan({
      name: 'SAAI Development Deployment',
      version: '1.0.0',
      description: 'Despliegue completo para entorno de desarrollo',
      environment: DeploymentEnvironment.Development,
      components: [
        {
          id: 'nano-cores',
          name: 'Nano-Núcleos Cuánticos',
          type: ComponentType.NanoCore,
          version: '1.0.0',
          dependencies: [],
          configuration: { replicationFactor: 3 },
          healthChecks: [
            {
              endpoint: '/health',
              method: 'GET',
              expectedStatus: 200,
              timeout: 5000,
              interval: 30000
            }
          ]
        },
        {
          id: 'cognitive-fabric',
          name: 'Cognitive Fabric',
          type: ComponentType.CognitiveFabric,
          version: '1.0.0',
          dependencies: ['nano-cores'],
          configuration: { maxConnections: 1000 },
          healthChecks: [
            {
              endpoint: '/fabric/status',
              method: 'GET',
              expectedStatus: 200,
              timeout: 3000,
              interval: 15000
            }
          ]
        },
        {
          id: 'agents',
          name: 'Agentes de Alto Nivel',
          type: ComponentType.Agent,
          version: '1.0.0',
          dependencies: ['cognitive-fabric'],
          configuration: { agentCount: 4 },
          healthChecks: [
            {
              endpoint: '/agents/health',
              method: 'GET',
              expectedStatus: 200,
              timeout: 5000,
              interval: 30000
            }
          ]
        }
      ],
      strategy: {
        type: StrategyType.Rolling,
        parameters: {
          batchSize: 1,
          maxUnavailable: 1,
          validationTimeout: 300000,
          autoRollback: true
        }
      },
      validations: [
        {
          id: 'health-validation',
          name: 'Validación de Salud',
          type: ValidationType.HealthCheck,
          timeout: 60000,
          retries: 3,
          validator: this.validateSystemHealth.bind(this)
        },
        {
          id: 'performance-validation',
          name: 'Validación de Rendimiento',
          type: ValidationType.PerformanceTest,
          timeout: 120000,
          retries: 2,
          validator: this.validatePerformance.bind(this)
        }
      ],
      rollbackPlan: {
        strategy: RollbackStrategy.Automatic,
        triggers: [
          RollbackTrigger.HealthCheckFailure,
          RollbackTrigger.PerformanceDegradation
        ],
        steps: [
          {
            id: 'stop-new-components',
            name: 'Detener componentes nuevos',
            action: this.stopNewComponents.bind(this),
            timeout: 30000
          },
          {
            id: 'restore-previous-version',
            name: 'Restaurar versión anterior',
            action: this.restorePreviousVersion.bind(this),
            timeout: 60000
          }
        ],
        dataBackup: true,
        configBackup: true
      },
      createdBy: 'system'
    });

    // Plan de despliegue para producción
    await this.createDeploymentPlan({
      name: 'SAAI Production Deployment',
      version: '1.0.0',
      description: 'Despliegue seguro para entorno de producción',
      environment: DeploymentEnvironment.Production,
      components: [
        {
          id: 'nano-cores',
          name: 'Nano-Núcleos Cuánticos',
          type: ComponentType.NanoCore,
          version: '1.0.0',
          dependencies: [],
          configuration: { replicationFactor: 5 },
          healthChecks: [
            {
              endpoint: '/health',
              method: 'GET',
              expectedStatus: 200,
              timeout: 5000,
              interval: 15000
            }
          ]
        }
      ],
      strategy: {
        type: StrategyType.BlueGreen,
        parameters: {
          validationTimeout: 600000,
          autoRollback: true
        }
      },
      validations: [
        {
          id: 'comprehensive-health',
          name: 'Validación Integral de Salud',
          type: ValidationType.HealthCheck,
          timeout: 300000,
          retries: 5,
          validator: this.validateSystemHealth.bind(this)
        },
        {
          id: 'security-scan',
          name: 'Escaneo de Seguridad',
          type: ValidationType.SecurityScan,
          timeout: 600000,
          retries: 2,
          validator: this.validateSecurity.bind(this)
        },
        {
          id: 'performance-benchmark',
          name: 'Benchmark de Rendimiento',
          type: ValidationType.PerformanceTest,
          timeout: 900000,
          retries: 3,
          validator: this.validatePerformance.bind(this)
        }
      ],
      rollbackPlan: {
        strategy: RollbackStrategy.Automatic,
        triggers: [
          RollbackTrigger.HealthCheckFailure,
          RollbackTrigger.PerformanceDegradation,
          RollbackTrigger.SecurityAlert,
          RollbackTrigger.ErrorRateThreshold
        ],
        steps: [
          {
            id: 'immediate-traffic-switch',
            name: 'Cambio inmediato de tráfico',
            action: this.switchTrafficBack.bind(this),
            timeout: 10000
          },
          {
            id: 'cleanup-new-deployment',
            name: 'Limpiar nuevo despliegue',
            action: this.cleanupNewDeployment.bind(this),
            timeout: 120000
          }
        ],
        dataBackup: true,
        configBackup: true
      },
      createdBy: 'system'
    });
  }

  async createDeploymentPlan(plan: Omit<DeploymentPlan, 'id' | 'createdAt'>): Promise<string> {
    const id = `deploy-plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullPlan: DeploymentPlan = {
      ...plan,
      id,
      createdAt: new Date()
    };

    this.deploymentPlans.set(id, fullPlan);
    
    this.auditor.info('deployment-manager', `Plan de despliegue creado: ${plan.name}`, {
      planId: id,
      environment: plan.environment,
      components: plan.components.length
    }, ['deployment', 'plan-creation']);

    return id;
  }

  async executeDeployment(planId: string): Promise<string> {
    const plan = this.deploymentPlans.get(planId);
    if (!plan) {
      throw new Error(`Plan de despliegue no encontrado: ${planId}`);
    }

    const executionId = `deploy-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: DeploymentExecution = {
      id: executionId,
      planId,
      status: DeploymentStatus.Pending,
      startTime: new Date(),
      currentStep: 'initialization',
      progress: 0,
      logs: [],
      validationResults: [],
      rollbackExecuted: false
    };

    this.activeDeployments.set(executionId, execution);
    
    this.auditor.info('deployment-manager', `Iniciando despliegue: ${plan.name}`, {
      executionId,
      planId,
      environment: plan.environment
    }, ['deployment', 'execution-start']);

    // Ejecutar despliegue en background
    this.performDeployment(execution, plan).catch(error => {
      this.auditor.error('deployment-manager', `Error en despliegue ${executionId}`, {
        error: error instanceof Error ? error.message : 'Error desconocido'
      }, ['deployment', 'execution-error']);
    });

    return executionId;
  }

  private async performDeployment(execution: DeploymentExecution, plan: DeploymentPlan): Promise<void> {
    try {
      execution.status = DeploymentStatus.InProgress;
      this.logDeployment(execution, LogLevel.INFO, 'deployment', 'Iniciando despliegue');

      // Fase 1: Preparación
      execution.currentStep = 'preparation';
      execution.progress = 10;
      await this.prepareDeployment(execution, plan);

      // Fase 2: Despliegue de componentes
      execution.currentStep = 'component-deployment';
      execution.progress = 30;
      await this.deployComponents(execution, plan);

      // Fase 3: Validación
      execution.status = DeploymentStatus.Validating;
      execution.currentStep = 'validation';
      execution.progress = 70;
      const validationPassed = await this.runValidations(execution, plan);

      if (!validationPassed) {
        throw new Error('Validaciones fallaron');
      }

      // Fase 4: Finalización
      execution.currentStep = 'finalization';
      execution.progress = 90;
      await this.finalizeDeployment(execution, plan);

      // Completado
      execution.status = DeploymentStatus.Completed;
      execution.progress = 100;
      execution.endTime = new Date();
      execution.currentStep = 'completed';

      this.logDeployment(execution, LogLevel.INFO, 'deployment', 'Despliegue completado exitosamente');
      
      // Mover a historial
      this.deploymentHistory.push(execution);
      this.activeDeployments.delete(execution.id);

    } catch (error) {
      execution.status = DeploymentStatus.Failed;
      execution.endTime = new Date();
      
      this.logDeployment(execution, LogLevel.ERROR, 'deployment', 
        `Despliegue falló: ${error instanceof Error ? error.message : 'Error desconocido'}`);

      // Ejecutar rollback si está configurado
      if (plan.rollbackPlan.strategy === RollbackStrategy.Automatic) {
        await this.executeRollback(execution, plan);
      }

      this.deploymentHistory.push(execution);
      this.activeDeployments.delete(execution.id);
    }
  }

  private async prepareDeployment(execution: DeploymentExecution, plan: DeploymentPlan): Promise<void> {
    this.logDeployment(execution, LogLevel.INFO, 'preparation', 'Preparando entorno de despliegue');
    
    // Simular preparación
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Backup de configuración si es necesario
    if (plan.rollbackPlan.configBackup) {
      this.logDeployment(execution, LogLevel.INFO, 'preparation', 'Creando backup de configuración');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Backup de datos si es necesario
    if (plan.rollbackPlan.dataBackup) {
      this.logDeployment(execution, LogLevel.INFO, 'preparation', 'Creando backup de datos');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async deployComponents(execution: DeploymentExecution, plan: DeploymentPlan): Promise<void> {
    this.logDeployment(execution, LogLevel.INFO, 'deployment', 'Desplegando componentes');
    
    // Ordenar componentes por dependencias
    const orderedComponents = this.orderComponentsByDependencies(plan.components);
    
    for (let i = 0; i < orderedComponents.length; i++) {
      const component = orderedComponents[i];
      const progress = 30 + (i / orderedComponents.length) * 40;
      execution.progress = progress;
      
      this.logDeployment(execution, LogLevel.INFO, 'deployment', 
        `Desplegando componente: ${component.name}`);
      
      await this.deployComponent(component, plan.strategy);
      
      // Verificar health checks
      await this.waitForComponentHealth(component);
    }
  }

  private async deployComponent(component: DeploymentComponent, strategy: DeploymentStrategy): Promise<void> {
    // Simular despliegue basado en estrategia
    switch (strategy.type) {
      case StrategyType.Rolling:
        await this.rollingDeployment(component, strategy.parameters);
        break;
      case StrategyType.BlueGreen:
        await this.blueGreenDeployment(component, strategy.parameters);
        break;
      case StrategyType.Canary:
        await this.canaryDeployment(component, strategy.parameters);
        break;
      default:
        await this.recreateDeployment(component);
    }
  }

  private async rollingDeployment(component: DeploymentComponent, params: StrategyParameters): Promise<void> {
    const batchSize = params.batchSize || 1;
    const batches = Math.ceil(3 / batchSize); // Asumiendo 3 instancias
    
    for (let i = 0; i < batches; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async blueGreenDeployment(component: DeploymentComponent, params: StrategyParameters): Promise<void> {
    // Desplegar en entorno "green"
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cambiar tráfico
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async canaryDeployment(component: DeploymentComponent, params: StrategyParameters): Promise<void> {
    const percentage = params.canaryPercentage || 10;
    
    // Desplegar canary
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Gradualmente aumentar tráfico
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async recreateDeployment(component: DeploymentComponent): Promise<void> {
    // Detener instancias existentes
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Crear nuevas instancias
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  private async waitForComponentHealth(component: DeploymentComponent): Promise<void> {
    for (const healthCheck of component.healthChecks) {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        // Simular health check
        const healthy = Math.random() > 0.1; // 90% de éxito
        
        if (healthy) {
          break;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, healthCheck.interval));
      }
      
      if (attempts >= maxAttempts) {
        throw new Error(`Health check falló para componente: ${component.name}`);
      }
    }
  }

  private async runValidations(execution: DeploymentExecution, plan: DeploymentPlan): Promise<boolean> {
    this.logDeployment(execution, LogLevel.INFO, 'validation', 'Ejecutando validaciones');
    
    for (const validation of plan.validations) {
      this.logDeployment(execution, LogLevel.INFO, 'validation', 
        `Ejecutando validación: ${validation.name}`);
      
      let attempts = 0;
      let result: ValidationResult | null = null;
      
      while (attempts <= validation.retries) {
        try {
          result = await Promise.race([
            validation.validator(),
            new Promise<ValidationResult>((_, reject) => 
              setTimeout(() => reject(new Error('Validation timeout')), validation.timeout)
            )
          ]);
          
          if (result.passed) {
            break;
          }
        } catch (error) {
          result = {
            passed: false,
            message: error instanceof Error ? error.message : 'Error de validación'
          };
        }
        
        attempts++;
        if (attempts <= validation.retries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      if (result) {
        execution.validationResults.push(result);
        
        if (!result.passed) {
          this.logDeployment(execution, LogLevel.ERROR, 'validation', 
            `Validación falló: ${validation.name} - ${result.message}`);
          return false;
        }
      }
    }
    
    return true;
  }

  private async finalizeDeployment(execution: DeploymentExecution, plan: DeploymentPlan): Promise<void> {
    this.logDeployment(execution, LogLevel.INFO, 'finalization', 'Finalizando despliegue');
    
    // Limpiar recursos temporales
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Actualizar configuración si es necesario
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Notificar completación
    await this.fabric.publishEvent({
      eventType: EventType.SystemMetrics,
      source: 'deployment-manager',
      payload: {
        type: 'deployment_completed',
        executionId: execution.id,
        planId: execution.planId,
        timestamp: new Date()
      }
    });
  }

  private async executeRollback(execution: DeploymentExecution, plan: DeploymentPlan): Promise<void> {
    this.logDeployment(execution, LogLevel.WARN, 'rollback', 'Iniciando rollback automático');
    
    execution.rollbackExecuted = true;
    
    for (const step of plan.rollbackPlan.steps) {
      try {
        this.logDeployment(execution, LogLevel.INFO, 'rollback', 
          `Ejecutando paso de rollback: ${step.name}`);
        
        await Promise.race([
          step.action(),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Rollback step timeout')), step.timeout)
          )
        ]);
        
      } catch (error) {
        this.logDeployment(execution, LogLevel.ERROR, 'rollback', 
          `Error en paso de rollback: ${step.name} - ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
    
    execution.status = DeploymentStatus.RolledBack;
    this.logDeployment(execution, LogLevel.INFO, 'rollback', 'Rollback completado');
  }

  // Implementaciones de validadores
  private async validateSystemHealth(): Promise<ValidationResult> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const healthy = Math.random() > 0.1; // 90% de éxito
    
    return {
      passed: healthy,
      message: healthy ? 'Sistema saludable' : 'Problemas de salud detectados',
      metrics: {
        overallHealth: healthy ? 95 + Math.random() * 5 : 60 + Math.random() * 20,
        componentHealth: {
          nanoCores: healthy ? 98 : 70,
          agents: healthy ? 96 : 65,
          fabric: healthy ? 99 : 75
        }
      }
    };
  }

  private async validatePerformance(): Promise<ValidationResult> {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const performanceGood = Math.random() > 0.15; // 85% de éxito
    
    return {
      passed: performanceGood,
      message: performanceGood ? 'Rendimiento dentro de parámetros' : 'Degradación de rendimiento detectada',
      metrics: {
        latency: performanceGood ? 1 + Math.random() * 2 : 5 + Math.random() * 10,
        throughput: performanceGood ? 1000 + Math.random() * 500 : 300 + Math.random() * 200,
        errorRate: performanceGood ? Math.random() * 0.01 : 0.05 + Math.random() * 0.1
      }
    };
  }

  private async validateSecurity(): Promise<ValidationResult> {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const secure = Math.random() > 0.05; // 95% de éxito
    
    return {
      passed: secure,
      message: secure ? 'Escaneo de seguridad exitoso' : 'Vulnerabilidades detectadas',
      details: {
        vulnerabilities: secure ? 0 : Math.floor(Math.random() * 3) + 1,
        encryptionStatus: 'active',
        accessControlStatus: secure ? 'secure' : 'compromised'
      }
    };
  }

  // Implementaciones de acciones de rollback
  private async stopNewComponents(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async restorePreviousVersion(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async switchTrafficBack(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async cleanupNewDeployment(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  private orderComponentsByDependencies(components: DeploymentComponent[]): DeploymentComponent[] {
    const ordered: DeploymentComponent[] = [];
    const remaining = [...components];
    
    while (remaining.length > 0) {
      const canDeploy = remaining.filter(component => 
        component.dependencies.every(dep => 
          ordered.some(deployed => deployed.id === dep)
        )
      );
      
      if (canDeploy.length === 0) {
        ordered.push(...remaining);
        break;
      }
      
      ordered.push(...canDeploy);
      canDeploy.forEach(component => {
        const index = remaining.indexOf(component);
        remaining.splice(index, 1);
      });
    }
    
    return ordered;
  }

  private logDeployment(execution: DeploymentExecution, level: LogLevel, component: string, message: string, details?: any): void {
    const log: DeploymentLog = {
      timestamp: new Date(),
      level,
      component,
      message,
      details
    };
    
    execution.logs.push(log);
    
    // También log en el auditor general
    this.auditor.log(level, `deployment-${execution.id}`, message, {
      executionId: execution.id,
      component,
      ...details
    }, ['deployment']);
  }

  private async handleDeploymentEvent(payload: any): Promise<void> {
    // Manejar eventos relacionados con despliegue
    switch (payload.type) {
      case 'deployment_request':
        await this.executeDeployment(payload.planId);
        break;
      case 'rollback_request':
        // Implementar rollback manual
        break;
    }
  }

  getDeploymentPlans(): DeploymentPlan[] {
    return Array.from(this.deploymentPlans.values());
  }

  getActiveDeployments(): DeploymentExecution[] {
    return Array.from(this.activeDeployments.values());
  }

  getDeploymentHistory(): DeploymentExecution[] {
    return [...this.deploymentHistory];
  }

  getDeploymentStatus(executionId: string): DeploymentExecution | undefined {
    return this.activeDeployments.get(executionId) || 
           this.deploymentHistory.find(d => d.id === executionId);
  }

  async shutdown(): Promise<void> {
    // Esperar a que terminen los despliegues activos
    await Promise.all(Array.from(this.activeDeployments.keys()).map(async (id) => {
      const execution = this.activeDeployments.get(id);
      if (execution && execution.status === DeploymentStatus.InProgress) {
        execution.status = DeploymentStatus.Cancelled;
        execution.endTime = new Date();
        this.deploymentHistory.push(execution);
      }
    }));
    
    this.activeDeployments.clear();
    
    this.auditor.info('deployment-manager', 'Gestor de despliegue cerrado', {}, ['deployment', 'shutdown']);
    console.log('✅ Gestor de Despliegue cerrado');
  }
}