/**
 * Dashboard Avanzado SAAI - Interfaz de Usuario Definitiva
 * Panel de control empresarial con capacidades avanzadas de monitoreo
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, Brain, Shield, Network, Cpu, Eye, Zap, Settings,
  BarChart3, GitBranch, AlertTriangle, CheckCircle, Clock,
  Layers, Database, Lock, Play, Square, RefreshCw, Beaker,
  TrendingUp, Shuffle, Target, Flame, Monitor, Server,
  FileText, Key, Bell, Users, Gauge, Wifi, HardDrive
} from 'lucide-react';

interface AdvancedDashboardProps {
  systemState: any;
  onSystemAction: (action: string, params?: any) => void;
}

export function AdvancedDashboard({ systemState, onSystemAction }: AdvancedDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeData, setRealTimeData] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Simular datos en tiempo real
    const interval = setInterval(() => {
      setRealTimeData({
        timestamp: new Date(),
        metrics: {
          cpuUsage: 20 + Math.random() * 30,
          memoryUsage: 40 + Math.random() * 20,
          networkLatency: 1 + Math.random() * 5,
          activeConnections: 150 + Math.floor(Math.random() * 50)
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Vista General', icon: Monitor },
    { id: 'infrastructure', label: 'Infraestructura', icon: Server },
    { id: 'agents', label: 'Agentes IA', icon: Brain },
    { id: 'meca', label: 'MECA Evolution', icon: Beaker },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'logs', label: 'Logs & Auditoría', icon: FileText },
    { id: 'config', label: 'Configuración', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header Avanzado */}
      <header className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  SAAI Ecosystem Enterprise
                </h1>
                <p className="text-sm text-gray-400">Sistema Autónomo de Asistencia Inteligente - Nivel Empresarial</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Indicadores de Estado */}
              <div className="flex items-center space-x-4">
                <StatusIndicator 
                  label="Sistema" 
                  status={systemState.isRunning ? 'operational' : 'standby'}
                  value={`${Math.round(systemState.systemHealth?.overallHealth || 0)}%`}
                />
                <StatusIndicator 
                  label="MECA" 
                  status={systemState.isEvolutionRunning ? 'evolving' : 'standby'}
                  value={`${systemState.evolutionStats?.totalCycles || 0} ciclos`}
                />
                <StatusIndicator 
                  label="Agentes" 
                  status={systemState.agentsInitialized ? 'active' : 'inactive'}
                  value="4/4"
                />
              </div>
              
              {/* Alertas */}
              <div className="relative">
                <button className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                  <Bell className="w-5 h-5" />
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="text-sm text-gray-400">
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación por Pestañas */}
      <nav className="border-b border-gray-700/50 bg-black/10">
        <div className="container mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab systemState={systemState} realTimeData={realTimeData} />}
        {activeTab === 'infrastructure' && <InfrastructureTab systemState={systemState} />}
        {activeTab === 'agents' && <AgentsTab systemState={systemState} />}
        {activeTab === 'meca' && <MECATab systemState={systemState} />}
        {activeTab === 'security' && <SecurityTab systemState={systemState} />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'config' && <ConfigTab onSystemAction={onSystemAction} />}
      </main>
    </div>
  );
}

