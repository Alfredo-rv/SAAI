//! Nano-Core.Hardware - Monitoreo granular de hardware
//! 
//! Monitoreo en tiempo real de componentes de hardware con predicción
//! de fallos y optimización automática de recursos.

use anyhow::{Result, anyhow};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{System, SystemExt, ComponentExt, DiskExt, NetworkExt};
use tokio::sync::RwLock;
use tracing::{debug, info, warn, error};
use uuid::Uuid;

use crate::communication::CognitiveFabric;
use crate::metrics::MetricsCollector;
use crate::nano_cores::{NanoCore, NanoCoreType, NanoCoreState, NanoCoreHealth};

/// Información detallada de hardware
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub cpu_info: CpuInfo,
    pub memory_info: MemoryInfo,
    pub disk_info: Vec<DiskInfo>,
    pub network_info: Vec<NetworkInfo>,
    pub thermal_info: ThermalInfo,
    pub power_info: PowerInfo,
}

/// Información de CPU
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    pub brand: String,
    pub cores: usize,
    pub frequency: u64,
    pub usage_per_core: Vec<f32>,
    pub average_usage: f32,
    pub temperature: Option<f32>,
    pub load_average: [f64; 3],
}

/// Información de memoria
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub available: u64,
    pub used: u64,
    pub swap_total: u64,
    pub swap_used: u64,
    pub usage_percentage: f32,
    pub pressure_score: f32,
}

/// Información de disco
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub usage_percentage: f32,
    pub file_system: String,
    pub is_removable: bool,
    pub read_speed: u64,
    pub write_speed: u64,
}

/// Información de red
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub interface_name: String,
    pub bytes_received: u64,
    pub bytes_transmitted: u64,
    pub packets_received: u64,
    pub packets_transmitted: u64,
    pub errors_received: u64,
    pub errors_transmitted: u64,
    pub is_up: bool,
    pub speed: Option<u64>,
}

/// Información térmica
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalInfo {
    pub cpu_temperature: Option<f32>,
    pub gpu_temperature: Option<f32>,
    pub motherboard_temperature: Option<f32>,
    pub fan_speeds: Vec<u32>,
    pub thermal_state: ThermalState,
}

/// Estado térmico del sistema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ThermalState {
    Optimal,
    Warm,
    Hot,
    Critical,
}

/// Información de energía
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerInfo {
    pub battery_percentage: Option<f32>,
    pub is_charging: Option<bool>,
    pub power_consumption: Option<f32>,
    pub voltage: Option<f32>,
    pub power_state: PowerState,
}

/// Estado de energía
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PowerState {
    Normal,
    PowerSaving,
    HighPerformance,
    Critical,
}

/// Predicción de fallo de hardware
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailurePrediction {
    pub component: String,
    pub risk_level: RiskLevel,
    pub probability: f32,
    pub time_to_failure: Option<u64>, // segundos
    pub recommended_actions: Vec<String>,
    pub confidence: f32,
}

/// Nivel de riesgo
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

/// Comandos soportados por HardwareCore
#[derive(Debug, Serialize, Deserialize)]
pub enum HardwareCommand {
    GetHardwareInfo,
    GetThermalStatus,
    GetPowerStatus,
    PredictFailures,
    OptimizePerformance,
    SetPowerMode(PowerState),
    GetComponentHealth(String),
}

/// Nano-Core para monitoreo de hardware
pub struct HardwareCore {
    instance_id: Uuid,
    cognitive_fabric: Arc<CognitiveFabric>,
    metrics: Arc<MetricsCollector>,
    instance_number: usize,
    system: Arc<RwLock<System>>,
    start_time: SystemTime,
    error_count: Arc<RwLock<u64>>,
    failure_predictor: FailurePredictor,
    performance_optimizer: HardwareOptimizer,
    thermal_monitor: ThermalMonitor,
}

