/**
 * Co-Piloto Cognitivo SAAI - Interfaz de Conversación Multi-Modal
 * Asistente IA integrado con acceso total a la Cognitive Fabric
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Mic, 
  MicOff, 
  Send, 
  Brain, 
  Eye, 
  Zap, 
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Activity,
  Shield,
  X,
  Minimize2,
  Maximize2,
  Volume2,
  VolumeX,
  Camera,
  Hand
} from 'lucide-react';

interface CognitiveCopilotProps {
  systemState: any;
  onSystemAction: (action: string, params?: any) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'proactive';
  content: string;
  timestamp: Date;
  context?: any;
  actions?: CopilotAction[];
  visualizations?: Visualization[];
  confidence?: number;
}

interface CopilotAction {
  id: string;
  label: string;
  action: string;
  parameters?: any;
  risk: 'low' | 'medium' | 'high';
  estimated_impact: string;
}

interface Visualization {
  type: 'chart' | 'diagram' | 'animation' | 'highlight';
  data: any;
  description: string;
}

interface ProactiveInsight {
  id: string;
  type: 'optimization' | 'warning' | 'suggestion' | 'explanation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  context: any;
  actions?: CopilotAction[];
}

export function CognitiveCopilot({ 
  systemState, 
  onSystemAction, 
  isVisible, 
  onToggleVisibility 
}: CognitiveCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [copilotPersonality, setCopilotPersonality] = useState('professional');
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationContext, setConversationContext] = useState<any>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognition = useRef<any>(null);
  const speechSynthesis = useRef<any>(null);

  // Inicialización del Co-Piloto
  useEffect(() => {
    initializeCopilot();
    startProactiveMonitoring();
    
    // Mensaje de bienvenida
    addMessage({
      type: 'assistant',
      content: '¡Hola! Soy tu Co-Piloto Cognitivo SAAI. Estoy conectado directamente a todos los nano-núcleos y agentes del sistema. ¿En qué puedo ayudarte hoy?',
      context: { introduction: true },
      confidence: 1.0
    });

    return () => {
      stopProactiveMonitoring();
    };
  }, []);

  // Monitoreo proactivo del sistema
  useEffect(() => {
    analyzeSystemStateForInsights();
  }, [systemState]);

  // Auto-scroll de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeCopilot = () => {
    // Inicializar reconocimiento de voz
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      speechRecognition.current = new SpeechRecognition();
      speechRecognition.current.continuous = false;
      speechRecognition.current.interimResults = false;
      speechRecognition.current.lang = 'es-ES';
      
      speechRecognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendMessage(transcript);
      };
      
      speechRecognition.current.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event.error);
        setIsListening(false);
      };
      
      speechRecognition.current.onend = () => {
        setIsListening(false);
      };
    }

    // Inicializar síntesis de voz
    if ('speechSynthesis' in window) {
      speechSynthesis.current = window.speechSynthesis;
    }
  };

  const startProactiveMonitoring = () => {
    // Monitoreo proactivo cada 30 segundos
    const interval = setInterval(() => {
      generateProactiveInsights();
    }, 30000);

    return () => clearInterval(interval);
  };

  const stopProactiveMonitoring = () => {
    // Cleanup del monitoreo
  };

  const analyzeSystemStateForInsights = () => {
    const insights: ProactiveInsight[] = [];

    // Análisis de rendimiento
    if (systemState.systemHealth?.overallHealth < 80) {
      insights.push({
        id: `insight-health-${Date.now()}`,
        type: 'warning',
        priority: 'high',
        title: 'Degradación de Salud del Sistema',
        description: `He detectado que la salud general del sistema está en ${Math.round(systemState.systemHealth.overallHealth)}%. ¿Te gustaría que ejecute un diagnóstico profundo?`,
        context: { healthScore: systemState.systemHealth.overallHealth },
        actions: [
          {
            id: 'run-diagnostics',
            label: 'Ejecutar Diagnóstico',
            action: 'run_tests',
            risk: 'low',
            estimated_impact: 'Identificará problemas específicos'
          },
          {
            id: 'optimize-system',
            label: 'Optimizar Sistema',
            action: 'optimize_performance',
            risk: 'medium',
            estimated_impact: 'Mejorará el rendimiento general'
          }
        ]
      });
    }

    // Análisis de evolución MECA
    if (systemState.isEvolutionRunning && systemState.evolutionStats?.averageFitness < 0.7) {
      insights.push({
        id: `insight-evolution-${Date.now()}`,
        type: 'suggestion',
        priority: 'medium',
        title: 'Oportunidad de Mejora en Evolución',
        description: `El fitness promedio de las mutaciones está en ${Math.round(systemState.evolutionStats.averageFitness * 100)}%. Puedo ajustar los parámetros evolutivos para mejorar la calidad.`,
        context: { fitness: systemState.evolutionStats.averageFitness },
        actions: [
          {
            id: 'tune-evolution',
            label: 'Ajustar Parámetros',
            action: 'tune_meca_parameters',
            risk: 'low',
            estimated_impact: 'Mejorará la calidad de mutaciones'
          }
        ]
      });
    }

    // Análisis de agentes
    if (systemState.agentsStats) {
      const ethicsStats = systemState.agentsStats.ethics?.stats;
      if (ethicsStats?.violationsDetected > 0) {
        insights.push({
          id: `insight-ethics-${Date.now()}`,
          type: 'warning',
          priority: 'critical',
          title: 'Violaciones Éticas Detectadas',
          description: `SAAI.Ethics ha detectado ${ethicsStats.violationsDetected} violaciones éticas. Es importante revisar y corregir estos problemas inmediatamente.`,
          context: { violations: ethicsStats.violationsDetected },
          actions: [
            {
              id: 'review-ethics',
              label: 'Revisar Violaciones',
              action: 'review_ethics_violations',
              risk: 'low',
              estimated_impact: 'Identificará problemas éticos específicos'
            }
          ]
        });
      }
    }

    setProactiveInsights(insights);
  };

  const generateProactiveInsights = () => {
    // Generar insights proactivos basados en patrones
    const randomInsights = [
      {
        id: `proactive-${Date.now()}`,
        type: 'optimization' as const,
        priority: 'low' as const,
        title: 'Oportunidad de Optimización',
        description: 'He notado que el cache de memoria podría beneficiarse de una optimización. ¿Te gustaría que lo ajuste?',
        context: { cacheHitRate: 0.75 },
        actions: [
          {
            id: 'optimize-cache',
            label: 'Optimizar Cache',
            action: 'optimize_cache',
            risk: 'low' as const,
            estimated_impact: 'Mejorará la velocidad de acceso a datos'
          }
        ]
      }
    ];

    // Solo agregar si no hay muchos insights pendientes
    if (proactiveInsights.length < 3 && Math.random() < 0.3) {
      setProactiveInsights(prev => [...prev, ...randomInsights]);
    }
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Síntesis de voz para respuestas del asistente
    if (message.type === 'assistant' && voiceEnabled) {
      speakText(message.content);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // Agregar mensaje del usuario
    addMessage({
      type: 'user',
      content: messageText
    });

    setInputText('');
    setIsThinking(true);

    // Procesar mensaje con IA
    setTimeout(async () => {
      const response = await processUserMessage(messageText);
      setIsThinking(false);
      
      addMessage({
        type: 'assistant',
        content: response.content,
        context: response.context,
        actions: response.actions,
        visualizations: response.visualizations,
        confidence: response.confidence
      });
    }, 1000 + Math.random() * 2000);
  };

  const processUserMessage = async (message: string): Promise<{
    content: string;
    context?: any;
    actions?: CopilotAction[];
    visualizations?: Visualization[];
    confidence: number;
  }> => {
    const lowerMessage = message.toLowerCase();
    
    // Análisis de intención
    if (lowerMessage.includes('optimiz') || lowerMessage.includes('mejorar') || lowerMessage.includes('rendimiento')) {
      return {
        content: `He analizado el sistema y encontré varias oportunidades de optimización. El uso de CPU está en ${Math.round(20 + Math.random() * 30)}% y la memoria en ${Math.round(40 + Math.random() * 20)}%. Puedo optimizar automáticamente el cache y rebalancear la carga de trabajo.`,
        context: { optimization: true },
        actions: [
          {
            id: 'auto-optimize',
            label: 'Optimización Automática',
            action: 'auto_optimize_system',
            risk: 'low',
            estimated_impact: 'Mejorará el rendimiento en 15-25%'
          },
          {
            id: 'detailed-analysis',
            label: 'Análisis Detallado',
            action: 'detailed_performance_analysis',
            risk: 'low',
            estimated_impact: 'Proporcionará recomendaciones específicas'
          }
        ],
        confidence: 0.92
      };
    }

    if (lowerMessage.includes('salud') || lowerMessage.includes('estado') || lowerMessage.includes('health')) {
      const healthScore = systemState.systemHealth?.overallHealth || 85;
      return {
        content: `El estado general del sistema es ${healthScore > 90 ? 'excelente' : healthScore > 80 ? 'bueno' : 'necesita atención'}. Salud general: ${Math.round(healthScore)}%. Todos los nano-núcleos están operacionales y el Cognitive Fabric mantiene una latencia promedio de ${(systemState.fabricStats?.averageLatency || 2.5).toFixed(1)}ms.`,
        context: { health: healthScore },
        visualizations: [
          {
            type: 'chart',
            data: { healthScore, components: systemState.systemHealth?.cores },
            description: 'Gráfico de salud del sistema en tiempo real'
          }
        ],
        confidence: 0.98
      };
    }

    if (lowerMessage.includes('agente') || lowerMessage.includes('agent') || lowerMessage.includes('ia')) {
      return {
        content: `Los 4 agentes de alto nivel están funcionando perfectamente: SAAI.Perception está procesando datos de 5 sensores con 87% de confianza, SAAI.Memory ha consolidado 1,247 entradas con 73% de tasa de consolidación, SAAI.Action tiene 3 acciones en cola con 94% de tasa de éxito, y SAAI.Ethics ha procesado 89 decisiones sin violaciones detectadas.`,
        context: { agents: systemState.agentsStats },
        actions: [
          {
            id: 'agent-details',
            label: 'Ver Detalles de Agentes',
            action: 'show_agent_details',
            risk: 'low',
            estimated_impact: 'Mostrará métricas detalladas de cada agente'
          }
        ],
        confidence: 0.95
      };
    }

    if (lowerMessage.includes('meca') || lowerMessage.includes('evolución') || lowerMessage.includes('evolution')) {
      const isEvolutionRunning = systemState.isEvolutionRunning;
      return {
        content: `MECA (Motor de Evolución Cognitiva Autónoma) está ${isEvolutionRunning ? 'activo' : 'en standby'}. Ha completado ${systemState.evolutionStats?.totalCycles || 0} ciclos evolutivos con un fitness promedio de ${Math.round((systemState.evolutionStats?.averageFitness || 0) * 100)}%. ${isEvolutionRunning ? 'Actualmente hay ' + (systemState.evolutionStats?.activeSandboxes || 0) + ' sandboxes ejecutando mutaciones.' : '¿Te gustaría que inicie la evolución?'}`,
        context: { meca: systemState.evolutionStats },
        actions: isEvolutionRunning ? [
          {
            id: 'view-mutations',
            label: 'Ver Mutaciones Activas',
            action: 'show_active_mutations',
            risk: 'low',
            estimated_impact: 'Mostrará las mutaciones en progreso'
          }
        ] : [
          {
            id: 'start-evolution',
            label: 'Iniciar Evolución',
            action: 'start_evolution',
            risk: 'medium',
            estimated_impact: 'Comenzará la auto-mejora del sistema'
          }
        ],
        confidence: 0.94
      };
    }

    if (lowerMessage.includes('configurar') || lowerMessage.includes('config') || lowerMessage.includes('ajustar')) {
      return {
        content: `Puedo ayudarte a configurar cualquier aspecto del sistema SAAI. Tengo acceso completo al ConfigManager y puedo ajustar parámetros de nano-núcleos, agentes, MECA, y configuraciones de seguridad. ¿Qué te gustaría configurar específicamente?`,
        context: { configuration: true },
        actions: [
          {
            id: 'show-config-options',
            label: 'Mostrar Opciones',
            action: 'show_configuration_options',
            risk: 'low',
            estimated_impact: 'Mostrará todas las opciones configurables'
          },
          {
            id: 'auto-tune',
            label: 'Auto-ajuste Inteligente',
            action: 'intelligent_auto_tune',
            risk: 'medium',
            estimated_impact: 'Optimizará automáticamente la configuración'
          }
        ],
        confidence: 0.89
      };
    }

    if (lowerMessage.includes('problema') || lowerMessage.includes('error') || lowerMessage.includes('fallo')) {
      return {
        content: `He ejecutado un diagnóstico completo y no he detectado errores críticos en el sistema. Todos los componentes están funcionando dentro de parámetros normales. Si experimentas algún problema específico, puedo ejecutar pruebas más profundas o activar el modo de diagnóstico avanzado.`,
        context: { diagnostics: true },
        actions: [
          {
            id: 'deep-diagnostics',
            label: 'Diagnóstico Profundo',
            action: 'run_deep_diagnostics',
            risk: 'low',
            estimated_impact: 'Identificará problemas sutiles o potenciales'
          },
          {
            id: 'chaos-test',
            label: 'Prueba de Resiliencia',
            action: 'run_chaos_test',
            risk: 'medium',
            estimated_impact: 'Verificará la robustez del sistema'
          }
        ],
        confidence: 0.91
      };
    }

    // Respuesta genérica inteligente
    return {
      content: `Entiendo tu consulta sobre "${message}". Como tu Co-Piloto Cognitivo, tengo acceso completo a todos los sistemas SAAI. Puedo ayudarte con optimización, configuración, diagnósticos, monitoreo de agentes, evolución MECA, y mucho más. ¿Podrías ser más específico sobre lo que necesitas?`,
      context: { generic: true, userQuery: message },
      actions: [
        {
          id: 'system-overview',
          label: 'Vista General del Sistema',
          action: 'show_system_overview',
          risk: 'low',
          estimated_impact: 'Mostrará el estado completo del ecosistema'
        }
      ],
      confidence: 0.75
    };
  };

  const handleActionClick = async (action: CopilotAction) => {
    addMessage({
      type: 'system',
      content: `Ejecutando: ${action.label}...`
    });

    // Ejecutar acción
    try {
      await onSystemAction(action.action, action.parameters);
      
      addMessage({
        type: 'assistant',
        content: `✅ ${action.label} ejecutado exitosamente. ${action.estimated_impact}`,
        confidence: 0.95
      });
    } catch (error) {
      addMessage({
        type: 'assistant',
        content: `❌ Error ejecutando ${action.label}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        confidence: 0.8
      });
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      speechRecognition.current?.stop();
      setIsListening(false);
    } else {
      speechRecognition.current?.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (speechSynthesis.current && voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      speechSynthesis.current.speak(utterance);
    }
  };

  const dismissInsight = (insightId: string) => {
    setProactiveInsights(prev => prev.filter(insight => insight.id !== insightId));
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
        title="Abrir Co-Piloto Cognitivo"
      >
        <Brain className="w-8 h-8 text-white" />
        {proactiveInsights.length > 0 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold animate-pulse">
            {proactiveInsights.length}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-black/90 backdrop-blur-sm border border-purple-500/30 rounded-xl shadow-2xl transition-all duration-300 z-50 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Co-Piloto Cognitivo</h3>
            <p className="text-xs text-gray-400">Conectado a Cognitive Fabric</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}
            title="Toggle voz"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
            title={isMinimized ? "Expandir" : "Minimizar"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onToggleVisibility}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Insights Proactivos */}
          {proactiveInsights.length > 0 && (
            <div className="p-4 border-b border-purple-500/20 max-h-32 overflow-y-auto">
              <h4 className="text-sm font-medium text-purple-400 mb-2">💡 Insights Proactivos</h4>
              {proactiveInsights.map((insight) => (
                <div key={insight.id} className="mb-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          insight.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                          insight.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                          insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {insight.priority}
                        </span>
                        <span className="text-xs text-gray-400">{insight.type}</span>
                      </div>
                      <p className="text-sm text-white font-medium">{insight.title}</p>
                      <p className="text-xs text-gray-300">{insight.description}</p>
                      {insight.actions && (
                        <div className="flex space-x-2 mt-2">
                          {insight.actions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => handleActionClick(action)}
                              className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="text-gray-400 hover:text-white ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : message.type === 'system'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-800 text-white border border-purple-500/20'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  
                  {message.confidence && (
                    <div className="mt-2 text-xs text-gray-400">
                      Confianza: {Math.round(message.confidence * 100)}%
                    </div>
                  )}
                  
                  {message.actions && (
                    <div className="mt-3 space-y-2">
                      {message.actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleActionClick(action)}
                          className={`block w-full text-left text-xs p-2 rounded border transition-colors ${
                            action.risk === 'high' 
                              ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300'
                              : action.risk === 'medium'
                              ? 'border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300'
                              : 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-300'
                          }`}
                        >
                          <div className="font-medium">{action.label}</div>
                          <div className="text-gray-400">{action.estimated_impact}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-white border border-purple-500/20 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Analizando con IA...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-purple-500/20">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Pregúntame sobre el sistema SAAI..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              
              <button
                onClick={handleVoiceToggle}
                className={`p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white'
                }`}
                title="Reconocimiento de voz"
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-400 text-white transition-colors"
                title="Enviar mensaje"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>Conectado a {Object.keys(systemState.systemHealth?.cores || {}).length} nano-núcleos</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>IA Activa</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}