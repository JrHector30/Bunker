import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package,
  Gauge,
  ClockAlert,
  PackageX,
  Search,
  Filter,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  X,
  PackageOpen,
  Check,
  Minus,
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SmoothDropdown from '../ui/SmoothDropdown';
import CloseButton from '../ui/CloseButton';
import { getActiveRestaurant } from '../../utils/tenant';

const ALMACENES_DISPONIBLES = ['Congelador', 'Congelador 2', 'Despensa', 'Refrigerador'];
const UNIDADES_DISPONIBLES = ['kg', 'L', 'und', 'g'];
const ESTADOS_DISPONIBLES = ['Todos', 'Bueno', 'Bajo Stock', 'Sin Stock', 'Vencido'];
const PAGE_SIZE = 10;

// Deterministic fallback para almacén y fecha si no vinieran definidos
function getInsumoAlmacen(item, index) {
  if (item.almacen) return item.almacen;
  return ALMACENES_DISPONIBLES[(item.id || index) % ALMACENES_DISPONIBLES.length];
}

function getInsumoFecha(item, index) {
  if (item.fechaActualizacion) return new Date(item.fechaActualizacion);
  // Fechas entre 1 oct y 13 nov 2026
  const base = new Date('2026-10-01T10:00:00Z').getTime();
  const end = new Date('2026-11-13T12:00:00Z').getTime();
  const offset = ((item.id || index) * 1374923) % (end - base);
  return new Date(base + Math.abs(offset));
}

function calculateInsumoStatus(stock, fechaActualizacion) {
  const numStock = Number(stock) || 0;
  if (numStock <= 0) return 'Sin Stock';
  
  // Insumos vencidos: más de 3 meses (90 días) desde su registro
  if (fechaActualizacion) {
    const now = new Date('2026-11-13T15:00:00Z');
    const itemDate = new Date(fechaActualizacion);
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) return 'Vencido';
  }
  
  if (numStock <= 10) return 'Bajo Stock';
  return 'Bueno';
}

function formatSpanishDate(dateObj) {
  if (!dateObj) return '13 nov 2026';
  try {
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '13 nov 2026';
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const hora = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()} ${hora}:${min}`;
  } catch (e) {
    return '13 nov 2026';
  }
}

function formatTodaySpanish() {
  try {
    const now = new Date();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `Hoy, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
  } catch (e) {
    return 'Hoy, 13 de noviembre de 2026';
  }
}

