import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Upload,
  Plus,
  Search,
  X,
  Table2,
  LayoutGrid,
  AlertTriangle,
  Pencil,
  Calculator,
  EyeOff,
  Eye,
  Trash2,
  Check,
  Minus,
  Utensils,
  Tag,
  CircleDot,
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { MenuKpiRow } from './MenuKpiRow';
import { FilterCombobox } from './FilterCombobox';
import { DishModal } from './DishModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import SmoothDropdown from '../ui/SmoothDropdown';
import { getActiveRestaurant } from '../../utils/tenant';

// Imágenes de platos de alta definición
import imgAguaMineral from '../../assets/images/dishes/dish_agua_mineral_1794716320063.jpg';
import imgArrozMariscos from '../../assets/images/dishes/dish_arroz_mariscos_1794716321972.jpg';
import imgArrozPato from '../../assets/images/dishes/dish_arroz_pato_1794716321427.jpg';
import imgBrownieHelado from '../../assets/images/dishes/dish_brownie_helado_1794716322559.jpg';
import imgCaldoGallina from '../../assets/images/dishes/dish_caldo_gallina_1794716322821.jpg';
import imgCeviche from '../../assets/images/dishes/dish_ceviche_1794716321628.jpg';
import imgCocaCola from '../../assets/images/dishes/dish_coca_cola_1794716322392.jpg';
import imgConchitasParmesana from '../../assets/images/dishes/dish_conchitas_parmesana_1794716323623.jpg';
import imgLomoSaltado from '../../assets/images/dishes/dish_lomo_saltado_1794716324291.jpg';
import imgSuspiroLimena from '../../assets/images/dishes/dish_suspiro_limena_1794716324940.jpg';

