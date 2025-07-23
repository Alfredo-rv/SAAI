//! Sistema de seguridad multinivel
//! 
//! Implementa sandboxing, encriptación, verificación de integridad
//! y detección de amenazas para el ecosistema SAAI.

use anyhow::{Result, anyhow};
use ring::{aead, digest, rand};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

/// Configuración del sistema de seguridad
#[derive(Debug, Clone)]
pub struct SecurityConfig {
    pub enable_sandboxing: bool,
    pub encryption_enabled: bool,
    pub integrity_checks: bool,
    pub threat_detection: bool,
    pub audit_logging: bool,
}

/// Niveles de seguridad
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SecurityLevel {
    Public = 0,
    Internal = 1,
    Confidential = 2,
    Secret = 3,
    TopSecret = 4,
}

/// Contexto de seguridad para operaciones
#[derive(Debug, Clone)]
pub struct SecurityContext {
    pub user_id: Option<String>,
    pub session_id: Uuid,
    pub security_level: SecurityLevel,
    pub permissions: Vec<String>,
    pub source_ip: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Evento de seguridad
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: Uuid,
    pub event_type: SecurityEventType,
    pub severity: SecuritySeverity,
    pub source: String,
    pub target: Option<String>,
    pub description: String,
    pub context: HashMap<String, String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Tipos de eventos de seguridad
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityEventType {
    AuthenticationFailure,
    AuthorizationDenied,
    SuspiciousActivity,
    IntegrityViolation,
    EncryptionFailure,
    SandboxBreach,
    AnomalousAccess,
    ThreatDetected,
}

/// Severidad de eventos de seguridad
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum SecuritySeverity {
    Info = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

/// Gestor de encriptación
pub struct EncryptionManager {
    key: aead::LessSafeKey,
    algorithm: &'static aead::Algorithm,
}

impl EncryptionManager {
    /// Crear nuevo gestor de encriptación
    pub fn new() -> Result<Self> {
        let algorithm = &aead::AES_256_GCM;
        let rng = rand::SystemRandom::new();
        let key_bytes = aead::generate_key(algorithm, &rng)?;
        let key = aead::LessSafeKey::new(key_bytes);
        
        Ok(Self {
            key,
            algorithm,
        })
    }
    
    /// Encriptar datos
    pub fn encrypt(&self, data: &[u8], associated_data: &[u8]) -> Result<Vec<u8>> {
        let rng = rand::SystemRandom::new();
        let mut nonce_bytes = vec![0u8; self.algorithm.nonce_len()];
        rng.fill(&mut nonce_bytes)?;
        
        let nonce = aead::Nonce::try_assume_unique_for_key(&nonce_bytes)?;
        let mut in_out = data.to_vec();
        
        self.key.seal_in_place_append_tag(nonce, aead::Aad::from(associated_data), &mut in_out)?;
        
        // Prepender nonce a los datos encriptados
        let mut result = nonce_bytes;
        result.extend_from_slice(&in_out);
        
        Ok(result)
    }
    
    /// Desencriptar datos
    pub fn decrypt(&self, encrypted_data: &[u8], associated_data: &[u8]) -> Result<Vec<u8>> {
        if encrypted_data.len() < self.algorithm.nonce_len() {
            return Err(anyhow!("Datos encriptados demasiado cortos"));
        }
        
        let (nonce_bytes, ciphertext) = encrypted_data.split_at(self.algorithm.nonce_len());
        let nonce = aead::Nonce::try_assume_unique_for_key(nonce_bytes)?;
        
        let mut in_out = ciphertext.to_vec();
        let plaintext = self.key.open_in_place(nonce, aead::Aad::from(associated_data), &mut in_out)?;
        
        Ok(plaintext.to_vec())
    }
}

/// Verificador de integridad
pub struct IntegrityVerifier;

impl IntegrityVerifier {
    /// Calcular hash de integridad
    pub fn calculate_hash(data: &[u8]) -> String {
        let hash = digest::digest(&digest::SHA256, data);
        hex::encode(hash.as_ref())
    }
    
    /// Verificar integridad de datos
    pub fn verify_integrity(data: &[u8], expected_hash: &str) -> bool {
        let calculated_hash = Self::calculate_hash(data);
        calculated_hash == expected_hash
    }
    
    /// Generar checksum para archivo
    pub async fn checksum_file(path: &str) -> Result<String> {
        let data = tokio::fs::read(path).await?;
        Ok(Self::calculate_hash(&data))
    }
}

/// Detector de amenazas
pub struct ThreatDetector {
    patterns: Arc<RwLock<Vec<ThreatPattern>>>,
    events: Arc<RwLock<Vec<SecurityEvent>>>,
}

/// Patrón de amenaza
#[derive(Debug, Clone)]
pub struct ThreatPattern {
    pub id: String,
    pub name: String,
    pub description: String,
    pub pattern_type: ThreatPatternType,
    pub severity: SecuritySeverity,
    pub enabled: bool,
}

/// Tipos de patrones de amenaza
#[derive(Debug, Clone)]
pub enum ThreatPatternType {
    FrequencyAnomaly { max_events: u32, window_seconds: u64 },
    SuspiciousPattern { keywords: Vec<String> },
    AccessAnomaly { unusual_times: bool, unusual_locations: bool },
    ResourceAbuse { cpu_threshold: f64, memory_threshold: u64 },
}

impl ThreatDetector {
    /// Crear nuevo detector de amenazas
    pub fn new() -> Self {
        let mut patterns = Vec::new();
        
        // Patrones predefinidos
        patterns.push(ThreatPattern {
            id: "freq_auth_fail".to_string(),
            name: "Fallos de autenticación frecuentes".to_string(),
            description: "Múltiples fallos de autenticación en corto tiempo".to_string(),
            pattern_type: ThreatPatternType::FrequencyAnomaly {
                max_events: 5,
                window_seconds: 300,
            },
            severity: SecuritySeverity::High,
            enabled: true,
        });
        
        patterns.push(ThreatPattern {
            id: "resource_abuse".to_string(),
            name: "Abuso de recursos".to_string(),
            description: "Uso excesivo de CPU o memoria".to_string(),
            pattern_type: ThreatPatternType::ResourceAbuse {
                cpu_threshold: 90.0,
                memory_threshold: 1024 * 1024 * 1024, // 1GB
            },
            severity: SecuritySeverity::Medium,
            enabled: true,
        });
        
        Self {
            patterns: Arc::new(RwLock::new(patterns)),
            events: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    /// Analizar evento de seguridad
    pub async fn analyze_event(&self, event: SecurityEvent) -> Result<Vec<SecurityEvent>> {
        let mut threats = Vec::new();
        
        // Almacenar evento
        self.events.write().await.push(event.clone());
        
        // Analizar contra patrones
        let patterns = self.patterns.read().await;
        for pattern in patterns.iter().filter(|p| p.enabled) {
            if let Some(threat) = self.check_pattern(&event, pattern).await? {
                threats.push(threat);
            }
        }
        
        Ok(threats)
    }
    
    /// Verificar patrón específico
    async fn check_pattern(
        &self,
        event: &SecurityEvent,
        pattern: &ThreatPattern,
    ) -> Result<Option<SecurityEvent>> {
        match &pattern.pattern_type {
            ThreatPatternType::FrequencyAnomaly { max_events, window_seconds } => {
                let window_start = chrono::Utc::now() - chrono::Duration::seconds(*window_seconds as i64);
                
                let events = self.events.read().await;
                let recent_events = events.iter()
                    .filter(|e| e.timestamp >= window_start && e.event_type == event.event_type)
                    .count();
                
                if recent_events > *max_events as usize {
                    return Ok(Some(SecurityEvent {
                        id: Uuid::new_v4(),
                        event_type: SecurityEventType::ThreatDetected,
                        severity: pattern.severity.clone(),
                        source: "threat-detector".to_string(),
                        target: Some(event.source.clone()),
                        description: format!("Patrón detectado: {}", pattern.name),
                        context: HashMap::from([
                            ("pattern_id".to_string(), pattern.id.clone()),
                            ("event_count".to_string(), recent_events.to_string()),
                        ]),
                        timestamp: chrono::Utc::now(),
                    }));
                }
            }
            
            ThreatPatternType::SuspiciousPattern { keywords } => {
                let description_lower = event.description.to_lowercase();
                for keyword in keywords {
                    if description_lower.contains(&keyword.to_lowercase()) {
                        return Ok(Some(SecurityEvent {
                            id: Uuid::new_v4(),
                            event_type: SecurityEventType::SuspiciousActivity,
                            severity: pattern.severity.clone(),
                            source: "threat-detector".to_string(),
                            target: Some(event.source.clone()),
                            description: format!("Actividad sospechosa detectada: {}", keyword),
                            context: HashMap::from([
                                ("pattern_id".to_string(), pattern.id.clone()),
                                ("keyword".to_string(), keyword.clone()),
                            ]),
                            timestamp: chrono::Utc::now(),
                        }));
                    }
                }
            }
            
            _ => {
                // TODO: Implementar otros tipos de patrones
            }
        }
        
        Ok(None)
    }
}

/// Gestor principal de seguridad
pub struct SecurityManager {
    config: SecurityConfig,
    encryption: Option<EncryptionManager>,
    threat_detector: ThreatDetector,
    security_events: Arc<RwLock<Vec<SecurityEvent>>>,
    active_sessions: Arc<RwLock<HashMap<Uuid, SecurityContext>>>,
}

impl SecurityManager {
    /// Crear nuevo gestor de seguridad
    pub async fn new(config: SecurityConfig) -> Result<Self> {
        let encryption = if config.encryption_enabled {
            Some(EncryptionManager::new()?)
        } else {
            None
        };
        
        let threat_detector = ThreatDetector::new();
        
        Ok(Self {
            config,
            encryption,
            threat_detector,
            security_events: Arc::new(RwLock::new(Vec::new())),
            active_sessions: Arc::new(RwLock::new(HashMap::new())),
        })
    }
    
    /// Crear contexto de seguridad
    pub async fn create_security_context(
        &self,
        user_id: Option<String>,
        security_level: SecurityLevel,
        permissions: Vec<String>,
        source_ip: Option<String>,
    ) -> SecurityContext {
        let context = SecurityContext {
            user_id,
            session_id: Uuid::new_v4(),
            security_level,
            permissions,
            source_ip,
            timestamp: chrono::Utc::now(),
        };
        
        // Registrar sesión activa
        self.active_sessions.write().await.insert(context.session_id, context.clone());
        
        info!("🔐 Contexto de seguridad creado: {:?}", context.session_id);
        context
    }
    
    /// Verificar autorización
    pub async fn check_authorization(
        &self,
        context: &SecurityContext,
        required_permission: &str,
        required_level: SecurityLevel,
    ) -> Result<bool> {
        // Verificar nivel de seguridad
        if context.security_level < required_level {
            self.log_security_event(SecurityEvent {
                id: Uuid::new_v4(),
                event_type: SecurityEventType::AuthorizationDenied,
                severity: SecuritySeverity::Medium,
                source: context.session_id.to_string(),
                target: None,
                description: format!("Nivel de seguridad insuficiente: {:?} < {:?}", 
                                   context.security_level, required_level),
                context: HashMap::new(),
                timestamp: chrono::Utc::now(),
            }).await?;
            
            return Ok(false);
        }
        
        // Verificar permisos
        if !context.permissions.contains(&required_permission.to_string()) {
            self.log_security_event(SecurityEvent {
                id: Uuid::new_v4(),
                event_type: SecurityEventType::AuthorizationDenied,
                severity: SecuritySeverity::Medium,
                source: context.session_id.to_string(),
                target: None,
                description: format!("Permiso faltante: {}", required_permission),
                context: HashMap::new(),
                timestamp: chrono::Utc::now(),
            }).await?;
            
            return Ok(false);
        }
        
        Ok(true)
    }
    
    /// Encriptar datos sensibles
    pub fn encrypt_data(&self, data: &[u8], context: &SecurityContext) -> Result<Vec<u8>> {
        if let Some(encryption) = &self.encryption {
            let associated_data = context.session_id.as_bytes();
            encryption.encrypt(data, associated_data)
        } else {
            Err(anyhow!("Encriptación no habilitada"))
        }
    }
    
    /// Desencriptar datos
    pub fn decrypt_data(&self, encrypted_data: &[u8], context: &SecurityContext) -> Result<Vec<u8>> {
        if let Some(encryption) = &self.encryption {
            let associated_data = context.session_id.as_bytes();
            encryption.decrypt(encrypted_data, associated_data)
        } else {
            Err(anyhow!("Encriptación no habilitada"))
        }
    }
    
    /// Registrar evento de seguridad
    pub async fn log_security_event(&self, event: SecurityEvent) -> Result<()> {
        if self.config.audit_logging {
            info!("🚨 Evento de seguridad: {:?} - {}", event.severity, event.description);
        }
        
        // Analizar amenazas
        if self.config.threat_detection {
            let threats = self.threat_detector.analyze_event(event.clone()).await?;
            for threat in threats {
                warn!("⚠️  Amenaza detectada: {}", threat.description);
                self.security_events.write().await.push(threat);
            }
        }
        
        self.security_events.write().await.push(event);
        Ok(())
    }
    
    /// Obtener eventos de seguridad recientes
    pub async fn get_recent_events(&self, hours: u64) -> Vec<SecurityEvent> {
        let cutoff = chrono::Utc::now() - chrono::Duration::hours(hours as i64);
        
        self.security_events
            .read()
            .await
            .iter()
            .filter(|e| e.timestamp >= cutoff)
            .cloned()
            .collect()
    }
    
    /// Cerrar sesión de seguridad
    pub async fn close_session(&self, session_id: Uuid) -> Result<()> {
        self.active_sessions.write().await.remove(&session_id);
        info!("🔐 Sesión de seguridad cerrada: {:?}", session_id);
        Ok(())
    }
    
    /// Shutdown del gestor de seguridad
    pub async fn shutdown(&self) -> Result<()> {
        info!("🛑 Cerrando SecurityManager");
        
        // Cerrar sesiones activas
        self.active_sessions.write().await.clear();
        
        info!("✅ SecurityManager cerrado");
        Ok(())
    }
    
    /// Obtener estadísticas de seguridad
    pub async fn get_security_stats(&self) -> HashMap<String, u64> {
        let events = self.security_events.read().await;
        let mut stats = HashMap::new();
        
        for event in events.iter() {
            let key = format!("{:?}", event.event_type);
            *stats.entry(key).or_insert(0) += 1;
        }
        
        stats.insert("active_sessions".to_string(), 
                     self.active_sessions.read().await.len() as u64);
        
        stats
    }
}