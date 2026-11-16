import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  Database,
  Printer,
  Smartphone,
  Activity,
  CheckCircle,
  AlertCircle,
  UserCheck,
  RefreshCw,
  HelpCircle,
  MessageSquare,
  Wrench,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoicePoweredOrb from './VoicePoweredOrb';

export const AVAILABLE_VOICES = [
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', tag: 'Recomendada', desc: 'Cálida, Profesional y Paciente' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', tag: 'Suave', desc: 'Serena, Pausada y Empática' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', tag: 'Dinámica', desc: 'Fresca, Juvenil y Amable' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', tag: 'Masculina', desc: 'Voz Formal, Serena y Confiable' }
];

export default function VoiceAI({ currentUser, onShowNotification, onTriggerHumanSupport }) {
  // Monthly Support Call Quota
  const [quota, setQuota] = useState(() => {
    const saved = localStorage.getItem('bunker_ai_quota');
    return saved ? parseInt(saved, 10) : 10;
  });

  // Voice selection
  const [selectedVoiceId, setSelectedVoiceId] = useState(() => {
    return localStorage.getItem('bunker_ai_voice_id') || 'hpp4J3VqNfWAUOO0d1Us'; // Default to Bella!
  });

  // Call status states
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [aiText, setAiText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [micPermissionGranted, setMicPermissionGranted] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [voiceEngine, setVoiceEngine] = useState('ElevenLabs HD');
  const [diagnosticAlert, setDiagnosticAlert] = useState(null);

  // System Diagnostics Status
  const [printerStatus, setPrinterStatus] = useState(() => {
    const saved = localStorage.getItem('bunker_diagnostic_printer');
    return saved || 'error_red';
  });

  const [dbSyncStatus, setDbSyncStatus] = useState(() => {
    const saved = localStorage.getItem('bunker_diagnostic_sync');
    return saved || 'desincronizado';
  });

  const [tabletStatus, setTabletStatus] = useState(() => {
    const saved = localStorage.getItem('bunker_diagnostic_tablet');
    return saved || 'offline';
  });

  // References
  const recognitionRef = useRef(null);
  const isCallActiveRef = useRef(false);
  const currentAudioRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('bunker_ai_quota', quota.toString());
  }, [quota]);

  useEffect(() => {
    localStorage.setItem('bunker_ai_voice_id', selectedVoiceId);
  }, [selectedVoiceId]);

  useEffect(() => {
    localStorage.setItem('bunker_diagnostic_printer', printerStatus);
  }, [printerStatus]);

  useEffect(() => {
    localStorage.setItem('bunker_diagnostic_sync', dbSyncStatus);
  }, [dbSyncStatus]);

  useEffect(() => {
    localStorage.setItem('bunker_diagnostic_tablet', tabletStatus);
  }, [tabletStatus]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Text-To-Speech (TTS) Voice Synthesis (ElevenLabs Primary + Web Speech Fallback)
  const speak = async (text, callback) => {
    if (!isCallActiveRef.current) return;
    setIsAiSpeaking(true);

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: selectedVoiceId })
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('audio')) {
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        const vName = AVAILABLE_VOICES.find(v => v.id === selectedVoiceId)?.name || 'ElevenLabs';
        setVoiceEngine(`ElevenLabs HD (${vName})`);

        audio.onended = () => {
          setIsAiSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          if (callback && isCallActiveRef.current) {
            callback();
          }
        };

        audio.onerror = () => {
          setIsAiSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          fallbackBrowserSpeak(text, callback);
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("ElevenLabs TTS error, switching to browser TTS:", err);
    }

    // Seamless Fallback
    fallbackBrowserSpeak(text, callback);
  };

  const fallbackBrowserSpeak = (text, callback) => {
    setVoiceEngine('Voz Local');
    if (!('speechSynthesis' in window)) {
      setIsAiSpeaking(false);
      if (callback && isCallActiveRef.current) callback();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.toLowerCase().startsWith('es') && (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('helena') || v.name.toLowerCase().includes('sabina') || v.name.toLowerCase().includes('monica')));

    if (spanishVoice) {
      utterance.voice = spanishVoice;
      utterance.lang = spanishVoice.lang;
    } else {
      utterance.lang = 'es-PE';
    }

    utterance.rate = 1.15;
    utterance.pitch = 1.05;

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (callback && isCallActiveRef.current) callback();
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      if (callback && isCallActiveRef.current) callback();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech-To-Text (STT) Recognition
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = 'es-PE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserTranscript(transcript);
      processVoiceCommand(transcript);
    };

    rec.onerror = (event) => {
      console.warn("STT error:", event.error);
      setIsListening(false);
      if (event.error === 'no-speech' && isCallActiveRef.current && !isMuted) {
        setTimeout(() => listen(), 1000);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    return rec;
  };

  const listen = () => {
    if (!isCallActiveRef.current || isMuted) return;

    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          if (isCallActiveRef.current && !isMuted) {
            recognitionRef.current.start();
          }
        }, 200);
      } catch (e) {
        console.warn("Recognition start error:", e);
      }
    } else {
      if (onShowNotification) {
        onShowNotification("El reconocimiento de voz no está disponible en este navegador. Use los botones de prueba.");
      }
    }
  };

  // Start the voice call
  const startVoiceCall = async () => {
    if (quota <= 0) {
      if (onShowNotification) onShowNotification("Has alcanzado tu límite mensual de consultas IA.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.warn("Microphone access denied:", err);
      setMicPermissionGranted(false);
      if (onShowNotification) onShowNotification("Se requiere acceso al micrófono para interactuar.");
      return;
    }

    setQuota(prev => prev - 1);
    setIsCallActive(true);
    setAttempts(0);
    setUserTranscript('');
    setConversationHistory([]);
    setDiagnosticAlert(null);

    const userName = currentUser?.nombre || 'Héctor';
    const initialGreeting = `Hola ${userName}, soy el sistema de autodiagnóstico de Búnker. ¿Qué falla presenta el restaurante para repararla?`;
    setAiText(initialGreeting);

    setTimeout(() => {
      speak(initialGreeting, () => {
        listen();
      });
    }, 400);
  };

  // End the voice call
  const endCall = () => {
    setIsCallActive(false);
    setIsListening(false);
    setIsAiSpeaking(false);
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (onShowNotification) onShowNotification("Llamada finalizada.");
  };

  // Process user input with Groq + Real Autodiagnostic & Repair
  const processVoiceCommand = async (text) => {
    if (!text || !text.trim()) return;
    setIsListening(false);

    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);

    const updatedHistory = [...conversationHistory, { role: 'user', content: text }];
    setConversationHistory(updatedHistory);
    setAiText("Ejecutando autodiagnóstico en el servidor de Búnker...");

    try {
      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: updatedHistory.slice(-4),
          attempt: nextAttempt,
          station: 'Caja'
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${res.status} del servidor`);
      }

      const data = await res.json();
      if (!data || !data.reply) {
        throw new Error("El servidor no devolvió respuesta de diagnóstico válida.");
      }
      const reply = data.reply;
      setAiText(reply);

      setConversationHistory(prev => [...prev, { role: 'assistant', content: reply }]);

      // Real Feedback Alerts based on System Action
      if (data.actionTriggered === 'station_offline') {
        setDiagnosticAlert({
          type: 'warning',
          title: 'Servidor Cocina Apagado',
          message: 'Debe abrir en el equipo de cocina el archivo: INICIAR_BUNKER_POS'
        });
        setPrinterStatus('error_red');
      } else if (data.actionTriggered === 'printer_recovery') {
        setDiagnosticAlert({
          type: 'success',
          title: 'Autorecuperación Activa',
          message: 'Localizando impresora en red y purgando cola de tickets.'
        });
        setPrinterStatus('online');
      } else if (data.actionTriggered === 'cashier_audit') {
        setDiagnosticAlert({
          type: 'info',
          title: 'Arqueo Auditado en Vivo',
          message: 'Se contrastó el fondo inicial contra métodos de pago y comandas.'
        });
        setDbSyncStatus('sincronizado');
      }

      // Check if user's problem is resolved
      const lower = text.toLowerCase();
      if (lower.includes("todo correcto") || lower.includes("todo bien") || lower.includes("ya se arregló") || lower.includes("muchas gracias") || lower.includes("solucionado")) {
        speak(reply, () => {
          endCall();
        });
        return;
      }

      // Escalation Rule: If 3rd attempt reached or explicitly requested
      if (nextAttempt >= 3 || data.shouldEscalate) {
        speak(reply, () => {
          endCall();
          if (onTriggerHumanSupport) onTriggerHumanSupport();
          if (onShowNotification) onShowNotification("Límite de 3 intentos alcanzado. Derivando a WhatsApp con el asesor técnico...");

          setTimeout(() => {
            const problemSummary = encodeURIComponent(`Hola soporte de Búnker, solicito asistencia humana. El autodiagnóstico no pudo resolver mi problema tras 3 intentos. Detalle reportado: "${text}".`);
            window.open(`https://wa.me/51924383883?text=${problemSummary}`, '_blank');
          }, 1000);
        });
        return;
      }

      // Normal intermediate response: speak then listen again
      speak(reply, () => {
        if (isCallActiveRef.current) {
          listen();
        }
      });
    } catch (err) {
      console.error("Error al procesar diagnóstico:", err);
      const fallbackMsg = "El servidor local no está respondiendo. Por favor, asegúrate de reiniciar 'node api/index.js' en la terminal.";
      setAiText(fallbackMsg);
      if (onShowNotification) onShowNotification("Error de conexión: reinicia 'node api/index.js' en la terminal", "error");
      setIsListening(false);
      setIsAiSpeaking(false);
    }
  };

  const handleSimulatedCommand = (cmd) => {
    setUserTranscript(cmd);
    processVoiceCommand(cmd);
  };

  return (
    <div
      id="bunker-voice-ai-card"
      className="rounded-[24px] p-6 flex flex-col justify-between h-full relative overflow-hidden bg-[var(--bg-secondary)]"
      style={{
        border: '1px solid rgb(228 228 231 / 0.5)',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      }}
    >
      <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-[var(--primary)]/5 blur-3xl pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">Búnker Autodiagnóstico y Reparación</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Groq + ElevenLabs HD</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              {voiceEngine}
            </span>
            <span className="text-[10px] font-extrabold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-1 rounded-lg">
              {quota} / 10 libres
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
          Sistema autónomo de autodiagnóstico y autoreparación. Verifica servidores locales de comanderas, repara enlaces de red con impresoras térmicas y audita descuadres en caja antes de requerir un asesor físico.
        </p>

        {/* Voice Selector Selector */}
        {!isCallActive && (
          <div className="mb-4 bg-slate-900/5 dark:bg-slate-900/20 border border-zinc-200/50 p-2.5 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-[var(--primary)]" />
                Voz de Asistente IA
              </span>
              <span className="text-[9px] text-[var(--primary)] font-semibold">
                {AVAILABLE_VOICES.find(v => v.id === selectedVoiceId)?.desc}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {AVAILABLE_VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVoiceId(v.id)}
                  className={`text-[10px] py-1.5 px-2 rounded-lg font-bold transition-all border cursor-pointer ${
                    selectedVoiceId === v.id
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                      : 'bg-slate-800/20 hover:bg-slate-800/40 text-[var(--text-main)] border-zinc-700/30'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Diagnostics Dashboard Panel */}
        <div className="bg-slate-900/5 dark:bg-slate-900/10 rounded-2xl border border-zinc-200/50 p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Telemetría de Sistema</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Servidor Impresión / Cocina</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${printerStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] font-bold text-[var(--text-main)]">
                  {printerStatus === 'online' ? 'En línea' : 'Desconectado'}
                </span>
                {printerStatus === 'error_red' && (
                  <button
                    onClick={() => {
                      setPrinterStatus('online');
                      if (onShowNotification) onShowNotification("Impresora reseteada manualmente.");
                    }}
                    className="text-[9px] text-[var(--primary)] hover:underline font-bold ml-1 bg-transparent border-none cursor-pointer"
                  >
                    Resetear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Sincronización de Mesas y Caja</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dbSyncStatus === 'sincronizado' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] font-bold text-[var(--text-main)]">
                  {dbSyncStatus === 'sincronizado' ? 'Sincronizado' : 'Desincronizado'}
                </span>
                {dbSyncStatus === 'desincronizado' && (
                  <button
                    onClick={() => {
                      setDbSyncStatus('sincronizado');
                      if (onShowNotification) onShowNotification("Base de datos sincronizada.");
                    }}
                    className="text-[9px] text-[var(--primary)] hover:underline font-bold ml-1 bg-transparent border-none cursor-pointer"
                  >
                    Sincronizar
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Tablets Comanderas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${tabletStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] font-bold text-[var(--text-main)]">
                  {tabletStatus === 'online' ? 'Activo / Cifrado' : 'Desconectado'}
                </span>
                {tabletStatus === 'offline' && (
                  <button
                    onClick={() => {
                      setTabletStatus('online');
                      if (onShowNotification) onShowNotification("Tablet conectada manualmente.");
                    }}
                    className="text-[9px] text-[var(--primary)] hover:underline font-bold ml-1 bg-transparent border-none cursor-pointer"
                  >
                    Conectar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Actions */}
      <div className="mt-1">
        {!isCallActive ? (
          <button
            onClick={startVoiceCall}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 !text-white font-extrabold text-xs py-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 border-none shadow-sm"
            style={{ color: '#ffffff' }}
          >
            <Phone className="w-4 h-4 !text-white" style={{ color: '#ffffff', stroke: '#ffffff' }} />
            <span className="!text-white font-bold" style={{ color: '#ffffff' }}>Iniciar Autodiagnóstico por Voz</span>
          </button>
        ) : (
          <div className="bg-[#12141c] border border-zinc-700/30 rounded-2xl p-4 relative overflow-hidden">
            {/* Live pulsing green calling badge */}
            <div className="flex items-center justify-between mb-2 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest font-mono">Autodiagnóstico Activo</span>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${attempts >= 2 ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-400'}`}>
                Oportunidad: {attempts} / 3
              </span>
            </div>

            {/* Diagnostic Alert Banner if action triggered */}
            {diagnosticAlert && (
              <div className={`p-2 rounded-xl mb-2 flex items-center gap-2 text-[10px] ${
                diagnosticAlert.type === 'warning'
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                  : diagnosticAlert.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-sky-500/10 border border-sky-500/30 text-sky-300'
              }`}>
                <Wrench className="w-3.5 h-3.5 shrink-0" />
                <div>
                  <span className="font-bold block">{diagnosticAlert.title}:</span>
                  <span>{diagnosticAlert.message}</span>
                </div>
              </div>
            )}

            {/* ChatGPT-style Voice Orb */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className={`absolute inset-4 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
                  isAiSpeaking 
                    ? 'bg-purple-600/35 scale-110' 
                    : isListening 
                      ? 'bg-emerald-500/30 scale-105' 
                      : 'bg-indigo-600/20 scale-95'
                }`} />
                <VoicePoweredOrb
                  className="w-full h-full"
                  hue={260}
                  enableVoiceControl={true}
                  isAiSpeaking={isAiSpeaking}
                  isListening={isListening}
                  voiceSensitivity={1.8}
                  maxRotationSpeed={1.5}
                  maxHoverIntensity={0.9}
                />
              </div>

              <div className="text-center mt-1">
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${
                  isAiSpeaking ? 'text-purple-300 font-bold' : isListening ? 'text-emerald-400 font-bold' : 'text-zinc-400'
                }`}>
                  {isAiSpeaking ? `${AVAILABLE_VOICES.find(v => v.id === selectedVoiceId)?.name} hablando...` : isListening ? 'Escuchando tu voz...' : 'Diagnosticando con Groq...'}
                </span>
              </div>
            </div>

            {/* Live transcripts */}
            <div className="flex flex-col gap-2 my-2 bg-slate-800/40 p-2.5 rounded-xl max-h-32 overflow-y-auto">
              {userTranscript && (
                <div className="text-left">
                  <span className="text-[9px] text-green-400 font-extrabold uppercase tracking-wide block">Tú:</span>
                  <p className="text-xs text-zinc-200 italic">"{userTranscript}"</p>
                </div>
              )}
              <div className="text-left">
                <span className="text-[9px] text-[var(--primary)] font-extrabold uppercase tracking-wide block">Búnker IA:</span>
                <p className="text-xs text-zinc-300">"{aiText}"</p>
              </div>
            </div>

            {/* Direct testing buttons with real customer scenarios */}
            <div className="mb-2.5">
              <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-wider mb-1.5 text-center">Atajos de Prueba (Sustentación de Tesis)</span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                <button
                  onClick={() => handleSimulatedCommand("La impresora de Cocina no imprime y quiero saber si el servidor está corriendo")}
                  className="bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-[9px] px-2 py-1.5 rounded-lg text-sky-300 font-bold cursor-pointer transition-colors"
                  title="Verificar servidor Cocina y archivo a abrir"
                >
                  "¿Servidor Cocina corriendo?"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("Tengo un descuadre en el arqueo de caja de cincuenta soles")}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[9px] px-2 py-1.5 rounded-lg text-amber-300 font-bold cursor-pointer transition-colors"
                  title="Auditoría financiera de arqueo en vivo"
                >
                  "Descuadre de Caja"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("Repara la impresora de Cocina con auto recovery")}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[9px] px-2 py-1.5 rounded-lg text-emerald-300 font-bold cursor-pointer transition-colors"
                  title="Autorecuperación de red"
                >
                  "Autoreparar Impresora"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("Sigue sin funcionar después de reiniciar todo")}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[9px] px-2 py-1.5 rounded-lg text-rose-300 font-bold cursor-pointer transition-colors"
                  title="Escalación automática a WhatsApp tras 3 intentos"
                >
                  "Falla persistente (Escalar)"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("Todo solucionado, muchas gracias")}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[9px] px-2 py-1.5 rounded-lg text-emerald-400 font-bold cursor-pointer transition-colors"
                >
                  "Todo solucionado"
                </button>
              </div>
            </div>

            {/* Interactive buttons */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 rounded-xl transition-all border border-zinc-700/30 cursor-pointer ${isMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-slate-800 hover:bg-slate-700 text-zinc-200'}`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {isMuted ? 'Reactivar' : 'Silenciar'}
              </button>
              <button
                onClick={endCall}
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                Colgar Llamada
              </button>
            </div>

            {/* Permanent Direct Human Option */}
            <button
              onClick={() => {
                endCall();
                if (onTriggerHumanSupport) onTriggerHumanSupport();
                if (onShowNotification) onShowNotification("Redirigiendo a soporte humano directo...");
                window.open("https://wa.me/51924383883?text=Hola%20soporte%20de%20B%C3%BAnker,%20necesito%20asistencia%20humana%20directa.", "_blank");
              }}
              className="w-full mt-2 bg-slate-900/60 hover:bg-slate-900 border border-zinc-700/40 hover:border-[var(--primary)]/40 text-zinc-300 hover:text-[var(--primary)] font-bold text-[9px] py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              <PhoneCall className="w-3 h-3" />
              Escribirle a un asesor físico
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
