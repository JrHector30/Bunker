import React, { useState } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { Banknote, CreditCard, Smartphone, CheckSquare, X, AlertCircle } from 'lucide-react';

const PaymentModal = ({ order, onClose, onSuccess }) => {
    const { showConfirmation } = useConfirmation();
    const { showToast } = useNotification();
    const totalOrder = order.detalles.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0);
    const taxRate = 0.18;
    const subTotal = totalOrder / (1 + taxRate);
    const taxAmount = totalOrder - subTotal;

    // State
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [cashGiven, setCashGiven] = useState('');
    const [hasTip, setHasTip] = useState(false);
    const [tipAmount, setTipAmount] = useState(0);
    const [docType, setDocType] = useState('sin_comprobante');
    const [tipoComprobante, setTipoComprobante] = useState('ticket');
    const [tipoDocumento, setTipoDocumento] = useState('dni');
    const [documentoCliente, setDocumentoCliente] = useState('');
    const [razonSocial, setRazonSocial] = useState('');
    const [direccionFiscal, setDireccionFiscal] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [observation, setObservation] = useState('');
    const [email, setEmail] = useState('');

    const finalTotal = totalOrder + (hasTip ? Number(tipAmount) : 0);
    const change = paymentMethod === 'efectivo' ? (Number(cashGiven) - finalTotal) : 0;

    const validateDocument = async () => {
        if (!documentoCliente) return;
        const type = tipoComprobante === 'factura' ? 'ruc' : tipoDocumento;
        if (type === 'ruc' && documentoCliente.length !== 11) {
            showToast('El RUC debe tener 11 dígitos', 'warning');
            return;
        }
        if (type === 'dni' && documentoCliente.length !== 8) {
            showToast('El DNI debe tener 8 dígitos', 'warning');
            return;
        }

        setIsValidating(true);
        try {
            console.log('[FRONTEND] Iniciando validación:', type, documentoCliente);
            const res = await fetch(`/api/facturacion/${type}/${documentoCliente}`);
            console.log('[FRONTEND] Status respuesta:', res.status);
            const data = await res.json();
            console.log('[FRONTEND] Data recibida:', data);
            
            if (data.success) {
                setRazonSocial(data.razonSocial);
                setDireccionFiscal(data.direccion);
                showToast('Documento validado correctamente', 'success');
            } else {
                showToast(data.error || 'No se encontró el documento', 'error');
                setRazonSocial('');
                setDireccionFiscal('');
            }
        } catch (e) {
            showToast('Error validando documento', 'error');
        } finally {
            setIsValidating(false);
        }
    };

    const handleFinalize = async () => {
        if (paymentMethod === 'efectivo' && (Number.isNaN(cashGiven) || cashGiven === null || cashGiven === '')) {
            showToast('Monto en efectivo inválido.', 'error');
            return;
        }
        if (hasTip && (Number.isNaN(tipAmount) || tipAmount === null || tipAmount === '')) {
            showToast('Monto de propina inválido.', 'error');
            return;
        }

        if (paymentMethod === 'efectivo' && cashGiven < finalTotal) {
            showToast('El monto recibido es menor al total.', 'error');
            return;
        }

        const resolvedDocType = tipoComprobante === 'ticket' ? 'sin_comprobante' : tipoComprobante;

        if (await showConfirmation(`¿Finalizar cobro por S/. ${finalTotal.toFixed(2, { type: 'warning' })}?`)) {
            try {
                const res = await fetch(`/api/checkout/${order.mesaId || order.tableId || order.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentMethod,
                        docType: resolvedDocType,
                        totalReceived: Number(cashGiven),
                        tip: hasTip ? Number(tipAmount) : 0,
                        observation,
                        email,
                        tipoComprobante,
                        documentoCliente: tipoComprobante !== 'ticket' ? documentoCliente : null,
                        razonSocial: tipoComprobante !== 'ticket' ? razonSocial : null,
                        direccionFiscal: tipoComprobante !== 'ticket' ? direccionFiscal : null
                    })
                });

                if (res.ok) {
                    showToast('Pago registrado correctamente.', 'success');
                    onSuccess();
                } else {
                    showToast('Error al registrar pago.', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('Error de conexión', 'error');
            }
        }
    };

    // Validation: Check for Pending Kitchen Items
    const pendingKitchenItems = order.detalles.filter(d => {
        // Condition 1: Must be a kitchen category (enviarCocina = true)
        // Note: Backend must return categoria. If not present (legacy), assume true for safety or false if strict.
        const sendsToKitchen = d.plato.categoria?.enviarCocina ?? true;

        // Condition 2: Status is NOT 'listo', 'lista', or 'entregado'
        const isPending = !['listo', 'lista', 'entregado'].includes(d.estado);

        return sendsToKitchen && isPending;
    });

    const isBlocked = pendingKitchenItems.length > 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '95%' }}>
                {/* Header */}
                <div className="modal-header" style={{ borderBottom: 'none', background: 'var(--primary)', margin: '-25px -25px 20px -25px', padding: 20 }}>
                    <h2 className="text-on-primary" style={{ margin: 0 }}>Tipo de Pago - Mesa {order.tableNumero || order.mesa?.numero || order.mesaId || ''}</h2>
                    <button className="glass-button text-on-primary" style={{ border: 'none', padding: 0 }} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Validation Warning */}
                {isBlocked && (
                    <div style={{
                        background: 'var(--warning)',
                        color: 'black',
                        padding: 15,
                        marginBottom: 20,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontWeight: 'bold'
                    }}>
                        <AlertCircle size={24} />
                        <div>
                            <div>⚠️ No se puede cobrar: Hay platos pendientes en cocina.</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'normal', marginTop: 5 }}>
                                Faltan: {pendingKitchenItems.map(p => p.plato.nombre).join(', ')}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 20 }}>
                    {/* ... Existing Columns ... */}
                    {/* COL 1: MONTO */}
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 15 }}>Monto</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span className="text-muted">Sub-Total:</span>
                            <span>S/. {subTotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span className="text-muted">Impuesto (18%):</span>
                            <span>S/. {taxAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, fontWeight: 'bold', fontSize: '1.2rem' }}>
                            <span>Total Bruto:</span>
                            <span>S/. {totalOrder.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* COL 2: METODOS */}
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 15 }}>Métodos de pago</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'efectivo'} onChange={() => setPaymentMethod('efectivo')} />
                                <Banknote size={18} /> Efectivo
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'tarjeta'} onChange={() => setPaymentMethod('tarjeta')} />
                                <CreditCard size={18} /> Tarjeta Crédito/Débito
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'yape'} onChange={() => setPaymentMethod('yape')} />
                                <Smartphone size={18} /> Yape / Plin
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'izipay'} onChange={() => setPaymentMethod('izipay')} />
                                <CreditCard size={18} /> Izipay
                            </label>
                        </div>
                    </div>

                    {/* COL 3: DETALLE */}
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 15 }}>Detalle de Pago</h3>
                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                                <input type="checkbox" checked={hasTip} onChange={e => setHasTip(e.target.checked)} />
                                Propina
                            </label>
                            {hasTip && (
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Monto"
                                    value={Number.isNaN(tipAmount) ? '' : tipAmount}
                                    onChange={e => setTipAmount(e.target.valueAsNumber)}
                                    style={{ padding: 8 }}
                                />
                            )}
                        </div>

                        {(paymentMethod === 'efectivo' || paymentMethod === 'efectivo_tarjeta') && (
                            <>
                                <div style={{ marginBottom: 10 }}>
                                    <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9rem' }}>Pago con:</label>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        value={Number.isNaN(cashGiven) ? '' : cashGiven}
                                        onChange={e => setCashGiven(e.target.valueAsNumber)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: change < 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    <span>Vuelto:</span>
                                    <span>S/. {change > 0 ? change.toFixed(2) : '0.00'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* COL 4: COMPROBANTE */}
                    <div className="glass-panel" style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 5 }}>Comprobante</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                            <button className={`glass-button ${tipoComprobante === 'ticket' ? 'primary' : ''}`} onClick={() => setTipoComprobante('ticket')} style={{ padding: '8px 5px', fontSize: '0.85rem' }}>Ticket</button>
                            <button className={`glass-button ${tipoComprobante === 'boleta' ? 'primary' : ''}`} onClick={() => setTipoComprobante('boleta')} style={{ padding: '8px 5px', fontSize: '0.85rem' }}>Boleta</button>
                            <button className={`glass-button ${tipoComprobante === 'factura' ? 'primary' : ''}`} onClick={() => setTipoComprobante('factura')} style={{ padding: '8px 5px', fontSize: '0.85rem' }}>Factura</button>
                        </div>
                        
                        {tipoComprobante !== 'ticket' && (
                            <div className="glass-panel" style={{ padding: 10, marginTop: 5, background: 'rgba(0,0,0,0.03)' }}>
                                {tipoComprobante === 'boleta' && (
                                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                        <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}><input type="radio" checked={tipoDocumento === 'dni'} onChange={() => setTipoDocumento('dni')} /> DNI</label>
                                        <label style={{ cursor: 'pointer', fontSize: '0.85rem' }}><input type="radio" checked={tipoDocumento === 'ruc'} onChange={() => setTipoDocumento('ruc')} /> RUC</label>
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <input 
                                        type="text" 
                                        className="glass-input" 
                                        placeholder={`Ingrese ${(tipoComprobante === 'factura' || tipoDocumento === 'ruc') ? 'RUC' : 'DNI'}`}
                                        maxLength={(tipoComprobante === 'factura' || tipoDocumento === 'ruc') ? 11 : 8}
                                        value={documentoCliente}
                                        onChange={e => setDocumentoCliente(e.target.value)}
                                        style={{ width: '100%', padding: '10px', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }}
                                    />
                                    <button 
                                        className="glass-button" 
                                        onClick={validateDocument}
                                        disabled={isValidating}
                                        style={{ 
                                            background: '#14b8a6', 
                                            borderColor: '#14b8a6', 
                                            color: '#fff', 
                                            boxShadow: '0 0 10px rgba(20, 184, 166, 0.5)',
                                            padding: '10px',
                                            width: '100%',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {isValidating ? 'Consultando...' : 'Validar Documento 🔍'}
                                    </button>
                                </div>
                                {(razonSocial || direccionFiscal) && (
                                    <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-muted)', animation: 'fadeIn 0.3s ease-out' }}>
                                        <strong style={{ color: 'var(--text-main)' }}>{razonSocial}</strong><br />
                                        <span>{direccionFiscal}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h4 style={{ marginBottom: 10 }}>Observación</h4>
                        <textarea
                            className="glass-input"
                            rows={3}
                            value={observation}
                            onChange={e => setObservation(e.target.value)}
                            placeholder="Notas adicionales..."
                        />
                    </div>
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h4 style={{ marginBottom: 10 }}>Enviar comprobante</h4>
                        <input
                            type="email"
                            className="glass-input"
                            placeholder="cliente@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="glass-button" onClick={onClose} style={{ background: 'var(--danger)', borderColor: 'transparent' }}>
                        Cerrar
                    </button>
                    <button
                        className="glass-button primary"
                        onClick={handleFinalize}
                        disabled={isBlocked}
                        style={{ opacity: isBlocked ? 0.5 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                    >
                        <CheckSquare size={18} /> Finalizar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
