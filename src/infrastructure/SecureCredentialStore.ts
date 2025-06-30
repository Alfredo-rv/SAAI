/**
 * SecureCredentialStore - Vault de claves mutables con rotación automática
 * Sistema de gestión de credenciales con encriptación y rotación automática
 */

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  value: string;
  metadata: CredentialMetadata;
  createdAt: Date;
  expiresAt?: Date;
  lastRotated?: Date;
  rotationInterval?: number;
}

export enum CredentialType {
  APIKey = 'api_key',
  DatabasePassword = 'database_password',
  EncryptionKey = 'encryption_key',
  Certificate = 'certificate',
  Token = 'token',
  Secret = 'secret'
}

export interface CredentialMetadata {
  description: string;
  owner: string;
  environment: string;
  tags: string[];
  accessLevel: 'public' | 'internal' | 'confidential' | 'secret';
  lastAccessed?: Date;
  accessCount: number;
}

export interface AccessRequest {
  credentialId: string;
  requester: string;
  purpose: string;
  timestamp: Date;
  approved: boolean;
  approver?: string;
}

/**
 * Almacén seguro de credenciales con capacidades avanzadas
 */
export class SecureCredentialStore {
  private credentials: Map<string, Credential> = new Map();
  private encryptionKey: string;
  private accessLog: AccessRequest[] = [];
  private rotationScheduler: RotationScheduler;
  private accessController: AccessController;

  constructor() {
    this.encryptionKey = this.generateEncryptionKey();
    this.rotationScheduler = new RotationScheduler(this);
    this.accessController = new AccessController();
  }

  async initialize(): Promise<void> {
    console.log('🔐 Inicializando SecureCredentialStore');
    
    // Cargar credenciales existentes
    await this.loadCredentials();
    
    // Iniciar programador de rotación
    await this.rotationScheduler.start();
    
    // Configurar credenciales por defecto
    await this.setupDefaultCredentials();
    
    console.log('✅ SecureCredentialStore inicializado');
  }

