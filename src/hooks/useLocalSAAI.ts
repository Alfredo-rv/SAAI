/**
 * Hook para el Sistema SAAI Local
 */

import { useState, useEffect, useCallback } from 'react';
import { LocalSAAISystem } from '../local/LocalSAAISystem';

export function useLocalSAAI() {
  const [system] = useState(() => new LocalSAAISystem());
  const [state, setState] = useState(system.getState());
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  const updateState = useCallback(() => {
    setState(system.getState());
    setStats(system.getStats());
  }, [system]);

  const initialize = useCallback(async () => {
    try {
      setError(null);
      await system.initialize();
      updateState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Initialization failed');
    }
  }, [system, updateState]);

  const start = useCallback(async () => {
    try {
      setError(null);
      await system.start();
      updateState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Start failed');
    }
  }, [system, updateState]);

  const stop = useCallback(async () => {
    try {
      await system.stop();
      updateState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Stop failed');
    }
  }, [system, updateState]);

  const executeAction = useCallback(async (type: string, parameters: any) => {
    try {
      return await system.executeAction(type, parameters);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Action failed');
      throw error;
    }
  }, [system]);

  const startPerception = useCallback(async (type: 'camera' | 'audio' | 'files' | 'location') => {
    try {
      await system.startPerception(type);
      updateState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Perception start failed');
    }
  }, [system, updateState]);

  const startEvolution = useCallback(async () => {
    try {
      await system.startEvolution();
      updateState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Evolution start failed');
    }
  }, [system, updateState]);

  const stopEvolution = useCallback(async () => {
    try {
      await system.stopEvolution();
      updateState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Evolution stop failed');
    }
  }, [system, updateState]);

  useEffect(() => {
    initialize();
    
    const interval = setInterval(updateState, 2000);
    
    return () => {
      clearInterval(interval);
      system.shutdown();
    };
  }, [initialize, updateState, system]);

  return {
    state,
    stats,
    error,
    initialize,
    start,
    stop,
    executeAction,
    startPerception,
    startEvolution,
    stopEvolution,
    system
  };
}