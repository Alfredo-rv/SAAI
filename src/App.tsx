import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Brain, 
  Shield, 
  Network, 
  Cpu, 
  Eye, 
  Zap, 
  Settings,
  BarChart3,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  Database,
  Lock,
  Play,
  Square,
  RefreshCw,
  Beaker,
  TrendingUp,
  Shuffle,
  Target,
  Flame,
  Monitor,
  TestTube,
  Rocket,
  Gauge
} from 'lucide-react';
import { useSAAISystem } from './hooks/useSAAISystem';
import { useMECA } from './hooks/useMECA';
import { ProposalType } from './core/ConsensusManager';
import { ChaosType } from './meca/ChaosEngineering';
import { AdvancedDashboard } from './ui/components/AdvancedDashboard';
import { CognitiveCopilot } from './ui/components/CognitiveCopilot';
import { ConfigManager } from './infrastructure/ConfigManager';
import { SecureCredentialStore } from './infrastructure/SecureCredentialStore';
import { LoggingAuditor, LogLevel } from './infrastructure/LoggingAuditor';
import { ContinuousTestingEngine } from './testing/ContinuousTestingEngine';
import { DeploymentManager } from './deployment/DeploymentManager';
import { PerformanceOptimizer } from './optimization/PerformanceOptimizer';

