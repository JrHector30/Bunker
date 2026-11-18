import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import CloseButton from './ui/CloseButton';
import ErrorBoundary from './ErrorBoundary';
import AtomicSyncModal from './AtomicSyncModal';

const DashboardLayout = () => {
    const { user, logout, tienePermiso } = useAuth();
    const { theme, mode, toggleMode, showAlerts } = useTheme();
    const isMinimal = theme === 'theme-black';
    const { showToast } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    const [netState, setNetState] = useState(networkStatus.getStatus());
    const [pendingOps, setPendingOps] = useState(0);
    const [showAtomicSyncModal, setShowAtomicSyncModal] = useState(false);
    const prevNetStateRef = useRef(netState);

    const isOffline = netState === NetworkState.OFFLINE_CONFIRMED || netState === NetworkState.REMOTE_RESULT_UNKNOWN;

    // Detectar transición Offline -> Online y abrir automáticamente el modal de sincronización si hay pendientes
    useEffect(() => {
        const wasOffline = prevNetStateRef.current === NetworkState.OFFLINE_CONFIRMED || prevNetStateRef.current === NetworkState.REMOTE_RESULT_UNKNOWN;
        const isNowOnline = netState === NetworkState.ONLINE;

        if (wasOffline && isNowOnline && pendingOps > 0) {
            setShowAtomicSyncModal(true);
        }
        prevNetStateRef.current = netState;
    }, [netState, pendingOps]);

    // Listener global para invocar la sincronización atómica desde Ajustes o cualquier vista
    useEffect(() => {
        const handleTrigger = () => {
            db.syncQueue.where('status').equals('PENDING').count().then(count => {
                if (count > 0) {
                    setShowAtomicSyncModal(true);
                }
            }).catch(() => {});
        };
        window.addEventListener('triggerAtomicSync', handleTrigger);
        return () => window.removeEventListener('triggerAtomicSync', handleTrigger);
    }, []);

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

    // Bloqueo estricto de navegación a módulos administrativos offline (Ajustes /settings permanece habilitado para pruebas y control)
    useEffect(() => {
        if (isOffline) {
            const isAdminRoute = location.pathname.startsWith('/admin');
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
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/categories')) return true;
        const saved = localStorage.getItem('bunker_logistica_expanded');
        return saved === 'true';
    });

    useEffect(() => {
        if (location.pathname.startsWith('/admin/categories')) {
            setIsLogisticaExpanded(true);
        }
    }, [location.pathname]);

    const toggleLogistica = () => {
        setIsLogisticaExpanded(prev => {
            const next = !prev;
            localStorage.setItem('bunker_logistica_expanded', next.toString());
            return next;
        });
    };

    // --- RESPONSIVE MOBILE & TABLET STATES ---
    const [isLogisticaPopoverOpen, setIsLogisticaPopoverOpen] = useState(false);
    const [popoverTop, setPopoverTop] = useState(240);
    const [isTabletRail, setIsTabletRail] = useState(() => window.innerWidth >= 640 && window.innerWidth < 900);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const logisticaBtnRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        if (isProfileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileMenuOpen]);

    useEffect(() => {
        setIsProfileMenuOpen(false);
    }, [location.pathname, collapsed]);

    useEffect(() => {
        const handleResize = () => {
            setIsTabletRail(window.innerWidth >= 640 && window.innerWidth < 900);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
        { id: 'inventory', to: '/admin/inventory', icon: ChartColumn, label: 'Logística', modulo: 'logistica' },
        { id: 'users', to: '/admin/users', icon: User, label: 'Usuarios', modulo: 'usuarios' },
        { id: 'reports', to: '/admin/staff-stats', icon: TrendingUp, label: 'Reportes', modulo: 'reportes' },
        { id: 'support', to: '/support', icon: Phone, label: 'Atención y Soporte' },
        { id: 'settings', to: '/settings', icon: Settings, label: 'Ajustes' },
    ];

    const visibleMenuItems = menuItems.filter(item => {
        if (item.id === 'inventory') {
            return tienePermiso('logistica') || tienePermiso('categories');
        }
        return !item.modulo || tienePermiso(item.modulo);
    });

    const logisticaSubItems = [
        { id: 'logistica-platos', to: '/admin/inventory?tab=platos', icon: Utensils, label: 'Menú (Platos)', modulo: 'logistica' },
        { id: 'logistica-categorias', to: '/admin/categories', icon: BookOpen, label: 'Categorías', modulo: 'categories' },
        { id: 'logistica-insumos', to: '/admin/inventory?tab=insumos', icon: Package, label: 'Inventario (Insumos)', modulo: 'logistica' },
        { id: 'logistica-recetario', to: '/admin/inventory?tab=recetarios', icon: Beaker, label: 'Recetarios (Costeo)', modulo: 'logistica' },
        { id: 'logistica-kardex', to: '/admin/inventory?tab=kardex', icon: History, label: 'Kardex', modulo: 'logistica' },
        { id: 'logistica-auditoria', to: '/admin/inventory?tab=auditoria', icon: ClipboardCheck, label: 'Auditoría', modulo: 'logistica' },
    ];

    const visibleSubItems = logisticaSubItems.filter(sub => !sub.modulo || tienePermiso(sub.modulo));

    const isSubItemActive = (sub) => {
        if (sub.to === '/admin/categories') {
            return location.pathname.startsWith('/admin/categories');
        }
        const currentPathWithSearch = location.pathname + location.search;
        return currentPathWithSearch === sub.to || (sub.to.includes('tab=platos') && currentPathWithSearch === '/admin/inventory');
    };

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
        if (location.pathname.startsWith('/admin/categories')) return 'Logística: Categorías';
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
    const isRail = isTabletRail || collapsed;

    return (
        <React.Fragment>
            <div className="app-container" style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>

                {/* 1. Sleek Sidebar Panel (PC ESCRITORIO ORIGINAL INTACTO) */}
                <aside
                    id="bunker-sidebar"
                    className={`fixed inset-y-0 left-0 bg-[#0d0e15] border-r border-slate-800/80 hidden sm:flex flex-col justify-between py-5 z-40 transition-all duration-300 shadow-2xl ${isRail ? 'w-20 items-center' : 'w-64 px-4'
                        }`}
                >
                    {/* Top Branding Section with Búnker Padlock Logo */}
                    <div className={`flex flex-col gap-5 w-full ${isRail ? 'items-center px-2' : ''}`}>
                        {isRail ? (
                            /* Collapsed Branding */
                            <div className="flex flex-col items-center gap-2.5 w-full">
                                <div className="relative group cursor-pointer" onClick={() => navigate('/home')}>
                                    <div className="absolute -inset-1 rounded-2xl logo-glow opacity-30 blur-md group-hover:opacity-100 transition duration-500"></div>
                                    <div className="relative w-11 h-11 rounded-xl bg-black border border-slate-800/90 flex items-center justify-center shadow-md overflow-hidden">
                                        <img src="/android-chrome-192x192.png" alt="Búnker" className="w-7 h-7 object-contain" />
                                    </div>
                                </div>
                                {!isTabletRail ? (
                                    <button
                                        type="button"
                                        onClick={() => setCollapsed(false)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200 cursor-pointer"
                                        title="Expandir menú"
                                    >
                                        <PanelLeftOpen className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <div className="text-[10px] font-extrabold text-brand tracking-widest uppercase">
                                        BKR
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Expanded Branding */
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3.5 cursor-pointer group min-w-0" onClick={() => navigate('/home')}>
                                    <div className="relative flex-shrink-0">
                                        <div className="absolute -inset-1 rounded-2xl logo-glow opacity-30 blur-md group-hover:opacity-100 transition duration-500"></div>
                                        <div className="relative w-11 h-11 rounded-xl bg-black border border-slate-800/90 flex items-center justify-center shadow-md overflow-hidden">
                                            <img src="/android-chrome-192x192.png" alt="Búnker" className="w-7 h-7 object-contain" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="brand-title font-extrabold text-sm text-slate-200 tracking-wider font-sans leading-none">BÚNKER</span>
                                        <span className="brand-subtitle text-[10px] font-bold text-brand tracking-widest uppercase mt-1">SISTEMA</span>
                                    </div>
                                </div>
                                {!isTabletRail && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCollapsed(true);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-700/50 flex-shrink-0 ml-1"
                                        title="Contraer menú"
                                    >
                                        <PanelLeftClose className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        <div className={`${collapsed ? 'w-12' : 'w-full'} h-px bg-slate-800/85`}></div>
                    </div>

                    {/* Middle Navigation */}
                    <nav className={`flex flex-col gap-1.5 w-full overflow-y-auto scrollbar-none py-1.5 ${isRail ? 'px-2 items-center' : ''}`}>
                        {visibleMenuItems.map((item) => {
                            const Icon = item.icon;

                            if (item.id === 'inventory') {
                                const isPathActive = location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/categories') || location.search.includes('tab=recetarios');

                                return (
                                    <div key={item.id} className="w-full flex flex-col gap-1">
                                        <div
                                            ref={logisticaBtnRef}
                                            onClick={(e) => {
                                                if (isOffline) {
                                                    e.preventDefault();
                                                    showToast('Módulo administrativo no disponible en modo offline.', 'error');
                                                    return;
                                                }
                                                if (isTabletRail) {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setPopoverTop(rect.top);
                                                    setIsLogisticaPopoverOpen(!isLogisticaPopoverOpen);
                                                    return;
                                                }
                                                if (collapsed) {
                                                    setCollapsed(false);
                                                    setIsLogisticaExpanded(true);
                                                } else {
                                                    toggleLogistica();
                                                }
                                                if (!isPathActive) {
                                                    navigate('/admin/inventory?tab=platos');
                                                }
                                            }}
                                            className={`relative rounded-xl flex items-center transition-all duration-200 group cursor-pointer no-underline ${isRail
                                                ? 'w-12 h-12 justify-center ml-2'
                                                : 'w-full h-10 px-3.5 justify-between gap-3.5'
                                                } ${isPathActive
                                                    ? 'text-slate-200 bg-[#151722]/50'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#151722]'
                                                } ${isOffline ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            {isRail ? (
                                                <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: isPathActive ? 'var(--primary)' : undefined }} />
                                            ) : (
                                                <div className="flex items-center gap-3.5">
                                                    <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                                    <span className="text-sm font-semibold tracking-wide font-sans">{item.label}</span>
                                                </div>
                                            )}

                                            {!isRail && (
                                                isLogisticaExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                                                )
                                            )}

                                            {isRail && (
                                                <div className="absolute left-16 bg-[#12141c] text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 z-50">
                                                    {item.label}
                                                </div>
                                            )}
                                        </div>

                                        {/* Submodules rendering under Logística */}
                                        <AnimatePresence initial={false}>
                                            {!isRail && isLogisticaExpanded && !isOffline && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                    className="overflow-hidden flex flex-col gap-1 pl-4 mt-0.5 border-l border-slate-800 ml-6"
                                                >
                                                    {visibleSubItems.map((sub) => {
                                                        const SubIcon = sub.icon;
                                                        const isSubActive = isSubItemActive(sub);

                                                        return (
                                                            <Link
                                                                key={sub.id}
                                                                to={sub.to}
                                                                className={`rounded-lg flex items-center h-8 px-2.5 justify-start gap-2 transition-all duration-200 group cursor-pointer no-underline ${isSubActive
                                                                    ? (isMinimal ? 'active !bg-white !text-black font-bold shadow-md shadow-white/20' : 'active bg-brand text-white shadow-md shadow-brand/20')
                                                                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#151722]/50'
                                                                    }`}
                                                            >
                                                                <SubIcon className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={isSubActive && isMinimal ? { color: '#000000', stroke: '#000000' } : undefined} />
                                                                <span className="text-[11px] font-medium tracking-wide font-sans">{sub.label}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            }

                            const isAdminItem = item.to.startsWith('/admin');

                            return (
                                <NavLink
                                    key={item.id}
                                    to={isOffline && isAdminItem ? '#' : item.to}
                                    onClick={(e) => {
                                        if (isOffline && isAdminItem) {
                                            e.preventDefault();
                                            showToast('Módulo administrativo no disponible en modo offline.', 'error');
                                        }
                                    }}
                                    className={({ isActive }) => `relative rounded-xl flex items-center transition-all duration-200 group cursor-pointer no-underline ${isRail
                                        ? 'w-12 h-12 justify-center'
                                        : 'w-full h-10 px-3.5 justify-start gap-3.5'
                                        } ${isActive && (!isOffline || !isAdminItem)
                                            ? (isMinimal ? 'active !bg-white !text-black font-bold shadow-md shadow-white/20' : 'active bg-brand text-white shadow-md shadow-brand/20')
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#151722]'
                                        } ${isOffline && isAdminItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={isMinimal ? { color: 'inherit', stroke: 'currentColor' } : undefined} />

                                    {!isRail && (
                                        <span className="text-sm font-semibold tracking-wide font-sans">{item.label}</span>
                                    )}

                                    {isRail && (
                                        <div className="absolute left-16 bg-[#12141c] text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 z-50">
                                            {item.label}
                                        </div>
                                    )}
                                </NavLink>
                            );
                        })}

                        {/* LOW STOCK ALERTS SECTION */}
                        {(user?.rol === 'admin' || user?.rol === 'caja') && lowStockAlerts.length > 0 && showAlerts && (
                            <div
                                onClick={() => setIsAlertsModalOpen(true)}
                                title="Clic para ver el reporte completo"
                                className={`mt-4 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl transition-all duration-300 cursor-pointer flex flex-col gap-2 overflow-hidden ${isRail ? 'p-2 items-center w-12 h-12 justify-center' : 'p-3 w-full'
                                    }`}
                            >
                                <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                                    <AlertCircle size={18} className="flex-shrink-0 animate-pulse" />
                                    {!isRail && <span className="whitespace-nowrap font-sans">Insumos por Agotarse</span>}
                                </div>
                                {!isRail && (
                                    <div className="flex flex-col gap-1 max-h-16 overflow-y-auto pr-1">
                                        {lowStockAlerts.slice(0, 3).map(alert => (
                                            <div key={alert.id} className="flex justify-between text-[10px] text-slate-300">
                                                <span className="truncate max-w-[100px] font-sans" title={alert.nombre}>{alert.nombre}</span>
                                                <span className="font-bold text-amber-500">{parseFloat(Number(alert.stock).toFixed(2))} {alert.unidadMedida}</span>
                                            </div>
                                        ))}
                                        {lowStockAlerts.length > 3 && (
                                            <span className="text-[9px] text-slate-500 italic font-sans">+{lowStockAlerts.length - 3} más...</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>

                    {/* Bottom Utility Panel */}
                    <div ref={profileMenuRef} className={`bottom-panel relative flex flex-col items-center w-full mt-auto ${isRail ? 'px-2' : ''}`}>
                        <div className={`${isRail ? 'w-12' : 'w-full'} h-px bg-slate-800/85 mb-3`}></div>

                        {/* Active Logged-In User Profile Display */}
                        {user && (
                            <div className="relative w-full">
                                <AnimatePresence>
                                    {isProfileMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                            className={`smooth-dropdown-bg absolute bottom-full mb-2 p-1.5 rounded-xl border shadow-2xl z-50 ${
                                                isRail ? 'left-0 w-44' : 'left-0 right-0 w-full'
                                            }`}
                                            style={{
                                                backgroundColor: isDarkMode ? '#0c0c0e' : '#ffffff',
                                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
                                                color: isDarkMode ? '#f8fafc' : '#1e293b',
                                                boxShadow: isDarkMode 
                                                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)' 
                                                    : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                            }}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsProfileMenuOpen(false);
                                                    handleLogout();
                                                }}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-150 group"
                                                style={{
                                                    color: isDarkMode ? '#e2e8f0' : '#334155',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)';
                                                    e.currentTarget.style.color = '#ef4444';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = isDarkMode ? '#e2e8f0' : '#334155';
                                                }}
                                            >
                                                <LogOut className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform duration-150 flex-shrink-0" />
                                                <span className="font-sans font-medium text-xs">Cerrar Sesión</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {isRail ? (
                                    <div 
                                        onClick={() => setIsProfileMenuOpen(prev => !prev)}
                                        className="relative group cursor-pointer flex justify-center py-1"
                                        title={`${user.nombre} - Opciones de perfil`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-brand/40 flex items-center justify-center hover:ring-2 hover:ring-brand/50 transition-all duration-200">
                                            {user.foto ? (
                                                <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-4 h-4 text-slate-300" />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => setIsProfileMenuOpen(prev => !prev)}
                                        className="profile-card w-full px-3 py-2 rounded-xl bg-[#141622]/60 hover:bg-[#141622] border border-slate-800/60 transition-all duration-200 flex items-center justify-between cursor-pointer group"
                                        style={{
                                            backgroundColor: isDarkMode ? 'rgba(20, 22, 34, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                                            borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)'
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-brand/40 flex items-center justify-center flex-shrink-0">
                                                {user.foto ? (
                                                    <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-4 h-4 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span 
                                                    className="text-xs font-bold truncate font-sans group-hover:text-brand transition-colors duration-200"
                                                    style={{ color: isDarkMode ? '#ffffff' : '#0f172a' }}
                                                >
                                                    {user.nombre}
                                                </span>
                                                <span 
                                                    className="text-[9px] uppercase tracking-wider truncate mt-0.5 font-sans"
                                                    style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                                                >
                                                    {getRoleName(user.rol)}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMode();
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200 flex-shrink-0 cursor-pointer border border-transparent hover:border-slate-700/50"
                                            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                                        >
                                            {isDarkMode ? (
                                                <Sun className="w-4 h-4 text-amber-500 hover:rotate-45 transition-transform duration-300" />
                                            ) : (
                                                <Moon className="w-4 h-4 text-slate-500 hover:-rotate-12 transition-transform duration-300" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Tablet Navigation Rail Popover Flyout for Logistics */}
                {isTabletRail && isLogisticaPopoverOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40 bg-transparent"
                            onClick={() => setIsLogisticaPopoverOpen(false)}
                        />
                        <div
                            className="fixed z-50 p-2.5 rounded-xl border bg-[#0d0e15] border-slate-800 shadow-2xl flex flex-col gap-1 w-52 font-sans"
                            style={{
                                left: '84px',
                                top: `${popoverTop}px`,
                            }}
                        >
                            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/60 mb-1">
                                Logística
                            </div>
                            {visibleSubItems.map((sub) => {
                                const SubIcon = sub.icon;
                                const isSubActive = isSubItemActive(sub);
                                return (
                                    <Link
                                        key={sub.id}
                                        to={sub.to}
                                        onClick={() => setIsLogisticaPopoverOpen(false)}
                                        className={`rounded-lg flex items-center h-10 px-3 justify-start gap-2.5 transition-all duration-200 group cursor-pointer no-underline ${isSubActive
                                            ? 'bg-brand text-white shadow-md shadow-brand/20 font-bold'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#151722]'
                                            }`}
                                    >
                                        <SubIcon className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs font-semibold">{sub.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* 2. Mobile Drawer Overlay (< sm) EXCLUSIVAMENTE PARA CELULAR */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-[100] sm:hidden flex">
                        <div
                            className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px]"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-hidden="true"
                        />
                        <aside className="bunker-drawer-dark relative z-10 w-[270px] max-w-[85vw] h-full shadow-2xl bg-[#0B0F19] text-slate-300 flex flex-col justify-between py-4 border-r border-white/10 select-none">
                            {/* Top Brand Header con CloseButton */}
                            <div>
                                <div className="flex items-center justify-between px-4 pb-4 border-b border-white/[0.08]">
                                    <div
                                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                                        onClick={() => {
                                            navigate('/home');
                                            setMobileMenuOpen(false);
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#131A29] border border-white/[0.08] shadow-[0_0_20px_rgba(242,101,34,0.14)] flex items-center justify-center shrink-0 overflow-hidden">
                                            <img src="/android-chrome-192x192.png" alt="Búnker" className="w-6 h-6 object-contain" />
                                        </div>
                                        <div className="flex flex-col leading-tight min-w-0">
                                            <span className="text-[15px] font-bold tracking-wide text-white whitespace-nowrap">
                                                BÚNKER
                                            </span>
                                            <span className="text-[10px] font-bold tracking-[0.16em] text-[var(--primary)] whitespace-nowrap mt-0.5">
                                                SISTEMA
                                            </span>
                                        </div>
                                    </div>
                                    <CloseButton onClick={() => setMobileMenuOpen(false)} title="Cerrar menú" />
                                </div>

                                {/* Enlaces de navegación con diseño pill SuperAdmin */}
                                <nav className="flex flex-col gap-1.5 px-3 py-3 overflow-y-auto max-h-[calc(100vh-210px)]">
                                    {visibleMenuItems.map((item) => {
                                        const Icon = item.icon;

                                        if (item.id === 'inventory') {
                                            const isPathActive = location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/categories') || location.search.includes('tab=recetarios');

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
                                                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold bg-white/[0.06] text-white hover:bg-white/[0.1] transition-all cursor-pointer border-0 shadow-sm active:scale-95"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <Icon className="w-4 h-4 shrink-0 text-[var(--primary)]" />
                                                            <span className="truncate">{item.label}</span>
                                                        </div>
                                                        {isLogisticaExpanded ? (
                                                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                                        )}
                                                    </button>

                                                    {isLogisticaExpanded && (
                                                        <div className="relative mt-1.5 ml-5 pl-3 border-l border-white/[0.12] space-y-1">
                                                            {visibleSubItems.map((sub) => {
                                                                const SubIcon = sub.icon;
                                                                const isSubActive = isSubItemActive(sub);
                                                                return (
                                                                    <Link
                                                                        key={sub.id}
                                                                        to={sub.to}
                                                                        onClick={() => setMobileMenuOpen(false)}
                                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer no-underline active:scale-95 ${
                                                                            isSubActive
                                                                                ? 'bg-[var(--primary)] text-white font-bold shadow-md shadow-[var(--primary)]/25'
                                                                                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                                                        }`}
                                                                    >
                                                                        <SubIcon className="w-3.5 h-3.5 shrink-0" />
                                                                        <span className="truncate">{sub.label}</span>
                                                                    </Link>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        const isAdminItem = item.to.startsWith('/admin');
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
                                                    setMobileMenuOpen(false);
                                                }}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer no-underline border-0 shadow-sm active:scale-95 ${
                                                    isLinkActive
                                                        ? 'bg-[var(--primary)] text-white font-bold shadow-md shadow-[var(--primary)]/25'
                                                        : 'text-slate-300/90 hover:text-white hover:bg-white/[0.05]'
                                                } ${isOffline && isAdminItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            >
                                                <Icon className="w-4 h-4 shrink-0" />
                                                <span className="truncate">{item.label}</span>
                                            </NavLink>
                                        );
                                    })}
                                </nav>
                            </div>

                            {/* Tarjeta inferior de perfil con botones pill estilo SuperAdmin */}
                            <div className="px-3 pt-3 border-t border-white/[0.08]">
                                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-full bg-zinc-800/90 text-white shadow-sm border border-white/10">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-white/20 flex items-center justify-center shrink-0">
                                            {user?.foto ? (
                                                <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-4 h-4 text-slate-200" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0 leading-tight">
                                            <span className="text-xs font-bold text-white truncate">
                                                {user?.nombre || 'Hector'}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-400 truncate">
                                                {getRoleName(user?.rol)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={toggleMode}
                                            title={mode === 'dark' ? "Modo Claro" : "Modo Oscuro"}
                                            className="w-8 h-8 rounded-full bg-zinc-700/80 hover:bg-zinc-600 flex items-center justify-center text-zinc-200 transition-colors cursor-pointer border-0 shadow-sm active:scale-95"
                                        >
                                            {mode === 'dark' ? (
                                                <Sun className="w-4 h-4 text-amber-400" />
                                            ) : (
                                                <Moon className="w-4 h-4 text-slate-300" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            title="Cerrar Sesión"
                                            className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors cursor-pointer border-0 shadow-sm active:scale-95"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}

                {/* 3. Main Content Layout (Rest of screen space) */}
                <div className={`flex-1 transition-all duration-300 ${isRail ? 'pl-0 sm:pl-20' : 'pl-0 sm:pl-64'} flex flex-col w-full min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]`}>

                    {/* Mobile Top Header Bar (< 640px) */}
                    <header className="flex sm:hidden items-center justify-between px-4 py-3 bg-[#0B0F19] border-b border-white/10 sticky top-0 z-30 w-full shrink-0 select-none shadow-md">
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Abrir menú de navegación"
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm active:scale-95 border-0"
                            >
                                <Menu className="w-5 h-5" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                            </button>
                            <div className="leading-tight">
                                <span className="text-sm font-bold tracking-wide block text-white font-sans">
                                    BÚNKER
                                </span>
                                <span className="text-[10px] font-bold tracking-[0.14em] text-[var(--primary)] block font-sans">
                                    SISTEMA
                                </span>
                            </div>
                        </div>

                        <span className="text-xs font-semibold text-slate-300 truncate max-w-[160px] font-sans">
                            {getActiveSectionLabel()}
                        </span>
                    </header>

                    <main className={`main-content flex-1 overflow-y-auto flex flex-col ${isCashier || isRecetarios ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
                        {isOffline && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4 animate-pulse backdrop-blur-md shadow-lg shadow-amber-500/5 mx-4 sm:mx-6 lg:mx-8 mt-4">
                                <div className="flex items-center gap-2.5 text-amber-500 font-bold text-xs">
                                    <AlertCircle size={18} className="flex-shrink-0" />
                                    <span className="font-sans tracking-wide">MODO OFFLINE ACTIVO — Operando localmente con IndexedDB</span>
                                </div>
                                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full font-sans">
                                    {pendingOps} operaciones pendientes
                                </span>
                            </div>
                        )}
                        {!isOffline && pendingOps > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-4 backdrop-blur-md shadow-lg shadow-blue-500/5 mx-4 sm:mx-6 lg:mx-8 mt-4">
                                <div className="flex items-center gap-2.5 text-blue-500 font-bold text-xs">
                                    <AlertCircle size={18} className="flex-shrink-0" />
                                    <span className="font-sans tracking-wide">Hay {pendingOps} operación{pendingOps === 1 ? '' : 'es'} pendiente{pendingOps === 1 ? '' : 's'} por sincronizar con la base de datos</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAtomicSyncModal(true)}
                                    className="text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-0"
                                >
                                    Sincronizar ahora
                                </button>
                            </div>
                        )}
                        <div className="flex-grow pb-8">
                            <ErrorBoundary>
                                <Outlet />
                            </ErrorBoundary>
                        </div>
                        {!isRecetarios && (
                        <footer className={`mt-auto pt-6 border-t border-slate-800/10 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--text-muted)] font-medium ${isCashier ? 'mx-4 sm:mx-6 lg:mx-8 mb-4' : ''}`}>
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

            {/* Modal de Sincronización Atómica de Operaciones Offline */}
            <AtomicSyncModal
                isOpen={showAtomicSyncModal}
                onClose={() => {
                    setShowAtomicSyncModal(false);
                    db.syncQueue.where('status').equals('PENDING').count()
                        .then(setPendingOps)
                        .catch(() => {});
                }}
                onComplete={() => {
                    showToast('Sincronización atómica completada exitosamente. Base de datos actualizada.', 'success');
                    db.syncQueue.where('status').equals('PENDING').count()
                        .then(setPendingOps)
                        .catch(() => {});
                }}
            />
        </React.Fragment>
    );
};

export default DashboardLayout;
