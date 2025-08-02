/**
 * Dashboard Local SAAI - Interfaz para sistema local
 */

import React, { useState } from 'react';
import { 
  Brain, Cpu, Eye, Database, Zap, Activity, 
  Play, Square, Camera, Mic, FileText, MapPin,
  Settings, BarChart3, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useLocalSAAI } from '../hooks/useLocalSAAI';

export function LocalDashboard() {
  const {
    state,
    stats,
    error,
    start,
    stop,
    executeAction,
    startPerception,
    startEvolution,
    stopEvolution
  } = useLocalSAAI();

  const [activeTab, setActiveTab] = useState('overview');

  const handlePerceptionAction = async (type: 'camera' | 'audio' | 'files' | 'location') => {
    try {
      await startPerception(type);
    } catch (error) {
      console.error(`Perception ${type} failed:`, error);
    }
  };

  const handleExecuteScript = async () => {
    const code = `
      console.log('Test script execution');
      return { message: 'Script executed successfully', timestamp: new Date() };
    `;
    
    try {
      const result = await executeAction('script', { code });
      console.log('Script result:', result);
    } catch (error) {
      console.error('Script execution failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  SAAI Local System
                </h1>
                <p className="text-sm text-gray-400">Sistema Autónomo Local - Sin Dependencias Externas</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${state.isRunning ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-sm">{state.isRunning ? 'Operacional' : 'Detenido'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-6 py-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Error: {error}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={state.isRunning ? stop : start}
            disabled={!state.isInitialized}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              state.isRunning 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            } ${!state.isInitialized ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {state.isRunning ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>{state.isRunning ? 'Detener Sistema' : 'Iniciar Sistema'}</span>
          </button>
          
          <button
            onClick={stats.evolution?.isRunning ? stopEvolution : startEvolution}
            disabled={!state.isRunning}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              stats.evolution?.isRunning 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } ${!state.isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Brain className="w-5 h-5" />
            <span>{stats.evolution?.isRunning ? 'Detener Evolución' : 'Iniciar Evolución'}</span>
          </button>
        </div>

        {/* Component Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ComponentCard
            title="Cognitive Fabric"
            icon={<Activity className="w-6 h-6" />}
            status={state.components.fabric}
            stats={stats.fabric}
          />
          <ComponentCard
            title="Resource Monitor"
            icon={<Cpu className="w-6 h-6" />}
            status={state.components.monitor}
            stats={state.resources}
          />
          <ComponentCard
            title="Perception Agent"
            icon={<Eye className="w-6 h-6" />}
            status={state.components.perception}
            stats={stats.perception}
          />
          <ComponentCard
            title="Memory Agent"
            icon={<Database className="w-6 h-6" />}
            status={state.components.memory}
            stats={stats.memory}
          />
          <ComponentCard
            title="Action Agent"
            icon={<Zap className="w-6 h-6" />}
            status={state.components.action}
            stats={stats.action}
          />
          <ComponentCard
            title="Evolution Engine"
            icon={<BarChart3 className="w-6 h-6" />}
            status={state.components.evolution}
            stats={stats.evolution}
          />
        </div>

        {/* Perception Controls */}
        <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Controles de Percepción</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handlePerceptionAction('camera')}
              disabled={!state.capabilities?.camera}
              className="flex flex-col items-center space-y-2 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            >
              <Camera className="w-8 h-8" />
              <span>Cámara</span>
            </button>
            <button
              onClick={() => handlePerceptionAction('audio')}
              disabled={!state.capabilities?.microphone}
              className="flex flex-col items-center space-y-2 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            >
              <Mic className="w-8 h-8" />
              <span>Micrófono</span>
            </button>
            <button
              onClick={() => handlePerceptionAction('files')}
              disabled={!state.capabilities?.fileSystem}
              className="flex flex-col items-center space-y-2 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            >
              <FileText className="w-8 h-8" />
              <span>Archivos</span>
            </button>
            <button
              onClick={() => handlePerceptionAction('location')}
              disabled={!state.capabilities?.geolocation}
              className="flex flex-col items-center space-y-2 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            >
              <MapPin className="w-8 h-8" />
              <span>Ubicación</span>
            </button>
          </div>
        </div>

        {/* Action Testing */}
        <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">Prueba de Acciones</h3>
          <button
            onClick={handleExecuteScript}
            disabled={!state.isRunning}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Ejecutar Script de Prueba
          </button>
        </div>
      </div>
    </div>
  );
}

function ComponentCard({ title, icon, status, stats }: {
  title: string;
  icon: React.ReactNode;
  status: boolean;
  stats?: any;
}) {
  return (
    <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            {icon}
          </div>
          <h3 className="font-bold">{title}</h3>
        </div>
        <div className={`w-3 h-3 rounded-full ${status ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
      </div>
      
      {stats && (
        <div className="text-sm text-gray-400">
          {Object.entries(stats).slice(0, 3).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}:</span>
              <span>{typeof value === 'number' ? value.toFixed(2) : String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}