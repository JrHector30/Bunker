import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { enqueueTicket } from '../utils/printer';

export function SummaryTicketModal({ isOpen, onClose, arqueoId }) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    if (isOpen && arqueoId) {
      setLoading(true);
      setSummaryData(null);
      fetch(`/api/cashier/arqueo/${arqueoId}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setSummaryData(data);
          } else {
            showToast('Error al obtener el resumen de caja.', 'error');
            onClose();
          }
        })
        .catch(() => {
          showToast('Error de conexión al obtener el resumen.', 'error');
          onClose();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, arqueoId]);

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
      await enqueueTicket(summaryData.id, 'Caja', content);
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
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ticket Display Container */}
          <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col items-center bg-slate-50">
            
            {/* The printable ticket element */}
            <div className="print-ticket bg-white text-black w-[310px] shadow-sm border border-slate-200 p-5 font-mono text-[11.5px] leading-tight select-none">
              
              <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                <div className="font-bold text-[14px]">BUNKER RESTOBAR</div>
                <div>ComandaGo ERP System</div>
                <div>Telf: +51 987 654 321</div>
                <div className="text-[10px] mt-1">
                  Impreso: {new Date().toLocaleDateString('es-PE')} {new Date().toLocaleTimeString('es-PE', { hour12: false })}
                </div>
              </div>

              {loading ? (
                <div className="text-center py-6">
                  Cargando datos del ticket...
                </div>
              ) : !summaryData ? (
                <div className="text-center py-6 text-red-500">
                  No se encontraron datos.
                </div>
              ) : (
                <>
                  <div className="mb-3 space-y-0.5">
                    <div>Turno N°: <span className="font-bold">{summaryData.id}</span></div>
                    <div>Estado: <span className="font-bold">{summaryData.estado?.toUpperCase()}</span></div>
                    <div>Inicio: {formatDate(summaryData.fechaInicio)}</div>
                    {summaryData.fechaFin && <div>Cierre: {formatDate(summaryData.fechaFin)}</div>}
                    <div>M. Inicial: S/. {(summaryData.montoInicial || 0).toFixed(2)}</div>
                  </div>

                  <div className="border-b border-dashed border-black my-2"></div>
                  
                  <div className="font-bold mb-1.5">DESGLOSE DE INGRESOS</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Efectivo:</span>
                      <span>S/. {(summaryData.ingresos?.efectivo || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tarjeta (POS):</span>
                      <span>S/. {(summaryData.ingresos?.tarjeta || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yape:</span>
                      <span>S/. {(summaryData.ingresos?.yape || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Plin:</span>
                      <span>S/. {(summaryData.ingresos?.plin || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Izipay:</span>
                      <span>S/. {(summaryData.ingresos?.izipay || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Niubiz:</span>
                      <span>S/. {(summaryData.ingresos?.niubiz || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ingresos Manuales:</span>
                      <span>S/. {(summaryData.ingresos?.manual || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-black mt-2 pt-2 flex justify-between font-bold text-[13px]">
                    <span>TOTAL VENTAS:</span>
                    <span>S/. {getVentasTotal(summaryData).toFixed(2)}</span>
                  </div>

                  <div className="border-b border-dashed border-black my-2"></div>

                  <div className="font-bold mb-1.5">RESUMEN FLUIDOS EFECTIVO</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Total Ingreso:</span>
                      <span>S/. {((summaryData.ingresos?.efectivo || 0) + (summaryData.ingresos?.manual || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Egreso:</span>
                      <span>S/. {(summaryData.egresos || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total Neto Caja:</span>
                      <span>S/. {(summaryData.totalCaja || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center mt-6 text-[9.5px] border-t border-dashed border-black pt-2">
                    <div>RESUMEN DE CAJA REGISTRADORA</div>
                    <div>Este ticket no posee validez fiscal.</div>
                    <div>¡Bunker Restobar agradece su preferencia!</div>
                  </div>
                </>
              )}
            </div>

            {/* Print Button */}
            {!loading && summaryData && (
              <button
                onClick={handlePrint}
                className="mt-4 flex items-center justify-center gap-2 py-2 px-5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
