import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { networkStatus, db } from '../offline';
import { useAuth } from './AuthContext';
import { getActiveRestaurant } from '../utils/tenant';

const CajaContext = createContext();

export const CajaProvider = ({ children }) => {
    // Estado multi-tenant aislado: mapa de { [tenantId]: boolean }
    // Evita que el cierre o apertura de caja en un local contamine a otro local
    const [cajaStatusByTenant, setCajaStatusByTenant] = useState(() => {
        try {
            const saved = localStorage.getItem('bunker_caja_status_by_tenant');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const inFlightRef = useRef(false);
    const lastCheckTimeRef = useRef(0);

    const auth = useAuth();
    const user = auth?.user;

    // Resolver de forma determinista el ID del restaurante activo
    const currentTenantId = useMemo(() => {
        if (user?.restauranteId) return Number(user.restauranteId);
        const activeTenant = getActiveRestaurant();
        if (activeTenant?.id) return Number(activeTenant.id);
        return 1;
    }, [user?.restauranteId]);

    // Estado reactivo de la caja para el local actualmente activo (null = cargando)
    const isCajaAbierta = useMemo(() => {
        if (cajaStatusByTenant[currentTenantId] !== undefined) {
            return cajaStatusByTenant[currentTenantId];
        }
        return null;
    }, [cajaStatusByTenant, currentTenantId]);

    // Actualizador atómico por local que persiste en localStorage sin provocar re-renders innecesarios
    const updateCajaStatusForTenant = useCallback((tenantId, isOpen) => {
        const id = Number(tenantId || 1);
        setCajaStatusByTenant(prev => {
            // Evita re-renders si el valor no ha cambiado
            if (prev[id] === Boolean(isOpen)) return prev;
            const next = { ...prev, [id]: Boolean(isOpen) };
            try {
                localStorage.setItem('bunker_caja_status_by_tenant', JSON.stringify(next));
            } catch (e) {
                console.warn('[CajaContext] Error al guardar bunker_caja_status_by_tenant:', e);
            }
            return next;
        });
    }, []);

    const verificarEstadoCaja = useCallback(async (tenantIdOverride, force = false) => {
        // En rutas públicas de login / acceso / superadmin, no consultar arqueo de caja
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (path === '/acceso' || path.startsWith('/superadmin') || path === '/') {
                return false;
            }
        }

        const id = Number(tenantIdOverride || currentTenantId || 1);
        const now = Date.now();

        // Evitar múltiples llamadas simultáneas o llamadas en ráfaga (mínimo 3s entre peticiones automáticas)
        if (!force && inFlightRef.current) return;
        if (!force && (now - lastCheckTimeRef.current < 3000)) return;

        inFlightRef.current = true;
        lastCheckTimeRef.current = now;

        try {
            if (networkStatus.isOffline()) {
                const openArqueos = await db.arqueos
                    .filter(a => a.estado === 'abierto' && (Number(a.restauranteId) === id || !a.restauranteId))
                    .toArray();
                const isOpen = openArqueos.length > 0;
                updateCajaStatusForTenant(id, isOpen);
                return isOpen;
            }

            const res = await fetch(`/api/cashier/balance?restauranteId=${id}&_t=${Date.now()}`, {
                headers: {
                    'x-restaurante-id': String(id)
                }
            });

            if (res.ok) {
                const data = await res.json();
                const isOpen = Boolean(data && data.estado === 'abierto');
                updateCajaStatusForTenant(id, isOpen);
                return isOpen;
            } else {
                console.warn(`[CajaContext] Falló verificación online para local ${id}.`);
                return false;
            }
        } catch (error) {
            console.error(`[CajaContext] Error al verificar estado de caja para local ${id}:`, error);
            return false;
        } finally {
            inFlightRef.current = false;
        }
    }, [currentTenantId, updateCajaStatusForTenant]);

    // 1. Revalidación SOLO cuando cambia el local activo
    useEffect(() => {
        verificarEstadoCaja(currentTenantId, true);
    }, [currentTenantId]);

    // 2. Suscripciones reactivas: reconexión de red, foco de ventana y eventos multi-local
    useEffect(() => {
        const handleRevalidate = () => {
            verificarEstadoCaja(currentTenantId, false);
        };

        const handleTenantChange = (e) => {
            const newTenantId = e?.detail?.id;
            if (newTenantId) verificarEstadoCaja(newTenantId, true);
        };

        const handleCajaStatusChange = (e) => {
            if (e?.detail) {
                const { tenantId, isOpen } = e.detail;
                updateCajaStatusForTenant(tenantId || currentTenantId, isOpen);
            } else {
                verificarEstadoCaja(currentTenantId, true);
            }
        };

        const unsubscribeNetwork = networkStatus.subscribe(() => {
            verificarEstadoCaja(currentTenantId, false);
        });

        window.addEventListener('focus', handleRevalidate);
        window.addEventListener('bunker-tenant-changed', handleTenantChange);
        window.addEventListener('bunker-auth-changed', handleRevalidate);
        window.addEventListener('caja-status-changed', handleCajaStatusChange);

        return () => {
            unsubscribeNetwork();
            window.removeEventListener('focus', handleRevalidate);
            window.removeEventListener('bunker-tenant-changed', handleTenantChange);
            window.removeEventListener('bunker-auth-changed', handleRevalidate);
            window.removeEventListener('caja-status-changed', handleCajaStatusChange);
        };
    }, [currentTenantId, updateCajaStatusForTenant]);

    return (
        <CajaContext.Provider value={{
            isCajaAbierta,
            currentTenantId,
            refreshCajaStatus: verificarEstadoCaja,
            setCajaStatus: updateCajaStatusForTenant
        }}>
            {children}
        </CajaContext.Provider>
    );
};

export const useCaja = () => {
    const context = useContext(CajaContext);
    if (!context) throw new Error('useCaja debe usarse dentro de un CajaProvider');
    return context;
};
