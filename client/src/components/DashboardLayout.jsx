import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
    ChevronLeft,
    ChevronRight,
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
    ChartColumn
} from 'lucide-react';

const DashboardLayout = () => {
    const { user, logout, tienePermiso } = useAuth();
    const { mode, toggleMode, showAlerts } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('bunker_sidebar_collapsed') === 'true');
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
        { id: 'home', to: '/home', icon: LayoutDashboard, label: 'Inicio' },
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

    // Filter menu items by permission
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

    const isDarkMode = mode === 'dark';
    const isCashier = location.pathname === '/cashier';

    return (
        <React.Fragment>
            <div className="app-container" style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', position: 'relative' }}>

                {/* 1. Sleek Sidebar Panel (Inspired by GestionDeComandas) */}
                <aside
                    id="bunker-sidebar"
                    className={`fixed inset-y-0 left-0 bg-[#0d0e15] border-r border-slate-800/80 flex flex-col justify-between py-5 z-40 transition-all duration-300 shadow-2xl ${collapsed ? 'w-20 items-center' : 'w-64 px-4'
                        }`}
                >
                    {/* Top Branding Section with Búnker Padlock Logo */}
                    <div className={`flex flex-col gap-5 w-full ${collapsed ? 'items-center px-2' : ''}`}>
                        {collapsed ? (
                            /* Collapsed Branding */
                            <div className="flex flex-col items-center gap-2 w-full">
                                <div className="relative group cursor-pointer" onClick={() => navigate('/home')}>
                                    <div className="absolute -inset-1 rounded-2xl logo-glow opacity-30 blur-md group-hover:opacity-100 transition duration-500"></div>
                                    <div className="relative w-11 h-11 rounded-xl bg-[#ffffff] border border-slate-800 flex items-center justify-center shadow-md">
                                        <svg viewBox="0 0 100 100" className="w-7 h-7 text-slate-300">
                                            <path
                                                d="M 32,42 L 32,28 C 32,16 68,16 68,28 L 68,42"
                                                fill="none"
                                                stroke="var(--sidebar-brand-color)"
                                                strokeWidth="9"
                                                strokeLinecap="round"
                                            />
                                            <rect x="18" y="38" width="64" height="48" rx="12" fill="#090a0f" />
                                            <path
                                                d="M 40,48 L 40,74 M 40,48 H 51 C 55.5,48 58,50.5 58,54 C 58,57.5 55.5,61 51,61 M 40,61 H 52.5 C 57,61 59.5,63.5 59.5,67 C 59.5,70.5 57,74 52.5,74 H 40"
                                                fill="none"
                                                stroke="var(--sidebar-brand-color)"
                                                strokeWidth="6.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="text-[10px] font-extrabold text-brand tracking-widest uppercase">
                                    BKR
                                </div>
                            </div>
                        ) : (
                            /* Expanded Branding */
                            <div className="flex items-center gap-3.5 cursor-pointer group w-full" onClick={() => navigate('/home')}>
                                <div className="relative">
                                    <div className="absolute -inset-1 rounded-2xl logo-glow opacity-30 blur-md group-hover:opacity-100 transition duration-500"></div>
                                    <div className="relative w-11 h-11 rounded-xl bg-[#ffffff] border border-slate-800 flex items-center justify-center shadow-md">
                                        <svg viewBox="0 0 100 100" className="w-7 h-7 text-slate-300">
                                            <path
                                                d="M 32,42 L 32,28 C 32,16 68,16 68,28 L 68,42"
                                                fill="none"
                                                stroke="var(--sidebar-brand-color)"
                                                strokeWidth="9"
                                                strokeLinecap="round"
                                            />
                                            <rect x="18" y="38" width="64" height="48" rx="12" fill="#090a0f" />
                                            <path
                                                d="M 40,48 L 40,74 M 40,48 H 51 C 55.5,48 58,50.5 58,54 C 58,57.5 55.5,61 51,61 M 40,61 H 52.5 C 57,61 59.5,63.5 59.5,67 C 59.5,70.5 57,74 52.5,74 H 40"
                                                fill="none"
                                                stroke="var(--sidebar-brand-color)"
                                                strokeWidth="6.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="brand-title font-extrabold text-sm text-slate-200 tracking-wider font-sans leading-none">BÚNKER</span>
                                    <span className="brand-subtitle text-[10px] font-bold text-brand tracking-widest uppercase mt-1">SISTEMA</span>
                                </div>
                            </div>
                        )}

                        <div className={`${collapsed ? 'w-12' : 'w-full'} h-px bg-slate-800/85`}></div>
                    </div>

                    {/* Middle Navigation */}
                    <nav className={`flex flex-col gap-1.5 w-full overflow-y-auto scrollbar-none py-1.5 ${collapsed ? 'px-2 items-center' : ''}`}>
                        {visibleMenuItems.map((item) => {
                            const Icon = item.icon;

                            if (item.id === 'inventory') {
                                const logisticaSubItems = [
                                    { id: 'logistica-platos', to: '/admin/inventory?tab=platos', icon: Utensils, label: 'Menú (Platos)' },
                                    { id: 'logistica-insumos', to: '/admin/inventory?tab=insumos', icon: Package, label: 'Inventario (Insumos)' },
                                    { id: 'logistica-recetario', to: '/admin/inventory?tab=recetario', icon: Beaker, label: 'Recetarios (Costeo)' },
                                    { id: 'logistica-kardex', to: '/admin/inventory?tab=kardex', icon: History, label: 'Kardex' },
                                    { id: 'logistica-auditoria', to: '/admin/inventory?tab=auditoria', icon: ClipboardCheck, label: 'Auditoría' },
                                ];

                                const isPathActive = location.pathname.startsWith('/admin/inventory');

                                return (
                                    <div key={item.id} className="w-full flex flex-col gap-1">
                                        <div
                                            onClick={() => {
                                                if (collapsed) {
                                                    setCollapsed(false);
                                                    setIsLogisticaExpanded(true);
                                                } else {
                                                    toggleLogistica();
                                                }
                                                // Navigate to default module if not already in Logistics
                                                if (!isPathActive) {
                                                    navigate('/admin/inventory?tab=platos');
                                                }
                                            }}
                                            className={`relative rounded-xl flex items-center transition-all duration-200 group cursor-pointer no-underline ${collapsed
                                                ? 'w-16 h-10 justify-center'
                                                : 'w-full h-10 px-3.5 justify-between gap-3.5'
                                                } ${isPathActive
                                                    ? 'text-slate-200 bg-[#151722]/50'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#151722]'
                                                }`}
                                        >
                                            {collapsed ? (
                                                <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                            ) : (
                                                <div className="flex items-center gap-3.5">
                                                    <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                                                    <span className="text-sm font-semibold tracking-wide font-sans">{item.label}</span>
                                                </div>
                                            )}

                                            {!collapsed && (
                                                isLogisticaExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                                                )
                                            )}

                                            {collapsed && (
                                                <div className="absolute left-16 bg-[#12141c] text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 z-50">
                                                    {item.label}
                                                </div>
                                            )}
                                        </div>

                                        {/* Submodules rendering under Logística with smooth transition */}
                                        <AnimatePresence initial={false}>
                                            {!collapsed && isLogisticaExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                    className="overflow-hidden flex flex-col gap-1 pl-4 mt-0.5 border-l border-slate-800 ml-6"
                                                >
                                                    {logisticaSubItems.map((sub) => {
                                                        const SubIcon = sub.icon;
                                                        const currentPathWithSearch = location.pathname + location.search;
                                                        const isSubActive = currentPathWithSearch === sub.to || (sub.to.includes('tab=platos') && currentPathWithSearch === '/admin/inventory');

                                                        return (
                                                            <Link
                                                                key={sub.id}
                                                                to={sub.to}
                                                                className={`rounded-lg flex items-center h-8 px-2.5 justify-start gap-2 transition-all duration-200 group cursor-pointer no-underline ${isSubActive
                                                                    ? 'active bg-brand text-white shadow-md shadow-brand/20'
                                                                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#151722]/50'
                                                                    }`}
                                                            >
                                                                <SubIcon className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
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

                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.to}
                                    className={({ isActive }) => `relative rounded-xl flex items-center transition-all duration-200 group cursor-pointer no-underline ${collapsed
                                        ? 'w-10 h-10 justify-center'
                                        : 'w-full h-10 px-3.5 justify-start gap-3.5'
                                        } ${isActive
                                            ? 'active bg-brand text-white shadow-md shadow-brand/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#151722]'
                                        }`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />

                                    {!collapsed && (
                                        <span className="text-sm font-semibold tracking-wide font-sans">{item.label}</span>
                                    )}

                                    {/* Floating Tooltip ONLY when collapsed */}
                                    {collapsed && (
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
                                className={`mt-4 mb-2 bg-red-500/10 border border-red-500/20 rounded-xl transition-all duration-300 cursor-pointer flex flex-col gap-2 overflow-hidden ${collapsed ? 'p-2 items-center w-12 h-12 justify-center' : 'p-3 w-full'
                                    }`}
                            >
                                <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                                    <AlertCircle size={18} className="flex-shrink-0 animate-pulse" />
                                    {!collapsed && <span className="whitespace-nowrap font-sans">Insumos por Agotarse</span>}
                                </div>
                                {!collapsed && (
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
                    <div className={`bottom-panel flex flex-col items-center gap-3 w-full mt-auto ${collapsed ? 'px-2' : ''}`}>
                        <div className={`${collapsed ? 'w-12' : 'w-full'} h-px bg-slate-800/85`}></div>

                        {/* Quick Light/Dark Mode Switcher */}
                        <button
                            id="sidebar-dark-toggle"
                            onClick={toggleMode}
                            className={`rounded-xl flex items-center transition-all duration-200 group cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-[#151722] bg-transparent border-none outline-none ${collapsed
                                ? 'w-10 h-10 justify-center'
                                : 'w-full h-10 px-3.5 justify-start gap-3.5'
                                }`}
                            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                        >
                            {isDarkMode ? (
                                <Sun className="w-5 h-5 text-amber-500 transition-transform duration-300 group-hover:rotate-45" />
                            ) : (
                                <Moon className="w-5 h-5 text-slate-400 transition-transform duration-300 group-hover:-rotate-12" />
                            )}

                            {!collapsed && (
                                <span className="text-sm font-semibold tracking-wide font-sans">
                                    {isDarkMode ? "Modo Claro" : "Modo Oscuro"}
                                </span>
                            )}

                            {collapsed && (
                                <div className="absolute left-16 bg-[#12141c] text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 z-50">
                                    {isDarkMode ? "Modo Claro" : "Modo Oscuro"}
                                </div>
                            )}
                        </button>

                        {/* Active Logged-In User Profile Display */}
                        {user && (
                            collapsed ? (
                                <div className="relative group cursor-pointer">
                                    <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-brand/40 flex items-center justify-center">
                                        {user.foto ? (
                                            <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="absolute left-16 bg-[#12141c] text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 z-50">
                                        <span className="block text-[11px] font-extrabold text-white font-sans">{user.nombre}</span>
                                        <span className="block text-[9px] text-slate-400 uppercase tracking-wider mt-0.5 font-sans">
                                            {getRoleName(user.rol)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-card w-full px-4 py-2.5 rounded-xl bg-[#141622]/50 border border-slate-800/40 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-brand/40 flex items-center justify-center flex-shrink-0">
                                        {user.foto ? (
                                            <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-white truncate font-sans">{user.nombre}</span>
                                        <span className="text-[9px] text-slate-400 uppercase tracking-wider truncate mt-0.5 font-sans">
                                            {getRoleName(user.rol)}
                                        </span>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Collapse/Expand Toggle Button */}
                        <button
                            id="sidebar-collapse-toggle"
                            onClick={() => setCollapsed(!collapsed)}
                            className={`rounded-xl flex items-center transition-all duration-200 group cursor-pointer text-slate-500 hover:text-slate-200 hover:bg-[#151722] bg-transparent border-none outline-none ${collapsed
                                ? 'w-10 h-10 justify-center'
                                : 'w-full h-10 px-3.5 justify-start gap-3.5'
                                }`}
                            title={collapsed ? "Expandir menú" : "Contraer menú"}
                        >
                            {collapsed ? (
                                <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                            ) : (
                                <>
                                    <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5 flex-shrink-0" />
                                    <span className="text-sm font-semibold tracking-wide font-sans">Contraer menú</span>
                                </>
                            )}
                        </button>

                        {/* Logout Action */}
                        <button
                            id="sidebar-logout-btn"
                            onClick={handleLogout}
                            className={`rounded-xl flex items-center transition-all duration-200 group cursor-pointer text-slate-500 hover:text-red-500 hover:bg-red-500/10 bg-transparent border-none outline-none ${collapsed
                                ? 'w-10 h-10 justify-center'
                                : 'w-full h-10 px-3.5 justify-start gap-3.5'
                                }`}
                            title="Cerrar Sesión de Búnker"
                        >
                            <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />

                            {!collapsed && (
                                <span className="text-sm font-semibold tracking-wide font-sans">Cerrar Sesión</span>
                            )}

                            {collapsed && (
                                <div className="absolute left-16 bg-[#12141c] text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800 z-50">
                                    Cerrar Sesión
                                </div>
                            )}
                        </button>
                    </div>
                </aside>

                {/* 2. Main Content Layout (Occupies rest of screen space) */}
                <div className={`flex-1 transition-all duration-300 ${collapsed ? 'pl-20' : 'pl-20 md:pl-64'} flex flex-col w-full min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)]`}>
                    <main className={`main-content flex-1 overflow-y-auto flex flex-col ${isCashier ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
                        <div className="flex-grow pb-8">
                            <Outlet />
                        </div>
                        <footer className={`mt-auto pt-6 border-t border-slate-800/10 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--text-muted)] font-medium ${isCashier ? 'mx-4 sm:mx-6 lg:mx-8 mb-4' : ''}`}>
                            <span>© 2026 Búnker - Sistema de Gestión de Comandas Inteligentes.</span>
                            <div className="flex items-center gap-1">
                                <span>Hecho con</span>
                                <Heart className="w-3.5 h-3.5 text-[var(--primary)] fill-[var(--primary)] animate-pulse" />
                                <span>por Hector y Melanie</span>
                            </div>
                        </footer>
                    </main>
                </div>
            </div>

            {/* Modal de Alertas de Escasez */}
            {isAlertsModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsAlertsModalOpen(false)}>
                    <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: 500, background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(15px)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 15, marginBottom: 15 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <AlertCircle color="var(--danger)" size={24} />
                                <h2 style={{ margin: 0 }}>Insumos por Agotarse</h2>
                            </div>
                            <button className="glass-button" onClick={() => setIsAlertsModalOpen(false)} style={{ border: 'none', background: 'transparent', padding: 5, color: '#fff' }}><X size={24} /></button>
                        </div>
                        <div className="modal-body minimal-scrollbar" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 10 }}>
                            {lowStockAlerts.length === 0 ? (
                                <p className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No hay insumos por agotarse.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                                            <th style={{ padding: '10px 0' }}>Insumo</th>
                                            <th style={{ padding: '10px 0', textAlign: 'right' }}>Stock Actual</th>
                                            <th style={{ padding: '10px 0', textAlign: 'right' }}>Mínimo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStockAlerts.map(alert => (
                                            <tr key={alert.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem' }}>
                                                <td style={{ padding: '12px 0', fontWeight: '500' }}>{alert.nombre}</td>
                                                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--warning)' }}>
                                                    {parseFloat(Number(alert.stock).toFixed(2))} <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{alert.unidadMedida}</span>
                                                </td>
                                                <td style={{ padding: '12px 0', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>
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
