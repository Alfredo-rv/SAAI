import React, { useState, useEffect } from 'react';
import { Monitor, Brain } from 'lucide-react';
import { LocalDashboard } from './components/LocalDashboard';
import { AdvancedDashboard } from './ui/components/AdvancedDashboard';
import { CognitiveCopilot } from './ui/components/CognitiveCopilot';
import { useSAAISystem } from './hooks/useSAAISystem';
import { useMECA } from './hooks/useMECA';
import { ProposalType } from './core/ConsensusManager';

function App() {
  const [viewMode, setViewMode] = useState<'local' | 'enterprise' | 'standard'>('local');
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
        <LocalDashboard />
        
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