const CATEGORY_BADGES = {
  Bebida: { emoji: '🍹', className: 'bg-[#ECFCCB] text-[#4D7C0F] dark:bg-lime-950/60 dark:text-lime-300' },
  Bebidas: { emoji: '🍹', className: 'bg-[#ECFCCB] text-[#4D7C0F] dark:bg-lime-950/60 dark:text-lime-300' },
  Marino: { emoji: '🐟', className: 'bg-[#E0F2FE] text-[#0369A1] dark:bg-sky-950/60 dark:text-sky-300' },
  Mariscos: { emoji: '🐟', className: 'bg-[#E0F2FE] text-[#0369A1] dark:bg-sky-950/60 dark:text-sky-300' },
  'Plato Principal': { emoji: '🍽️', className: 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300' },
  'Platos de Fondo': { emoji: '🍽️', className: 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300' },
  Postres: { emoji: '🍰', className: 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/60 dark:text-purple-300' },
  Sopas: { emoji: '🍜', className: 'bg-[#FFE4E6] text-[#BE123C] dark:bg-rose-950/60 dark:text-rose-300' },
  Carnes: { emoji: '🥩', className: 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-red-950/60 dark:text-red-300' },
  Entradas: { emoji: '🥗', className: 'bg-[#FEFCE8] text-[#A16207] dark:bg-amber-950/60 dark:text-amber-300' },
  Parrillas: { emoji: '🔥', className: 'bg-[#FFF7ED] text-[#C2410C] dark:bg-orange-950/60 dark:text-orange-300' },
  Default: { emoji: '🍽️', className: 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300' }
};

const STATUS_BADGES = {
  Activo: 'bg-[#DCFCE7] text-[#15803D] dark:bg-emerald-950/60 dark:text-emerald-300',
  'Agotado hoy': 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-950/60 dark:text-amber-300',
  Inactivo: 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-400',
};

function getDishImage(dish) {
  if (dish.imagen && !dish.imagen.includes('placeholder')) {
    return dish.imagen;
  }
  const name = (dish.nombre || '').toLowerCase();
  if (name.includes('ceviche')) return imgCeviche;
  if (name.includes('lomo')) return imgLomoSaltado;
  if (name.includes('marisco') || name.includes('arroz con marisco')) return imgArrozMariscos;
  if (name.includes('pato')) return imgArrozPato;
  if (name.includes('caldo') || name.includes('sopa') || name.includes('gallina')) return imgCaldoGallina;
  if (name.includes('concha') || name.includes('parmesana')) return imgConchitasParmesana;
  if (name.includes('brownie') || name.includes('helado')) return imgBrownieHelado;
  if (name.includes('suspiro')) return imgSuspiroLimena;
  if (name.includes('coca') || name.includes('gaseosa') || name.includes('soda')) return imgCocaCola;
  if (name.includes('agua') || name.includes('mineral')) return imgAguaMineral;

  const cat = (dish.categoria?.nombre || dish.categoria || '').toLowerCase();
  if (cat.includes('bebid') || cat.includes('trago') || cat.includes('coctel') || cat.includes('caf')) return imgAguaMineral;
  if (cat.includes('marin') || cat.includes('pescad')) return imgCeviche;
  if (cat.includes('postre') || cat.includes('dulce')) return imgBrownieHelado;
  if (cat.includes('sopa')) return imgCaldoGallina;
  return imgLomoSaltado;
}

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
      className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
        checked || indeterminate
          ? 'bg-[#F26522] border border-[#F26522] text-white'
          : 'bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-600 hover:border-slate-400'
      }`}
    >
      {checked && <Check className="w-3 h-3 stroke-[3]" />}
      {!checked && indeterminate && <Minus className="w-3 h-3 stroke-[3]" />}
    </button>
  );
}

export default function MenuPlatosManagement({
  products = [],
  categories = [],
  onRefresh,
  showToast,
  showConfirmation,
  onNavigateToRecetarios
}) {
  const navigate = useNavigate();
  const currentRest = getActiveRestaurant();
  const restaurantId = currentRest?.id || 1;

  // Estados de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [highCostOnly, setHighCostOnly] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modales
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [dishModalMode, setDishModalMode] = useState('create');
  const [editingDish, setEditingDish] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fileInputRef = useRef(null);

  // Status mapping local (para diferenciar 'Agotado hoy' de 'Inactivo')
  const [statusMap, setStatusMap] = useState(() => {
    try {
      const saved = localStorage.getItem(`bunker_dish_status_map_${restaurantId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveStatusMap = (newMap) => {
    setStatusMap(newMap);
    try {
      localStorage.setItem(`bunker_dish_status_map_${restaurantId}`, JSON.stringify(newMap));
    } catch {}
  };

  // Normalización de platos con datos calculados
  const normalizedDishes = useMemo(() => {
    return products.map((p) => {
      // Insumos count y costo
      let insumosCount = 0;
      let costoCalculado = 0;

      if (p.receta && Array.isArray(p.receta) && p.receta.length > 0) {
        insumosCount = p.receta.length;
        costoCalculado = p.receta.reduce((sum, item) => {
          const precioInsumo = Number(item.insumo?.precioCompra) || 0;
          const cant = Number(item.cantidad) || 0;
          return sum + (precioInsumo * cant);
        }, 0);
      }

      const costoProd = costoCalculado > 0 ? costoCalculado : (Number(p.costoProduccion) || 0);
      const precioVenta = Number(p.precio) || 0;

      // Estado unificado
      let estado = 'Activo';
      if (statusMap[p.id]) {
        estado = statusMap[p.id];
      } else if (p.activo === false) {
        estado = 'Inactivo';
      }

      // Categoría
      const catObj = p.categoria || categories.find((c) => c.id === p.categoriaId);
      const categoriaNombre = catObj?.nombre || 'Plato Principal';

      return {
        ...p,
        id: p.id,
        nombre: p.nombre,
        categoriaNombre,
        categoriaObj: catObj,
        precioVenta,
        costoProd,
        insumosCount,
        estado,
        imagen: getDishImage({ ...p, categoria: catObj }),
      };
    });
  }, [products, categories, statusMap]);

  // KPIs de Rentabilidad con persistencia en localStorage por local
  const kpis = useMemo(() => {
    const total = normalizedDishes.length;
    const activos = normalizedDishes.filter((d) => d.estado === 'Activo').length;

    let sumCostPct = 0;
    let highCostCount = 0;

    for (const d of normalizedDishes) {
      const pct = d.precioVenta > 0 ? (d.costoProd / d.precioVenta) * 100 : 0;
      sumCostPct += pct;
      if (pct > 35) highCostCount += 1;
    }

    const calculatedCosto = total > 0 ? sumCostPct / total : 0;
    const calculatedMargen = Math.max(0, 100 - calculatedCosto);

    // Recuperar / Guardar en localStorage para estabilidad entre módulos
    const MARGEN_KEY = `bunker_menu_kpi_margen_${restaurantId}`;
    const COSTO_KEY = `bunker_menu_kpi_costo_${restaurantId}`;

    let margenPromedio = calculatedMargen;
    let costoPromedio = calculatedCosto;

    const savedMargen = localStorage.getItem(MARGEN_KEY);
    const savedCosto = localStorage.getItem(COSTO_KEY);

    if (total > 0) {
      localStorage.setItem(MARGEN_KEY, calculatedMargen.toFixed(1));
      localStorage.setItem(COSTO_KEY, calculatedCosto.toFixed(1));
      margenPromedio = calculatedMargen;
      costoPromedio = calculatedCosto;
    } else if (savedMargen) {
      margenPromedio = parseFloat(savedMargen);
      costoPromedio = savedCosto ? parseFloat(savedCosto) : 0;
    }

    return {
      total,
      activos,
      margenPromedio,
      costoPromedio,
      highCostCount,
    };
  }, [normalizedDishes, restaurantId]);

  // Filtrado de platos
  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return normalizedDishes.filter((d) => {
      if (q && !d.nombre.toLowerCase().includes(q)) {
        return false;
      }
      if (categoryFilter !== 'Todas') {
        const catName = d.categoriaNombre.toLowerCase();
        if (catName !== categoryFilter.toLowerCase()) return false;
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
  }, [normalizedDishes, searchQuery, categoryFilter, statusFilter, highCostOnly]);

  // Paginación diferenciada: 10 para Tabla, 12 para Cuadrícula (3 filas de 4 platos)
  const pageSize = viewMode === 'grid' ? 12 : 10;
  const totalPages = Math.max(1, Math.ceil(filteredDishes.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageDishes = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredDishes.slice(start, start + pageSize);
  }, [filteredDishes, safePage, pageSize]);

  const pageIds = pageDishes.map((d) => d.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id)).length;
  const allPageSelected = pageDishes.length > 0 && selectedOnPage === pageDishes.length;
  const somePageSelected = selectedOnPage > 0 && selectedOnPage < pageDishes.length;

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

  // Opciones para combobox de categorías
  const categoryComboboxOptions = useMemo(() => {
    const opts = [{ value: 'Todas', label: 'Todas las categorías' }];
    categories.forEach((cat) => {
      const badge = CATEGORY_BADGES[cat.nombre] || CATEGORY_BADGES.Default;
      opts.push({
        value: cat.nombre,
        label: cat.nombre,
        emoji: cat.icono || badge.emoji,
      });
    });
    return opts;
  }, [categories]);

  // Cambiar estado individual
  const handleChangeStatus = async (dish, nextStatus) => {
    const newMap = { ...statusMap, [dish.id]: nextStatus };
    saveStatusMap(newMap);

    const isActivo = nextStatus === 'Activo';
    try {
      await fetch(`/api/products/${dish.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: isActivo }),
      });
      if (showToast) showToast(`"${dish.nombre}" marcado como ${nextStatus}.`, 'success');
      if (onRefresh) onRefresh();
    } catch (e) {
      if (showToast) showToast('Error al actualizar estado del plato', 'error');
    }
  };

  const handleCycleStatus = (dish) => {
    const order = ['Activo', 'Agotado hoy', 'Inactivo'];
    const nextStatus = order[(order.indexOf(dish.estado) + 1) % order.length];
    handleChangeStatus(dish, nextStatus);
  };

  // Cambiar estado en masa
  const handleBulkStatus = async (status) => {
    const newMap = { ...statusMap };
    selectedIds.forEach((id) => {
      newMap[id] = status;
    });
    saveStatusMap(newMap);

    const isActivo = status === 'Activo';
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: isActivo }),
          })
        )
      );
      if (showToast) {
        showToast(
          `${selectedIds.length} ${selectedIds.length === 1 ? 'plato actualizado' : 'platos actualizados'} a ${status}.`,
          'success'
        );
      }
      setSelectedIds([]);
      if (onRefresh) onRefresh();
    } catch {
      if (showToast) showToast('Error al actualizar platos seleccionados', 'error');
    }
  };

  // Guardar creación o edición
  const handleSaveDish = async (data) => {
    const url = dishModalMode === 'create' ? '/api/products' : `/api/products/${editingDish.id}`;
    const method = dishModalMode === 'create' ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar el plato');
    }

    const saved = await res.json();
    if (data.estado) {
      const newMap = { ...statusMap, [saved.id || editingDish?.id]: data.estado };
      saveStatusMap(newMap);
    }

    if (showToast) {
      showToast(
        dishModalMode === 'create'
          ? `Plato "${data.nombre}" agregado con éxito.`
          : `Plato "${data.nombre}" actualizado con éxito.`,
        'success'
      );
    }
    if (onRefresh) onRefresh();
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await Promise.all(
        deleteTarget.ids.map((id) =>
          fetch(`/api/products/${id}`, { method: 'DELETE' })
        )
      );
      if (showToast) {
        showToast(
          deleteTarget.ids.length > 1
            ? `${deleteTarget.ids.length} platos eliminados.`
            : `Plato "${deleteTarget.label}" eliminado.`,
          'success'
        );
      }
      setSelectedIds((prev) => prev.filter((id) => !deleteTarget.ids.includes(id)));
      setDeleteTarget(null);
      if (onRefresh) onRefresh();
    } catch {
      if (showToast) showToast('Error al eliminar platos', 'error');
    }
  };

  // Descargar Plantilla Excel
  const handleDownloadTemplate = () => {
    const data = [
      {
        'Nombre del Plato': 'Lomo Saltado Criollo',
        'Categoría': 'Platos de Fondo',
        'Precio Venta': 38.50,
        'Costo Prod': 12.00,
        'Estado': 'Activo'
      },
      {
        'Nombre del Plato': 'Ceviche Clásico',
        'Categoría': 'Mariscos',
        'Precio Venta': 42.00,
        'Costo Prod': 14.50,
        'Estado': 'Activo'
      },
      {
        'Nombre del Plato': 'Limonada Frozen',
        'Categoría': 'Bebidas',
        'Precio Venta': 12.00,
        'Costo Prod': 2.50,
        'Estado': 'Activo'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Platos');
    XLSX.writeFile(wb, 'plantilla_menu_bunker.xlsx');
    if (showToast) showToast('Plantilla Excel descargada.', 'success');
  };

  // Importar Excel
  const handleImportExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          if (showToast) showToast('El archivo no contiene filas válidas.', 'error');
          return;
        }

        let importados = 0;
        for (const row of rows) {
          const nombre = row['Nombre del Plato'] || row['Nombre'] || row['nombre'];
          if (!nombre) continue;

          const precio = parseFloat(row['Precio Venta'] || row['Precio'] || row['precio']) || 0;
          const costo = parseFloat(row['Costo Prod'] || row['Costo'] || row['costo']) || 0;
          const catName = row['Categoría'] || row['Categoria'] || row['categoria'];
          const matchedCat = categories.find((c) => c.nombre?.toLowerCase() === String(catName).toLowerCase()) || categories[0];

          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre,
              precio,
              costoProduccion: costo,
              categoriaId: matchedCat ? matchedCat.id : 1,
              activo: true,
            }),
          });
          importados += 1;
        }

        if (showToast) showToast(`${importados} platos importados con éxito.`, 'success');
        if (onRefresh) onRefresh();
      } catch (err) {
        if (showToast) showToast('Error al procesar el archivo Excel.', 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Exportar Selección a Excel
  const handleExportSelected = () => {
    const selectedDishes = normalizedDishes.filter((d) => selectedIds.includes(d.id));
    if (selectedDishes.length === 0) return;

    const data = selectedDishes.map((d) => ({
      'ID': d.id,
      'Plato': d.nombre,
      'Categoría': d.categoriaNombre,
      'Precio Venta': d.precioVenta.toFixed(2),
      'Costo Prod': d.costoProd.toFixed(2),
      'Costo %': `${d.precioVenta > 0 ? ((d.costoProd / d.precioVenta) * 100).toFixed(1) : '0.0'}%`,
      '# Insumos': d.insumosCount,
      'Estado': d.estado
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Platos Seleccionados');
    XLSX.writeFile(wb, `menu_seleccion_${restaurantId}.xlsx`);
    if (showToast) showToast(`${selectedDishes.length} platos exportados a Excel.`, 'success');
  };

  // Acciones para SmoothDropdown
  const getDropdownActions = (dish) => [
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
      onClick: () => {
        if (onNavigateToRecetarios) {
          onNavigateToRecetarios(dish.id);
        } else {
          navigate(`/admin/inventory?tab=recetarios&platoId=${dish.id}`);
        }
      },
    },
    {
      id: 'toggle-status',
      label:
        dish.estado === 'Activo'
          ? 'Marcar como Agotado / Inactivo'
          : 'Activar Plato',
      icon: dish.estado === 'Activo' ? EyeOff : Eye,
      onClick: () => {
        const next = dish.estado === 'Activo' ? 'Agotado hoy' : 'Activo';
        handleChangeStatus(dish, next);
      },
    },
    {
      id: 'delete',
      label: 'Eliminar Plato',
      icon: Trash2,
      isDestructive: true,
      onClick: () => {
        setDeleteTarget({ ids: [dish.id], label: dish.nombre });
      },
    },
  ];

  const startItem = filteredDishes.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filteredDishes.length);

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* NIVEL 1: Encabezado Superior */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Volver"
            title="Volver al Inicio"
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-baseline gap-2.5 min-w-0">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Menú (Platos)
            </h1>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
              {normalizedDishes.length} platos
            </span>
          </div>
        </div>

        {/* Botones de Acción Primaria */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Descargar Plantilla</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcel}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Importar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDishModalMode('create');
              setEditingDish(null);
              setDishModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl bg-[#F26522] hover:bg-[#DC5616] text-white shadow-[0_4px_14px_-3px_rgba(242,101,34,0.45)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Plato</span>
          </button>
        </div>
      </header>

      {/* NIVEL 2: Fila de KPIs rápidos de Rentabilidad */}
      <MenuKpiRow
        totalPlatos={kpis.total}
        activosCount={kpis.activos}
        margenPromedio={kpis.margenPromedio}
        costoPromedio={kpis.costoPromedio}
        highCostCount={kpis.highCostCount}
        highCostFilterActive={highCostOnly}
        onToggleHighCostFilter={() => {
          setHighCostOnly((prev) => !prev);
          setCurrentPage(1);
        }}
      />

      {/* CONTENEDOR PRINCIPAL DE TABLA / CUADRÍCULA */}
      <section
        aria-label="Catálogo de platos"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden"
      >
        {/* Toolbar Integrada */}
        <div className="p-4 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Buscador + Selectores */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar plato por nombre..."
                aria-label="Buscar plato por nombre"
                className="w-full pl-9 pr-8 py-2 text-[13px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#F26522]/20 focus:border-[#F26522] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Listener de Categorías */}
              <FilterCombobox
                value={categoryFilter}
                defaultValue="Todas"
                icon={Tag}
                ariaLabel="Filtrar por categoría"
                onChange={(val) => {
                  setCategoryFilter(val);
                  setCurrentPage(1);
                }}
                options={categoryComboboxOptions}
              />

              {/* Listener de Estados */}
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
                  { value: 'Todos', label: 'Todos los estados' },
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
          </div>

          {/* Toggle de Vista: Tabla / Cuadrícula */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            {(searchQuery ||
              categoryFilter !== 'Todas' ||
              statusFilter !== 'Todos' ||
              highCostOnly) && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-semibold text-[#F26522] hover:underline whitespace-nowrap cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}

            <div
              role="group"
              aria-label="Cambiar vista"
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700"
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('table');
                  setCurrentPage(1);
                }}
                aria-pressed={viewMode === 'table'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('grid');
                  setCurrentPage(1);
                }}
                aria-pressed={viewMode === 'grid'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Masivas (Bulk Actions) */}
        {selectedIds.length > 0 && (
          <div className="mx-4 sm:mx-6 mb-4 px-4 py-2.5 rounded-xl bg-orange-50/90 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/70 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-bold text-[#C2410C] dark:text-orange-300 tabular-nums">
                {selectedIds.length}{' '}
                {selectedIds.length === 1 ? 'plato seleccionado' : 'platos seleccionados'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Deseleccionar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('Activo')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors whitespace-nowrap cursor-pointer"
              >
                Activar seleccionados
              </button>

              <button
                type="button"
                onClick={() => handleBulkStatus('Inactivo')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                Desactivar
              </button>

              <button
                type="button"
                onClick={handleExportSelected}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                Exportar selección
              </button>

              <button
                type="button"
                onClick={() =>
                  setDeleteTarget({
                    ids: selectedIds,
                    label: `${selectedIds.length} platos`,
                  })
                }
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {pageDishes.length === 0 ? (
          <div className="px-6 py-16 text-center border-t border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">
              No se encontraron platos
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Ajusta tu búsqueda o los filtros activos para visualizar los platos de la carta.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================= */
          /* VISTA CUADRÍCULA (GRID VIEW: 3 FILAS DE 4 PLATOS = 12)    */
          /* ========================================================= */
          <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageDishes.map((dish) => {
              const costPct = dish.precioVenta > 0 ? (dish.costoProd / dish.precioVenta) * 100 : 0;
              const isSelected = selectedIds.includes(dish.id);
              const catBadge = CATEGORY_BADGES[dish.categoriaNombre] || CATEGORY_BADGES.Default;
              const dropdownActions = getDropdownActions(dish);

              return (
                <article
                  key={dish.id}
                  className={`rounded-2xl border transition-all duration-150 bg-white dark:bg-slate-900 flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#F26522] ring-2 ring-[#F26522]/15 shadow-sm'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Imagen de Cabecera */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
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
                          <span>{dish.categoriaNombre}</span>
                        </span>
                      </div>
                    </div>

                    {/* Cuerpo de la Tarjeta */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate" title={dish.nombre}>
                            {dish.nombre}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {dish.insumosCount} {dish.insumosCount === 1 ? 'insumo' : 'insumos'}
                          </p>
                        </div>

                        {/* Botón de Acción SmoothDropdown */}
                        <div className="shrink-0 relative">
                          <SmoothDropdown
                            id={`grid-${dish.id}`}
                            compact={true}
                            items={dropdownActions.map((a) => ({
                              id: a.id,
                              label: a.label,
                              icon: a.icon,
                              isDestructive: a.isDestructive,
                            }))}
                            onAction={(actionId) => {
                              const act = dropdownActions.find((a) => a.id === actionId);
                              if (act) act.onClick();
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 items-end">
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
                    </div>
                  </div>

                  {/* Pie de Tarjeta */}
                  <div className="px-4 pb-3.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCycleStatus(dish)}
                      title="Clic para cambiar estado"
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80 ${
                        STATUS_BADGES[dish.estado] || STATUS_BADGES.Activo
                      }`}
                    >
                      {dish.estado}
                    </button>

                    {costPct > 40 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 tabular-nums">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Costo alto
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* ========================================================= */
          /* VISTA TABLA (10 PLATOS POR PÁGINA)                        */
          /* ========================================================= */
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase tracking-wider">
                  <th className="w-12 py-3.5 pl-6 pr-3">
                    <CheckboxButton
                      checked={allPageSelected}
                      indeterminate={somePageSelected}
                      onChange={toggleSelectPage}
                      ariaLabel="Seleccionar todos los platos de esta página"
                    />
                  </th>
                  <th className="py-3.5 px-4">Plato</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4 text-right">Precio Venta</th>
                  <th className="py-3.5 px-4 text-right">Costo Prod.</th>
                  <th className="py-3.5 px-4 w-36">Costo %</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[13.5px]">
                {pageDishes.map((dish, index) => {
                  const isSelected = selectedIds.includes(dish.id);
                  const costPct = dish.precioVenta > 0 ? (dish.costoProd / dish.precioVenta) * 100 : 0;
                  const catBadge = CATEGORY_BADGES[dish.categoriaNombre] || CATEGORY_BADGES.Default;
                  const isHighAlert = costPct > 40;
                  const isMediumWarn = costPct >= 30 && costPct <= 40;
                  const barWidth = Math.min(100, Math.max(4, costPct));
                  const dropdownActions = getDropdownActions(dish);

                  return (
                    <tr
                      key={dish.id}
                      className={`transition-colors duration-100 ${
                        isSelected
                          ? 'bg-orange-50/40 dark:bg-orange-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pl-6 pr-3">
                        <CheckboxButton
                          checked={isSelected}
                          onChange={() => toggleSelect(dish.id)}
                          ariaLabel={`Seleccionar ${dish.nombre}`}
                        />
                      </td>

                      {/* Plato: Imagen + Nombre + # Insumos (NO SKU) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <DishThumbnail
                            src={dish.imagen}
                            alt={dish.nombre}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                              {dish.nombre}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                              {dish.insumosCount} {dish.insumosCount === 1 ? 'insumo' : 'insumos'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${catBadge.className}`}
                        >
                          <span aria-hidden="true">{catBadge.emoji}</span>
                          <span>{dish.categoriaNombre}</span>
                        </span>
                      </td>

                      {/* Precio Venta */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        S/. {dish.precioVenta.toFixed(2)}
                      </td>

                      {/* Costo Prod. */}
                      <td
                        className={`py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                          isHighAlert
                            ? 'text-[#DC2626] dark:text-red-400'
                            : isMediumWarn
                              ? 'text-[#B45309] dark:text-amber-400'
                              : 'text-[#15803D] dark:text-emerald-400'
                        }`}
                      >
                        S/. {dish.costoProd.toFixed(2)}
                      </td>

                      {/* Costo % + barra de progreso */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 w-28">
                          {isHighAlert ? (
                            <span className="inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-md text-xs font-bold bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-950/70 dark:text-red-300 tabular-nums">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {costPct.toFixed(1)}%
                            </span>
                          ) : (
                            <span
                              className={`text-xs font-bold tabular-nums ${
                                isMediumWarn
                                  ? 'text-[#B45309] dark:text-amber-400'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {costPct.toFixed(1)}%
                            </span>
                          )}
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isHighAlert
                                  ? 'bg-red-500'
                                  : isMediumWarn
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(dish)}
                          title="Clic para alternar estado"
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold transition-opacity hover:opacity-85 cursor-pointer ${
                            STATUS_BADGES[dish.estado] || STATUS_BADGES.Activo
                          }`}
                        >
                          {dish.estado}
                        </button>
                      </td>

                      {/* Acciones: SmoothDropdown */}
                      <td className="py-3.5 pl-4 pr-6 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <SmoothDropdown
                            id={`table-${dish.id}`}
                            dropUp={index >= Math.max(1, pageDishes.length - 3)}
                            compact={true}
                            items={dropdownActions.map((a) => ({
                              id: a.id,
                              label: a.label,
                              icon: a.icon,
                              isDestructive: a.isDestructive,
                            }))}
                            onAction={(actionId) => {
                              const act = dropdownActions.find((a) => a.id === actionId);
                              if (act) act.onClick();
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        /* PIE DE TABLA Y PAGINACIÓN IDÉNTICA A ARQUEO DE CAJA       */
        /* ========================================================= */
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-sans relative">
          {/* Lado izquierdo: "Mostrando 1-10 de # platos" */}
          <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums">
            Mostrando{' '}
            <strong className="text-slate-800 dark:text-slate-100 font-bold">
              {startItem}-{endItem}
            </strong>{' '}
            de{' '}
            <strong className="text-slate-800 dark:text-slate-100 font-bold">
              {filteredDishes.length}
            </strong>{' '}
            platos
          </span>

          {/* Centro: Controles de Paginación */}
          <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              title="Ir al inicio"
              aria-label="Primera página"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
            >
              <ChevronFirst className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              title="Página anterior"
              aria-label="Página anterior"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-700 dark:text-slate-200 px-2 select-none whitespace-nowrap text-xs tabular-nums">
              Página {safePage} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              title="Página siguiente"
              aria-label="Página siguiente"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              title="Ir al final"
              aria-label="Última página"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-xs"
            >
              <ChevronLast className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal Crear / Editar Plato */}
      <DishModal
        isOpen={dishModalOpen}
        mode={dishModalMode}
        initialDish={editingDish}
        categories={categories}
        onClose={() => {
          setDishModalOpen(false);
          setEditingDish(null);
        }}
        onSave={handleSaveDish}
      />

      {/* Modal Confirmar Eliminación */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        itemName={deleteTarget?.label ?? ''}
        count={deleteTarget?.ids?.length ?? 1}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
