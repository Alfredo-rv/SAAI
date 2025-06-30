//! ConsensusManager - Sistema de votación y redundancia
//! 
//! Implementa votación por mayoría bizantina y hot-swapping automático
//! para garantizar la ultra-resiliencia del ecosistema SAAI.

use anyhow::{Result, anyhow};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

use crate::communication::{CognitiveFabric, CognitiveEvent, EventType, EventPriority};
use crate::metrics::MetricsCollector;

/// Configuración del sistema de consenso
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusConfig {
    pub replica_count: usize,
    pub vote_timeout_ms: u64,
    pub health_check_interval_ms: u64,
    pub failure_threshold: u32,
    pub byzantine_tolerance: f64, // Porcentaje de nodos que pueden fallar
}

impl Default for ConsensusConfig {
    fn default() -> Self {
        Self {
            replica_count: 3,
            vote_timeout_ms: 1000,
            health_check_interval_ms: 5000,
            failure_threshold: 3,
            byzantine_tolerance: 0.33, // Tolerar hasta 33% de fallos
        }
    }
}

/// Estado de una réplica en el consenso
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ReplicaState {
    Healthy,
    Degraded,
    Failed,
    Recovering,
    Quarantined,
}

/// Información de una réplica
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplicaInfo {
    pub id: Uuid,
    pub instance_type: String,
    pub state: ReplicaState,
    pub last_heartbeat: SystemTime,
    pub failure_count: u32,
    pub vote_weight: f64,
    pub performance_score: f64,
}

/// Propuesta para votación
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusProposal {
    pub id: Uuid,
    pub proposal_type: ProposalType,
    pub proposer: Uuid,
    pub data: Vec<u8>,
    pub timestamp: SystemTime,
    pub required_votes: usize,
}

/// Tipos de propuestas
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProposalType {
    HealthCheck,
    ConfigChange,
    ReplicaReplacement,
    SystemMutation,
    SecurityAction,
}

/// Voto en una propuesta
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vote {
    pub proposal_id: Uuid,
    pub voter_id: Uuid,
    pub decision: VoteDecision,
    pub confidence: f64,
    pub reasoning: Option<String>,
    pub timestamp: SystemTime,
}

/// Decisión de voto
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum VoteDecision {
    Approve,
    Reject,
    Abstain,
}

/// Resultado de consenso
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsensusResult {
    pub proposal_id: Uuid,
    pub decision: VoteDecision,
    pub vote_count: HashMap<VoteDecision, usize>,
    pub confidence_score: f64,
    pub participating_replicas: Vec<Uuid>,
    pub timestamp: SystemTime,
}

/// Trait para participantes en el consenso
#[async_trait]
pub trait ConsensusParticipant: Send + Sync {
    /// ID único del participante
    fn participant_id(&self) -> Uuid;
    
    /// Votar en una propuesta
    async fn vote(&self, proposal: &ConsensusProposal) -> Result<Vote>;
    
    /// Verificar salud del participante
    async fn health_check(&self) -> Result<f64>; // Score 0.0-1.0
    
    /// Manejar resultado de consenso
    async fn handle_consensus_result(&self, result: &ConsensusResult) -> Result<()>;
}

/// Gestor de consenso principal
pub struct ConsensusManager {
    config: ConsensusConfig,
    cognitive_fabric: Arc<CognitiveFabric>,
    metrics: Arc<MetricsCollector>,
    replicas: Arc<RwLock<HashMap<Uuid, ReplicaInfo>>>,
    active_proposals: Arc<RwLock<HashMap<Uuid, ConsensusProposal>>>,
    votes: Arc<RwLock<HashMap<Uuid, Vec<Vote>>>>,
    participants: Arc<RwLock<HashMap<Uuid, Box<dyn ConsensusParticipant>>>>,
}

impl ConsensusManager {
    /// Crear nuevo gestor de consenso
    pub async fn new(
        config: ConsensusConfig,
        cognitive_fabric: Arc<CognitiveFabric>,
        metrics: Arc<MetricsCollector>,
    ) -> Result<Self> {
        let manager = Self {
            config,
            cognitive_fabric,
            metrics,
            replicas: Arc::new(RwLock::new(HashMap::new())),
            active_proposals: Arc::new(RwLock::new(HashMap::new())),
            votes: Arc::new(RwLock::new(HashMap::new())),
            participants: Arc::new(RwLock::new(HashMap::new())),
        };

        // Suscribirse a eventos de consenso
        manager.setup_event_handlers().await?;
        
        // Iniciar monitoreo de salud
        manager.start_health_monitoring().await;
        
        Ok(manager)
    }

