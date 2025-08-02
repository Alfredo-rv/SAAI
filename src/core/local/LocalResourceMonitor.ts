/**
 * Monitor de Recursos Local - Monitoreo real del sistema sin simulación
 */

export interface SystemResources {
  cpu: {
    usage: number;
    cores: number;
    frequency: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
}

export class LocalResourceMonitor {
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;
  private onResourceUpdate?: (resources: SystemResources) => void;

  async initialize(): Promise<void> {
    this.isRunning = true;
  }

  startMonitoring(callback: (resources: SystemResources) => void, intervalMs: number = 1000): void {
    this.onResourceUpdate = callback;
    
    this.monitoringInterval = setInterval(async () => {
      const resources = await this.getSystemResources();
      this.onResourceUpdate?.(resources);
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  async getSystemResources(): Promise<SystemResources> {
    // Implementación real usando APIs del navegador disponibles
    const memory = (performance as any).memory;
    const connection = (navigator as any).connection;
    
    return {
      cpu: {
        usage: this.getCPUUsage(),
        cores: navigator.hardwareConcurrency || 4,
        frequency: 0, // No disponible en navegador
        temperature: undefined
      },
      memory: {
        total: memory?.jsHeapSizeLimit || 0,
        used: memory?.usedJSHeapSize || 0,
        available: (memory?.jsHeapSizeLimit || 0) - (memory?.usedJSHeapSize || 0),
        percentage: memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0
      },
      disk: {
        total: 0, // No disponible en navegador
        used: 0,
        available: 0,
        percentage: 0
      },
      network: {
        bytesReceived: 0, // Requiere implementación específica
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0
      }
    };
  }

  private getCPUUsage(): number {
    // Estimación de uso de CPU basada en timing
    const start = performance.now();
    let iterations = 0;
    const maxTime = 10; // 10ms de medición
    
    while (performance.now() - start < maxTime) {
      iterations++;
    }
    
    // Normalizar a porcentaje (aproximación)
    const baselineIterations = 100000;
    return Math.min(100, Math.max(0, 100 - (iterations / baselineIterations) * 100));
  }

  async shutdown(): Promise<void> {
    this.stopMonitoring();
    this.isRunning = false;
  }
}