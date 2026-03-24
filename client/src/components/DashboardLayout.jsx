import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, ChefHat, DollarSign, User, Sun, Moon, Menu, X, ChevronLeft, ChevronRight, Settings, BookOpen, AlertCircle } from 'lucide-react';

import iconMesas from '../assets/icons/icon-mesas.svg';
import iconCategoria from '../assets/icons/icon-categoria.svg';
import iconReporte from '../assets/icons/icon-reporte.svg';
import logoMinimalistaRed from '../assets/logo_minimalist_red.png';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const { theme, mode, toggleMode, showAlerts } = useTheme();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [lowStockAlerts, setLowStockAlerts] = useState([]);
    const location = useLocation();

    // Fetch alerts globally if user is admin or caja
    useEffect(() => {
        if (user && (user.rol === 'admin' || user.rol === 'caja')) {
            fetch('/api/insumos/alertas')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setLowStockAlerts(data);
                })
                .catch(err => console.error("Error fetching low stock alerts:", err));
        }
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

    const navLinkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px' : '10px 20px',
        width: '100%',
        boxSizing: 'border-box'
    });

    const navLinkClass = ({ isActive }) => `glass-button ${isActive ? 'primary active' : ''}`;

    return (
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
                        {(user?.rol === 'mozo' || user?.rol === 'admin') && (
                            <NavLink to="/tables" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Mesas">
                                <img src={iconMesas} alt="Mesas" style={iconStyle} className="module-icon-svg" /> {!collapsed && <span>Mesas</span>}
                            </NavLink>
                        )}

                        {(user?.rol === 'cocina' || user?.rol === 'admin') && (
                            <NavLink to="/kitchen" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Cocina">
                                <ChefHat size={20} /> {!collapsed && <span>Cocina</span>}
                            </NavLink>
                        )}

                        {(user?.rol === 'caja' || user?.rol === 'admin') && (
                            <>
                                <NavLink to="/cashier" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Caja">
                                    <DollarSign size={20} /> {!collapsed && <span>Caja</span>}
                                </NavLink>
                                <NavLink to="/admin/categories" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Categorías">
                                    <img src={iconCategoria} alt="Categorías" style={iconStyle} className="module-icon-svg" /> {!collapsed && <span>Categorías</span>}
                                </NavLink>
                                <NavLink to="/admin/inventory" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Logística">
                                    <BookOpen size={20} /> {!collapsed && <span>Logística</span>}
                                </NavLink>
                            </>
                        )}
                    </nav>

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(user?.rol === 'admin') && (
                            <>
                                <NavLink to="/admin/users" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Usuarios">
                                    <User size={20} /> {!collapsed && <span>Usuarios</span>}
                                </NavLink>
                                <NavLink to="/admin/staff-stats" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Reporte Personal">
                                    <img src={iconReporte} alt="Reporte" style={iconStyle} className="module-icon-svg" /> {!collapsed && <span>Reporte Personal</span>}
                                </NavLink>
                            </>
                        )}

                        {/* LOW STOCK ALERTS SECTION */}
                        {(user?.rol === 'admin' || user?.rol === 'caja') && lowStockAlerts.length > 0 && (
                            <div style={{
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
                                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8, color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                    {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Insumos por Agotarse</span>}
                                </div>
                                {!collapsed && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5, maxHeight: 100, overflowY: 'auto', paddingRight: 5 }}>
                                        {lowStockAlerts.map(alert => (
                                            <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#FFFFFF' }}>
                                                <span className="low-stock-alert-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={alert.nombre}>{alert.nombre}</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--warning)', whiteSpace: 'nowrap' }}>{parseFloat(Number(alert.stock).toFixed(2))} {alert.unidadMedida}</span>
                                            </div>
                                        ))}
                                    </div>
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
                        <button onClick={handleLogout} className="glass-button" style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                            background: '#ffffff', color: '#000000', border: '1px solid #000000',
                            padding: collapsed ? 10 : '12px 20px', borderRadius: 12, fontWeight: 'bold'
                        }}>
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

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
