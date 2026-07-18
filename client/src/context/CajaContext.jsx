import React, { createContext, useContext, useState, useEffect } from 'react';
import { networkStatus, db } from '../offline';

const CajaContext = createContext();

export const CajaProvider = ({ children }) => {
    const [isCajaAbierta, setIsCajaAbierta] = useState(null); // 'null' indica que está cargando inicialmente

    const verificarEstadoCaja = async () => {
        try {
            if (networkStatus.isOffline()) {
                const openArqueos = await db.arqueos.where('estado').equals('abierto').toArray();
                const isOpen = openArqueos.length > 0;
                setIsCajaAbierta(isOpen);
                return;
            }

            const res = await fetch('/api/cashier/balance');
            if (res.ok) {
                const data = await res.json();
                setIsCajaAbierta(data && data.estado === 'abierto');
            } else {
                console.warn('[CajaContext] Falló verificación online. Conservando estado de caja anterior:', isCajaAbierta);
                setIsCajaAbierta(prev => prev ?? false);
            }
        } catch (error) {
            console.error("[CajaContext] Error global al verificar estado de caja:", error);
            setIsCajaAbierta(prev => prev ?? false);
        }
    };

    // Registrar validador inicial y suscripción reactiva a cambios de red
    useEffect(() => {
        verificarEstadoCaja();
        const unsubscribe = networkStatus.subscribe(() => {
            verificarEstadoCaja();
        });
        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <CajaContext.Provider value={{ isCajaAbierta, refreshCajaStatus: verificarEstadoCaja }}>
            {children}
        </CajaContext.Provider>
    );
};

export const useCaja = () => {
    const context = useContext(CajaContext);
    if (!context) throw new Error('useCaja debe usarse dentro de un CajaProvider');
    return context;
};
