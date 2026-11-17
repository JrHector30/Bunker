import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
import CustomCheckbox from '../ui/CustomCheckbox';
import { getActiveRestaurant } from '../../utils/tenant';
import MenuPlatosMobileView from './MenuPlatosMobileView';
import { validatePlatosExcelHeaders } from '../../utils/inventoryExcel';

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

// Mapa de clases de colores fallback para categorías estándar
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

// Resolver dinámicamente el ícono y color de la categoría de la BD
export function getDishCategoryBadge(dish, categories = []) {
  const cat = dish?.categoriaObj || categories.find((c) => c.id === dish?.categoriaId || c.nombre === dish?.categoriaNombre);
  const fallbackBadge = CATEGORY_BADGES[dish?.categoriaNombre] || CATEGORY_BADGES.Default;
  const emoji = cat?.icono || dish?.categoria?.icono || fallbackBadge?.emoji || '🍽️';
  const color = cat?.color || dish?.categoria?.color;
  return {
    emoji,
    color,
    nombre: cat?.nombre || dish?.categoriaNombre || 'General',
    className: fallbackBadge?.className || 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-800 dark:text-slate-300'
  };
}

const STATUS_BADGES = {
  Activo: {
    dot: 'bg-emerald-500',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20',
  },
  'Agotado hoy': {
    dot: 'bg-amber-500',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20',
  },
  Inactivo: {
    dot: 'bg-zinc-400',
    className: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-500/20',
  },
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
        <Utensils className="w-3.5 h-3.5" />
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

export default function MenuPlatosManagement({
  products = [],
  categories = [],
  insumos = [],
  onRefresh,
  showToast,
  showConfirmation,
  onNavigateToRecetarios
}) {
  const navigate = useNavigate();
  const currentRest = getActiveRestaurant();
  const restaurantId = currentRest?.id || 1;

  const [localMobileDishes, setLocalMobileDishes] = useState(null);

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

  // Normalización de platos con datos calculados y ORDENAMIENTO ALFABÉTICO ESTRICTO
  const normalizedDishes = useMemo(() => {
    const list = products.map((p) => {
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

    // Ordenamiento alfabético garantizado
    return list.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
  }, [products, categories, statusMap]);

  // Sincronizar platos para vista móvil
  useEffect(() => {
    setLocalMobileDishes(null);
  }, [products]);

  const dishesForMobile = useMemo(() => {
    if (localMobileDishes) return localMobileDishes;
    return normalizedDishes.map((d) => ({
      ...d,
      categoria: d.categoriaNombre || (typeof d.categoria === 'string' ? d.categoria : d.categoria?.nombre) || 'Plato Principal',
      sku: d.sku || d.codigo || `PL-${d.id}`,
    }));
  }, [normalizedDishes, localMobileDishes]);

  const handleUpdateMobileDishes = (updater) => {
    setLocalMobileDishes((prev) => {
      const base = prev || dishesForMobile;
      const next = typeof updater === 'function' ? updater(base) : updater;
      return next;
    });
  };

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

  // Filtrado de platos (manteniendo orden alfabético)
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
    const isEdit = dishModalMode === 'edit' || Boolean(data.isExistingMatch);
    const targetId = data.id || (data.matchedDish ? data.matchedDish.id : (editingDish ? editingDish.id : null));
    const url = (isEdit && targetId) ? `/api/products/${targetId}` : '/api/products';
    const method = (isEdit && targetId) ? 'PUT' : 'POST';

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
        'Estado': 'Activo'
      },
      {
        'Nombre del Plato': 'Ceviche Clásico',
        'Categoría': 'Mariscos',
        'Precio Venta': 42.00,
        'Estado': 'Activo'
      },
      {
        'Nombre del Plato': 'Limonada Frozen',
        'Categoría': 'Bebidas',
        'Precio Venta': 12.00,
        'Estado': 'Activo'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Platos');
    XLSX.writeFile(wb, 'plantilla_menu_bunker.xlsx');
    if (showToast) showToast('Plantilla Excel descargada.', 'success');
  };

  // Importar Excel con validación estricta de formato de platos
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

        // 1. Extraer matriz de filas para validar cabeceras de la fila 0
        const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!matrix || matrix.length < 2) {
          if (showToast) showToast('El archivo Excel está vacío o no contiene filas de datos.', 'warning');
          return;
        }

        const rawHeaders = (matrix[0] || []).map((h) => String(h || '').trim());
        const headerCheck = validatePlatosExcelHeaders(rawHeaders);

        // Si es un archivo de inventario de insumos o no tiene formato de platos, bloquear inmediatamente
        if (!headerCheck.isValid) {
          if (showToast) {
            showToast(headerCheck.error, 'error');
          }
          return;
        }

        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows || rows.length === 0) {
          if (showToast) showToast('El archivo no contiene filas válidas de platos.', 'error');
          return;
        }

        let importados = 0;
        let omitidos = 0;

        for (const row of rows) {
          const nombre =
            row['Nombre del Plato'] ||
            row['Nombre de Plato'] ||
            row['Plato'] ||
            row['plato'] ||
            row['Nombre'] ||
            row['nombre'];

          if (!nombre || String(nombre).trim() === '') {
            omitidos += 1;
            continue;
          }

          const rawPrecio =
            row['Precio Venta'] ??
            row['Precio de Venta'] ??
            row['Precio'] ??
            row['precio'] ??
            row['P. Venta'] ??
            row['p. venta'] ??
            row['PVP'] ??
            row['pvp'];

          const precio = parseFloat(String(rawPrecio ?? 0).replace(/,/g, '.')) || 0;

          const rawCosto =
            row['Costo Prod'] ??
            row['Costo Producción'] ??
            row['Costo Produccion'] ??
            row['Costo'] ??
            row['costo'];

          const costo = parseFloat(String(rawCosto ?? 0).replace(/,/g, '.')) || 0;

          const catName = row['Categoría'] || row['Categoria'] || row['categoria'];
          const matchedCat = categories.find((c) =>
            c.nombre?.toLowerCase().trim() === String(catName || '').toLowerCase().trim()
          ) || categories[0];

          const rawEstado = row['Estado'] || row['estado'];
          const isActivo = rawEstado ? String(rawEstado).toLowerCase().trim() !== 'inactivo' : true;

          await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: String(nombre).trim(),
              precio,
              costoProduccion: costo,
              categoriaId: matchedCat ? matchedCat.id : 1,
              activo: isActivo,
            }),
          });
          importados += 1;
        }

        if (importados > 0) {
          if (showToast) showToast(`${importados} platos importados con éxito a la carta.`, 'success');
          if (onRefresh) onRefresh();
        } else {
          if (showToast) showToast('No se encontraron platos válidos para registrar en el archivo.', 'warning');
        }
      } catch (err) {
        if (showToast) showToast('Error al procesar el archivo Excel: ' + (err.message || 'formato inválido'), 'error');
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
    <div className="space-y-4 animate-fade-in text-left">
      {/* Vista Móvil para Teléfonos */}
      <div className="md:hidden">
        <MenuPlatosMobileView
          dishes={dishesForMobile}
          insumos={insumos}
          categories={categories}
          onUpdateDishes={handleUpdateMobileDishes}
          onNotify={(msg) => (showToast ? showToast(msg, 'info') : null)}
        />
      </div>

      {/* Vista Desktop Completa (hidden md:block) */}
      <div className="hidden md:block space-y-4">
        {/* NIVEL 1: Encabezado Superior con Botones SuperAdminView */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2.5 min-w-0">
            <h1 className="text-[20px] sm:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Menú (Platos)
            </h1>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
              {normalizedDishes.length} platos
            </span>
          </div>
        </div>

        {/* Botones de Acción Primaria con estilo SuperAdminView */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-4 py-2 rounded-full border-0 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
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
            className="px-4 py-2 rounded-full border-0 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Importar Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDishModalMode('create');
              setEditingDish(null);
              setDishModalOpen(true);
            }}
            className="px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md border-0 active:scale-95 bg-[#F26522] hover:bg-[#DC5616] text-white whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuevo Plato</span>
          </button>
        </div>
      </header>

      {/* NIVEL 2: Fila de KPIs rápidos de Rentabilidad (Cards más compactos) */}
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
        <div className="p-3 sm:px-5 sm:py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
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
                className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-full border-0 shadow-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
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

            <div className="flex flex-wrap items-center gap-2">
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

          {/* Toggle de Vista: Tabla / Cuadrícula (Botones SuperAdminView Pill) */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            {(searchQuery ||
              categoryFilter !== 'Todas' ||
              statusFilter !== 'Todos' ||
              highCostOnly) && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-[#F26522] hover:bg-orange-50 dark:hover:bg-orange-950/40 border-0 transition-all cursor-pointer whitespace-nowrap"
              >
                Limpiar filtros
              </button>
            )}

            <div
              role="group"
              aria-label="Cambiar vista"
              className="inline-flex items-center p-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border-0 shadow-xs"
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('table');
                  setCurrentPage(1);
                }}
                aria-pressed={viewMode === 'table'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
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
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-0 whitespace-nowrap ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Acciones Masivas (Bulk Actions) con botones Pill */}
        {selectedIds.length > 0 && (
          <div className="mx-4 sm:mx-6 mb-3 px-4 py-2 rounded-2xl bg-orange-50/90 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/70 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-bold text-[#C2410C] dark:text-orange-300 tabular-nums">
                {selectedIds.length}{' '}
                {selectedIds.length === 1 ? 'plato seleccionado' : 'platos seleccionados'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
              >
                Deseleccionar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('Activo')}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
              >
                Activar seleccionados
              </button>

              <button
                type="button"
                onClick={() => handleBulkStatus('Inactivo')}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold border-0 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
              >
                Desactivar
              </button>

              <button
                type="button"
                onClick={handleExportSelected}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold border-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
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
                className="px-3.5 py-1.5 rounded-full text-xs font-bold border-0 bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {pageDishes.length === 0 ? (
          <div className="px-6 py-14 text-center border-t border-slate-100 dark:border-slate-800">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              No se encontraron platos
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Ajusta tu búsqueda o los filtros activos para visualizar los platos de la carta.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-3 px-4 py-1.5 text-xs font-bold rounded-full border-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer shadow-xs active:scale-95"
            >
              Restablecer filtros
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================= */
          /* VISTA CUADRÍCULA (12 PLATOS: 3 FILAS DE 4 PLATOS)         */
          /* ========================================================= */
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pageDishes.map((dish) => {
              const costPct = dish.precioVenta > 0 ? (dish.costoProd / dish.precioVenta) * 100 : 0;
              const isSelected = selectedIds.includes(dish.id);
              const catBadge = getDishCategoryBadge(dish, categories);
              const statusCfg = STATUS_BADGES[dish.estado] || STATUS_BADGES.Activo;
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
                    {/* Imagen de Cabecera con CustomCheckbox */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
                      <DishThumbnail
                        src={dish.imagen}
                        alt={dish.nombre}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 z-10 bg-white/80 dark:bg-black/60 backdrop-blur-sm p-1 rounded-lg">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => toggleSelect(dish.id)}
                          aria-label={`Seleccionar ${dish.nombre}`}
                        />
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${catBadge.className}`}
                          style={catBadge.color ? { borderColor: `${catBadge.color}60` } : undefined}
                        >
                          <span>{catBadge.emoji}</span>
                          <span>{dish.categoriaNombre}</span>
                        </span>
                      </div>
                    </div>

                    {/* Cuerpo de la Tarjeta */}
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3
                            onClick={() => {
                              setDishModalMode('edit');
                              setEditingDish(dish);
                              setDishModalOpen(true);
                            }}
                            className="text-[14px] font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-[#F26522] transition-colors"
                            title={dish.nombre}
                          >
                            {dish.nombre}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {dish.insumosCount} {dish.insumosCount === 1 ? 'insumo' : 'insumos'}
                          </p>
                        </div>

                        {/* Botón de Acción SmoothDropdown Centrado */}
                        <div className="shrink-0 relative">
                          <SmoothDropdown
                            id={`grid-${dish.id}`}
                            items={dropdownActions}
                            onAction={(actionId) => {
                              const act = dropdownActions.find((a) => a.id === actionId);
                              if (act) act.onClick();
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 items-end">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Precio Venta
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                            S/. {dish.precioVenta.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Costo ({costPct.toFixed(1)}%)
                          </span>
                          <span
                            className={`text-xs font-bold tabular-nums ${
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

                  {/* Pie de Tarjeta con Botón Pill de Estado */}
                  <div className="px-3.5 pb-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCycleStatus(dish)}
                      title="Clic para cambiar estado"
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-0 transition-all cursor-pointer shadow-xs active:scale-95 ${
                        statusCfg.className
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                      <span>{dish.estado}</span>
                    </button>

                    {costPct > 40 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 tabular-nums">
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
          /* VISTA TABLA (FILAS COMPACTAS, SIN ESPACIOS EXCESIVOS)     */
          /* ========================================================= */
          <div className="overflow-x-auto min-h-[300px] pb-14 border-t border-slate-100 dark:border-slate-800">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase tracking-wider">
                  <th className="w-10 py-2.5 pl-4 pr-2 text-center">
                    <CustomCheckbox
                      checked={allPageSelected}
                      onChange={toggleSelectPage}
                      aria-label="Seleccionar todos los platos de esta página"
                    />
                  </th>
                  <th className="py-2.5 px-3">Plato</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Precio Venta</th>
                  <th className="py-2.5 px-3 text-right">Costo Prod.</th>
                  <th className="py-2.5 px-3 w-32">Costo %</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center w-28">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[13px]">
                {pageDishes.map((dish) => {
                  const isSelected = selectedIds.includes(dish.id);
                  const costPct = dish.precioVenta > 0 ? (dish.costoProd / dish.precioVenta) * 100 : 0;
                  const catBadge = getDishCategoryBadge(dish, categories);
                  const statusCfg = STATUS_BADGES[dish.estado] || STATUS_BADGES.Activo;
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
                      {/* Checkbox con CustomCheckbox */}
                      <td className="py-2 pl-4 pr-2 text-center">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => toggleSelect(dish.id)}
                          aria-label={`Seleccionar ${dish.nombre}`}
                        />
                      </td>

                      {/* Plato: Imagen compacta + Nombre + # Insumos (Clic para editar) */}
                      <td className="py-2 px-3">
                        <div
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                          onClick={() => {
                            setDishModalMode('edit');
                            setEditingDish(dish);
                            setDishModalOpen(true);
                          }}
                          title="Clic para editar plato"
                        >
                          <DishThumbnail
                            src={dish.imagen}
                            alt={dish.nombre}
                            className="w-9 h-9 rounded-lg object-cover border border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50 group-hover:scale-105 transition-transform"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-[13px] group-hover:text-[#F26522] transition-colors">
                              {dish.nombre}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                              {dish.insumosCount} {dish.insumosCount === 1 ? 'insumo' : 'insumos'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Categoría Dinámica de la BD */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs ${catBadge.className}`}
                          style={catBadge.color ? { borderColor: `${catBadge.color}60` } : undefined}
                        >
                          <span aria-hidden="true">{catBadge.emoji}</span>
                          <span>{dish.categoriaNombre}</span>
                        </span>
                      </td>

                      {/* Precio Venta */}
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        S/. {dish.precioVenta.toFixed(2)}
                      </td>

                      {/* Costo Prod. */}
                      <td
                        className={`py-2 px-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                          isHighAlert
                            ? 'text-[#DC2626] dark:text-red-400'
                            : isMediumWarn
                              ? 'text-[#B45309] dark:text-amber-400'
                              : 'text-[#15803D] dark:text-emerald-400'
                        }`}
                      >
                        S/. {dish.costoProd.toFixed(2)}
                      </td>

                      {/* Costo % + barra de progreso compacta */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 w-24">
                          {isHighAlert ? (
                            <span className="inline-flex items-center gap-1 self-start px-1.5 py-0.2 rounded-md text-[11px] font-bold bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-950/70 dark:text-red-300 tabular-nums">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
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
                          <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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

                      {/* Estado con Botón Pill SuperAdminView */}
                      <td className="py-2 px-3 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(dish)}
                          title="Clic para alternar estado"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-0 transition-all cursor-pointer shadow-xs active:scale-95 ${
                            statusCfg.className
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                          <span>{dish.estado}</span>
                        </button>
                      </td>

                      {/* Acciones: Botón Editar directo + SmoothDropdown */}
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1 h-8 mx-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setDishModalMode('edit');
                              setEditingDish(dish);
                              setDishModalOpen(true);
                            }}
                            title="Editar Plato"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#F26522] hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors border-0 cursor-pointer inline-flex items-center justify-center shrink-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <SmoothDropdown
                            id={`table-${dish.id}`}
                            dropUp={pageDishes.length > 3 && pageDishes.indexOf(dish) >= pageDishes.length - 2}
                            items={dropdownActions}
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

        {/* PIE DE TABLA Y PAGINACIÓN IDÉNTICA A ARQUEO DE CAJA */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-sans relative">
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
      </div>

      {/* Modal Crear / Editar Plato */}
      <DishModal
        isOpen={dishModalOpen}
        mode={dishModalMode}
        initialDish={editingDish}
        categories={categories}
        existingDishes={normalizedDishes}
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
