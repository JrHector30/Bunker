import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { networkStatus, NetworkState, db, offlineSnapshotService } from '../offline';
import {
    LayoutDashboard,
    UtensilsCrossed,
    ChefHat,
    DollarSign,
    BookOpen,
    User,
    TrendingUp,
    Settings,
    LogOut,
    Sun,
    Moon,
    AlertCircle,
    X,
    Phone,
    Heart,
    ChevronDown,
    ChevronUp,
    Package,
    History,
    ClipboardCheck,
    Beaker,
    Utensils,
    ChartColumn,
    Menu,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

const DashboardLayout = () => {
    const { user, logout, tienePermiso } = useAuth();
    const { theme, mode, toggleMode, showAlerts } = useTheme();
    const isMinimal = theme === 'theme-black';
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    const [netState, setNetState] = useState(networkStatus.getStatus());
    const [pendingOps, setPendingOps] = useState(0);

    const isOffline = netState === NetworkState.OFFLINE_CONFIRMED || netState === NetworkState.REMOTE_RESULT_UNKNOWN;

    // Sincroniza el modo claro/oscuro solo dentro del dashboard autenticado
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('mode-dark', 'mode-light', 'dark');
        if (mode === 'dark') {
            root.classList.add('mode-dark', 'dark');
        } else {
            root.classList.add('mode-light');
        }
        return () => {
            root.classList.remove('mode-light');
            root.classList.add('mode-dark', 'dark');
        };
    }, [mode]);

    // Suscripción al monitor de red y recuento de operaciones pendientes
    useEffect(() => {
        const unsubscribe = networkStatus.subscribe(setNetState);

        const updatePendingCount = async () => {
            try {
                const count = await db.syncQueue.where('status').equals('PENDING').count();
                setPendingOps(count);
            } catch (err) {
                console.error('[DashboardLayout] Error al contar operaciones pendientes:', err);
            }
        };

        updatePendingCount();

        const interval = setInterval(() => {
            updatePendingCount();
            networkStatus.checkConnectivity().catch(() => { });
        }, 8000);

        window.addEventListener('syncQueueChanged', updatePendingCount);

        return () => {
            unsubscribe();
            clearInterval(interval);
            window.removeEventListener('syncQueueChanged', updatePendingCount);
        };
    }, []);

    // Hidratación automática de fondo al entrar / detectar ONLINE
    useEffect(() => {
        if (netState === NetworkState.ONLINE) {
            offlineSnapshotService.hydrateOperationalSnapshot()
                .catch(err => console.warn('[DashboardLayout] Hidratación inicial fallida o pospuesta:', err));
        }
    }, [netState]);

    // Bloqueo estricto de navegación a módulos administrativos offline
    useEffect(() => {
        if (isOffline) {
            const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/settings';
            if (isAdminRoute) {
                showToast('Módulo administrativo no disponible en modo offline.', 'error');
                navigate('/home');
            }
        }
    }, [isOffline, location.pathname, navigate, showToast]);

    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('bunker_sidebar_collapsed') === 'true');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
    const [isLogisticaExpanded, setIsLogisticaExpanded] = useState(() => {
        const saved = localStorage.getItem('bunker_logistica_expanded');
        return saved === 'true';
    });

    const toggleLogistica = () => {
        setIsLogisticaExpanded(prev => {
            const next = !prev;
            localStorage.setItem('bunker_logistica_expanded', next.toString());
            return next;
        });
    };

    // Bloquear scroll de fondo cuando el Drawer móvil está abierto
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    // Cerrar drawer móvil al cambiar de ruta
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname, location.search]);

    // Fetch alerts globally if user is admin or caja
    const fetchAlerts = () => {
        if (user && (user.rol === 'admin' || user.rol === 'caja')) {
            fetch('/api/insumos/alertas')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setLowStockAlerts(data);
                })
                .catch(err => console.error("Error fetching low stock alerts:", err));
        }
    };

    useEffect(() => {
        fetchAlerts();
        window.addEventListener('insumos-updated', fetchAlerts);
        return () => window.removeEventListener('insumos-updated', fetchAlerts);
    }, [user]);

    useEffect(() => {
        localStorage.setItem('bunker_sidebar_collapsed', collapsed.toString());
    }, [collapsed]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { id: 'home', to: '/home', icon: LayoutDashboard, label: 'Inicio', modulo: 'inicio' },
        { id: 'tables', to: '/tables', icon: UtensilsCrossed, label: 'Mesas', modulo: 'mesas' },
        { id: 'kitchen', to: '/kitchen', icon: ChefHat, label: 'Cocina', modulo: 'cocina' },
        { id: 'cashier', to: '/cashier', icon: DollarSign, label: 'Caja', modulo: 'caja' },
        { id: 'categories', to: '/admin/categories', icon: BookOpen, label: 'Categorías', modulo: 'categories' },
        { id: 'inventory', to: '/admin/inventory', icon: ChartColumn, label: 'Logística', modulo: 'logistica' },
        { id: 'users', to: '/admin/users', icon: User, label: 'Usuarios', modulo: 'usuarios' },
        { id: 'reports', to: '/admin/staff-stats', icon: TrendingUp, label: 'Reportes', modulo: 'reportes' },
        { id: 'support', to: '/support', icon: Phone, label: 'Atención y Soporte' },
        { id: 'settings', to: '/settings', icon: Settings, label: 'Ajustes' },
    ];

    const visibleMenuItems = menuItems.filter(item => !item.modulo || tienePermiso(item.modulo));

    const getRoleName = (role) => {
        switch (role) {
            case 'admin':
            case 'caja':
                return 'ADMIN / CAJA';
            case 'cocina':
                return 'COCINA';
            case 'mesas':
            case 'mozo':
            default:
                return 'MOZO RESPONSABLE';
        }
    };

    const getActiveSectionLabel = () => {
        if (location.pathname.startsWith('/tables')) return 'Mesas';
        if (location.pathname.startsWith('/kitchen')) return 'Cocina';
        if (location.pathname.startsWith('/cashier')) return 'Caja';
        if (location.pathname.startsWith('/admin/categories')) return 'Categorías';
        if (location.pathname.startsWith('/admin/inventory')) {
            if (location.search.includes('tab=insumos')) return 'Logística: Insumos';
            if (location.search.includes('tab=recetarios')) return 'Logística: Recetarios';
            if (location.search.includes('tab=kardex')) return 'Logística: Kardex';
            if (location.search.includes('tab=auditoria')) return 'Logística: Auditoría';
            return 'Logística: Menú';
        }
        if (location.pathname.startsWith('/admin/users')) return 'Usuarios';
        if (location.pathname.startsWith('/admin/staff-stats')) return 'Reportes';
        if (location.pathname.startsWith('/support')) return 'Soporte';
        if (location.pathname.startsWith('/settings')) return 'Ajustes';
        return 'Inicio';
    };

    const isDarkMode = mode === 'dark';
    const isCashier = location.pathname === '/cashier';
    const isRecetarios = location.pathname.startsWith('/admin/inventory') && (location.search.includes('tab=recetarios') || location.search.includes('tab=recetario'));

    // --- RENDER SIDEBAR BODY (Shared between Desktop Sticky and Mobile Drawer) ---
    const renderSidebarBody = (isMobileDrawer = false) => {
        const isCompact = !isMobileDrawer && collapsed;

        return (
            <div className="flex flex-col h-full bg-[#0B0F19] text-slate-300 select-none">
                {/* Top Brand Header */}
                <div
                    className={`flex items-center ${
                        isCompact ? 'justify-center px-3' : 'justify-between px-4'
                    } pt-5 pb-4 border-b border-white/[0.08]`}
                >
                    <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                        onClick={() => {
                            navigate('/home');
                            if (isMobileDrawer) setMobileMenuOpen(false);
                        }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-[#131A29] border border-white/[0.08] shadow-[0_0_20px_rgba(242,101,34,0.14)] flex items-center justify-center shrink-0 overflow-hidden">
                            <img src="/android-chrome-192x192.png" alt="Búnker" className="w-6 h-6 object-contain" />
                        </div>
                        {!isCompact && (
                            <div className="flex flex-col leading-tight min-w-0">
                                <span className="text-[15px] font-bold tracking-wide text-white whitespace-nowrap">
                                    BÚNKER
                                </span>
                                <span className="text-[10px] font-bold tracking-[0.16em] text-[#F26522] whitespace-nowrap mt-0.5">
                                    SISTEMA
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Botón cerrar en móvil / contraer en escritorio */}
                    <button
                        type="button"
                        onClick={isMobileDrawer ? () => setMobileMenuOpen(false) : () => setCollapsed(!collapsed)}
                        aria-label={isMobileDrawer ? "Cerrar menú" : (collapsed ? "Expandir menú" : "Contraer menú")}
                        className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                        {isMobileDrawer ? (
                            <X className="w-4 h-4" />
                        ) : (
                            collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Lista de enlaces */}
                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {visibleMenuItems.map((item) => {
                        const Icon = item.icon;

                        // Grupo Logística
                        if (item.id === 'inventory') {
                            const logisticaSubItems = [
                                { id: 'logistica-platos', to: '/admin/inventory?tab=platos', icon: Utensils, label: 'Menú (Platos)' },
                                { id: 'logistica-insumos', to: '/admin/inventory?tab=insumos', icon: Package, label: 'Inventario (Insumos)' },
                                { id: 'logistica-recetario', to: '/admin/inventory?tab=recetarios', icon: Beaker, label: 'Recetarios (Costeo)' },
                                { id: 'logistica-kardex', to: '/admin/inventory?tab=kardex', icon: History, label: 'Kardex' },
                                { id: 'logistica-auditoria', to: '/admin/inventory?tab=auditoria', icon: ClipboardCheck, label: 'Auditoría' },
                            ];

                            const isPathActive = location.pathname.startsWith('/admin/inventory') || location.search.includes('tab=recetarios');

                            if (isCompact) {
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            if (isOffline) {
                                                showToast('Módulo administrativo no disponible en modo offline.', 'error');
                                                return;
                                            }
                                            navigate('/admin/inventory?tab=platos');
                                        }}
                                        title="Logística"
                                        className={`w-full flex items-center justify-center py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
                                            isPathActive
                                                ? 'bg-[#F26522] text-white font-semibold shadow-[0_6px_18px_-4px_rgba(242,101,34,0.55)]'
                                                : 'text-slate-300/90 hover:text-white hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        <Icon className="w-[18px] h-[18px] shrink-0" />
                                    </button>
                                );
                            }

                            return (
                                <div key={item.id} className="pt-1 pb-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isOffline) {
                                                showToast('Módulo administrativo no disponible en modo offline.', 'error');
                                                return;
                                            }
                                            toggleLogistica();
                                        }}
                                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold bg-white/[0.06] text-white hover:bg-white/[0.09] transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <Icon className="w-[18px] h-[18px] shrink-0 text-[#F26522]" />
                                            <span className="truncate">{item.label}</span>
                                        </div>
                                        {isLogisticaExpanded ? (
                                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                        )}
                                    </button>

                                    {isLogisticaExpanded && (
                                        <div className="relative mt-1.5 ml-5 pl-3.5 border-l border-white/[0.12] space-y-1">
                                            {logisticaSubItems.map((sub) => {
                                                const SubIcon = sub.icon;
                                                const currentPathWithSearch = location.pathname + location.search;
                                                const isSubActive = currentPathWithSearch === sub.to || (sub.to.includes('tab=platos') && currentPathWithSearch === '/admin/inventory');
                                                return (
                                                    <Link
                                                        key={sub.id}
                                                        to={sub.to}
                                                        onClick={() => {
                                                            if (isMobileDrawer) setMobileMenuOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all duration-150 cursor-pointer no-underline ${
                                                            isSubActive
                                                                ? 'bg-[#F26522] text-white font-semibold shadow-[0_6px_18px_-4px_rgba(242,101,34,0.55)]'
                                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] font-medium'
                                                        }`}
                                                    >
                                                        <SubIcon className="w-4 h-4 shrink-0" />
                                                        <span className="truncate">{sub.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const isAdminItem = item.to.startsWith('/admin') || item.to === '/settings';
                        const isLinkActive = location.pathname.startsWith(item.to);

                        return (
                            <NavLink
                                key={item.id}
                                to={isOffline && isAdminItem ? '#' : item.to}
                                onClick={(e) => {
                                    if (isOffline && isAdminItem) {
                                        e.preventDefault();
                                        showToast('Módulo administrativo no disponible en modo offline.', 'error');
                                        return;
                                    }
                                    if (isMobileDrawer) setMobileMenuOpen(false);
                                }}
                                title={isCompact ? item.label : undefined}
                                className={`w-full flex items-center ${
                                    isCompact ? 'justify-center px-2' : 'gap-3.5 px-3.5'
                                } py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 cursor-pointer no-underline ${
                                    isLinkActive
                                        ? 'bg-[#F26522] text-white font-semibold shadow-[0_6px_18px_-4px_rgba(242,101,34,0.55)]'
                                        : 'text-slate-300/90 hover:text-white hover:bg-white/[0.05]'
                                } ${isOffline && isAdminItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                <Icon className="w-[18px] h-[18px] shrink-0" />
                                {!isCompact && <span className="truncate">{item.label}</span>}
                            </NavLink>
                        );
                    })}

                    {/* Alertas de Insumos */}
                    {(user?.rol === 'admin' || user?.rol === 'caja') && lowStockAlerts.length > 0 && showAlerts && (
                        <div
                            onClick={() => {
                                setIsAlertsModalOpen(true);
                                if (isMobileDrawer) setMobileMenuOpen(false);
                            }}
                            className={`mt-4 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl transition-all duration-300 cursor-pointer flex flex-col gap-2 overflow-hidden ${
                                isCompact ? 'p-2 items-center justify-center' : 'p-3 w-full'
                            }`}
                            title="Insumos por agotarse"
                        >
                            <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                                <AlertCircle size={18} className="shrink-0 animate-pulse" />
                                {!isCompact && <span className="whitespace-nowrap font-sans">Insumos por Agotarse</span>}
                            </div>
                            {!isCompact && (
                                <div className="flex flex-col gap-1 max-h-16 overflow-y-auto pr-1">
                                    {lowStockAlerts.slice(0, 3).map(alert => (
                                        <div key={alert.id} className="flex justify-between text-[10px] text-slate-300">
                                            <span className="truncate max-w-[100px] font-sans" title={alert.nombre}>{alert.nombre}</span>
                                            <span className="font-bold text-amber-500">{parseFloat(Number(alert.stock).toFixed(2))} {alert.unidadMedida}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* Tarjeta inferior de perfil */}
                <div className="px-3 pb-4 pt-3 border-t border-white/[0.08]">
                    {isCompact ? (
                        <div className="flex flex-col items-center gap-2">
                            <div
                                onClick={handleLogout}
                                className="w-10 h-10 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#F26522] transition-all"
                                title={`${user?.nombre || 'Usuario'} - Clic para cerrar sesión`}
                            >
                                {user?.foto ? (
                                    <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <User className="w-4 h-4 text-slate-300" />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-2xl bg-[#E6E8EC] text-slate-900 shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-slate-400/40 flex items-center justify-center shrink-0">
                                    {user?.foto ? (
                                        <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-4 h-4 text-slate-200" />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0 leading-tight">
                                    <span className="text-[13.5px] font-bold text-slate-900 truncate">
                                        {user?.nombre || 'Hector'}
                                    </span>
                                    <span className="text-[10.5px] font-semibold tracking-wide text-slate-500 truncate mt-0.5">
                                        {getRoleName(user?.rol)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={toggleMode}
                                    title={mode === 'dark' ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-300/60 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
                                >
                                    {mode === 'dark' ? (
                                        <Sun className="w-4 h-4 text-amber-600" />
                                    ) : (
                                        <Moon className="w-4 h-4 text-slate-600" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    title="Cerrar Sesión"
                                    className="w-8 h-8 rounded-lg hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors cursor-pointer shrink-0"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <React.Fragment>
            <div className="min-h-screen flex bg-[#F8F9FA] dark:bg-[#080B11] text-slate-900 dark:text-slate-100">
                {/* 1. Desktop Sticky Sidebar (>= 1024px) */}
                <aside
                    className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 transition-[width] duration-200 ease-out border-r border-slate-900/10 dark:border-white/10 ${
                        collapsed ? 'w-[76px]' : 'w-[256px]'
                    }`}
                >
                    {renderSidebarBody(false)}
                </aside>

                {/* 2. Mobile Drawer Overlay (< 1024px) */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden flex">
                        <div
                            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-hidden="true"
                        />
                        <aside className="relative z-10 w-[264px] max-w-[85vw] h-full shadow-2xl">
                            {renderSidebarBody(true)}
                        </aside>
                    </div>
                )}

                {/* 3. Área principal */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Mobile Top Bar (< 1024px) */}
                    <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0B0F19] text-white border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Abrir menú de navegación"
                                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="leading-tight">
                                <span className="text-sm font-bold tracking-wide block">
                                    BÚNKER
                                </span>
                                <span className="text-[10px] font-bold tracking-[0.14em] text-[#F26522] block">
                                    SISTEMA
                                </span>
                            </div>
                        </div>

                        <span className="text-xs font-medium text-slate-300 truncate max-w-[160px]">
                            {getActiveSectionLabel()}
                        </span>
                    </div>

                    <main className={`flex-1 ${isCashier || isRecetarios ? 'p-0 max-w-none' : 'px-4 sm:px-6 lg:px-8 py-6 lg:py-7 max-w-[1440px]'} w-full mx-auto space-y-6 flex flex-col`}>
                        {isOffline && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4 animate-pulse backdrop-blur-md shadow-lg shadow-amber-500/5">
                                <div className="flex items-center gap-2.5 text-amber-500 font-bold text-xs">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <span className="font-sans tracking-wide">MODO OFFLINE ACTIVO — Operando localmente con IndexedDB</span>
                                </div>
                                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-sans">
                                    {pendingOps} operaciones pendientes
                                </span>
                            </div>
                        )}

                        <div className="flex-grow">
                            <ErrorBoundary>
                                <Outlet />
                            </ErrorBoundary>
                        </div>

                        {!isRecetarios && (
                            <footer className={`mt-auto pt-6 border-t border-slate-800/10 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--text-muted)] font-medium ${isCashier ? 'mb-4' : ''}`}>
                                <span>© 2026 Búnker - Sistema de Gestión de Comandas Inteligentes.</span>
                                <div className="flex items-center gap-1">
                                    <span>Hecho con</span>
                                    <Heart className="w-3.5 h-3.5 text-[var(--primary)] fill-[var(--primary)] animate-pulse" />
                                    <span>por Hector y Melanie</span>
                                </div>
                            </footer>
                        )}
                    </main>
                </div>
            </div>

            {/* Modal de Alertas de Escasez */}
            {isAlertsModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsAlertsModalOpen(false)}>
                    <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: 500, background: isDarkMode ? 'rgba(20, 20, 20, 0.85)' : 'var(--bg-secondary, rgba(255, 255, 255, 0.95))', backdropFilter: 'blur(15px)', color: isDarkMode ? '#fff' : 'var(--text-main, #1e293b)', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--glass-border, rgba(0,0,0,0.1))' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--glass-border, rgba(0,0,0,0.1))', paddingBottom: 15, marginBottom: 15 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <AlertCircle color="var(--danger)" size={24} />
                                <h2 style={{ margin: 0 }}>Insumos por Agotarse</h2>
                            </div>
                            <button className="glass-button" onClick={() => setIsAlertsModalOpen(false)} style={{ border: 'none', background: 'transparent', padding: 5, color: isDarkMode ? '#fff' : 'var(--text-main, #1e293b)' }}><X size={24} /></button>
                        </div>
                        <div className="modal-body minimal-scrollbar" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 10 }}>
                            {lowStockAlerts.length === 0 ? (
                                <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No hay insumos por agotarse.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--table-row-border, rgba(0,0,0,0.1))', textAlign: 'left', fontSize: '0.9rem', color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'var(--text-muted, #64748b)' }}>
                                            <th style={{ padding: '10px 0' }}>Insumo</th>
                                            <th style={{ padding: '10px 0', textAlign: 'right' }}>Stock Actual</th>
                                            <th style={{ padding: '10px 0', textAlign: 'right' }}>Mínimo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStockAlerts.map(alert => (
                                            <tr key={alert.id} style={{ borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--table-row-border, rgba(0,0,0,0.05))', fontSize: '0.95rem' }}>
                                                <td style={{ padding: '12px 0', fontWeight: '500' }}>{alert.nombre}</td>
                                                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--warning)' }}>
                                                    {parseFloat(Number(alert.stock).toFixed(2))} <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{alert.unidadMedida}</span>
                                                </td>
                                                <td style={{ padding: '12px 0', textAlign: 'right', color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'var(--text-muted, #64748b)' }}>
                                                    {parseFloat(Number(alert.stockMinimo).toFixed(2))} <span style={{ fontSize: '0.8rem' }}>{alert.unidadMedida}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default DashboardLayout;