export default function InsumosManagement({
  insumos = [],
  onRefresh,
  showToast,
  showConfirmation
}) {
  const navigate = useNavigate();

  // Estados de Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [almacenFilter, setAlmacenFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterRef = useRef(null);

  // Selección Múltiple
  const [selectedIds, setSelectedIds] = useState([]);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingInsumo, setEditingInsumo] = useState(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [insumoToDelete, setInsumoToDelete] = useState(null);

  // Formulario Insumo
  const [formData, setFormData] = useState({
    nombre: '',
    stock: '',
    unidadMedida: 'kg',
    precioCompra: '',
    stockMinimo: '',
    notificarAlerta: false,
    almacen: 'Congelador'
  });
  const [formError, setFormError] = useState('');

  // Cerrar popover de filtros al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista enriquecida con almacén, fecha y estado unificados
  const enrichedInsumos = useMemo(() => {
    return insumos.map((item, idx) => {
      const fecha = getInsumoFecha(item, idx);
      const almacen = getInsumoAlmacen(item, idx);
      const estado = calculateInsumoStatus(item.stock, fecha);
      return {
        ...item,
        almacen,
        fechaActualizacion: fecha,
        estado,
        formattedFecha: formatSpanishDate(fecha)
      };
    });
  }, [insumos]);

  // Cálculos de KPIs en tiempo real
  const kpiData = useMemo(() => {
    let bajoStock = 0;
    let vencidos = 0;
    let sinStock = 0;

    for (const item of enrichedInsumos) {
      if (item.estado === 'Bajo Stock') bajoStock++;
      else if (item.estado === 'Vencido') vencidos++;
      else if (item.estado === 'Sin Stock') sinStock++;
    }

    return {
      total: enrichedInsumos.length,
      bajoStock,
      vencidos,
      sinStock
    };
  }, [enrichedInsumos]);

  // Filtrado de la tabla
  const filteredInsumos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedInsumos.filter((item) => {
      if (q) {
        const matchNombre = (item.nombre || '').toLowerCase().includes(q);
        const matchAlmacen = (item.almacen || '').toLowerCase().includes(q);
        if (!matchNombre && !matchAlmacen) return false;
      }
      if (statusFilter !== 'Todos' && item.estado !== statusFilter) {
        return false;
      }
      if (almacenFilter !== 'Todos' && item.almacen !== almacenFilter) {
        return false;
      }
      return true;
    });
  }, [enrichedInsumos, searchQuery, statusFilter, almacenFilter]);

  // Paginación (10 items por página)
  const totalPages = Math.max(1, Math.ceil(filteredInsumos.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredInsumos.slice(start, start + PAGE_SIZE);
  }, [filteredInsumos, safePage]);

  const pageIds = paginatedItems.map((i) => i.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id)) && !allPageSelected;

  const activeFiltersCount = (statusFilter !== 'Todos' ? 1 : 0) + (almacenFilter !== 'Todos' ? 1 : 0);
  const startItem = filteredInsumos.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, filteredInsumos.length);

  // Manejadores de Selección
  const handleToggleSelectAllPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectItem = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Manejadores de KPIs para filtrar
  const handleKpiClick = (statusKey) => {
    if (statusKey === 'Todos') {
      setStatusFilter('Todos');
    } else {
      setStatusFilter((prev) => (prev === statusKey ? 'Todos' : statusKey));
    }
    setCurrentPage(1);
  };

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingInsumo(null);
    setFormData({
      nombre: '',
      stock: '',
      unidadMedida: 'kg',
      precioCompra: '',
      stockMinimo: '',
      notificarAlerta: false,
      almacen: 'Congelador'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setEditingInsumo(item);
    setFormData({
      nombre: item.nombre || '',
      stock: item.stock !== undefined && item.stock !== null ? String(item.stock) : '',
      unidadMedida: item.unidadMedida || 'kg',
      precioCompra: item.precioCompra !== undefined && item.precioCompra !== null ? String(item.precioCompra) : '',
      stockMinimo: item.stockMinimo !== undefined && item.stockMinimo !== null ? String(item.stockMinimo) : '',
      notificarAlerta: Boolean(item.notificarAlerta),
      almacen: item.almacen || 'Congelador'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Guardar insumo (creación / edición)
  const handleSaveInsumo = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedNombre = formData.nombre.trim();
    if (!trimmedNombre) {
      setFormError('El nombre del insumo es obligatorio.');
      return;
    }

    const parsedStock = Number(formData.stock);
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      setFormError('La cantidad/stock debe ser un número mayor o igual a 0.');
      return;
    }

    const payload = {
      nombre: trimmedNombre,
      stock: parsedStock,
      unidadMedida: formData.unidadMedida || 'kg',
      precioCompra: Number(formData.precioCompra) || 0,
      stockMinimo: formData.stockMinimo ? Number(formData.stockMinimo) : 0,
      notificarAlerta: Boolean(formData.notificarAlerta),
      almacen: formData.almacen || 'Congelador'
    };

    const tenantId = getActiveRestaurant()?.id || 1;
    const isEdit = modalMode === 'edit' && editingInsumo;
    const url = isEdit ? `/api/insumos/${editingInsumo.id}` : '/api/insumos';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-restaurante-id': String(tenantId)
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al guardar insumo');
      }

      showToast?.(
        isEdit ? `Insumo "${trimmedNombre}" actualizado con éxito.` : `Insumo "${trimmedNombre}" registrado con éxito.`,
        'success'
      );
      setIsModalOpen(false);
      onRefresh?.();
    } catch (err) {
      setFormError(err.message || 'Error de conexión');
    }
  };

  // Borrar individual
  const handleDeleteSingle = (item) => {
    setInsumoToDelete(item);
  };

  const confirmDeleteSingle = async () => {
    if (!insumoToDelete) return;
    const tenantId = getActiveRestaurant()?.id || 1;
    try {
      const res = await fetch(`/api/insumos/${insumoToDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-restaurante-id': String(tenantId) }
      });
      if (res.ok) {
        showToast?.(`Insumo "${insumoToDelete.nombre}" eliminado.`, 'success');
        setSelectedIds((prev) => prev.filter((id) => id !== insumoToDelete.id));
        setInsumoToDelete(null);
        onRefresh?.();
      } else {
        showToast?.('Error al eliminar insumo', 'error');
      }
    } catch (e) {
      showToast?.('Error de conexión al eliminar', 'error');
    }
  };

  // Borrar masivo
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const tenantId = getActiveRestaurant()?.id || 1;
    try {
      const res = await fetch('/api/insumos/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-restaurante-id': String(tenantId)
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        showToast?.(`Se eliminaron ${selectedIds.length} insumos con éxito.`, 'success');
        setSelectedIds([]);
        setBulkDeleteModalOpen(false);
        onRefresh?.();
      } else {
        showToast?.('Error al eliminar insumos seleccionados', 'error');
      }
    } catch (e) {
      showToast?.('Error de red al eliminar insumos', 'error');
    }
  };

  // Badges estilizados por estado (Sin Stock en gris elegante)
  const renderStatusBadge = (estado) => {
    switch (estado) {
      case 'Bueno':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-[#15803D] bg-[#DCFCE7] dark:text-emerald-300 dark:bg-emerald-950/70 border border-emerald-500/20">
            Bueno
          </span>
        );
      case 'Bajo Stock':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-[#B45309] bg-[#FEF3C7] dark:text-amber-300 dark:bg-amber-950/70 border border-amber-500/20">
            Bajo Stock
          </span>
        );
      case 'Sin Stock':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-slate-200/80 dark:text-slate-300 dark:bg-slate-800 border border-slate-400/20">
            Sin Stock
          </span>
        );
      case 'Vencido':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-[#991B1B] bg-[#FFE4E6] dark:text-rose-300 dark:bg-rose-950/70 border border-rose-500/20">
            Vencido
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. Header con Título y Fecha dinámica */}
      <header className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Volver"
          title="Volver"
          className="mt-0.5 w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight font-sans">
            Gestión de Inventario
          </h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400 font-sans">
            {formatTodaySpanish()}
          </p>
        </div>
      </header>

      {/* 2. KPIs Row con filtro interactivo al hacer clic */}
      <section aria-label="Resumen de inventario" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        {/* KPI 1: Insumos Totales */}
        <button
          type="button"
          onClick={() => handleKpiClick('Todos')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[146px] ${
            statusFilter === 'Todos'
              ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F4EA] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[#137333] dark:text-emerald-400" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              Insumos Totales
            </h2>
          </div>
          <div className="mt-4">
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Total de insumos en stock
            </p>
            <p className="mt-2 text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
              {kpiData.total}
            </p>
          </div>
        </button>

        {/* KPI 2: Insumos Bajo Stock */}
        <button
          type="button"
          onClick={() => handleKpiClick('Bajo Stock')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[146px] ${
            statusFilter === 'Bajo Stock'
              ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/60 flex items-center justify-center shrink-0">
              <Gauge className="w-5 h-5 text-[#D97706] dark:text-amber-400" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              Insumos Bajo Stock
            </h2>
          </div>
          <div className="mt-4">
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Insumos que se están agotando (≤ 10)
            </p>
            <p className="mt-2 text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
              {kpiData.bajoStock}
            </p>
          </div>
        </button>

        {/* KPI 3: Insumos Vencidos */}
        <button
          type="button"
          onClick={() => handleKpiClick('Vencido')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[146px] ${
            statusFilter === 'Vencido'
              ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] dark:bg-rose-950/60 flex items-center justify-center shrink-0">
              <ClockAlert className="w-5 h-5 text-[#DC2626] dark:text-rose-400" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              Insumos Vencidos
            </h2>
          </div>
          <div className="mt-4">
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Insumos que pasaron su fecha ({'>'} 3 meses)
            </p>
            <p className="mt-2 text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
              {kpiData.vencidos}
            </p>
          </div>
        </button>

        {/* KPI 4: Insumos Sin Stock */}
        <button
          type="button"
          onClick={() => handleKpiClick('Sin Stock')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[146px] ${
            statusFilter === 'Sin Stock'
              ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-slate-800 flex items-center justify-center shrink-0">
              <PackageX className="w-5 h-5 text-[#374151] dark:text-slate-300" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              Insumos Sin Stock
            </h2>
          </div>
          <div className="mt-4">
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Cantidad de insumos actualmente sin stock (0)
            </p>
            <p className="mt-2 text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
              {kpiData.sinStock}
            </p>
          </div>
        </button>
      </section>

      {/* 3. Card Principal: Vista General de Inventario */}
      <section
        aria-label="Vista General de Inventario"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden"
      >
        {/* Toolbar Superior */}
        <div className="px-5 sm:px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight">
              Vista General de Inventario
            </h2>

            {/* Pill de Selección Masiva */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-fade-in">
                <span className="tabular-nums font-semibold">
                  {selectedIds.length} {selectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setBulkDeleteModalOpen(true)}
                  className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  Borrar seleccionados
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>

          {/* Controles: Buscador, Filtros y Nuevo Insumo */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Buscador limpio sin bordes oscuros */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar insumo o almacén..."
                aria-label="Buscar insumo"
                className="w-full pl-9 pr-8 py-2 text-[13px] rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Botón Filtros Desplegable */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((prev) => !prev)}
                aria-expanded={filterDropdownOpen}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-[var(--primary)] text-white tabular-nums">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    filterDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Panel Desplegable de Filtros */}
              {filterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 z-50 space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Filtrar Inventario
                    </span>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('Todos');
                          setAlmacenFilter('Todos');
                          setCurrentPage(1);
                        }}
                        className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>

                  {/* Filtro por Estado */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                      Estado
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ESTADOS_DISPONIBLES.map((st) => {
                        const isSelected = statusFilter === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setStatusFilter(st);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filtro por Almacén */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                      Almacén
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Todos', ...ALMACENES_DISPONIBLES].map((alm) => {
                        const isSelected = almacenFilter === alm;
                        return (
                          <button
                            key={alm}
                            type="button"
                            onClick={() => {
                              setAlmacenFilter(alm);
                              setCurrentPage(1);
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {alm}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botón Nuevo Insumo - Estilo Pill Superadmin con color de tema */}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md border-0 active:scale-95 text-white"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo Insumo</span>
            </button>
          </div>
        </div>

        {/* Resumen de filtros aplicados */}
        {(activeFiltersCount > 0 || searchQuery.trim() !== '') && (
          <div className="px-5 sm:px-6 pb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Resultados:{' '}
              <strong className="text-slate-800 dark:text-slate-200 tabular-nums font-semibold">
                {filteredInsumos.length}
              </strong>{' '}
              de {enrichedInsumos.length}
            </span>
            {statusFilter !== 'Todos' && (
              <>
                <span aria-hidden="true">·</span>
                <span>Estado: <strong>{statusFilter}</strong></span>
              </>
            )}
            {almacenFilter !== 'Todos' && (
              <>
                <span aria-hidden="true">·</span>
                <span>Almacén: <strong>{almacenFilter}</strong></span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('Todos');
                setAlmacenFilter('Todos');
                setCurrentPage(1);
              }}
              className="text-[var(--primary)] hover:underline font-bold cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        )}

        {/* 4. Tabla de Insumos con Cabecera del Color del Tema */}
        {filteredInsumos.length === 0 ? (
          <div className="px-6 py-16 text-center border-t border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
              <PackageOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No se encontraron insumos
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No hay registros que coincidan con tu búsqueda o con los filtros seleccionados.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('Todos');
                  setAlmacenFilter('Todos');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 text-xs font-semibold rounded-full text-white cursor-pointer shadow-sm"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                + Nuevo Insumo
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr
                  className="text-xs font-bold uppercase tracking-wider text-white select-none"
                  style={{ background: 'var(--primary)', color: '#ffffff' }}
                >
                  {/* Columna Checkbox */}
                  <th className="py-3 pl-5 pr-2 w-12 text-center" style={{ borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAllPage}
                        aria-label="Seleccionar todos los de esta página"
                        className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                          allPageSelected || somePageSelected
                            ? 'bg-white text-[var(--primary)] border-white'
                            : 'bg-white/20 border-white/50 hover:bg-white/30'
                        }`}
                      >
                        {allPageSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        {somePageSelected && <Minus className="w-3 h-3 stroke-[3]" />}
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Cantidad</th>
                  <th className="py-3 px-4">Almacén</th>
                  <th className="py-3 px-4">Última Actualización</th>
                  <th className="py-3 px-4">Estado</th>
                  <th
                    className="py-3 pr-6 pl-4 text-center w-20"
                    style={{ borderTopRightRadius: 10, borderBottomRightRadius: 10 }}
                  >
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[13px]">
                {paginatedItems.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);

                  // Items de acción para SmoothDropdown
                  const dropdownActions = [
                    { id: 'edit', label: 'Editar', icon: Pencil },
                    { id: 'delete', label: 'Borrar', icon: Trash2, isDestructive: true }
                  ];

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-100 ${
                        isSelected
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Checkbox individual */}
                      <td className="py-3.5 pl-5 pr-2 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectItem(item.id)}
                            aria-label={`Seleccionar ${item.nombre}`}
                            className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                              isSelected
                                ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        </div>
                      </td>

                      {/* Nombre */}
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span>{item.nombre}</span>
                          {item.notificarAlerta && item.stock <= item.stockMinimo && (
                            <span title={`Alerta de stock mínimo (${item.stockMinimo})`} className="text-amber-500">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cantidad */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold tabular-nums font-mono whitespace-nowrap">
                        {Number(item.stock).toFixed(2)} {item.unidadMedida}
                      </td>

                      {/* Almacén */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                        {item.almacen}
                      </td>

                      {/* Última Actualización */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap text-xs">
                        {item.formattedFecha}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(item.estado)}
                      </td>

                      {/* Acción con SmoothDropdown */}
                      <td className="py-3.5 pr-6 pl-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center h-9">
                          <SmoothDropdown
                            id={item.id}
                            dropUp={index >= Math.max(1, paginatedItems.length - 3)}
                            compact={true}
                            items={dropdownActions}
                            onAction={(actionId) => {
                              if (actionId === 'edit') {
                                handleOpenEdit(item);
                              } else if (actionId === 'delete') {
                                handleDeleteSingle(item);
                              }
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

        {/* 5. Paginación de Arqueo de Caja */}
        {totalPages > 0 && (
          <div
            className="p-3 bg-transparent relative flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-sans"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <span className="font-semibold text-[var(--text-muted)] select-none">
              Mostrando {startItem}-{endItem} de {filteredInsumos.length} insumos
            </span>

            <div className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                title="Primera página"
                aria-label="Primera página"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
              >
                <ChevronFirst className="w-4 h-4 text-[var(--text-main)]" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                title="Página anterior"
                aria-label="Página anterior"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 text-[var(--text-main)]" />
              </button>

              <span className="font-bold text-[var(--text-main)] px-2 select-none whitespace-nowrap text-xs">
                Página {safePage} de {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                title="Página siguiente"
                aria-label="Página siguiente"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
              >
                <ChevronRight className="w-4 h-4 text-[var(--text-main)]" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                title="Última página"
                aria-label="Última página"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
              >
                <ChevronLast className="w-4 h-4 text-[var(--text-main)]" />
              </button>
            </div>

            <div className="hidden sm:block sm:w-28" />
          </div>
        )}
      </section>

      {/* MODAL: Nuevo Insumo / Editar Insumo con CloseButton */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-left"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#0f1016] rounded-3xl p-6 shadow-2xl relative border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/80 mb-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {modalMode === 'create' ? 'Nuevo Insumo' : 'Editar Insumo'}
              </h3>
              <CloseButton onClick={() => setIsModalOpen(false)} />
            </div>

            <form onSubmit={handleSaveInsumo} className="space-y-4">
              {formError && (
                <div className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-700 dark:text-red-300">
                  {formError}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre del Insumo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Carne de Res (Lomo), Harina, Leche..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                />
              </div>

              {/* Cantidad y Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cantidad / Stock *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-white tabular-nums font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unidad de Medida
                  </label>
                  <select
                    value={formData.unidadMedida}
                    onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] cursor-pointer"
                  >
                    {UNIDADES_DISPONIBLES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Almacén y Costo Unitario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Almacén *
                  </label>
                  <select
                    value={formData.almacen}
                    onChange={(e) => setFormData({ ...formData, almacen: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] cursor-pointer font-medium"
                  >
                    {ALMACENES_DISPONIBLES.map((alm) => (
                      <option key={alm} value={alm}>
                        {alm}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Costo Unitario (S/.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precioCompra}
                    onChange={(e) => setFormData({ ...formData, precioCompra: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-slate-900 dark:text-white tabular-nums font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Stock Mínimo y Notificación */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formData.notificarAlerta}
                    onChange={(e) => setFormData({ ...formData, notificarAlerta: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--primary)] cursor-pointer"
                  />
                  <span>Activar alerta por stock crítico</span>
                </label>
                {formData.notificarAlerta && (
                  <div className="pt-2 animate-fade-in">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Stock mínimo de seguridad
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.stockMinimo}
                      onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                      placeholder="Ej. 10.00"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white tabular-nums font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Botones de Acción Estilo Pill */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-bold border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {modalMode === 'create' ? 'Guardar Insumo' : 'Actualizar Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Borrado Individual */}
      {insumoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-left"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={() => setInsumoToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0f1016] rounded-3xl p-6 shadow-2xl relative border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Eliminar Insumo
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 mb-6 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente el insumo{' '}
              <strong className="text-slate-900 dark:text-white font-bold">"{insumoToDelete.nombre}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInsumoToDelete(null)}
                className="px-5 py-2 rounded-full text-xs font-bold border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingle}
                className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Borrado Masivo */}
      {bulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in text-left"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={() => setBulkDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0f1016] rounded-3xl p-6 shadow-2xl relative border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Eliminar Insumos Seleccionados
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Eliminación por lote
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 mb-6 leading-relaxed">
              ¿Estás seguro de que deseas eliminar los{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{selectedIds.length} insumos</strong>{' '}
              seleccionados? Esta operación es definitiva.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-5 py-2 rounded-full text-xs font-bold border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Eliminar {selectedIds.length} insumos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
