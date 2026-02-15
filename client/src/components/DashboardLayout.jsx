import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, ChefHat, DollarSign, User, Sun, Moon, Menu, X, ChevronLeft, ChevronRight, Settings, BookOpen } from 'lucide-react';

import iconMesas from '../assets/icons/icon-mesas.svg';
import iconCategoria from '../assets/icons/icon-categoria.svg';
import iconReporte from '../assets/icons/icon-reporte.svg';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const { theme, mode, toggleMode } = useTheme();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

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

    const navLinkClass = ({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`;

    return (
        <div className="app-container">
            {/* Mobile Header (Visible only on mobile) */}
            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="glass-button" style={{ padding: 8 }} onClick={() => setMobileOpen(true)}>
                        <Menu size={20} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>ComandaGo</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="badge" style={{ background: 'var(--item-hover)', fontSize: '0.7rem' }}>{user?.rol}</div>
                    {user?.foto && <img src={user.foto} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--primary)' }} />}
                </div>
            </div>

            {/* Sidebar */}
            <aside
                className={`sidebar glass-panel ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}
                style={{
                    borderRadius: 0,
                    border: 0,
                    width: collapsed ? 80 : 250,
                    transition: 'width 0.6s ease-in-out',
                }}
            >
                {/* Mobile Close Button */}
                <div className="mobile-sidebar-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 20px 0' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)' }}>ComandaGo</h2>
                    <button className="glass-button" style={{ padding: 5 }} onClick={() => setMobileOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                {/* Desktop Header & Toggle */}
                <div className="desktop-sidebar-header" style={{ marginBottom: 20, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: '0 5px' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        {/* Logo Icon - Always Visible */}
                        <div className="logo-icon" style={{
                            color: '#DB2A40',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '24px' // Ensure it doesn't shrink
                        }}>
                            <img
                                src="/iconCG-32x32.png"
                                alt="Logo"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>

                        {/* Text - Persistent in DOM, animated via CSS classes */}
                        <h2
                            className={`sidebar-logo speed-type-text ${!collapsed ? 'enter' : 'exit'}`}
                            onClick={() => window.location.href = '/'}
                            style={{ margin: 0, fontSize: '1.1rem' }}
                        >
                            COMANDAGO
                        </h2>
                    </div>

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
                            <NavLink to="/admin/inventory" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Almacén">
                                <BookOpen size={20} /> {!collapsed && <span>Almacén</span>}
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

                    <NavLink to="/settings" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Ajustes">
                        <Settings size={20} /> {!collapsed && <span>Ajustes</span>}
                    </NavLink>

                    <div className={`user-profile-container ${collapsed ? 'collapsed' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {user?.foto ? (
                                <img src={user.foto} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                            ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--item-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
                                    <User size={16} />
                                </div>
                            )}
                            {!collapsed && (
                                <div className="user-info">
                                    <span className="user-name">{user?.nombre}</span>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <button onClick={toggleMode} className="glass-button theme-toggle">
                                {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                        )}
                    </div>

                    <button onClick={handleLogout} className="glass-button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'center', gap: 10, background: 'rgba(255,50,50,0.1)', color: '#ff6b6b', borderColor: '#ff6b6b', padding: collapsed ? 10 : '10px 20px' }}>
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
    );
};

export default DashboardLayout;
