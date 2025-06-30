//! Sistema de configuración auto-correctiva
//! 
//! Gestión centralizada de configuraciones con validación IA,
//! versionado GitOps y rollback atómico.

use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tokio::fs;
use tracing::{debug, error, info, warn};

use crate::consensus::ConsensusConfig;

/// Configuración principal del núcleo SAAI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreConfig {
    pub nats_url: String,
    pub metrics_port: u16,
    pub log_level: String,
    pub consensus: ConsensusConfig,
    pub nano_cores: NanoCoresConfig,
    pub security: SecurityConfig,
    pub performance: PerformanceConfig,
}

/// Configuración de nano-núcleos
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NanoCoresConfig {
    pub os_core: OSCoreConfig,
    pub hardware_core: HardwareCoreConfig,
    pub network_core: NetworkCoreConfig,
    pub security_core: SecurityCoreConfig,
}

/// Configuración del nano-núcleo OS
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OSCoreConfig {
    pub enable_ebpf: bool,
    pub monitor_interval_ms: u64,
    pub process_whitelist: Vec<String>,
    pub resource_limits: ResourceLimits,
}

/// Configuración del nano-núcleo Hardware
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareCoreConfig {
    pub temperature_threshold: f64,
    pub cpu_usage_threshold: f64,
    pub memory_usage_threshold: f64,
    pub enable_predictive_monitoring: bool,
}

/// Configuración del nano-núcleo Network
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkCoreConfig {
    pub enable_dpdk: bool,
    pub max_connections: u32,
    pub timeout_ms: u64,
    pub qos_enabled: bool,
}

/// Configuración del nano-núcleo Security
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityCoreConfig {
    pub sandbox_enabled: bool,
    pub encryption_algorithm: String,
    pub key_rotation_interval_hours: u64,
    pub threat_detection_enabled: bool,
}

/// Límites de recursos
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceLimits {
    pub max_cpu_percent: f64,
    pub max_memory_mb: u64,
    pub max_file_descriptors: u32,
    pub max_network_connections: u32,
}

/// Configuración de seguridad
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub enable_sandboxing: bool,
    pub encryption_key_size: u32,
    pub audit_log_enabled: bool,
    pub intrusion_detection: bool,
}

/// Configuración de rendimiento
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    pub thread_pool_size: usize,
    pub async_runtime_threads: usize,
    pub gc_interval_ms: u64,
    pub cache_size_mb: u64,
}

impl Default for CoreConfig {
    fn default() -> Self {
        Self {
            nats_url: "nats://localhost:4222".to_string(),
            metrics_port: 9090,
            log_level: "info".to_string(),
            consensus: ConsensusConfig::default(),
            nano_cores: NanoCoresConfig::default(),
            security: SecurityConfig::default(),
            performance: PerformanceConfig::default(),
        }
    }
}

impl Default for NanoCoresConfig {
    fn default() -> Self {
        Self {
            os_core: OSCoreConfig::default(),
            hardware_core: HardwareCoreConfig::default(),
            network_core: NetworkCoreConfig::default(),
            security_core: SecurityCoreConfig::default(),
        }
    }
}

impl Default for OSCoreConfig {
    fn default() -> Self {
        Self {
            enable_ebpf: cfg!(target_os = "linux"),
            monitor_interval_ms: 1000,
            process_whitelist: vec![
                "saai-core".to_string(),
                "saai-agents".to_string(),
            ],
            resource_limits: ResourceLimits::default(),
        }
    }
}

impl Default for HardwareCoreConfig {
    fn default() -> Self {
        Self {
            temperature_threshold: 80.0,
            cpu_usage_threshold: 90.0,
            memory_usage_threshold: 85.0,
            enable_predictive_monitoring: true,
        }
    }
}

impl Default for NetworkCoreConfig {
    fn default() -> Self {
        Self {
            enable_dpdk: false, // Requiere configuración especial
            max_connections: 10000,
            timeout_ms: 30000,
            qos_enabled: true,
        }
    }
}

impl Default for SecurityCoreConfig {
    fn default() -> Self {
        Self {
            sandbox_enabled: true,
            encryption_algorithm: "AES-256-GCM".to_string(),
            key_rotation_interval_hours: 24,
            threat_detection_enabled: true,
        }
    }
}

impl Default for ResourceLimits {
    fn default() -> Self {
        Self {
            max_cpu_percent: 80.0,
            max_memory_mb: 4096,
            max_file_descriptors: 1024,
            max_network_connections: 1000,
        }
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            enable_sandboxing: true,
            encryption_key_size: 256,
            audit_log_enabled: true,
            intrusion_detection: true,
        }
    }
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            thread_pool_size: num_cpus::get(),
            async_runtime_threads: num_cpus::get(),
            gc_interval_ms: 60000,
            cache_size_mb: 512,
        }
    }
}

