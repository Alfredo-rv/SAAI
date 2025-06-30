/**
 * ConsensusManager - Sistema de votación y redundancia
 * Implementa votación por mayoría bizantina y hot-swapping
 */

import { CognitiveFabric, EventType } from './CognitiveFabric';

export interface ConsensusProposal {
  id: string;
  proposalType: ProposalType;
  proposer: string;
  data: any;
  timestamp: Date;
  requiredVotes: number;
}

export enum ProposalType {
  HealthCheck = 'health_check',
  ConfigChange = 'config_change',
  ReplicaReplacement = 'replica_replacement',
  SystemMutation = 'system_mutation',
  SecurityAction = 'security_action'
}

export interface Vote {
  proposalId: string;
  voterId: string;
  decision: VoteDecision;
  confidence: number;
  reasoning?: string;
  timestamp: Date;
}

export enum VoteDecision {
  Approve = 'approve',
  Reject = 'reject',
  Abstain = 'abstain'
}

export interface ConsensusResult {
  proposalId: string;
  decision: VoteDecision;
  voteCount: Record<VoteDecision, number>;
  confidenceScore: number;
  participatingReplicas: string[];
  timestamp: Date;
}

/**
 * Gestor de consenso principal
 */
export class ConsensusManager {
  private fabric: CognitiveFabric;
  private activeProposals: Map<string, ConsensusProposal> = new Map();
  private votes: Map<string, Vote[]> = new Map();
  private participants: Set<string> = new Set();
  private consensusHistory: ConsensusResult[] = [];

  constructor(fabric: CognitiveFabric) {
    this.fabric = fabric;
  }

  async initialize(): Promise<void> {
    console.log('🗳️  Inicializando ConsensusManager');
    
    // Suscribirse a eventos de consenso
    await this.fabric.subscribe('saai.consensus.votes', (event) => {
      this.handleVoteEvent(event.payload);
    });
    
    await this.fabric.subscribe('saai.consensus.proposals', (event) => {
      this.handleProposalEvent(event.payload);
    });
    
    console.log('✅ ConsensusManager inicializado');
  }

  async registerParticipant(participantId: string): Promise<void> {
    this.participants.add(participantId);
    console.log(`🗳️  Participante registrado: ${participantId}`);
  }

