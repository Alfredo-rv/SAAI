/**
 * Hook para gestionar MECA (Motor de Evolución Cognitiva Autónoma)
 */

import { useState, useEffect, useCallback } from 'react';
import { EvolutionEngine, Mutation, EvolutionCycle } from '../meca/EvolutionEngine';
import { ChaosEngine, ChaosExperiment, ChaosType } from '../meca/ChaosEngineering';
import { CognitiveFabric } from '../core/CognitiveFabric';
import { ConsensusManager } from '../core/ConsensusManager';

interface MECAState {
  isInitialized: boolean;
  isEvolutionRunning: boolean;
  isChaosEnabled: boolean;
  evolutionStats: {
    totalCycles: number;
    currentCycle?: EvolutionCycle;
    activeSandboxes: number;
    totalMutations: number;
    averageFitness: number;
  };
  chaosStats: {
    totalExperiments: number;
    activeExperiments: number;
    averageResilienceScore: number;
  };
  recentMutations: Mutation[];
  recentExperiments: ChaosExperiment[];
  error: string | null;
}

export function useMECA(
  fabric: CognitiveFabric,
  consensusManager: ConsensusManager
) {
  const [state, setState] = useState<MECAState>({
    isInitialized: false,
    isEvolutionRunning: false,
    isChaosEnabled: false,
    evolutionStats: {
      totalCycles: 0,
      activeSandboxes: 0,
      totalMutations: 0,
      averageFitness: 0
    },
    chaosStats: {
      totalExperiments: 0,
      activeExperiments: 0,
      averageResilienceScore: 0
    },
    recentMutations: [],
    recentExperiments: [],
    error: null
  });

  const [evolutionEngine] = useState(() => new EvolutionEngine(fabric, consensusManager));
  const [chaosEngine] = useState(() => new ChaosEngine(fabric));

  // Inicializar MECA
  const initializeMECA = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      console.log('🧬 Inicializando MECA...');
      
      // Inicializar motores
      await evolutionEngine.initialize();
      await chaosEngine.initialize();
      
      setState(prev => ({ 
        ...prev, 
        isInitialized: true,
        isChaosEnabled: true,
        error: null
      }));
      
      console.log('✅ MECA inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando MECA:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isInitialized: false
      }));
    }
  }, [evolutionEngine, chaosEngine]);

  // Iniciar evolución
  const startEvolution = useCallback(async () => {
    try {
      if (!state.isInitialized) {
        throw new Error('MECA no inicializado');
      }
      
      await evolutionEngine.startEvolution();
      setState(prev => ({ ...prev, isEvolutionRunning: true }));
      
      console.log('🚀 Evolución MECA iniciada');
      
    } catch (error) {
      console.error('❌ Error iniciando evolución:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, [state.isInitialized, evolutionEngine]);

  // Detener evolución
  const stopEvolution = useCallback(async () => {
    try {
      await evolutionEngine.stopEvolution();
      setState(prev => ({ ...prev, isEvolutionRunning: false }));
      
      console.log('🛑 Evolución MECA detenida');
      
    } catch (error) {
      console.error('❌ Error deteniendo evolución:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, [evolutionEngine]);

  // Ejecutar experimento de chaos
  const runChaosExperiment = useCallback(async (type?: ChaosType) => {
    try {
      if (!state.isChaosEnabled) {
        throw new Error('Chaos Engineering no habilitado');
      }
      
      let experimentId: string;
      
      if (type) {
        // Crear experimento específico
        experimentId = await chaosEngine.createExperiment({
          name: `Experimento ${type}`,
          description: `Prueba de resiliencia tipo ${type}`,
          type,
          target: 'nano-cores',
          parameters: { intensity: 0.5 },
          duration: 10000
        });
        
        await chaosEngine.runExperiment(experimentId);
      } else {
        // Ejecutar experimento aleatorio
        experimentId = await chaosEngine.runRandomExperiment();
      }
      
      console.log(`💥 Experimento de chaos ejecutado: ${experimentId}`);
      return experimentId;
      
    } catch (error) {
      console.error('❌ Error ejecutando experimento de chaos:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
      throw error;
    }
  }, [state.isChaosEnabled, chaosEngine]);

  // Actualizar estadísticas
  const updateStats = useCallback(async () => {
    if (!state.isInitialized) return;
    
    try {
      const evolutionStats = evolutionEngine.getEvolutionStats();
      const chaosStats = chaosEngine.getChaosStats();
      
      setState(prev => ({
        ...prev,
        evolutionStats,
        chaosStats,
        isEvolutionRunning: evolutionStats.isRunning
      }));
      
    } catch (error) {
      console.error('❌ Error actualizando estadísticas MECA:', error);
    }
  }, [state.isInitialized, evolutionEngine, chaosEngine]);

  // Obtener mutaciones recientes
  const getRecentMutations = useCallback(() => {
    if (!state.isInitialized) return [];
    
    const stats = evolutionEngine.getEvolutionStats();
    if (stats.currentCycle) {
      return stats.currentCycle.mutations.slice(-5); // Últimas 5 mutaciones
    }
    
    return [];
  }, [state.isInitialized, evolutionEngine]);

  // Obtener experimentos recientes
  const getRecentExperiments = useCallback(() => {
    if (!state.isInitialized) return [];
    
    const history = chaosEngine.getExperimentHistory();
    return history.slice(-5); // Últimos 5 experimentos
  }, [state.isInitialized, chaosEngine]);

  // Efecto para actualizar estadísticas periódicamente
  useEffect(() => {
    if (!state.isInitialized) return;
    
    const interval = setInterval(() => {
      updateStats();
      
      // Actualizar mutaciones y experimentos recientes
      setState(prev => ({
        ...prev,
        recentMutations: getRecentMutations(),
        recentExperiments: getRecentExperiments()
      }));
    }, 3000);
    
    return () => clearInterval(interval);
  }, [state.isInitialized, updateStats, getRecentMutations, getRecentExperiments]);

  // Inicializar automáticamente
  useEffect(() => {
    initializeMECA();
  }, [initializeMECA]);

  // Shutdown
  const shutdown = useCallback(async () => {
    try {
      await evolutionEngine.shutdown();
      await chaosEngine.shutdown();
      
      setState(prev => ({
        ...prev,
        isInitialized: false,
        isEvolutionRunning: false,
        isChaosEnabled: false
      }));
      
      console.log('✅ MECA cerrado correctamente');
      
    } catch (error) {
      console.error('❌ Error cerrando MECA:', error);
    }
  }, [evolutionEngine, chaosEngine]);

  return {
    ...state,
    initializeMECA,
    startEvolution,
    stopEvolution,
    runChaosExperiment,
    updateStats,
    shutdown
  };
}