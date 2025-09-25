/**
 * Gestor de APIs - Configuración y gestión de servicios externos
 */

export interface APIConfig {
  provider: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  enabled: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

export interface APIStatus {
  provider: string;
  connected: boolean;
  lastCheck: Date;
  responseTime?: number;
  errorCount: number;
  usage: {
    requestsToday: number;
    tokensToday: number;
  };
}

export class APIManager {
  private configs: Map<string, APIConfig> = new Map();
  private statuses: Map<string, APIStatus> = new Map();
  private requestCounts: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // Configuraciones por defecto (sin API keys)
    const defaultConfigs: Omit<APIConfig, 'apiKey'>[] = [
      {
        provider: 'openai',
        name: 'OpenAI GPT',
        baseUrl: 'https://api.openai.com/v1',
        enabled: false,
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 150000
        }
      },
      {
        provider: 'anthropic',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com',
        enabled: false,
        rateLimit: {
          requestsPerMinute: 50,
          tokensPerMinute: 100000
        }
      },
      {
        provider: 'google',
        name: 'Google AI',
        baseUrl: 'https://generativelanguage.googleapis.com',
        enabled: false,
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 120000
        }
      }
    ];

    for (const config of defaultConfigs) {
      this.configs.set(config.provider, { ...config, apiKey: '' });
      this.statuses.set(config.provider, {
        provider: config.provider,
        connected: false,
        lastCheck: new Date(),
        errorCount: 0,
        usage: {
          requestsToday: 0,
          tokensToday: 0
        }
      });
    }
  }

  async configureAPI(provider: string, apiKey: string): Promise<boolean> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Proveedor no soportado: ${provider}`);
    }

    config.apiKey = apiKey;
    config.enabled = true;

    // Verificar conexión
    const isConnected = await this.testConnection(provider);
    
    const status = this.statuses.get(provider)!;
    status.connected = isConnected;
    status.lastCheck = new Date();

    if (isConnected) {
      console.log(`✅ ${config.name} configurado correctamente`);
    } else {
      console.error(`❌ Error configurando ${config.name}`);
      config.enabled = false;
    }

    // Guardar configuración
    this.saveConfigs();

    return isConnected;
  }

  private async testConnection(provider: string): Promise<boolean> {
    const config = this.configs.get(provider);
    if (!config || !config.apiKey) return false;

    try {
      const startTime = performance.now();
      
      switch (provider) {
        case 'openai':
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const responseTime = performance.now() - startTime;
            const status = this.statuses.get(provider)!;
            status.responseTime = responseTime;
            return true;
          }
          break;

        case 'anthropic':
          // Test de conexión para Anthropic
          // Por ahora simulado
          await new Promise(resolve => setTimeout(resolve, 500));
          return true;

        case 'google':
          // Test de conexión para Google AI
          // Por ahora simulado
          await new Promise(resolve => setTimeout(resolve, 300));
          return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error probando conexión ${provider}:`, error);
      return false;
    }
  }

  async makeRequest(provider: string, endpoint: string, data: any): Promise<any> {
    const config = this.configs.get(provider);
    const status = this.statuses.get(provider);
    
    if (!config || !config.enabled || !status?.connected) {
      throw new Error(`API ${provider} no disponible`);
    }

    // Verificar rate limits
    const requestCount = this.requestCounts.get(provider) || 0;
    if (config.rateLimit && requestCount >= config.rateLimit.requestsPerMinute) {
      throw new Error(`Rate limit excedido para ${provider}`);
    }

    try {
      const response = await fetch(`${config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Actualizar contadores
      this.requestCounts.set(provider, requestCount + 1);
      status.usage.requestsToday++;

      return await response.json();

    } catch (error) {
      status.errorCount++;
      throw error;
    }
  }

  getAvailableProviders(): APIConfig[] {
    return Array.from(this.configs.values());
  }

  getAPIStatus(provider: string): APIStatus | undefined {
    return this.statuses.get(provider);
  }

  getAllStatuses(): APIStatus[] {
    return Array.from(this.statuses.values());
  }

  isProviderAvailable(provider: string): boolean {
    const config = this.configs.get(provider);
    const status = this.statuses.get(provider);
    return !!(config?.enabled && status?.connected);
  }

  private saveConfigs(): void {
    // Guardar configuraciones (sin API keys por seguridad)
    const configsToSave = Array.from(this.configs.entries()).map(([provider, config]) => ({
      provider,
      name: config.name,
      enabled: config.enabled,
      hasApiKey: !!config.apiKey
    }));

    localStorage.setItem('second-mind-api-configs', JSON.stringify(configsToSave));
  }

  private loadConfigs(): void {
    const saved = localStorage.getItem('second-mind-api-configs');
    if (saved) {
      try {
        const configs = JSON.parse(saved);
        // Solo cargar estado de habilitado, no las API keys por seguridad
        for (const config of configs) {
          const existing = this.configs.get(config.provider);
          if (existing) {
            existing.enabled = config.enabled && config.hasApiKey;
          }
        }
      } catch (error) {
        console.warn('Error cargando configuraciones de API');
      }
    }
  }

  async refreshAllConnections(): Promise<void> {
    console.log('🔄 Verificando conexiones de APIs...');
    
    for (const [provider, config] of this.configs) {
      if (config.enabled && config.apiKey) {
        const isConnected = await this.testConnection(provider);
        const status = this.statuses.get(provider)!;
        status.connected = isConnected;
        status.lastCheck = new Date();
      }
    }
  }

  getUsageStats() {
    const totalRequests = Array.from(this.statuses.values())
      .reduce((sum, status) => sum + status.usage.requestsToday, 0);
    
    const totalTokens = Array.from(this.statuses.values())
      .reduce((sum, status) => sum + status.usage.tokensToday, 0);

    const connectedProviders = Array.from(this.statuses.values())
      .filter(status => status.connected).length;

    return {
      totalRequests,
      totalTokens,
      connectedProviders,
      totalProviders: this.configs.size
    };
  }
}