  async propose(proposal: Omit<ConsensusProposal, 'id' | 'timestamp'>): Promise<string> {
    const proposalId = `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullProposal: ConsensusProposal = {
      ...proposal,
      id: proposalId,
      timestamp: new Date()
    };

    // Validar que hay suficientes participantes
    if (this.participants.size < fullProposal.requiredVotes) {
      throw new Error(`Insuficientes participantes: ${this.participants.size} < ${fullProposal.requiredVotes}`);
    }

    this.activeProposals.set(proposalId, fullProposal);
    this.votes.set(proposalId, []);

    // Publicar propuesta
    await this.fabric.publishEvent({
      eventType: EventType.ConsensusVote,
      source: 'consensus-manager',
      payload: { type: 'proposal', proposal: fullProposal }
    });

    // Programar timeout
    setTimeout(() => {
      this.checkProposalTimeout(proposalId);
    }, 30000); // 30 segundos timeout

    console.log(`📋 Propuesta creada: ${proposalId} (${proposal.proposalType})`);
    return proposalId;
  }

  async vote(vote: Omit<Vote, 'timestamp'>): Promise<void> {
    const fullVote: Vote = {
      ...vote,
      timestamp: new Date()
    };

    // Validar propuesta existe
    if (!this.activeProposals.has(vote.proposalId)) {
      throw new Error(`Propuesta no encontrada: ${vote.proposalId}`);
    }

    // Validar participante registrado
    if (!this.participants.has(vote.voterId)) {
      throw new Error(`Participante no registrado: ${vote.voterId}`);
    }

    // Almacenar voto
    const proposalVotes = this.votes.get(vote.proposalId)!;
    
    // Verificar si ya votó
    const existingVoteIndex = proposalVotes.findIndex(v => v.voterId === vote.voterId);
    if (existingVoteIndex >= 0) {
      proposalVotes[existingVoteIndex] = fullVote; // Actualizar voto
    } else {
      proposalVotes.push(fullVote);
    }

    console.log(`🗳️  Voto recibido: ${vote.proposalId} - ${vote.decision} (${vote.confidence})`);

    // Verificar si se alcanzó consenso
    await this.checkConsensusCompletion(vote.proposalId);
  }

  private async handleVoteEvent(payload: any): Promise<void> {
    if (payload.type === 'vote') {
      await this.vote(payload.vote);
    }
  }

  private async handleProposalEvent(payload: any): Promise<void> {
    if (payload.type === 'proposal') {
      // Simular votación automática de participantes
      const proposal = payload.proposal as ConsensusProposal;
      
      // Simular votos de participantes después de un delay
      setTimeout(async () => {
        await this.simulateParticipantVotes(proposal.id);
      }, 1000 + Math.random() * 2000);
    }
  }

  private async simulateParticipantVotes(proposalId: string): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal) return;

    // Simular votos de participantes registrados
    for (const participantId of this.participants) {
      if (Math.random() > 0.1) { // 90% de participación
        const decision = this.simulateVoteDecision(proposal);
        const confidence = 0.7 + Math.random() * 0.3;
        
        await this.vote({
          proposalId,
          voterId: participantId,
          decision,
          confidence
        });
      }
    }
  }

  private simulateVoteDecision(proposal: ConsensusProposal): VoteDecision {
    // Simular decisiones basadas en el tipo de propuesta
    switch (proposal.proposalType) {
      case ProposalType.HealthCheck:
        return Math.random() > 0.2 ? VoteDecision.Approve : VoteDecision.Reject;
      case ProposalType.SecurityAction:
        return Math.random() > 0.1 ? VoteDecision.Approve : VoteDecision.Reject;
      case ProposalType.ConfigChange:
        return Math.random() > 0.3 ? VoteDecision.Approve : VoteDecision.Reject;
      default:
        return Math.random() > 0.25 ? VoteDecision.Approve : VoteDecision.Reject;
    }
  }

  private async checkConsensusCompletion(proposalId: string): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    const votes = this.votes.get(proposalId);
    
    if (!proposal || !votes) return;

    // Verificar si tenemos suficientes votos
    if (votes.length >= proposal.requiredVotes) {
      const result = this.calculateConsensusResult(proposalId, proposal, votes);
      
      // Almacenar resultado
      this.consensusHistory.push(result);
      
      // Limpiar propuesta activa
      this.activeProposals.delete(proposalId);
      this.votes.delete(proposalId);
      
      // Publicar resultado
      await this.fabric.publishEvent({
        eventType: EventType.ConsensusVote,
        source: 'consensus-manager',
        payload: { type: 'result', result }
      });
      
      console.log(`✅ Consenso alcanzado: ${proposalId} - ${result.decision}`);
    }
  }

  private calculateConsensusResult(
    proposalId: string,
    proposal: ConsensusProposal,
    votes: Vote[]
  ): ConsensusResult {
    const voteCount: Record<VoteDecision, number> = {
      [VoteDecision.Approve]: 0,
      [VoteDecision.Reject]: 0,
      [VoteDecision.Abstain]: 0
    };

    let totalConfidence = 0;
    const participatingReplicas: string[] = [];

    for (const vote of votes) {
      voteCount[vote.decision]++;
      totalConfidence += vote.confidence;
      participatingReplicas.push(vote.voterId);
    }

    // Determinar decisión por mayoría
    let decision = VoteDecision.Reject;
    if (voteCount[VoteDecision.Approve] > voteCount[VoteDecision.Reject]) {
      decision = VoteDecision.Approve;
    } else if (voteCount[VoteDecision.Reject] === voteCount[VoteDecision.Approve]) {
      decision = VoteDecision.Abstain;
    }

    const confidenceScore = votes.length > 0 ? totalConfidence / votes.length : 0;

    return {
      proposalId,
      decision,
      voteCount,
      confidenceScore,
      participatingReplicas,
      timestamp: new Date()
    };
  }

  private async checkProposalTimeout(proposalId: string): Promise<void> {
    if (this.activeProposals.has(proposalId)) {
      console.log(`⏰ Timeout de propuesta: ${proposalId}`);
      
      // Limpiar propuesta expirada
      this.activeProposals.delete(proposalId);
      this.votes.delete(proposalId);
    }
  }

  getConsensusHistory(): ConsensusResult[] {
    return [...this.consensusHistory];
  }

  getActiveProposals(): ConsensusProposal[] {
    return Array.from(this.activeProposals.values());
  }

  getStatistics() {
    return {
      totalProposals: this.consensusHistory.length,
      activeProposals: this.activeProposals.size,
      participants: this.participants.size,
      successRate: this.calculateSuccessRate()
    };
  }

  private calculateSuccessRate(): number {
    if (this.consensusHistory.length === 0) return 0;
    
    const approved = this.consensusHistory.filter(r => r.decision === VoteDecision.Approve).length;
    return (approved / this.consensusHistory.length) * 100;
  }

  async shutdown(): Promise<void> {
    this.activeProposals.clear();
    this.votes.clear();
    this.participants.clear();
    console.log('✅ ConsensusManager cerrado');
  }
}