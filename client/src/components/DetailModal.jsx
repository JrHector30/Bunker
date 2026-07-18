import React, { useState, useEffect } from 'react';
import { X, DollarSign, Smartphone, CreditCard, HelpCircle, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { networkStatus, offlineCashService } from '../offline';

export function DetailModal({ isOpen, onClose, arqueoId }) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [arqueo, setArqueo] = useState(null);

  useEffect(() => {
    if (isOpen && arqueoId) {
      setLoading(true);
      setArqueo(null);

      const loadData = async () => {
        try {
          if (networkStatus.isOffline()) {
            const data = await offlineCashService.getArqueoDetails(arqueoId);
            setArqueo(data);
          } else {
            const res = await fetch(`/api/cashier/arqueo/${arqueoId}`);
            if (res.ok) {
              const data = await res.json();
              setArqueo(data);
            } else {
              showToast('Error al obtener los detalles del arqueo.', 'error');
              onClose();
            }
          }
        } catch (err) {
          console.error('[DetailModal] Error cargando arqueo:', err);
          showToast('Error al obtener los detalles del arqueo.', 'error');
          onClose();
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [isOpen, arqueoId, showToast, onClose]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto no-print">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div className="relative transform overflow-hidden rounded-lg bg-white p-8 text-center shadow-lg transition-all border border-slate-200 w-full max-w-sm font-sans">
            <div className="border-3 border-slate-200 border-t-slate-800 rounded-full w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium">Cargando Detalles de Auditoría...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!arqueo) return null;

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return "--:--";
    const d = new Date(dateString);
    return d.toLocaleString('es-PE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  // Derive sums
  const efSum = arqueo.ingresos?.efectivo || 0;
  const digSum = (arqueo.ingresos?.yape || 0) + (arqueo.ingresos?.plin || 0);
  const cardSum = (arqueo.ingresos?.tarjeta || 0) + (arqueo.ingresos?.izipay || 0) + (arqueo.ingresos?.niubiz || 0);
  const manSum = arqueo.ingresos?.manual || 0;

  const arqueoMovs = arqueo.movimientos || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto no-print">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-lg transition-all sm:my-8 sm:w-full sm:max-w-xl border border-slate-200 font-sans">
          
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center text-slate-900">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Resumen Auditoría de Caja</h3>
                <p className="text-[11px] text-slate-400">Arqueo Sesión N° {arqueo.id} • {arqueo.estado?.toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[500px] overflow-y-auto">
            {/* Fechas banner */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600 grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de Apertura</span>
                <span className="font-mono font-medium text-slate-700">{formatDate(arqueo.fechaInicio)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de Cierre</span>
                {arqueo.estado === 'abierto' ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    EN CURSO
                  </span>
                ) : (
                  <span className="font-mono font-medium text-slate-700">{formatDate(arqueo.fechaFin)}</span>
                )}
              </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monto Inicial</span>
                <span className="text-sm font-bold font-mono text-slate-700">S/. {(arqueo.montoInicial || 0).toFixed(2)}</span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-200 p-3 rounded-lg text-center">
                <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Efectivo en Caja</span>
                <span className="text-sm font-bold font-mono text-emerald-700">S/. {(arqueo.totalCaja || 0).toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total en Bruto</span>
                <span className="text-sm font-bold font-mono text-slate-700">
                  {arqueo.totalBruto !== null ? `S/. ${Number(arqueo.totalBruto).toFixed(2)}` : 'Inconsistente'}
                </span>
              </div>
            </div>

            {/* Desglose de Ingresos */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Desglose de Ingresos Registrados</h4>
              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { name: 'Efectivo', val: efSum, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50/20' },
                  { name: 'Digital (Yape/Plin)', val: digSum, icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-50/20' },
                  { name: 'Tarjeta (POS)', val: cardSum, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-50/20' },
                  { name: 'Manual/Otros', val: manSum, icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-100/50' }
                ].map((item) => (
                  <div key={item.name} className={`flex items-center justify-between p-3 rounded-lg border border-slate-200 ${item.bg}`}>
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs font-medium text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-800">S/. {item.val.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Propinas y Egresos */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-3">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Fondo de Propinas</span>
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/30 flex justify-between items-center">
                  <span className="text-xs text-amber-800 font-semibold">Acumulado</span>
                  <span className="font-mono text-xs font-bold text-amber-700">S/. {(arqueo.totalPropinas || arqueo.propinas || 0).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Egresos / Retiros de Caja</span>
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/30 flex justify-between items-center">
                  <span className="text-xs text-rose-800 font-semibold">Retirado en Efectivo</span>
                  <span className="font-mono text-xs font-bold text-rose-700">S/. {(arqueo.egresos || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Listado de movimientos de esta sesión */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Flujo de Movimientos Recientes ({arqueoMovs.length})</h4>
                {arqueo.estado === 'abierto' && (
                  <span className="text-[10px] text-slate-400 font-mono italic">Flujo en tiempo real</span>
                )}
              </div>

              {arqueoMovs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                  No se registraron movimientos manuales o egresos en esta sesión.
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {arqueoMovs.map((mov) => (
                    <div key={mov.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        {mov.tipo === 'INGRESO' ? (
                          <span className="p-1 rounded bg-emerald-50 text-emerald-600">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 rounded bg-rose-50 text-rose-600">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div>
                          <span className="font-semibold text-slate-700">{mov.concepto || mov.descripcion}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {formatDate(mov.fecha)} • {mov.metodoPago?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold ${mov.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {mov.tipo === 'INGRESO' ? '+' : '-'} S/. {mov.monto.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer action buttons */}
          <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-200 justify-end rounded-b-lg">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
