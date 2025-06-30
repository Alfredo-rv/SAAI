/**
 * Hook para gestionar los Agentes de Alto Nivel SAAI
 */

import { useState, useEffect, useCallback } from 'react';
import { PerceptionAgent } from '../agents/PerceptionAgent';
import { MemoryAgent } from '../agents/MemoryAgent';
import { ActionAgent } from '../agents/ActionAgent';
import { EthicsAgent } from '../agents/EthicsAgent';
import { CognitiveFabric } from '../core/CognitiveFabric';

interface AgentsState {
  isInitialized: boolean;
  agents: {
    perception: {
      isRunning: boolean;
      stats: any;
    };
    memory: {
      isRunning: boolean;
      stats: any;
    };
    action: {
      isRunning: boolean;
      stats: any;
    };
    ethics: {
      isRunning: boolean;
      stats: any;
    };
  };
  error: string | null;
}

export function useAgents(fabric: CognitiveFabric) {
  const [state, setState] = useState<AgentsState>({
    isInitialized: false,
    agents: {
      perception: { isRunning: false, stats: {} },
      memory: { isRunning: false, stats: {} },
      action: { isRunning: false, stats: {} },
      ethics: { isRunning: false, stats: {} }
    },
    error: null
  });

  const [perceptionAgent] = useState(() => new PerceptionAgent(fabric));
  const [memoryAgent] = useState(() => new MemoryAgent(fabric));
  const [actionAgent] = useState(() => new ActionAgent(fabric));
  const [ethicsAgent] = useState(() => new EthicsAgent(fabric));

  // Inicializar agentes
  const initializeAgents = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      console.log('🤖 Inicializando Agentes de Alto Nivel...');
      
      // Inicializar todos los agentes
      await Promise.all([
        perceptionAgent.initialize(),
        memoryAgent.initialize(),
        actionAgent.initialize(),
        ethicsAgent.initialize()
      ]);
      
      setState(prev => ({ 
        ...prev, 
        isInitialized: true,
        agents: {
          perception: { isRunning: true, stats: perceptionAgent.getPerceptionStats() },
          memory: { isRunning: true, stats: memoryAgent.getMemoryStats() },
          action: { isRunning: true, stats: actionAgent.getActionStats() },
          ethics: { isRunning: true, stats: ethicsAgent.getEthicsStats() }
        },
        error: null
      }));
      
      console.log('✅ Agentes de Alto Nivel inicializados correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando agentes:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isInitialized: false
      }));
    }
  }, [perceptionAgent, memoryAgent, actionAgent, ethicsAgent]);

  // Ejecutar ciclos de procesamiento
  const runAgentCycles = useCallback(async () => {
    if (!state.isInitialized) return;
    
    try {
      // Ejecutar ciclos de todos los agentes en paralelo
      await Promise.all([
        perceptionAgent.processCycle(),
        memoryAgent.processCycle(),
        actionAgent.processCycle(),
        ethicsAgent.processCycle()
      ]);
      
    } catch (error) {
      console.error('❌ Error en ciclos de agentes:', error);
    }
  }, [state.isInitialized, perceptionAgent, memoryAgent, actionAgent, ethicsAgent]);

  // Actualizar estadísticas
  const updateStats = useCallback(() => {
    if (!state.isInitialized) return;
    
    setState(prev => ({
      ...prev,
      agents: {
        perception: { 
          isRunning: true, 
          stats: perceptionAgent.getPerceptionStats() 
        },
        memory: { 
          isRunning: true, 
          stats: memoryAgent.getMemoryStats() 
        },
        action: { 
          isRunning: true, 
          stats: actionAgent.getActionStats() 
        },
        ethics: { 
          isRunning: true, 
          stats: ethicsAgent.getEthicsStats() 
        }
      }
    }));
  }, [state.isInitialized, perceptionAgent, memoryAgent, actionAgent, ethicsAgent]);

  // Simular datos de sensores para el agente de percepción
  const simulateSensorData = useCallback(async () => {
    if (!state.isInitialized) return;
    
    // Simular datos de diferentes tipos de sensores
    const sensorTypes = ['visual', 'audio', 'network', 'system', 'environmental'];
    
    for (const sensorType of sensorTypes) {
      await fabric.publishEvent({
        eventType: 'system_metrics',
        source: 'sensor-simulator',
        payload: {
          sensorData: {
            sensorId: `sensor-${sensorType}-${Date.now()}`,
            sensorType,
            timestamp: new Date(),
            data: Math.random() * 100,
            confidence: 0.8 + Math.random() * 0.2,
            quality: 0.7 + Math.random() * 0.3
          }
        }
      });
    }
  }, [state.isInitialized, fabric]);

  // Efectos
  useEffect(() => {
    initializeAgents();
  }, [initializeAgents]);

  useEffect(() => {
    if (!state.isInitialized) return;
    
    // Ejecutar ciclos de agentes cada 2 segundos
    const cycleInterval = setInterval(runAgentCycles, 2000);
    
    // Actualizar estadísticas cada 3 segundos
    const statsInterval = setInterval(updateStats, 3000);
    
    // Simular datos de sensores cada 5 segundos
    const sensorInterval = setInterval(simulateSensorData, 5000);
    
    return () => {
      clearInterval(cycleInterval);
      clearInterval(statsInterval);
      clearInterval(sensorInterval);
    };
  }, [state.isInitialized, runAgentCycles, updateStats, simulateSensorData]);

  // Shutdown
  const shutdown = useCallback(async () => {
    try {
      await Promise.all([
        perceptionAgent.shutdown(),
        memoryAgent.shutdown(),
        actionAgent.shutdown(),
        ethicsAgent.shutdown()
      ]);
      
      setState(prev => ({
        ...prev,
        isInitialized: false,
        agents: {
          perception: { isRunning: false, stats: {} },
          memory: { isRunning: false, stats: {} },
          action: { isRunning: false, stats: {} },
          ethics: { isRunning: false, stats: {} }
        }
      }));
      
      console.log('✅ Agentes de Alto Nivel cerrados correctamente');
      
    } catch (error) {
      console.error('❌ Error cerrando agentes:', error);
    }
  }, [perceptionAgent, memoryAgent, actionAgent, ethicsAgent]);

  return {
    ...state,
    initializeAgents,
    runAgentCycles,
    updateStats,
    simulateSensorData,
    shutdown,
    // Acceso directo a agentes para operaciones específicas
    agents: {
      perception: perceptionAgent,
      memory: memoryAgent,
      action: actionAgent,
      ethics: ethicsAgent
    }
  };
}