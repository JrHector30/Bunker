import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Moon, Sun, Zap, Palette, Bell, Save, X, Terminal, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PermissionsConfig from '../components/PermissionsConfig';

const SettingsView = () => {
    const { user } = useAuth();
    const { theme, changeTheme, showAlerts, setShowAlerts } = useTheme();
    const navigate = useNavigate();

    // Local state to handle Settings unsaved changes
    const [localShowAlerts, setLocalShowAlerts] = useState(showAlerts);
    const hasChanges = localShowAlerts !== showAlerts;

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
            id: 'theme-green',
            name: 'Starbucks Green',
            description: 'Estilo clásico y elegante. Verde corporativo.',
            icon: <Zap size={24} />,
            color: '#00704A',
            border: '#005c3d'
        },
        {
            id: 'theme-blue',
            name: 'Noche Azulada',
            description: 'El tema clásico. Tonos Slate profundos.',
            icon: <Moon size={24} />,
            color: '#020617',
            border: '#1e293b'
        },
        {
            id: 'theme-red',
            name: 'ComandaGo Rojo',
            description: 'Pasión por la marca. Tonos rojizos.',
            icon: <Palette size={24} />,
            color: '#1a0505',
            border: '#F0544F'
        },
        {
            id: 'theme-minimalist',
            name: 'Minimalist',
            description: 'Código de autor. Blanco y negro de alta gama.',
            icon: <Terminal size={24} />,
            color: '#111111',
            border: '#222222'
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
                    <p className="text-muted" style={{ margin: 0 }}>Personaliza tu experiencia en ComandaGo</p>
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
