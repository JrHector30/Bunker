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
    return d.toLocaleString('es-PE');
  };

  const getResponsable = (data) => {
    if (!data) return 'ADMINISTRACIÓN';
    return (
      data.responsable ||
      data.usuario?.nombre ||
      (typeof data.usuario === 'string' ? data.usuario : '') ||
      'ADMINISTRACIÓN'
    ).toUpperCase();
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
      const respName = getResponsable(summaryData);
      const content = {
        type: 'arqueo',
        responsable: respName,
        ...summaryData
      };
      await enqueueTicket(summaryData.id, respName, content, 'Caja');
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

            {/* The printable ticket element (WYSIWYG replica of thermal ESC/POS print) */}
            <div className="print-ticket bg-white text-black w-[320px] shadow-sm border border-slate-200 p-6 font-mono text-[11.5px] leading-tight select-none">
              {loading ? (
                <div className="text-center py-6 text-slate-500">
                  Cargando resumen...
                </div>
              ) : !summaryData ? (
                <div className="text-center py-6 text-rose-500">
                  Error de datos.
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-center font-bold tracking-tight text-slate-400">================================</div>
                  <div className="text-center font-bold tracking-wider text-[13px]">BUNKER RESTOBAR</div>
                  <div className="text-center font-bold text-[12px]">RESUMEN DE CAJA</div>
                  <div className="text-center font-bold tracking-tight text-slate-400">================================</div>

                  <div className="pt-1 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-semibold">FECHA IMP:</span>
                      <span>{new Date().toLocaleString('es-PE')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">TURNO N°:</span>
                      <span className="font-bold">{summaryData.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">RESPONSABLE:</span>
                      <span className="font-bold">{getResponsable(summaryData)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">ESTADO:</span>
                      <span className="font-bold">{summaryData.estado?.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">INICIO:</span>
                      <span>{formatDate(summaryData.fechaInicio)}</span>
                    </div>
                    {summaryData.fechaFin && (
                      <div className="flex justify-between">
                        <span className="font-semibold">CIERRE:</span>
                        <span>{formatDate(summaryData.fechaFin)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-1">
                      <span>M. INICIAL:</span>
                      <span>S/. {(summaryData.montoInicial || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center tracking-tight text-slate-400">--------------------------------</div>

                  <div className="space-y-0.5">
                    <div className="font-bold">DESGLOSE DE INGRESOS:</div>
                    <div className="flex justify-between pl-2">
                      <span>EFECTIVO:</span>
                      <span>S/. {(summaryData.ingresos?.efectivo || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>TARJETA (POS):</span>
                      <span>S/. {(summaryData.ingresos?.tarjeta || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>YAPE:</span>
                      <span>S/. {(summaryData.ingresos?.yape || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>PLIN:</span>
                      <span>S/. {(summaryData.ingresos?.plin || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>IZIPAY:</span>
                      <span>S/. {(summaryData.ingresos?.izipay || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>NIUBIZ:</span>
                      <span>S/. {(summaryData.ingresos?.niubiz || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>MANUALES:</span>
                      <span>S/. {(summaryData.ingresos?.manual || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center tracking-tight text-slate-400">--------------------------------</div>

                  <div className="flex justify-between font-bold">
                    <span>TOTAL VENTAS:</span>
                    <span>S/. {getVentasTotal(summaryData).toFixed(2)}</span>
                  </div>

                  <div className="text-center tracking-tight text-slate-400">--------------------------------</div>

                  <div className="space-y-0.5">
                    <div className="font-bold">RESUMEN EFECTIVO NETO:</div>
                    <div className="flex justify-between pl-2">
                      <span>INGRESO TOTAL:</span>
                      <span>S/. {((summaryData.ingresos?.efectivo || 0) + (summaryData.ingresos?.manual || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>EGRESO TOTAL:</span>
                      <span>S/. {(summaryData.egresos || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pl-2 font-bold">
                      <span>NETO EN CAJA:</span>
                      <span>S/. {(summaryData.totalCaja || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center tracking-tight text-slate-400">--------------------------------</div>
                  <div className="text-center text-[11px] font-bold">NO POSEE VALIDEZ FISCAL.</div>
                  <div className="text-center font-bold tracking-tight text-slate-400">================================</div>
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
