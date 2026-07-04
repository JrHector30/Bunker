import React, { useState, useEffect } from 'react';
import { X, DollarSign, Smartphone, CreditCard, HelpCircle, Receipt, Printer, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { CuentaAbierta } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuenta: CuentaAbierta | null;
  onConfirmCheckout: (
    cuentaId: string,
    metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta',
    montoTotal: number,
    propina: number
  ) => void;
}

export function CheckoutModal({ isOpen, onClose, cuenta, onConfirmCheckout }: CheckoutModalProps) {
  // Selected main payment method
  const [metodo, setMetodo] = useState<'efectivo' | 'tarjeta' | 'digital'>('efectivo');

  // Cash payment states
  const [montoPagado, setMontoPagado] = useState<string>('');

  // Card provider states (IZIPAY, NIUBIZ)
  const [tarjetaProveedor, setTarjetaProveedor] = useState<'IZIPAY' | 'NIUBIZ'>('IZIPAY');

  // Digital wallet provider states (Yape, Plin)
  const [billeteraProveedor, setBilleteraProveedor] = useState<'Yape' | 'Plin'>('Yape');

  // Tip (Propinas) Selector states
  const [propinaPct, setPropinaPct] = useState<number | 'custom'>(10);
  const [customPropina, setCustomPropina] = useState<string>('');
  const [imprimirTicket, setImprimirTicket] = useState(true);

  // Comprobante states
  const [comprobanteTipo, setComprobanteTipo] = useState<'Ticket' | 'Boleta' | 'Factura'>('Ticket');
  const [docTipo, setDocTipo] = useState<'DNI' | 'RUC'>('DNI');
  const [docNumero, setDocNumero] = useState<string>('');

  // Validation API States
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Reset states when modal is opened for a new table
  useEffect(() => {
    if (isOpen) {
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
      setIsValidated(false);
      setValidationError('');
    }
  }, [isOpen, cuenta]);

  if (!isOpen || !cuenta) return null;

  // Tip calculation
  const subtotal = cuenta.monto;
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
  const handleDocNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanVal = rawVal.replace(/\D/g, ''); // Digits only
    const maxLen = getRequiredLength();
    if (cleanVal.length <= maxLen) {
      setDocNumero(cleanVal);
      setIsValidated(false);
      setValidationError('');
    }
  };

  // Mock API Validation
  const handleValidateDoc = () => {
    const requiredLen = getRequiredLength();
    if (docNumero.length !== requiredLen) {
      setValidationError(`El número de documento debe tener exactamente ${requiredLen} dígitos.`);
      return;
    }

    setValidationError('');
    setIsValidating(true);
    setIsValidated(false);

    // Simulate Electronic Billing API query
    setTimeout(() => {
      setIsValidating(false);
      setIsValidated(true);
    }, 900);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    // Map checkout payment method to underlying system types
    let finalMethod: 'efectivo' | 'yape' | 'plin' | 'tarjeta' = 'efectivo';
    if (metodo === 'tarjeta') {
      finalMethod = 'tarjeta';
    } else if (metodo === 'digital') {
      finalMethod = billeteraProveedor === 'Yape' ? 'yape' : 'plin';
    }

    onConfirmCheckout(cuenta.id, finalMethod, subtotal, propinaMonto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-lg transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200">
          
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center text-slate-900">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cierre de Cuenta</h3>
                <p className="text-[11px] text-slate-400">{cuenta.mesa} • Detalle y Facturación</p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {/* Products review */}
            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Resumen de Consumo</span>
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {cuenta.productos.map((prod, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 truncate max-w-[250px]">
                      <span className="font-mono font-bold text-slate-400 mr-1.5">{prod.cantidad}x</span>
                      {prod.nombre}
                    </span>
                    <span className="font-mono font-medium text-slate-700">S/. {prod.precio.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 mt-2.5 pt-2 flex justify-between items-center text-xs font-bold text-slate-800">
                <span>Subtotal Consumido:</span>
                <span className="font-mono text-sm">S/. {subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector (Metodo de Cobro) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Método de Cobro</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'efectivo', name: 'Efectivo', icon: DollarSign, color: 'text-emerald-500' },
                  { id: 'tarjeta', name: 'Tarjeta (POS)', icon: CreditCard, color: 'text-amber-500' },
                  { id: 'digital', name: 'Billetera Digital', icon: Smartphone, color: 'text-blue-500' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMetodo(item.id as any)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      metodo === item.id
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${metodo === item.id ? 'text-white' : item.color}`} />
                    <span className="text-[10px] font-bold leading-tight">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detalle de Pago Section */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Detalle de Pago</span>
              
              {/* If Efectivo selected */}
              {metodo === 'efectivo' && (
                <div className="space-y-2">
                  <div className="relative rounded-lg">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-slate-400 text-xs font-medium">S/.</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={`Monto recibido (Total: S/. ${totalFinal.toFixed(2)})`}
                      value={montoPagado}
                      onChange={(e) => setMontoPagado(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs focus:outline-hidden focus:border-slate-800 transition-all text-slate-900 font-mono bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 font-mono pt-1">
                    <span>Vuelto:</span>
                    <span className={vuelto > 0 ? 'text-emerald-600 text-sm' : 'text-slate-500'}>
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
                      onClick={() => setTarjetaProveedor(item.id as any)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                        tarjetaProveedor === item.id
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
                      onClick={() => setBilleteraProveedor(item.id as any)}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                        billeteraProveedor === item.id
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Agregar Propina</label>
              <div className="grid grid-cols-4 gap-1.5 text-center mb-2">
                {[0, 5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setPropinaPct(pct);
                      setCustomPropina('');
                    }}
                    className={`py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                      propinaPct === pct
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setPropinaPct('custom')}
                className={`w-full py-1.5 px-3 rounded-lg border text-xs text-center transition-all cursor-pointer mb-2 ${
                  propinaPct === 'custom'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Monto Personalizado
              </button>

              {propinaPct === 'custom' && (
                <div className="relative rounded-lg">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-400 text-xs font-medium">S/.</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto de propina"
                    value={customPropina}
                    onChange={(e) => setCustomPropina(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:outline-hidden focus:border-slate-800 transition-all text-slate-900 font-mono"
                  />
                </div>
              )}

              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>Monto propina calculada:</span>
                <span>S/. {propinaMonto.toFixed(2)}</span>
              </div>
            </div>

            {/* Comprobante Section */}
            <div className="border-t border-slate-200 pt-3.5 space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">Comprobante</label>
              
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
                      setComprobanteTipo(item.id as any);
                      setDocNumero('');
                      setIsValidated(false);
                      setValidationError('');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      comprobanteTipo === item.id
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>

              {/* Boleta extra options */}
              {comprobanteTipo === 'Boleta' && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex gap-2">
                    {[
                      { id: 'DNI', name: 'DNI (8 dígitos)' },
                      { id: 'RUC', name: 'RUC (11 dígitos)' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDocTipo(item.id as any);
                          setDocNumero('');
                          setIsValidated(false);
                          setValidationError('');
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                          docTipo === item.id
                            ? 'bg-slate-700 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
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
                      className={`block w-full rounded-lg border py-2 px-3 text-xs focus:outline-hidden transition-all font-mono text-slate-900 bg-white ${
                        isValidated
                          ? 'border-emerald-400 bg-emerald-50/20 focus:border-emerald-500'
                          : validationError
                          ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10'
                          : 'border-slate-200 focus:border-slate-800'
                      }`}
                    />
                    {isValidated && (
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validado
                      </span>
                    )}
                  </div>

                  {validationError && (
                    <p className="text-[10px] text-rose-600 flex items-center gap-1 font-medium leading-none">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {validationError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleValidateDoc}
                    disabled={isValidating || docNumero.length !== getRequiredLength()}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white shadow-xs transition-all ${
                      isValidating
                        ? 'bg-slate-400 cursor-not-allowed'
                        : docNumero.length === getRequiredLength()
                        ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 cursor-pointer'
                        : 'bg-slate-300 cursor-not-allowed text-slate-500'
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

              {/* Factura extra options */}
              {comprobanteTipo === 'Factura' && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">RUC Facturación (11 dígitos)</span>
                  
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ingrese RUC"
                      value={docNumero}
                      onChange={handleDocNumeroChange}
                      className={`block w-full rounded-lg border py-2 px-3 text-xs focus:outline-hidden transition-all font-mono text-slate-900 bg-white ${
                        isValidated
                          ? 'border-emerald-400 bg-emerald-50/20 focus:border-emerald-500'
                          : validationError
                          ? 'border-rose-300 focus:border-rose-500 bg-rose-50/10'
                          : 'border-slate-200 focus:border-slate-800'
                      }`}
                    />
                    {isValidated && (
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validado
                      </span>
                    )}
                  </div>

                  {validationError && (
                    <p className="text-[10px] text-rose-600 flex items-center gap-1 font-medium leading-none">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {validationError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleValidateDoc}
                    disabled={isValidating || docNumero.length !== 11}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-white shadow-xs transition-all ${
                      isValidating
                        ? 'bg-slate-400 cursor-not-allowed'
                        : docNumero.length === 11
                        ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 cursor-pointer'
                        : 'bg-slate-300 cursor-not-allowed text-slate-500'
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
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">Imprimir Comprobante</span>
              </div>
              <input
                type="checkbox"
                checked={imprimirTicket}
                onChange={(e) => setImprimirTicket(e.target.checked)}
                className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-800 cursor-pointer"
              />
            </div>

            {/* Total final display */}
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Total a Cobrar</span>
                <span className="text-xs text-slate-500">Subtotal + Propina</span>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-600">
                S/. {totalFinal.toFixed(2)}
              </span>
            </div>

            {/* Checkout confirmation */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all cursor-pointer shadow-sm mt-2"
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
