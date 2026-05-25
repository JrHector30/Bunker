import React, { createContext, useContext, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [toast, setToast] = useState(null);
    const [isExiting, setIsExiting] = useState(false);

    const showToast = (message, type = 'success') => {
        setIsExiting(false);
        setToast({ message, type });
        
        // Iniciar la animación de salida 3 segundos después
        setTimeout(() => {
            setIsExiting(true);
        }, 3000);

        // Desmontar el componente del DOM por completo tras finalizar la animación (350ms después)
        setTimeout(() => {
            setToast(null);
            setIsExiting(false);
        }, 3350);
    };

    const closeToast = () => {
        setIsExiting(true);
        setTimeout(() => {
            setToast(null);
            setIsExiting(false);
        }, 350);
    };

    return (
        <NotificationContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div className={`global-toast ${toast.type} ${isExiting ? 'exit-animation' : 'enter-animation'}`} style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: toast.type === 'success' ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(248, 113, 113, 0.4)',
                    background: toast.type === 'success' ? 'rgba(20, 83, 45, 0.6)' : 'rgba(153, 27, 27, 0.6)',
                    color: '#fff',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }}>
                    {toast.type === 'success' ? <CheckCircle size={20} className="text-green-400" /> : <XCircle size={20} className="text-red-400" />}
                    <span style={{ fontSize: '0.95rem', fontWeight: 550 }}>{toast.message}</span>
                    <button onClick={closeToast} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 2 }}>
                        <X size={16} />
                    </button>
                </div>
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
