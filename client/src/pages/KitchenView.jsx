import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, ChefHat, Play, Check, Undo, Flame, Volume2, VolumeX } from 'lucide-react';

// Lightweight 1-second ping sound in base64 to avoid needing an external file
const CHIME_SOUND = 'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
// Simplified to use browser's default notification ping or a simple oscillator if needed, but for web standard we will use an Audio constructor.
const playChime = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};

const KitchenTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState('');
    const [alertClass, setAlertClass] = useState('text-muted');

    useEffect(() => {
        const calculateTime = () => {
            const start = new Date(startTime);
            const now = new Date();
            const diffMs = now.getTime() - start.getTime(); // Force standard ms math

            if (diffMs < 60000) {
                setElapsed('0 min');
                setAlertClass('text-muted');
                return;
            }

            const minutes = Math.floor(diffMs / 60000);
            setElapsed(`Hace ${minutes} min`);

            if (minutes > 10) setAlertClass('timer-critical'); // Rojo ComandaGo if > 10m
            else setAlertClass('text-muted');
        };

        calculateTime();
        // Force an aggressive 10s poll so '0 min' changes to '1 min' quickly when real
        const interval = setInterval(calculateTime, 10000);
        return () => clearInterval(interval);
    }, [startTime]);

    return <span className={alertClass} style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{alertClass === 'timer-critical' && '⚠️ '}{elapsed}</span>;
};