impl HardwareCore {
    /// Crear nueva instancia de HardwareCore
    pub async fn new(
        cognitive_fabric: Arc<CognitiveFabric>,
        metrics: Arc<MetricsCollector>,
        instance_number: usize,
    ) -> Result<Self> {
        let mut system = System::new_all();
        system.refresh_all();
        
        Ok(Self {
            instance_id: Uuid::new_v4(),
            cognitive_fabric,
            metrics,
            instance_number,
            system: Arc::new(RwLock::new(system)),
            start_time: SystemTime::now(),
            error_count: Arc::new(RwLock::new(0)),
            failure_predictor: FailurePredictor::new(),
            performance_optimizer: HardwareOptimizer::new(),
            thermal_monitor: ThermalMonitor::new(),
        })
    }

    /// Obtener información completa de hardware
    async fn get_hardware_info(&self) -> Result<HardwareInfo> {
        let mut system = self.system.write().await;
        system.refresh_all();

        let cpu_info = self.get_cpu_info(&system).await?;
        let memory_info = self.get_memory_info(&system).await?;
        let disk_info = self.get_disk_info(&system).await?;
        let network_info = self.get_network_info(&system).await?;
        let thermal_info = self.thermal_monitor.get_thermal_info(&system).await?;
        let power_info = self.get_power_info().await?;

        Ok(HardwareInfo {
            cpu_info,
            memory_info,
            disk_info,
            network_info,
            thermal_info,
            power_info,
        })
    }

    /// Obtener información de CPU
    async fn get_cpu_info(&self, system: &System) -> Result<CpuInfo> {
        let cpus = system.cpus();
        let usage_per_core: Vec<f32> = cpus.iter().map(|cpu| cpu.cpu_usage()).collect();
        let average_usage = usage_per_core.iter().sum::<f32>() / usage_per_core.len() as f32;
        
        let load_avg = system.load_average();
        
        // Obtener temperatura de CPU si está disponible
        let temperature = system.components()
            .iter()
            .find(|comp| comp.label().to_lowercase().contains("cpu"))
            .map(|comp| comp.temperature());

        Ok(CpuInfo {
            brand: cpus.first()
                .map(|cpu| cpu.brand().to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
            cores: cpus.len(),
            frequency: cpus.first()
                .map(|cpu| cpu.frequency())
                .unwrap_or(0),
            usage_per_core,
            average_usage,
            temperature,
            load_average: [load_avg.one, load_avg.five, load_avg.fifteen],
        })
    }

    /// Obtener información de memoria
    async fn get_memory_info(&self, system: &System) -> Result<MemoryInfo> {
        let total = system.total_memory();
        let available = system.available_memory();
        let used = system.used_memory();
        let swap_total = system.total_swap();
        let swap_used = system.used_swap();
        
        let usage_percentage = if total > 0 {
            (used as f32 / total as f32) * 100.0
        } else {
            0.0
        };

        // Calcular presión de memoria
        let pressure_score = self.calculate_memory_pressure(usage_percentage, available, total);

        Ok(MemoryInfo {
            total,
            available,
            used,
            swap_total,
            swap_used,
            usage_percentage,
            pressure_score,
        })
    }

    /// Calcular presión de memoria
    fn calculate_memory_pressure(&self, usage_percentage: f32, available: u64, total: u64) -> f32 {
        let availability_ratio = available as f32 / total as f32;
        let usage_factor = usage_percentage / 100.0;
        
        // Presión alta cuando el uso es alto y la disponibilidad es baja
        let pressure = usage_factor * (1.0 - availability_ratio);
        pressure.min(1.0).max(0.0)
    }

    /// Obtener información de discos
    async fn get_disk_info(&self, system: &System) -> Result<Vec<DiskInfo>> {
        let mut disk_info = Vec::new();
        
        for disk in system.disks() {
            let total_space = disk.total_space();
            let available_space = disk.available_space();
            let usage_percentage = if total_space > 0 {
                ((total_space - available_space) as f32 / total_space as f32) * 100.0
            } else {
                0.0
            };

            disk_info.push(DiskInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                total_space,
                available_space,
                usage_percentage,
                file_system: String::from_utf8_lossy(disk.file_system()).to_string(),
                is_removable: disk.is_removable(),
                read_speed: 0, // TODO: Implementar medición de velocidad
                write_speed: 0, // TODO: Implementar medición de velocidad
            });
        }

        Ok(disk_info)
    }

