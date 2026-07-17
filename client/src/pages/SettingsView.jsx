import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Moon, Sun, Zap, Palette, Bell, Save, X, Terminal, Shield, Printer, RefreshCw, Check, AlertTriangle, Wifi, WifiOff, Lock, EyeOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PermissionsConfig from '../components/PermissionsConfig';
import { useNotification } from '../context/NotificationContext';
import { enqueueTicket } from '../utils/printer';
import { networkStatus, NetworkState } from '../offline/network/networkStatus';

const SettingsView = () => {
    const { user } = useAuth();
    const { theme, changeTheme, showAlerts, setShowAlerts } = useTheme();
    const navigate = useNavigate();
    const { showToast } = useNotification();

    // Local state to handle Settings unsaved changes
    const [localShowAlerts, setLocalShowAlerts] = useState(showAlerts);
    const hasChanges = localShowAlerts !== showAlerts;

    // Printer settings state
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [testingPrint, setTestingPrint] = useState(false);
    const [stations, setStations] = useState(['Caja']);
    const [selectedStation, setSelectedStation] = useState('Caja');
    const [printerSizes, setPrinterSizes] = useState({});
    const [printerProfiles, setPrinterProfiles] = useState({});
    const [serverOnline, setServerOnline] = useState(false);
    const [discoveredDevices, setDiscoveredDevices] = useState([]);
    const [repairHistory, setRepairHistory] = useState([]);
    const [auditTicketEnabled, setAuditTicketEnabled] = useState(false);
    const [now, setNow] = useState(Date.now());

    // ─── Estado de modo de red manual ─────────────────────────────────────────
    const [netOverride, setNetOverride] = useState(networkStatus.isManualOverride());
    const [netState, setNetState] = useState(networkStatus.getStatus());

    // ─── Estado de impresoras ocultadas temporalmente ──────────────────────────
    const [hiddenPrinterNames, setHiddenPrinterNames] = useState(new Set());

    // ─── Estado de visualización del historial de reparaciones ─────────────────
    const [showRepairHistory, setShowRepairHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('bunker_show_repair_history');
            return saved !== null ? saved === 'true' : true;
        } catch {
            return true;
        }
    });

    const handleToggleRepairHistory = () => {
        setShowRepairHistory(prev => {
            const next = !prev;
            try {
                localStorage.setItem('bunker_show_repair_history', String(next));
            } catch { /* ignore */ }
            return next;
        });
    };

    const handleHidePrinter = (pName) => {
        setHiddenPrinterNames(prev => {
            const next = new Set(prev);
            next.add(pName);
            return next;
        });
        showToast(`Impresora "${pName}" ocultada de la vista.`, 'info');
    };

    useEffect(() => {
        return networkStatus.subscribe((state) => {
            setNetState(state);
            setNetOverride(networkStatus.isManualOverride());
        });
    }, []);

    const handleToggleOfflineMode = useCallback(() => {
        const isCurrentlyOnline = netState === NetworkState.ONLINE;
        if (isCurrentlyOnline) {
            networkStatus.setManualOverride(NetworkState.OFFLINE_CONFIRMED);
            showToast('Modo Offline activado. El sistema operará con la base de datos local.', 'info');
        } else {
            networkStatus.setManualOverride(NetworkState.ONLINE);
            showToast('Modo Online activado. Conectado al backend en tiempo real.', 'success');
        }
    }, [netState, showToast]);
    // ──────────────────────────────────────────────────────────────────────────

    const isAnyPrinterRepairing = Array.isArray(printers) && printers.some(p => p.ultimoEstado === 'RECOVERING');

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const loadStations = async () => {
        try {
            const res = await fetch('/api/impresoras/estaciones');
            if (res.ok) {
                const list = await res.json();
                setStations(list);
            }
        } catch (err) {
            console.error("Error al cargar estaciones:", err);
        }
    };

    const loadPrintersData = async (station = selectedStation) => {
        try {
            // Fetch local station server heartbeat status
            const serverRes = await fetch(`/api/recovery/estado-estacion?estacion=${station}`);
            if (serverRes.ok) {
                const sData = await serverRes.json();
                setServerOnline(sData.enLinea || false);
            }

            // Fetch active printer for selected station
            const activeRes = await fetch(`/api/impresoras/activa?estacion=${station}`);
            if (activeRes.ok) {
                const activeData = await activeRes.json();
                setSelectedPrinter(activeData.nombre || '');
            }

            // Fetch available/linked printers for selected station
            const listRes = await fetch(`/api/impresoras?estacion=${station}`);
            if (listRes.ok) {
                const list = await listRes.json();
                setPrinters(list);
            }

            // Fetch printer sizes mapping for selected station
            const sizesRes = await fetch(`/api/impresoras/medidas?estacion=${station}`);
            if (sizesRes.ok) {
                const sizesData = await sizesRes.json();
                setPrinterSizes(sizesData || {});
            }

            // Fetch printer profiles mapping for selected station
            const profilesRes = await fetch(`/api/impresoras/perfiles?estacion=${station}`);
            if (profilesRes.ok) {
                const profilesData = await profilesRes.json();
                setPrinterProfiles(profilesData || {});
            }

            // Fetch discovered devices (not yet linked)
            const discRes = await fetch(`/api/recovery/descubiertos?estacion=${station}`);
            if (discRes.ok) {
                const discData = await discRes.json();
                setDiscoveredDevices(discData || []);
            }

            // Fetch repair history
            const histRes = await fetch(`/api/recovery/historial?estacion=${station}`);
            if (histRes.ok) {
                const histData = await histRes.json();
                setRepairHistory(histData || []);
            }

            // Fetch audit ticket printing config
            const auditConfRes = await fetch('/api/configuracion/imprimir_ticket_auditoria_recovery');
            if (auditConfRes.ok) {
                const auditConfData = await auditConfRes.json();
                setAuditTicketEnabled(auditConfData.valor === 'true');
            }
        } catch (err) {
            console.error("Error al cargar impresoras y dispositivos:", err);
        }
    };

    const handleSavePrinterProfile = async (printerName, profile) => {
        try {
            const res = await fetch('/api/impresoras/perfil', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    impresora: printerName,
                    perfil: profile,
                    estacion: selectedStation
                })
            });
            if (res.ok) {
                setPrinterProfiles(prev => ({
                    ...prev,
                    [printerName]: profile
                }));
                showToast(`Perfil ${profile} guardado para la impresora "${printerName}".`, 'success');
            } else {
                throw new Error("Error en servidor");
            }
        } catch (err) {
            showToast(`Error al guardar perfil: ${err.message}`, 'error');
        }
    };

    const handleLinkDevice = async (device) => {
        try {
            const res = await fetch('/api/recovery/vincular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: `Epson Ethernet (${device.ip})`,
                    estacion: selectedStation,
                    ip: device.ip,
                    mac: device.mac,
                    perfil: 'Generic',
                    medida: '80mm'
                })
            });
            if (res.ok) {
                showToast("Dispositivo Ethernet vinculado correctamente.", "success");
                loadPrintersData(selectedStation);
            } else {
                throw new Error("Fallo en el servidor");
            }
        } catch (err) {
            showToast(`Error al vincular: ${err.message}`, "error");
        }
    };

    const handleUnlinkDevice = async (deviceId) => {
        try {
            const res = await fetch('/api/recovery/desvincular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId })
            });
            if (res.ok) {
                showToast("Dispositivo desvinculado con éxito.", "success");
                loadPrintersData(selectedStation);
            } else {
                throw new Error("Fallo en el servidor");
            }
        } catch (err) {
            showToast(`Error al desvincular: ${err.message}`, "error");
        }
    };

    const handleRequestRecovery = async (deviceId) => {
        try {
            const res = await fetch('/api/recovery/solicitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, estacion: selectedStation })
            });
            if (res.ok) {
                showToast("Iniciando auto-recuperación de la impresora...", "info");
                // Update local state to RECOVERING immediately
                setPrinters(prev => prev.map(p => p.id === deviceId ? { ...p, ultimoEstado: 'RECOVERING' } : p));
                
                // Poll for completion (e.g. status changes from RECOVERING to ONLINE/OFFLINE/ERROR)
                let attempts = 0;
                const pollInterval = setInterval(async () => {
                    attempts++;
                    const listRes = await fetch(`/api/impresoras?estacion=${selectedStation}`);
                    if (listRes.ok) {
                        const list = await listRes.json();
                        const dev = list.find(d => d.id === deviceId);
                        if (dev && dev.ultimoEstado !== 'RECOVERING') {
                            clearInterval(pollInterval);
                            setPrinters(list);
                            if (dev.ultimoEstado === 'ONLINE') {
                                showToast("¡Conexión de la impresora restablecida con éxito!", "success");
                            } else if (dev.ultimoEstado === 'ERROR') {
                                showToast("Impresora conectada, pero falla el diagnóstico de impresión.", "warning");
                            } else {
                                showToast("No se pudo localizar el dispositivo en la red local.", "error");
                            }
                            // Refresh history
                            const histRes = await fetch(`/api/recovery/historial?estacion=${selectedStation}`);
                            if (histRes.ok) {
                                const histData = await histRes.json();
                                setRepairHistory(histData || []);
                            }
                        }
                    }
                    if (attempts >= 10) {
                        clearInterval(pollInterval);
                        loadPrintersData(selectedStation);
                    }
                }, 1500);
            } else {
                throw new Error("Fallo en el servidor");
            }
        } catch (err) {
            showToast(`Error al solicitar recuperación: ${err.message}`, "error");
        }
    };

    const handleToggleAuditTicket = async () => {
        try {
            const nextValue = !auditTicketEnabled;
            const res = await fetch('/api/configuracion/imprimir_ticket_auditoria_recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valor: nextValue ? 'true' : 'false' })
            });
            if (res.ok) {
                setAuditTicketEnabled(nextValue);
                showToast(`Ticket de diagnóstico de auditoría ${nextValue ? 'activado' : 'desactivado'}.`, "success");
            }
        } catch (err) {
            showToast(`Error al configurar ticket de auditoría: ${err.message}`, "error");
        }
    };

    const handleSavePrinterSize = async (printerName, size) => {
        try {
            const res = await fetch('/api/impresoras/medida', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    impresora: printerName,
                    medida: size,
                    estacion: selectedStation
                })
            });
            if (res.ok) {
                setPrinterSizes(prev => ({
                    ...prev,
                    [printerName]: size
                }));
                showToast(`Medida ${size} guardada para la impresora "${printerName}".`, 'success');
            } else {
                throw new Error("Error en servidor");
            }
        } catch (err) {
            showToast(`Error al guardar medida: ${err.message}`, 'error');
        }
    };

    useEffect(() => {
        loadStations();
        loadPrintersData('Caja');
    }, []);

    useEffect(() => {
        if (isScanning || isAnyPrinterRepairing) return;
        
        const interval = setInterval(() => {
            loadPrintersData(selectedStation);
        }, 7000);
        
        return () => clearInterval(interval);
    }, [selectedStation, isScanning, isAnyPrinterRepairing]);

    const handleStationChange = (station) => {
        setSelectedStation(station);
        loadPrintersData(station);
    };

    const handleSelectPrinter = async (name) => {
        try {
            const res = await fetch('/api/impresoras/seleccionar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: name, estacion: selectedStation })
            });
            if (res.ok) {
                setSelectedPrinter(name);
                showToast(`Impresora "${name}" seleccionada como activa para la estación "${selectedStation}".`, 'success');
            } else {
                throw new Error("Error en servidor");
            }
        } catch (err) {
            showToast(`Error al seleccionar impresora: ${err.message}`, 'error');
        }
    };

    const handleRefreshPrinters = async () => {
        setIsScanning(true);
        try {
            const res = await fetch('/api/impresoras/solicitar-actualizacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estacion: selectedStation })
            });
            if (!res.ok) throw new Error("Error de conexión");

            showToast(`Solicitando escaneo de impresoras a la estación "${selectedStation}"...`, 'info');

            // Comprobar estado de solicitud (polling de 10s máximo)
            let attempts = 0;
            const interval = setInterval(async () => {
                attempts++;
                try {
                    const statusRes = await fetch(`/api/impresoras/estado-solicitud?estacion=${selectedStation}`);
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        if (!statusData.solicitando) {
                            clearInterval(interval);
                            await loadPrintersData(selectedStation);
                            setIsScanning(false);
                            // Restaurar visualización de todas las impresoras al actualizar
                            setHiddenPrinterNames(new Set());
                            showToast(`Lista de impresoras de la estación "${selectedStation}" actualizada con éxito.`, 'success');
                        }
                    }
                } catch (e) {
                    console.error("Error comprobando estado:", e);
                }

                if (attempts >= 10) { // 10 intentos * 1.5s = 15s total
                    clearInterval(interval);
                    setIsScanning(false);
                    showToast(`La estación "${selectedStation}" no respondió. Verifique que el servidor local esté ejecutándose en esa PC.`, 'warning');
                }
            }, 1500);
        } catch (err) {
            setIsScanning(false);
            showToast(`Error al solicitar escaneo: ${err.message}`, 'error');
        }
    };

    const handleTestPrint = async () => {
        if (!selectedPrinter) {
            showToast('Seleccione una impresora activa primero.', 'warning');
            return;
        }
        setTestingPrint(true);
        try {
            const testContent = {
                type: 'precuenta',
                total: 0,
                totalLetras: 'cero soles y 00/100 céntimos',
                items: [
                    { nombre: `Prueba en estación: ${selectedStation}`, precio: 0, cantidad: 1 }
                ]
            };
            await enqueueTicket('TEST', user?.nombre || 'Mozo', testContent, selectedStation);
            showToast(`Ticket de prueba encolado para la estación "${selectedStation}".`, 'success');
        } catch (err) {
            showToast(`Error al imprimir: ${err.message}`, 'error');
        } finally {
            setTestingPrint(false);
        }
    };

    useEffect(() => {
        // Sync local state if global context changes externally
        setLocalShowAlerts(showAlerts);
    }, [showAlerts]);

    const handleSave = () => {
        setShowAlerts(localShowAlerts);
        // Confirmation is implicit as buttons will fade out
    };

    const handleCancel = () => {
        setLocalShowAlerts(showAlerts); // Revert to context state
    };

    const themes = [
        {
            id: 'theme-orange',
            name: 'Naranja Warm',
            description: 'Acento naranja vibrante con fondo oscuro premium.',
            icon: <Palette size={24} />,
            color: '#0d0e15',
            border: '#f97316'
        },
        {
            id: 'theme-green',
            name: 'Esmeralda',
            description: 'Tono verde esmeralda para una estética equilibrada.',
            icon: <Zap size={24} />,
            color: '#05100b',
            border: '#10b981'
        },
        {
            id: 'theme-blue',
            name: 'Zafiro Azul',
            description: 'Azul zafiro elegante y profesional.',
            icon: <Moon size={24} />,
            color: '#020617',
            border: '#3b82f6'
        },
        {
            id: 'theme-red',
            name: 'Carmesí Red',
            description: 'Rojo carmesí enérgico y moderno.',
            icon: <Palette size={24} />,
            color: '#0a0505',
            border: '#ef4444'
        },
        {
            id: 'theme-black',
            name: 'Minimal Dark',
            description: 'Diseño monocromático limpio y de alto contraste.',
            icon: <Terminal size={24} />,
            color: '#000000',
            border: '#ffffff'
        }
    ];

    return (
        <div className="fade-in" style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
                <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ margin: 0 }}>Ajustes</h1>
                    <p className="text-muted" style={{ margin: 0 }}>Personaliza tu experiencia en Bunker</p>
                </div>
            </div>

            {user?.rol === 'admin' && <PermissionsConfig />}

            <section className="glass-panel" style={{ padding: 30 }}>
                <h2 style={{ marginBottom: 20 }}>Temas y Apariencia</h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 20
                }}>
                    {themes.map(t => (
                        <div
                            key={t.id}
                            onClick={() => changeTheme(t.id)}
                            style={{
                                cursor: 'pointer',
                                background: t.color,
                                border: `2px solid ${theme === t.id ? 'var(--primary)' : t.border}`,
                                borderRadius: 16,
                                padding: 20,
                                position: 'relative',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                transform: theme === t.id ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: theme === t.id ? '0 10px 30px -10px var(--primary)' : 'none'
                            }}
                        >
                            <div style={{
                                color: theme === t.id ? 'var(--primary)' : (t.id === 'light' ? '#333' : '#fff'),
                                marginBottom: 15
                            }}>
                                {t.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.2rem',
                                marginBottom: 5,
                                color: t.id === 'light' ? '#0f172a' : '#fff'
                            }}>
                                {t.name}
                            </h3>
                            <p style={{
                                fontSize: '0.9rem',
                                margin: 0,
                                opacity: 0.7,
                                color: t.id === 'light' ? '#64748b' : '#94a3b8'
                            }}>
                                {t.description}
                            </p>

                            {theme === t.id && (
                                <div className="text-on-primary" style={{
                                    position: 'absolute',
                                    top: 10,
                                    right: 10,
                                    background: 'var(--primary)',
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                }}>
                                    ACTIVO
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── SECCIÓN: MODO DE OPERACIÓN ─────────────────────────────────── */}
            <section className="glass-panel" style={{ padding: 30, marginTop: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <Wifi size={20} color="var(--primary)" />
                    <h2 style={{ margin: 0 }}>Modo de Operación</h2>
                </div>

                {/* Estado actual */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 16px', borderRadius: 10, marginBottom: 20,
                    background: netState === NetworkState.ONLINE
                        ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${netState === NetworkState.ONLINE ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                }}>
                    {netState === NetworkState.ONLINE
                        ? <Wifi size={18} color="#10b981" />
                        : <WifiOff size={18} color="#ef4444" />
                    }
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: netState === NetworkState.ONLINE ? '#10b981' : '#ef4444' }}>
                        {netState === NetworkState.ONLINE ? 'MODO ONLINE — Conectado al servidor en tiempo real' : 'MODO OFFLINE — Trabajando con base de datos local'}
                    </span>
                </div>

                {/* Toggle principal de modo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'rgba(0,0,0,0.1)', borderRadius: 12, border: '1px solid var(--glass-border)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wifi size={18} color={netState === NetworkState.ONLINE ? '#10b981' : '#ef4444'} />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem' }}>Forzar Modo Offline</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {netState === NetworkState.ONLINE
                                    ? 'Activa el modo offline para realizar pruebas o operar sin internet.'
                                    : 'El modo offline está activo. Desactívalo para volver al modo online.'}
                            </p>
                        </div>
                    </div>
                    {/* Toggle switch */}
                    <div
                        onClick={handleToggleOfflineMode}
                        title={netState === NetworkState.ONLINE ? 'Activar Modo Offline' : 'Desactivar Modo Offline'}
                        style={{
                            width: 50, height: 28, borderRadius: 14,
                            background: netState !== NetworkState.ONLINE ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                            cursor: 'pointer', position: 'relative',
                            transition: 'background 0.3s ease', flexShrink: 0
                        }}
                    >
                        <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 2,
                            left: netState !== NetworkState.ONLINE ? 24 : 2,
                            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                </div>

                <p style={{ margin: '16px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong>💡 Nota:</strong> La auto-detección y pings automáticos de red están deshabilitados. El sistema permanecerá en el modo seleccionado de forma persistente hasta que lo cambies de nuevo aquí.
                </p>
            </section>

            <section className="glass-panel" style={{ padding: 30, marginTop: 30 }}>
                <h2 style={{ marginBottom: 20 }}>Preferencias de Interfaz</h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'rgba(0,0,0,0.1)', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Bell size={20} color="var(--primary)" />
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Mostrar Alertas de Stock</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Muestra un panel lateral cuando detecta insumos agotándose.</p>
                        </div>
                    </div>

                    {/* Smooth Toggle Switch */}
                    <div
                        onClick={() => setLocalShowAlerts(!localShowAlerts)}
                        style={{
                            width: 50,
                            height: 28,
                            borderRadius: 14,
                            background: localShowAlerts ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.3s ease'
                        }}
                    >
                        <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: 2,
                            left: localShowAlerts ? 24 : 2,
                            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                </div>
            </section>

            <section className="glass-panel" style={{ padding: 30, marginTop: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Printer size={24} color="var(--primary)" />
                        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Administrador de Dispositivos de Impresión</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: serverOnline ? '#10b981' : '#ef4444',
                            display: 'inline-block',
                            animation: serverOnline ? 'pulse 1.5s infinite' : 'none'
                        }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                            Servidor Local: {serverOnline ? 'En línea' : 'Desconectado'}
                        </span>
                    </div>
                </div>

                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 20 }}>
                    Administra impresoras USB y Ethernet, perfiles de hardware, tamaños de papel, diagnósticos y recuperación automática.
                </p>

                {/* Selección de Estación */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 25 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Estación de Impresión:</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {stations.map((st) => (
                            <button
                                key={st}
                                onClick={() => handleStationChange(st)}
                                className="glass-button"
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    background: selectedStation === st ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                    color: selectedStation === st ? '#fff' : 'var(--text-main)',
                                    borderColor: selectedStation === st ? 'var(--primary)' : 'var(--glass-border)',
                                    fontWeight: selectedStation === st ? 'bold' : 'normal',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Paneles de Dispositivos Separados por Interfaz */}
                {printers.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 20 }}>
                        No hay dispositivos vinculados para esta estación. Presiona "Actualizar" para detectar puertos USB locales o escanear impresoras en la red.
                    </p>
                ) : (() => {
                    const usbPrinters = printers.filter(p => {
                        const transport = p.transport || 'USB';
                        const pName = p.nombre || p;
                        return transport === 'USB' && !hiddenPrinterNames.has(pName);
                    });

                    const ethernetPrinters = printers.filter(p => {
                        const transport = p.transport || 'USB';
                        const pName = p.nombre || p;
                        return transport === 'TCP9100' && !hiddenPrinterNames.has(pName);
                    });

                    const renderPrinterCard = (printer, index) => {
                        const pName = printer.nombre || printer;
                        const isSelected = selectedPrinter === pName;
                        const transport = printer.transport || 'USB';
                        const state = printer.ultimoEstado || 'ONLINE';
                        const ip = printer.ultimaIp || '';
                        const mac = printer.mac || '';
                        const latency = printer.ultimaRespuestaMs || 0;

                        const isOnline = state === 'ONLINE';
                        const isOffline = state === 'OFFLINE';
                        const isError = state === 'ERROR';
                        const isRecovering = state === 'RECOVERING';

                        const diagTime = printer.ultimoDiag ? new Date(printer.ultimoDiag).getTime() : 0;
                        const cooldownRemaining = (isOffline && diagTime) ? Math.max(0, Math.ceil((15000 - (now - diagTime)) / 1000)) : 0;
                        const isCooldownActive = cooldownRemaining > 0;

                        // Estilo de borde y fondo del card
                        let cardBorderColor = 'var(--glass-border)';
                        let cardBg = 'rgba(255,255,255,0.01)';
                        if (isSelected) {
                            if (isOnline) {
                                cardBorderColor = '#10b981';
                                cardBg = 'rgba(16, 185, 129, 0.04)';
                            } else if (isOffline) {
                                cardBorderColor = '#ef4444';
                                cardBg = 'rgba(239, 68, 68, 0.04)';
                            } else if (isError) {
                                cardBorderColor = '#f59e0b';
                                cardBg = 'rgba(245, 158, 11, 0.04)';
                            } else if (isRecovering) {
                                cardBorderColor = '#3b82f6';
                                cardBg = 'rgba(59, 130, 246, 0.04)';
                            }
                        }

                        return (
                            <div
                                key={pName || index}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    padding: '16px 20px',
                                    background: cardBg,
                                    border: `1px solid ${cardBorderColor}`,
                                    borderRadius: 12,
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div
                                    onClick={() => handleSelectPrinter(pName)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <Printer size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                                            <span style={{
                                                fontSize: '0.95rem',
                                                fontWeight: isSelected ? 'bold' : 'normal',
                                                color: 'var(--text-main)'
                                            }}>
                                                {pName}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: 'rgba(255,255,255,0.06)',
                                                color: 'var(--text-muted)',
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                fontWeight: '600'
                                            }}>
                                                {transport === 'USB' ? 'USB' : 'ETHERNET'}
                                            </span>
                                        </div>
                                        {transport === 'TCP9100' && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                IP: <strong style={{ color: 'var(--text-main)' }}>{ip}</strong> | MAC: <strong style={{ color: 'var(--text-main)' }}>{mac}</strong> {isOnline && `| Latencia: ${latency}ms`}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                                        {/* Badges de Estado */}
                                        {isOnline && (
                                            <span style={{ background: '#10b981', color: '#fff', padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                🟢 CONECTADA
                                            </span>
                                        )}
                                        {isOffline && (
                                            <span style={{ background: '#ef4444', color: '#fff', padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                🔴 SIN CONEXIÓN
                                            </span>
                                        )}
                                        {isError && (
                                            <span style={{ background: '#f59e0b', color: '#fff', padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                🟡 NO OPERATIVA
                                            </span>
                                        )}
                                        {isRecovering && (
                                            <span style={{ background: '#3b82f6', color: '#fff', padding: '3px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <RefreshCw size={10} className="animate-spin" /> REPARANDO...
                                            </span>
                                        )}

                                        {/* Botones de acción específicos */}
                                        {transport === 'TCP9100' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {!isRecovering && (
                                                    <button
                                                        onClick={() => handleRequestRecovery(printer.id)}
                                                        disabled={isScanning || isAnyPrinterRepairing || isCooldownActive}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.04)',
                                                            border: '1px solid var(--glass-border)',
                                                            color: isCooldownActive ? 'var(--text-muted)' : 'var(--primary)',
                                                            padding: '4px 10px',
                                                            borderRadius: 6,
                                                            fontSize: '0.75rem',
                                                            cursor: isCooldownActive ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold',
                                                            opacity: (isScanning || isAnyPrinterRepairing || isCooldownActive) ? 0.5 : 1
                                                        }}
                                                    >
                                                        {isCooldownActive ? `Espera ${cooldownRemaining}s` : 'Reparar'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleUnlinkDevice(printer.id)}
                                                    disabled={isScanning || isAnyPrinterRepairing}
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        color: '#f87171',
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        opacity: (isScanning || isAnyPrinterRepairing) ? 0.5 : 1
                                                    }}
                                                >
                                                    Desvincular
                                                </button>
                                            </div>
                                        )}

                                        {/* Ocultar temporalmente */}
                                        <button
                                            onClick={() => handleHidePrinter(pName)}
                                            title="Ocultar de la vista"
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid var(--glass-border)',
                                                color: 'var(--text-muted)',
                                                padding: '5px 7px',
                                                borderRadius: 6,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                outline: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = '#ef4444';
                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'var(--text-muted)';
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                            }}
                                        >
                                            <EyeOff size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Selector de Medida de Papel y Perfil (Solo si el dispositivo está ACTIVO) */}
                                {isSelected && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                                        {/* Selector de Ancho */}
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                width: '100%'
                                            }}
                                        >
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Ancho de impresión:
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {['80mm', '58mm', '50mm'].map((size) => {
                                                    const currentSize = printerSizes[pName] || '80mm';
                                                    const isSizeActive = currentSize === size;
                                                    return (
                                                        <button
                                                            key={size}
                                                            onClick={() => handleSavePrinterSize(pName, size)}
                                                            style={{
                                                                padding: '4px 12px',
                                                                borderRadius: 6,
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                background: isSizeActive ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                                                color: isSizeActive ? '#fff' : 'var(--text-muted)',
                                                                border: `1px solid ${isSizeActive ? 'var(--primary)' : 'var(--glass-border)'}`,
                                                                fontWeight: isSizeActive ? 'bold' : 'normal',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            {size}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Selector de Perfil */}
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                width: '100%',
                                                marginTop: 4
                                            }}
                                        >
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Perfil de Hardware:
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {['Generic', 'SPRT', 'Epson', 'Xprinter', 'Rongta'].map((profile) => {
                                                    const currentProfile = printerProfiles[pName] || 'Generic';
                                                    const isProfileActive = currentProfile === profile;
                                                    return (
                                                        <button
                                                            key={profile}
                                                            onClick={() => handleSavePrinterProfile(pName, profile)}
                                                            style={{
                                                                padding: '4px 10px',
                                                                borderRadius: 6,
                                                                fontSize: '0.75rem',
                                                                cursor: 'pointer',
                                                                background: isProfileActive ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                                                color: isProfileActive ? '#fff' : 'var(--text-muted)',
                                                                border: `1px solid ${isProfileActive ? 'var(--primary)' : 'var(--glass-border)'}`,
                                                                fontWeight: isProfileActive ? 'bold' : 'normal',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            {profile === 'Generic' ? 'Genérico' : profile}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    };

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 25, marginBottom: 20 }}>
                            {/* Panel Impresoras USB (Windows) */}
                            <div className="glass-panel" style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', borderRadius: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        🔌 Impresoras USB (Windows)
                                    </h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {usbPrinters.length} dispositivo(s)
                                    </span>
                                </div>
                                {usbPrinters.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '10px 0' }}>
                                        No hay impresoras USB visibles.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {usbPrinters.map((p, idx) => renderPrinterCard(p, idx))}
                                    </div>
                                )}
                            </div>

                            {/* Panel Impresoras Ethernet (Red) */}
                            <div className="glass-panel" style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', borderRadius: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10 }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        📡 Impresoras Ethernet (Red Directa)
                                    </h4>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {ethernetPrinters.length} dispositivo(s)
                                    </span>
                                </div>
                                {ethernetPrinters.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '10px 0' }}>
                                        No hay impresoras Ethernet visibles en la subred.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {ethernetPrinters.map((p, idx) => renderPrinterCard(p, idx))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Sección de Dispositivos Ethernet Descubiertos en Red */}
                {discoveredDevices.length > 0 && (
                    <div style={{ marginTop: 25, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            📡 Dispositivos Ethernet Descubiertos en Red:
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {discoveredDevices.map((dev, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 15px',
                                        background: 'rgba(255,255,255,0.01)',
                                        border: '1px dashed var(--glass-border)',
                                        borderRadius: 8
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                            Impresora Ethernet ({dev.ip})
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            MAC: {dev.mac} | Latencia: {dev.latency}ms
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleLinkDevice(dev)}
                                        disabled={isScanning || isAnyPrinterRepairing}
                                        style={{
                                            background: 'var(--primary)',
                                            border: '1px solid var(--primary)',
                                            color: '#fff',
                                            padding: '4px 12px',
                                            borderRadius: 6,
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            opacity: (isScanning || isAnyPrinterRepairing) ? 0.5 : 1
                                        }}
                                    >
                                        Vincular a Estación
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Historial de Recuperaciones */}
                {repairHistory.length > 0 && (
                    <div style={{ marginTop: 25, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                🔄 Historial de Reparaciones (Búnker Auto Recovery):
                            </h3>
                            <button
                                onClick={handleToggleRepairHistory}
                                title={showRepairHistory ? "Ocultar Historial" : "Mostrar Historial"}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 4,
                                    borderRadius: 4,
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                {showRepairHistory ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {showRepairHistory && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {repairHistory.map((hist, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            background: 'rgba(16, 185, 129, 0.02)',
                                            border: '1px solid rgba(16, 185, 129, 0.1)',
                                            borderRadius: 8
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
                                                ✅ Recuperación Exitosa
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                IP: {hist.ipAnterior} ➔ {hist.nuevaIp} ({hist.motivo})
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>
                                                {(hist.tiempoMs / 1000).toFixed(2)}s
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                {new Date(hist.creadoA).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Acciones del Administrador */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, paddingTop: 15, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: 15 }}>
                        <button
                            onClick={handleRefreshPrinters}
                            disabled={isScanning || isAnyPrinterRepairing}
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: '0.85rem',
                                padding: '10px 20px',
                                cursor: 'pointer',
                                opacity: (isScanning || isAnyPrinterRepairing) ? 0.5 : 1,
                                borderColor: 'var(--primary)',
                                color: 'var(--primary)'
                            }}
                        >
                            <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
                            <span>{isScanning ? 'Actualizando...' : 'Actualizar'}</span>
                        </button>

                        {selectedPrinter && (
                            <button
                                onClick={handleTestPrint}
                                disabled={testingPrint || isScanning || isAnyPrinterRepairing}
                                className="glass-button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: '0.85rem',
                                    padding: '10px 20px',
                                    cursor: 'pointer',
                                    opacity: (testingPrint || isScanning || isAnyPrinterRepairing) ? 0.5 : 1
                                }}
                            >
                                <Printer size={16} />
                                <span>{testingPrint ? 'Enviando...' : 'Imprimir Ticket de Prueba'}</span>
                            </button>
                        )}
                    </div>

                    {/* Checkbox Configurable de Auditoría */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            onClick={handleToggleAuditTicket}
                            style={{
                                background: auditTicketEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${auditTicketEnabled ? '#10b981' : 'var(--glass-border)'}`,
                                color: auditTicketEnabled ? '#10b981' : 'var(--text-muted)',
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {auditTicketEnabled ? '🧾 Ticket de Auditoría: ON' : '🧾 Ticket de Auditoría: OFF'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Floating Action Bar (Fades in if there are unsaved changes) */}
            <div style={{
                position: 'fixed',
                bottom: hasChanges ? 30 : -100,
                left: '50%',
                transform: 'translateX(-50%)',
                opacity: hasChanges ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'var(--panel-bg)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)',
                padding: '15px 25px',
                borderRadius: 50,
                display: 'flex',
                gap: 15,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                pointerEvents: hasChanges ? 'auto' : 'none',
                zIndex: 1000
            }}>
                <button
                    className="glass-button"
                    onClick={handleCancel}
                    style={{ borderColor: 'transparent', color: 'var(--text-muted)' }}
                >
                    <X size={18} /> Cancelar
                </button>
                <button
                    className="glass-button primary"
                    onClick={handleSave}
                    style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }}
                >
                    <Save size={18} /> Guardar Cambios
                </button>
            </div>
        </div>
    );
};

export default SettingsView;