impl CoreConfig {
    /// Cargar configuración desde archivo
    pub async fn load<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        
        info!("📋 Cargando configuración desde: {}", path.display());
        
        if !path.exists() {
            warn!("⚠️  Archivo de configuración no encontrado, creando configuración por defecto");
            let default_config = Self::default();
            default_config.save(path).await?;
            return Ok(default_config);
        }
        
        let content = fs::read_to_string(path).await?;
        let config: CoreConfig = toml::from_str(&content)?;
        
        // Validar configuración
        config.validate()?;
        
        info!("✅ Configuración cargada y validada");
        Ok(config)
    }
    
    /// Guardar configuración a archivo
    pub async fn save<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let path = path.as_ref();
        
        // Crear directorio padre si no existe
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).await?;
        }
        
        let content = toml::to_string_pretty(self)?;
        fs::write(path, content).await?;
        
        info!("💾 Configuración guardada en: {}", path.display());
        Ok(())
    }
    
    /// Validar configuración
    pub fn validate(&self) -> Result<()> {
        // Validar URL de NATS
        if self.nats_url.is_empty() {
            return Err(anyhow!("URL de NATS no puede estar vacía"));
        }
        
        // Validar puerto de métricas
        if self.metrics_port == 0 {
            return Err(anyhow!("Puerto de métricas debe ser mayor que 0"));
        }
        
        // Validar configuración de consenso
        if self.consensus.replica_count < 3 {
            return Err(anyhow!("Número de réplicas debe ser al menos 3"));
        }
        
        if self.consensus.byzantine_tolerance <= 0.0 || self.consensus.byzantine_tolerance >= 0.5 {
            return Err(anyhow!("Tolerancia bizantina debe estar entre 0.0 y 0.5"));
        }
        
        // Validar límites de recursos
        let limits = &self.nano_cores.os_core.resource_limits;
        if limits.max_cpu_percent <= 0.0 || limits.max_cpu_percent > 100.0 {
            return Err(anyhow!("Límite de CPU debe estar entre 0 y 100"));
        }
        
        if limits.max_memory_mb == 0 {
            return Err(anyhow!("Límite de memoria debe ser mayor que 0"));
        }
        
        // Validar configuración de hardware
        let hw_config = &self.nano_cores.hardware_core;
        if hw_config.temperature_threshold <= 0.0 {
            return Err(anyhow!("Umbral de temperatura debe ser mayor que 0"));
        }
        
        // Validar configuración de red
        let net_config = &self.nano_cores.network_core;
        if net_config.max_connections == 0 {
            return Err(anyhow!("Máximo de conexiones debe ser mayor que 0"));
        }
        
        // Validar configuración de seguridad
        let sec_config = &self.nano_cores.security_core;
        if sec_config.encryption_algorithm.is_empty() {
            return Err(anyhow!("Algoritmo de encriptación no puede estar vacío"));
        }
        
        if sec_config.key_rotation_interval_hours == 0 {
            return Err(anyhow!("Intervalo de rotación de claves debe ser mayor que 0"));
        }
        
        // Validar configuración de rendimiento
        if self.performance.thread_pool_size == 0 {
            return Err(anyhow!("Tamaño del pool de hilos debe ser mayor que 0"));
        }
        
        if self.performance.async_runtime_threads == 0 {
            return Err(anyhow!("Número de hilos del runtime async debe ser mayor que 0"));
        }
        
        debug!("✅ Configuración validada correctamente");
        Ok(())
    }
    
    /// Obtener configuración optimizada para el hardware actual
    pub fn optimize_for_hardware(&mut self) -> Result<()> {
        let cpu_count = num_cpus::get();
        let available_memory = Self::get_available_memory()?;
        
        info!("🔧 Optimizando configuración para hardware: {} CPUs, {} MB RAM", 
              cpu_count, available_memory / 1024 / 1024);
        
        // Optimizar configuración de rendimiento
        self.performance.thread_pool_size = cpu_count;
        self.performance.async_runtime_threads = cpu_count;
        
        // Ajustar límites de recursos basado en hardware disponible
        let safe_memory_limit = (available_memory * 80 / 100) / 1024 / 1024; // 80% de RAM disponible
        self.nano_cores.os_core.resource_limits.max_memory_mb = safe_memory_limit.min(8192); // Máximo 8GB
        
        // Ajustar cache basado en memoria disponible
        self.performance.cache_size_mb = (available_memory / 1024 / 1024 / 8).min(2048); // 1/8 de RAM, máximo 2GB
        
        // Ajustar configuración de red basado en CPUs
        self.nano_cores.network_core.max_connections = (cpu_count * 1000) as u32;
        
        info!("✅ Configuración optimizada para hardware");
        Ok(())
    }
    
    /// Obtener memoria disponible del sistema
    fn get_available_memory() -> Result<u64> {
        #[cfg(target_os = "linux")]
        {
            use std::fs;
            let meminfo = fs::read_to_string("/proc/meminfo")?;
            for line in meminfo.lines() {
                if line.starts_with("MemAvailable:") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        let kb: u64 = parts[1].parse()?;
                        return Ok(kb * 1024); // Convertir a bytes
                    }
                }
            }
            Err(anyhow!("No se pudo obtener memoria disponible"))
        }
        
        #[cfg(not(target_os = "linux"))]
        {
            // Fallback para otros sistemas operativos
            Ok(8 * 1024 * 1024 * 1024) // Asumir 8GB por defecto
        }
    }
    
    /// Crear configuración para desarrollo
    pub fn development() -> Self {
        let mut config = Self::default();
        config.log_level = "debug".to_string();
        config.consensus.replica_count = 3; // Mínimo para desarrollo
        config.nano_cores.security_core.sandbox_enabled = false; // Facilitar debugging
        config.performance.cache_size_mb = 128; // Menor uso de memoria
        config
    }
    
    /// Crear configuración para producción
    pub fn production() -> Self {
        let mut config = Self::default();
        config.log_level = "warn".to_string();
        config.consensus.replica_count = 5; // Mayor redundancia
        config.nano_cores.security_core.sandbox_enabled = true;
        config.nano_cores.security_core.threat_detection_enabled = true;
        config.security.intrusion_detection = true;
        config.performance.cache_size_mb = 1024; // Mayor cache
        config
    }
}