const ItemCard = React.memo(({ item, actionButton }) => (
    <div className="glass-panel fade-in kds-card" style={{ padding: '16px 20px', marginBottom: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.3s ease', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden', background: 'var(--bg-surface)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        {/* Glow effect top border simulation */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--primary)', opacity: 0.8 }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 5 }}>
            <span style={{ fontFamily: '"Lexend Peta", sans-serif', fontWeight: 'bold', fontSize: '1.25rem', lineHeight: '1.3', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                <span style={{ color: 'var(--primary)', marginRight: 8, fontSize: '1.1rem' }}>{item.cantidad}x</span>
                {item.plato.nombre}
            </span>
            <div style={{ marginLeft: 15 }}>
                <KitchenTimer startTime={item.fechaCreacion || item.comanda.fecha} />
            </div>
        </div>

        {item.observacion && (
            <div style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '0.9rem', background: 'rgba(255,50,50,0.1)', padding: '6px 10px', borderRadius: 6, marginTop: 5 }}>
                📝 {item.observacion}
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15, paddingTop: 10, borderTop: '1px solid var(--glass-border)' }}>
            {/* Mesa Badge bottom left */}
            <span className="badge" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: 20, padding: '6px 12px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                Mesa {item.comanda.mesa.numero}
            </span>

            {/* Cook / Actions bottom right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {item.cocinero && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontStyle: 'italic' }}>
                        <ChefHat size={14} /> {item.cocinero.nombre}
                    </span>
                )}
                {actionButton}
            </div>
        </div>
    </div>
));

const KitchenView = () => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const prevPendingCountReq = React.useRef(0);

    const fetchQueue = () => {
        fetch('/api/kitchen/queue')
            .then(res => res.json())
            .then(data => setQueue(data))
            .catch(err => console.error("Error polling queue", err));
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    const updateItemStatus = async (itemId, status, options = {}) => {
        const payload = { estado: status };
        if (status === 'preparando' && !options.preserveCook) {
            payload.cocineroId = user.id;
        }

        try {
            await fetch(`/api/orders/details/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            fetchQueue();
        } catch (error) {
            console.error("Error updating item", error);
        }
    };

    // Columns
    const pendingItems = queue.filter(i => i.estado === 'pendiente' || i.estado === 'enviada');
    const inProcessItems = queue.filter(i => i.estado === 'preparando');
    const readyItems = queue.filter(i => i.estado === 'lista' || i.estado === 'listo');

    // Chime Logic
    useEffect(() => {
        const currentPendingLimit = pendingItems.length;
        if (currentPendingLimit > prevPendingCountReq.current && isAudioEnabled) {
            playChime();
        }
        prevPendingCountReq.current = currentPendingLimit;
    }, [pendingItems.length, isAudioEnabled]);

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ margin: 0 }}>Flujo de Cocina (Por Plato)</h1>
                <button
                    className={`glass-button ${isAudioEnabled ? 'primary' : ''}`}
                    onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                    title={isAudioEnabled ? "Silenciar notificaciones" : "Activar sonido de nuevos pedidos"}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20 }}
                >
                    {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-muted" />}
                    <span>{isAudioEnabled ? 'Sonido Activado' : 'Sonido Mutado'}</span>
                </button>
            </div>

            <div className="kitchen-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr', gap: 16, flex: 1, overflow: 'hidden', minHeight: 0, paddingBottom: 10 }}>

                {/* COLUMN 1: PENDIENTES */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', borderRadius: 16, border: '1px solid var(--glass-border)', overflow: 'hidden', height: '100%', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.2rem' }}>
                        <Clock className="text-muted" size={24} />
                        <span style={{ flex: 1, color: 'var(--text-main)', fontWeight: 'bold' }}>Pendientes</span>
                        <span style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: 20, fontSize: '0.9rem', border: '1px solid var(--glass-border)', fontWeight: 'bold' }}>{pendingItems.length}</span>
                    </h2>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                        {pendingItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                actionButton={
                                    <button
                                        className="glass-button primary"
                                        style={{ width: 44, height: 44, padding: 0, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', transition: 'transform 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        onClick={() => updateItemStatus(item.id, 'preparando')}
                                        title="Empezar a preparar"
                                    >
                                        <Flame size={20} />
                                    </button>
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* COLUMN 2: EN PROCESO */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', borderRadius: 16, border: '1px solid var(--glass-border)', overflow: 'hidden', height: '100%', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>
                        <ChefHat size={24} />
                        <span style={{ flex: 1, fontWeight: 'bold' }}>En Proceso</span>
                        <span style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', padding: '4px 12px', borderRadius: 20, fontSize: '0.9rem', border: '1px solid var(--glass-border)', fontWeight: 'bold' }}>{inProcessItems.length}</span>
                    </h2>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                        {inProcessItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                actionButton={
                                    item.cocineroId === user.id ? (
                                        <button
                                            className="glass-button"
                                            style={{ width: 44, height: 44, padding: 0, borderRadius: '50%', background: 'var(--success)', color: 'white', borderColor: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(34,197,94,0.3)', transition: 'transform 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            onClick={() => updateItemStatus(item.id, 'listo')}
                                            title="Marcar como Listo"
                                        >
                                            <Check size={22} strokeWidth={3} />
                                        </button>
                                    ) : (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                                            Bloqueado
                                        </div>
                                    )
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* COLUMN 3: LISTOS */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', borderRadius: 16, border: '1px solid var(--glass-border)', overflow: 'hidden', height: '100%', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12, margin: 0, fontSize: '1.2rem', color: 'var(--success)' }}>
                        <CheckCircle size={24} />
                        <span style={{ flex: 1, fontWeight: 'bold' }}>Listos</span>
                        <span style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', padding: '4px 12px', borderRadius: 20, fontSize: '0.9rem', border: '1px solid var(--glass-border)', fontWeight: 'bold' }}>{readyItems.length}</span>
                    </h2>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                        {readyItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                actionButton={
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                                        {item.cocineroId === user.id && (
                                            <button
                                                className="glass-button"
                                                style={{ width: 40, height: 40, padding: 0, borderRadius: '50%', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                                title="Deshacer (Volver a Proceso)"
                                                onClick={() => updateItemStatus(item.id, 'preparando', { preserveCook: true })}
                                            >
                                                <Undo size={18} />
                                            </button>
                                        )}
                                        <div style={{ color: 'var(--success)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <CheckCircle size={16} /> Listo
                                        </div>
                                    </div>
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KitchenView;