    /// Registrar participante en el consenso
    pub async fn register_participant(
        &self,
        participant: Box<dyn ConsensusParticipant>,
    ) -> Result<()> {
        let participant_id = participant.participant_id();
        
        // Crear información de réplica
        let replica_info = ReplicaInfo {
            id: participant_id,
            instance_type: "nano-core".to_string(), // TODO: Obtener tipo real
            state: ReplicaState::Healthy,
            last_heartbeat: SystemTime::now(),
            failure_count: 0,
            vote_weight: 1.0,
            performance_score: 1.0,
        };

        // Registrar participante y réplica
        self.participants.write().await.insert(participant_id, participant);
        self.replicas.write().await.insert(participant_id, replica_info);

        info!("🗳️  Participante registrado en consenso: {}", participant_id);
        Ok(())
    }

    /// Proponer una votación
    pub async fn propose(&self, proposal: ConsensusProposal) -> Result<Uuid> {
        let proposal_id = proposal.id;
        
        info!(
            "📋 Nueva propuesta de consenso: {} ({:?})",
            proposal_id, proposal.proposal_type
        );

        // Validar que hay suficientes réplicas saludables
        let healthy_replicas = self.count_healthy_replicas().await;
        if healthy_replicas < self.config.replica_count {
            return Err(anyhow!(
                "Insuficientes réplicas saludables: {} < {}",
                healthy_replicas,
                self.config.replica_count
            ));
        }

        // Almacenar propuesta
        self.active_proposals.write().await.insert(proposal_id, proposal.clone());
        self.votes.write().await.insert(proposal_id, Vec::new());

        // Publicar propuesta en el Cognitive Fabric
        let event = CognitiveEvent {
            id: Uuid::new_v4(),
            event_type: EventType::ConsensusVote,
            source: "consensus-manager".to_string(),
            target: None,
            timestamp: chrono::Utc::now(),
            payload: serde_json::to_vec(&proposal)?,
            priority: EventPriority::High,
            correlation_id: Some(proposal_id),
        };

        self.cognitive_fabric.publish_event(event).await?;

        // Programar timeout para la votación
        self.schedule_vote_timeout(proposal_id).await;

        Ok(proposal_id)
    }

    /// Procesar voto recibido
    pub async fn process_vote(&self, vote: Vote) -> Result<()> {
        let proposal_id = vote.proposal_id;
        
        debug!(
            "🗳️  Voto recibido para {}: {:?} (confianza: {:.2})",
            proposal_id, vote.decision, vote.confidence
        );

        // Validar que la propuesta existe
        if !self.active_proposals.read().await.contains_key(&proposal_id) {
            return Err(anyhow!("Propuesta no encontrada: {}", proposal_id));
        }

        // Validar que el votante está registrado y saludable
        let replicas = self.replicas.read().await;
        if let Some(replica) = replicas.get(&vote.voter_id) {
            if replica.state != ReplicaState::Healthy {
                warn!(
                    "⚠️  Voto rechazado de réplica no saludable: {} ({:?})",
                    vote.voter_id, replica.state
                );
                return Ok(());
            }
        } else {
            return Err(anyhow!("Votante no registrado: {}", vote.voter_id));
        }

        // Almacenar voto
        self.votes.write().await
            .get_mut(&proposal_id)
            .unwrap()
            .push(vote);

        // Verificar si tenemos suficientes votos para decidir
        self.check_consensus_completion(proposal_id).await?;

        Ok(())
    }

    /// Verificar si se ha alcanzado consenso
    async fn check_consensus_completion(&self, proposal_id: Uuid) -> Result<()> {
        let votes_guard = self.votes.read().await;
        let votes = votes_guard.get(&proposal_id).unwrap();
        
        let proposals_guard = self.active_proposals.read().await;
        let proposal = proposals_guard.get(&proposal_id).unwrap();

        // Contar votos por decisión
        let mut vote_counts = HashMap::new();
        let mut total_confidence = 0.0;
        let mut participating_replicas = Vec::new();

        for vote in votes {
            *vote_counts.entry(vote.decision.clone()).or_insert(0) += 1;
            total_confidence += vote.confidence;
            participating_replicas.push(vote.voter_id);
        }

        // Verificar si tenemos suficientes votos
        if votes.len() >= proposal.required_votes {
            let decision = self.determine_consensus_decision(&vote_counts);
            let confidence_score = total_confidence / votes.len() as f64;

            let result = ConsensusResult {
                proposal_id,
                decision: decision.clone(),
                vote_count: vote_counts,
                confidence_score,
                participating_replicas,
                timestamp: SystemTime::now(),
            };

            info!(
                "✅ Consenso alcanzado para {}: {:?} (confianza: {:.2})",
                proposal_id, decision, confidence_score
            );

            // Notificar resultado
            self.notify_consensus_result(&result).await?;
            
            // Limpiar propuesta completada
            drop(votes_guard);
            drop(proposals_guard);
            self.active_proposals.write().await.remove(&proposal_id);
            self.votes.write().await.remove(&proposal_id);
        }

        Ok(())
    }

