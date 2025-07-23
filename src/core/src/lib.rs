//! SAAI Core - Biblioteca principal de nano-núcleos cuánticos
//! 
//! Proporciona los componentes fundamentales del ecosistema SAAI:
//! nano-núcleos, consenso, comunicación, métricas y seguridad.

pub mod nano_cores;
pub mod consensus;
pub mod communication;
pub mod metrics;
pub mod config;
pub mod security;

// Re-exportar tipos principales para facilitar el uso
pub use nano_cores::{
    NanoCore, NanoCoreManager, NanoCoreType, NanoCoreState, 
    NanoCoreHealth, SystemHealth
};

pub use consensus::{
    ConsensusManager, ConsensusConfig, ConsensusProposal, 
    Vote, VoteDecision, ConsensusResult
};

pub use communication::{
    CognitiveFabric, CognitiveFabricClient, CognitiveEvent, 
    EventType, EventPriority
};

pub use metrics::{
    MetricsCollector, MetricsConfig, SystemResources
};

pub use config::{
    CoreConfig, ConfigManager, NanoCoresConfig
};

pub use security::{
    SecurityManager, SecurityConfig, SecurityContext, 
    SecurityLevel, SecurityEvent, SecurityEventType, SecuritySeverity
};

/// Versión de SAAI Core
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Información de build
pub const BUILD_INFO: &str = concat!(
    "SAAI Core v", env!("CARGO_PKG_VERSION"),
    " (", env!("CARGO_PKG_NAME"), ")"
);

/// Inicializar logging para SAAI Core
pub fn init_logging(level: &str) -> anyhow::Result<()> {
    use tracing_subscriber::{fmt, EnvFilter};
    
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(level));
    
    fmt()
        .with_env_filter(filter)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();
    
    Ok(())
}

/// Verificar compatibilidad del sistema
pub fn check_system_compatibility() -> anyhow::Result<()> {
    use std::env;
    
    // Verificar arquitectura soportada
    let arch = env::consts::ARCH;
    match arch {
        "x86_64" | "aarch64" => {},
        _ => return Err(anyhow::anyhow!("Arquitectura no soportada: {}", arch)),
    }
    
    // Verificar sistema operativo
    let os = env::consts::OS;
    match os {
        "linux" | "windows" | "macos" => {},
        _ => return Err(anyhow::anyhow!("Sistema operativo no soportado: {}", os)),
    }
    
    // Verificar número de CPUs
    let cpu_count = num_cpus::get();
    if cpu_count < 2 {
        return Err(anyhow::anyhow!("Se requieren al menos 2 CPUs, encontradas: {}", cpu_count));
    }
    
    tracing::info!("✅ Sistema compatible: {} {} con {} CPUs", os, arch, cpu_count);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_version_info() {
        assert!(!VERSION.is_empty());
        assert!(BUILD_INFO.contains("SAAI Core"));
    }
    
    #[test]
    fn test_system_compatibility() {
        // Esta prueba debería pasar en sistemas soportados
        assert!(check_system_compatibility().is_ok());
    }
}