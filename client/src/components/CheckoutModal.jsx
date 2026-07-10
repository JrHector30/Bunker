import React, { useState, useEffect } from 'react';
import { X, DollarSign, Smartphone, CreditCard, Receipt, Printer, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useConfirmation } from '../context/ConfirmationContext';
import { useNotification } from '../context/NotificationContext';
import { setOptimisticLock } from '../hooks/useCache';
import { networkStatus, NetworkState, offlineCheckoutService, offlineSnapshotService } from '../offline';

export function CheckoutModal({ isOpen, onClose, order, onSuccess }) {
  const { showConfirmation } = useConfirmation();
  const { showToast } = useNotification();

  // Selected main payment method
  const [metodo, setMetodo] = useState('efectivo');

  // Cash payment states
  const [montoPagado, setMontoPagado] = useState('');

  // Card provider states (IZIPAY, NIUBIZ)
  const [tarjetaProveedor, setTarjetaProveedor] = useState('IZIPAY');

  // Digital wallet provider states (Yape, Plin)
  const [billeteraProveedor, setBilleteraProveedor] = useState('Yape');

  // Tip (Propinas) Selector states
  const [propinaPct, setPropinaPct] = useState(10);
  const [customPropina, setCustomPropina] = useState('');
  const [imprimirTicket, setImprimirTicket] = useState(true);

  // Comprobante states
  const [comprobanteTipo, setComprobanteTipo] = useState('Ticket'); // 'Ticket', 'Boleta', 'Factura'
  const [docTipo, setDocTipo] = useState('DNI'); // 'DNI', 'RUC'
  const [docNumero, setDocNumero] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccionFiscal, setDireccionFiscal] = useState('');

  // Validation API States
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Reset states when modal is opened for a new table
  useEffect(() => {
    if (isOpen && order) {
      setMetodo('efectivo');
      setMontoPagado('');
      setTarjetaProveedor('IZIPAY');
      setBilleteraProveedor('Yape');
      setPropinaPct(10);
      setCustomPropina('');
      setImprimirTicket(true);
      setComprobanteTipo('Ticket');
      setDocTipo('DNI');
      setDocNumero('');
      setRazonSocial('');
      setDireccionFiscal('');
      setIsValidated(false);
      setValidationError('');
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Real total calculation
  const subtotal = order.detalles.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0);

  // Tip calculation
  const propinaMonto =
    propinaPct === 'custom'
      ? parseFloat(customPropina) || 0
      : (subtotal * propinaPct) / 100;

  const totalFinal = subtotal + propinaMonto;

  // Cash change (Vuelto) calculation
  const paidAmountNum = parseFloat(montoPagado) || 0;
  const vuelto = Math.max(0, paidAmountNum - totalFinal);

  // Document length rule
  const getRequiredLength = () => {
    if (comprobanteTipo === 'Factura') return 11;
    return docTipo === 'DNI' ? 8 : 11;
  };

  // Document Input handler
  const handleDocNumeroChange = (e) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/\D/g, ''); // Digits only
    const maxLen = getRequiredLength();
    if (cleanVal.length <= maxLen) {
      setDocNumero(cleanVal);
      setIsValidated(false);
      setValidationError('');
      setRazonSocial('');
      setDireccionFiscal('');
    }
  };

  // Document Validation query
  const handleValidateDoc = async () => {
    const requiredLen = getRequiredLength();
    if (docNumero.length !== requiredLen) {
      setValidationError(`El número de documento debe tener exactamente ${requiredLen} dígitos.`);
      return;
    }

    setValidationError('');
    setIsValidating(true);
    setIsValidated(false);

    const type = comprobanteTipo === 'Factura' ? 'ruc' : docTipo.toLowerCase();
    try {
      const res = await fetch(`/api/facturacion/${type}/${docNumero}`);
      const data = await res.json();

      if (data.success) {
        setRazonSocial(data.razonSocial);
        setDireccionFiscal(data.direccion || '');
        setIsValidated(true);
        showToast('Documento validado correctamente', 'success');
      } else {
        setValidationError(data.error || 'No se encontró el documento en los registros.');
        showToast(data.error || 'No se encontró el documento', 'error');
      }
    } catch (e) {
      setValidationError('Error de conexión al validar el documento.');
      showToast('Error de conexión', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  // Kitchen validation
  const pendingKitchenItems = order.detalles.filter(d => {
    const sendsToKitchen = d.plato.categoria?.enviarCocina ?? true;
    const isPending = !['listo', 'lista', 'entregado'].includes(d.estado);
    return sendsToKitchen && isPending;
  });

  const isBlocked = pendingKitchenItems.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isBlocked) {
      showToast('No se puede cobrar: Hay platos pendientes en cocina.', 'error');
      return;
    }

    // Check document validation if required
    if (comprobanteTipo !== 'Ticket' && !isValidated) {
      const requiredLen = getRequiredLength();
      if (docNumero.length !== requiredLen) {
        setValidationError(`Por favor, ingrese un documento válido de ${requiredLen} dígitos.`);
        return;
      }
      setValidationError('Por favor valide el número de documento antes de continuar.');
      return;
    }

    if (metodo === 'efectivo' && (Number.isNaN(paidAmountNum) || paidAmountNum < totalFinal)) {
      showToast('El monto en efectivo ingresado es menor al total a cobrar.', 'error');
      return;
    }

    const resolvedDocType = comprobanteTipo === 'Ticket' ? 'sin_comprobante' : comprobanteTipo.toLowerCase();

    let resolvedPaymentMethod = metodo;
    if (metodo === 'tarjeta') {
      resolvedPaymentMethod = tarjetaProveedor.toLowerCase();
    } else if (metodo === 'digital') {
      resolvedPaymentMethod = billeteraProveedor.toLowerCase();
    }

    const titleMsg = `¿Finalizar cobro por S/. ${totalFinal.toFixed(2)}?`;
    if (await showConfirmation(titleMsg, { type: 'warning' })) {
      const targetTableId = order.mesaId || order.tableId || order.id;

      // Close modal and refresh UI instantly (Optimistic)
      onSuccess();

      let previousTables = null;
      try {
        const cached = localStorage.getItem('tables');
        if (cached) {
          previousTables = cached;
          const parsed = JSON.parse(cached);
          const updated = parsed.map(t => t.id === parseInt(targetTableId) ? { ...t, estado: 'libre', comandas: [] } : t);
          localStorage.setItem('tables', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('refreshTables'));
        }
      } catch (e) {
        console.error(e);
      }

      setOptimisticLock(parseInt(targetTableId), 'libre');

      // Checkout Logic (Offline-First hybrid logic)
      if (networkStatus.isOffline()) {
        offlineCheckoutService.checkout(targetTableId, {
          paymentMethod: resolvedPaymentMethod,
          docType: resolvedDocType,
          totalReceived: metodo === 'efectivo' ? paidAmountNum : totalFinal,
          tip: propinaMonto,
          tipoComprobante: comprobanteTipo.toLowerCase(),
          documentoCliente: comprobanteTipo !== 'Ticket' ? docNumero : null,
          razonSocial: comprobanteTipo !== 'Ticket' ? razonSocial : null,
          direccionFiscal: comprobanteTipo !== 'Ticket' ? direccionFiscal : null
        })
          .then(() => {
            showToast('Pago registrado correctamente (Modo Offline).', 'success');
            window.dispatchEvent(new CustomEvent('refreshCashCount'));
            window.dispatchEvent(new CustomEvent('refreshTables'));
            try {
              const channel = new BroadcastChannel('bunker');
              channel.postMessage('refreshTables');
              channel.postMessage('refreshCashCount');
              channel.close();
            } catch (e) {}
            if (onSuccess) onSuccess();
          })
          .catch(err => {
            console.error(err);
            showToast('Error al registrar pago localmente: ' + err.message, 'error');
            if (previousTables) {
              localStorage.setItem('tables', previousTables);
              window.dispatchEvent(new CustomEvent('refreshTables'));
            }
          });
      } else {
        // Send checkout details to backend
        fetch(`/api/checkout/${targetTableId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: resolvedPaymentMethod,
            docType: resolvedDocType,
            totalReceived: metodo === 'efectivo' ? paidAmountNum : totalFinal,
            tip: propinaMonto,
            observation: '',
            email: '',
            tipoComprobante: comprobanteTipo.toLowerCase(),
            documentoCliente: comprobanteTipo !== 'Ticket' ? docNumero : null,
            razonSocial: comprobanteTipo !== 'Ticket' ? razonSocial : null,
            direccionFiscal: comprobanteTipo !== 'Ticket' ? direccionFiscal : null
          })
        })
          .then(async res => {
            if (res.ok) {
              showToast('Pago registrado correctamente.', 'success');
              // Hidratar balance y mesas de fondo
              offlineSnapshotService.hydrateOperationalSnapshot().catch(() => {});

              window.dispatchEvent(new CustomEvent('refreshCashCount'));
              window.dispatchEvent(new CustomEvent('refreshTables'));
              try {
                const channel = new BroadcastChannel('bunker');
                channel.postMessage('refreshTables');
                channel.postMessage('refreshCashCount');
                channel.close();
              } catch (e) { }
              if (onSuccess) onSuccess();
            } else {
              showToast('Error al registrar pago. Verifica en Caja.', 'error');
              if (previousTables) {
                localStorage.setItem('tables', previousTables);
                window.dispatchEvent(new CustomEvent('refreshTables'));
              }
            }
          })
          .catch(e => {
            console.warn('[CheckoutModal] Registro online falló. Conmutando a offline local.');
            networkStatus.setStatus(NetworkState.OFFLINE_CONFIRMED);
            // Volver a intentar de forma offline
            handleCheckout();
          });
      }

      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-[var(--bg-surface)] text-left shadow-lg transition-all sm:my-8 sm:w-full sm:max-w-md border border-[var(--glass-border)]">

          {/* Header */}
          <div className="bg-[var(--bg-surface)] border-b border-[var(--glass-border)] px-6 py-4 flex justify-between items-center text-[var(--text-main)]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-main)] border border-[var(--glass-border)]">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)] font-sans">Cierre de Cuenta</h3>
                <p className="text-[11px] text-[var(--text-muted)] font-sans">
                  Mesa {order.mesa?.numero || order.tableNumero || ' '} •  Detalle y Facturación
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-secondary)] border-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

            {/* Validation Warning */}
            {isBlocked && (
              <div className="bg-amber-500 text-black p-3.5 rounded-lg flex items-start gap-2.5 font-sans font-medium text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">⚠️ No se puede cobrar: Hay platos pendientes en cocina.</div>
                  <div className="text-[10px] opacity-90 mt-1 font-normal">
                    Faltan: {pendingKitchenItems.map(p => p.plato.nombre).join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Products review */}
            <div className="bg-[var(--bg-secondary)] rounded-lg p-3.5 border border-[var(--glass-border)]">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 font-sans">Resumen de Consumo</span>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 font-sans">
                {order.detalles.map((d, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-[var(--text-muted)] truncate max-w-[250px]">
                      <span className="font-mono font-bold text-[var(--text-muted)] mr-1.5">{d.cantidad}x</span>
                      {d.plato.nombre}
                    </span>
                    <span className="font-mono font-medium text-[var(--text-main)]">S/. {(d.cantidad * d.plato.precio).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[var(--glass-border)] mt-2.5 pt-2 flex justify-between items-center text-xs font-bold text-[var(--text-main)] font-sans">
                <span>Subtotal Consumido:</span>
                <span className="font-mono text-sm">S/. {subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 font-sans">Método de Cobro</label>
              <div className="grid grid-cols-3 gap-2 font-sans">
                {[
                  { id: 'efectivo', name: 'Efectivo', icon: DollarSign, color: 'text-emerald-500' },
                  { id: 'tarjeta', name: 'Tarjeta (POS)', icon: CreditCard, color: 'text-amber-500' },
                  { id: 'digital', name: 'Billetera Digital', icon: Smartphone, color: 'text-blue-500' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMetodo(item.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border text-center transition-all cursor-pointer ${metodo === item.id
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white font-bold'
                      : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                      }`}
                  >
                    <item.icon className={`w-4 h-4 ${metodo === item.id ? 'text-white' : item.color}`} />
                    <span className="text-[12px] font-sans leading-tight">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detalle de Pago Section */}
            <div className="p-3.5 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)]/50 space-y-3 font-sans">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Detalle de Pago</span>

              {/* If Efectivo selected */}
              {metodo === 'efectivo' && (
                <div className="space-y-2">
                  <div className="relative rounded-lg">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-[var(--text-muted)] text-xs font-medium">S/.</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`0.00`}
                      value={montoPagado}
                      onChange={(e) => setMontoPagado(e.target.value)}
                      className="block w-full rounded-lg border border-[var(--glass-border)] py-2 pl-8 pr-3 text-xs focus:outline-hidden focus:border-[var(--primary)] transition-all text-[var(--text-main)] font-sans bg-[var(--bg-secondary)]"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-[var(--text-main)] font-sans pt-1">
                    <span>Vuelto:</span>
                    <span className={vuelto > 0 ? 'text-emerald-500 text-sm font-mono' : 'text-[var(--text-muted)] font-mono'}>
                      S/. {vuelto.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* If Tarjeta (POS) selected */}
              {metodo === 'tarjeta' && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'IZIPAY', name: 'IZIPAY' },
                    { id: 'NIUBIZ', name: 'NIUBIZ' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTarjetaProveedor(item.id)}
                      className={`py-2 font-sans px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${tarjetaProveedor === item.id
                        ? 'bg-amber-500 border-amber-500 text-white font-bold'
                        : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                        }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}

              {/* If Billetera Digital selected */}
              {metodo === 'digital' && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Yape', name: 'Yape' },
                    { id: 'Plin', name: 'Plin' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBilleteraProveedor(item.id)}
                      className={`font-sans py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${billeteraProveedor === item.id
                        ? 'bg-blue-600 border-blue-600 text-white font-bold'
                        : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                        }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tip (Propinas) Selector */}
            <div>
              <label className="block text-xs font-semibold tracking-widest text-[var(--text-muted)] mb-2 font-sans">AGREGAR PROPINA</label>
              <div className="grid grid-cols-4 gap-1.5 text-center mb-2 font-sans">
                {[0, 5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setPropinaPct(pct);
                      setCustomPropina('');
                    }}
                    className={`font-sans py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${propinaPct === pct
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold'
                      : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                      }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPropinaPct('custom')}
                className={`w-full py-1.5 px-3 rounded-lg border text-xs text-center transition-all cursor-pointer mb-2 font-sans ${propinaPct === 'custom'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold'
                  : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                  }`}
              >
                Monto Personalizado
              </button>

              {propinaPct === 'custom' && (
                <div className="relative rounded-lg font-sans">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-[var(--text-muted)] text-xs font-medium">S/.</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto de propina"
                    value={customPropina}
                    onChange={(e) => setCustomPropina(e.target.value)}
                    className="block w-full rounded-lg border border-[var(--glass-border)] py-1.5 pl-8 pr-3 text-xs focus:outline-hidden focus:border-[var(--primary)] transition-all text-[var(--text-main)] font-sans bg-[var(--bg-secondary)]"
                  />
                </div>
              )}

              <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                <span>Monto propina calculada:</span>
                <span>S/. {propinaMonto.toFixed(2)}</span>
              </div>
            </div>

            {/* Comprobante Section */}
            <div className="border-t border-[var(--glass-border)] pt-3.5 space-y-3 font-sans">
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Comprobante</label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Ticket', name: 'Ticket' },
                  { id: 'Boleta', name: 'Boleta' },
                  { id: 'Factura', name: 'Factura' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setComprobanteTipo(item.id);
                      setDocNumero('');
                      setIsValidated(false);
                      setValidationError('');
                      setRazonSocial('');
                      setDireccionFiscal('');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${comprobanteTipo === item.id
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white font-bold'
                      : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                      }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              {/* Boleta extra options */}
              {comprobanteTipo === 'Boleta' && (
                <div className="space-y-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--glass-border)]">
                  <div className="flex gap-2">
                    {[
                      { id: 'DNI', name: 'DNI (8 dígitos)' },
                      { id: 'RUC', name: 'RUC (11 dígitos)' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDocTipo(item.id);
                          setDocNumero('');
                          setIsValidated(false);
                          setValidationError('');
                          setRazonSocial('');
                          setDireccionFiscal('');
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${docTipo === item.id
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-white font-bold'
                          : 'bg-[var(--bg-surface)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                          }`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Ingrese ${docTipo}`}
                      value={docNumero}
                      onChange={handleDocNumeroChange}
                      className={`block w-full rounded-lg border py-2 px-3 text-xs focus:outline-hidden transition-all font-mono text-[var(--text-main)] bg-[var(--bg-surface)] ${isValidated
                        ? 'border-emerald-400 bg-emerald-500/10 focus:border-emerald-500'
                        : validationError
                          ? 'border-rose-300 focus:border-rose-500 bg-rose-500/5'
                          : 'border-[var(--glass-border)] focus:border-[var(--primary)]'
                        }`}
                    />
                    {isValidated && (
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validado
                      </span>
                    )}
                  </div>

                  {razonSocial && (
                    <div className="p-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded text-[var(--text-main)] text-[11px] space-y-0.5">
                      <div className="font-bold">{razonSocial}</div>
                      {direccionFiscal && <div className="text-[var(--text-muted)]">{direccionFiscal}</div>}
                    </div>
                  )}

                  {validationError && (
                    <p className="text-[10px] text-rose-500 flex items-center gap-1 font-medium leading-none">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {validationError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleValidateDoc}
                    disabled={isValidating || docNumero.length !== getRequiredLength()}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold shadow-xs transition-all ${isValidating
                      ? 'bg-zinc-500 text-white cursor-not-allowed'
                      : docNumero.length === getRequiredLength()
                        ? 'bg-[var(--primary)] text-white hover:opacity-90 active:opacity-100 cursor-pointer'
                        : 'bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-muted)] cursor-not-allowed'
                      }`}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Validando Documento...</span>
                      </>
                    ) : (
                      <span>Validar Documento</span>
                    )}
                  </button>
                </div>
              )}

              {/* Factura RUC option */}
              {comprobanteTipo === 'Factura' && (
                <div className="space-y-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--glass-border)] font-sans">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest block">RUC Facturación (11 dígitos)</span>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ingrese RUC"
                      value={docNumero}
                      onChange={handleDocNumeroChange}
                      className={`block w-full rounded-lg border py-2 px-3 text-xs focus:outline-hidden transition-all font-mono text-[var(--text-main)] bg-[var(--bg-surface)] ${isValidated
                        ? 'border-emerald-400 bg-emerald-500/10 focus:border-emerald-500'
                        : validationError
                          ? 'border-rose-350 focus:border-rose-500 bg-rose-500/5'
                          : 'border-[var(--glass-border)] focus:border-[var(--primary)]'
                        }`}
                    />
                    {isValidated && (
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validado
                      </span>
                    )}
                  </div>

                  {razonSocial && (
                    <div className="p-2 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded text-[var(--text-main)] text-[11px] space-y-0.5">
                      <div className="font-bold">{razonSocial}</div>
                      {direccionFiscal && <div className="text-[var(--text-muted)]">{direccionFiscal}</div>}
                    </div>
                  )}

                  {validationError && (
                    <p className="text-[10px] text-rose-500 flex items-center gap-1 font-medium leading-none">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {validationError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleValidateDoc}
                    disabled={isValidating || docNumero.length !== 11}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold shadow-xs transition-all ${isValidating
                      ? 'bg-zinc-500 text-white cursor-not-allowed'
                      : docNumero.length === 11
                        ? 'bg-[var(--primary)] text-white hover:opacity-90 active:opacity-100 cursor-pointer'
                        : 'bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-muted)] cursor-not-allowed'
                      }`}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Validando RUC...</span>
                      </>
                    ) : (
                      <span>Validar RUC</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Printable option toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] font-sans">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs font-semibold text-[var(--text-main)]">Imprimir Comprobante</span>
              </div>
              <input
                type="checkbox"
                checked={imprimirTicket}
                onChange={(e) => setImprimirTicket(e.target.checked)}
                className="w-4 h-4 accent-[var(--primary)] border-[var(--glass-border)] text-[var(--text-main)] rounded cursor-pointer"
              />
            </div>

            {/* Total final display */}
            <div className="border-t border-[var(--glass-border)] pt-3 flex justify-between items-center font-sans">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Total a Cobrar</span>
                <span className="text-xs text-[var(--text-muted)]">Subtotal + Propina</span>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-500">
                S/. {totalFinal.toFixed(2)}
              </span>
            </div>

            {/* Checkout confirmation */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer shadow-xs mt-2 font-sans"
            >
              <span>Confirmar Pago e Imprimir</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
