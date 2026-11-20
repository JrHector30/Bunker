import React, { createContext, useContext, useState, useEffect } from 'react';
import { clearGlobalCache } from '../hooks/useCache';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permisosUsuario, setPermisosUsuario] = useState([]);
    const [loadingPermisos, setLoadingPermisos] = useState(false);

    const loadPermisos = async (rol) => {
        if (!rol || rol === 'admin') {
            setPermisosUsuario([]);
            return;
        }
        // Carga inmediata de permisos cacheados para evitar parpadeos
        try {
            const cached = localStorage.getItem(`bunker_permisos_${rol}`);
            if (cached) {
                setPermisosUsuario(JSON.parse(cached));
            }
        } catch (_) {}

        setLoadingPermisos(true);
        try {
            const res = await fetch(`/api/permisos/${rol}`);
            if (res.ok) {
                const data = await res.json();
                setPermisosUsuario(data);
                try {
                    localStorage.setItem(`bunker_permisos_${rol}`, JSON.stringify(data));
                } catch (_) {}
            }
        } catch (err) {
            console.error("Error fetching permissions", err);
        } finally {
            setLoadingPermisos(false);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('bunker_user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                await loadPermisos(parsedUser.rol);
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (usuario, password) => {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            });

            const data = await response.json();

            if (response.ok) {
                setUser(data);
                localStorage.setItem('bunker_user', JSON.stringify(data));
                await loadPermisos(data.rol);
                window.dispatchEvent(new CustomEvent('bunker-auth-changed'));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        setPermisosUsuario([]);
        localStorage.removeItem('bunker_user');
        clearGlobalCache();
        window.dispatchEvent(new CustomEvent('bunker-auth-changed'));
    };

    const tienePermiso = (modulo) => {
        if (!user) return false;
        if (user.rol === 'admin') return true;
        const permiso = permisosUsuario.find(p => p.modulo === modulo);
        return permiso?.habilitado || false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, tienePermiso, loadingPermisos, loadPermisos }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
