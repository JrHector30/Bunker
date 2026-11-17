import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  Check,
  Percent,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RecipeCostModal({ dish, insumos = [], onClose, onSaveRecipe }) {
  const navigate = useNavigate();
  const [recipeItems, setRecipeItems] = useState([]);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [addQty, setAddQty] = useState('');

  useEffect(() => {
    if (dish) {
      if (Array.isArray(dish.receta)) {
        setRecipeItems(
          dish.receta.map((item) => ({
            insumoId: item.insumoId || item.insumo?.id || item.id,
            insumo: item.insumo || insumos.find((i) => i.id === (item.insumoId || item.id)),
            cantidad: Number(item.cantidad) || 1,
          }))
        );
      } else {
        setRecipeItems([]);
      }
    }
  }, [dish, insumos]);

  const salePrice = Number(dish?.precioVenta || dish?.precio) || 0;

  const enrichedItems = useMemo(() => {
    return recipeItems.map((item) => {
      const insu = item.insumo || insumos.find((i) => String(i.id) === String(item.insumoId));
      const unitCost = Number(insu?.precioCompra) || 0;
      const qty = Number(item.cantidad) || 0;
      const subtotal = unitCost * qty;
      return {
        ...item,
        insumo: insu,
        unitCost,
        subtotal,
      };
    });
  }, [recipeItems, insumos]);

  const totalCost = useMemo(() => {
    return enrichedItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [enrichedItems]);

  const costRatio = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;
  const marginSoles = Math.max(0, salePrice - totalCost);
  const marginPct = salePrice > 0 ? (marginSoles / salePrice) * 100 : 0;

  if (!dish) return null;

  const handleAddItem = () => {
    if (!selectedInsumoId) return;
    const qty = parseFloat(addQty) || 1;
    const insu = insumos.find((i) => String(i.id) === String(selectedInsumoId));

    const existingIndex = recipeItems.findIndex(
      (item) => String(item.insumoId) === String(selectedInsumoId)
    );

    if (existingIndex >= 0) {
      setRecipeItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, cantidad: (Number(item.cantidad) || 0) + qty }
            : item
        )
      );
    } else {
      setRecipeItems((prev) => [
        ...prev,
        {
          insumoId: selectedInsumoId,
          insumo: insu,
          cantidad: qty,
        },
      ]);
    }

    setSelectedInsumoId('');
    setAddQty('');
  };

  const handleUpdateQty = (index, value) => {
    setRecipeItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, cantidad: value } : item))
    );
  };

  const handleRemoveItem = (index) => {
    setRecipeItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const formatted = recipeItems.map((item) => ({
      insumoId: item.insumoId,
      cantidad: parseFloat(item.cantidad) || 0,
    }));
    onSaveRecipe(dish.id, formatted, totalCost);
  };

  const handleGoToFullRecetario = () => {
    onClose();
    navigate(`/admin/inventory?tab=recetarios&platoId=${dish.id}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recipe-cost-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#F26522] flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="recipe-cost-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white truncate"
              >
                Costeo de Receta
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {dish.nombre} · Venta: S/. {salePrice.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen KPIs 2x2 */}
        <div className="grid grid-cols-2 gap-2.5 p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10.5px] font-semibold text-slate-400 block uppercase tracking-wider">
              Costo de Producción
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                S/. {totalCost.toFixed(2)}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {costRatio.toFixed(1)}% del precio
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
            <span className="text-[10.5px] font-semibold text-slate-400 block uppercase tracking-wider">
              Margen Bruto
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                S/. {marginSoles.toFixed(2)}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {marginPct.toFixed(1)}% margen
            </span>
          </div>
        </div>

        {/* Selector Rápido de Insumo */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-2">
            Añadir Insumo a la Receta
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedInsumoId}
              onChange={(e) => setSelectedInsumoId(e.target.value)}
              className="flex-1 min-h-[42px] px-3 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#F26522]/30"
            >
              <option value="">Seleccionar insumo...</option>
              {insumos.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} ({i.unidadMedida || 'und'} - S/. {Number(i.precioCompra || 0).toFixed(2)})
                </option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Cant."
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              className="w-20 min-h-[42px] px-3 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-center focus:outline-none focus:ring-2 focus:ring-[#F26522]/30"
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedInsumoId}
              className="min-h-[42px] px-3.5 rounded-2xl border-0 bg-[#F26522] text-white text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {/* Lista de Insumos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[160px]">
          {enrichedItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No hay insumos añadidos. Selecciona insumos arriba o ve al Recetario Completo.
            </div>
          ) : (
            enrichedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {item.insumo?.nombre || `Insumo #${item.insumoId}`}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Costo: S/. {item.unitCost.toFixed(2)} / {item.insumo?.unidadMedida || 'und'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.cantidad}
                      onChange={(e) => handleUpdateQty(index, e.target.value)}
                      className="w-16 h-8 text-center text-xs font-bold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F26522]"
                    />
                    <span className="text-[11px] font-medium text-slate-400">
                      {item.insumo?.unidadMedida || 'und'}
                    </span>
                  </div>

                  <span className="w-20 text-right text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    S/. {item.subtotal.toFixed(2)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="w-8 h-8 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleGoToFullRecetario}
            className="w-full sm:w-auto min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <span>Escandallo Avanzado</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial min-h-[40px] px-5 rounded-xl border-0 bg-[#F26522] hover:bg-[#DC5616] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Guardar Receta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecipeCostModal;
