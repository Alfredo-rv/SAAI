//! SAAI Core - Nano-Núcleos Cuánticos
//! 
//! Sistema de núcleos atómicos ultra-eficientes que forman la base
//! del ecosistema SAAI. Cada nano-núcleo cumple una función específica
//! con garantías de seguridad y rendimiento.

use anyhow::Result;
use clap::Parser;
use std::sync::Arc;
use tokio::signal;
use tracing::{info, error};

mod nano_cores;
mod consensus;
mod communication;
mod config;
mod metrics;
mod security;

use nano_cores::{NanoCoreManager, NanoCoreType};
use consensus::ConsensusManager;
use communication::CognitiveFabric;
use config::CoreConfig;
use metrics::MetricsCollector;
use security::SecurityManager;

#[derive(Parser)]
#[command(name = "saai-core")]
#[command(about = "SAAI Core - Nano-Núcleos Cuánticos")]
struct Args {
    /// Archivo de configuración
    #[arg(short, long, default_value = "config/core.toml")]
    config: String,
    
    /// Nivel de logging
    #[arg(short, long, default_value = "info")]
    log_level: String,
    
    /// Puerto para métricas
    #[arg(short, long, default_value = "9090")]
    metrics_port: u16,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    
    // Inicializar logging
    tracing_subscriber::fmt()
        .with_env_filter(&args.log_level)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    info!("🚀 Iniciando SAAI Core - Nano-Núcleos Cuánticos");

    // Cargar configuración
    let mut config = CoreConfig::load(&args.config).await?;
    
    // Optimizar configuración para el hardware actual
    config.optimize_for_hardware()?;
    info!("📋 Configuración cargada desde: {}", args.config);

    // Inicializar colector de métricas
    let metrics = Arc::new(MetricsCollector::new(args.metrics_port).await?);
    info!("📊 Colector de métricas iniciado en puerto: {}", args.metrics_port);

    // Inicializar gestor de seguridad
    let security_manager = Arc::new(
        SecurityManager::new(config.security.clone()).await?
    );
    info!("🔐 Gestor de seguridad inicializado");

    // Inicializar Cognitive Fabric (Bus de eventos)
    let cognitive_fabric = Arc::new(
        CognitiveFabric::new(&config.nats_url).await?
    );
    info!("🧠 Cognitive Fabric conectado a: {}", config.nats_url);

    // Inicializar ConsensusManager
    let consensus_manager = Arc::new(
        ConsensusManager::new(
            config.consensus.clone(),
            cognitive_fabric.clone(),
            metrics.clone()
        ).await?
    );
    info!("🗳️  ConsensusManager inicializado con {} réplicas", config.consensus.replica_count);

    // Inicializar NanoCoreManager
    let nano_core_manager = Arc::new(
        NanoCoreManager::new(
            config.clone(),
            cognitive_fabric.clone(),
            consensus_manager.clone(),
            metrics.clone()
            security_manager.clone(),
        ).await?
    );

    // Inicializar todos los nano-núcleos con redundancia empresarial
    info!("⚡ Iniciando nano-núcleos...");
    nano_core_manager.initialize_all_cores().await?;

    // Iniciar monitoreo de salud
    let health_monitor = tokio::spawn({
        let manager = nano_core_manager.clone();
        let metrics = metrics.clone();
        async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                
                let health = manager.get_health_status().await;
                metrics.record_health_status(&health).await;
                
                if !health.is_healthy() {
                    error!("⚠️  Sistema no saludable: {:?}", health);
                }
            }
        }
    });

    info!("🎯 SAAI Core completamente operacional");
    info!("📡 Esperando señales del sistema...");

    // Esperar señal de terminación
    match signal::ctrl_c().await {
        Ok(()) => {
            info!("🛑 Señal de terminación recibida");
        }
        Err(err) => {
            error!("❌ Error esperando señal: {}", err);
        }
    }

    // Shutdown graceful
    info!("🔄 Iniciando shutdown graceful...");
    
    health_monitor.abort();
    nano_core_manager.shutdown().await?;
    consensus_manager.shutdown().await?;
    security_manager.shutdown().await?;
    cognitive_fabric.shutdown().await?;
    metrics.shutdown().await?;

    info!("✅ SAAI Core terminado correctamente");
    Ok(())
}