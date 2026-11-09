import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Search,
  Copy,
  PackagePlus
} from 'lucide-react';
import CategorizedCombobox from '../CategorizedCombobox';
import SimpleCombobox from '../SimpleCombobox';
import AddIngredientModal from './AddIngredientModal';
import { useTheme } from '../../context/ThemeContext';

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
    setCurrentRecipe((prev) => [...prev, { insumoId: '', cantidad: 0.1, insumo: null }]);
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
      next[index] = { ...next[index], [field]: value };
      if (field === 'insumoId') {
        next[index].insumo = insumos.find((i) => i.id === parseInt(value)) || null;
      }
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
    <div className={`flex flex-col lg:flex-row gap-3 items-stretch flex-1 min-h-0 overflow-hidden font-sans ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {/* =========================================================================
          PANEL IZQUIERDO: FICHA DEL PLATO & MÉTRICAS DE RENTABILIDAD (~320px)
         ========================================================================= */}
      <aside className="w-full lg:w-[320px] xl:w-[340px] shrink-0 flex flex-col justify-between space-y-2.5 overflow-y-auto pr-1">
        {/* Card 1: Ficha del Plato */}
        <div className={`rounded-xl border p-3 shadow-xs space-y-2.5 transition-colors ${isDark ? 'bg-[#0d0d12] border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/90 text-zinc-900'
          }`}>
          <div className={`flex items-center justify-between border-b pb-1.5 ${isDark ? 'border-zinc-800/60 text-zinc-400' : 'border-slate-100 text-slate-500'
            }`}>
            <h2 className="text-[10px] font-bold uppercase tracking-wider">
              Ficha del Plato
            </h2>
            <span className="text-[10px] font-semibold">
              {comboboxItems.length} platos
            </span>
          </div>

          {/* Selector de Plato */}
          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}>
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
            <div className={`grid grid-cols-2 gap-2 pt-1 border-t ${isDark ? 'border-zinc-800/50' : 'border-slate-100'
              }`}>
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}>
                  PVP (Soles)
                </label>
                <div className={`flex items-center border rounded-md px-2 py-1 shadow-2xs ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                  }`}>
                  <span className={`text-[11px] mr-1 font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}>S/.</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={customPvp !== '' ? customPvp : selectedPlatoObj.precio}
                    onChange={(e) => setCustomPvp(e.target.value)}
                    className={`w-full bg-transparent font-mono text-xs font-bold focus:outline-none border-0 p-0 shadow-none ${isDark ? 'text-white' : 'text-zinc-900'
                      }`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}>
                  Raciones
                </label>
                <div className={`flex items-center border rounded-md px-2 py-1 shadow-2xs ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                  }`}>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={portions}
                    onChange={(e) => setPortions(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-full bg-transparent font-mono text-xs font-bold focus:outline-none border-0 p-0 shadow-none ${isDark ? 'text-white' : 'text-zinc-900'
                      }`}
                  />
                  <span className={`text-[10px] ml-1 font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}>porc.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Métricas de Rentabilidad (Compacto) */}
        {selectedPlatoObj && (
          <div className={`rounded-xl border p-3 shadow-xs space-y-2 transition-colors ${isDark ? 'bg-[#0d0d12] border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/90 text-zinc-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-1.5 ${isDark ? 'border-zinc-800/60 text-zinc-400' : 'border-slate-100 text-slate-500'
              }`}>
              <h2 className="text-[10px] font-bold uppercase tracking-wider">
                Métricas de Rentabilidad
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-wider">
                Tiempo Real
              </span>
            </div>

            {/* KPI 1: Costo Total Producción */}
            <div className={`p-2 rounded-lg border flex items-center justify-between ${isDark ? 'bg-zinc-900/40 border-zinc-800/60' : 'bg-slate-50 border-slate-200/60'
              }`}>
              <div>
                <p className={`text-[11px] font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Costo Total Producción
                </p>
                <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {currentRecipe.length} insumos
                </p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  S/. {totalCost.toFixed(2)}
                </span>
                <p className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Por ración: S/. {costPerPortion.toFixed(2)}
                </p>
              </div>
            </div>

            {/* KPI 2: Margen Bruto */}
            <div className={`p-2 rounded-lg border flex items-center justify-between ${isDark ? 'bg-zinc-900/40 border-zinc-800/60' : 'bg-slate-50 border-slate-200/60'
              }`}>
              <div>
                <p className={`text-[11px] font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Margen Bruto (Utilidad)
                </p>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  S/. {grossMargin.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {marginPercent.toFixed(1)}%
                </p>
                <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  PVP − Costo
                </p>
              </div>
            </div>

            {/* KPI 3: Food Cost % con Gauge */}
            <div className={`p-2 rounded-lg border space-y-1.5 ${isDark ? 'bg-zinc-900/40 border-zinc-800/60' : 'bg-slate-50 border-slate-200/60'
              }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Food Cost % <span className={`text-[10px] font-normal ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>(Meta: 28%)</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${foodCostPercent <= 30
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
                <span className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {foodCostPercent.toFixed(1)}%
                </span>
                <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {(foodCostPercent - 28.0).toFixed(1)}% vs meta
                </span>
              </div>

              {/* Barra de progreso */}
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                <div
                  className={`h-full transition-all duration-300 rounded-full ${foodCostPercent <= 30
                    ? 'bg-emerald-500'
                    : foodCostPercent <= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                    }`}
                  style={{ width: `${Math.min(100, Math.max(0, foodCostPercent * 2))}%` }}
                />
              </div>

              <div className={`flex items-center justify-between text-[10px] pt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                <span>PVP sugerido al 28%:</span>
                <strong className={`font-mono ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  S/. {suggestedPvp28.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* KPI 4: Insumo de Mayor Costo (Pareto) */}
            <div className={`p-2 rounded-lg border ${isDark ? 'bg-zinc-900/40 border-zinc-800/60' : 'bg-slate-50 border-slate-200/60'
              }`}>
              <div className={`flex items-center justify-between text-[11px] font-semibold mb-0.5 ${isDark ? 'text-zinc-300' : 'text-slate-700'
                }`}>
                <span>Insumo de Mayor Costo</span>
                {topIngredientInfo && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                    {topIngredientInfo.percent}% del plato
                  </span>
                )}
              </div>
              {topIngredientInfo ? (
                <div className="flex items-baseline justify-between">
                  <p className={`text-xs font-bold truncate max-w-[190px] ${isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                    {topIngredientInfo.nombre}
                  </p>
                  <p className={`text-[11px] font-mono font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-800'
                    }`}>
                    S/. {topIngredientInfo.subtotal.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  Sin insumos registrados
                </p>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* =========================================================================
          PANEL DERECHO: GRILLA DE ESCANDALLO / INSUMOS DE RECETA (~68%)
         ========================================================================= */}
      <section className={`flex-1 min-w-0 flex flex-col rounded-xl border shadow-xs overflow-hidden transition-colors ${isDark ? 'bg-[#0d0d12] border-zinc-800/80 text-zinc-100' : 'bg-white border-slate-200/90 text-zinc-900'
        }`}>
        {/* Header Toolbar */}
        <div className={`h-10 px-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${isDark ? 'bg-[#0d0d12] border-zinc-800/80' : 'bg-white border-slate-200/80'
          }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h2 className={`translate-y-2 text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-slate-700'
                }`}>
                Insumos de Receta
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                {currentRecipe.length} items
              </span>
            </div>

            {/* Buscador de ingredientes dentro de la receta */}
            <div className="relative hidden md:block w-44">
              <Search className={`size-3 absolute left-2 top-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Filtrar ingredientes..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className={`w-full h-6 pl-6 pr-2 border rounded-md text-[11px] focus:outline-none transition-colors ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-zinc-900 placeholder-slate-400'
                  }`}
              />
            </div>
          </div>

          {/* Botones de Acción Estilo Pill de /superadmin */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddQuickRow}
              className={`px-3 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              title="Añadir fila vacía para seleccionar insumo rápidamente"
            >
              <Plus size={12} />
              <span>Fila Rápida</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-3.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 border-0 text-white"
              style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
              title="Abrir catálogo completo de bodega"
            >
              <PackagePlus size={13} />
              <span>Agregar Insumo</span>
            </button>
          </div>
        </div>

        {/* Tabla de Insumos */}
        <div className="flex-1 overflow-y-auto">
          {!selectedPlatoId ? (
            <div className={`py-16 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              Selecciona un plato en el panel izquierdo para cargar o editar su receta.
            </div>
          ) : filteredRecipe.length === 0 ? (
            <div className={`py-16 text-center text-xs space-y-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              <p>Este plato aún no tiene insumos asignados en el escandallo.</p>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border-0 text-white"
                style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
              >
                <Plus size={13} />
                <span>Añadir primer insumo desde bodega</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>
                <tr className="border-b border-black/10 text-white text-[10px] uppercase font-bold tracking-wider" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>
                  <th className="py-2 px-3 text-center w-8" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>#</th>
                  <th className="py-2 px-3" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Insumo / Materia Prima</th>
                  <th className="py-2 px-2 text-center w-16" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Unidad</th>
                  <th className="py-2 px-3 text-right w-24" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Costo Base (S/.)</th>
                  <th className="py-2 px-3 text-right w-32" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Cant. a Descontar</th>
                  <th className="py-2 px-3 text-right w-24" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Subtotal (S/.)</th>
                  <th className="py-2 px-3 text-center w-28" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>% Incidencia</th>
                  <th className="py-2 px-2 text-center w-16" style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}>Acciones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-800/50' : 'divide-slate-100'}`}>
                {filteredRecipe.map((item, index) => {
                  const insu = item.insumo || insumos.find((i) => i.id === parseInt(item.insumoId));
                  const unitCost = insu ? parseFloat(insu.precioCompra || 0) : 0;
                  const qty = parseFloat(item.cantidad) || 0;
                  const subtotal = qty * unitCost;
                  const incidence = totalCost > 0 ? (subtotal / totalCost) * 100 : 0;

                  return (
                    <tr
                      key={index}
                      className={`transition-colors ${isDark ? 'hover:bg-zinc-900/30' : 'hover:bg-slate-50/80'
                        }`}
                    >
                      {/* 1. Indice */}
                      <td className={`py-1.5 px-3 text-center font-mono text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-400'
                        }`}>
                        {index + 1}
                      </td>

                      {/* 2. Insumo Selector / Name */}
                      <td className="py-1.5 px-3">
                        {insu ? (
                          <div>
                            <div className={`font-semibold text-xs ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                              {insu.nombre}
                            </div>
                            <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                              {insu.categoria || 'Insumo'}
                            </div>
                          </div>
                        ) : (
                          <div className="w-52">
                            <SimpleCombobox
                              items={insumoOptions}
                              selectedItem={insumoOptions.find((o) => o.id === item.insumoId?.toString()) || null}
                              onSelect={(opt) => handleUpdateIngredient(index, 'insumoId', opt ? opt.id : '')}
                              placeholder="Seleccionar insumo..."
                            />
                          </div>
                        )}
                      </td>

                      {/* 3. Unidad */}
                      <td className={`py-1.5 px-2 text-center font-mono text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}>
                        {insu ? insu.unidadMedida || 'und' : '-'}
                      </td>

                      {/* 4. Costo Base */}
                      <td className={`py-1.5 px-3 text-right font-mono text-xs ${isDark ? 'text-zinc-300' : 'text-slate-600'
                        }`}>
                        {insu ? `S/. ${unitCost.toFixed(2)}` : '-'}
                      </td>

                      {/* 5. Cantidad */}
                      <td className="py-1.5 px-3 text-right">
                        <div className={`inline-flex items-center gap-1 border rounded-md px-2 py-0.5 shadow-2xs ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'
                          }`}>
                          <input
                            type="number"
                            step="0.005"
                            min="0"
                            value={Number.isNaN(item.cantidad) ? '' : item.cantidad}
                            onChange={(e) =>
                              handleUpdateIngredient(index, 'cantidad', parseFloat(e.target.value))
                            }
                            className={`w-14 text-right font-mono text-xs font-semibold bg-transparent focus:outline-none border-0 p-0 shadow-none ${isDark ? 'text-white' : 'text-zinc-900'
                              }`}
                          />
                          <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'
                            }`}>
                            {insu ? insu.unidadMedida : ''}
                          </span>
                        </div>
                      </td>

                      {/* 6. Subtotal */}
                      <td className={`py-1.5 px-3 text-right font-mono font-bold text-xs ${isDark ? 'text-white' : 'text-zinc-900'
                        }`}>
                        S/. {subtotal.toFixed(2)}
                      </td>

                      {/* 7. Incidencia Bar */}
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-200'
                            }`}>
                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{
                                width: `${Math.min(100, Math.max(0, incidence))}%`,
                                backgroundColor: 'var(--primary)',
                              }}
                            />
                          </div>
                          <span className={`text-[10px] font-mono font-semibold w-8 text-right tabular-nums ${isDark ? 'text-zinc-400' : 'text-slate-500'
                            }`}>
                            {incidence.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* 8. Acciones */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateIngredient(index)}
                            className={`p-1 transition-colors cursor-pointer ${isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-700'
                              }`}
                            title="Duplicar ingrediente"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIngredient(index)}
                            className="p-1 text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer"
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
          )}
        </div>

        {/* Table Footer Resumen */}
        {filteredRecipe.length > 0 && (
          <div className={`h-9 px-3.5 border-t flex items-center justify-between gap-3 text-xs shrink-0 ${isDark ? 'bg-zinc-900/30 border-zinc-800/80 text-zinc-400' : 'bg-slate-50/70 border-slate-200/80 text-slate-600'
            }`}>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="size-2 rounded-full bg-emerald-500 inline-block"></span>
              <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Escandallo Balanceado</span>
              <span>·</span>
              <span>
                Total Insumos: <strong className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{currentRecipe.length}</strong>
              </span>
              {totalKg > 0 && (
                <>
                  <span>·</span>
                  <span>
                    Sólidos: <strong className={`font-mono ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{(totalKg * 1000).toFixed(0)} g</strong>
                  </span>
                </>
              )}
              {totalLiters > 0 && (
                <>
                  <span>·</span>
                  <span>
                    Líquidos: <strong className={`font-mono ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{(totalLiters * 1000).toFixed(0)} ml</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`font-bold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'
                }`}>
                Costo Total Insumos:
              </span>
              <span className={`text-xs font-bold font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
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