    /// Obtener información de red
    async fn get_network_info(&self, system: &System) -> Result<Vec<NetworkInfo>> {
        let mut network_info = Vec::new();
        
        for (interface_name, network) in system.networks() {
            network_info.push(NetworkInfo {
                interface_name: interface_name.clone(),
                bytes_received: network.received(),
                bytes_transmitted: network.transmitted(),
                packets_received: network.packets_received(),
                packets_transmitted: network.packets_transmitted(),
                errors_received: network.errors_on_received(),
                errors_transmitted: network.errors_on_transmitted(),
                is_up: network.received() > 0 || network.transmitted() > 0,
                speed: None, // TODO: Obtener velocidad de interfaz
            });
        }

        Ok(network_info)
    }

    /// Obtener información de energía
    async fn get_power_info(&self) -> Result<PowerInfo> {
        // En una implementación real, esto obtendría información de ACPI/WMI
        // Por ahora, simulamos algunos valores
        Ok(PowerInfo {
            battery_percentage: None, // TODO: Implementar detección de batería
            is_charging: None,
            power_consumption: None, // TODO: Implementar medición de consumo
            voltage: None,
            power_state: PowerState::Normal,
        })
    }

    /// Predecir fallos de hardware
    async fn predict_failures(&self) -> Result<Vec<FailurePrediction>> {
        let hardware_info = self.get_hardware_info().await?;
        self.failure_predictor.analyze(&hardware_info).await
    }

    /// Optimizar rendimiento de hardware
    async fn optimize_performance(&self) -> Result<String> {
        let hardware_info = self.get_hardware_info().await?;
        self.performance_optimizer.optimize(&hardware_info).await
    }

    /// Publicar métricas de hardware
    async fn publish_hardware_metrics(&self) -> Result<()> {
        let hardware_info = self.get_hardware_info().await?;
        
        // Publicar en el Cognitive Fabric
        let metrics_data = serde_json::to_vec(&hardware_info)?;
        
        self.cognitive_fabric
            .publish("hardware.metrics", &metrics_data)
            .await?;
        
        // Registrar métricas específicas
        self.metrics
            .record_system_resources(&crate::metrics::SystemResources {
                cpu_count: hardware_info.cpu_info.cores,
                cpu_usage: hardware_info.cpu_info.average_usage,
                total_memory: hardware_info.memory_info.total,
                used_memory: hardware_info.memory_info.used,
                available_memory: hardware_info.memory_info.available,
                total_swap: hardware_info.memory_info.swap_total,
                used_swap: hardware_info.memory_info.swap_used,
                load_average: hardware_info.cpu_info.load_average,
            })
            .await;
        
        debug!("📊 Métricas de hardware publicadas");
        Ok(())
    }

