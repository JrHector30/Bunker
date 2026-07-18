import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { networkStatus, offlineCashService } from '../offline';

export function PaloteoModal({ isOpen, onClose, arqueoId }) {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [paloteoData, setPaloteoData] = useState(null);

  useEffect(() => {
    if (isOpen && arqueoId) {
      setLoading(true);
      setPaloteoData(null);

      const loadData = async () => {
        try {
          if (networkStatus.isOffline()) {
            const data = await offlineCashService.getArqueoDetails(arqueoId);
            setPaloteoData(data);
          } else {
            const res = await fetch(`/api/cashier/arqueo/${arqueoId}`);
            if (res.ok) {
              const data = await res.json();
              setPaloteoData(data);
            } else {
              showToast('Error al obtener los detalles del paloteo.', 'error');
              onClose();
            }
          }
        } catch (err) {
          console.error('[PaloteoModal] Error cargando paloteo:', err);
          showToast('Error al obtener los detalles del paloteo.', 'error');
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
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div className="relative transform overflow-hidden rounded-lg bg-[var(--bg-surface)] p-8 text-center shadow-lg transition-all border border-[var(--glass-border)] w-full max-w-sm font-sans text-[var(--text-main)]">
            <div className="border-3 border-[var(--glass-border)] border-t-[var(--text-main)] rounded-full w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--text-muted)] font-medium">Cargando Paloteo de Ventas...</p>
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-lg bg-[var(--bg-surface)] text-left shadow-lg transition-all border border-[var(--glass-border)] w-full max-w-md font-sans text-[var(--text-main)]">
          
          {/* Header */}
          <div className="bg-[var(--bg-surface)] border-b border-[var(--glass-border)] px-6 py-4 flex justify-between items-center text-[var(--text-main)]">
            <div>
              <h3 className="text-base font-bold text-[var(--text-main)]">Resumen de Ventas / Paloteo</h3>
              <p className="text-[11px] text-[var(--text-muted)] font-sans">Turno de Arqueo N° {arqueoId} • Conteo de unidades</p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer p-1 rounded-lg hover:bg-[var(--bg-secondary)] border-none bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="max-h-[350px] overflow-y-auto pr-1">
              {countsArray.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--text-muted)] border border-dashed border-[var(--glass-border)] rounded-lg">
                  No se registraron platos vendidos en este arqueo.
                </div>
              ) : (
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-[var(--glass-border)] text-left text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                      <th className="pb-2">Producto / Plato</th>
                      <th className="pb-2 text-right">Cant. Vendida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)] text-[var(--text-main)]">
                    {countsArray.map(([name, qty]) => (
                      <tr key={name} className="hover:bg-[var(--bg-secondary)]">
                        <td className="py-2.5 font-medium">{name}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-[var(--primary)]">{qty}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[var(--bg-secondary)] px-6 py-4 flex justify-end border-t border-[var(--glass-border)] rounded-b-lg">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-lg text-xs font-bold text-white bg-[var(--primary)] hover:opacity-90 active:opacity-100 transition-colors cursor-pointer border-none"
            >
              Cerrar Paloteo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
