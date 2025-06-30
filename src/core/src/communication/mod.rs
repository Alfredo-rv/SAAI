//! Cognitive Fabric - Bus de eventos cuántico
//! 
//! Sistema de comunicación ultra-baja latencia que conecta todos los
//! componentes del ecosistema SAAI con garantías de entrega y coherencia.

use anyhow::Result;
use async_trait::async_trait;
use nats::asynk::{Connection, Subscription};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// Tipos de eventos en el Cognitive Fabric
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType {
    SystemMetrics,
    AgentCommand,
    ConsensusVote,
    MutationRequest,
    HealthCheck,
    SecurityAlert,
    UserInteraction,
    Custom(String),
}

/// Estructura de evento en el Cognitive Fabric
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveEvent {
    pub id: Uuid,
    pub event_type: EventType,
    pub source: String,
    pub target: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub payload: Vec<u8>,
    pub priority: EventPriority,
    pub correlation_id: Option<Uuid>,
}

/// Prioridad de eventos para QoS
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum EventPriority {
    Critical = 0,
    High = 1,
    Normal = 2,
    Low = 3,
}

/// Trait para manejadores de eventos
#[async_trait]
pub trait EventHandler: Send + Sync {
    async fn handle_event(&self, event: &CognitiveEvent) -> Result<()>;
}

/// Cliente del Cognitive Fabric
pub struct CognitiveFabricClient {
    connection: Arc<RwLock<Option<Connection>>>,
    subscriptions: Arc<RwLock<HashMap<String, Subscription>>>,
    handlers: Arc<RwLock<HashMap<String, Box<dyn EventHandler>>>>,
    client_id: String,
    nats_url: String,
}

impl CognitiveFabricClient {
    /// Crear nuevo cliente del Cognitive Fabric
    pub fn new(nats_url: &str) -> Self {
        Self {
            connection: Arc::new(RwLock::new(None)),
            subscriptions: Arc::new(RwLock::new(HashMap::new())),
            handlers: Arc::new(RwLock::new(HashMap::new())),
            client_id: format!("saai-{}", Uuid::new_v4()),
            nats_url: nats_url.to_string(),
        }
    }

    /// Conectar al bus de eventos
    pub async fn connect(&self) -> Result<()> {
        info!("🧠 Conectando al Cognitive Fabric: {}", self.nats_url);
        
        let connection = nats::asynk::connect(&self.nats_url).await?;
        
        *self.connection.write().await = Some(connection);
        
        info!("✅ Conectado al Cognitive Fabric con ID: {}", self.client_id);
        Ok(())
    }

    /// Publicar evento en el fabric
    pub async fn publish(&self, subject: &str, data: &[u8]) -> Result<()> {
        let connection_guard = self.connection.read().await;
        
        if let Some(connection) = connection_guard.as_ref() {
            connection.publish(subject, data).await?;
            debug!("📤 Evento publicado en {}: {} bytes", subject, data.len());
            Ok(())
        } else {
            Err(anyhow::anyhow!("No hay conexión al Cognitive Fabric"))
        }
    }

    /// Publicar evento estructurado
    pub async fn publish_event(&self, event: &CognitiveEvent) -> Result<()> {
        let subject = self.get_subject_for_event(&event.event_type);
        let data = serde_json::to_vec(event)?;
        
        self.publish(&subject, &data).await?;
        
        debug!(
            "📤 Evento {} publicado: {} -> {}",
            event.id,
            event.source,
            subject
        );
        
        Ok(())
    }

    /// Suscribirse a un tema
    pub async fn subscribe<F>(&self, subject: &str, handler: F) -> Result<()>
    where
        F: Fn(&[u8]) + Send + Sync + 'static,
    {
        let connection_guard = self.connection.read().await;
        
        if let Some(connection) = connection_guard.as_ref() {
            let subscription = connection.subscribe(subject).await?;
            
            // Procesar mensajes en background
            let handler = Arc::new(handler);
            tokio::spawn({
                let handler = handler.clone();
                let subject = subject.to_string();
                async move {
                    while let Some(message) = subscription.next().await {
                        handler(&message.data);
                    }
                    warn!("🔌 Suscripción a {} terminada", subject);
                }
            });
            
            // Guardar suscripción
            self.subscriptions.write().await.insert(
                subject.to_string(),
                subscription,
            );
            
            info!("📥 Suscrito a: {}", subject);
            Ok(())
        } else {
            Err(anyhow::anyhow!("No hay conexión al Cognitive Fabric"))
        }
    }