// Componente de Indicador de Estado
function StatusIndicator({ label, status, value }: { label: string; status: string; value: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'active':
      case 'evolving':
        return 'bg-green-400';
      case 'standby':
      case 'inactive':
        return 'bg-yellow-400';
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

// Tab de Vista General
function OverviewTab({ systemState, realTimeData }: { systemState: any; realTimeData: any }) {
  return (
    <div className="space-y-8">
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<Cpu className="w-6 h-6" />}
          title="CPU del Sistema"
          value={`${Math.round(realTimeData.metrics?.cpuUsage || 0)}%`}
          subtitle="uso promedio"
          color="blue"
          trend="+2.3%"
        />
        <MetricCard
          icon={<HardDrive className="w-6 h-6" />}
          title="Memoria RAM"
          value={`${Math.round(realTimeData.metrics?.memoryUsage || 0)}%`}
          subtitle="uso actual"
          color="green"
          trend="-1.2%"
        />
        <MetricCard
          icon={<Wifi className="w-6 h-6" />}
          title="Latencia Red"
          value={`${(realTimeData.metrics?.networkLatency || 0).toFixed(1)}ms`}
          subtitle="promedio"
          color="purple"
          trend="+0.5ms"
        />
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          title="Conexiones"
          value={realTimeData.metrics?.activeConnections || 0}
          subtitle="activas"
          color="orange"
          trend="+12"
        />
      </div>

      {/* Gráficos en Tiempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RealTimeChart 
          title="Rendimiento del Sistema"
          data={realTimeData}
          type="performance"
        />
        <RealTimeChart 
          title="Actividad de Agentes"
          data={systemState.agentsStats}
          type="agents"
        />
      </div>

      {/* Estado de Componentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ComponentStatus title="Nano-Núcleos" components={systemState.systemHealth?.cores} />
        <ComponentStatus title="Agentes IA" components={systemState.agentsStats} />
        <ComponentStatus title="MECA Evolution" components={systemState.evolutionStats} />
      </div>
    </div>
  );
}

// Tab de Infraestructura
function InfrastructureTab({ systemState }: { systemState: any }) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Infraestructura del Sistema</h2>
      
      {/* Nano-Núcleos */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Layers className="w-5 h-5 mr-2" />
          Nano-Núcleos Cuánticos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['OS', 'Hardware', 'Network', 'Security'].map((core) => (
            <div key={core} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Nano-Core.{core}</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div className="text-sm text-gray-400">
                <div>Instancias: 3/3</div>
                <div>Carga: {Math.round(20 + Math.random() * 30)}%</div>
                <div>Latencia: {(1 + Math.random() * 2).toFixed(1)}ms</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cognitive Fabric */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Network className="w-5 h-5 mr-2" />
          Cognitive Fabric
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{systemState.fabricStats?.totalEvents || 0}</div>
            <div className="text-sm text-gray-400">Eventos Totales</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{(systemState.fabricStats?.averageLatency || 0).toFixed(1)}ms</div>
            <div className="text-sm text-gray-400">Latencia Promedio</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {systemState.fabricStats?.isConnected ? 'Conectado' : 'Desconectado'}
            </div>
            <div className="text-sm text-gray-400">Estado de Conexión</div>
          </div>
        </div>
      </div>

      {/* Sistema de Consenso */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <GitBranch className="w-5 h-5 mr-2" />
          Sistema de Consenso
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-indigo-400">{systemState.consensusStats?.participants || 0}</div>
            <div className="text-sm text-gray-400">Participantes</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-400">{systemState.consensusStats?.activeProposals || 0}</div>
            <div className="text-sm text-gray-400">Propuestas Activas</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{systemState.consensusStats?.totalProposals || 0}</div>
            <div className="text-sm text-gray-400">Total Propuestas</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-400">{Math.round(systemState.consensusStats?.successRate || 0)}%</div>
            <div className="text-sm text-gray-400">Tasa de Éxito</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab de Agentes
function AgentsTab({ systemState }: { systemState: any }) {
  const agents = [
    { name: 'SAAI.Perception', icon: Eye, color: 'blue', description: 'Omni-percepción adaptativa' },
    { name: 'SAAI.Memory', icon: Database, color: 'green', description: 'Memoria neuronal distribuida' },
    { name: 'SAAI.Action', icon: Zap, color: 'yellow', description: 'Ejecución ultra-confiable' },
    { name: 'SAAI.Ethics', icon: Shield, color: 'purple', description: 'Gobernanza cuántica' }
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Agentes de Alto Nivel</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {agents.map((agent, index) => {
          const IconComponent = agent.icon;
          return (
            <div key={index} className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${agent.color}-500/20`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">{agent.name}</h3>
                    <p className="text-sm text-gray-400">{agent.description}</p>
                  </div>
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-lg font-bold">{Math.floor(Math.random() * 1000)}</div>
                  <div className="text-xs text-gray-400">Operaciones</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-lg font-bold">{Math.round(80 + Math.random() * 20)}%</div>
                  <div className="text-xs text-gray-400">Eficiencia</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Tab de MECA
function MECATab({ systemState }: { systemState: any }) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">MECA - Motor de Evolución Cognitiva</h2>
      
      {/* Estado de Evolución */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Estado de Evolución
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{systemState.evolutionStats?.totalCycles || 0}</div>
            <div className="text-sm text-gray-400">Ciclos Completados</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">{systemState.evolutionStats?.activeSandboxes || 0}</div>
            <div className="text-sm text-gray-400">Sandboxes Activos</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">{Math.round((systemState.evolutionStats?.averageFitness || 0) * 100)}%</div>
            <div className="text-sm text-gray-400">Fitness Promedio</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">{systemState.chaosStats?.totalExperiments || 0}</div>
            <div className="text-sm text-gray-400">Experimentos Chaos</div>
          </div>
        </div>
      </div>

      {/* Mutaciones Recientes */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <GitBranch className="w-5 h-5 mr-2" />
          Mutaciones Recientes
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">Optimización de Rendimiento #{i}</div>
                <div className="text-sm text-gray-400">Mejora en algoritmo de búsqueda con cache inteligente</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm bg-green-500/20 text-green-300 px-2 py-1 rounded">Desplegado</span>
                <span className="text-sm text-purple-300">Fitness: {Math.round(80 + Math.random() * 20)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tab de Seguridad
function SecurityTab({ systemState }: { systemState: any }) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Centro de Seguridad</h2>
      
      {/* Estado de Seguridad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black/20 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-green-400">Seguro</span>
          </div>
          <p className="text-sm text-gray-400">Sistema protegido y sin amenazas detectadas</p>
        </div>
        
        <div className="bg-black/20 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">Encriptado</span>
          </div>
          <p className="text-sm text-gray-400">Todas las comunicaciones están encriptadas</p>
        </div>
        
        <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Eye className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">Monitoreado</span>
          </div>
          <p className="text-sm text-gray-400">Auditoría continua de todas las operaciones</p>
        </div>
      </div>

      {/* Eventos de Seguridad */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">Eventos de Seguridad Recientes</h3>
        <div className="space-y-3">
          {[
            { type: 'info', message: 'Rotación automática de claves completada', time: '2 min ago' },
            { type: 'success', message: 'Verificación de integridad exitosa', time: '5 min ago' },
            { type: 'warning', message: 'Intento de acceso desde IP desconocida', time: '12 min ago' }
          ].map((event, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  event.type === 'success' ? 'bg-green-400' :
                  event.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                }`}></div>
                <span>{event.message}</span>
              </div>
              <span className="text-sm text-gray-400">{event.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tab de Logs
function LogsTab() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Logs y Auditoría</h2>
      
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Logs del Sistema</h3>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
            Exportar Logs
          </button>
        </div>
        
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
          {[
            '[2024-12-19 15:30:45] INFO  saai-core           Sistema SAAI iniciado correctamente',
            '[2024-12-19 15:30:46] INFO  nano-core-os        Nano-Core.OS operacional',
            '[2024-12-19 15:30:47] INFO  cognitive-fabric    Cognitive Fabric conectado',
            '[2024-12-19 15:30:48] INFO  meca-engine         Motor de evolución iniciado',
            '[2024-12-19 15:30:49] INFO  agents-system       Agentes de alto nivel activos',
            '[2024-12-19 15:30:50] WARN  security-core       Rotación de claves programada',
            '[2024-12-19 15:30:51] INFO  consensus-manager   Consenso bizantino estable'
          ].map((log, i) => (
            <div key={i} className="mb-1 hover:bg-gray-800/50 px-2 py-1 rounded">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tab de Configuración
function ConfigTab({ onSystemAction }: { onSystemAction: (action: string, params?: any) => void }) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Configuración del Sistema</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuración General */}
        <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Configuración General</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nivel de Log</label>
              <select className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2">
                <option>INFO</option>
                <option>DEBUG</option>
                <option>WARN</option>
                <option>ERROR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Operaciones Concurrentes</label>
              <input 
                type="number" 
                defaultValue="100"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Configuración de Seguridad */}
        <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Configuración de Seguridad</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Encriptación Habilitada</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            <div className="flex items-center justify-between">
              <span>Sandboxing Activo</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            <div className="flex items-center justify-between">
              <span>Detección de Amenazas</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes auxiliares
function MetricCard({ icon, title, value, subtitle, color, trend }: any) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 backdrop-blur-sm hover:scale-105 transition-transform duration-200`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-${color}-500/20`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs text-gray-400">{trend}</span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-1">{value}</h3>
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function RealTimeChart({ title, data, type }: any) {
  return (
    <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <div className="h-64 bg-gray-800/50 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">Gráfico en Tiempo Real - {type}</div>
      </div>
    </div>
  );
}

function ComponentStatus({ title, components }: any) {
  return (
    <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <span>Componente {i}</span>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}