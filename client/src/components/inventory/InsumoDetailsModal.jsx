import React, { useEffect, useState } from 'react';
import { X, Package, Coins, MapPin, UtensilsCrossed } from 'lucide-react';
import { getActiveRestaurant } from '../../utils/tenant';

export const InsumoDetailsModal = ({
  isOpen,
  insumo,
  onClose,
}) => {
  const [platos, setPlatos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !insumo) return;

    const fetchPlatos = async () => {
      setLoading(true);
      try {
        const tenantId = getActiveRestaurant()?.id || 1;
        const res = await fetch(`/api/insumos/${insumo.id}/platos`, {
          headers: { 'x-restaurante-id': String(tenantId) }
        });
        if (res.ok) {
          const data = await res.json();
          setPlatos(Array.isArray(data) ? data : []);
        } else {
          setPlatos([]);
        }
      } catch (e) {
        console.error('Error al cargar platos asociados al insumo:', e);
        setPlatos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlatos();
  }, [isOpen, insumo]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !insumo) return null;

  // Determinar estado y badge visual
  const stockVal = Number(insumo.stock !== undefined ? insumo.stock : insumo.cantidad || 0);
  const minStock = Number(insumo.stockMinimo !== undefined ? insumo.stockMinimo : insumo.stockCriticoMin || 0);
  const hasAlert = Boolean(insumo.notificarAlerta !== undefined ? insumo.notificarAlerta : insumo.alertaStockCritico);
  const rawEstado = insumo.estado;

  let estadoLabel = 'Bueno';
  let badgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';

  if (rawEstado === 'Vencido') {
    estadoLabel = 'Vencido';
    badgeStyle = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
  } else if (stockVal === 0 || rawEstado === 'Sin Stock') {
    estadoLabel = 'Sin Stock';
    badgeStyle = 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
  } else if ((hasAlert && stockVal <= minStock) || rawEstado === 'Bajo Stock') {
    estadoLabel = 'Bajo Stock';
    badgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  }

  const costVal = Number(insumo.precioCompra !== undefined ? insumo.precioCompra : insumo.costoUnitario || 0);
  const unidadVal = insumo.unidadMedida || insumo.unidad || 'kg';
  const almacenVal = insumo.almacen || 'Congelador';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insumo-details-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                id="insumo-details-title"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white"
              >
                {insumo.nombre}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${badgeStyle}`}>
                {estadoLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Detalles de inventario y uso en platos del menú
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Metric Chips */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 pb-2">
          {/* Stock */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-400 font-medium">Stock</span>
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {stockVal} {unidadVal}
              </span>
            </div>
          </div>

          {/* Costo Unit. */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-[#F26522] shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-400 font-medium">Costo Unit.</span>
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                S/. {costVal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Almacén */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] text-slate-400 font-medium">Almacén</span>
              <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {almacenVal}
              </span>
            </div>
          </div>
        </div>

        {/* Section: PLATOS QUE USAN ESTE INSUMO */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-wider uppercase">
              PLATOS QUE USAN ESTE INSUMO
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/50 text-[#F26522]">
              {platos.length} {platos.length === 1 ? 'plato' : 'platos'}
            </span>
          </div>

          {/* Platos List */}
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Cargando platos asociados...
            </div>
          ) : platos.length > 0 ? (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
              {platos.map((plato) => (
                <div key={plato.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {plato.imagen ? (
                      <img
                        src={plato.imagen}
                        alt={plato.nombre}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {plato.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {plato.categoria} · {insumo.nombre}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {plato.cantidad} {unidadVal}
                    </span>
                    <span className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      S/. {Number(plato.costo || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center space-y-1.5">
              <UtensilsCrossed className="w-6 h-6 mx-auto text-slate-400 opacity-60" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Sin platos asignados
              </p>
              <p className="text-[11px] text-slate-400">
                Este insumo aún no ha sido asignado a ningún plato en el recetario o escandallo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsumoDetailsModal;
