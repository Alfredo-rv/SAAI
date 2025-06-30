//! Sistema de métricas y observabilidad
//! 
//! Colección, agregación y exposición de métricas del ecosistema SAAI
//! para monitoreo en tiempo real y análisis predictivo.

use anyhow::Result;
use prometheus::{
    Counter, Gauge, Histogram, IntCounter, IntGauge, Registry, 
    Encoder, TextEncoder, HistogramOpts, Opts
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::{debug, error, info};
use warp::{Filter, Reply};

use crate::nano_cores::{NanoCoreType, SystemHealth};

/// Configuración del colector de métricas
#[derive(Debug, Clone)]
pub struct MetricsConfig {
    pub port: u16,
    pub collection_interval_ms: u64,
    pub retention_hours: u64,
    pub enable_detailed_metrics: bool,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            port: 9090,
            collection_interval_ms: 1000,
            retention_hours: 24,
            enable_detailed_metrics: true,
        }
    }
}

/// Métricas de recursos del sistema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemResources {
    pub cpu_count: usize,
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    pub available_memory: u64,
    pub total_swap: u64,
    pub used_swap: u64,
    pub load_average: [f64; 3],
}

/// Colector principal de métricas
pub struct MetricsCollector {
    config: MetricsConfig,
    registry: Registry,
    
    // Métricas de sistema
    system_cpu_usage: Gauge,
    system_memory_usage: Gauge,
    system_load_average: Gauge,
    
    // Métricas de nano-núcleos
    nano_core_executions: IntCounter,
    nano_core_errors: IntCounter,
    nano_core_latency: Histogram,
    
    // Métricas de consenso
    consensus_proposals: IntCounter,
    consensus_votes: IntCounter,
    consensus_decisions: IntCounter,
    
    // Métricas de Cognitive Fabric
    fabric_events_total: IntCounter,
    fabric_events_by_type: Arc<RwLock<HashMap<String, IntCounter>>>,
    fabric_latency: Histogram,
    
    // Métricas de agentes
    agent_tasks: IntCounter,
    agent_successes: IntCounter,
    agent_failures: IntCounter,
    
    // Estado del sistema
    system_health_score: Gauge,
    uptime_seconds: IntGauge,
    
    // Servidor HTTP para exposición
    server_handle: Arc<RwLock<Option<tokio::task::JoinHandle<()>>>>,
}

