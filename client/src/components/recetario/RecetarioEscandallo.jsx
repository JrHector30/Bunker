import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Search,
  Copy,
  PackagePlus,
  ChevronDown
} from 'lucide-react';
import CategorizedCombobox from '../CategorizedCombobox';
import SimpleCombobox from '../SimpleCombobox';
import AddIngredientModal from './AddIngredientModal';
import { useTheme } from '../../context/ThemeContext';

// Helpers de validación de unidad y entrada numérica limpia sin spinbuttons
const isIntegerUnit = (unit) => {
  if (!unit) return false;
  const u = String(unit).toLowerCase().trim();
  return u === 'und' || u === 'ud' || u === 'unidad' || u === 'unidades' || u === 'unid' || u === 'u';
};

const sanitizeNumberInput = (rawVal, isInteger = false) => {
  if (rawVal === '' || rawVal === null || rawVal === undefined) return '';
  const str = String(rawVal);
  if (isInteger) {
    return str.replace(/[^0-9]/g, '');
  }
  const cleaned = str.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
};

export const RecetarioEscandallo = ({
  products = [],
  categories = [],
  insumos = [],
  selectedPlatoId,
  setSelectedPlatoId,
  selectedPlatoObj,
  currentRecipe = [],
  setCurrentRecipe,
  onSaveRecipe,
  showToast,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  const [filterQuery, setFilterQuery] = useState('');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [portions, setPortions] = useState(1);
  const [customPvp, setCustomPvp] = useState('');

  // Platos formateados para CategorizedCombobox
  const comboboxItems = useMemo(() => {
    return products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoriaId);
      return {
        id: p.id.toString(),
        name: p.nombre,
        category: cat ? cat.nombre : 'General',
        precio: p.precio,
      };
    });
  }, [products, categories]);

  const selectedComboboxItem = useMemo(() => {
    return comboboxItems.find((item) => item.id === selectedPlatoId?.toString()) || null;
  }, [comboboxItems, selectedPlatoId]);

  const categoriesList = useMemo(() => {
    return categories.map((c) => c.nombre);
  }, [categories]);

  // Auto-seleccionar primer plato si no hay uno seleccionado
  useEffect(() => {
    if (!selectedPlatoId && products.length > 0) {
      setSelectedPlatoId(products[0].id.toString());
    }
  }, [selectedPlatoId, products, setSelectedPlatoId]);

  // Precio de venta efectivo (custom o el del plato)
  const effectivePvp = useMemo(() => {
    if (customPvp !== '' && !isNaN(parseFloat(customPvp))) {
      return parseFloat(customPvp);
    }
    return selectedPlatoObj ? parseFloat(selectedPlatoObj.precio || 0) : 0;
  }, [customPvp, selectedPlatoObj]);

  // Cálculos financieros
  const totalCost = useMemo(() => {
    return currentRecipe.reduce((sum, item) => {
      const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
      const unitCost = insu ? parseFloat(insu.precioCompra || 0) : 0;
      const qty = parseFloat(item.cantidad) || 0;
      return sum + qty * unitCost;
    }, 0);
  }, [currentRecipe, insumos]);

  const costPerPortion = portions > 0 ? totalCost / portions : totalCost;
  const grossMargin = effectivePvp - costPerPortion;
  const marginPercent = effectivePvp > 0 ? (grossMargin / effectivePvp) * 100 : 0;
  const foodCostPercent = effectivePvp > 0 ? (costPerPortion / effectivePvp) * 100 : 0;
  const suggestedPvp28 = costPerPortion > 0 ? costPerPortion / 0.28 : 0;

  // Insumo de mayor costo (Pareto dinámico)
  const topIngredientInfo = useMemo(() => {
    if (!currentRecipe || currentRecipe.length === 0) return null;
    let maxSubtotal = -1;
    let topItem = null;

    currentRecipe.forEach((item) => {
      const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
      if (!insu) return;
      const sub = (parseFloat(item.cantidad) || 0) * parseFloat(insu.precioCompra || 0);
      if (sub > maxSubtotal) {
        maxSubtotal = sub;
        topItem = { insu, subtotal: sub };
      }
    });

    if (!topItem || totalCost === 0) return null;
    const percent = (topItem.subtotal / totalCost) * 100;
    return {
      nombre: topItem.insu.nombre,
      subtotal: topItem.subtotal,
      percent: percent.toFixed(1),
    };
  }, [currentRecipe, insumos, totalCost]);

  // Totales de peso y volumen
  const totalKg = useMemo(() => {
    return currentRecipe.reduce((sum, item) => {
      const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
      if (insu && (insu.unidadMedida || '').toLowerCase() === 'kg') {
        return sum + (parseFloat(item.cantidad) || 0);
      }
      return sum;
    }, 0);
  }, [currentRecipe, insumos]);

  const totalLiters = useMemo(() => {
    return currentRecipe.reduce((sum, item) => {
      const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
      if (insu && ['l', 'lt', 'litro', 'litros'].includes((insu.unidadMedida || '').toLowerCase())) {
        return sum + (parseFloat(item.cantidad) || 0);
      }
      return sum;
    }, 0);
  }, [currentRecipe, insumos]);

  // Manejo de Insumos en la Receta
  const handleAddQuickRow = () => {
    setCurrentRecipe((prev) => [...prev, { insumoId: '', cantidad: 1, insumo: null }]);
  };

  const handleAddFromModal = (insumoItem, quantity) => {
    const existingIndex = currentRecipe.findIndex(
      (r) => parseInt(r.insumoId) === parseInt(insumoItem.id)
    );

    if (existingIndex >= 0) {
      setCurrentRecipe((prev) => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          cantidad: parseFloat(next[existingIndex].cantidad || 0) + quantity,
        };
        return next;
      });
      if (showToast) showToast(`Se sumó cantidad a ${insumoItem.nombre}`, 'info');
    } else {
      setCurrentRecipe((prev) => [
        ...prev,
        {
          insumoId: insumoItem.id,
          cantidad: quantity,
          insumo: insumoItem,
        },
      ]);
      if (showToast) showToast(`${insumoItem.nombre} añadido a la receta`, 'success');
    }
  };

  const handleUpdateIngredient = (index, field, value) => {
    setCurrentRecipe((prev) => {
      const next = [...prev];
      if (field === 'insumoId') {
        const found = insumos.find((i) => i.id === parseInt(value)) || null;
        const isInt = found && isIntegerUnit(found.unidadMedida);
        const currentQty = parseFloat(next[index].cantidad);
        const nextQty = isInt ? Math.max(1, Math.round(currentQty || 1)) : (next[index].cantidad || 1);
        next[index] = { ...next[index], insumoId: value, insumo: found, cantidad: nextQty };
        return next;
      }
      if (field === 'cantidad') {
        const insu = next[index].insumo || insumos.find((i) => i.id === parseInt(next[index].insumoId));
        const isInt = isIntegerUnit(insu?.unidadMedida);
        const sanitized = sanitizeNumberInput(value, isInt);
        next[index] = { ...next[index], cantidad: sanitized };
        return next;
      }
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleDeleteIngredient = (index) => {
    setCurrentRecipe((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDuplicateIngredient = (index) => {
    const item = currentRecipe[index];
    if (!item) return;
    setCurrentRecipe((prev) => [
      ...prev.slice(0, index + 1),
      { ...item },
      ...prev.slice(index + 1),
    ]);
  };

  // Filtrado de ingredientes en la tabla
  const filteredRecipe = useMemo(() => {
    if (!filterQuery) return currentRecipe;
    return currentRecipe.filter((item) => {
      const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
      const name = insu ? insu.nombre : '';
      return name.toLowerCase().includes(filterQuery.toLowerCase());
    });
  }, [currentRecipe, insumos, filterQuery]);

  const existingInsumoIds = useMemo(() => {
    return currentRecipe.map((i) => parseInt(i.insumoId)).filter(Boolean);
  }, [currentRecipe]);

  // Insumo options para dropdowns de fila
  const insumoOptions = useMemo(() => {
    return insumos
      .map((i) => ({
        id: i.id.toString(),
        name: `${i.nombre} (${i.unidadMedida || 'und'} · S/. ${parseFloat(i.precioCompra || 0).toFixed(2)})`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [insumos]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[330px_1fr] gap-4 sm:gap-5 items-start font-sans">
      {/* =========================================================================
          COLUMNA IZQUIERDA: FICHA DEL PLATO + MÉTRICAS DE RENTABILIDAD
         ========================================================================= */}
      <div className="space-y-4 sm:space-y-5">
        {/* Card 1: Ficha del Plato */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <h2 className="text-[15px] font-bold tracking-wide uppercase text-slate-900 dark:text-white">
              FICHA DEL PLATO
            </h2>
            <span className="text-xs font-medium text-slate-400 tabular-nums">
              {comboboxItems.length} platos
            </span>
          </div>

          {/* Selector de Plato */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              Seleccionar Plato del Menú
            </label>
            <CategorizedCombobox
              items={comboboxItems}
              selectedItem={selectedComboboxItem}
              onSelect={(item) => {
                setSelectedPlatoId(item ? item.id : '');
                setCustomPvp('');
              }}
              categoriesList={categoriesList}
            />
          </div>

          {selectedPlatoObj && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                  PVP (Soles)
                </label>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/70 dark:bg-slate-800/80 shadow-2xs">
                  <span className="text-xs mr-1 font-mono text-slate-400 dark:text-slate-500 font-bold">
                    S/.
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customPvp !== '' ? customPvp : (selectedPlatoObj ? selectedPlatoObj.precio : '')}
                    onChange={(e) => setCustomPvp(sanitizeNumberInput(e.target.value, false))}
                    className="w-full bg-transparent font-mono text-xs font-bold focus:outline-none border-0 p-0 text-slate-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                  Raciones
                </label>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50/70 dark:bg-slate-800/80 shadow-2xs">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={portions}
                    onChange={(e) => {
                      const sanitized = sanitizeNumberInput(e.target.value, true);
                      setPortions(sanitized === '' ? '' : Math.max(1, parseInt(sanitized, 10)));
                    }}
                    className="w-full bg-transparent font-mono text-xs font-bold focus:outline-none border-0 p-0 text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] ml-1 font-mono text-slate-400 dark:text-slate-500">
                    porc.
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Card 2: Métricas de Rentabilidad (1 col celular -> 2 cols tablet -> 1 col sidebar xl) */}
        {selectedPlatoObj && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 space-y-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
              <h2 className="text-[15px] font-bold tracking-wide uppercase text-slate-900 dark:text-white">
                MÉTRICAS DE RENTABILIDAD
              </h2>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                TIEMPO REAL
              </span>
            </div>

            {/* 1 col celular -> 2 cols tablet -> 1 col sidebar xl */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
              {/* KPI 1: Costo Total Producción */}
              <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Costo Total Producción
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {currentRecipe.length} insumos
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    S/. {totalCost.toFixed(2)}
                  </span>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    Por ración: S/. {costPerPortion.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* KPI 2: Margen Bruto */}
              <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Margen Bruto (Utilidad)
                  </p>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    S/. {grossMargin.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {marginPercent.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    PVP − Costo
                  </p>
                </div>
              </div>

              {/* KPI 3: Food Cost % con Gauge */}
              <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Food Cost % <span className="text-[11px] font-normal text-slate-400">(Meta: 28%)</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      foodCostPercent <= 30
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50'
                        : foodCostPercent <= 40
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/50'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/50'
                    }`}
                  >
                    {foodCostPercent <= 30
                      ? 'Margen Óptimo'
                      : foodCostPercent <= 40
                        ? 'Alerta Costo'
                        : 'Costo Crítico'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {foodCostPercent.toFixed(1)}%
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    {(foodCostPercent - 28.0).toFixed(1)}% vs meta
                  </span>
                </div>

                {/* Barra de progreso */}
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      foodCostPercent <= 30
                        ? 'bg-emerald-500'
                        : foodCostPercent <= 40
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, foodCostPercent * 2))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-500 dark:text-slate-400">
                  <span>PVP sugerido al 28%:</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                    S/. {suggestedPvp28.toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* KPI 4: Insumo de Mayor Costo (Pareto) */}
              <div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                <div className="flex items-center justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  <span>Insumo de Mayor Costo</span>
                  {topIngredientInfo && (
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                      {topIngredientInfo.percent}% del plato
                    </span>
                  )}
                </div>
                {topIngredientInfo ? (
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-bold truncate max-w-[190px] text-slate-900 dark:text-white">
                      {topIngredientInfo.nombre}
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      S/. {topIngredientInfo.subtotal.toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Sin insumos registrados
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* =========================================================================
          COLUMNA DERECHA: INSUMOS DE RECETA (Tabla Desktop + Tarjetas Móvil)
         ========================================================================= */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        {/* Header Toolbar */}
        <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="text-[15px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Insumos de Receta
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
              {currentRecipe.length} items
            </span>
          </div>

          {/* En móvil: Buscador en su propia fila completa, y botones debajo en su propia fila */}
          <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full md:w-auto">
            {/* Buscador: w-full en celular */}
            <div className="relative w-full md:w-48">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar ingredientes..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>

            {/* Botones Fila Rápida y Agregar Insumo: comparten la fila debajo en móvil */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                onClick={handleAddQuickRow}
                className="flex-1 md:flex-initial min-h-[40px] md:min-h-[34px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
                title="Añadir fila vacía para seleccionar insumo rápidamente"
              >
                <Plus size={14} />
                <span>Fila Rápida</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="flex-1 md:flex-initial min-h-[40px] md:min-h-[34px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 border-0 text-white shadow-sm cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'var(--primary, #F26522)' }}
                title="Abrir catálogo completo de bodega"
              >
                <PackagePlus size={15} />
                <span>Agregar Insumo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido: Vacío / Tabla Desktop / Tarjetas Móvil */}
        <div className="flex-1 overflow-y-auto">
          {!selectedPlatoId ? (
            <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
              Selecciona un plato en el panel izquierdo para cargar o editar su receta.
            </div>
          ) : filteredRecipe.length === 0 ? (
            <div className="py-16 text-center text-xs space-y-3 text-slate-400 dark:text-slate-500">
              <p>Este plato aún no tiene insumos asignados en el escandallo.</p>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border-0 text-white active:scale-95"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <Plus size={13} />
                <span>Añadir primer insumo desde bodega</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tabla Desktop (hidden md:block) - con min-h y padding inferior para visibilidad completa de dropdowns hacia abajo */}
              <div className="hidden md:block overflow-x-auto min-h-[380px] pb-36">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>
                    <tr className="border-b border-black/10 text-white text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>
                      <th className="py-2.5 px-3 text-center w-8" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>#</th>
                      <th className="py-2.5 px-3 min-w-[280px]" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Insumo / Materia Prima</th>
                      <th className="py-2.5 px-2 text-center w-16" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Unidad</th>
                      <th className="py-2.5 px-3 text-right w-24" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Costo Base (S/.)</th>
                      <th className="py-2.5 px-3 text-right w-32" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Cant. a Descontar</th>
                      <th className="py-2.5 px-3 text-right w-24" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Subtotal (S/.)</th>
                      <th className="py-2.5 px-3 text-center w-28" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>% Incidencia</th>
                      <th className="py-2.5 px-2 text-center w-16" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredRecipe.map((item, index) => {
                      const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
                      const unitCost = insu ? parseFloat(insu.precioCompra || 0) : 0;
                      const qty = parseFloat(item.cantidad) || 0;
                      const subtotal = qty * unitCost;
                      const incidence = totalCost > 0 ? (subtotal / totalCost) * 100 : 0;

                      return (
                        <tr
                          key={index}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${!insu ? 'relative z-20' : ''}`}
                        >
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3">
                            {insu ? (
                              <div>
                                <div className="font-semibold text-xs text-slate-900 dark:text-white">
                                  {insu.nombre}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {insu.categoria || 'Insumo'}
                                </div>
                              </div>
                            ) : (
                              <div className="w-72 max-w-full">
                                <SimpleCombobox
                                  items={insumoOptions}
                                  selectedItem={insumoOptions.find((o) => o.id === item.insumoId?.toString()) || null}
                                  onSelect={(opt) => handleUpdateIngredient(index, 'insumoId', opt ? opt.id : '')}
                                  forceDown={true}
                                  placeholder="Seleccionar insumo..."
                                />
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                            {insu ? insu.unidadMedida || 'und' : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                            {insu ? `S/. ${unitCost.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {(() => {
                              const isInt = isIntegerUnit(insu?.unidadMedida);
                              return (
                                <div className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                  <input
                                    type="text"
                                    inputMode={isInt ? "numeric" : "decimal"}
                                    value={item.cantidad ?? ''}
                                    onChange={(e) => handleUpdateIngredient(index, 'cantidad', e.target.value)}
                                    className="w-16 text-right font-mono text-xs font-bold bg-transparent focus:outline-none border-0 p-0 text-slate-900 dark:text-white"
                                    placeholder={isInt ? "1" : "0.00"}
                                  />
                                  <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 select-none">
                                    {insu ? insu.unidadMedida : ''}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                            S/. {subtotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                <div
                                  className="h-full rounded-full transition-all duration-200"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, incidence))}%`,
                                    backgroundColor: 'var(--primary)',
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono font-semibold w-8 text-right tabular-nums text-slate-500 dark:text-slate-400">
                                {incidence.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDuplicateIngredient(index)}
                                className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                                title="Duplicar ingrediente"
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteIngredient(index)}
                                className="w-7 h-7 rounded-full border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                                title="Eliminar insumo de la receta"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista Tarjetas Celular (md:hidden) */}
              <div className="md:hidden p-3.5 space-y-3">
                {filteredRecipe.map((item, idx) => {
                  const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
                  const unitCost = insu ? parseFloat(insu.precioCompra || 0) : 0;
                  const qty = parseFloat(item.cantidad) || 0;
                  const subtotal = qty * unitCost;
                  const pct = totalCost > 0 ? (subtotal / totalCost) * 100 : 0;

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                            {insu ? (
                              <h3 className="w-full text-sm font-bold text-slate-900 dark:text-white truncate">
                                {insu.nombre}
                              </h3>
                            ) : (
                              <div className="w-full">
                                <SimpleCombobox
                                  items={insumoOptions}
                                  selectedItem={insumoOptions.find((o) => o.id === item.insumoId?.toString()) || null}
                                  onSelect={(opt) => handleUpdateIngredient(idx, 'insumoId', opt ? opt.id : '')}
                                  forceDown={true}
                                  placeholder="Seleccionar insumo..."
                                />
                              </div>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                className="h-full rounded-full bg-[#F26522]"
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                              {pct.toFixed(1)}% incidencia
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Subtotal</span>
                          <span className="text-sm font-bold tabular-nums font-mono text-slate-900 dark:text-white">
                            S/. {subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Inputs de Cantidad y Costo Unitario con Labels */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Cant. a descontar
                          </label>
                          <div className="flex items-center justify-between px-3.5 min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
                            {(() => {
                              const isInt = isIntegerUnit(insu?.unidadMedida);
                              return (
                                <input
                                  type="text"
                                  inputMode={isInt ? "numeric" : "decimal"}
                                  value={item.cantidad ?? ''}
                                  onChange={(e) => handleUpdateIngredient(idx, 'cantidad', e.target.value)}
                                  className="w-full bg-transparent font-bold tabular-nums text-sm text-slate-900 dark:text-white focus:outline-none"
                                  placeholder={isInt ? "1" : "0.00"}
                                />
                              );
                            })()}
                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0 select-none">
                              <span>{insu ? insu.unidadMedida : 'und'}</span>
                              <ChevronDown size={14} className="text-slate-400" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Costo Base (S/.)
                          </label>
                          <div className="flex items-center px-3.5 min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
                            <span className="text-slate-400 mr-2 text-xs font-medium select-none">S/.</span>
                            <span className="w-full bg-transparent font-bold tabular-nums text-sm text-slate-900 dark:text-white">
                              {unitCost % 1 === 0 ? unitCost.toFixed(0) : unitCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de Acción Estilo SuperAdmin */}
                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateIngredient(idx)}
                          className="min-h-[38px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 active:scale-95 transition-all shadow-xs cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" /> <span>Duplicar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteIngredient(idx)}
                          className="min-h-[38px] px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 text-xs font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" /> <span>Quitar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Table Footer Resumen */}
        {filteredRecipe.length > 0 && (
          <div className="p-3 sm:px-4 sm:h-9 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs bg-slate-50/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 shrink-0">
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <span className="size-2 rounded-full bg-emerald-500 inline-block"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Escandallo Balanceado</span>
              <span>·</span>
              <span>
                Total Insumos: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{currentRecipe.length}</strong>
              </span>
              {totalKg > 0 && (
                <>
                  <span>·</span>
                  <span>
                    Sólidos: <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">{(totalKg * 1000).toFixed(0)} g</strong>
                  </span>
                </>
              )}
              {totalLiters > 0 && (
                <>
                  <span>·</span>
                  <span>
                    Líquidos: <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">{(totalLiters * 1000).toFixed(0)} ml</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 justify-between sm:justify-end">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Costo Total Insumos:
              </span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                S/. {totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Modal de Catálogo de Insumos */}
      <AddIngredientModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        insumos={insumos}
        onAddIngredient={handleAddFromModal}
        existingInsumoIds={existingInsumoIds}
      />
    </div>
  );
};

export default RecetarioEscandallo;
