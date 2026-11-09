import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound, Check, ArrowLeft } from 'lucide-react';
import logoMinimalista from '../assets/logo_minimalist.png';
import { clearGlobalCache } from '../hooks/useCache';
import { offlineService } from '../offline';

export default function TenantLoginView() {
    const navigate = useNavigate();

    // Form states
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Modal / Estado de Primer Acceso (Cambio de Contraseña)
    const [isFirstAccess, setIsFirstAccess] = useState(false);
    const [firstAccessData, setFirstAccessData] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordChangeError, setPasswordChangeError] = useState('');

    // Modal de Recuperación de Contraseña
    const [showRecoverModal, setShowRecoverModal] = useState(false);
    const [recoverStep, setRecoverStep] = useState(1);
    const [recoverEmail, setRecoverEmail] = useState('');
    const [recoverCode, setRecoverCode] = useState('');
    const [recoverNewPassword, setRecoverNewPassword] = useState('');
    const [recoverConfirmPassword, setRecoverConfirmPassword] = useState('');
    const [recoverResetToken, setRecoverResetToken] = useState('');
    const [recoverError, setRecoverError] = useState('');
    const [recoverSuccess, setRecoverSuccess] = useState('');
    const [recoverLoading, setRecoverLoading] = useState(false);

    useEffect(() => {
        // Blindaje estricto a MODO CLARO en /acceso
        const root = document.documentElement;
        root.classList.remove('mode-dark');
        root.classList.add('mode-light');
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!correo.trim() || !password) {
            return setError('Por favor complete su correo y contraseña.');
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/tenant-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Credenciales no válidas.');
                setLoading(false);
                return;
            }

            // Si es Superadmin iniciando sesión desde /acceso, redirigir al panel de control
            if (data.isSuperadmin) {
                localStorage.setItem('bunker_superadmin', JSON.stringify(data.superadmin));
                navigate('/superadmin');
                return;
            }

            // Si es primer acceso, exigir cambio de contraseña
            if (data.primerAcceso) {
                setFirstAccessData(data);
                setIsFirstAccess(true);
                setLoading(false);
                return;
            }

            // Limpiar sesión de personal anterior y caché en memoria
            localStorage.removeItem('bunker_user');
            clearGlobalCache();
            try {
                await offlineService.clear();
            } catch (e) {
                console.warn('Error clearing offline db', e);
            }

            // Guardar restaurante en localStorage y avanzar
            localStorage.setItem('bunker_current_tenant', JSON.stringify(data.restaurante));
            navigate('/login');
        } catch (err) {
            console.error('Error de red al conectar:', err);
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const handleFirstPasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordChangeError('');

        if (!newPassword || !confirmPassword) {
            return setPasswordChangeError('Debe ingresar y confirmar su nueva contraseña.');
        }

        if (newPassword !== confirmPassword) {
            return setPasswordChangeError('Las contraseñas no coinciden.');
        }

        // Regla: letras y números (sin signos especiales obligatorios)
        const regex = /^[a-zA-Z0-9]+$/;
        if (!regex.test(newPassword)) {
            return setPasswordChangeError('La contraseña solo debe contener letras y números (sin signos especiales).');
        }

        if (newPassword.length < 4) {
            return setPasswordChangeError('La contraseña debe tener al menos 4 caracteres.');
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/first-password-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: firstAccessData.userId,
                    newPassword,
                    confirmPassword
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setPasswordChangeError(data.error || 'Error al actualizar contraseña.');
                setLoading(false);
                return;
            }

            // Éxito: guardar restaurante y entrar al selector de personal
            localStorage.setItem('bunker_current_tenant', JSON.stringify(firstAccessData.restaurante));
            navigate('/login');
        } catch (err) {
            setPasswordChangeError('Error de red al actualizar contraseña.');
        } finally {
            setLoading(false);
        }
    };

    // Funciones de Recuperación de Contraseña
    const handleOpenRecover = () => {
        setRecoverEmail(correo.trim());
        setRecoverStep(1);
        setRecoverError('');
        setRecoverSuccess('');
        setRecoverCode('');
        setRecoverNewPassword('');
        setRecoverConfirmPassword('');
        setRecoverResetToken('');
        setShowRecoverModal(true);
    };

    const handleSendRecoverCode = async () => {
        setRecoverError('');
        if (!recoverEmail.trim()) {
            return setRecoverError('Ingrese su correo electrónico.');
        }

        setRecoverLoading(true);
        try {
            const res = await fetch('/api/auth/recover-password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: recoverEmail.trim() })
            });
            const data = await res.json();
            if (res.ok) {
                setRecoverStep(2);
                setRecoverSuccess('Código de 6 dígitos enviado a tu correo.');
            } else {
                setRecoverError(data.error || 'Error al solicitar código.');
            }
        } catch (err) {
            setRecoverError('Error de conexión al enviar código.');
        } finally {
            setRecoverLoading(false);
        }
    };

    const handleVerifyRecoverCode = async () => {
        setRecoverError('');
        if (!recoverCode.length !== 6 || !/^\d+$/.test(recoverCode)) {
            return setRecoverError('El código debe ser de 6 dígitos numéricos.');
        }

        setRecoverLoading(true);
        try {
            const res = await fetch('/api/auth/recover-password/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: recoverEmail.trim(), code: recoverCode })
            });
            const data = await res.json();
            if (res.ok) {
                setRecoverResetToken(data.resetToken);
                setRecoverStep(3);
                setRecoverSuccess('Código verificado con éxito.');
            } else {
                setRecoverError(data.error || 'Código incorrecto o expirado.');
            }
        } catch (err) {
            setRecoverError('Error de conexión al verificar código.');
        } finally {
            setRecoverLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setRecoverError('');
        if (!recoverNewPassword || !recoverConfirmPassword) {
            return setRecoverError('Complete todos los campos.');
        }
        if (recoverNewPassword !== recoverConfirmPassword) {
            return setRecoverError('Las contraseñas no coinciden.');
        }
        const regex = /^[a-zA-Z0-9]+$/;
        if (!regex.test(recoverNewPassword)) {
            return setRecoverError('Solo debe contener letras y números (sin signos especiales).');
        }

        setRecoverLoading(true);
        try {
            const res = await fetch('/api/auth/recover-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correo: recoverEmail.trim(),
                    resetToken: recoverResetToken,
                    newPassword: recoverNewPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                setRecoverSuccess('¡Contraseña restablecida exitosamente!');
                setTimeout(() => {
                    setShowRecoverModal(false);
                    setPassword(recoverNewPassword);
                }, 1500);
            } else {
                setRecoverError(data.error || 'Error al restablecer contraseña.');
            }
        } catch (err) {
            setRecoverError('Error de conexión al guardar contraseña.');
        } finally {
            setRecoverLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full bg-[#f8fafc] text-slate-800 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Botón flotante para volver a la landing */}
            <div className="absolute top-6 left-6 z-50">
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 hover:text-teal-600 transition-all text-xs font-semibold cursor-pointer active:scale-95"
                >
                    <ArrowLeft size={16} />
                    <span>Volver</span>
                </button>
            </div>

            {/* Efecto de resplandor sutil suave en modo claro */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Tarjeta Central en MODO CLARO */}
            <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl shadow-slate-200/50 relative z-10 text-left">
                {/* Cabecera */}
                <div className="flex flex-col items-center text-center mb-7">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center p-3 mb-3.5 shadow-sm">
                        <img src={logoMinimalista} alt="Bunker Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Iniciar Sesión
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                        Acceso de Negocio • Bunker OS
                    </p>
                </div>

                {/* Formulario Principal */}
                {!isFirstAccess ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    value={correo}
                                    onChange={(e) => setCorreo(e.target.value)}
                                    placeholder="ejemplo@negocio.com"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-sans"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 transition-all font-sans"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-1.5">
                                <a
                                    href="#recuperar"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleOpenRecover();
                                    }}
                                    className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors hover:underline cursor-pointer font-medium"
                                >
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 py-3 px-6 rounded-full font-bold text-sm bg-zinc-950 hover:bg-black text-white active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-md border-0 cursor-pointer disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span>Ingresar a mi Negocio</span>
                            )}
                        </button>
                    </form>
                ) : (
                    /* Pantalla de Primer Acceso (Cambio Obligatorio de Contraseña) */
                    <form onSubmit={handleFirstPasswordSubmit} className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs leading-relaxed">
                            <span className="font-semibold block mb-0.5">¡Bienvenido a {firstAccessData?.restaurante?.nombre}!</span>
                            Por seguridad, en tu primer ingreso debes definir tu contraseña personal de negocio.
                        </div>

                        {passwordChangeError && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{passwordChangeError}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Solo letras y números"
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Repetir Nueva Contraseña
                            </label>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirma la misma contraseña"
                                required
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                            />
                        </div>

                        <p className="text-[11px] text-slate-500 leading-normal">
                            * Regla: Puede ser en mayúsculas o minúsculas y números (no se requieren signos ni caracteres raros).
                        </p>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 shadow-md"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Guardar Contraseña y Continuar</span>
                                    <Check size={16} />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Modal de Recuperación de Contraseña en MODO CLARO */}
            {showRecoverModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative text-left">
                        <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                            <KeyRound size={20} className="text-teal-600" />
                            Recuperar Contraseña
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            {recoverStep === 1 && 'Ingresa el correo del administrador para enviarte el código de seguridad.'}
                            {recoverStep === 2 && 'Ingresa el código de 6 dígitos que enviamos a tu correo.'}
                            {recoverStep === 3 && 'Define tu nueva contraseña de acceso.'}
                        </p>

                        {recoverError && (
                            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs mb-3 flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{recoverError}</span>
                            </div>
                        )}
                        {recoverSuccess && (
                            <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs mb-3 flex items-center gap-2">
                                <Check size={14} className="shrink-0" />
                                <span>{recoverSuccess}</span>
                            </div>
                        )}

                        {recoverStep === 1 && (
                            <div className="space-y-4">
                                <input
                                    type="email"
                                    value={recoverEmail}
                                    onChange={(e) => setRecoverEmail(e.target.value)}
                                    placeholder="correo@negocio.com"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowRecoverModal(false)}
                                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={recoverLoading}
                                        onClick={handleSendRecoverCode}
                                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        {recoverLoading ? 'Enviando...' : 'Enviar Código'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {recoverStep === 2 && (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={recoverCode}
                                    onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    className="w-full text-center tracking-widest text-lg font-mono py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRecoverStep(1)}
                                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    >
                                        Reenviar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={recoverLoading}
                                        onClick={handleVerifyRecoverCode}
                                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
                                    >
                                        {recoverLoading ? 'Verificando...' : 'Validar Código'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {recoverStep === 3 && (
                            <div className="space-y-3">
                                <input
                                    type="password"
                                    value={recoverNewPassword}
                                    onChange={(e) => setRecoverNewPassword(e.target.value)}
                                    placeholder="Nueva contraseña"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                                />
                                <input
                                    type="password"
                                    value={recoverConfirmPassword}
                                    onChange={(e) => setRecoverConfirmPassword(e.target.value)}
                                    placeholder="Repetir nueva contraseña"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                                />
                                <button
                                    type="button"
                                    disabled={recoverLoading}
                                    onClick={handleResetPassword}
                                    className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors mt-2"
                                >
                                    {recoverLoading ? 'Restableciendo...' : 'Guardar Nueva Contraseña'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
