/**
 * Agente de Acción Local - Ejecución de scripts locales con sandbox
 */

import { LocalCognitiveFabric } from '../../core/local/LocalCognitiveFabric';

export interface ActionRequest {
  id: string;
  type: 'script' | 'file_operation' | 'system_command' | 'web_request';
  description: string;
  code: string;
  parameters: any;
  sandbox: boolean;
  timeout: number;
}

export interface ActionResult {
  actionId: string;
  status: 'success' | 'error' | 'timeout';
  result?: any;
  error?: string;
  executionTime: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

export class LocalActionAgent {
  private fabric: LocalCognitiveFabric;
  private isRunning = false;
  private activeActions: Map<string, Promise<ActionResult>> = new Map();
  private actionHistory: ActionResult[] = [];

  constructor(fabric: LocalCognitiveFabric) {
    this.fabric = fabric;
  }

  async initialize(): Promise<void> {
    await this.fabric.subscribe('action.execute', (event) => {
      this.executeAction(event.payload);
    });

    this.isRunning = true;
    console.log('Local Action Agent initialized');
  }

  async executeAction(request: ActionRequest): Promise<ActionResult> {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    try {
      let result: any;
      
      switch (request.type) {
        case 'script':
          result = await this.executeScript(request.code, request.parameters, request.sandbox);
          break;
        case 'file_operation':
          result = await this.executeFileOperation(request.parameters);
          break;
        case 'web_request':
          result = await this.executeWebRequest(request.parameters);
          break;
        default:
          throw new Error(`Unsupported action type: ${request.type}`);
      }
      
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const actionResult: ActionResult = {
        actionId: request.id,
        status: 'success',
        result,
        executionTime: endTime - startTime,
        resourceUsage: {
          memory: endMemory - startMemory,
          cpu: 0 // No disponible en navegador
        }
      };
      
      this.actionHistory.push(actionResult);
      await this.fabric.publish('action.completed', actionResult);
      
      return actionResult;
      
    } catch (error) {
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      const actionResult: ActionResult = {
        actionId: request.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: endTime - startTime,
        resourceUsage: {
          memory: endMemory - startMemory,
          cpu: 0
        }
      };
      
      this.actionHistory.push(actionResult);
      await this.fabric.publish('action.completed', actionResult);
      
      return actionResult;
    }
  }

  private async executeScript(code: string, parameters: any, sandbox: boolean): Promise<any> {
    if (sandbox) {
      return this.executeInSandbox(code, parameters);
    } else {
      return this.executeDirectly(code, parameters);
    }
  }

  private async executeInSandbox(code: string, parameters: any): Promise<any> {
    // Crear contexto aislado usando Web Workers
    return new Promise((resolve, reject) => {
      const workerCode = `
        self.onmessage = function(e) {
          const { code, parameters } = e.data;
          try {
            const func = new Function('parameters', code);
            const result = func(parameters);
            self.postMessage({ success: true, result });
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Script execution timeout'));
      }, 10000);
      
      worker.onmessage = (e) => {
        clearTimeout(timeout);
        worker.terminate();
        
        if (e.data.success) {
          resolve(e.data.result);
        } else {
          reject(new Error(e.data.error));
        }
      };
      
      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };
      
      worker.postMessage({ code, parameters });
    });
  }

  private async executeDirectly(code: string, parameters: any): Promise<any> {
    // Ejecución directa con contexto limitado
    const func = new Function('parameters', `
      const console = { log: (...args) => console.log('[SCRIPT]', ...args) };
      const Math = window.Math;
      const Date = window.Date;
      const JSON = window.JSON;
      
      ${code}
    `);
    
    return func(parameters);
  }

  private async executeFileOperation(parameters: any): Promise<any> {
    const { operation, path, content } = parameters;
    
    switch (operation) {
      case 'read':
        if ('showOpenFilePicker' in window) {
          const [fileHandle] = await (window as any).showOpenFilePicker();
          const file = await fileHandle.getFile();
          return await file.text();
        }
        throw new Error('File System Access API not available');
        
      case 'write':
        if ('showSaveFilePicker' in window) {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: path || 'output.txt'
          });
          const writable = await fileHandle.createWritable();
          await writable.write(content);
          await writable.close();
          return { success: true, path: fileHandle.name };
        }
        throw new Error('File System Access API not available');
        
      default:
        throw new Error(`Unsupported file operation: ${operation}`);
    }
  }

  private async executeWebRequest(parameters: any): Promise<any> {
    const { url, method = 'GET', headers = {}, body } = parameters;
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }

  getActionStats() {
    const recent = this.actionHistory.slice(-50);
    const successful = recent.filter(a => a.status === 'success').length;
    
    return {
      totalActions: this.actionHistory.length,
      successRate: recent.length > 0 ? (successful / recent.length) * 100 : 0,
      averageExecutionTime: recent.length > 0 
        ? recent.reduce((sum, a) => sum + a.executionTime, 0) / recent.length 
        : 0,
      activeActions: this.activeActions.size
    };
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.activeActions.clear();
  }
}