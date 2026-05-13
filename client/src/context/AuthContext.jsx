import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permisosUsuario, setPermisosUsuario] = useState([]);
    const [loadingPermisos, setLoadingPermisos] = useState(false);

    const loadPermisos = async (rol) => {
        if (rol === 'admin') {
            setPermisosUsuario([]);
            return;
        }
        setLoadingPermisos(true);
        try {
            const res = await fetch(`/api/permisos/${rol}`);
            const data = await res.json();
            setPermisosUsuario(data);
        } catch (err) {
            console.error("Error fetching permissions", err);
        } finally {
            setLoadingPermisos(false);
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem('comandago_user');
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
                localStorage.setItem('comandago_user', JSON.stringify(data));
                await loadPermisos(data.rol);
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
        localStorage.removeItem('comandago_user');
    };

    const tienePermiso = (modulo) => {
        if (!user) return false;
        if (user.rol === 'admin') return true;
        const permiso = permisosUsuario.find(p => p.modulo === modulo);
        return permiso?.habilitado || false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, tienePermiso, loadingPermisos, loadPermisos }}>
            {(!loading && !loadingPermisos) && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
