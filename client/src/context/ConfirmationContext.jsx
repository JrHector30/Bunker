import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

const ConfirmationContext = createContext();

export const ConfirmationProvider = ({ children }) => {
    const [confirmation, setConfirmation] = useState(null);

    const showConfirmation = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmation({
                message,
                type: options.type || 'warning', // 'warning', 'danger', 'info'
                confirmText: options.confirmText || 'Confirmar',
                cancelText: options.cancelText || 'Cancelar',
                resolve
            });
        });
    }, []);

    const handleConfirm = () => {
        if (confirmation) {
            confirmation.resolve(true);
            setConfirmation(null);
        }
    };

    const handleCancel = () => {
        if (confirmation) {
            confirmation.resolve(false);
            setConfirmation(null);
        }
    };

    return (
        <ConfirmationContext.Provider value={{ showConfirmation }}>
            {children}
            {confirmation && (
                <div className="modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="glass-panel" style={{ 
                        maxWidth: '400px', 
                        width: '100%', 
                        padding: '25px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '20px',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ 
                                padding: '12px', 
                                borderRadius: '50%', 
                                background: confirmation.type === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                color: confirmation.type === 'danger' ? '#ef4444' : '#f59e0b'
                            }}>
                                <AlertTriangle size={28} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                Confirmación Requerida
                            </h3>
                        </div>
                        
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.5' }}>
                            {confirmation.message.split('\\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            ))}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button className="glass-button" onClick={handleCancel} style={{ color: 'var(--text-muted)' }}>
                                {confirmation.cancelText}
                            </button>
                            <button 
                                className="glass-button primary" 
                                onClick={handleConfirm}
                                style={confirmation.type === 'danger' ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}}
                            >
                                {confirmation.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = () => useContext(ConfirmationContext);
