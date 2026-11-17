import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  Upload,
  Plus,
  Search,
  X,
  List,
  LayoutGrid,
  AlertTriangle,
  Pencil,
  Calculator,
  Copy,
  EyeOff,
  Eye,
  Trash2,
  Check,
  Minus,
  Utensils,
  TrendingUp,
  Percent,
  Tag,
  CircleDot,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SmoothDropDown } from './SmoothDropDown';
import { FilterCombobox } from './FilterCombobox';
import { DishModal } from './DishModal';
import { RecipeCostModal } from './RecipeCostModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

const PAGE_SIZE = 10;

const CATEGORY_BADGES = {
  Bebida: {
    emoji: '🍹',
    className:
      'bg-[#ECFCCB] text-[#4D7C0F] dark:bg-lime-950/60 dark:text-lime-300',
  },
  Marino: {
    emoji: '🐟',
    className:
      'bg-[#E0F2FE] text-[#0369A1] dark:bg-sky-950/60 dark:text-sky-300',
  },
  'Plato Principal': {
    emoji: '🍽️',
    className:
      'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300',
  },
  Postres: {
    emoji: '🍰',
    className:
      'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/60 dark:text-purple-300',
  },
  Sopas: {
    emoji: '🍜',
    className:
      'bg-[#FFE4E6] text-[#BE123C] dark:bg-rose-950/60 dark:text-rose-300',
  },
};

const STATUS_BADGES = {
  Activo:
    'bg-[#DCFCE7] text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-300',
  Inactivo:
    'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-400',
  'Agotado hoy':
    'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-950/60 dark:text-amber-300',
};

const ALL_CATEGORIES = [
  'Bebida',
  'Marino',
  'Plato Principal',
  'Postres',
  'Sopas',
];

function DishThumbnail({ src, alt, className }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`${className} bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400`}
        aria-label={alt}
      >
        <Utensils className="w-4 h-4" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function CheckboxButton({ checked, indeterminate = false, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`w-[20px] h-[20px] p-0 rounded-[6px] flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
        checked || indeterminate
          ? 'bg-[#F26522] border border-[#F26522] text-white'
          : 'bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-600'
      }`}
    >
      {checked && <Check className="w-3 h-3 stroke-[3]" />}
      {!checked && indeterminate && <Minus className="w-3 h-3 stroke-[3]" />}
    </button>
  );
}

