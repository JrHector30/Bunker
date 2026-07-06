import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Moon, Sun, Zap, Palette, Bell, Save, X, Terminal, Shield, Printer, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PermissionsConfig from '../components/PermissionsConfig';
import { useNotification } from '../context/NotificationContext';
import { enqueueTicket } from '../utils/printer';

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
            // Fetch active printer for selected station
            const activeRes = await fetch(`/api/impresoras/activa?estacion=${station}`);
            if (activeRes.ok) {
                const activeData = await activeRes.json();
                setSelectedPrinter(activeData.nombre || '');
            }

            // Fetch available printers for selected station
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
        } catch (err) {
            console.error("Error al cargar impresoras:", err);
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Printer size={24} color="var(--primary)" />
                        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Conexión de Impresoras</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: printers.length > 0 ? '#10b981' : '#ef4444',
                            display: 'inline-block'
                        }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                            {printers.length > 0 ? 'Conectado' : 'Desconectado'}
                        </span>
                    </div>
                </div>

                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 20 }}>
                    Permite enviar comandas y arqueos de caja directamente a tus impresoras térmicas.
                </p>

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

                <h3 style={{ fontSize: '1rem', marginBottom: 15 }}>Selecciona la Impresora Activa para esta Estación:</h3>

                {printers.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 20 }}>
                        No se han sincronizado impresoras aún. Asegúrate de ejecutar el servidor local y presionar el botón "Actualizar" para escanear las impresoras de Windows.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {printers.map((printer, index) => {
                            const pName = typeof printer === 'string' ? printer : (printer?.name || '');
                            const isOffline = typeof printer === 'string' ? false : (printer?.offline === true);
                            const isSelected = selectedPrinter === pName;
                            return (
                                <div
                                    key={pName || index}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '12px 20px',
                                        background: isSelected
                                            ? (isOffline ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)')
                                            : 'rgba(255,255,255,0.01)',
                                        border: `1px solid ${isSelected
                                            ? (isOffline ? '#ef4444' : '#10b981')
                                            : 'var(--glass-border)'
                                            }`,
                                        borderRadius: 12,
                                        transition: 'all 0.2s ease',
                                        opacity: isOffline ? 0.6 : 1
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {isOffline ? (
                                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                                    <Printer size={16} color="var(--text-muted)" />
                                                    <AlertTriangle size={10} color="#f59e0b" style={{ position: 'absolute', bottom: -4, right: -4 }} />
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                                    <Printer size={16} color={isSelected ? '#10b981' : 'var(--text-muted)'} />
                                                    {isSelected && <Check size={10} color="#10b981" style={{ position: 'absolute', bottom: -4, right: -4, fontWeight: 'bold' }} />}
                                                </div>
                                            )}
                                            <span style={{
                                                fontSize: '0.9rem',
                                                fontWeight: isSelected ? 'bold' : 'normal',
                                                color: isOffline ? 'var(--text-muted)' : 'var(--text-main)'
                                            }}>
                                                {pName} {isOffline && <span style={{ fontSize: '0.75rem', color: '#f87171', marginLeft: 6 }}>(Sin Conexión)</span>}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <span style={{
                                                background: isOffline ? '#ef4444' : '#10b981',
                                                color: '#fff',
                                                padding: '3px 10px',
                                                borderRadius: 8,
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                {isOffline ? <AlertTriangle size={10} /> : <Check size={10} />}
                                                {isOffline ? 'SIN CONEXIÓN' : 'ACTIVA'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Selector de Medida de Papel (Solo si la impresora está ACTIVA) */}
                                    {isSelected && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginTop: 10,
                                                paddingTop: 10,
                                                borderTop: '1px dashed rgba(255,255,255,0.08)'
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
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 15, marginTop: 15 }}>
                    <button
                        onClick={handleRefreshPrinters}
                        disabled={isScanning}
                        className="glass-button"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.85rem',
                            padding: '10px 20px',
                            cursor: 'pointer',
                            opacity: isScanning ? 0.6 : 1,
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
                            disabled={testingPrint}
                            className="glass-button"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: '0.85rem',
                                padding: '10px 20px',
                                cursor: 'pointer',
                                opacity: testingPrint ? 0.6 : 1
                            }}
                        >
                            <Printer size={16} />
                            <span>{testingPrint ? 'Enviando...' : 'Imprimir Ticket de Prueba'}</span>
                        </button>
                    )}
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