impl MetricsCollector {
    /// Crear nuevo colector de métricas
    pub async fn new(port: u16) -> Result<Self> {
        let config = MetricsConfig {
            port,
            ..Default::default()
        };
        
        let registry = Registry::new();
        
        // Inicializar métricas de sistema
        let system_cpu_usage = Gauge::with_opts(Opts::new(
            "saai_system_cpu_usage_percent",
            "Uso de CPU del sistema"
        ))?;
        registry.register(Box::new(system_cpu_usage.clone()))?;
        
        let system_memory_usage = Gauge::with_opts(Opts::new(
            "saai_system_memory_usage_bytes",
            "Uso de memoria del sistema"
        ))?;
        registry.register(Box::new(system_memory_usage.clone()))?;
        
        let system_load_average = Gauge::with_opts(Opts::new(
            "saai_system_load_average",
            "Promedio de carga del sistema"
        ))?;
        registry.register(Box::new(system_load_average.clone()))?;
        
        // Métricas de nano-núcleos
        let nano_core_executions = IntCounter::with_opts(Opts::new(
            "saai_nano_core_executions_total",
            "Total de ejecuciones de nano-núcleos"
        ))?;
        registry.register(Box::new(nano_core_executions.clone()))?;
        
        let nano_core_errors = IntCounter::with_opts(Opts::new(
            "saai_nano_core_errors_total",
            "Total de errores en nano-núcleos"
        ))?;
        registry.register(Box::new(nano_core_errors.clone()))?;
        
        let nano_core_latency = Histogram::with_opts(HistogramOpts::new(
            "saai_nano_core_latency_seconds",
            "Latencia de ejecución de nano-núcleos"
        ))?;
        registry.register(Box::new(nano_core_latency.clone()))?;
        
        // Métricas de consenso
        let consensus_proposals = IntCounter::with_opts(Opts::new(
            "saai_consensus_proposals_total",
            "Total de propuestas de consenso"
        ))?;
        registry.register(Box::new(consensus_proposals.clone()))?;
        
        let consensus_votes = IntCounter::with_opts(Opts::new(
            "saai_consensus_votes_total",
            "Total de votos de consenso"
        ))?;
        registry.register(Box::new(consensus_votes.clone()))?;
        
        let consensus_decisions = IntCounter::with_opts(Opts::new(
            "saai_consensus_decisions_total",
            "Total de decisiones de consenso"
        ))?;
        registry.register(Box::new(consensus_decisions.clone()))?;
        
        // Métricas de Cognitive Fabric
        let fabric_events_total = IntCounter::with_opts(Opts::new(
            "saai_fabric_events_total",
            "Total de eventos en Cognitive Fabric"
        ))?;
        registry.register(Box::new(fabric_events_total.clone()))?;
        
        let fabric_latency = Histogram::with_opts(HistogramOpts::new(
            "saai_fabric_latency_seconds",
            "Latencia de eventos en Cognitive Fabric"
        ))?;
        registry.register(Box::new(fabric_latency.clone()))?;
        
        // Métricas de agentes
        let agent_tasks = IntCounter::with_opts(Opts::new(
            "saai_agent_tasks_total",
            "Total de tareas de agentes"
        ))?;
        registry.register(Box::new(agent_tasks.clone()))?;
        
        let agent_successes = IntCounter::with_opts(Opts::new(
            "saai_agent_successes_total",
            "Total de éxitos de agentes"
        ))?;
        registry.register(Box::new(agent_successes.clone()))?;
        
        let agent_failures = IntCounter::with_opts(Opts::new(
            "saai_agent_failures_total",
            "Total de fallos de agentes"
        ))?;
        registry.register(Box::new(agent_failures.clone()))?;
        
        // Estado del sistema
        let system_health_score = Gauge::with_opts(Opts::new(
            "saai_system_health_score",
            "Puntuación de salud del sistema (0-1)"
        ))?;
        registry.register(Box::new(system_health_score.clone()))?;
        
        let uptime_seconds = IntGauge::with_opts(Opts::new(
            "saai_uptime_seconds",
            "Tiempo de actividad del sistema en segundos"
        ))?;
        registry.register(Box::new(uptime_seconds.clone()))?;
        
        let collector = Self {
            config,
            registry,
            system_cpu_usage,
            system_memory_usage,
            system_load_average,
            nano_core_executions,
            nano_core_errors,
            nano_core_latency,
            consensus_proposals,
            consensus_votes,
            consensus_decisions,
            fabric_events_total,
            fabric_events_by_type: Arc::new(RwLock::new(HashMap::new())),
            fabric_latency,
            agent_tasks,
            agent_successes,
            agent_failures,
            system_health_score,
            uptime_seconds,
            server_handle: Arc::new(RwLock::new(None)),
        };
        
        Ok(collector)
    }

    /// Iniciar servidor de métricas
    pub async fn start(&self) -> Result<()> {
        let registry = self.registry.clone();
        let port = self.config.port;
        
        let metrics_route = warp::path("metrics")
            .and(warp::get())
            .map(move || {
                let encoder = TextEncoder::new();
                let metric_families = registry.gather();
                let mut buffer = Vec::new();
                
                if let Err(e) = encoder.encode(&metric_families, &mut buffer) {
                    error!("❌ Error codificando métricas: {}", e);
                    return warp::reply::with_status(
                        "Error interno del servidor",
                        warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                    ).into_response();
                }
                
                warp::reply::with_header(
                    buffer,
                    "content-type",
                    "text/plain; version=0.0.4; charset=utf-8",
                ).into_response()
            });
        
        let health_route = warp::path("health")
            .and(warp::get())
            .map(|| warp::reply::json(&serde_json::json!({
                "status": "healthy",
                "service": "saai-metrics"
            })));
        
        let routes = metrics_route.or(health_route);
        
        let server = warp::serve(routes)
            .run(([0, 0, 0, 0], port));
        
        let handle = tokio::spawn(server);
        *self.server_handle.write().await = Some(handle);
        
        info!("📊 Servidor de métricas iniciado en puerto {}", port);
        Ok(())
    }