export const MenuPlatosMobileView = ({
  dishes = [],
  insumos = [],
  categories = [],
  onUpdateDishes,
  onNotify = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [highCostOnly, setHighCostOnly] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCategoryValue, setBulkCategoryValue] = useState('');

  // Modales
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [dishModalMode, setDishModalMode] = useState('create');
  const [editingDish, setEditingDish] = useState(null);
  const [recipeDish, setRecipeDish] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fileInputRef = useRef(null);

  // KPIs de Rentabilidad
  const kpis = useMemo(() => {
    const total = dishes.length;
    const activos = dishes.filter((d) => d.estado === 'Activo').length;
    let sumCostPct = 0;
    let highCostCount = 0;

    for (const d of dishes) {
      const pct = d.precioVenta > 0 ? (d.costoProd / d.precioVenta) * 100 : 0;
      sumCostPct += pct;
      if (pct > 35) highCostCount += 1;
    }

    const costoPromedio = total > 0 ? sumCostPct / total : 0;
    const margenPromedio = Math.max(0, 100 - costoPromedio);

    return {
      total,
      activos,
      costoPromedio,
      margenPromedio,
      highCostCount,
    };
  }, [dishes]);

  // Lista filtrada
  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dishes.filter((d) => {
      if (q) {
        const matchName = d.nombre.toLowerCase().includes(q);
        const matchSku = (d.sku || '').toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      if (categoryFilter !== 'Todas' && d.categoria !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'Todos' && d.estado !== statusFilter) {
        return false;
      }
      if (highCostOnly) {
        const pct = d.precioVenta > 0 ? (d.costoProd / d.precioVenta) * 100 : 0;
        if (pct <= 35) return false;
      }
      return true;
    });
  }, [dishes, searchQuery, categoryFilter, statusFilter, highCostOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredDishes.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageDishes = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredDishes.slice(start, start + PAGE_SIZE);
  }, [filteredDishes, safePage]);

  const pageIds = pageDishes.map((d) => d.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id)).length;
  const allPageSelected =
    pageDishes.length > 0 && selectedOnPage === pageDishes.length;
  const somePageSelected =
    selectedOnPage > 0 && selectedOnPage < pageDishes.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('Todas');
    setStatusFilter('Todos');
    setHighCostOnly(false);
    setCurrentPage(1);
  };

  const downloadExcel = (rows, filename) => {
    const data = rows.map((d) => ({
      'Nombre del Plato': d.nombre,
      Categoría: d.categoria,
      'Precio Venta': Number(d.precioVenta.toFixed(2)),
      'Costo Prod': Number(d.costoProd.toFixed(2)),
      Estado: d.estado,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: [
        'Nombre del Plato',
        'Categoría',
        'Precio Venta',
        'Costo Prod',
        'Estado',
      ],
    });

    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 13 },
      { wch: 12 },
      { wch: 14 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Platos');
    XLSX.writeFile(workbook, filename);
  };

  const handleDownloadTemplate = () => {
    downloadExcel(dishes.slice(0, 3), 'plantilla_menu_bunker.xlsx');
    onNotify('Plantilla Excel descargada.');
  };

  const handleExportActiveDishes = () => {
    const activeDishes = dishes.filter((d) => d.estado === 'Activo');
    if (activeDishes.length === 0) {
      onNotify('No hay platos activos para exportar.');
      return;
    }
    downloadExcel(activeDishes, 'platos_activos_bunker.xlsx');
    onNotify(`${activeDishes.length} platos activos exportados a Excel.`);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onNotify(`Archivo "${file.name}" procesado correctamente.`);
    e.target.value = '';
  };

  const handleDuplicateDish = (dish) => {
    const clone = {
      ...dish,
      id: `plato-${Date.now()}`,
      sku: `${dish.sku}-CP`,
      nombre: `${dish.nombre} (Copia)`,
    };
    onUpdateDishes((prev) => [clone, ...prev]);
    setCurrentPage(1);
    onNotify(`Plato "${dish.nombre}" duplicado.`);
  };

  const handleToggleDishAvailability = (dish) => {
    const nextStatus = dish.estado === 'Activo' ? 'Agotado hoy' : 'Activo';
    onUpdateDishes((prev) =>
      prev.map((d) => (d.id === dish.id ? { ...d, estado: nextStatus } : d))
    );
    onNotify(`"${dish.nombre}" marcado como ${nextStatus}.`);
  };

  const handleCycleStatus = (dish) => {
    const order = ['Activo', 'Agotado hoy', 'Inactivo'];
    const nextStatus = order[(order.indexOf(dish.estado) + 1) % order.length];
    onUpdateDishes((prev) =>
      prev.map((d) => (d.id === dish.id ? { ...d, estado: nextStatus } : d))
    );
    onNotify(`Estado de "${dish.nombre}" cambiado a ${nextStatus}.`);
  };

  const handleSaveDish = (data) => {
    if (dishModalMode === 'create') {
      const created = {
        id: `plato-${Date.now()}`,
        ...data,
      };
      onUpdateDishes((prev) => [created, ...prev]);
      setCurrentPage(1);
      onNotify(`Plato "${created.nombre}" agregado al menú.`);
    } else if (editingDish) {
      onUpdateDishes((prev) =>
        prev.map((d) => (d.id === editingDish.id ? { ...d, ...data } : d))
      );
      onNotify(`Plato "${data.nombre}" actualizado.`);
    }
    setDishModalOpen(false);
    setEditingDish(null);
  };

  const handleSaveRecipe = (dishId, ingredients, newCost) => {
    onUpdateDishes((prev) =>
      prev.map((d) =>
        d.id === dishId
          ? {
              ...d,
              receta: ingredients,
              costoProd: newCost,
              insumosCount: ingredients.length,
            }
          : d
      )
    );
    setRecipeDish(null);
    onNotify('Receta y costeo actualizados.');
  };

  const handleBulkStatus = (status) => {
    const idSet = new Set(selectedIds);
    onUpdateDishes((prev) =>
      prev.map((d) => (idSet.has(d.id) ? { ...d, estado: status } : d))
    );
    onNotify(
      `${selectedIds.length} ${
        selectedIds.length === 1 ? 'plato actualizado' : 'platos actualizados'
      } a ${status}.`
    );
  };

  const handleBulkCategory = (cat) => {
    const idSet = new Set(selectedIds);
    onUpdateDishes((prev) =>
      prev.map((d) => (idSet.has(d.id) ? { ...d, categoria: cat } : d))
    );
    setBulkCategoryValue('');
    onNotify(`Categoría cambiada a "${cat}" para ${selectedIds.length} platos.`);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const idSet = new Set(deleteTarget.ids);
    onUpdateDishes((prev) => prev.filter((d) => !idSet.has(d.id)));
    setSelectedIds((prev) => prev.filter((id) => !idSet.has(id)));
    onNotify(
      deleteTarget.ids.length > 1
        ? `${deleteTarget.ids.length} platos eliminados.`
        : `Plato "${deleteTarget.label}" eliminado.`
    );
    setDeleteTarget(null);
  };

  const buildRowMenuItems = (dish) => [
    {
      id: 'edit',
      label: 'Editar Plato',
      icon: Pencil,
      onClick: () => {
        setDishModalMode('edit');
        setEditingDish(dish);
        setDishModalOpen(true);
      },
    },
    {
      id: 'recipe',
      label: 'Ver / Editar Receta (Costeo)',
      icon: Calculator,
      onClick: () => setRecipeDish(dish),
    },
    {
      id: 'duplicate',
      label: 'Duplicar Plato',
      icon: Copy,
      onClick: () => handleDuplicateDish(dish),
    },
    {
      id: 'toggle-status',
      label:
        dish.estado === 'Activo'
          ? 'Marcar como Agotado / Inactivo'
          : 'Activar Plato',
      icon: dish.estado === 'Activo' ? EyeOff : Eye,
      onClick: () => handleToggleDishAvailability(dish),
    },
    {
      id: 'delete',
      label: 'Eliminar Plato',
      icon: Trash2,
      danger: true,
      dividerBefore: true,
      onClick: () => setDeleteTarget({ ids: [dish.id], label: dish.nombre }),
    },
  ];

  const startItem =
    filteredDishes.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, filteredDishes.length);

  return (
    <div className="space-y-4">
      {/* Encabezado Mobile */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Menú (Platos)
            </h1>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
              {dishes.length} platos
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setDishModalMode('create');
              setEditingDish(null);
              setDishModalOpen(true);
            }}
            className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border-0 bg-[#F26522] hover:bg-[#DC5616] text-white shadow-[0_4px_14px_-3px_rgba(242,101,34,0.45)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Plato</span>
          </button>
        </div>

        {/* Acciones Excel en grid táctil */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleImportFile}
          className="hidden"
        />
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11.5px] font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Plantilla</span>
          </button>

          <button
            type="button"
            onClick={handleExportActiveDishes}
            className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11.5px] font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Activos ({kpis.activos})</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11.5px] font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Importar</span>
          </button>
        </div>
      </header>

      {/* KPIs de Rentabilidad Mobile (Grid 2x2) */}
      <section
        aria-label="Indicadores de rentabilidad del menú"
        className="grid grid-cols-2 gap-3"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Total Platos
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {kpis.total}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {kpis.activos} activos
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Utensils className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Margen Prom.
            </p>
            <p className="mt-0.5 text-xl font-bold text-[#15803D] dark:text-emerald-400 tabular-nums">
              {kpis.margenPromedio.toFixed(1)}%
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Rentabilidad
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Costo Prom.
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {kpis.costoPromedio.toFixed(1)}%
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Ideal &lt; 30%
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#F26522] flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setHighCostOnly((prev) => !prev);
            setCurrentPage(1);
          }}
          aria-pressed={highCostOnly}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-3.5 flex items-center justify-between gap-2 transition-all cursor-pointer border ${
            highCostOnly
              ? 'border-red-400 dark:border-red-500 ring-2 ring-red-500/15'
              : 'border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Costo Alto
            </p>
            <p className="mt-0.5 text-xl font-bold text-[#DC2626] dark:text-red-400 tabular-nums">
              {kpis.highCostCount}
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium truncate">
              {highCostOnly ? 'Filtro activo' : '> 35% · Filtrar'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </button>
      </section>

      {/* Contenedor Principal Mobile */}
      <section
        aria-label="Catálogo de platos"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      >
        {/* Buscador, Filtros y Vista */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar plato por nombre o SKU..."
              aria-label="Buscar plato por nombre o SKU"
              className="w-full min-h-[42px] pl-9 pr-9 py-2 text-[13px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#F26522]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-transparent border-0 p-0 hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterCombobox
              value={categoryFilter}
              defaultValue="Todas"
              icon={Tag}
              ariaLabel="Filtrar por categoría"
              onChange={(val) => {
                setCategoryFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: 'Todas', label: 'Categorías' },
                ...ALL_CATEGORIES.map((cat) => ({
                  value: cat,
                  label: cat,
                  emoji: CATEGORY_BADGES[cat]?.emoji || '🍽️',
                })),
              ]}
            />

            <FilterCombobox
              value={statusFilter}
              defaultValue="Todos"
              icon={CircleDot}
              ariaLabel="Filtrar por estado"
              onChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: 'Todos', label: 'Estados' },
                {
                  value: 'Activo',
                  label: 'Activo',
                  indicatorClass: 'bg-emerald-500',
                },
                {
                  value: 'Agotado hoy',
                  label: 'Agotado hoy',
                  indicatorClass: 'bg-amber-500',
                },
                {
                  value: 'Inactivo',
                  label: 'Inactivo',
                  indicatorClass: 'bg-slate-400',
                },
              ]}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            {(searchQuery ||
              categoryFilter !== 'Todas' ||
              statusFilter !== 'Todos' ||
              highCostOnly) ? (
              <button
                type="button"
                onClick={resetAllFilters}
                className="bg-transparent border-0 p-0 text-xs font-semibold text-[#F26522] hover:underline whitespace-nowrap cursor-pointer"
              >
                Limpiar filtros
              </button>
            ) : (
              <span className="text-xs text-slate-400 tabular-nums">
                {filteredDishes.length} resultados
              </span>
            )}

            <div
              role="group"
              aria-label="Cambiar vista"
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border-0 transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-transparent text-slate-500 dark:text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border-0 transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-transparent text-slate-500 dark:text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Fotos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra Contextual de Acciones Masivas */}
        {selectedIds.length > 0 && (
          <div className="mx-4 mb-4 p-3 rounded-xl bg-orange-50/90 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/70 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#C2410C] dark:text-orange-300 tabular-nums">
                {selectedIds.length}{' '}
                {selectedIds.length === 1
                  ? 'plato seleccionado'
                  : 'platos seleccionados'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="bg-transparent border-0 p-0 text-slate-500 dark:text-slate-400 underline cursor-pointer"
              >
                Deseleccionar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('Activo')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 cursor-pointer"
              >
                Activar
              </button>

              <button
                type="button"
                onClick={() => handleBulkStatus('Inactivo')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Desactivar
              </button>

              <select
                value={bulkCategoryValue}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) handleBulkCategory(val);
                }}
                aria-label="Cambiar categoría de seleccionados"
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="">Categoría...</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  setDeleteTarget({
                    ids: selectedIds,
                    label: `${selectedIds.length} platos`,
                  })
                }
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border-0 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Estado Vacío */}
        {pageDishes.length === 0 ? (
          <div className="px-6 py-12 text-center border-t border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
              No se encontraron platos
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Ajusta tu búsqueda o los filtros activos para visualizar la carta.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* VISTA FOTOS MOBILE */
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-4">
            {pageDishes.map((dish) => {
              const costPct =
                dish.precioVenta > 0
                  ? (dish.costoProd / dish.precioVenta) * 100
                  : 0;
              const isSelected = selectedIds.includes(dish.id);
              const catBadge = CATEGORY_BADGES[dish.categoria] || {
                emoji: '🍽️',
                className: 'bg-slate-100 text-slate-700',
              };

              return (
                <article
                  key={dish.id}
                  className={`rounded-2xl border transition-all bg-white dark:bg-slate-900 ${
                    isSelected
                      ? 'border-[#F26522] ring-2 ring-[#F26522]/15'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
                    <DishThumbnail
                      src={dish.imagen}
                      alt={dish.nombre}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <CheckboxButton
                        checked={isSelected}
                        onChange={() => toggleSelect(dish.id)}
                        ariaLabel={`Seleccionar ${dish.nombre}`}
                      />
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-xs ${catBadge.className}`}
                      >
                        <span>{catBadge.emoji}</span>
                        <span>{dish.categoria}</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate">
                          {dish.nombre}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {dish.sku} · {dish.insumosCount}{' '}
                          {dish.insumosCount === 1 ? 'insumo' : 'insumos'}
                        </p>
                      </div>

                      <SmoothDropDown
                        items={buildRowMenuItems(dish)}
                        ariaLabel={`Acciones para ${dish.nombre}`}
                      />
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block">
                          Precio Venta
                        </span>
                        <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                          S/. {dish.precioVenta.toFixed(2)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">
                          Costo ({costPct.toFixed(1)}%)
                        </span>
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            costPct > 40
                              ? 'text-red-600 dark:text-red-400'
                              : costPct >= 30
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[#15803D] dark:text-emerald-400'
                          }`}
                        >
                          S/. {dish.costoProd.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleCycleStatus(dish)}
                        className={`px-2.5 py-1 rounded-md border-0 text-xs font-semibold cursor-pointer ${
                          STATUS_BADGES[dish.estado]
                        }`}
                      >
                        {dish.estado}
                      </button>

                      {costPct > 40 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Costo alto
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* VISTA LISTA COMPACTA MOBILE */
          <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2.5">
                <CheckboxButton
                  checked={allPageSelected}
                  indeterminate={somePageSelected}
                  onChange={toggleSelectPage}
                  ariaLabel="Seleccionar todos los platos de esta página"
                />
                <span>Seleccionar página</span>
              </div>
              <span className="tabular-nums">{pageDishes.length} platos</span>
            </div>

            {pageDishes.map((dish) => {
              const isSelected = selectedIds.includes(dish.id);
              const costPct =
                dish.precioVenta > 0
                  ? (dish.costoProd / dish.precioVenta) * 100
                  : 0;
              const catBadge = CATEGORY_BADGES[dish.categoria] || {
                emoji: '🍽️',
                className: 'bg-slate-100 text-slate-700',
              };
              const isHighAlert = costPct > 40;
              const isMediumWarn = costPct >= 30 && costPct <= 40;

              return (
                <div
                  key={dish.id}
                  className={`p-4 transition-colors ${
                    isSelected
                      ? 'bg-orange-50/40 dark:bg-orange-950/20'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="pt-1">
                        <CheckboxButton
                          checked={isSelected}
                          onChange={() => toggleSelect(dish.id)}
                          ariaLabel={`Seleccionar ${dish.nombre}`}
                        />
                      </div>
                      <DishThumbnail
                        src={dish.imagen}
                        alt={dish.nombre}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate">
                          {dish.nombre}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {dish.sku} · {dish.insumosCount} insumos
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${catBadge.className}`}
                          >
                            <span>{catBadge.emoji}</span>
                            <span>{dish.categoria}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCycleStatus(dish)}
                            className={`px-2 py-0.5 rounded-md border-0 text-[11px] font-semibold cursor-pointer ${
                              STATUS_BADGES[dish.estado]
                            }`}
                          >
                            {dish.estado}
                          </button>
                        </div>
                      </div>
                    </div>

                    <SmoothDropDown
                      items={buildRowMenuItems(dish)}
                      ariaLabel={`Acciones para ${dish.nombre}`}
                    />
                  </div>

                  <div className="mt-3 pl-8 grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block">Precio</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        S/. {dish.precioVenta.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Costo</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                        S/. {dish.costoProd.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Costo %</span>
                      {isHighAlert ? (
                        <span className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400 tabular-nums">
                          <AlertTriangle className="w-3 h-3" />
                          {costPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span
                          className={`font-bold tabular-nums ${
                            isMediumWarn
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[#15803D] dark:text-emerald-400'
                          }`}
                        >
                          {costPct.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginación Mobile */}
        <div className="px-4 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Mostrando{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {startItem}-{endItem}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {filteredDishes.length}
            </span>{' '}
            platos
          </p>

          <nav
            aria-label="Paginación de menú"
            className="flex items-center justify-between gap-2"
          >
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-45 cursor-pointer"
            >
              Anterior
            </button>

            <div className="flex items-center gap-1 overflow-x-auto">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isActive = p === safePage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-w-[34px] min-h-[34px] px-2 py-1 text-xs font-semibold rounded-lg border tabular-nums cursor-pointer ${
                      isActive
                        ? 'bg-[#F26522] text-white border-[#F26522]'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-45 cursor-pointer"
            >
              Siguiente
            </button>
          </nav>
        </div>
      </section>

      {/* Modales */}
      <DishModal
        isOpen={dishModalOpen}
        mode={dishModalMode}
        initialDish={editingDish}
        categories={categories}
        existingDishes={dishes}
        onClose={() => {
          setDishModalOpen(false);
          setEditingDish(null);
        }}
        onSave={handleSaveDish}
      />

      <RecipeCostModal
        dish={recipeDish}
        insumos={insumos}
        onClose={() => setRecipeDish(null)}
        onSaveRecipe={handleSaveRecipe}
      />

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        itemName={deleteTarget?.label ?? ''}
        count={deleteTarget?.ids.length ?? 1}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MenuPlatosMobileView;