    /// Desuscribirse de un tema
    pub async fn unsubscribe(&self, subject: &str) -> Result<()> {
        let mut subscriptions = self.subscriptions.write().await;
        
        if let Some(subscription) = subscriptions.remove(subject) {
            subscription.unsubscribe().await?;
            info!("📤 Desuscrito de: {}", subject);
        }
        
        Ok(())
    }

    /// Shutdown del cliente
    pub async fn shutdown(&self) -> Result<()> {
        info!("🛑 Cerrando conexión al Cognitive Fabric");
        
        // Cerrar todas las suscripciones
        let mut subscriptions = self.subscriptions.write().await;
        for (subject, subscription) in subscriptions.drain() {
            if let Err(e) = subscription.unsubscribe().await {
                error!("❌ Error cerrando suscripción {}: {}", subject, e);
            }
        }
        
        // Cerrar conexión
        let mut connection_guard = self.connection.write().await;
        if let Some(connection) = connection_guard.take() {
            connection.close().await;
        }
        
        info!("✅ Cognitive Fabric desconectado");
        Ok(())
    }

    /// Obtener el tema NATS para un tipo de evento
    fn get_subject_for_event(&self, event_type: &EventType) -> String {
        match event_type {
            EventType::SystemMetrics => "saai.metrics".to_string(),
            EventType::AgentCommand => "saai.agents.commands".to_string(),
            EventType::ConsensusVote => "saai.consensus.votes".to_string(),
            EventType::MutationRequest => "saai.meca.mutations".to_string(),
            EventType::HealthCheck => "saai.health".to_string(),
            EventType::SecurityAlert => "saai.security.alerts".to_string(),
            EventType::UserInteraction => "saai.ui.interactions".to_string(),
            EventType::Custom(name) => format!("saai.custom.{}", name),
        }
    }
}

/// Cognitive Fabric principal del sistema
pub struct CognitiveFabric {
    client: CognitiveFabricClient,
    event_stats: Arc<RwLock<EventStatistics>>,
}

/// Estadísticas de eventos
#[derive(Debug, Default)]
pub struct EventStatistics {
    pub total_events: u64,
    pub events_by_type: HashMap<String, u64>,
    pub average_latency_ms: f64,
    pub error_count: u64,
}

impl CognitiveFabric {
    /// Crear nueva instancia del Cognitive Fabric
    pub async fn new(nats_url: &str) -> Result<Self> {
        let client = CognitiveFabricClient::new(nats_url);
        
        Ok(Self {
            client,
            event_stats: Arc::new(RwLock::new(EventStatistics::default())),
        })
    }

    /// Conectar al fabric
    pub async fn connect(&self) -> Result<()> {
        self.client.connect().await
    }

    /// Publicar evento con estadísticas
    pub async fn publish_event(&self, event: CognitiveEvent) -> Result<()> {
        let start_time = std::time::Instant::now();
        
        match self.client.publish_event(&event).await {
            Ok(()) => {
                let latency = start_time.elapsed().as_millis() as f64;
                self.update_stats(&event, latency, false).await;
                Ok(())
            }
            Err(e) => {
                self.update_stats(&event, 0.0, true).await;
                Err(e)
            }
        }
    }

    /// Suscribirse con manejo de errores
    pub async fn subscribe<F>(&self, subject: &str, handler: F) -> Result<()>
    where
        F: Fn(&[u8]) + Send + Sync + 'static,
    {
        self.client.subscribe(subject, handler).await
    }

    /// Obtener estadísticas del fabric
    pub async fn get_statistics(&self) -> EventStatistics {
        self.event_stats.read().await.clone()
    }

    /// Shutdown del fabric
    pub async fn shutdown(&self) -> Result<()> {
        self.client.shutdown().await
    }

    /// Actualizar estadísticas de eventos
    async fn update_stats(&self, event: &CognitiveEvent, latency: f64, is_error: bool) {
        let mut stats = self.event_stats.write().await;
        
        stats.total_events += 1;
        
        let event_type_key = format!("{:?}", event.event_type);
        *stats.events_by_type.entry(event_type_key).or_insert(0) += 1;
        
        if is_error {
            stats.error_count += 1;
        } else {
            // Actualizar latencia promedio (media móvil simple)
            stats.average_latency_ms = 
                (stats.average_latency_ms * (stats.total_events - 1) as f64 + latency) 
                / stats.total_events as f64;
        }
    }
}

impl Clone for EventStatistics {
    fn clone(&self) -> Self {
        Self {
            total_events: self.total_events,
            events_by_type: self.events_by_type.clone(),
            average_latency_ms: self.average_latency_ms,
            error_count: self.error_count,
        }
    }
}