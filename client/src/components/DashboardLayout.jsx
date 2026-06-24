import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, ChefHat, DollarSign, User, Sun, Moon, Menu, X, ChevronLeft, ChevronRight, Settings, BookOpen, AlertCircle, LayoutDashboard } from 'lucide-react';

import iconMesas from '../assets/icons/icon-mesas.svg';
import iconCategoria from '../assets/icons/icon-categoria.svg';
import iconReporte from '../assets/icons/icon-reporte.svg';
import logoMinimalistaRed from '../assets/logo_minimalist_red.png';

const DashboardLayout = () => {
    const { user, logout, tienePermiso } = useAuth();
    const { theme, mode, toggleMode, showAlerts } = useTheme();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
    const location = useLocation();

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
    }, [user, location.pathname]); // Re-fetch on route change to keep updated

    // Helper for icon styling to match Lucide size
    const iconStyle = {
        width: 20,
        height: 20,
        objectFit: 'contain'
    };

    const handleLogout = () => {
        setMobileOpen(false);
        logout();
        navigate('/login');
    };

    const navLinkStyle = () => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '9px' : '9px 12px',
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 8,
        transition: 'background 0.15s ease',
    });

    const navLinkClass = ({ isActive }) =>
        `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`;

    return (
        <React.Fragment>

            <div className="app-container" style={{ flexDirection: 'column' }}>

                {/* TOP BAR - Siempre visible */}
                <header className="topbar" style={{
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    background: 'var(--topbar-bg)',
                    borderBottom: `1px solid var(--glass-border)`,
                    color: 'var(--topbar-text)',
                    zIndex: 1000,
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, flex: 1 }}>
                        <button className="glass-button mobile-nav-toggle" style={{ padding: 8, display: 'none', border: 'none' }} onClick={() => setMobileOpen(true)}>
                            <Menu size={24} color={mode === 'dark' ? '#fff' : '#000'} />
                        </button>

                        <div onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: 15, cursor: 'pointer' }}>
                            {/* Logo & Brand Tiempre en Top Bar */}
                            <img src={logoMinimalistaRed} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 12 }} />
                            <h2 style={{
                                margin: 0,
                                fontSize: '1.2rem',
                                fontFamily: '"Roboto Mono", monospace',
                                fontWeight: 600,
                                letterSpacing: '4px',
                                color: 'var(--topbar-text)'
                            }}>
                                COMANDAGO
                            </h2>
                        </div>
                    </div>

                    {/* User Info in Top Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div className="badge" style={{ background: 'transparent', color: 'var(--topbar-text)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', border: '1px solid var(--glass-border)' }}>{user?.rol}</div>
                        {user?.foto && <img src={user.foto} style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid var(--glass-border)` }} />}
                        <button onClick={toggleMode} className="glass-button theme-toggle" style={{ border: 'none', padding: 5, color: 'var(--topbar-text)', background: 'transparent' }}>
                            {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                <div className="content-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Sidebar */}
                    <aside
                        className={`sidebar glass-panel ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}
                        style={{
                            borderRadius: 0,
                            border: 0,
                            width: collapsed ? 40 : 250,
                            transition: 'width 300ms ease-in-out',

                        }}
                    >
                        {/* Mobile Close Button */}
                        <div className="mobile-sidebar-header" style={{ display: 'none', justifyContent: 'flex-end', alignItems: 'center', padding: '0 0 20px 0' }}>
                            <button className="glass-button" style={{ padding: 8, color: '#fff', borderColor: 'transparent' }} onClick={() => setMobileOpen(false)}>
                                <X size={28} />
                            </button>
                        </div>

                        {/* Desktop Toggle (Brand removed, only toggle remains) */}
                        <div className="desktop-sidebar-header" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', padding: '0 7px' }}>


                            <button
                                className="glass-button"
                                style={{
                                    padding: 5,
                                    borderRadius: '50%',
                                    width: 24,
                                    height: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--sidebar-muted)',
                                    marginLeft: collapsed ? '5px' : '0'
                                }}
                                onClick={() => setCollapsed(!collapsed)}
                            >
                                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                            </button>
                        </div>

                        <nav style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowX: 'hidden' }}>
                            <NavLink to="/home" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Inicio">
                                <LayoutDashboard size={20} /> {!collapsed && <span>Inicio</span>}
                            </NavLink>

                            {tienePermiso('mesas') && (
                                <NavLink to="/tables" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Mesas">
                                    <img src={iconMesas} alt="Mesas" style={iconStyle} className="module-icon-svg" /> {!collapsed && <span>Mesas</span>}
                                </NavLink>
                            )}

                            {tienePermiso('cocina') && (
                                <NavLink to="/kitchen" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Cocina">
                                    <ChefHat size={20} /> {!collapsed && <span>Cocina</span>}
                                </NavLink>
                            )}

                            {tienePermiso('caja') && (
                                <NavLink to="/cashier" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Caja">
                                    <DollarSign size={20} /> {!collapsed && <span>Caja</span>}
                                </NavLink>
                            )}

                            {tienePermiso('categories') && (
                                <NavLink to="/admin/categories" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Categorías">
                                    <img src={iconCategoria} alt="Categorías" style={iconStyle} className="module-icon-svg" /> {!collapsed && <span>Categorías</span>}
                                </NavLink>
                            )}

                            {tienePermiso('logistica') && (
                                <NavLink to="/admin/inventory" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Logística">
                                    <BookOpen size={20} /> {!collapsed && <span>Logística</span>}
                                </NavLink>
                            )}
                        </nav>
                        <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '8px 0' }} />
                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {tienePermiso('usuarios') && (
                                <NavLink to="/admin/users" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Usuarios">
                                    <User size={20} /> {!collapsed && <span>Usuarios</span>}
                                </NavLink>
                            )}

                            {tienePermiso('reportes') && (
                                <NavLink to="/admin/staff-stats" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Reporte Personal">
                                    <img src={iconReporte} alt="Reporte" style={iconStyle} className="module-icon-svg" /> {!collapsed && <span>Reporte Personal</span>}
                                </NavLink>
                            )}

                            {/* LOW STOCK ALERTS SECTION */}
                            {(user?.rol === 'admin' || user?.rol === 'caja') && lowStockAlerts.length > 0 && (
                                <div
                                    onClick={() => setIsAlertsModalOpen(true)}
                                    title="Clic para ver el reporte completo"
                                    style={{
                                        marginTop: showAlerts ? 10 : 0,
                                        marginBottom: showAlerts ? 10 : 0,
                                        background: 'rgba(219, 42, 64, 0.1)',
                                        border: showAlerts ? '1px solid rgba(219, 42, 64, 0.3)' : '0px solid transparent',
                                        borderRadius: 12,
                                        padding: showAlerts ? (collapsed ? '10px 5px' : '12px') : '0px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 5,
                                        overflow: 'hidden',
                                        opacity: showAlerts ? 1 : 0,
                                        maxHeight: showAlerts ? '200px' : '0px',
                                        transform: showAlerts ? 'translateX(0)' : 'translateX(30px)',
                                        pointerEvents: showAlerts ? 'auto' : 'none',
                                        transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer'
                                    }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8, color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                        {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Insumos por Agotarse</span>}
                                    </div>
                                    {!collapsed && (
                                        <>
                                            <style>{`
                                            .minimal-scrollbar::-webkit-scrollbar {
                                                width: 4px;
                                            }
                                            .minimal-scrollbar::-webkit-scrollbar-track {
                                                background: transparent; 
                                            }
                                            .minimal-scrollbar::-webkit-scrollbar-thumb {
                                                background: rgba(255, 255, 255, 0.2); 
                                                border-radius: 4px;
                                            }
                                            .minimal-scrollbar::-webkit-scrollbar-thumb:hover {
                                                background: rgba(255, 255, 255, 0.4); 
                                            }
                                        `}</style>
                                            <div
                                                className="minimal-scrollbar"
                                                style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5, maxHeight: 65, overflowY: 'auto', paddingRight: 5 }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {lowStockAlerts.map(alert => (
                                                    <div onClick={() => setIsAlertsModalOpen(true)} key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#FFFFFF', flexShrink: 0, height: 18 }}>
                                                        <span className="low-stock-alert-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={alert.nombre}>{alert.nombre}</span>
                                                        <span style={{ fontWeight: 'bold', color: 'var(--warning)', whiteSpace: 'nowrap' }}>{parseFloat(Number(alert.stock).toFixed(2))} {alert.unidadMedida}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <NavLink to="/settings" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Ajustes">
                                <Settings size={20} /> {!collapsed && <span>Ajustes</span>}
                            </NavLink>

                            <div className={`user-profile-container ${collapsed ? 'collapsed' : ''}`} style={{ borderTop: '1px solid #333' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {user?.foto ? (
                                        <img src={user.foto} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                            <User size={16} />
                                        </div>
                                    )}
                                    {!collapsed && (
                                        <div className="user-info">
                                            <span className="user-name" style={{ color: '#fff' }}>{user?.nombre}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ghost Logout Button */}
                            <button onClick={handleLogout} className="sidebar-nav-item" style={{
                                width: '100%', display: 'flex', alignItems: 'center',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                gap: 10, padding: collapsed ? '9px' : '9px 12px',
                                borderRadius: 8, background: 'transparent', border: 'none',
                                color: 'var(--sidebar-text)', cursor: 'pointer', opacity: 0.6,
                                transition: 'opacity 0.15s ease',
                            }}
                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                            >
                                <LogOut size={16} /> {!collapsed && "Salir"}
                            </button>
                        </div>
                    </aside>

                    {/* Overlay for mobile drawer */}
                    {mobileOpen && (
                        <div
                            className="sidebar-overlay"
                            onClick={() => setMobileOpen(false)}
                            style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.5)', zIndex: 998,
                                backdropFilter: 'blur(2px)'
                            }}
                        />
                    )}

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

                    <main className="main-content">
                        <Outlet />
                    </main>
                </div>
            </div>
        </React.Fragment>
    );
};

export default DashboardLayout;
