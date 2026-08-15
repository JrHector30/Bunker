import React, { useState } from 'react';
import { X, Plus, DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Smartphone } from 'lucide-react';

export function MovimientoModal({ isOpen, onClose, onAddMovimiento, activeArqueo }) {
  const [tipo, setTipo] = useState('EGRESO'); // Match legacy: 'EGRESO' or 'INGRESO'
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [comprobante, setComprobante] = useState('recibo');
  const [descripcion, setDescripcion] = useState('');
  const [errors, setErrors] = useState({});

  if (!isOpen || !activeArqueo) return null;

  // Get available limits
  const cajaDisponible = activeArqueo.totalCaja || 0;
  const yapeDisponible = activeArqueo.ingresos?.yape || 0;
  const plinDisponible = activeArqueo.ingresos?.plin || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    const numMonto = parseFloat(monto);
    if (!monto || isNaN(numMonto) || numMonto <= 0) {
      newErrors.monto = 'Ingrese un monto válido mayor a 0.';
    }
    if (!descripcion.trim()) {
      newErrors.descripcion = 'Ingrese una descripción del movimiento.';
    }

    // Limit check for egresos
    if (tipo === 'EGRESO') {
      let availableLimit = 0;
      let limitLabel = 'Caja';
      if (metodoPago === 'efectivo') {
        availableLimit = cajaDisponible;
        limitLabel = 'Caja';
      } else if (metodoPago === 'yape') {
        availableLimit = yapeDisponible;
        limitLabel = 'Yape';
      } else if (metodoPago === 'plin') {
        availableLimit = plinDisponible;
        limitLabel = 'Plin';
      }

      if (numMonto > availableLimit) {
        newErrors.monto = `Monto de egreso supera el disponible en ${limitLabel} (S/. ${availableLimit.toFixed(2)})`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onAddMovimiento({
      tipo,
      monto: numMonto,
      metodoPago: tipo === 'EGRESO' ? metodoPago : 'efectivo', // ingress is always cash in our legacy system
      tipoComprobante: comprobante, // Match backend schema: 'tipoComprobante'
      concepto: descripcion.trim()  // Match backend schema: 'concepto'
    });

    // Reset form
    setTipo('EGRESO');
    setMonto('');
    setMetodoPago('efectivo');
    setComprobante('recibo');
    setDescripcion('');
    setErrors({});
    onClose();
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
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)] font-sans">Registrar Movimiento</h3>
                <p className="text-[11px] text-[var(--text-muted)] font-sans">Arqueo en curso N° {activeArqueo.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-secondary)] border-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Toggle Tipo (Ingreso / Egreso) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 font-sans">Tipo de Movimiento</label>
              <div className="grid grid-cols-2 gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setTipo('INGRESO');
                    setMetodoPago('efectivo');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all cursor-pointer ${tipo === 'INGRESO'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold'
                    : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                    }`}
                >
                  <ArrowUpRight className={`w-4 h-4 ${tipo === 'INGRESO' ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                  <span>Ingreso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('EGRESO')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all cursor-pointer ${tipo === 'EGRESO'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 font-bold'
                    : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                    }`}
                >
                  <ArrowDownRight className={`w-4 h-4 ${tipo === 'EGRESO' ? 'text-rose-500' : 'text-[var(--text-muted)]'}`} />
                  <span>Egreso (Salida)</span>
                </button>
              </div>
            </div>

            {/* Monto Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1.5 font-sans">Monto (S/.)</label>
              <div className="relative rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-[var(--text-muted)] text-sm font-medium">S/.</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => {
                    setMonto(e.target.value);
                    if (errors.monto) setErrors({ ...errors, monto: undefined });
                  }}
                  className={`block w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-hidden transition-all font-mono ${errors.monto
                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-500 focus:border-rose-500'
                    : 'border-[var(--glass-border)] bg-[var(--bg-secondary)] text-[var(--text-main)] focus:border-[var(--primary)]'
                    }`}
                />
              </div>
              {errors.monto && <p className="text-xs text-rose-500 mt-1 font-sans font-medium">{errors.monto}</p>}
            </div>

            {/* Método de Pago */}
            {tipo === 'EGRESO' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 font-sans">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  {[
                    { id: 'yape', name: 'Yape', icon: Smartphone, color: 'text-purple-500' },
                    { id: 'plin', name: 'Plin', icon: Smartphone, color: 'text-teal-500' },
                    { id: 'efectivo', name: 'Efectivo', icon: DollarSign, color: 'text-emerald-500' },
                    { id: 'tarjeta', name: 'Tarjeta (POS)', icon: CreditCard, color: 'text-amber-500' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMetodoPago(item.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium text-left transition-all cursor-pointer ${metodoPago === item.id
                        ? 'bg-[var(--primary)] border-[var(--primary)] text-white font-bold'
                        : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                        }`}
                    >
                      <item.icon className={`w-4 h-4 ${metodoPago === item.id ? 'text-white' : item.color}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>

                {/* Límite disponible en Caja / Yape / Plin */}
                {['efectivo', 'yape', 'plin'].includes(metodoPago) && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-450 text-xs flex items-center gap-2 animate-fade-in font-sans">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="font-semibold">
                      {metodoPago === 'efectivo' && `Límite disponible en Caja: S/. ${cajaDisponible.toFixed(2)}`}
                      {metodoPago === 'yape' && `Límite disponible en Yape: S/. ${yapeDisponible.toFixed(2)}`}
                      {metodoPago === 'plin' && `Límite disponible en Plin: S/. ${plinDisponible.toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tipo de Comprobante */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 font-sans">Tipo de Comprobante</label>
              <div className="grid grid-cols-3 gap-2 font-sans">
                {[
                  { id: 'recibo', name: 'Recibo' },
                  { id: 'boleta', name: 'Boleta' },
                  { id: 'factura', name: 'Factura' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setComprobante(item.id)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${comprobante === item.id
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white font-bold'
                      : 'bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-muted)] hover:bg-[var(--item-hover)]'
                      }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1.5 font-sans">Descripción / Concepto</label>
              <textarea
                rows={2}
                placeholder="Ej. Compra de insumos de cocina urgentes, propinas del turno..."
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  if (errors.descripcion) setErrors({ ...errors, descripcion: undefined });
                }}
                className={`block w-full rounded-lg border p-3 text-sm focus:outline-hidden transition-all resize-none font-sans ${errors.descripcion
                  ? 'border-rose-500/30 bg-rose-500/5 text-rose-500 focus:border-rose-500'
                  : 'border-[var(--glass-border)] bg-[var(--bg-secondary)] text-[var(--text-main)] focus:border-[var(--primary)]'
                  }`}
              />
              {errors.descripcion && <p className="text-xs text-rose-500 mt-1 font-sans font-medium">{errors.descripcion}</p>}
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="pt-2 flex gap-3 font-sans">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--glass-border)] text-sm font-sans text-[var(--text-muted)] bg-[var(--bg-secondary)] hover:bg-[var(--item-hover)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-sans border-white/20 text-white bg-[var(--primary)] hover:opacity-90 active:opacity-100 transition-colors cursor-pointer shadow-xs"
              >
                Confirmar Registro
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
