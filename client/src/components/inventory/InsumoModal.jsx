import React, { useEffect, useState, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import ToggleSwitch from '../ui/ToggleSwitch';
import { areNamesMatching } from '../../utils/textMatching';

const ALMACENES = [
  'Congelador',
  'Congelador 2',
  'Alacena',
  'Refrigerador',
];

const UNIDADES = ['kg', 'L', 'und', 'g'];

export const InsumoModal = ({
  isOpen,
  mode = 'create',
  initialInsumo,
  existingInsumos = [],
  onClose,
  onSave,
}) => {
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('kg');
  const [almacen, setAlmacen] = useState('Congelador');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [alertaStockCritico, setAlertaStockCritico] = useState(false);
  const [stockCriticoMin, setStockCriticoMin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialInsumo) {
      setNombre(initialInsumo.nombre || '');
      setCantidad(
        initialInsumo.cantidad !== undefined
          ? String(initialInsumo.cantidad)
          : initialInsumo.stock !== undefined
          ? String(initialInsumo.stock)
          : ''
      );
      setUnidad(initialInsumo.unidad || initialInsumo.unidadMedida || 'kg');
      setAlmacen(initialInsumo.almacen || 'Congelador');
      setCostoUnitario(
        initialInsumo.costoUnitario !== undefined
          ? Number(initialInsumo.costoUnitario || 0).toFixed(2)
          : initialInsumo.precioCompra !== undefined
          ? Number(initialInsumo.precioCompra || 0).toFixed(2)
          : ''
      );
      const alertOn = Boolean(
        initialInsumo.alertaStockCritico !== undefined
          ? initialInsumo.alertaStockCritico
          : initialInsumo.notificarAlerta
      );
      setAlertaStockCritico(alertOn);
      const critVal =
        initialInsumo.stockCriticoMin !== undefined
          ? initialInsumo.stockCriticoMin
          : initialInsumo.stockMinimo;
      setStockCriticoMin(
        alertOn && critVal !== undefined && critVal !== null
          ? String(critVal)
          : ''
      );
    } else {
      setNombre('');
      setCantidad('');
      setUnidad('kg');
      setAlmacen('Congelador');
      setCostoUnitario('');
      setAlertaStockCritico(false);
      setStockCriticoMin('');
    }
    setError('');
  }, [isOpen, mode, initialInsumo]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Detección en vivo de coincidencia palabra por palabra
  const existingMatch = useMemo(() => {
    if (!nombre.trim() || mode === 'edit') return null;
    return existingInsumos.find((item) => {
      if (initialInsumo && item.id === initialInsumo.id) return false;
      return areNamesMatching(nombre, item.nombre);
    });
  }, [nombre, existingInsumos, mode, initialInsumo]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = nombre.trim();
    if (!trimmed) {
      setError('Ingresa el nombre del insumo.');
      return;
    }

    const parsedQty = cantidad.trim() === '' ? 0 : Number(cantidad);
    if (Number.isNaN(parsedQty) || parsedQty < 0) {
      setError('La cantidad / stock debe ser mayor o igual a 0.');
      return;
    }

    const parsedCost = costoUnitario.trim() === '' ? 0 : Number(costoUnitario);
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      setError('El costo unitario debe ser mayor o igual a 0.');
      return;
    }

    let parsedCritico = 0;
    if (alertaStockCritico) {
      if (stockCriticoMin.trim() === '') {
        setError('Ingresa el número mínimo para la alerta de stock crítico.');
        return;
      }
      const critVal = Number(stockCriticoMin);
      if (Number.isNaN(critVal) || critVal < 0) {
        setError('El stock crítico debe ser mayor o igual a 0.');
        return;
      }
      parsedCritico = Number(critVal.toFixed(2));
    }

    let nextEstado = 'Bueno';
    if (mode === 'edit' && initialInsumo?.estado === 'Vencido' && parsedQty > 0) {
      nextEstado = 'Vencido';
    } else if (parsedQty === 0) {
      nextEstado = 'Sin Stock';
    } else if (
      alertaStockCritico &&
      parsedCritico !== undefined &&
      parsedQty <= parsedCritico
    ) {
      nextEstado = 'Bajo Stock';
    }

    onSave({
      id: existingMatch ? existingMatch.id : initialInsumo?.id,
      nombre: trimmed,
      cantidad: parsedQty,
      stock: parsedQty,
      unidad,
      unidadMedida: unidad,
      almacen,
      costoUnitario: Number(parsedCost.toFixed(2)),
      precioCompra: Number(parsedCost.toFixed(2)),
      alertaStockCritico,
      notificarAlerta: alertaStockCritico,
      stockCriticoMin: alertaStockCritico ? parsedCritico : null,
      stockMinimo: alertaStockCritico ? parsedCritico : 0,
      estado: nextEstado,
      isExistingMatch: Boolean(existingMatch),
      matchedInsumo: existingMatch,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insumo-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Mobile bottom-sheet handle */}
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-3.5 pb-3 sm:py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3
              id="insumo-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
            >
              {mode === 'create'
                ? existingMatch
                  ? 'Actualizar Insumo Existente'
                  : 'Nuevo Insumo'
                : 'Editar Insumo'}
            </h3>
            {existingMatch && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Coincide con &quot;{existingMatch.nombre}&quot; (se tomará como edición).
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre del Insumo * */}
          <div>
            <label
              htmlFor="insumo-nombre"
              className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Nombre del Insumo <span className="text-slate-500">*</span>
            </label>
            <input
              id="insumo-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Carne de Res (Lomo), Harina, Leche..."
              autoFocus
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-100/70 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522] ${
                existingMatch
                  ? 'border-amber-400 dark:border-amber-500'
                  : 'border-slate-200/80 dark:border-slate-700'
              }`}
            />
            {existingMatch && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                💡 Este ingrediente ya existe en tu inventario. Al guardar, se actualizará su stock y datos en lugar de duplicarse.
              </p>
            )}
          </div>

          {/* Cantidad / Stock *  |  Unidad de Medida */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="insumo-cantidad"
                className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                Cantidad / Stock <span className="text-slate-500">*</span>
              </label>
              <input
                id="insumo-cantidad"
                type="number"
                min="0"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 tabular-nums focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522]"
              />
            </div>

            <div>
              <label
                htmlFor="insumo-unidad"
                className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                Unidad de Medida
              </label>
              <select
                id="insumo-unidad"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522]"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Almacén *  |  Costo Unitario (S/.) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="insumo-almacen"
                className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                Almacén <span className="text-slate-500">*</span>
              </label>
              <select
                id="insumo-almacen"
                value={almacen}
                onChange={(e) => setAlmacen(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522]"
              >
                {ALMACENES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="insumo-costo"
                className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                Costo Unitario (S/.)
              </label>
              <input
                id="insumo-costo"
                type="number"
                min="0"
                step="0.01"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 tabular-nums focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522]"
              />
            </div>
          </div>

          {/* Activar alerta por stock crítico con ToggleSwitch oficial */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Activar alerta por stock crítico
              </span>
              <ToggleSwitch
                checked={alertaStockCritico}
                onChange={() => setAlertaStockCritico((prev) => !prev)}
                ariaLabel="Activar alerta por stock crítico"
              />
            </div>

            {alertaStockCritico && (
              <div className="pt-1 animate-fade-in">
                <label
                  htmlFor="insumo-stock-critico"
                  className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1"
                >
                  Cantidad mínima de stock crítico ({unidad})
                </label>
                <input
                  id="insumo-stock-critico"
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockCriticoMin}
                  onChange={(e) => setStockCriticoMin(e.target.value)}
                  placeholder="Ej. 10 o 5.50"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#F26522]/25 focus:border-[#F26522]"
                />
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold rounded-full bg-[#F26522] hover:bg-[#DC5616] text-white shadow-[0_6px_14px_-3px_rgba(242,101,34,0.5)] transition-colors cursor-pointer"
            >
              {mode === 'create'
                ? existingMatch
                  ? 'Actualizar Insumo'
                  : 'Guardar Insumo'
                : 'Actualizar Insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InsumoModal;