    /// Registrar recursos del sistema
    pub async fn record_system_resources(&self, resources: &SystemResources) {
        self.system_cpu_usage.set(resources.cpu_usage as f64);
        self.system_memory_usage.set(resources.used_memory as f64);
        self.system_load_average.set(resources.load_average[0]);
        
        debug!("📊 Métricas de sistema actualizadas");
    }

    /// Registrar ejecución de nano-núcleo
    pub async fn record_core_execution(
        &self,
        core_type: NanoCoreType,
        instance: usize,
        success: bool,
    ) {
        self.nano_core_executions.inc();
        
        if !success {
            self.nano_core_errors.inc();
        }
        
        debug!(
            "📊 Ejecución de {:?} instancia {} registrada: {}",
            core_type, instance, if success { "éxito" } else { "error" }
        );
    }

    /// Registrar latencia de nano-núcleo
    pub async fn record_core_latency(&self, latency_seconds: f64) {
        self.nano_core_latency.observe(latency_seconds);
    }

    /// Registrar propuesta de consenso
    pub async fn record_consensus_proposal(&self) {
        self.consensus_proposals.inc();
    }

    /// Registrar voto de consenso
    pub async fn record_consensus_vote(&self) {
        self.consensus_votes.inc();
    }

    /// Registrar decisión de consenso
    pub async fn record_consensus_decision(&self) {
        self.consensus_decisions.inc();
    }

    /// Registrar evento de Cognitive Fabric
    pub async fn record_fabric_event(&self, event_type: &str, latency_seconds: f64) {
        self.fabric_events_total.inc();
        self.fabric_latency.observe(latency_seconds);
        
        // Registrar por tipo de evento
        let mut events_by_type = self.fabric_events_by_type.write().await;
        if let Some(counter) = events_by_type.get(event_type) {
            counter.inc();
        } else {
            // Crear nuevo contador para este tipo de evento
            if let Ok(counter) = IntCounter::with_opts(Opts::new(
                &format!("saai_fabric_events_{}_total", event_type.to_lowercase()),
                &format!("Total de eventos {} en Cognitive Fabric", event_type)
            )) {
                if self.registry.register(Box::new(counter.clone())).is_ok() {
                    counter.inc();
                    events_by_type.insert(event_type.to_string(), counter);
                }
            }
        }
    }

    /// Registrar tarea de agente
    pub async fn record_agent_task(&self, success: bool) {
        self.agent_tasks.inc();
        
        if success {
            self.agent_successes.inc();
        } else {
            self.agent_failures.inc();
        }
    }

    /// Registrar error de agente
    pub async fn record_agent_error(&self, agent_name: &str, error: &str) {
        self.agent_failures.inc();
        
        error!(
            "❌ Error en agente {}: {}",
            agent_name, error
        );
    }

    /// Registrar estado de salud del sistema
    pub async fn record_health_status(&self, health: &SystemHealth) {
        let health_score = if health.is_healthy() { 1.0 } else { 0.0 };
        self.system_health_score.set(health_score);
        
        debug!("📊 Estado de salud registrado: {:.2}", health_score);
    }

    /// Actualizar tiempo de actividad
    pub async fn update_uptime(&self, start_time: SystemTime) {
        if let Ok(duration) = SystemTime::now().duration_since(start_time) {
            self.uptime_seconds.set(duration.as_secs() as i64);
        }
    }

    /// Obtener métricas en formato Prometheus
    pub async fn get_metrics(&self) -> Result<String> {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = Vec::new();
        
        encoder.encode(&metric_families, &mut buffer)?;
        
        Ok(String::from_utf8(buffer)?)
    }

    /// Shutdown del colector
    pub async fn shutdown(&self) -> Result<()> {
        info!("🛑 Cerrando colector de métricas");
        
        if let Some(handle) = self.server_handle.write().await.take() {
            handle.abort();
        }
        
        info!("✅ Colector de métricas cerrado");
        Ok(())
    }
}