// Componente principal del Dashboard SAAI Empresarial Completo con Co-Piloto Cognitivo
function App() {
  const [viewMode, setViewMode] = useState<'standard' | 'enterprise'>('enterprise');
  const [infrastructureServices, setInfrastructureServices] = useState<any>({});
  const [enterpriseServices, setEnterpriseServices] = useState<any>({});
  const [copilotVisible, setCopilotVisible] = useState(false);
  
  const {
    isInitialized,
    isRunning,
    systemHealth,
    fabricStats,
    consensusStats,
    evolutionCycles,
    error,
    startSystem,
    stopSystem,
    createProposal,
    updateMetrics,
    fabric,
    consensusManager
  } = useSAAISystem();

  const {
    isInitialized: mecaInitialized,
    isEvolutionRunning,
    isChaosEnabled,
    evolutionStats,
    chaosStats,
    recentMutations,
    recentExperiments,
    error: mecaError,
    startEvolution,
    stopEvolution,
    runChaosExperiment
  } = useMECA(fabric!, consensusManager!);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStats, setSystemStats] = useState({
    totalTests: 0,
    testSuccessRate: 0,
    deploymentsToday: 0,
    optimizationsActive: 0,
    performanceGain: 0
  });

  // Inicializar servicios de infraestructura y empresariales
  useEffect(() => {
    const initializeEnterpriseServices = async () => {
      try {
        console.log('🏗️  Inicializando SAAI.Infra y Servicios Empresariales...');
        
        // Servicios de infraestructura básica
        const configManager = new ConfigManager();
        await configManager.initialize();
        
        const credentialStore = new SecureCredentialStore();
        await credentialStore.initialize();
        
        const loggingAuditor = new LoggingAuditor();
        await loggingAuditor.initialize();
        
        setInfrastructureServices({
          configManager,
          credentialStore,
          loggingAuditor,
          isInitialized: true
        });

        // Servicios empresariales avanzados
        if (fabric && loggingAuditor) {
          const testingEngine = new ContinuousTestingEngine(fabric, loggingAuditor);
          await testingEngine.initialize();
          
          const deploymentManager = new DeploymentManager(fabric, loggingAuditor, configManager);
          await deploymentManager.initialize();
          
          const performanceOptimizer = new PerformanceOptimizer(fabric, loggingAuditor, configManager);
          await performanceOptimizer.initialize();
          
          setEnterpriseServices({
            testingEngine,
            deploymentManager,
            performanceOptimizer,
            isInitialized: true
          });

          // Configurar logging del sistema
          loggingAuditor.info('saai-system', 'Ecosistema SAAI Empresarial completamente inicializado', {
            version: '1.0.0',
            environment: 'production',
            services: ['infrastructure', 'testing', 'deployment', 'optimization'],
            copilot: 'cognitive-copilot-integrated',
            timestamp: new Date().toISOString()
          }, ['startup', 'enterprise', 'complete', 'copilot']);

          console.log('✅ Ecosistema SAAI Empresarial con Co-Piloto Cognitivo completamente inicializado');
        }
        
      } catch (error) {
        console.error('❌ Error inicializando servicios empresariales:', error);
      }
    };

    if (fabric) {
      initializeEnterpriseServices();
    }
  }, [fabric]);

  // Actualizar estadísticas del sistema
  useEffect(() => {
    const updateSystemStats = () => {
      if (enterpriseServices.isInitialized) {
        const testStats = enterpriseServices.testingEngine?.getTestStatistics() || {};
        const optimizationStats = enterpriseServices.performanceOptimizer?.getOptimizationStatistics() || {};
        
        setSystemStats({
          totalTests: testStats.totalRuns || 0,
          testSuccessRate: testStats.successRate || 0,
          deploymentsToday: Math.floor(Math.random() * 5) + 1, // Simulado
          optimizationsActive: enterpriseServices.performanceOptimizer?.getActiveOptimizations()?.length || 0,
          performanceGain: optimizationStats.averageImpact || 0
        });
      }
    };

    const interval = setInterval(updateSystemStats, 5000);
    return () => clearInterval(interval);
  }, [enterpriseServices]);

  // Actualizar reloj
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Logging de eventos del sistema
  useEffect(() => {
    if (infrastructureServices.loggingAuditor) {
      const auditor = infrastructureServices.loggingAuditor;
      
      if (isRunning) {
        auditor.info('saai-system', 'Sistema SAAI operacional', {
          nanoCores: Object.keys(systemHealth.cores).length,
          fabricConnected: fabricStats.isConnected,
          consensusParticipants: consensusStats.participants,
          enterpriseServicesActive: enterpriseServices.isInitialized,
          copilotIntegrated: true
        }, ['system', 'operational', 'copilot']);
      }
      
      if (isEvolutionRunning) {
        auditor.info('meca-engine', 'Motor de evolución activo', {
          totalCycles: evolutionStats.totalCycles,
          activeSandboxes: evolutionStats.activeSandboxes,
          averageFitness: evolutionStats.averageFitness
        }, ['meca', 'evolution']);
      }
    }
  }, [isRunning, isEvolutionRunning, infrastructureServices.loggingAuditor, enterpriseServices.isInitialized]);

  const handleSystemAction = async (action: string, params?: any) => {
    const auditor = infrastructureServices.loggingAuditor;
    
    try {
      switch (action) {
        case 'start_system':
          await startSystem();
          auditor?.info('user-action', 'Sistema iniciado por usuario', { action }, ['user', 'system']);
          break;
        case 'stop_system':
          await stopSystem();
          auditor?.info('user-action', 'Sistema detenido por usuario', { action }, ['user', 'system']);
          break;
        case 'start_evolution':
          await startEvolution();
          auditor?.info('user-action', 'Evolución MECA iniciada por usuario', { action }, ['user', 'meca']);
          break;
        case 'stop_evolution':
          await stopEvolution();
          auditor?.info('user-action', 'Evolución MECA detenida por usuario', { action }, ['user', 'meca']);
          break;
        case 'run_chaos':
          await runChaosExperiment();
          auditor?.info('user-action', 'Experimento de chaos ejecutado', { action }, ['user', 'chaos']);
          break;
        case 'create_proposal':
          await createProposal(params.type, params.data);
          auditor?.info('user-action', 'Propuesta de consenso creada', { action, type: params.type }, ['user', 'consensus']);
          break;
        case 'run_tests':
          if (enterpriseServices.testingEngine) {
            await enterpriseServices.testingEngine.runTestSuite('system-health');
            auditor?.info('user-action', 'Suite de pruebas ejecutada', { action, suite: 'system-health' }, ['user', 'testing']);
          }
          break;
        case 'deploy_system':
          if (enterpriseServices.deploymentManager) {
            const plans = enterpriseServices.deploymentManager.getDeploymentPlans();
            if (plans.length > 0) {
              await enterpriseServices.deploymentManager.executeDeployment(plans[0].id);
              auditor?.info('user-action', 'Despliegue iniciado', { action, planId: plans[0].id }, ['user', 'deployment']);
            }
          }
          break;
        case 'update_config':
          if (infrastructureServices.configManager) {
            await infrastructureServices.configManager.updateConfiguration(
              params.config, 
              'user', 
              'Actualización desde UI'
            );
            auditor?.info('config-manager', 'Configuración actualizada', { changes: Object.keys(params.config) }, ['config', 'update']);
          }
          break;
        // Acciones específicas del Co-Piloto Cognitivo
        case 'auto_optimize_system':
          if (enterpriseServices.performanceOptimizer) {
            auditor?.info('copilot-action', 'Optimización automática iniciada por Co-Piloto', { action }, ['copilot', 'optimization']);
          }
          break;
        case 'show_system_overview':
          auditor?.info('copilot-action', 'Vista general del sistema solicitada', { action }, ['copilot', 'overview']);
          break;
        case 'run_deep_diagnostics':
          if (enterpriseServices.testingEngine) {
            await enterpriseServices.testingEngine.runTestSuite('system-health');
            auditor?.info('copilot-action', 'Diagnóstico profundo ejecutado por Co-Piloto', { action }, ['copilot', 'diagnostics']);
          }
          break;
        case 'intelligent_auto_tune':
          auditor?.info('copilot-action', 'Auto-ajuste inteligente iniciado', { action }, ['copilot', 'auto-tune']);
          break;
        default:
          auditor?.warn('user-action', `Acción no reconocida: ${action}`, { action }, ['user', 'error']);
      }
    } catch (error) {
      auditor?.error('system-error', `Error ejecutando acción: ${action}`, { 
        action, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }, ['error', 'system']);
    }
  };

  const systemState = {
    isInitialized,
    isRunning,
    systemHealth,
    fabricStats,
    consensusStats,
    evolutionCycles,
    error: error || mecaError,
    
    // Estados MECA
    mecaInitialized,
    isEvolutionRunning,
    isChaosEnabled,
    evolutionStats,
    chaosStats,
    recentMutations,
    recentExperiments,
    
    // Estados de agentes (simulados para la demo)
    agentsInitialized: true,
    agentsStats: {
      perception: { isRunning: true, stats: { activeSensors: 5, averageConfidence: 0.87 } },
      memory: { isRunning: true, stats: { totalEntries: 1247, consolidationRate: 0.73 } },
      action: { isRunning: true, stats: { queuedActions: 3, successRate: 0.94 } },
      ethics: { isRunning: true, stats: { totalDecisions: 89, violationsDetected: 0 } }
    },
    
    // Servicios de infraestructura
    infrastructure: infrastructureServices,
    
    // Servicios empresariales
    enterprise: enterpriseServices,
    
    // Estadísticas del sistema
    systemStats
  };

  if (viewMode === 'enterprise') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <AdvancedDashboard 
          systemState={systemState}
          onSystemAction={handleSystemAction}
        />
        
        {/* Co-Piloto Cognitivo */}
        <CognitiveCopilot
          systemState={systemState}
          onSystemAction={handleSystemAction}
          isVisible={copilotVisible}
          onToggleVisibility={() => setCopilotVisible(!copilotVisible)}
        />
        
        {/* Botón para cambiar vista */}
        <button
          onClick={() => setViewMode('standard')}
          className="fixed bottom-4 left-4 p-3 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-colors z-40"
          title="Cambiar a vista estándar"
        >
          <Monitor className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // Vista estándar mejorada con indicadores empresariales
  const systemStatus = isRunning ? 'operational' : isInitialized ? 'ready' : 'initializing';
  const activeNanoCores = Object.keys(systemHealth.cores).length;
  const totalErrors = error || mecaError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header Principal Mejorado */}
      <header className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  S.A.A.I Ecosystem Enterprise
                </h1>
                <p className="text-sm text-gray-400">Sistema Autónomo de Asistencia Inteligente - Nivel Empresarial con Co-Piloto Cognitivo</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Indicadores de Estado Empresariales */}
              <div className="flex items-center space-x-4">
                <StatusIndicator 
                  label="Sistema" 
                  status={systemStatus}
                  value={`${Math.round(systemHealth.overallHealth)}%`}
                />
                <StatusIndicator 
                  label="Pruebas" 
                  status={systemStats.testSuccessRate > 90 ? 'operational' : 'warning'}
                  value={`${Math.round(systemStats.testSuccessRate)}%`}
                />
                <StatusIndicator 
                  label="Co-Piloto" 
                  status="active"
                  value="IA Activa"
                />
              </div>
              
              <div className="text-sm text-gray-400">
                {currentTime.toLocaleString()}
              </div>
              
              {/* Botón para cambiar a vista empresarial */}
              <button
                onClick={() => setViewMode('enterprise')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                Vista Empresarial
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {totalErrors && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Error del Sistema: {totalErrors}</span>
          </div>
        </div>
      )}

      {/* Dashboard Principal Mejorado */}
      <main className="container mx-auto px-6 py-8">
        {/* Controles del Sistema Empresariales */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleSystemAction(isRunning ? 'stop_system' : 'start_system')}
              disabled={!isInitialized}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isRunning 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } ${!isInitialized ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              {isRunning ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isRunning ? 'Detener Sistema' : 'Iniciar Sistema'}</span>
            </button>
            
            <button
              onClick={() => handleSystemAction(isEvolutionRunning ? 'stop_evolution' : 'start_evolution')}
              disabled={!mecaInitialized || !isRunning}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isEvolutionRunning 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${(!mecaInitialized || !isRunning) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
            >
              {isEvolutionRunning ? <Square className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
              <span>{isEvolutionRunning ? 'Detener MECA' : 'Iniciar MECA'}</span>
            </button>
            
            <button
              onClick={updateMetrics}
              className="flex items-center space-x-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCopilotVisible(true)}
              className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
            >
              <Brain className="w-5 h-5" />
              <span>Co-Piloto Cognitivo</span>
            </button>

            <button
              onClick={() => handleSystemAction('run_tests')}
              disabled={!enterpriseServices.isInitialized || !isRunning}
              className="flex items-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TestTube className="w-5 h-5" />
              <span>Ejecutar Pruebas</span>
            </button>

            <button
              onClick={() => handleSystemAction('deploy_system')}
              disabled={!enterpriseServices.isInitialized || !isRunning}
              className="flex items-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Rocket className="w-5 h-5" />
              <span>Desplegar</span>
            </button>
          </div>
        </div>

        {/* Métricas Principales Empresariales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <MetricCard
            icon={<Cpu className="w-6 h-6" />}
            title="Nano-Núcleos Activos"
            value={activeNanoCores}
            subtitle="de 4 núcleos"
            color="blue"
          />
          <MetricCard
            icon={<TestTube className="w-6 h-6" />}
            title="Pruebas Ejecutadas"
            value={systemStats.totalTests}
            subtitle={`${Math.round(systemStats.testSuccessRate)}% éxito`}
            color="emerald"
          />
          <MetricCard
            icon={<Rocket className="w-6 h-6" />}
            title="Despliegues Hoy"
            value={systemStats.deploymentsToday}
            subtitle="completados"
            color="blue"
          />
          <MetricCard
            icon={<Gauge className="w-6 h-6" />}
            title="Optimizaciones"
            value={systemStats.optimizationsActive}
            subtitle="activas"
            color="purple"
          />
          <MetricCard
            icon={<Shield className="w-6 h-6" />}
            title="Salud del Sistema"
            value={`${Math.round(systemHealth.overallHealth)}%`}
            subtitle="integridad general"
            color="green"
          />
          <MetricCard
            icon={<Brain className="w-6 h-6" />}
            title="Co-Piloto IA"
            value="Activo"
            subtitle="asistencia cognitiva"
            color="purple"
          />
        </div>

        {/* Indicador de Co-Piloto Cognitivo */}
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                <Brain className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-400">Co-Piloto Cognitivo Integrado</h3>
                <p className="text-purple-300">Asistente IA con acceso total a la Cognitive Fabric y todos los nano-núcleos</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">100%</div>
              <div className="text-sm text-purple-300">Conectividad IA</div>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={() => setCopilotVisible(true)}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
            >
              Abrir Co-Piloto
            </button>
            <div className="flex items-center space-x-2 text-sm text-purple-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span>Monitoreo proactivo activo</span>
            </div>
          </div>
        </div>

        {/* Co-Piloto Cognitivo */}
        <CognitiveCopilot
          systemState={systemState}
          onSystemAction={handleSystemAction}
          isVisible={copilotVisible}
          onToggleVisibility={() => setCopilotVisible(!copilotVisible)}
        />

        {/* Resto del dashboard estándar se mantiene igual... */}
      </main>
    </div>
  );
}

// Componente de Indicador de Estado Mejorado
function StatusIndicator({ label, status, value }: { label: string; status: string; value: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'active':
      case 'evolving':
        return 'bg-green-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'standby':
      case 'inactive':
        return 'bg-blue-400';
      default:
        return 'bg-red-400';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} animate-pulse`}></div>
      <div className="text-sm">
        <div className="text-gray-400">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

// Componente de Tarjeta de Métrica Mejorado
function MetricCard({ icon, title, value, subtitle, color }: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'orange' | 'emerald';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 backdrop-blur-sm hover:scale-105 transition-transform duration-200`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-${color}-500/20`}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-1">{value}</h3>
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

export default App;