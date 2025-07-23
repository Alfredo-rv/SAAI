//! Participante de consenso para nano-núcleos
//! 
//! Implementación del trait ConsensusParticipant para nano-núcleos,
//! permitiendo su participación en el sistema de votación bizantina.

use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;
use uuid::Uuid;

use crate::communication::CognitiveFabric;
use crate::consensus::{ConsensusParticipant, ConsensusProposal, Vote, VoteDecision, ConsensusResult};
use crate::nano_cores::NanoCoreType;

/// Participante de consenso para nano-núcleos
pub struct NanoCoreConsensusParticipant {
    id: Uuid,
    core_type: NanoCoreType,
    instance_number: usize,
    cognitive_fabric: Arc<CognitiveFabric>,
    health_score: Arc<tokio::sync::RwLock<f64>>,
}

impl NanoCoreConsensusParticipant {
    /// Crear nuevo participante de consenso
    pub fn new(
        id: Uuid,
        core_type: NanoCoreType,
        instance_number: usize,
        cognitive_fabric: Arc<CognitiveFabric>,
    ) -> Self {
        Self {
            id,
            core_type,
            instance_number,
            cognitive_fabric,
            health_score: Arc::new(tokio::sync::RwLock::new(1.0)),
        }
    }
    
    /// Actualizar puntuación de salud
    pub async fn update_health_score(&self, score: f64) {
        *self.health_score.write().await = score;
    }
    
    /// Evaluar propuesta basada en el tipo de nano-núcleo
    async fn evaluate_proposal(&self, proposal: &ConsensusProposal) -> Result<VoteDecision> {
        use crate::consensus::ProposalType;
        
        match proposal.proposal_type {
            ProposalType::HealthCheck => {
                // Los nano-núcleos siempre aprueban health checks si están saludables
                let health = *self.health_score.read().await;
                Ok(if health > 0.7 { VoteDecision::Approve } else { VoteDecision::Abstain })
            }
            
            ProposalType::ConfigChange => {
                // Evaluar cambios de configuración basado en el tipo de núcleo
                match self.core_type {
                    NanoCoreType::Security => {
                        // Security core es más conservador con cambios
                        self.evaluate_security_config_change(proposal).await
                    }
                    NanoCoreType::Network => {
                        // Network core evalúa impacto en conectividad
                        self.evaluate_network_config_change(proposal).await
                    }
                    _ => {
                        // Otros núcleos son más permisivos
                        Ok(VoteDecision::Approve)
                    }
                }
            }
            
            ProposalType::ReplicaReplacement => {
                // Evaluar reemplazo de réplicas
                self.evaluate_replica_replacement(proposal).await
            }
            
            ProposalType::SystemMutation => {
                // Evaluar mutaciones del sistema
                self.evaluate_system_mutation(proposal).await
            }
            
            ProposalType::SecurityAction => {
                // Solo security cores pueden aprobar acciones de seguridad
                match self.core_type {
                    NanoCoreType::Security => Ok(VoteDecision::Approve),
                    _ => Ok(VoteDecision::Abstain),
                }
            }
        }
    }
    
    async fn evaluate_security_config_change(&self, _proposal: &ConsensusProposal) -> Result<VoteDecision> {
        // Lógica específica para evaluar cambios de configuración de seguridad
        // Por ahora, ser conservador
        Ok(VoteDecision::Approve) // Simplificado para el ejemplo
    }
    
    async fn evaluate_network_config_change(&self, _proposal: &ConsensusProposal) -> Result<VoteDecision> {
        // Evaluar impacto en la red
        Ok(VoteDecision::Approve) // Simplificado para el ejemplo
    }
    
    async fn evaluate_replica_replacement(&self, _proposal: &ConsensusProposal) -> Result<VoteDecision> {
        // Evaluar si el reemplazo de réplica es necesario
        let health = *self.health_score.read().await;
        Ok(if health > 0.8 { VoteDecision::Approve } else { VoteDecision::Reject })
    }
    
    async fn evaluate_system_mutation(&self, proposal: &ConsensusProposal) -> Result<VoteDecision> {
        // Evaluar mutaciones del sistema basado en datos de la propuesta
        if let Ok(mutation_data) = serde_json::from_slice::<serde_json::Value>(&proposal.data) {
            if let Some(fitness_score) = mutation_data.get("fitnessScore").and_then(|v| v.as_f64()) {
                // Aprobar mutaciones con alto fitness score
                Ok(if fitness_score > 0.8 { VoteDecision::Approve } else { VoteDecision::Reject })
            } else {
                Ok(VoteDecision::Abstain)
            }
        } else {
            Ok(VoteDecision::Abstain)
        }
    }
}

#[async_trait]
impl ConsensusParticipant for NanoCoreConsensusParticipant {
    fn participant_id(&self) -> Uuid {
        self.id
    }
    
    async fn vote(&self, proposal: &ConsensusProposal) -> Result<Vote> {
        let decision = self.evaluate_proposal(proposal).await?;
        let health = *self.health_score.read().await;
        
        // La confianza del voto está basada en la salud del nano-núcleo
        let confidence = health * 0.9 + 0.1; // Mínimo 10% de confianza
        
        let reasoning = Some(format!(
            "Voto de {:?} instancia {} - Salud: {:.2}",
            self.core_type,
            self.instance_number,
            health
        ));
        
        Ok(Vote {
            proposal_id: proposal.id,
            voter_id: self.id,
            decision,
            confidence,
            reasoning,
            timestamp: std::time::SystemTime::now(),
        })
    }
    
    async fn health_check(&self) -> Result<f64> {
        // Retornar la puntuación de salud actual
        Ok(*self.health_score.read().await)
    }
    
    async fn handle_consensus_result(&self, result: &ConsensusResult) -> Result<()> {
        // Manejar el resultado del consenso
        tracing::info!(
            "🗳️  Nano-núcleo {:?} instancia {} procesando resultado de consenso: {:?}",
            self.core_type,
            self.instance_number,
            result.decision
        );
        
        // Publicar evento sobre el resultado del consenso
        self.cognitive_fabric.publish_event(crate::communication::CognitiveEvent {
            id: Uuid::new_v4(),
            event_type: crate::communication::EventType::ConsensusVote,
            source: format!("{:?}-{}", self.core_type, self.instance_number),
            target: None,
            timestamp: chrono::Utc::now(),
            payload: serde_json::to_vec(result)?,
            priority: crate::communication::EventPriority::High,
            correlation_id: Some(result.proposal_id),
        }).await?;
        
        Ok(())
    }
}