import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { enqueueTicket } from '../utils/printer';
import { networkStatus, offlineCashService } from '../offline';

export function SummaryTicketModal({ isOpen, onClose, arqueoId }) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    if (isOpen && arqueoId) {
      setLoading(true);
      setSummaryData(null);

      const loadData = async () => {
        try {
          if (networkStatus.isOffline()) {
            const data = await offlineCashService.getArqueoDetails(arqueoId);
            setSummaryData(data);
          } else {
            const res = await fetch(`/api/cashier/arqueo/${arqueoId}`);
            if (res.ok) {
              const data = await res.json();
              setSummaryData(data);
            } else {
              showToast('Error al obtener el resumen de caja.', 'error');
              onClose();
            }
          }
        } catch (err) {
          console.error('[SummaryTicketModal] Error cargando resumen:', err);
          showToast('Error al obtener el resumen de caja.', 'error');
          onClose();
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [isOpen, arqueoId, showToast, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "--:--";
    const d = new Date(dateString);
    return d.toLocaleString('es-PE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  const getVentasTotal = (data) => {
    return (
      (data.ingresos?.efectivo || 0) +
      (data.ingresos?.tarjeta || 0) +
      (data.ingresos?.yape || 0) +
      (data.ingresos?.plin || 0) +
      (data.ingresos?.izipay || 0) +
      (data.ingresos?.niubiz || 0)
    );
  };

  const handlePrint = async () => {
    try {
      const content = {
        type: 'arqueo',
        ...summaryData
      };
      await enqueueTicket(summaryData.id, 'Caja', content, 'Caja');
      showToast('Resumen de caja encolado para impresión en la nube.', 'success');
    } catch (err) {
      console.error(err);
      showToast(`Error al imprimir en la nube: ${err.message}. Intentando impresión de navegador...`, 'warning');
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop (hidden on print) */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs no-print" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Container */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-lg transition-all border border-slate-200 w-full max-w-sm font-sans no-print">

          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center text-slate-900">
            <div>
              <h3 className="text-base font-bold text-slate-900">Resumen de Caja</h3>
              <p className="text-[11px] text-slate-400">Previsualización de Ticket</p>
            </div>
            <button
              onClick={onClose}
              className="border-none text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ticket Display Container */}
          <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col items-center bg-slate-50">

            {/* The printable ticket element */}
            <div className="print-ticket bg-white text-black w-[310px] shadow-sm border border-slate-200 p-5 font-mono text-[11.5px] leading-tight select-none">

              <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <div className="font-bold text-[14px]">BUNKER</div>
                <div>Bunker POS System</div>
                <div>Telf: +51 924 383 883</div>
                <div className="text-[10px] mt-1">
                  Impreso: {new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE', { hour12: false })}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-6 text-slate-500">
                  Cargando resumen...
                </div>
              ) : !summaryData ? (
                <div className="text-center py-6 text-rose-500">
                  Error de datos.
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <div className="font-bold text-center border-b border-black pb-1 mb-2">TICKET RESUMEN DE CAJA</div>
                    <div className="flex justify-between"><span>SESIÓN N°:</span><span className="font-bold">{summaryData.id}</span></div>
                    <div className="flex justify-between"><span>ESTADO:</span><span className="font-bold">{summaryData.estado?.toUpperCase()}</span></div>
                    <div className="flex justify-between"><span>APERTURA:</span><span>{formatDate(summaryData.fechaInicio)}</span></div>
                    {summaryData.estado !== 'abierto' && (
                      <div className="flex justify-between"><span>CIERRE:</span><span>{formatDate(summaryData.fechaFin)}</span></div>
                    )}
                  </div>

                  <div className="border-t border-black pt-2">
                    <div className="flex justify-between font-bold"><span>FONDO INICIAL:</span><span>S/. {(summaryData.montoInicial || 0).toFixed(2)}</span></div>
                  </div>

                  <div className="border-t border-dashed border-black pt-2 space-y-1">
                    <div className="font-bold">DESGLOSE DE VENTAS:</div>
                    <div className="flex justify-between pl-2"><span>Efectivo:</span><span>S/. {(summaryData.ingresos?.efectivo || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between pl-2"><span>Tarjeta (POS):</span><span>S/. {((summaryData.ingresos?.tarjeta || 0) + (summaryData.ingresos?.izipay || 0) + (summaryData.ingresos?.niubiz || 0)).toFixed(2)}</span></div>
                    <div className="flex justify-between pl-2"><span>Yape:</span><span>S/. {(summaryData.ingresos?.yape || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between pl-2"><span>Plin:</span><span>S/. {(summaryData.ingresos?.plin || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold"><span>TOTAL VENTAS:</span><span>S/. {getVentasTotal(summaryData).toFixed(2)}</span></div>
                  </div>

                  <div className="border-t border-dashed border-black pt-2 space-y-1">
                    <div className="font-bold">MOVIMIENTOS MANUALES:</div>
                    <div className="flex justify-between pl-2"><span>Ingresos Manuales:</span><span>S/. {(summaryData.ingresos?.manual || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between pl-2"><span>Egresos Manuales:</span><span>S/. {(summaryData.egresos || 0).toFixed(2)}</span></div>
                  </div>

                  <div className="border-t border-black pt-2 space-y-1">
                    <div className="flex justify-between font-bold text-[12px] border-b border-black pb-1">
                      <span>SALDO EN CAJA (EFECTIVO):</span>
                      <span>S/. {(summaryData.totalCaja || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[12px] border-b border-black pb-1">
                      <span>MONTO BRUTO NETO:</span>
                      <span>
                        {summaryData.totalBruto !== null ? `S/. ${Number(summaryData.totalBruto).toFixed(2)}` : 'PRECIO NO DISPONIBLE'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Fondo de Propinas:</span>
                      <span>S/. {(summaryData.totalPropinas || summaryData.propinas || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center text-[10px] border-t border-dashed border-black pt-2 mt-4">
                    <div>Fin del Reporte</div>
                    <div>¡Gracias por su servicio!</div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Footer Action Buttons */}
          <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-200 justify-end rounded-b-lg no-print">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-350 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handlePrint}
              disabled={loading || !summaryData}
              className="py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Ticket
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