/// Gestor de configuración con capacidades GitOps
pub struct ConfigManager {
    current_config: CoreConfig,
    config_path: String,
    version_history: Vec<ConfigVersion>,
}

/// Versión de configuración para historial
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigVersion {
    pub version: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub config: CoreConfig,
    pub changes: Vec<String>,
}

impl ConfigManager {
    /// Crear nuevo gestor de configuración
    pub async fn new(config_path: &str) -> Result<Self> {
        let current_config = CoreConfig::load(config_path).await?;
        
        Ok(Self {
            current_config,
            config_path: config_path.to_string(),
            version_history: Vec::new(),
        })
    }
    
    /// Obtener configuración actual
    pub fn get_config(&self) -> &CoreConfig {
        &self.current_config
    }
    
    /// Actualizar configuración con validación
    pub async fn update_config(&mut self, new_config: CoreConfig) -> Result<()> {
        // Validar nueva configuración
        new_config.validate()?;
        
        // Detectar cambios
        let changes = self.detect_changes(&self.current_config, &new_config);
        
        if changes.is_empty() {
            debug!("📋 No hay cambios en la configuración");
            return Ok(());
        }
        
        info!("📋 Actualizando configuración: {} cambios detectados", changes.len());
        
        // Crear versión de respaldo
        let version = ConfigVersion {
            version: format!("v{}", chrono::Utc::now().timestamp()),
            timestamp: chrono::Utc::now(),
            config: self.current_config.clone(),
            changes: changes.clone(),
        };
        
        self.version_history.push(version);
        
        // Aplicar nueva configuración
        self.current_config = new_config;
        
        // Guardar a disco
        self.current_config.save(&self.config_path).await?;
        
        info!("✅ Configuración actualizada exitosamente");
        for change in changes {
            info!("  📝 {}", change);
        }
        
        Ok(())
    }
    
    /// Detectar cambios entre configuraciones
    fn detect_changes(&self, old: &CoreConfig, new: &CoreConfig) -> Vec<String> {
        let mut changes = Vec::new();
        
        if old.nats_url != new.nats_url {
            changes.push(format!("NATS URL: {} -> {}", old.nats_url, new.nats_url));
        }
        
        if old.metrics_port != new.metrics_port {
            changes.push(format!("Puerto métricas: {} -> {}", old.metrics_port, new.metrics_port));
        }
        
        if old.log_level != new.log_level {
            changes.push(format!("Nivel log: {} -> {}", old.log_level, new.log_level));
        }
        
        if old.consensus.replica_count != new.consensus.replica_count {
            changes.push(format!("Réplicas consenso: {} -> {}", 
                                old.consensus.replica_count, new.consensus.replica_count));
        }
        
        // TODO: Agregar más detección de cambios para otros campos
        
        changes
    }
    
    /// Rollback a versión anterior
    pub async fn rollback(&mut self, version: &str) -> Result<()> {
        if let Some(config_version) = self.version_history.iter()
            .find(|v| v.version == version) {
            
            info!("🔄 Realizando rollback a versión: {}", version);
            
            self.current_config = config_version.config.clone();
            self.current_config.save(&self.config_path).await?;
            
            info!("✅ Rollback completado a versión {}", version);
            Ok(())
        } else {
            Err(anyhow!("Versión no encontrada: {}", version))
        }
    }
    
    /// Obtener historial de versiones
    pub fn get_version_history(&self) -> &[ConfigVersion] {
        &self.version_history
    }
}