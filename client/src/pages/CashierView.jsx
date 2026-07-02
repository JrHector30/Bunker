import React, { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import CashCountTable from '../components/CashCountTable';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../hooks/useCache';

const CashierView = () => {
    const { showToast } = useNotification();
    const { showConfirmation } = useConfirmation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const fetcher = () => fetch('/api/cashier/open-accounts').then(res => res.json());
    const { data: openTables, mutate: fetchTables } = useCache('openTables', fetcher, []);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const handleRefresh = () => {
            fetchTables();
        };

        fetchTables(); // Fetch immediately on mount to bypass cache delay
        const interval = setInterval(handleRefresh, 2000); // Poll every 2 seconds (down from 5s)

        window.addEventListener('refreshCashCount', handleRefresh);
        window.addEventListener('refreshTables', handleRefresh);

        // BroadcastChannel listener for cross-tab instant sync
        let channel = null;
        try {
            channel = new BroadcastChannel('bunker');
            channel.onmessage = (event) => {
                if (event.data === 'refreshCashCount' || event.data === 'refreshTables') {
                    handleRefresh();
                }
            };
        } catch (e) {
            console.error(e);
        }

        return () => {
            clearInterval(interval);
            window.removeEventListener('refreshCashCount', handleRefresh);
            window.removeEventListener('refreshTables', handleRefresh);
            if (channel) {
                channel.close();
            }
        };
    }, []);

    const [shiftStatus, setShiftStatus] = useState('cerrado'); // Default to closed

    const handleOpenPayment = (table, order) => {
        if (shiftStatus !== 'abierto') {
            showToast("Debe ABRIR CAJA antes de cobrar.", 'error');
            return;
        }
        const hijasNumeros = table.mesasHijas && table.mesasHijas.length > 0 ? ' - ' + table.mesasHijas.map(h => h.numero).join(' - ') : '';
        const tableNumero = `${table.numero}${hijasNumeros}`;
        setSelectedOrder({ ...order, tableNumero: tableNumero, tableId: table.id });
        setPaymentModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        setPaymentModalOpen(false);
        fetchTables();
        window.dispatchEvent(new Event('refreshCashCount'));
    };

    if (!openTables || !Array.isArray(openTables)) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0c0c0e', color: '#fff', fontFamily: 'sans-serif' }}>
                <div style={{
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '3px solid var(--primary, #0d6efd)',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '15px'
                }}></div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.8 }}>Cargando caja...</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="high-end-title" style={{ margin: 0 }}>Módulo de Caja</h1>
            </div>

            {/* 1. Panel de Arqueo (Top) */}
            <CashCountTable onStatusChange={setShiftStatus} />

            {/* 2. Cuentas Abiertas (Bottom) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 20 }}>
                <h2>Cuentas Abiertas</h2>
                {shiftStatus === 'cerrado' && (
                    <div style={{ color: '#dc3545', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2em' }}>⚠</span> CAJA CERRADA
                    </div>
                )}
            </div>

            <div className="responsive-grid" style={{
                opacity: shiftStatus === 'cerrado' ? 0.6 : 1,
                pointerEvents: shiftStatus === 'cerrado' ? 'none' : 'auto'
            }}>
                {openTables.length === 0 && <p className="text-muted">No hay cuentas abiertas.</p>}

                {openTables.map(comanda => {
                    if (!comanda || !comanda.mesa) return null;

                    const realTotal = comanda.detalles.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0);

                    return (
                        <div key={comanda.id} className="glass-panel" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, borderBottom: '1px solid var(--glass-border)', paddingBottom: 10 }}>
                                <h2>Mesa {(() => {
                                    let num = comanda.mesa.numero;
                                    if (comanda.mesa.mesasHijas && comanda.mesa.mesasHijas.length > 0) {
                                        const hijas = comanda.mesa.mesasHijas.map(h => h.numero).join(' - ');
                                        num = `${num} - ${hijas}`;
                                    }
                                    return num;
                                })()}</h2>
                                <h2 style={{ color: 'var(--success)' }} className="font-mono">S/. {realTotal.toFixed(2)}</h2>
                            </div>

                            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
                                {comanda.detalles.map(d => (
                                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span>{d.cantidad}x {d.plato.nombre}</span>
                                        <span><span className="font-mono">S/. {(d.cantidad * d.plato.precio).toFixed(2)}</span></span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    className="glass-button"
                                    style={{ background: 'rgba(255, 50, 50, 0.1)', color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0 15px' }}
                                    onClick={async () => {
                                        const motivo = await showConfirmation({
                                            title: "Motivo de Anulación",
                                            message: "Por favor, detalle la razón por la cual se está cancelando la comanda total:",
                                            inputType: "text",
                                            type: "danger"
                                        });
                                        if (motivo === null || motivo.trim() === '') return;

                                        try {
                                            const res = await fetch(`/api/orders/${comanda.id}/cancel`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ motivo, usuarioResponsable: "Caja/Admin", usuarioId: user.id })
                                            });
                                            if (res.ok) {
                                                showToast("Pedido anulado y mesa liberada.", 'success');
                                                fetchTables();
                                            } else {
                                                const err = await res.json();
                                                showToast("Error: " + err.error, 'error');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }}
                                    title="Anular Pedido Total"
                                >
                                    <span style={{ fontWeight: 'bold' }}>X</span>
                                </button>
                                <button
                                    className="glass-button primary"
                                    style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 10 }}
                                    onClick={() => handleOpenPayment(comanda.mesa, comanda)}
                                >
                                    <Printer size={18} /> Cerrar Cuenta e Imprimir
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Pago */}
            {paymentModalOpen && selectedOrder && (
                <PaymentModal
                    order={selectedOrder}
                    onClose={() => setPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
};

export default CashierView;

