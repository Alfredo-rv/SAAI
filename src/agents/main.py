"""
SAAI Agents - Punto de entrada principal
Sistema de Agentes de Alto Nivel para el Ecosistema SAAI
"""

import asyncio
import logging
import signal
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any

import structlog
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agents.perception import PerceptionAgent
from agents.memory import MemoryAgent
from agents.action import ActionAgent
from agents.ethics import EthicsAgent
from communication.cognitive_fabric import CognitiveFabricClient
from config.settings import Settings
from monitoring.metrics import MetricsCollector
from monitoring.health import HealthMonitor

# Configurar logging estructurado
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

class AgentOrchestrator:
    """Orquestador principal de agentes SAAI"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.agents: Dict[str, Any] = {}
        self.cognitive_fabric: CognitiveFabricClient = None
        self.metrics: MetricsCollector = None
        self.health_monitor: HealthMonitor = None
        self.running = False
        
    async def initialize(self):
        """Inicializar todos los componentes del sistema"""
        logger.info("🚀 Inicializando SAAI Agents")
        
        try:
            # Inicializar Cognitive Fabric
            self.cognitive_fabric = CognitiveFabricClient(
                self.settings.nats_url
            )
            await self.cognitive_fabric.connect()
            logger.info("🧠 Cognitive Fabric conectado")
            
            # Inicializar colector de métricas
            self.metrics = MetricsCollector(
                self.settings.metrics_port
            )
            await self.metrics.start()
            logger.info("📊 Colector de métricas iniciado")
            
            # Inicializar monitor de salud
            self.health_monitor = HealthMonitor(
                self.cognitive_fabric,
                self.metrics
            )
            
            # Inicializar agentes
            await self._initialize_agents()
            
            # Iniciar monitor de salud
            await self.health_monitor.start()
            logger.info("❤️  Monitor de salud iniciado")
            
            self.running = True
            logger.info("✅ SAAI Agents completamente inicializado")
            
        except Exception as e:
            logger.error("❌ Error inicializando SAAI Agents", error=str(e))
            raise
    
    async def _initialize_agents(self):
        """Inicializar todos los agentes especializados"""
        logger.info("⚡ Inicializando agentes especializados...")
        
        # SAAI.Perception - Omni-percepción adaptativa
        self.agents['perception'] = PerceptionAgent(
            self.cognitive_fabric,
            self.metrics,
            self.settings.perception
        )
        await self.agents['perception'].initialize()
        logger.info("👁️  SAAI.Perception inicializado")
        
        # SAAI.Memory - Memoria temporal y permanente neuronal
        self.agents['memory'] = MemoryAgent(
            self.cognitive_fabric,
            self.metrics,
            self.settings.memory
        )
        await self.agents['memory'].initialize()
        logger.info("🧠 SAAI.Memory inicializado")
        
        # SAAI.Action - Ejecución ultra-confiable
        self.agents['action'] = ActionAgent(
            self.cognitive_fabric,
            self.metrics,
            self.settings.action
        )
        await self.agents['action'].initialize()
        logger.info("⚡ SAAI.Action inicializado")
        
        # SAAI.Ethics - Gobernanza cuántica
        self.agents['ethics'] = EthicsAgent(
            self.cognitive_fabric,
            self.metrics,
            self.settings.ethics
        )
        await self.agents['ethics'].initialize()
        logger.info("⚖️  SAAI.Ethics inicializado")
        
        # Iniciar bucles de ejecución de agentes
        for agent_name, agent in self.agents.items():
            asyncio.create_task(
                self._run_agent_loop(agent_name, agent)
            )
    
    async def _run_agent_loop(self, agent_name: str, agent):
        """Ejecutar bucle principal de un agente"""
        logger.info(f"🔄 Iniciando bucle de {agent_name}")
        
        while self.running:
            try:
                await agent.process_cycle()
                await asyncio.sleep(0.1)  # 100ms entre ciclos
                
            except Exception as e:
                logger.error(
                    f"❌ Error en bucle de {agent_name}",
                    error=str(e)
                )
                await self.metrics.record_agent_error(agent_name, str(e))
                await asyncio.sleep(1)  # Esperar antes de reintentar
    
    async def shutdown(self):
        """Shutdown graceful del sistema"""
        logger.info("🛑 Iniciando shutdown de SAAI Agents")
        
        self.running = False
        
        # Detener agentes
        for agent_name, agent in self.agents.items():
            try:
                await agent.shutdown()
                logger.info(f"✅ {agent_name} detenido")
            except Exception as e:
                logger.error(f"❌ Error deteniendo {agent_name}", error=str(e))
        
        # Detener servicios
        if self.health_monitor:
            await self.health_monitor.shutdown()
        
        if self.metrics:
            await self.metrics.shutdown()
        
        if self.cognitive_fabric:
            await self.cognitive_fabric.disconnect()
        
        logger.info("✅ SAAI Agents detenido correctamente")
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Obtener estado del sistema"""
        if not self.health_monitor:
            return {"status": "initializing"}
        
        return await self.health_monitor.get_system_status()

# Instancia global del orquestador
orchestrator: AgentOrchestrator = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación"""
    global orchestrator
    
    # Startup
    settings = Settings()
    orchestrator = AgentOrchestrator(settings)
    await orchestrator.initialize()
    
    yield
    
    # Shutdown
    if orchestrator:
        await orchestrator.shutdown()

# Crear aplicación FastAPI
app = FastAPI(
    title="SAAI Agents",
    description="Sistema de Agentes de Alto Nivel para el Ecosistema SAAI",
    version="0.1.0",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Endpoint raíz"""
    return {
        "service": "SAAI Agents",
        "version": "0.1.0",
        "status": "operational",
        "description": "Sistema de Agentes de Alto Nivel para el Ecosistema SAAI"
    }

@app.get("/health")
async def health_check():
    """Endpoint de salud"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Sistema no inicializado")
    
    try:
        status = await orchestrator.get_system_status()
        return JSONResponse(content=status)
    except Exception as e:
        logger.error("❌ Error obteniendo estado de salud", error=str(e))
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@app.get("/agents")
async def list_agents():
    """Listar agentes disponibles"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Sistema no inicializado")
    
    return {
        "agents": list(orchestrator.agents.keys()),
        "count": len(orchestrator.agents)
    }

@app.post("/agents/{agent_name}/command")
async def send_agent_command(agent_name: str, command: Dict[str, Any]):
    """Enviar comando a un agente específico"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Sistema no inicializado")
    
    if agent_name not in orchestrator.agents:
        raise HTTPException(status_code=404, detail=f"Agente {agent_name} no encontrado")
    
    try:
        agent = orchestrator.agents[agent_name]
        result = await agent.process_command(command)
        return {"result": result}
    except Exception as e:
        logger.error(f"❌ Error procesando comando para {agent_name}", error=str(e))
        raise HTTPException(status_code=500, detail="Error procesando comando")

async def signal_handler():
    """Manejador de señales del sistema"""
    logger.info("🛑 Señal de terminación recibida")
    if orchestrator:
        await orchestrator.shutdown()
    sys.exit(0)

def main():
    """Función principal"""
    # Configurar manejadores de señales
    for sig in [signal.SIGTERM, signal.SIGINT]:
        signal.signal(sig, lambda s, f: asyncio.create_task(signal_handler()))
    
    # Configurar logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Ejecutar servidor
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
        reload=False
    )

if __name__ == "__main__":
    main()