  async storeCredential(credential: Omit<Credential, 'id' | 'createdAt'>): Promise<string> {
    const id = `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullCredential: Credential = {
      ...credential,
      id,
      createdAt: new Date(),
      value: await this.encrypt(credential.value)
    };

    this.credentials.set(id, fullCredential);
    
    console.log(`🔐 Credencial almacenada: ${credential.name} (${credential.type})`);
    return id;
  }

  async retrieveCredential(id: string, requester: string, purpose: string): Promise<string | null> {
    const credential = this.credentials.get(id);
    if (!credential) {
      console.warn(`⚠️  Credencial no encontrada: ${id}`);
      return null;
    }

    // Verificar acceso
    const accessGranted = await this.accessController.checkAccess(credential, requester);
    if (!accessGranted) {
      console.warn(`🚫 Acceso denegado a credencial ${id} para ${requester}`);
      this.logAccessRequest(id, requester, purpose, false);
      return null;
    }

    // Verificar expiración
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      console.warn(`⏰ Credencial expirada: ${id}`);
      return null;
    }

    // Actualizar metadatos de acceso
    credential.metadata.lastAccessed = new Date();
    credential.metadata.accessCount++;

    // Log de acceso exitoso
    this.logAccessRequest(id, requester, purpose, true);

    // Desencriptar y retornar
    return await this.decrypt(credential.value);
  }

  async rotateCredential(id: string): Promise<boolean> {
    const credential = this.credentials.get(id);
    if (!credential) return false;

    try {
      const newValue = await this.generateNewCredentialValue(credential.type);
      credential.value = await this.encrypt(newValue);
      credential.lastRotated = new Date();

      console.log(`🔄 Credencial rotada: ${credential.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Error rotando credencial ${id}:`, error);
      return false;
    }
  }

  async deleteCredential(id: string, requester: string): Promise<boolean> {
    const credential = this.credentials.get(id);
    if (!credential) return false;

    // Verificar permisos de eliminación
    const canDelete = await this.accessController.canDelete(credential, requester);
    if (!canDelete) {
      console.warn(`🚫 Eliminación denegada para credencial ${id}`);
      return false;
    }

    this.credentials.delete(id);
    console.log(`🗑️  Credencial eliminada: ${credential.name}`);
    return true;
  }

  async listCredentials(requester: string): Promise<Credential[]> {
    const accessibleCredentials: Credential[] = [];

    for (const credential of this.credentials.values()) {
      const hasAccess = await this.accessController.checkAccess(credential, requester);
      if (hasAccess) {
        // Retornar copia sin el valor encriptado
        const safeCopy = { ...credential };
        safeCopy.value = '[PROTECTED]';
        accessibleCredentials.push(safeCopy);
      }
    }

    return accessibleCredentials;
  }

  private async encrypt(value: string): Promise<string> {
    // Simulación de encriptación AES-256
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    
    // En una implementación real, usaríamos Web Crypto API
    const encrypted = btoa(String.fromCharCode(...data));
    return `enc:${encrypted}`;
  }

  private async decrypt(encryptedValue: string): Promise<string> {
    // Simulación de desencriptación
    if (!encryptedValue.startsWith('enc:')) {
      throw new Error('Formato de encriptación inválido');
    }

    const encrypted = encryptedValue.substring(4);
    const decoded = atob(encrypted);
    const decoder = new TextDecoder();
    const data = new Uint8Array(decoded.split('').map(char => char.charCodeAt(0)));
    
    return decoder.decode(data);
  }

  private generateEncryptionKey(): string {
    // Generar clave de encriptación de 256 bits
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async generateNewCredentialValue(type: CredentialType): Promise<string> {
    switch (type) {
      case CredentialType.APIKey:
        return `sk_${this.generateRandomString(32)}`;
      case CredentialType.DatabasePassword:
        return this.generateSecurePassword(16);
      case CredentialType.EncryptionKey:
        return this.generateEncryptionKey();
      case CredentialType.Token:
        return `tok_${this.generateRandomString(24)}`;
      case CredentialType.Secret:
        return this.generateRandomString(32);
      default:
        return this.generateRandomString(24);
    }
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateSecurePassword(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private logAccessRequest(credentialId: string, requester: string, purpose: string, approved: boolean): void {
    const request: AccessRequest = {
      credentialId,
      requester,
      purpose,
      timestamp: new Date(),
      approved,
      approver: approved ? 'system' : undefined
    };

    this.accessLog.push(request);
    
    // Mantener solo los últimos 1000 registros
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-1000);
    }
  }

  private async loadCredentials(): Promise<void> {
    // Simular carga desde almacenamiento seguro
    const stored = localStorage.getItem('saai-credentials');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        for (const credData of data) {
          this.credentials.set(credData.id, credData);
        }
      } catch (error) {
        console.warn('⚠️  Error cargando credenciales');
      }
    }
  }

  private async setupDefaultCredentials(): Promise<void> {
    // Configurar credenciales por defecto del sistema
    const defaultCredentials = [
      {
        name: 'SAAI System Key',
        type: CredentialType.EncryptionKey,
        value: this.generateEncryptionKey(),
        metadata: {
          description: 'Clave maestra del sistema SAAI',
          owner: 'system',
          environment: 'all',
          tags: ['system', 'master'],
          accessLevel: 'secret' as const,
          accessCount: 0
        },
        rotationInterval: 7 * 24 * 60 * 60 * 1000 // 7 días
      },
      {
        name: 'Cognitive Fabric Token',
        type: CredentialType.Token,
        value: `cf_${this.generateRandomString(32)}`,
        metadata: {
          description: 'Token de acceso al Cognitive Fabric',
          owner: 'system',
          environment: 'all',
          tags: ['fabric', 'communication'],
          accessLevel: 'internal' as const,
          accessCount: 0
        },
        rotationInterval: 24 * 60 * 60 * 1000 // 24 horas
      }
    ];

    for (const cred of defaultCredentials) {
      await this.storeCredential(cred);
    }
  }

  getAccessLog(): AccessRequest[] {
    return [...this.accessLog];
  }

  getCredentialStats() {
    const stats = {
      totalCredentials: this.credentials.size,
      byType: {} as Record<string, number>,
      byAccessLevel: {} as Record<string, number>,
      expiringCredentials: 0,
      totalAccesses: this.accessLog.length
    };

    for (const credential of this.credentials.values()) {
      // Por tipo
      stats.byType[credential.type] = (stats.byType[credential.type] || 0) + 1;
      
      // Por nivel de acceso
      stats.byAccessLevel[credential.metadata.accessLevel] = 
        (stats.byAccessLevel[credential.metadata.accessLevel] || 0) + 1;
      
      // Credenciales que expiran pronto
      if (credential.expiresAt && credential.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000) {
        stats.expiringCredentials++;
      }
    }

    return stats;
  }

  async shutdown(): Promise<void> {
    await this.rotationScheduler.stop();
    
    // Guardar credenciales
    const credentialsArray = Array.from(this.credentials.values());
    localStorage.setItem('saai-credentials', JSON.stringify(credentialsArray));
    
    console.log('✅ SecureCredentialStore cerrado');
  }
}

/**
 * Programador de rotación automática
 */
class RotationScheduler {
  private store: SecureCredentialStore;
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(store: SecureCredentialStore) {
    this.store = store;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkRotations();
    }, 60000); // Verificar cada minuto

    console.log('🔄 Programador de rotación iniciado');
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('🛑 Programador de rotación detenido');
  }

  private async checkRotations(): Promise<void> {
    // Esta función sería implementada para verificar credenciales que necesitan rotación
    console.log('🔍 Verificando credenciales para rotación...');
  }
}

/**
 * Controlador de acceso
 */
class AccessController {
  async checkAccess(credential: Credential, requester: string): Promise<boolean> {
    // Lógica de control de acceso simplificada
    if (requester === 'system') return true;
    if (credential.metadata.owner === requester) return true;
    if (credential.metadata.accessLevel === 'public') return true;
    
    // En una implementación real, verificaríamos roles y permisos
    return false;
  }

  async canDelete(credential: Credential, requester: string): Promise<boolean> {
    // Solo el propietario o administradores pueden eliminar
    return credential.metadata.owner === requester || requester === 'admin';
  }
}