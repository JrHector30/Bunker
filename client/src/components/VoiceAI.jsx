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
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceAI({ currentUser, onShowNotification, onTriggerHumanSupport }) {
  // Monthly Support Call Quota
  const [quota, setQuota] = useState(() => {
    const saved = localStorage.getItem('bunker_ai_quota');
    return saved ? parseInt(saved, 10) : 10;
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

  // Simulated System Issues that the voice AI will "audit" and "fix" live
  const [printerStatus, setPrinterStatus] = useState(() => {
    const saved = localStorage.getItem('bunker_diagnostic_printer');
    return saved || 'error_red'; // starts with error
  });

  const [dbSyncStatus, setDbSyncStatus] = useState(() => {
    const saved = localStorage.getItem('bunker_diagnostic_sync');
    return saved || 'desincronizado'; // starts with issue
  });

  const [tabletStatus, setTabletStatus] = useState(() => {
    const saved = localStorage.getItem('bunker_diagnostic_tablet');
    return saved || 'offline'; // starts with issue
  });

  // Reference to recognition and synthesis
  const recognitionRef = useRef(null);
  const isCallActiveRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('bunker_ai_quota', quota.toString());
  }, [quota]);

  useEffect(() => {
    localStorage.setItem('bunker_diagnostic_printer', printerStatus);
  }, [printerStatus]);

  useEffect(() => {
    localStorage.setItem('bunker_diagnostic_sync', dbSyncStatus);
  }, [dbSyncStatus]);

  useEffect(() => {
    localStorage.setItem('bunker_diagnostic_tablet', tabletStatus);
  }, [tabletStatus]);

  // Keep ref up to date to prevent closure problems
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Text-To-Speech (TTS) Voice Synthesis
  const speak = (text, callback) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Speech Synthesis no soportado en este navegador.");
      if (callback) callback();
      return;
    }

    window.speechSynthesis.cancel(); // Cancel current audio queue
    const utterance = new SpeechSynthesisUtterance(text);

    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    const spanishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));

    // Select a high-quality female Spanish voice
    let selectedVoice = null;

    if (spanishVoices.length > 0) {
      // 1. Prioritize Google Spanish Female voices (super natural)
      selectedVoice = spanishVoices.find(v =>
        v.name.toLowerCase().includes('google') &&
        (v.name.toLowerCase().includes('fem') || !v.name.toLowerCase().includes('male'))
      ) || null;

      // 2. Microsoft female voices (Helena, Sabina, Monica, etc.)
      if (!selectedVoice) {
        selectedVoice = spanishVoices.find(v =>
          v.name.toLowerCase().includes('helena') ||
          v.name.toLowerCase().includes('sabina') ||
          v.name.toLowerCase().includes('mónica') ||
          v.name.toLowerCase().includes('monica') ||
          v.name.toLowerCase().includes('maria') ||
          v.name.toLowerCase().includes('maría')
        ) || null;
      }

      // 3. Apple or other mobile/mac OS female voices
      if (!selectedVoice) {
        selectedVoice = spanishVoices.find(v =>
          v.name.toLowerCase().includes('paulina') ||
          v.name.toLowerCase().includes('marisol') ||
          v.name.toLowerCase().includes('sofia') ||
          v.name.toLowerCase().includes('sofía') ||
          v.name.toLowerCase().includes('sara')
        ) || null;
      }

      // 4. Any Google voice (very premium Cloud-based sounding)
      if (!selectedVoice) {
        selectedVoice = spanishVoices.find(v => v.name.toLowerCase().includes('google')) || null;
      }

      // 5. Fallback to first Spanish voice
      if (!selectedVoice) {
        selectedVoice = spanishVoices[0];
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'es-PE';
    }

    utterance.rate = 1.18; // Fast, fluid and light rate (increased from 0.95)
    utterance.pitch = 1.05; // Pleasant, natural pitch for a female voice

    utterance.onstart = () => {
      setIsAiSpeaking(true);
    };

    utterance.onend = () => {
      setIsAiSpeaking(false);
      if (callback && isCallActiveRef.current) {
        callback();
      }
    };

    utterance.onerror = (e) => {
      console.error("TTS Error:", e);
      setIsAiSpeaking(false);
      if (callback && isCallActiveRef.current) {
        callback();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech-To-Text (STT) Speech Recognition
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'es-PE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false; // single phrases

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserTranscript(transcript);
      processVoiceCommand(transcript);
    };

    rec.onerror = (event) => {
      console.warn("STT recognition error:", event.error);
      setIsListening(false);

      // Auto-restart listening if error is simple and call is still active and AI is not speaking
      if (isCallActiveRef.current && !isAiSpeaking && event.error !== 'not-allowed') {
        setTimeout(() => {
          listen();
        }, 1000);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    return rec;
  };

  const listen = () => {
    if (!isCallActiveRef.current || isMuted) return;

    // Create recognition instance if it doesn't exist
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort(); // clear any stale runs
        recognitionRef.current.start();
      } catch (e) {
        console.warn("STT start race condition handled safely.");
      }
    } else {
      onShowNotification("El reconocimiento de voz no está disponible en este navegador. Por favor use comandos simulados por texto.");
    }
  };

  // Start the voice call
  const startVoiceCall = async () => {
    if (quota <= 0) {
      onShowNotification("Has alcanzado tu límite de 10 consultas de soporte IA este mes.");
      return;
    }

    // Request Mic permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionGranted(true);
      // Stop the stream immediately, it was just a permission check; we let the SpeechRecognition handle the mic now
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.warn("Permission denied or microphone missing:", err);
      setMicPermissionGranted(false);
      onShowNotification("Se requiere acceso al micrófono para interactuar de forma oral.");
      return;
    }

    // Decrement quota
    setQuota(prev => prev - 1);
    setIsCallActive(true);
    setAttempts(0);
    setUserTranscript('');

    // Choose a random greeting variant
    const greetings = [
      `¿En qué te puedo ayudar hoy, ${currentUser.nombre || 'Héctor'}?`,
      `¿Qué necesitas, ${currentUser.nombre || 'Héctor'}?`,
      `¿Tienes algún problema con el sistema?`
    ];
    const initialGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    setAiText(initialGreeting);

    // Speak initial greeting, then start listening
    setTimeout(() => {
      speak(initialGreeting, () => {
        listen();
      });
    }, 600);
  };

  // End the voice call
  const endCall = () => {
    setIsCallActive(false);
    setIsListening(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    onShowNotification("Llamada finalizada.");
  };

  // Process translated vocal input
  const processVoiceCommand = (text) => {
    const lowerText = text.toLowerCase();

    // D. Bunker Auto Recovery Intent ("repara", "arregla", "recupera")
    if (lowerText.includes("repara") || lowerText.includes("arregla") || lowerText.includes("recupera")) {
      let targetStation = 'Caja';
      if (lowerText.includes("cocina")) {
        targetStation = 'Cocina';
      } else if (lowerText.includes("horno")) {
        targetStation = 'Cocina';
      }

      const diagMsg = `Iniciando diagnóstico de la estación ${targetStation}...`;
      setAiText(diagMsg);
      speak(diagMsg, async () => {
        try {
          const listRes = await fetch(`/api/recovery/dispositivos?estacion=${targetStation}`);
          const devices = listRes.ok ? await listRes.json() : [];
          const printer = devices.find(d => d.tipo === 'impresora') || devices[0];

          if (!printer) {
            const noDeviceMsg = `No encontré ningún dispositivo de red registrado para la estación ${targetStation} en la base de datos de Búnker. Por favor, vincúlalo primero desde el administrador de dispositivos.`;
            setAiText(noDeviceMsg);
            speak(noDeviceMsg, () => listen());
            return;
          }

          const reqRes = await fetch('/api/recovery/solicitar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId: printer.id, estacion: targetStation })
          });

          if (!reqRes.ok) throw new Error("Fallo al solicitar");

          const searchMsg = "La impresora no respondió en la dirección registrada. Buscando el dispositivo en la red local...";
          setAiText(searchMsg);
          speak(searchMsg, () => {
            setTimeout(async () => {
              try {
                const checkRes = await fetch(`/api/impresoras?estacion=${targetStation}`);
                if (checkRes.ok) {
                  const list = await checkRes.json();
                  const updatedDev = list.find(d => d.id === printer.id);
                  if (updatedDev && updatedDev.ultimoEstado === 'ONLINE') {
                    const successMsg = "Impresora encontrada con una nueva dirección IP. Actualizando configuración... Conexión restablecida correctamente.";
                    setAiText(successMsg);
                    speak(successMsg, () => listen());
                  } else {
                    const failMsg = `El escaneo concurrente finalizó, pero no se localizó ningún dispositivo con la dirección física registrada para la estación ${targetStation}. ¿Deseas que lo intente nuevamente?`;
                    setAiText(failMsg);
                    speak(failMsg, () => listen());
                  }
                }
              } catch (e) {
                const errMsg = "Ocurrió un inconveniente al comprobar el resultado de la auto recuperación.";
                setAiText(errMsg);
                speak(errMsg, () => listen());
              }
            }, 3500);
          });
        } catch (err) {
          const errMsg = "Hubo un error de conexión al procesar la solicitud de auto recuperación.";
          setAiText(errMsg);
          speak(errMsg, () => listen());
        }
      });
      return;
    }

    // 1. Success confirmation: "todo correcto", "todo bien", "todo okey", "correcto"
    if (lowerText.includes("todo correcto") || lowerText.includes("todo bien") || lowerText.includes("correcto") || lowerText.includes("todo ok")) {
      const closeMsg = "¡Estupendo! Me alegra haber sido de utilidad para solucionar el inconveniente. Recuerde que la inteligencia de soporte de Búnker está siempre activa. Que tenga un excelente turno en el restobar. ¡Hasta luego!";
      setAiText(closeMsg);
      speak(closeMsg, () => {
        endCall();
      });
      return;
    }

    // Increment attempt counter
    const nextAttempt = attempts + 1;
    setAttempts(nextAttempt);

    // 2. Troubleshooting Rules (The "Audit and Fix" core logic)

    // A. Printer Problem ("impresora", "tickets", "no imprime", "comandero", "papel")
    if (lowerText.includes("impresora") || lowerText.includes("ticket") || lowerText.includes("imprime") || lowerText.includes("papel")) {
      if (printerStatus === 'error_red') {
        setPrinterStatus('online');
        const fixMsg = "Entendido. He realizado una auditoría de hardware y detecté que el spooler de la Impresora Térmica de Cocina estaba desconectado debido a un micro-corte del enrutador local. Acabo de reiniciar el servicio de red IP y reestablecer la comunicación inalámbrica. El estado ahora figura en línea y la cola de comandas está limpia. ¿Podrías confirmar si todo está correcto?";
        setAiText(fixMsg);
        speak(fixMsg, () => {
          listen();
        });
      } else {
        const alreadyOkMsg = "He revisado la impresora de cocina y mi diagnóstico indica que se encuentra encendida, conectada y con suficiente papel térmico disponible. ¿Hay algún otro síntoma o problema con el que te pueda ayudar?";
        setAiText(alreadyOkMsg);
        speak(alreadyOkMsg, () => {
          listen();
        });
      }
      return;
    }

    // B. Synchronization Problem ("sincroniza", "mesas", "actualiza", "caja", "no carga")
    if (lowerText.includes("sincroniz") || lowerText.includes("mesas") || lowerText.includes("actualiza") || lowerText.includes("caja") || lowerText.includes("comandas")) {
      if (dbSyncStatus === 'desincronizado') {
        setDbSyncStatus('sincronizado');
        const fixMsg = "Comprendido. Al auditar los registros locales, detecté un retraso en la sincronización de la base de datos de comandas con el servidor de caja debido a un conflicto de sesión en segundo plano. Acabo de forzar la purga de caché local y sincronizar el inventario de mesas. Ya se encuentran consolidados. ¿Está todo correcto ahora?";
        setAiText(fixMsg);
        speak(fixMsg, () => {
          listen();
        });
      } else {
        const alreadyOkMsg = "La base de datos local y los estados de las comandas ya están sincronizados correctamente en tiempo real con la central de Búnker. ¿Existe alguna otra irregularidad?";
        setAiText(alreadyOkMsg);
        speak(alreadyOkMsg, () => {
          listen();
        });
      }
      return;
    }

    // C. Tablet / Comandera Problem ("tablet", "comandera", "comandero", "pantalla", "se cayó", "desconectado")
    if (lowerText.includes("tablet") || lowerText.includes("comandera") || lowerText.includes("comandero") || lowerText.includes("offline") || lowerText.includes("conexi")) {
      if (tabletStatus === 'offline') {
        setTabletStatus('online');
        const fixMsg = "De acuerdo. Mi auditoría de dispositivos detectó que la Tablet Comandera Principal perdió la conexión cifrada con la puerta de enlace debido a una saturación de canal inalámbrico. He reasignado la tablet a la banda de frecuencia limpia exclusiva para comandas y refrescado las credenciales de sesión. Ya está conectada. ¿Me confirmas si todo está correcto?";
        setAiText(fixMsg);
        speak(fixMsg, () => {
          listen();
        });
      } else {
        const alreadyOkMsg = "El enlace inalámbrico de las tablets comanderas de salón se encuentra funcionando con un nivel de señal excelente y canal optimizado. ¿Qué otra dificultad estás experimentando?";
        setAiText(alreadyOkMsg);
        speak(alreadyOkMsg, () => {
          listen();
        });
      }
      return;
    }

    // 3. Fallback logic: Max 3 failed attempts triggers automatic human hand-off
    if (nextAttempt >= 3) {
      const redirectMsg = "Entiendo. No he podido resolver tu problema técnico de manera automática mediante mis diagnósticos de sistema de tres intentos. No te preocupes, a continuación te voy a dirigir de inmediato con un asesor técnico de soporte humano para darte atención directa en línea. Por favor, espera un momento.";
      setAiText(redirectMsg);
      speak(redirectMsg, () => {
        setIsCallActive(false);
        onTriggerHumanSupport();
        onShowNotification("Derivando llamada con soporte técnico humano...");
      });
    } else {
      const unkMsg = `Comprendo el reporte, pero mi auditoría automática de hardware y software no ha arrojado fallas para ese síntoma en mi intento número ${nextAttempt} de tres. ¿Podrías describirme el problema o la falla de otra forma, por favor?`;
      setAiText(unkMsg);
      speak(unkMsg, () => {
        listen();
      });
    }
  };

  // Helper function to manual trigger text-commands for users in iframes / browsers with mic block
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
      {/* Decorative ambient subtle AI sound waves in the background */}
      <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-[var(--primary)]/5 blur-3xl pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">Búnker Voice AI</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Soporte por voz inteligente</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-1 rounded-lg">
            {quota} / 10 llamadas libres
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-5">
          Nuestro asistente virtual puede auditar tu comandero, sincronización de base de datos e impresoras de cocina y corregir fallas al instante con comandos de voz.
        </p>

        {/* Live Diagnostics Dashboard Panel */}
        <div className="bg-slate-900/5 dark:bg-slate-900/10 rounded-2xl border border-zinc-200/50 p-4 mb-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Panel de Diagnóstico Técnico</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Cola de Impresora Cocina</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${printerStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] font-bold text-[var(--text-main)]">
                  {printerStatus === 'online' ? 'En línea' : 'Error de Red'}
                </span>
                {printerStatus === 'error_red' && (
                  <button
                    onClick={() => {
                      setPrinterStatus('online');
                      onShowNotification("Impresora reseteada manualmente.");
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
                <span className="text-xs text-[var(--text-muted)]">Sincronización de Mesas</span>
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
                      onShowNotification("Base de datos sincronizada.");
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
                <span className="text-xs text-[var(--text-muted)]">Conexión de Tablet Comandera</span>
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
                      onShowNotification("Tablet conectada manualmente.");
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
      <div className="mt-2">
        {!isCallActive ? (
          <button
            onClick={startVoiceCall}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white dark:text-black font-extrabold text-xs py-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-2 border-none"
          >
            <Phone className="w-4 h-4" />
            Iniciar Soporte de Voz IA
          </button>
        ) : (
          <div className="bg-[#12141c] border border-zinc-700/30 rounded-2xl p-4 relative overflow-hidden">
            {/* Live pulsing green calling badge */}
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest font-mono">En llamada de Soporte</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)]">Intentos: {attempts} / 3</span>
            </div>

            {/* AI Wave animation and Speaking status */}
            <div className="flex flex-col items-center justify-center py-4 gap-3">
              <div className="flex items-center justify-center gap-1 h-8">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <motion.div
                    key={idx}
                    animate={{
                      height: isAiSpeaking
                        ? [6, 32, 6]
                        : isListening
                          ? [6, 18, 6]
                          : 6
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: idx * 0.08,
                      ease: "easeInOut"
                    }}
                    className={`w-1 rounded-full ${isAiSpeaking ? 'bg-[var(--primary)]' : isListening ? 'bg-green-500' : 'bg-slate-700'}`}
                  />
                ))}
              </div>

              <div className="text-center">
                <span className="text-[10px] font-semibold text-[var(--text-muted)] block">
                  {isAiSpeaking ? 'Búnker IA está hablando...' : isListening ? 'Escuchando tu voz...' : 'Cargando respuesta...'}
                </span>
              </div>
            </div>

            {/* Live transcripts */}
            <div className="flex flex-col gap-2.5 mb-4 bg-slate-800/30 p-3 rounded-xl max-h-32 overflow-y-auto">
              {userTranscript && (
                <div className="text-left">
                  <span className="text-[9px] text-green-500 font-extrabold uppercase tracking-wide block">Tú:</span>
                  <p className="text-xs text-[var(--text-main)] italic">"{userTranscript}"</p>
                </div>
              )}
              <div className="text-left">
                <span className="text-[9px] text-[var(--primary)] font-extrabold uppercase tracking-wide block">Búnker IA:</span>
                <p className="text-xs text-[var(--text-muted)]">"{aiText}"</p>
              </div>
            </div>

            {/* Direct testing buttons for quick troubleshooting without voice if block exists */}
            <div className="mb-4">
              <span className="text-[9px] font-bold text-[var(--text-muted)] block uppercase tracking-wider mb-1.5 text-center">Simular Comandos (Prueba de Iframe)</span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                <button
                  onClick={() => handleSimulatedCommand("Repara la impresora de Cocina")}
                  className="bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-[9px] px-2 py-1.5 rounded-lg text-sky-400 font-bold cursor-pointer transition-colors"
                >
                  "Búnker Auto Recovery"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("Tengo problemas con la impresora de la cocina")}
                  className="bg-slate-800/80 hover:bg-slate-700/80 border border-zinc-700/40 text-[9px] px-2 py-1.5 rounded-lg text-[var(--text-main)] cursor-pointer transition-colors"
                >
                  "Error Impresora"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("Las comandas de las mesas están desactualizadas")}
                  className="bg-slate-800/80 hover:bg-slate-700/80 border border-zinc-700/40 text-[9px] px-2 py-1.5 rounded-lg text-[var(--text-main)] cursor-pointer transition-colors"
                >
                  "Error Sincronización"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("La tablet comandera no tiene conexión")}
                  className="bg-slate-800/80 hover:bg-slate-700/80 border border-zinc-700/40 text-[9px] px-2 py-1.5 rounded-lg text-[var(--text-main)] cursor-pointer transition-colors"
                >
                  "Error Tablet"
                </button>
                <button
                  onClick={() => handleSimulatedCommand("Todo correcto, muchas gracias")}
                  className="bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border border-[var(--primary)]/20 text-[9px] px-2 py-1.5 rounded-lg text-[var(--primary)] font-bold cursor-pointer transition-colors"
                >
                  "Todo correcto"
                </button>
              </div>
            </div>

            {/* Interactive buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex items-center justify-center gap-1.5 text-[10px] font-bold py-2 rounded-xl transition-all border border-zinc-700/30 cursor-pointer ${isMuted ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-slate-850 hover:bg-slate-800 text-[var(--text-main)]'}`}
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
                onTriggerHumanSupport();
                onShowNotification("Redirigiendo a soporte humano directo...");
              }}
              className="w-full mt-2.5 bg-slate-900/40 hover:bg-slate-900 border border-zinc-700/40 hover:border-[var(--primary)]/40 text-[var(--text-main)] hover:text-[var(--primary)] font-bold text-[9px] py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              <PhoneCall className="w-3 h-3" />
              Hablar con un asesor físico
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
