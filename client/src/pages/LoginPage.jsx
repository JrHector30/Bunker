import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, X, Eye, EyeOff } from 'lucide-react';
import logoMinimalista from '../assets/logo_minimalist.png';
import { useCache } from '../hooks/useCache';
import { BackButton } from '../components/ui/BackButton';

const LoginPage = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Dynamic Users from API Cache
    const fetcher = () => fetch('/api/users').then(res => res.json()).then(data => {
        return data.map(u => ({
            ...u,
            initial: u.nombre ? u.nombre.charAt(0).toUpperCase() : '?',
            shift: u.rol === 'admin' ? 'Acceso 24/7' : (u.rol === 'mozo' ? '08:00 AM - 04:00 PM' : 'Turno Operativo')
        }));
    });

    const { data: usersList, mutate: fetchUsers } = useCache('users', fetcher, []);
    const [isExiting, setIsExiting] = useState(false);

    // Password Recovery State
    const [showRecoverModal, setShowRecoverModal] = useState(false);
    const [recoverStep, setRecoverStep] = useState(1); // 1: confirmar correo, 2: ingresar código, 3: nueva contraseña
    const [recoverError, setRecoverError] = useState('');
    const [recoverSuccess, setRecoverSuccess] = useState('');
    const [recoverCode, setRecoverCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [userIdForReset, setUserIdForReset] = useState(null);

    const handleOpenForgotPassword = () => {
        setRecoverStep(1);
        setRecoverError('');
        setRecoverSuccess('');
        setRecoverCode('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setUserIdForReset(null);
        setShowRecoverModal(true);
    };

    const obscureEmail = (email) => {
        if (!email) return '';
        const [name, domain] = email.split('@');
        if (name.length <= 2) {
            return `${name}***@${domain}`;
        }
        const visibleStart = name.slice(0, 2);
        const visibleEnd = name.slice(-1);
        const obscuredPart = '*'.repeat(name.length - 3);
        return `${visibleStart}${obscuredPart}${visibleEnd}@${domain}`;
    };

    const handleSendRecoverCode = async () => {
        setRecoverError('');
        setRecoverCode('');
        try {
            const res = await fetch('/api/auth/recover-password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: selectedUser.usuario })
            });
            const data = await res.json();
            if (res.ok) {
                setRecoverStep(2);
                setRecoverSuccess('Código enviado correctamente.');
                setTimeout(() => setRecoverSuccess(''), 4000);
            } else {
                setRecoverError(data.error || 'Error al enviar código de recuperación.');
            }
        } catch (err) {
            setRecoverError('Error de red al solicitar código.');
        }
    };

    const handleVerifyRecoverCode = async () => {
        setRecoverError('');
        if (recoverCode.length !== 6 || !/^\d+$/.test(recoverCode)) {
            return setRecoverError('El código debe ser de 6 dígitos.');
        }

        try {
            const res = await fetch('/api/auth/recover-password/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: selectedUser.usuario, code: recoverCode })
            });
            const data = await res.json();
            if (res.ok) {
                setResetToken(data.resetToken);
                setUserIdForReset(data.userId);
                setRecoverStep(3);
            } else {
                setRecoverError(data.error || 'El código ingresado no es correcto.');
            }
        } catch (err) {
            setRecoverError('Error de red al verificar código.');
        }
    };

    const handleResetPassword = async () => {
        setRecoverError('');
        if (newPassword.length !== 6 || !/^\d+$/.test(newPassword)) {
            return setRecoverError('La nueva contraseña debe tener exactamente 6 dígitos numéricos.');
        }
        if (newPassword !== confirmPassword) {
            return setRecoverError('Las contraseñas no coinciden.');
        }

        try {
            const res = await fetch('/api/auth/recover-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userIdForReset,
                    resetToken: resetToken,
                    newPassword: newPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                setRecoverSuccess('Contraseña restablecida exitosamente.');
                // Recargar usuarios para actualizar la caché local de contraseñas de react
                fetchUsers();
                setTimeout(() => {
                    setShowRecoverModal(false);
                    setPin('');
                    setError('');
                }, 2000);
            } else {
                setRecoverError(data.error || 'Error al restablecer la contraseña.');
            }
        } catch (err) {
            setRecoverError('Error de red al restablecer contraseña.');
        }
    };

    useEffect(() => {
        if (!selectedUser && usersList && usersList.length > 0) {
            setSelectedUser(usersList[0]);
        }
    }, [usersList]);

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        if (!selectedUser) return setError('Seleccione un usuario.');
        if (pin.length < 3) return setError('Ingrese un PIN válido.'); // Allowing shorter PINs since old was '555555'

        const res = await login(selectedUser.usuario, pin); // Backend uses 'usuario'
        if (res.success) {
            setIsExiting(true);
            setTimeout(() => navigate('/'), 500); // Cinematic transition delay
        } else {
            setError(res.error);
            setPin(''); // Reset PIN on error
        }
    };

    const handlePinPress = (num) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    const handlePinDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const selectUser = (u) => {
        setSelectedUser(u);
        setIsDropdownOpen(false);
        setPin('');
        setError('');
    };

    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);


    return (
        <React.Fragment>

            <div className="mobile-login-container" style={{
                display: 'flex', height: '100vh', width: '100vw', background: '#050505',
                fontFamily: '"Inter", sans-serif', color: '#fff', overflow: 'hidden',
                opacity: isExiting ? 0 : 1, transform: isExiting ? 'scale(0.95)' : 'scale(1)',
                transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                position: 'relative'
            }}>
                {/* Botón Flotante de Regreso */}
                <div className="absolute top-6 left-6 z-50">
                    <BackButton />
                </div>

                {/* LADO IZQUIERDO: Branding */}
                <div className="mobile-left-panel" style={{ flex: 1, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ textAlign: 'center', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 30 }}>
                            <img src={logoMinimalista} alt="Logo" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                        </div>
                        <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 300, fontSize: '2.5rem', letterSpacing: '8px', margin: 0, textTransform: 'uppercase', color: '#000000' }}>
                            BUNKER
                        </h1>
                        <p style={{ marginTop: 15, fontSize: '0.9rem', color: '#555555', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 400, fontFamily: '"Inter", sans-serif' }}>
                            High-End Restaurant OS
                        </p>
                    </div>
                </div>

                {/* LADO DERECHO: Acceso */}
                <div className="mobile-right-panel" style={{ flex: 1, backgroundColor: '#121212', borderLeft: '1px solid #222222', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 40, position: 'relative', zIndex: 2 }}>
                    <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', position: 'relative' }}>

                        <h2 style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 400, fontSize: '1.4rem', color: 'var(--primary)', marginBottom: 40, textAlign: 'center', letterSpacing: '1px' }}>
                            Acceso de Personal
                        </h2>

                        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 15, textAlign: 'center', fontWeight: 300 }}>
                            Seleccione su cuenta para iniciar el turno.
                        </p>

                        {/* SELECTOR DE USUARIO (DROPDOWN) */}
                        <div className="user-selector" ref={dropdownRef} style={{ position: 'relative', marginBottom: 40 }}>
                            <div
                                className="mobile-touch-target"
                                style={{ background: '#181818', padding: '16px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #2a2a2a', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', transition: 'background 0.3s' }}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                    {selectedUser?.foto ? (
                                        <img src={selectedUser.foto} alt="profile" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                    ) : (
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)' }}>
                                            {selectedUser ? selectedUser.initial : '?'}
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: '1.05rem', color: '#fff', marginBottom: 2 }}>{selectedUser ? selectedUser.nombre : 'Seleccionar usuario...'}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 2, textTransform: 'capitalize' }}>{selectedUser ? selectedUser.rol : ''}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 400 }}>{selectedUser ? selectedUser.shift : ''}</div>
                                    </div>
                                </div>
                                <ChevronDown size={20} color="#888" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div
                                    className="login-dropdown"
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        marginTop: 10,
                                        background: '#181818',
                                        borderRadius: 16,
                                        border: '1px solid #2a2a2a',
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                        maxHeight: '536px',
                                        zIndex: 10,
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                                    }}
                                >
                                    {usersList.map((u) => (
                                        <div
                                            key={u.id}
                                            style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: 15, cursor: 'pointer', borderBottom: '1px solid #222222', background: selectedUser?.id === u.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                                            onClick={() => selectUser(u)}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = selectedUser?.id === u.id ? 'rgba(255,255,255,0.05)' : 'transparent'}
                                        >
                                            {u.foto ? (
                                                <img src={u.foto} alt="profile" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.85rem' }}>
                                                    {u.initial}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '0.95rem', color: '#eee' }}>{u.nombre}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'capitalize' }}>{u.rol}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 25, textAlign: 'center', fontWeight: 300 }}>
                            Por favor, ingrese su PIN para validarse.
                        </p>

                        {/* PIN INDICATORS */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginBottom: 40, minHeight: '14px', alignItems: 'center' }}>
                            {[...Array(6)].map((_, i) => (
                                showPin && i < pin.length ? (
                                    <div key={i} style={{
                                        width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--primary)', fontSize: '1.2rem', fontWeight: '600', fontFamily: '"Inter", sans-serif'
                                    }}>
                                        {pin[i]}
                                    </div>
                                ) : (
                                    <div key={i} style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        background: i < pin.length ? 'var(--primary)' : '#2a2a2a',
                                        transition: 'background 0.2s',
                                        boxShadow: i < pin.length ? '0 0 10px rgba(240, 84, 79, 0.4)' : 'none'
                                    }} />
                                )
                            ))}
                        </div>

                        {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 15 }}>{error}</div>}

                        {/* KEYPAD */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 40 }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handlePinPress(num.toString())}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', fontWeight: 300,
                                        padding: '20px 0', cursor: 'pointer', borderRadius: 16, transition: 'background 0.2s, transform 0.1s',
                                        fontFamily: '"Inter", sans-serif'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    {num}
                                </button>
                            ))}
                            {/* BUTTON: DEL (IZQUIERDA) */}
                            <button
                                onClick={handlePinDelete}
                                style={{
                                    background: 'transparent', border: 'none', color: '#888', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    padding: '20px 0', cursor: 'pointer', borderRadius: 16, transition: 'background 0.2s, color 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                            >
                                <X size={24} strokeWidth={1.5} />
                            </button>

                            {/* BUTTON: 0 (CENTRO) */}
                            <button
                                onClick={() => handlePinPress('0')}
                                style={{
                                    background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', fontWeight: 300,
                                    padding: '20px 0', cursor: 'pointer', borderRadius: 16, transition: 'background 0.2s, transform 0.1s',
                                    fontFamily: '"Inter", sans-serif'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                0
                            </button>

                            {/* BUTTON: MOSTRAR/OCULTAR CONTRASEÑA (DERECHA) */}
                            <button
                                onClick={() => setShowPin(!showPin)}
                                style={{
                                    background: 'transparent', border: 'none', color: '#888', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    padding: '20px 0', cursor: 'pointer', borderRadius: 16, transition: 'background 0.2s, color 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
                            >
                                {showPin ? <EyeOff size={24} strokeWidth={1.5} /> : <Eye size={24} strokeWidth={1.5} />}
                            </button>
                        </div>

                        {/* ACTION BUTTON */}
                        <button
                            className="mobile-btn-login"
                            onClick={handleLogin}
                            disabled={pin.length < 6}
                            style={{
                                background: pin.length >= 6 ? 'var(--primary)' : '#222',
                                color: pin.length >= 6 ? '#000000ff' : '#555',
                                border: 'none',
                                padding: '18px',
                                borderRadius: 12,
                                fontSize: '1.05rem',
                                fontWeight: 500,
                                cursor: pin.length >= 6 ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s ease',
                                boxShadow: pin.length >= 6 ? '0 10px 20px rgba(240, 84, 79, 0.2)' : 'none',
                                fontFamily: '"Inter", sans-serif',
                                letterSpacing: '1px'
                            }}
                        >
                            Ingresar
                        </button>

                        {selectedUser?.rol === 'admin' && (
                            <button
                                type="button"
                                onClick={handleOpenForgotPassword}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    marginTop: 20,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    textDecoration: 'underline',
                                    fontFamily: '"Inter", sans-serif',
                                    opacity: 0.8,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                            >
                                Olvidé mi contraseña.
                            </button>
                        )}

                    </div>
                </div>
            </div>

            {/* Modal de Recuperación de Contraseña */}
            {showRecoverModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, fontFamily: '"Inter", sans-serif'
                }} onClick={() => setShowRecoverModal(false)}>
                    <div className="modal-content" style={{
                        background: '#121212', border: '1px solid #2a2a2a', padding: 30,
                        borderRadius: 20, width: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--primary)', margin: 0 }}>
                                Recuperar Contraseña
                            </h3>
                            <button
                                onClick={() => setShowRecoverModal(false)}
                                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {recoverError && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>{recoverError}</div>}
                            {recoverSuccess && <div style={{ color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center' }}>{recoverSuccess}</div>}

                            {recoverStep === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                        Se enviará un código de verificación al correo asociado a tu cuenta:
                                    </p>
                                    <div style={{
                                        background: '#181818', padding: '12px 15px', borderRadius: 10,
                                        border: '1px solid #222', textAlign: 'center', fontWeight: 500, fontSize: '1.05rem', color: '#fff'
                                    }}>
                                        {selectedUser?.correo ? obscureEmail(selectedUser.correo) : 'Sin correo asociado. Contacta a soporte.'}
                                    </div>
                                    <button
                                        disabled={!selectedUser?.correo}
                                        onClick={handleSendRecoverCode}
                                        style={{
                                            background: selectedUser?.correo ? 'var(--primary)' : '#222',
                                            color: selectedUser?.correo ? '#000' : '#555',
                                            border: 'none', padding: '12px', borderRadius: 10, cursor: selectedUser?.correo ? 'pointer' : 'not-allowed',
                                            fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s'
                                        }}
                                    >
                                        Enviar código
                                    </button>
                                </div>
                            )}

                            {recoverStep === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                        Ingresa el código numérico de 6 dígitos enviado a tu correo:
                                    </p>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={recoverCode}
                                        placeholder="------"
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 6) setRecoverCode(val);
                                        }}
                                        style={{
                                            background: '#181818', border: '1px solid #2a2a2a', color: '#fff',
                                            padding: 12, borderRadius: 10, fontSize: '1.3rem', letterSpacing: '8px', textAlign: 'center'
                                        }}
                                    />
                                    <button
                                        onClick={handleVerifyRecoverCode}
                                        disabled={recoverCode.length !== 6}
                                        style={{
                                            background: recoverCode.length === 6 ? 'var(--primary)' : '#222',
                                            color: recoverCode.length === 6 ? '#000' : '#555',
                                            border: 'none', padding: '12px', borderRadius: 10, cursor: recoverCode.length === 6 ? 'pointer' : 'not-allowed',
                                            fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s'
                                        }}
                                    >
                                        Verificar Código
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSendRecoverCode}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--primary)',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            marginTop: 5,
                                            textAlign: 'center',
                                            fontFamily: '"Inter", sans-serif'
                                        }}
                                    >
                                        Reenviar código
                                    </button>
                                </div>
                            )}

                            {recoverStep === 3 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: 5 }}>Nueva contraseña</label>
                                        <input
                                            type="password"
                                            maxLength={6}
                                            value={newPassword}
                                            placeholder="6 dígitos numéricos"
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 6) setNewPassword(val);
                                            }}
                                            style={{
                                                background: '#181818', border: '1px solid #2a2a2a', color: '#fff',
                                                padding: 12, borderRadius: 10, width: '100%', boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: '#888', display: 'block', marginBottom: 5 }}>Repetir contraseña</label>
                                        <input
                                            type="password"
                                            maxLength={6}
                                            value={confirmPassword}
                                            placeholder="Repite los 6 dígitos"
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 6) setConfirmPassword(val);
                                            }}
                                            style={{
                                                background: '#181818', border: '1px solid #2a2a2a', color: '#fff',
                                                padding: 12, borderRadius: 10, width: '100%', boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={newPassword.length !== 6 || confirmPassword.length !== 6}
                                        style={{
                                            background: (newPassword.length === 6 && confirmPassword.length === 6) ? 'var(--primary)' : '#222',
                                            color: (newPassword.length === 6 && confirmPassword.length === 6) ? '#000' : '#555',
                                            border: 'none', padding: '12px', borderRadius: 10, cursor: (newPassword.length === 6 && confirmPassword.length === 6) ? 'pointer' : 'not-allowed',
                                            fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s', marginTop: 10
                                        }}
                                    >
                                        Guardar Contraseña
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default LoginPage;
