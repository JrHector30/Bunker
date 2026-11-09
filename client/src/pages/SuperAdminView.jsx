import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    CheckCircle2,
    XCircle,
    Plus,
    Search,
    Power,
    Sparkles,
    Copy,
    Check,
    Eye,
    Pencil,
    LogOut,
    Sun,
    Moon,
    AlertCircle,
    Trash2,
    Columns3,
    Filter
} from 'lucide-react';
import logoMinimalista from '../assets/logo_minimalist.png';
import SmoothDropdown from '../components/ui/SmoothDropdown';
import BorderBeam from '../components/ui/BorderBeam';
import CloseButton from '../components/ui/CloseButton';

export default function SuperAdminView() {
    const navigate = useNavigate();

    // Estado de Tema de Superadmin (persiste en localStorage)
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('superadmin-mode') !== 'light');

    useEffect(() => {
        const root = document.documentElement;
        // Aislar completamente el panel de Superadmin de temas de restaurante (naranja, verde, etc.)
        root.classList.remove('theme-orange', 'theme-green', 'theme-blue', 'theme-purple', 'theme-red');
        root.classList.add('theme-black');

        if (isDarkMode) {
            root.classList.remove('mode-light');
            root.classList.add('mode-dark');
            localStorage.setItem('superadmin-mode', 'dark');
        } else {
            root.classList.remove('mode-dark');
            root.classList.add('mode-light');
            localStorage.setItem('superadmin-mode', 'light');
        }
    }, [isDarkMode]);

    // Estado de sesión Superadmin
    const [superadmin, setSuperadmin] = useState(() => {
        try {
            const raw = localStorage.getItem('bunker_superadmin');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    });

    // Protección de ruta: Si no hay sesión de superadmin, redirigir a /acceso
    useEffect(() => {
        if (!superadmin) {
            navigate('/acceso');
        }
    }, [superadmin, navigate]);

    // Dashboard Data
    const [tenants, setTenants] = useState([]);
    const [loadingTenants, setLoadingTenants] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'suspended'

    // Visibilidad de Columnas
    const [columns, setColumns] = useState({
        local: true,
        correo: true,
        membresia: true,
        estado: true,
        acciones: true
    });
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);
    const columnsMenuRef = useRef(null);

    // Modal Ver Detalles del Cliente
    const [viewingDetailsTenant, setViewingDetailsTenant] = useState(null);

    // Modal Editar Local
    const [editingTenant, setEditingTenant] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    // Modal Crear Local
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [newLocal, setNewLocal] = useState({
        nombre: '',
        slug: '',
        tipoMembresia: 'Emprendedor',
        activo: true,
        correoAdmin: '',
        passwordTemporal: '',
        direccion: '',
        telefono: '',
        clienteNombres: '',
        clienteApellidos: '',
        fechaPagos: ''
    });

    // Ficha de éxito tras creación
    const [createdSummary, setCreatedSummary] = useState(null);
    const [copied, setCopied] = useState(false);

    // Modal de Confirmación de Eliminación
    const [tenantToDelete, setTenantToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Cierre de menús flotantes al hacer clic afuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target)) {
                setShowColumnsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cargar locales
    const fetchTenants = async () => {
        setLoadingTenants(true);
        try {
            const res = await fetch('/api/superadmin/tenants');
            if (res.ok) {
                const data = await res.json();
                setTenants(data);
            }
        } catch (err) {
            console.error('Error cargando locales:', err);
        } finally {
            setLoadingTenants(false);
        }
    };

    useEffect(() => {
        if (superadmin) {
            fetchTenants();
        }
    }, [superadmin]);

    // Autogenerar slug en vivo al escribir el nombre
    const handleNombreChange = (val) => {
        const generatedSlug = val
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        setNewLocal(prev => ({
            ...prev,
            nombre: val,
            slug: generatedSlug
        }));
    };

    // Generar contraseña provisional aleatoria
    const generateRandomPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let pass = 'BK';
        for (let i = 0; i < 5; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewLocal(prev => ({ ...prev, passwordTemporal: pass }));
    };

    const handleLogout = () => {
        localStorage.removeItem('bunker_superadmin');
        setSuperadmin(null);
        navigate('/acceso');
    };

    // Submit de Creación de Local
    const handleCreateTenant = async (e) => {
        e.preventDefault();
        setCreateError('');

        if (!newLocal.nombre || !newLocal.correoAdmin || !newLocal.direccion || !newLocal.tipoMembresia) {
            setCreateError('Por favor complete todos los campos obligatorios marcados con (*).');
            return;
        }

        setCreateLoading(true);

        try {
            const res = await fetch('/api/superadmin/tenants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLocal)
            });

            const data = await res.json();
            if (!res.ok) {
                setCreateError(data.error || 'Error al crear el restaurante.');
                setCreateLoading(false);
                return;
            }

            setCreatedSummary(data);
            setShowCreateModal(false);
            setNewLocal({
                nombre: '',
                slug: '',
                tipoMembresia: 'Emprendedor',
                activo: true,
                correoAdmin: '',
                passwordTemporal: '',
                direccion: '',
                telefono: '',
                clienteNombres: '',
                clienteApellidos: '',
                fechaPagos: ''
            });
            fetchTenants();
        } catch (err) {
            setCreateError('Error de conexión al registrar el local.');
        } finally {
            setCreateLoading(false);
        }
    };

    // Submit de Edición de Local
    const handleUpdateTenant = async (e) => {
        e.preventDefault();
        if (!editingTenant) return;
        setEditError('');

        if (!editingTenant.nombre || !editingTenant.correoAdmin || !editingTenant.direccion || !editingTenant.tipoMembresia) {
            setEditError('Por favor complete todos los campos obligatorios marcados con (*).');
            return;
        }

        setEditLoading(true);
        try {
            const res = await fetch(`/api/superadmin/tenants/${editingTenant.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingTenant)
            });
            const data = await res.json();
            if (!res.ok) {
                setEditError(data.error || 'Error al actualizar el local.');
                setEditLoading(false);
                return;
            }

            setEditingTenant(null);
            fetchTenants();
        } catch (err) {
            setEditError('Error de conexión al actualizar el local.');
        } finally {
            setEditLoading(false);
        }
    };

    // Toggle de Suspensión / Activación
    const handleToggleStatus = async (tenantId, currentStatus) => {
        const newStatus = !currentStatus;
        try {
            const res = await fetch(`/api/superadmin/tenants/${tenantId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activo: newStatus })
            });
            if (res.ok) {
                setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, activo: newStatus } : t));
            }
        } catch (err) {
            console.error('Error al cambiar estado:', err);
        }
    };

    // Eliminar local de raíz en base de datos y liberar slug
    const handleDeleteTenant = async () => {
        if (!tenantToDelete) return;
        setDeleteLoading(true);
        setDeleteError('');
        try {
            const res = await fetch(`/api/superadmin/tenants/${tenantToDelete.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok) {
                setDeleteError(data.error || 'Error al eliminar el local.');
                setDeleteLoading(false);
                return;
            }
            setTenants(prev => prev.filter(t => t.id !== tenantToDelete.id));
            setTenantToDelete(null);
        } catch (err) {
            setDeleteError('Error de conexión al eliminar el local.');
        } finally {
            setDeleteLoading(false);
        }
    };

    // Manejador centralizado para las acciones de SmoothDropdown
    const handleSuperadminAction = (actionId, tenant) => {
        if (actionId === 'detalles') {
            setViewingDetailsTenant(tenant);
        } else if (actionId === 'editar') {
            setEditingTenant({
                id: tenant.id,
                nombre: tenant.nombre,
                slug: tenant.slug,
                tipoMembresia: tenant.tipoMembresia || 'Emprendedor',
                activo: tenant.activo,
                correoAdmin: tenant.usuarios?.[0]?.correo || '',
                direccion: tenant.direccion || '',
                telefono: tenant.telefono || '',
                clienteNombres: tenant.clienteNombres || '',
                clienteApellidos: tenant.clienteApellidos || '',
                fechaPagos: tenant.fechaPagos || ''
            });
        } else if (actionId === 'suspender') {
            handleToggleStatus(tenant.id, tenant.activo);
        } else if (actionId === 'eliminar') {
            setTenantToDelete(tenant);
        }
    };

    // Obtener los items dinámicos para SmoothDropdown
    const getSuperadminActions = (tenant) => {
        const isMatriz = tenant.id === 1 || tenant.slug === 'bunker-restobar';
        const items = [
            { id: 'detalles', label: 'Ver Detalles', icon: Eye },
            { id: 'editar', label: 'Editar', icon: Pencil },
            { id: 'suspender', label: tenant.activo ? 'Suspender' : 'Reactivar', icon: Power },
        ];
        if (!isMatriz) {
            items.push({ id: 'eliminar', label: 'Eliminar', icon: Trash2 });
        }
        return items;
    };

    const copySummary = () => {
        if (!createdSummary) return;
        const text = `🎉 ¡BIENVENIDO A BUNKER OS!\n` +
            `📍 Local: ${createdSummary.restaurante.nombre}\n` +
            `🔗 Slug: ${createdSummary.restaurante.slug}\n\n` +
            `🔐 1. ACCESO DE NEGOCIO (/acceso):\n` +
            `• Correo: ${createdSummary.adminInicial.correo}\n` +
            `• Contraseña Temporal: ${createdSummary.adminInicial.passwordTemporal}\n` +
            `*(En tu primer acceso deberás definir tu contraseña personal)*\n\n` +
            `👥 2. ACCESO DE PERSONAL (/login):\n` +
            `• Usuario: ${createdSummary.adminInicial.nombre}\n` +
            `• PIN de 6 dígitos inicial: 000000\n`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    // Métricas
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.activo).length;
    const suspendedTenants = tenants.filter(t => !t.activo).length;

    // Filtros
    const filteredTenants = tenants.filter(t => {
        const matchesSearch =
            t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.usuarios?.[0]?.correo && t.usuarios[0].correo.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;
        if (statusFilter === 'active') return t.activo;
        if (statusFilter === 'suspended') return !t.activo;
        return true;
    });

    if (!superadmin) {
        return null;
    }

    return (
        <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-[#09090b] text-zinc-100 selection:bg-zinc-700 selection:text-white' : 'bg-[#fafafa] text-zinc-900 selection:bg-zinc-200'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header Superadmin */}
            <header className={`border-b sticky top-0 z-40 px-6 py-4 backdrop-blur-md transition-colors duration-200 ${isDarkMode ? 'bg-[#09090b]/80 border-zinc-800/80 text-white' : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
                }`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center p-2 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                            <img src={logoMinimalista} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-bold tracking-tight">BUNKER MASTER</h1>
                                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border-0">
                                    Superadmin
                                </span>
                            </div>
                            <p className={`text-[11px] ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Control Global de Restaurantes y Membresías</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Botón de Cambio de Modo (Claro / Oscuro) - Estilo Pill sin borde gris */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-full border-0 transition-colors cursor-pointer flex items-center justify-center shadow-sm ${isDarkMode
                                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                                }`}
                            title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                        >
                            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                        </button>

                        <span className={`text-xs hidden sm:inline ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                            Conectado: <strong className={isDarkMode ? 'text-zinc-200' : 'text-slate-800'}>{superadmin.correo}</strong>
                        </span>

                        {/* Botón Cerrar Sesión - Estilo Pill sin borde gris */}
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border-0 text-xs font-semibold transition-all cursor-pointer shadow-sm ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                                }`}
                        >
                            <LogOut size={13} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Banner de Éxito de Creación con CloseButton */}
                {createdSummary && (
                    <div className={`mb-8 p-6 rounded-2xl border text-left animate-fade-in relative shadow-sm ${isDarkMode ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                    ¡Local Registrado Exitosamente!
                                </h3>
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    Copia la siguiente ficha y envíasela al cliente para que acceda por primera vez:
                                </p>
                            </div>
                            <button
                                onClick={copySummary}
                                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-md border-0 active:scale-95 ${isDarkMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-black'
                                    }`}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                <span>{copied ? '¡Copiado!' : 'Copiar Credenciales'}</span>
                            </button>
                        </div>

                        <div className={`mt-4 p-4 rounded-xl border font-mono text-xs space-y-1.5 ${isDarkMode ? 'bg-black/60 border-zinc-800/80 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}>
                            <p><span className="font-bold">Local:</span> {createdSummary.restaurante.nombre} (Slug: {createdSummary.restaurante.slug})</p>
                            <p><span className="font-bold">Acceso de Negocio (/acceso):</span> Correo: <span className="font-bold">{createdSummary.adminInicial.correo}</span> | Clave Temporal: <span className="font-bold">{createdSummary.adminInicial.passwordTemporal}</span></p>
                            <p><span className="font-bold">Acceso de Personal (/login):</span> Usuario: <span className="font-bold">{createdSummary.adminInicial.nombre}</span> | PIN: <span className="font-bold">{createdSummary.adminInicial.pinPersonal}</span></p>
                        </div>

                        <div className="absolute top-4 right-4">
                            <CloseButton onClick={() => setCreatedSummary(null)} />
                        </div>
                    </div>
                )}

                {/* Tarjetas de Métricas con BorderBeam integrado */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    {/* Tarjeta 1: Total Restaurantes */}
                    <div className={`relative overflow-hidden p-5 rounded-2xl border flex items-center gap-4 shadow-sm ${isDarkMode ? 'bg-[#0d0d12] border-zinc-800/80' : 'bg-white border-slate-200/80'
                        }`}>
                        <BorderBeam size={180} duration={10} colorFrom="#ffffff" colorTo="#3b82f6" borderWidth={1.5} />
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border-0 flex items-center justify-center text-blue-500 shrink-0">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <span className={`text-2xl font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalTenants}</span>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Total de Restaurantes</span>
                        </div>
                    </div>

                    {/* Tarjeta 2: Membresías Activas */}
                    <div className={`relative overflow-hidden p-5 rounded-2xl border flex items-center gap-4 shadow-sm ${isDarkMode ? 'bg-[#0d0d12] border-zinc-800/80' : 'bg-white border-slate-200/80'
                        }`}>
                        <BorderBeam size={180} duration={10} delay={3} colorFrom="#34d399" colorTo="#10b981" borderWidth={1.5} />
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border-0 flex items-center justify-center text-emerald-500 shrink-0">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <span className="text-2xl font-bold text-emerald-500 block">{activeTenants}</span>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Membresías Activas</span>
                        </div>
                    </div>

                    {/* Tarjeta 3: Suspendidos */}
                    <div className={`relative overflow-hidden p-5 rounded-2xl border flex items-center gap-4 shadow-sm ${isDarkMode ? 'bg-[#0d0d12] border-zinc-800/80' : 'bg-white border-slate-200/80'
                        }`}>
                        <BorderBeam size={180} duration={10} delay={6} colorFrom="#f87171" colorTo="#ef4444" borderWidth={1.5} />
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 border-0 flex items-center justify-center text-red-500 shrink-0">
                            <XCircle size={24} />
                        </div>
                        <div>
                            <span className="text-2xl font-bold text-red-500 block">{suspendedTenants}</span>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Suspendidos por Pago</span>
                        </div>
                    </div>
                </div>

                {/* Barra de Filtros, Botón Columnas y Botón Nuevo Local - Estilo Pill sin borde gris */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        {/* Buscador Estilo Pill */}
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                <Search size={14} />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por local o correo..."
                                className={`w-full pl-9 pr-4 py-2 rounded-full text-xs focus:outline-none transition-colors border-0 shadow-sm ${isDarkMode
                                    ? 'bg-zinc-900 text-zinc-200 placeholder-zinc-500 focus:ring-1 focus:ring-zinc-700'
                                    : 'bg-zinc-100 text-zinc-900 placeholder-slate-400 focus:ring-1 focus:ring-slate-300'
                                    }`}
                            />
                        </div>

                        {/* Filtro de Estado Estilo Pill */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={`px-4 py-2 rounded-full text-xs font-medium focus:outline-none cursor-pointer appearance-none pr-8 border-0 shadow-sm ${isDarkMode
                                    ? 'bg-zinc-900 text-zinc-300'
                                    : 'bg-zinc-100 text-zinc-800'
                                    }`}
                            >
                                <option value="all">Estado: Todos</option>
                                <option value="active">Activos</option>
                                <option value="suspended">Suspendidos</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                                <Filter size={12} />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        {/* Botón de Columnas - Estilo Pill sin borde gris */}
                        <div className="relative" ref={columnsMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                                className={`px-4 py-2 rounded-full border-0 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${isDarkMode
                                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                                    }`}
                                title="Configurar columnas visibles"
                            >
                                <Columns3 size={14} />
                                <span>Columnas</span>
                            </button>

                            {/* Dropdown Multi-selección de Columnas */}
                            {showColumnsMenu && (
                                <div
                                    className={`absolute right-0 mt-2 w-48 rounded-2xl border p-2.5 shadow-2xl z-50 text-xs ${isDarkMode
                                        ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                                        : 'bg-white border-slate-200 text-slate-800'
                                        }`}
                                >
                                    <div className="text-[10px] uppercase font-bold text-zinc-400 px-2 py-1 mb-1 border-b border-zinc-800/60">
                                        Columnas visibles
                                    </div>
                                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columns.local}
                                            onChange={(e) => setColumns({ ...columns, local: e.target.checked })}
                                            className="rounded accent-black dark:accent-white"
                                        />
                                        <span>Local</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columns.correo}
                                            onChange={(e) => setColumns({ ...columns, correo: e.target.checked })}
                                            className="rounded accent-black dark:accent-white"
                                        />
                                        <span>Correo</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columns.membresia}
                                            onChange={(e) => setColumns({ ...columns, membresia: e.target.checked })}
                                            className="rounded accent-black dark:accent-white"
                                        />
                                        <span>Membresía</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columns.estado}
                                            onChange={(e) => setColumns({ ...columns, estado: e.target.checked })}
                                            className="rounded accent-black dark:accent-white"
                                        />
                                        <span>Estado</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800/40 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={columns.acciones}
                                            onChange={(e) => setColumns({ ...columns, acciones: e.target.checked })}
                                            className="rounded accent-black dark:accent-white"
                                        />
                                        <span>Acciones</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Botón Registrar Nuevo Local - Estilo Pill sin borde gris */}
                        <button
                            onClick={() => {
                                generateRandomPassword();
                                setShowCreateModal(true);
                            }}
                            className={`px-5 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md border-0 active:scale-95 ${isDarkMode
                                ? 'bg-white hover:bg-zinc-200 text-black'
                                : 'bg-zinc-950 hover:bg-black text-white'
                                }`}
                        >
                            <Plus size={14} />
                            <span>Registrar Nuevo Local</span>
                        </button>
                    </div>
                </div>

                {/* Tabla de Restaurantes - Esquinas redondeadas, mínima sombra, SIN color naranja y con overflow visible para SmoothDropdown */}
                <div
                    className={`rounded-2xl border transition-all ${isDarkMode
                        ? 'bg-[#0d0d12] border-zinc-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
                        : 'bg-white border-slate-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                        }`}
                    style={{
                        '--table-row-border': isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                        '--primary': isDarkMode ? '#ffffff' : '#18181b'
                    }}
                >
                    <div className="overflow-visible min-h-[300px]">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr
                                    className="border-b"
                                    style={{
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                                    }}
                                >
                                    {columns.local && (
                                        <th
                                            className="py-3.5 px-5 font-semibold !text-center first:rounded-tl-2xl"
                                            style={{ color: isDarkMode ? '#a1a1aa' : '#64748b' }}
                                        >
                                            Local
                                        </th>
                                    )}
                                    {columns.correo && (
                                        <th
                                            className="py-3.5 px-4 font-semibold !text-center"
                                            style={{ color: isDarkMode ? '#a1a1aa' : '#64748b' }}
                                        >
                                            Correo
                                        </th>
                                    )}
                                    {columns.membresia && (
                                        <th
                                            className="py-3.5 px-4 font-semibold !text-center"
                                            style={{ color: isDarkMode ? '#a1a1aa' : '#64748b' }}
                                        >
                                            Membresía
                                        </th>
                                    )}
                                    {columns.estado && (
                                        <th
                                            className="py-3.5 px-4 font-semibold !text-center"
                                            style={{ color: isDarkMode ? '#a1a1aa' : '#64748b' }}
                                        >
                                            Estado
                                        </th>
                                    )}
                                    {columns.acciones && (
                                        <th
                                            className="py-3.5 px-5 font-semibold !text-center last:rounded-tr-2xl"
                                            style={{ color: isDarkMode ? '#a1a1aa' : '#64748b' }}
                                        >
                                            Acciones
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {loadingTenants ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-zinc-500">
                                            Cargando información de restaurantes...
                                        </td>
                                    </tr>
                                ) : filteredTenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-zinc-500">
                                            No se encontraron locales registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTenants.map((t, index) => {
                                        const admin = t.usuarios?.[0];

                                        return (
                                            <tr
                                                key={t.id}
                                                className={`border-b transition-colors relative ${isDarkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-slate-50/80'
                                                    }`}
                                                style={{
                                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                                                }}
                                            >
                                                {/* 1. Columna Local (con slug debajo) */}
                                                {columns.local && (
                                                    <td className="py-3.5 px-5 !text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full border-0 flex items-center justify-center font-bold text-xs shrink-0 ${isDarkMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
                                                                }`}>
                                                                {t.nombre.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0 text-left">
                                                                <span className={`font-semibold block truncate ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{t.nombre}</span>
                                                                <span className="text-[11px] text-zinc-400 font-mono">/{t.slug}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                )}

                                                {/* 2. Columna Correo */}
                                                {columns.correo && (
                                                    <td className={`py-3.5 px-4 !text-center ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                                                        {admin?.correo ? (
                                                            <span className="font-mono text-xs">{admin.correo}</span>
                                                        ) : (
                                                            <span className="text-zinc-400 italic">Sin correo</span>
                                                        )}
                                                    </td>
                                                )}

                                                {/* 3. Columna Membresía */}
                                                {columns.membresia && (
                                                    <td className="py-3.5 px-4 !text-center">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold border-0 ${isDarkMode ? 'bg-zinc-800/80 text-zinc-300' : 'bg-zinc-100 text-zinc-800'
                                                            }`}>
                                                            {t.tipoMembresia || 'Emprendedor'}
                                                        </span>
                                                    </td>
                                                )}

                                                {/* 4. Columna Estado (Conserva colores semánticos) */}
                                                {columns.estado && (
                                                    <td className="py-3.5 px-4 !text-center">
                                                        {t.activo ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] font-semibold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Activo
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 text-[11px] font-semibold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                Suspendido
                                                            </span>
                                                        )}
                                                    </td>
                                                )}

                                                {/* 5. Columna Acciones con SmoothDropdown auténtico de Arqueo de Caja */}
                                                {columns.acciones && (
                                                    <td className="py-3.5 px-5 !text-center relative" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-center items-center h-10">
                                                            <SmoothDropdown
                                                                id={t.id}
                                                                dropUp={index >= Math.max(1, filteredTenants.length - 2)}
                                                                items={getSuperadminActions(t)}
                                                                onAction={(actionId) => handleSuperadminAction(actionId, t)}
                                                            />
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* MODAL 1: Card Flotante "Detalles del Cliente" con CloseButton */}
            {viewingDetailsTenant && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-left"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                    onClick={() => setViewingDetailsTenant(null)}
                >
                    <div
                        className={`superadmin-modal-card w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border ${isDarkMode ? 'bg-[#0f1016] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
                            }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`flex items-center justify-between pb-4 border-b mb-5 ${isDarkMode ? 'border-zinc-800/70' : 'border-zinc-200'}`}>
                            <div>
                                <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>Detalles del Cliente</h3>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Información registrada de la cuenta y establecimiento
                                </p>
                            </div>
                            <CloseButton onClick={() => setViewingDetailsTenant(null)} />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-zinc-800/80 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-950'}`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Nombres:</span>
                                <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{viewingDetailsTenant.clienteNombres || '-'}</span>
                            </div>

                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-zinc-800/80 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-950'}`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Apellidos:</span>
                                <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{viewingDetailsTenant.clienteApellidos || '-'}</span>
                            </div>

                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-zinc-800/80 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-950'}`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Teléfono:</span>
                                <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{viewingDetailsTenant.telefono || '-'}</span>
                            </div>

                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-zinc-800/80 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-950'}`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Fecha de Pagos:</span>
                                <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{viewingDetailsTenant.fechaPagos || '-'}</span>
                            </div>

                            <div className={`col-span-2 p-3.5 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-zinc-800/80 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-950'}`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Dirección del Local:</span>
                                <span className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{viewingDetailsTenant.direccion || '-'}</span>
                            </div>

                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-zinc-800/80 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-950'}`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Fecha Inscripción:</span>
                                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>
                                    {viewingDetailsTenant.fechaCreacion
                                        ? new Date(viewingDetailsTenant.fechaCreacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : '-'}
                                </span>
                            </div>

                            <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-black/30 border-zinc-800/80 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-950'}`}>
                                <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Membresía & Estado:</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{viewingDetailsTenant.tipoMembresia || 'Emprendedor'}</span>
                                    <span>•</span>
                                    <span className={viewingDetailsTenant.activo ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                                        {viewingDetailsTenant.activo ? 'Activo' : 'Suspendido'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setViewingDetailsTenant(null)}
                                className={`btn-cancel px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 shadow-sm ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                                    }`}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Editar Local con CloseButton y Botones Pill */}
            {editingTenant && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-left"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                >
                    <div
                        className={`superadmin-modal-card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-6 shadow-2xl relative border ${isDarkMode ? 'bg-[#0f1016] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]'
                            }`}
                    >
                        <div className={`flex items-center justify-between pb-3 border-b mb-5 ${isDarkMode ? 'border-zinc-800/70' : 'border-zinc-200'}`}>
                            <div>
                                <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>
                                    <Pencil size={16} />
                                    Editar Local
                                </h3>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Actualiza los datos del restaurante y del cliente
                                </p>
                            </div>
                            <CloseButton onClick={() => setEditingTenant(null)} />
                        </div>

                        {editError && (
                            <div className="p-3 rounded-2xl bg-red-500/10 border-0 text-red-500 text-xs mb-4 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{editError}</span>
                            </div>
                        )}

                        <form onSubmit={handleUpdateTenant} className="space-y-4 text-xs">
                            <div>
                                <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                    Nombre del Local <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingTenant.nombre}
                                    onChange={(e) => setEditingTenant({ ...editingTenant, nombre: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                        }`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                        Correo del Administrador <span className="text-red-500 font-bold ml-0.5">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={editingTenant.correoAdmin}
                                        onChange={(e) => setEditingTenant({ ...editingTenant, correoAdmin: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                        Membresía <span className="text-red-500 font-bold ml-0.5">*</span>
                                    </label>
                                    <select
                                        value={editingTenant.tipoMembresia}
                                        onChange={(e) => setEditingTenant({ ...editingTenant, tipoMembresia: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none cursor-pointer border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900'
                                            }`}
                                    >
                                        <option value="Emprendedor">Emprendedor</option>
                                        <option value="Restaurante Pro">Restaurante Pro</option>
                                        <option value="Corporativo">Corporativo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                    Dirección del Local <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingTenant.direccion}
                                    onChange={(e) => setEditingTenant({ ...editingTenant, direccion: e.target.value })}
                                    placeholder="Av. Principal 123, Miraflores, Lima"
                                    className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                        }`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Nombres</label>
                                    <input
                                        type="text"
                                        value={editingTenant.clienteNombres}
                                        onChange={(e) => setEditingTenant({ ...editingTenant, clienteNombres: e.target.value })}
                                        placeholder="Nombre del titular"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Apellidos</label>
                                    <input
                                        type="text"
                                        value={editingTenant.clienteApellidos}
                                        onChange={(e) => setEditingTenant({ ...editingTenant, clienteApellidos: e.target.value })}
                                        placeholder="Apellidos del titular"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Teléfono</label>
                                    <input
                                        type="text"
                                        value={editingTenant.telefono}
                                        onChange={(e) => setEditingTenant({ ...editingTenant, telefono: e.target.value })}
                                        placeholder="+51 987 654 321"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Fecha de Pagos</label>
                                    <input
                                        type="text"
                                        value={editingTenant.fechaPagos}
                                        onChange={(e) => setEditingTenant({ ...editingTenant, fechaPagos: e.target.value })}
                                        placeholder="ej. 15 de cada mes"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className={`flex justify-end gap-3 pt-4 border-t ${isDarkMode ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setEditingTenant(null)}
                                    className={`btn-cancel px-5 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer border-0 shadow-sm ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                                        }`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer shadow-md border-0 active:scale-95 ${isDarkMode
                                        ? 'bg-white hover:bg-zinc-200 text-black'
                                        : 'bg-zinc-950 hover:bg-black text-white'
                                        }`}
                                >
                                    {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: Registrar Nuevo Local con CloseButton y Botones Pill */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-left"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                >
                    <div
                        className={`superadmin-modal-card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl p-6 shadow-2xl relative border ${isDarkMode ? 'bg-[#0f1016] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]'
                            }`}
                    >
                        <div className={`flex items-center justify-between pb-3 border-b mb-5 ${isDarkMode ? 'border-zinc-800/70' : 'border-zinc-200'}`}>
                            <div>
                                <h3 className={`text-base font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>
                                    <Building2 size={18} />
                                    Dar de Alta Nuevo Local
                                </h3>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Registra una nueva sede con sus datos y credenciales
                                </p>
                            </div>
                            <CloseButton onClick={() => setShowCreateModal(false)} />
                        </div>

                        {createError && (
                            <div className="p-3 rounded-2xl bg-red-500/10 border-0 text-red-500 text-xs mb-4 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{createError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
                            <div>
                                <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                    Nombre del Local <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newLocal.nombre}
                                    onChange={(e) => handleNombreChange(e.target.value)}
                                    placeholder="ej. Pizzería Nápoles"
                                    className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                        }`}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                        Slug (URL Identificadora)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newLocal.slug}
                                        onChange={(e) => setNewLocal({ ...newLocal, slug: e.target.value })}
                                        placeholder="pizzeria-napoles"
                                        className={`w-full px-4 py-2.5 rounded-full font-mono focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 focus:border-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                        Membresía <span className="text-red-500 font-bold ml-0.5">*</span>
                                    </label>
                                    <select
                                        value={newLocal.tipoMembresia}
                                        onChange={(e) => setNewLocal({ ...newLocal, tipoMembresia: e.target.value })}
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none cursor-pointer border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:bg-white focus:border-zinc-900'
                                            }`}
                                    >
                                        <option value="Emprendedor">Emprendedor</option>
                                        <option value="Restaurante Pro">Restaurante Pro</option>
                                        <option value="Corporativo">Corporativo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                        Correo del Administrador <span className="text-red-500 font-bold ml-0.5">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={newLocal.correoAdmin}
                                        onChange={(e) => setNewLocal({ ...newLocal, correoAdmin: e.target.value })}
                                        placeholder="dueno@pizzeria.com"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                        Dirección del Local <span className="text-red-500 font-bold ml-0.5">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newLocal.direccion}
                                        onChange={(e) => setNewLocal({ ...newLocal, direccion: e.target.value })}
                                        placeholder="Av. Larco 456, Miraflores"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Nombres</label>
                                    <input
                                        type="text"
                                        value={newLocal.clienteNombres}
                                        onChange={(e) => setNewLocal({ ...newLocal, clienteNombres: e.target.value })}
                                        placeholder="Nombre del cliente"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Apellidos</label>
                                    <input
                                        type="text"
                                        value={newLocal.clienteApellidos}
                                        onChange={(e) => setNewLocal({ ...newLocal, clienteApellidos: e.target.value })}
                                        placeholder="Apellidos del cliente"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Teléfono</label>
                                    <input
                                        type="text"
                                        value={newLocal.telefono}
                                        onChange={(e) => setNewLocal({ ...newLocal, telefono: e.target.value })}
                                        placeholder="+51 987 654 321"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block font-semibold mb-1.5 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Fecha de Pagos</label>
                                    <input
                                        type="text"
                                        value={newLocal.fechaPagos}
                                        onChange={(e) => setNewLocal({ ...newLocal, fechaPagos: e.target.value })}
                                        placeholder="ej. 05 de cada mes"
                                        className={`w-full px-4 py-2.5 rounded-full focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/20' : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400 focus:bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className={`font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                        Contraseña Provisional para Acceso <span className="text-red-500 font-bold ml-0.5">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className={`text-xs font-semibold cursor-pointer bg-transparent border-0 p-0 transition-colors hover:underline ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-950'
                                            }`}
                                    >
                                        Generar otra
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={newLocal.passwordTemporal}
                                    onChange={(e) => setNewLocal({ ...newLocal, passwordTemporal: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-full font-mono tracking-wider focus:outline-none transition-colors border shadow-sm ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-200 focus:border-zinc-600' : 'bg-zinc-50 border-zinc-300 text-zinc-950 font-bold focus:bg-white focus:border-zinc-900'
                                        }`}
                                />
                                <p className={`text-[11px] mt-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                    * La Fecha de Inscripción se registrará automáticamente con la fecha de hoy.
                                </p>
                            </div>

                            <div className={`flex justify-end gap-3 pt-4 border-t ${isDarkMode ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className={`btn-cancel px-5 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer border-0 shadow-sm ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                                        }`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer shadow-md border-0 active:scale-95 ${isDarkMode
                                        ? 'bg-white hover:bg-zinc-200 text-black'
                                        : 'bg-zinc-950 hover:bg-black text-white'
                                        }`}
                                >
                                    {createLoading ? 'Creando...' : 'Dar de Alta Local'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: Confirmación de Eliminación con Botones Pill */}
            {tenantToDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-left"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
                >
                    <div className={`superadmin-modal-card w-full max-w-md rounded-3xl p-6 shadow-2xl relative border ${isDarkMode ? 'bg-[#0f1016] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
                        }`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border-0 text-red-500 flex items-center justify-center shrink-0">
                                <Trash2 size={22} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-red-500">¿Eliminar local por completo?</h3>
                                <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                    Esta acción es permanente e irreversible
                                </p>
                            </div>
                        </div>

                        {deleteError && (
                            <div className="p-3 rounded-2xl bg-red-500/10 border-0 text-red-500 text-xs mb-4 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{deleteError}</span>
                            </div>
                        )}

                        <div className={`p-4 rounded-2xl border text-xs mb-5 space-y-2.5 ${isDarkMode ? 'bg-black/40 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                            }`}>
                            <p className="leading-relaxed">
                                Se eliminará de raíz toda la información almacenada en la base de datos correspondiente a:
                            </p>
                            <div className={`p-2.5 rounded-xl border flex items-center justify-between font-semibold text-sm ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-950 shadow-sm'
                                }`}>
                                <span>{tenantToDelete.nombre}</span>
                                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                    /{tenantToDelete.slug}
                                </span>
                            </div>
                            <ul className={`list-disc list-inside text-[11px] space-y-1 pt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                <li>Se borrarán usuarios, mesas, cartas, comandas y arqueos.</li>
                                <li>No quedarán registros huérfanos ni consumo de memoria en la base de datos.</li>
                                <li>El slug <strong className={isDarkMode ? 'text-white' : 'text-black'}>{tenantToDelete.slug}</strong> quedará liberado inmediatamente.</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                disabled={deleteLoading}
                                onClick={() => {
                                    setTenantToDelete(null);
                                    setDeleteError('');
                                }}
                                className={`btn-cancel flex-1 py-2.5 px-5 rounded-full font-bold text-xs transition-colors cursor-pointer border-0 shadow-sm ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                                    }`}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={deleteLoading}
                                onClick={handleDeleteTenant}
                                className="flex-1 py-2.5 px-5 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 active:scale-95 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer border-0"
                            >
                                {deleteLoading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        <span>Eliminar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
