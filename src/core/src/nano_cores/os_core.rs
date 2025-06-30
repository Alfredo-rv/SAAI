//! Nano-Core.OS - Abstracción del Sistema Operativo
//! 
//! Proporciona una interfaz unificada para interactuar con el sistema operativo
//! independientemente de la plataforma (Windows, Linux, macOS, Android, iOS).

use anyhow::{Result, anyhow};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{System, SystemExt, CpuExt, ProcessExt};
use tokio::sync::RwLock;
use tracing::{debug, info, warn};
use uuid::Uuid;

use crate::communication::CognitiveFabric;
use crate::metrics::MetricsCollector;
use crate::nano_cores::{NanoCore, NanoCoreType, NanoCoreState, NanoCoreHealth};

/// Información del sistema operativo
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OSInfo {
    pub name: String,
    pub version: String,
    pub architecture: String,
    pub hostname: String,
    pub uptime_seconds: u64,
    pub boot_time: u64,
}

/// Información de procesos
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_usage: u64,
    pub status: String,
}

/// Información de recursos del sistema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemResources {
    pub cpu_count: usize,
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    pub available_memory: u64,
    pub total_swap: u64,
    pub used_swap: u64,
    pub load_average: [f64; 3], // 1min, 5min, 15min
}

/// Comandos soportados por OSCore
#[derive(Debug, Serialize, Deserialize)]
pub enum OSCommand {
    GetSystemInfo,
    GetProcessList,
    GetSystemResources,
    KillProcess(u32),
    SetProcessPriority(u32, i32),
    GetEnvironmentVariable(String),
    SetEnvironmentVariable(String, String),
}

/// Nano-Core para abstracción del sistema operativo
pub struct OSCore {
    instance_id: Uuid,
    cognitive_fabric: Arc<CognitiveFabric>,
    metrics: Arc<MetricsCollector>,
    instance_number: usize,
    system: Arc<RwLock<System>>,
    start_time: SystemTime,
    error_count: Arc<RwLock<u64>>,
}

impl OSCore {
    /// Crear nueva instancia de OSCore
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
        })
    }

    /// Obtener información del sistema operativo
    async fn get_system_info(&self) -> Result<OSInfo> {
        let system = self.system.read().await;
        
        Ok(OSInfo {
            name: system.name().unwrap_or_else(|| "Unknown".to_string()),
            version: system.os_version().unwrap_or_else(|| "Unknown".to_string()),
            architecture: std::env::consts::ARCH.to_string(),
            hostname: system.host_name().unwrap_or_else(|| "Unknown".to_string()),
            uptime_seconds: system.uptime(),
            boot_time: system.boot_time(),
        })
    }

    /// Obtener lista de procesos
    async fn get_process_list(&self) -> Result<Vec<ProcessInfo>> {
        let mut system = self.system.write().await;
        system.refresh_processes();
        
        let processes: Vec<ProcessInfo> = system
            .processes()
            .iter()
            .map(|(pid, process)| ProcessInfo {
                pid: pid.as_u32(),
                name: process.name().to_string(),
                cpu_usage: process.cpu_usage(),
                memory_usage: process.memory(),
                status: format!("{:?}", process.status()),
            })
            .collect();
        
        Ok(processes)
    }

    /// Obtener recursos del sistema
    async fn get_system_resources(&self) -> Result<SystemResources> {
        let mut system = self.system.write().await;
        system.refresh_cpu();
        system.refresh_memory();
        
        let cpu_usage = system.global_cpu_info().cpu_usage();
        let load_avg = system.load_average();
        
        Ok(SystemResources {
            cpu_count: system.cpus().len(),
            cpu_usage,
            total_memory: system.total_memory(),
            used_memory: system.used_memory(),
            available_memory: system.available_memory(),
            total_swap: system.total_swap(),
            used_swap: system.used_swap(),
            load_average: [load_avg.one, load_avg.five, load_avg.fifteen],
        })
    }

    /// Terminar un proceso
    async fn kill_process(&self, pid: u32) -> Result<bool> {
        #[cfg(unix)]
        {
            use nix::sys::signal::{self, Signal};
            use nix::unistd::Pid;
            
            match signal::kill(Pid::from_raw(pid as i32), Signal::SIGTERM) {
                Ok(()) => {
                    info!("🔪 Proceso {} terminado exitosamente", pid);
                    Ok(true)
                }
                Err(e) => {
                    warn!("⚠️  Error terminando proceso {}: {}", pid, e);
                    Ok(false)
                }
            }
        }
        
        #[cfg(windows)]
        {
            // Implementación para Windows usando WinAPI
            warn!("🚧 Terminación de procesos en Windows no implementada aún");
            Ok(false)
        }
    }

    /// Establecer prioridad de proceso
    async fn set_process_priority(&self, pid: u32, priority: i32) -> Result<bool> {
        #[cfg(unix)]
        {
            use nix::unistd::{setpriority, Pid};
            use nix::sys::resource::Priority;
            
            match setpriority(
                nix::sys::resource::PRIO_PROCESS,
                Some(pid),
                Priority(priority)
            ) {
                Ok(()) => {
                    info!("⚖️  Prioridad del proceso {} establecida a {}", pid, priority);
                    Ok(true)
                }
                Err(e) => {
                    warn!("⚠️  Error estableciendo prioridad del proceso {}: {}", pid, e);
                    Ok(false)
                }
            }
        }
        
        #[cfg(windows)]
        {
            warn!("🚧 Establecimiento de prioridad en Windows no implementado aún");
            Ok(false)
        }
    }

    /// Publicar métricas del sistema
    async fn publish_system_metrics(&self) -> Result<()> {
        let resources = self.get_system_resources().await?;
        
        // Publicar métricas en el Cognitive Fabric
        let metrics_data = serde_json::to_vec(&resources)?;
        
        self.cognitive_fabric
            .publish("system.resources", &metrics_data)
            .await?;
        
        // Registrar en el colector de métricas local
        self.metrics
            .record_system_resources(&resources)
            .await;
        
        debug!("📊 Métricas del sistema publicadas");
        Ok(())
    }
}

