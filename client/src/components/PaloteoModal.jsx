import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export function PaloteoModal({ isOpen, onClose, arqueoId }) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [paloteoData, setPaloteoData] = useState(null);

  useEffect(() => {
    if (isOpen && arqueoId) {
      setLoading(true);
      setPaloteoData(null);
      fetch(`/api/cashier/arqueo/${arqueoId}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setPaloteoData(data);
          } else {
            showToast('Error al obtener los detalles del paloteo.', 'error');
            onClose();
          }
        })
        .catch(() => {
          showToast('Error de conexión al obtener los detalles.', 'error');
          onClose();
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, arqueoId]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div className="relative transform overflow-hidden rounded-lg bg-white p-8 text-center shadow-lg transition-all border border-slate-200 w-full max-w-sm font-sans">
            <div className="border-3 border-slate-200 border-t-slate-800 rounded-full w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium">Cargando Paloteo de Ventas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!paloteoData) return null;

  // Aggregate quantities
  const productCounts = {};
  if (paloteoData.ventas) {
    paloteoData.ventas.forEach((v) => {
      if (v.items) {
        v.items.forEach((item) => {
          productCounts[item.descripcion] = (productCounts[item.descripcion] || 0) + item.cantidad;
        });
      }
    });
  }

  const countsArray = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-lg transition-all border border-slate-200 w-full max-w-md font-sans">
          
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center text-slate-900">
            <div>
              <h3 className="text-base font-bold text-slate-900">Resumen de Ventas / Paloteo</h3>
              <p className="text-[11px] text-slate-400">Turno de Arqueo N° {arqueoId} • Conteo de unidades</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="max-h-[350px] overflow-y-auto pr-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center w-24">Cantidad Vendida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {countsArray.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400 font-medium">
                        No hay ventas registradas en este turno.
                      </td>
                    </tr>
                  ) : (
                    countsArray.map(([name, count]) => (
                      <tr key={name} className="hover:bg-slate-50/50">
                        <td className="py-2.5 text-slate-700 font-medium">{name}</td>
                        <td className="py-2.5 text-center font-mono font-bold text-slate-900 text-sm bg-slate-50/60 rounded-md">
                          {count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total units footer */}
            {countsArray.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-semibold">
                <span>Total de Unidades Vendidas:</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {countsArray.reduce((acc, c) => acc + c[1], 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
