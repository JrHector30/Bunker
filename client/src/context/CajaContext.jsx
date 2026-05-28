import React, { createContext, useContext, useState, useEffect } from 'react';

const CajaContext = createContext();

export const CajaProvider = ({ children }) => {
    const [isCajaAbierta, setIsCajaAbierta] = useState(null); // 'null' indica que está cargando inicialmente

    const verificarEstadoCaja = async () => {
        try {
            const res = await fetch('/api/cashier/balance');
            if (res.ok) {
                const data = await res.json();
                setIsCajaAbierta(data && data.estado === 'abierto');
            } else {
                setIsCajaAbierta(false);
            }
        } catch (error) {
            console.error("Error global al verificar estado de caja:", error);
            setIsCajaAbierta(false);
        }
    };

    // Cargar el estado UNA SOLA VEZ al iniciar toda la aplicación
    useEffect(() => {
        verificarEstadoCaja();
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