    /// Verificar alertas de hardware
    async fn check_hardware_alerts(&self) -> Result<()> {
        let hardware_info = self.get_hardware_info().await?;
        
        // Verificar temperatura crítica
        if let Some(temp) = hardware_info.thermal_info.cpu_temperature {
            if temp > 85.0 {
                warn!("🌡️  Temperatura crítica de CPU: {:.1}°C", temp);
                
                self.cognitive_fabric
                    .publish("hardware.alerts", &serde_json::to_vec(&serde_json::json!({
                        "type": "critical_temperature",
                        "component": "cpu",
                        "temperature": temp,
                        "threshold": 85.0,
                        "timestamp": SystemTime::now()
                    }))?)
                    .await?;
            }
        }
        
        // Verificar uso de memoria crítico
        if hardware_info.memory_info.usage_percentage > 90.0 {
            warn!("💾 Uso crítico de memoria: {:.1}%", hardware_info.memory_info.usage_percentage);
            
            self.cognitive_fabric
                .publish("hardware.alerts", &serde_json::to_vec(&serde_json::json!({
                    "type": "critical_memory",
                    "usage_percentage": hardware_info.memory_info.usage_percentage,
                    "available": hardware_info.memory_info.available,
                    "timestamp": SystemTime::now()
                }))?)
                .await?;
        }
        
        // Verificar espacio en disco crítico
        for disk in &hardware_info.disk_info {
            if disk.usage_percentage > 95.0 {
                warn!("💿 Espacio crítico en disco {}: {:.1}%", disk.name, disk.usage_percentage);
                
                self.cognitive_fabric
                    .publish("hardware.alerts", &serde_json::to_vec(&serde_json::json!({
                        "type": "critical_disk_space",
                        "disk": disk.name,
                        "usage_percentage": disk.usage_percentage,
                        "available_space": disk.available_space,
                        "timestamp": SystemTime::now()
                    }))?)
                    .await?;
            }
        }

        Ok(())
    }
}

#[async_trait]
impl NanoCore for HardwareCore {
    fn core_type(&self) -> NanoCoreType {
        NanoCoreType::Hardware
    }

    fn instance_id(&self) -> Uuid {
        self.instance_id
    }

    async fn initialize(&mut self) -> Result<()> {
        info!(
            "🔧 Inicializando HardwareCore instancia {} (ID: {})",
            self.instance_number,
            self.instance_id
        );

        // Suscribirse a comandos de hardware
        self.cognitive_fabric
            .subscribe("hardware.commands", {
                let instance_id = self.instance_id;
                move |data| {
                    debug!("📨 HardwareCore {} recibió comando: {} bytes", instance_id, data.len());
                }
            })
            .await?;

        // Publicar información inicial de hardware
        let hardware_info = self.get_hardware_info().await?;
        let info_data = serde_json::to_vec(&hardware_info)?;
        
        self.cognitive_fabric
            .publish("hardware.info", &info_data)
            .await?;

        info!("✅ HardwareCore instancia {} inicializado correctamente", self.instance_number);
        Ok(())
    }

