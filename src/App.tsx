import React, { useState, useEffect } from 'react';
import { Monitor, Brain, Upload, FileText } from 'lucide-react';
import { LocalDashboard } from './components/LocalDashboard';
import { AdvancedDashboard } from './ui/components/AdvancedDashboard';
import { CognitiveCopilot } from './ui/components/CognitiveCopilot';
import { DataUploader } from './components/real/DataUploader';
import { ModelTrainer } from './components/real/ModelTrainer';
import { APIConfiguration } from './components/real/APIConfiguration';
import { useSAAISystem } from './hooks/useSAAISystem';
import { useMECA } from './hooks/useMECA';
import { ProposalType } from './core/ConsensusManager';

function App() {
  const [viewMode, setViewMode] = useState<'local' | 'enterprise' | 'standard'>('local');
  const [copilotVisible, setCopilotVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [processedData, setProcessedData] = useState<any>(null);
  
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

  const tabs = [
    { id: 'upload', label: 'Subir Datos', icon: Upload },
    { id: 'train', label: 'Entrenar Modelo', icon: Brain },
    { id: 'dashboard', label: 'Dashboard', icon: Monitor },
    { id: 'apis', label: 'APIs', icon: Settings },
  ];

  const handleSystemAction = async (action: string, params?: any) => {
    try {
      switch (action) {
        case 'start_system':
          await startSystem();
          break;
        case 'stop_system':
          await stopSystem();
          break;
        case 'start_evolution':
          await startEvolution();
          break;
        case 'stop_evolution':
          await stopEvolution();
          break;
        case 'run_chaos':
          await runChaosExperiment();
          break;
        case 'create_proposal':
          await createProposal(params.type, params.data);
          break;
        default:
          console.warn(`Acción no reconocida: ${action}`);
      }
    } catch (error) {
      console.error(`Error ejecutando acción: ${action}`, error);
    }
  };

  // Renderizar vista local
  if (viewMode === 'local') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Navegación de pestañas */}
        <nav className="bg-black/20 border-b border-purple-500/20">
          <div className="container mx-auto px-6">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-400 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Contenido Principal */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            {activeTab === 'upload' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">📊 Subir y Procesar Datos</h2>
                <DataUploader onDataProcessed={setProcessedData} />
              </div>
            )}
            
            {activeTab === 'train' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">🤖 Entrenar Modelo de IA</h2>
                {processedData ? (
                  <ModelTrainer 
                    data={processedData.validation.cleanedData || processedData.processing.data}
                    columns={processedData.processing.columns}
                    onModelTrained={(result) => {
                      console.log('Modelo entrenado:', result);
                    }}
                  />
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
                    <FileText className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">
                      Primero Sube un Dataset
                    </h3>
                    <p className="text-gray-300 mb-4">
                      Para entrenar un modelo, necesitas subir y procesar un dataset primero.
                    </p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    >
                      Ir a Subir Datos
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'dashboard' && <LocalDashboard />}
            
            {activeTab === 'apis' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">🔑 Configuración de APIs</h2>
                <APIConfiguration />
              </div>
            )}
          </div>
        </main>
        
        {/* Botón para cambiar vista */}
        <button
          onClick={() => setViewMode('enterprise')}
          className="fixed bottom-4 left-4 p-3 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-colors z-40"
          title="Cambiar a vista empresarial"
        >
          <Brain className="w-6 h-6" />
        </button>
      </div>
    );
  }

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
    }
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
          onClick={() => setViewMode('local')}
          className="fixed bottom-4 left-4 p-3 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-colors z-40"
          title="Cambiar a vista local"
        >
          <Monitor className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // Fallback a vista empresarial
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <AdvancedDashboard 
        systemState={systemState}
        onSystemAction={handleSystemAction}
      />
      
      <CognitiveCopilot
        systemState={systemState}
        onSystemAction={handleSystemAction}
        isVisible={copilotVisible}
        onToggleVisibility={() => setCopilotVisible(!copilotVisible)}
      />
      
      <button
        onClick={() => setViewMode('local')}
        className="fixed bottom-4 left-4 p-3 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-colors z-40"
        title="Cambiar a vista local"
      >
        <Monitor className="w-6 h-6" />
      </button>
    </div>
  );
}

export default App;