#[async_trait]
impl NanoCore for OSCore {
    fn core_type(&self) -> NanoCoreType {
        NanoCoreType::OS
    }

    fn instance_id(&self) -> Uuid {
        self.instance_id
    }

    async fn initialize(&mut self) -> Result<()> {
        info!(
            "🔧 Inicializando OSCore instancia {} (ID: {})",
            self.instance_number,
            self.instance_id
        );

        // Suscribirse a comandos del OS
        self.cognitive_fabric
            .subscribe("os.commands", {
                let instance_id = self.instance_id;
                move |data| {
                    debug!("📨 OSCore {} recibió comando: {} bytes", instance_id, data.len());
                }
            })
            .await?;

        // Publicar información inicial del sistema
        let system_info = self.get_system_info().await?;
        let info_data = serde_json::to_vec(&system_info)?;
        
        self.cognitive_fabric
            .publish("system.info", &info_data)
            .await?;

        info!("✅ OSCore instancia {} inicializado correctamente", self.instance_number);
        Ok(())
    }

    async fn run(&mut self) -> Result<()> {
        // Publicar métricas del sistema cada 5 segundos
        if let Err(e) = self.publish_system_metrics().await {
            let mut error_count = self.error_count.write().await;
            *error_count += 1;
            return Err(anyhow!("Error publicando métricas: {}", e));
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        Ok(())
    }

    async fn health_check(&self) -> Result<NanoCoreHealth> {
        let uptime = self.start_time.elapsed()?.as_secs();
        let error_count = *self.error_count.read().await;
        
        // Obtener uso de CPU y memoria del proceso actual
        let mut system = self.system.write().await;
        system.refresh_processes();
        
        let current_pid = std::process::id();
        let (cpu_usage, memory_usage) = if let Some(process) = system.process(sysinfo::Pid::from(current_pid as usize)) {
            (process.cpu_usage() as f64, process.memory() as f64)
        } else {
            (0.0, 0.0)
        };

        let state = if error_count > 10 {
            NanoCoreState::Degraded
        } else if error_count > 0 {
            NanoCoreState::Running
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
        info!("🛑 Deteniendo OSCore instancia {}", self.instance_number);
        
        // Desuscribirse de eventos
        self.cognitive_fabric
            .unsubscribe("os.commands")
            .await?;

        info!("✅ OSCore instancia {} detenido correctamente", self.instance_number);
        Ok(())
    }

    async fn process_command(&mut self, command: &str, payload: &[u8]) -> Result<Vec<u8>> {
        let cmd: OSCommand = serde_json::from_slice(payload)?;
        
        let response = match cmd {
            OSCommand::GetSystemInfo => {
                let info = self.get_system_info().await?;
                serde_json::to_vec(&info)?
            }
            OSCommand::GetProcessList => {
                let processes = self.get_process_list().await?;
                serde_json::to_vec(&processes)?
            }
            OSCommand::GetSystemResources => {
                let resources = self.get_system_resources().await?;
                serde_json::to_vec(&resources)?
            }
            OSCommand::KillProcess(pid) => {
                let result = self.kill_process(pid).await?;
                serde_json::to_vec(&result)?
            }
            OSCommand::SetProcessPriority(pid, priority) => {
                let result = self.set_process_priority(pid, priority).await?;
                serde_json::to_vec(&result)?
            }
            OSCommand::GetEnvironmentVariable(var) => {
                let value = std::env::var(&var).unwrap_or_default();
                serde_json::to_vec(&value)?
            }
            OSCommand::SetEnvironmentVariable(var, value) => {
                std::env::set_var(&var, &value);
                serde_json::to_vec(&true)?
            }
        };

        debug!("✅ Comando OSCore procesado: {}", command);
        Ok(response)
    }
}