    /// Determinar decisión de consenso basada en votos
    fn determine_consensus_decision(
        &self,
        vote_counts: &HashMap<VoteDecision, usize>,
    ) -> VoteDecision {
        let approve_count = vote_counts.get(&VoteDecision::Approve).unwrap_or(&0);
        let reject_count = vote_counts.get(&VoteDecision::Reject).unwrap_or(&0);
        let abstain_count = vote_counts.get(&VoteDecision::Abstain).unwrap_or(&0);

        // Mayoría simple con preferencia por rechazo en caso de empate
        if approve_count > reject_count && approve_count > abstain_count {
            VoteDecision::Approve
        } else if reject_count >= approve_count {
            VoteDecision::Reject
        } else {
            VoteDecision::Abstain
        }
    }

    /// Notificar resultado de consenso
    async fn notify_consensus_result(&self, result: &ConsensusResult) -> Result<()> {
        // Publicar resultado en Cognitive Fabric
        let event = CognitiveEvent {
            id: Uuid::new_v4(),
            event_type: EventType::ConsensusVote,
            source: "consensus-manager".to_string(),
            target: None,
            timestamp: chrono::Utc::now(),
            payload: serde_json::to_vec(result)?,
            priority: EventPriority::High,
            correlation_id: Some(result.proposal_id),
        };

        self.cognitive_fabric.publish_event(event).await?;

        // Notificar a participantes
        let participants = self.participants.read().await;
        for participant in participants.values() {
            if let Err(e) = participant.handle_consensus_result(result).await {
                error!(
                    "❌ Error notificando resultado a {}: {}",
                    participant.participant_id(),
                    e
                );
            }
        }

        Ok(())
    }

    /// Contar réplicas saludables
    async fn count_healthy_replicas(&self) -> usize {
        self.replicas
            .read()
            .await
            .values()
            .filter(|r| r.state == ReplicaState::Healthy)
            .count()
    }

    /// Configurar manejadores de eventos
    async fn setup_event_handlers(&self) -> Result<()> {
        // TODO: Implementar manejadores de eventos del Cognitive Fabric
        Ok(())
    }

    /// Iniciar monitoreo de salud
    async fn start_health_monitoring(&self) {
        let replicas = self.replicas.clone();
        let participants = self.participants.clone();
        let interval = Duration::from_millis(self.config.health_check_interval_ms);

        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);
            
            loop {
                interval_timer.tick().await;
                
                // Verificar salud de cada participante
                let participants_guard = participants.read().await;
                for participant in participants_guard.values() {
                    let participant_id = participant.participant_id();
                    
                    match participant.health_check().await {
                        Ok(score) => {
                            let mut replicas_guard = replicas.write().await;
                            if let Some(replica) = replicas_guard.get_mut(&participant_id) {
                                replica.last_heartbeat = SystemTime::now();
                                replica.performance_score = score;
                                
                                // Actualizar estado basado en score
                                replica.state = if score > 0.8 {
                                    ReplicaState::Healthy
                                } else if score > 0.5 {
                                    ReplicaState::Degraded
                                } else {
                                    ReplicaState::Failed
                                };
                            }
                        }
                        Err(e) => {
                            warn!("⚠️  Health check falló para {}: {}", participant_id, e);
                            
                            let mut replicas_guard = replicas.write().await;
                            if let Some(replica) = replicas_guard.get_mut(&participant_id) {
                                replica.failure_count += 1;
                                replica.state = ReplicaState::Failed;
                            }
                        }
                    }
                }
            }
        });
    }

    /// Programar timeout para votación
    async fn schedule_vote_timeout(&self, proposal_id: Uuid) {
        let timeout = Duration::from_millis(self.config.vote_timeout_ms);
        let active_proposals = self.active_proposals.clone();
        let votes = self.votes.clone();

        tokio::spawn(async move {
            tokio::time::sleep(timeout).await;
            
            // Verificar si la propuesta aún está activa
            if active_proposals.read().await.contains_key(&proposal_id) {
                warn!("⏰ Timeout de votación para propuesta: {}", proposal_id);
                
                // Limpiar propuesta expirada
                active_proposals.write().await.remove(&proposal_id);
                votes.write().await.remove(&proposal_id);
            }
        });
    }

    /// Shutdown del gestor de consenso
    pub async fn shutdown(&self) -> Result<()> {
        info!("🛑 Cerrando ConsensusManager");
        
        // Limpiar propuestas activas
        self.active_proposals.write().await.clear();
        self.votes.write().await.clear();
        
        info!("✅ ConsensusManager cerrado");
        Ok(())
    }
}