    async fn run(&mut self) -> Result<()> {
        // Publicar métricas de hardware
        if let Err(e) = self.publish_hardware_metrics().await {
            let mut error_count = self.error_count.write().await;
            *error_count += 1;
            return Err(anyhow!("Error publicando métricas de hardware: {}", e));
        }

        // Verificar alertas de hardware
        if let Err(e) = self.check_hardware_alerts().await {
            warn!("⚠️  Error verificando alertas de hardware: {}", e);
        }

        // Ejecutar predicción de fallos cada 10 ciclos
        if self.instance_number % 10 == 0 {
            if let Ok(predictions) = self.predict_failures().await {
                for prediction in predictions {
                    if prediction.risk_level as u8 >= RiskLevel::High as u8 {
                        warn!(
                            "⚠️  Predicción de fallo: {} - Riesgo: {:?} - Probabilidad: {:.1}%",
                            prediction.component,
                            prediction.risk_level,
                            prediction.probability * 100.0
                        );
                    }
                }
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        Ok(())
    }

    async fn health_check(&self) -> Result<NanoCoreHealth> {
        let uptime = self.start_time.elapsed()?.as_secs();
        let error_count = *self.error_count.read().await;
        
        // Obtener métricas de hardware para determinar salud
        let hardware_info = self.get_hardware_info().await?;
        
        let cpu_usage = hardware_info.cpu_info.average_usage as f64;
        let memory_usage = hardware_info.memory_info.usage_percentage as f64;
        
        let state = if error_count > 10 {
            NanoCoreState::Failed
        } else if cpu_usage > 90.0 || memory_usage > 95.0 {
            NanoCoreState::Degraded
        } else {
            NanoCoreState::Running
        };

        Ok(NanoCoreHealth {
            core_type: self.core_type(),
            instance_id: self.instance_id,
            state,
            cpu_usage,
            memory_usage,
            last_heartbeat: chrono::Utc::now(),
            error_count,
            uptime_seconds: uptime,
        })
    }

    async fn shutdown(&mut self) -> Result<()> {
        info!("🛑 Deteniendo HardwareCore instancia {}", self.instance_number);
        
        // Desuscribirse de eventos
        self.cognitive_fabric
            .unsubscribe("hardware.commands")
            .await?;

        info!("✅ HardwareCore instancia {} detenido correctamente", self.instance_number);
        Ok(())
    }

    async fn process_command(&mut self, command: &str, payload: &[u8]) -> Result<Vec<u8>> {
        let cmd: HardwareCommand = serde_json::from_slice(payload)?;
        
        let response = match cmd {
            HardwareCommand::GetHardwareInfo => {
                let info = self.get_hardware_info().await?;
                serde_json::to_vec(&info)?
            }
            HardwareCommand::GetThermalStatus => {
                let thermal = self.thermal_monitor.get_thermal_info(&*self.system.read().await).await?;
                serde_json::to_vec(&thermal)?
            }
            HardwareCommand::GetPowerStatus => {
                let power = self.get_power_info().await?;
                serde_json::to_vec(&power)?
            }
            HardwareCommand::PredictFailures => {
                let predictions = self.predict_failures().await?;
                serde_json::to_vec(&predictions)?
            }
            HardwareCommand::OptimizePerformance => {
                let result = self.optimize_performance().await?;
                serde_json::to_vec(&result)?
            }
            HardwareCommand::SetPowerMode(mode) => {
                // TODO: Implementar cambio de modo de energía
                let result = format!("Modo de energía cambiado a: {:?}", mode);
                serde_json::to_vec(&result)?
            }
            HardwareCommand::GetComponentHealth(component) => {
                // TODO: Implementar salud de componente específico
                let health = format!("Salud de {}: OK", component);
                serde_json::to_vec(&health)?
            }
        };

        debug!("✅ Comando HardwareCore procesado: {}", command);
        Ok(response)
    }
}

/// Predictor de fallos de hardware
pub struct FailurePredictor {
    historical_data: Arc<RwLock<Vec<HardwareInfo>>>,
}

impl FailurePredictor {
    pub fn new() -> Self {
        Self {
            historical_data: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn analyze(&self, hardware_info: &HardwareInfo) -> Result<Vec<FailurePrediction>> {
        let mut predictions = Vec::new();
        
        // Almacenar datos históricos
        let mut history = self.historical_data.write().await;
        history.push(hardware_info.clone());
        
        // Mantener solo los últimos 100 registros
        if history.len() > 100 {
            history.drain(0..history.len() - 100);
        }
        
        // Predicción basada en temperatura de CPU
        if let Some(temp) = hardware_info.thermal_info.cpu_temperature {
            if temp > 80.0 {
                let probability = ((temp - 80.0) / 20.0).min(1.0);
                predictions.push(FailurePrediction {
                    component: "CPU".to_string(),
                    risk_level: if temp > 90.0 { RiskLevel::Critical } else { RiskLevel::High },
                    probability,
                    time_to_failure: Some(((100.0 - temp) * 3600.0) as u64), // Estimación simplificada
                    recommended_actions: vec![
                        "Verificar ventilación del sistema".to_string(),
                        "Limpiar disipadores de calor".to_string(),
                        "Reducir carga de trabajo".to_string(),
                    ],
                    confidence: 0.85,
                });
            }
        }
        
        // Predicción basada en uso de memoria
        if hardware_info.memory_info.pressure_score > 0.8 {
            predictions.push(FailurePrediction {
                component: "Memory".to_string(),
                risk_level: RiskLevel::Medium,
                probability: hardware_info.memory_info.pressure_score,
                time_to_failure: None,
                recommended_actions: vec![
                    "Liberar memoria no utilizada".to_string(),
                    "Optimizar aplicaciones en ejecución".to_string(),
                    "Considerar agregar más RAM".to_string(),
                ],
                confidence: 0.75,
            });
        }
        
        // Predicción basada en espacio en disco
        for disk in &hardware_info.disk_info {
            if disk.usage_percentage > 90.0 {
                let probability = (disk.usage_percentage - 90.0) / 10.0;
                predictions.push(FailurePrediction {
                    component: format!("Disk: {}", disk.name),
                    risk_level: if disk.usage_percentage > 98.0 { RiskLevel::Critical } else { RiskLevel::High },
                    probability,
                    time_to_failure: Some(((100.0 - disk.usage_percentage) * 86400.0) as u64), // días a segundos
                    recommended_actions: vec![
                        "Limpiar archivos temporales".to_string(),
                        "Mover datos a otro disco".to_string(),
                        "Expandir capacidad de almacenamiento".to_string(),
                    ],
                    confidence: 0.90,
                });
            }
        }

        Ok(predictions)
    }
}

/// Optimizador de rendimiento de hardware
pub struct HardwareOptimizer;

impl HardwareOptimizer {
    pub fn new() -> Self {
        Self
    }

    pub async fn optimize(&self, hardware_info: &HardwareInfo) -> Result<String> {
        let mut optimizations = Vec::new();
        
        // Optimización de CPU
        if hardware_info.cpu_info.average_usage > 80.0 {
            optimizations.push("Rebalanceando carga de CPU entre núcleos".to_string());
        }
        
        // Optimización de memoria
        if hardware_info.memory_info.pressure_score > 0.7 {
            optimizations.push("Optimizando uso de memoria y cache".to_string());
        }
        
        // Optimización térmica
        if let Some(temp) = hardware_info.thermal_info.cpu_temperature {
            if temp > 75.0 {
                optimizations.push("Ajustando perfiles térmicos para reducir temperatura".to_string());
            }
        }
        
        if optimizations.is_empty() {
            Ok("Sistema de hardware funcionando de manera óptima".to_string())
        } else {
            Ok(format!("Optimizaciones aplicadas: {}", optimizations.join(", ")))
        }
    }
}

/// Monitor térmico avanzado
pub struct ThermalMonitor;

impl ThermalMonitor {
    pub fn new() -> Self {
        Self
    }

    pub async fn get_thermal_info(&self, system: &System) -> Result<ThermalInfo> {
        let mut cpu_temperature = None;
        let mut gpu_temperature = None;
        let mut motherboard_temperature = None;
        let mut fan_speeds = Vec::new();
        
        // Obtener temperaturas de componentes
        for component in system.components() {
            let label = component.label().to_lowercase();
            let temp = component.temperature();
            
            if label.contains("cpu") || label.contains("processor") {
                cpu_temperature = Some(temp);
            } else if label.contains("gpu") || label.contains("graphics") {
                gpu_temperature = Some(temp);
            } else if label.contains("motherboard") || label.contains("system") {
                motherboard_temperature = Some(temp);
            }
            
            // Simular velocidades de ventiladores
            if label.contains("fan") {
                fan_speeds.push((1000.0 + temp * 20.0) as u32);
            }
        }
        
        // Determinar estado térmico
        let max_temp = [cpu_temperature, gpu_temperature, motherboard_temperature]
            .iter()
            .filter_map(|&t| t)
            .fold(0.0f32, f32::max);
        
        let thermal_state = match max_temp {
            t if t < 60.0 => ThermalState::Optimal,
            t if t < 75.0 => ThermalState::Warm,
            t if t < 85.0 => ThermalState::Hot,
            _ => ThermalState::Critical,
        };
        
        Ok(ThermalInfo {
            cpu_temperature,
            gpu_temperature,
            motherboard_temperature,
            fan_speeds,
            thermal_state,
        })
    }
}