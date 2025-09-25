/**
 * Componente de Configuración de APIs
 */

import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { APIManager } from '../../services/APIManager';

export function APIConfiguration() {
  const [apiManager] = useState(() => new APIManager());
  const [providers, setProviders] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    const providerList = apiManager.getAvailableProviders();
    const statusList = apiManager.getAllStatuses();
    
    setProviders(providerList);
    setStatuses(statusList);
  };

  const handleConfigureAPI = async (provider: string) => {
    const apiKey = apiKeys[provider];
    if (!apiKey) {
      alert('Ingresa una API key válida');
      return;
    }

    try {
      const success = await apiManager.configureAPI(provider, apiKey);
      if (success) {
        alert(`✅ ${provider} configurado correctamente`);
        await loadProviders();
      } else {
        alert(`❌ Error configurando ${provider}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleRefreshConnections = async () => {
    setIsRefreshing(true);
    try {
      await apiManager.refreshAllConnections();
      await loadProviders();
    } catch (error) {
      console.error('Error refrescando conexiones:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">🔑 Configuración de APIs</h3>
        <button
          onClick={handleRefreshConnections}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Verificar Conexiones</span>
        </button>
      </div>

      <div className="grid gap-6">
        {providers.map((provider) => {
          const status = statuses.find(s => s.provider === provider.provider);
          const isVisible = showApiKeys[provider.provider];
          
          return (
            <div key={provider.provider} className="bg-gray-800/50 border border-gray-600 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{provider.name}</h4>
                    <p className="text-sm text-gray-400">{provider.provider}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {status?.connected ? (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">Conectado</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-red-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">Desconectado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Configuración de API Key */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={apiKeys[provider.provider] || ''}
                        onChange={(e) => setApiKeys(prev => ({
                          ...prev,
                          [provider.provider]: e.target.value
                        }))}
                        placeholder={`Ingresa tu ${provider.name} API key...`}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => toggleApiKeyVisibility(provider.provider)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleConfigureAPI(provider.provider)}
                      disabled={!apiKeys[provider.provider]}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      Configurar
                    </button>
                  </div>
                </div>

                {/* Información de Rate Limits */}
                {provider.rateLimit && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Límites de Uso</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Requests/min:</span>
                        <span className="text-white ml-2">{provider.rateLimit.requestsPerMinute}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tokens/min:</span>
                        <span className="text-white ml-2">{provider.rateLimit.tokensPerMinute.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estadísticas de Uso */}
                {status && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Estadísticas de Uso</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Requests hoy:</span>
                        <span className="text-white ml-2">{status.usage.requestsToday}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Tokens hoy:</span>
                        <span className="text-white ml-2">{status.usage.tokensToday.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Errores:</span>
                        <span className="text-white ml-2">{status.errorCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Última verificación:</span>
                        <span className="text-white ml-2">{status.lastCheck.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Instrucciones */}
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  {provider.provider === 'openai' && (
                    <>Obtén tu API key en <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></>
                  )}
                  {provider.provider === 'anthropic' && (
                    <>Obtén tu API key en <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></>
                  )}
                  {provider.provider === 'google' && (
                    <>Obtén tu API key en <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></>
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen de Estado */}
      <div className="bg-black/20 border border-purple-500/20 rounded-xl p-6">
        <h4 className="font-bold mb-4">📊 Resumen de APIs</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {statuses.filter(s => s.connected).length}
            </div>
            <div className="text-sm text-gray-400">APIs Conectadas</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {statuses.reduce((sum, s) => sum + s.usage.requestsToday, 0)}
            </div>
            <div className="text-sm text-gray-400">Requests Hoy</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {statuses.reduce((sum, s) => sum + s.usage.tokensToday, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Tokens Hoy</div>
          </div>
        </div>
      </div>

      {/* Información de Ayuda */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
        <h4 className="font-bold text-yellow-400 mb-2">💡 Información Importante</h4>
        <div className="text-sm text-gray-300 space-y-1">
          <p>• <strong>Seguridad:</strong> Las API keys se almacenan localmente en tu navegador</p>
          <p>• <strong>Costos:</strong> Cada proveedor tiene sus propias tarifas por uso</p>
          <p>• <strong>Rate Limits:</strong> Respeta los límites para evitar bloqueos</p>
          <p>• <strong>Fallback:</strong> El sistema funciona sin APIs usando IA local simulada</p>
        </div>
      </div>
    </div>
  );
}