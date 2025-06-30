/**
 * Hook personalizado para gestionar el sistema SAAI completo
 * Actualizado para incluir Agentes de Alto Nivel
 */

import { useState, useEffect, useCallback } from 'react';
import { CognitiveFabric } from '../core/CognitiveFabric';
import { NanoCoreManager, NanoCoreHealth } from '../core/NanoCoreSimulator';
import { ConsensusManager, ProposalType } from '../core/ConsensusManager';
import { useAgents } from './useAgents';

interface SAAISystemState {
  isInitialized: boolean;
  isRunning: boolean;
  systemHealth: {
    cores: Record<string, NanoCoreHealth[]>;
    overallHealth: number;
  };
  fabricStats: {
    totalEvents: number;
    averageLatency: number;
    isConnected: boolean;
  };
  consensusStats: {
    totalProposals: number;
    activeProposals: number;
    participants: number;
    successRate: number;
  };
  evolutionCycles: number;
  error: string | null;
}

export function useSAAISystem() {
  const [state, setState] = useState<SAAISystemState>({
    isInitialized: false,
    isRunning: false,
    systemHealth: {
      cores: {},
      overallHealth: 0
    },
    fabricStats: {
      totalEvents: 0,
      averageLatency: 0,
      isConnected: false
    },
    consensusStats: {
      totalProposals: 0,
      activeProposals: 0,
      participants: 0,
      successRate: 0
    },
    evolutionCycles: 0,
    error: null
  });

  const [fabric] = useState(() => new CognitiveFabric());
  const [nanoCoreManager] = useState(() => new NanoCoreManager(fabric));
  const [consensusManager] = useState(() => new ConsensusManager(fabric));
  
  // Usar hook de agentes
  const agentsSystem = useAgents(fabric);

  // Inicializar sistema SAAI
  const initializeSystem = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      console.log('🚀 Inicializando Sistema SAAI Completo...');
      
      // Conectar Cognitive Fabric
      await fabric.connect();
      
      // Inicializar ConsensusManager
      await consensusManager.initialize();
      
      // Registrar participantes simulados
      for (let i = 0; i < 5; i++) {
        await consensusManager.registerParticipant(`participant-${i}`);
      }
      
      // Inicializar NanoCoreManager
      await nanoCoreManager.initialize();
      
      setState(prev => ({ 
        ...prev, 
        isInitialized: true,
        error: null
      }));
      
      console.log('✅ Sistema SAAI inicializado correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando sistema SAAI:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isInitialized: false
      }));
    }
  }, [fabric, nanoCoreManager, consensusManager]);

  // Iniciar sistema
  const startSystem = useCallback(async () => {
    try {
      if (!state.isInitialized) {
        throw new Error('Sistema no inicializado');
      }
      
      console.log('⚡ Iniciando sistema SAAI completo...');
      
      // Iniciar nano-núcleos
      await nanoCoreManager.startAllCores();
      
      setState(prev => ({ ...prev, isRunning: true }));
      console.log('✅ Sistema SAAI en funcionamiento completo');
      
    } catch (error) {
      console.error('❌ Error iniciando sistema:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, [state.isInitialized, nanoCoreManager]);

  // Detener sistema
  const stopSystem = useCallback(async () => {
    try {
      console.log('🛑 Deteniendo sistema SAAI...');
      
      // Detener agentes primero
      await agentsSystem.shutdown();
      
      // Luego detener el resto del sistema
      await nanoCoreManager.shutdown();
      await consensusManager.shutdown();
      await fabric.shutdown();
      
      setState(prev => ({ 
        ...prev, 
        isRunning: false,
        isInitialized: false
      }));
      
      console.log('✅ Sistema SAAI detenido');
      
    } catch (error) {
      console.error('❌ Error deteniendo sistema:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, [nanoCoreManager, consensusManager, fabric, agentsSystem]);

  // Crear propuesta de consenso
  const createProposal = useCallback(async (type: ProposalType, data: any) => {
    try {
      const proposalId = await consensusManager.propose({
        proposalType: type,
        proposer: 'saai-ui',
        data,
        requiredVotes: 3
      });
      
      console.log(`📋 Propuesta creada: ${proposalId}`);
      return proposalId;
      
    } catch (error) {
      console.error('❌ Error creando propuesta:', error);
      throw error;
    }
  }, [consensusManager]);

  // Actualizar métricas del sistema
  const updateMetrics = useCallback(async () => {
    if (!state.isInitialized) return;
    
    try {
      // Obtener salud del sistema
      const systemHealth = await nanoCoreManager.getSystemHealth();
      
      // Obtener estadísticas del fabric
      const fabricStats = fabric.getStatistics();
      
      // Obtener estadísticas de consenso
      const consensusStats = consensusManager.getStatistics();
      
      setState(prev => ({
        ...prev,
        systemHealth,
        fabricStats,
        consensusStats,
        evolutionCycles: prev.evolutionCycles + Math.floor(Math.random() * 2)
      }));
      
    } catch (error) {
      console.error('❌ Error actualizando métricas:', error);
    }
  }, [state.isInitialized, nanoCoreManager, fabric, consensusManager]);

  // Efecto para actualizar métricas periódicamente
  useEffect(() => {
    if (!state.isRunning) return;
    
    const interval = setInterval(updateMetrics, 2000);
    return () => clearInterval(interval);
  }, [state.isRunning, updateMetrics]);

  // Inicializar automáticamente al montar
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  return {
    ...state,
    // Estados de agentes
    agentsInitialized: agentsSystem.isInitialized,
    agentsStats: agentsSystem.agents,
    agentsError: agentsSystem.error,
    
    // Funciones del sistema
    initializeSystem,
    startSystem,
    stopSystem,
    createProposal,
    updateMetrics,
    
    // Acceso a componentes internos
    fabric,
    consensusManager,
    
    // Funciones de agentes
    simulateSensorData: agentsSystem.simulateSensorData,
    runAgentCycles: agentsSystem.runAgentCycles
  };
}