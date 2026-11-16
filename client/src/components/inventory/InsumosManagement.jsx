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
  AlertTriangle,
  Eye,
  Download,
  Upload,
  Warehouse,
  ArrowRightLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import SmoothDropdown from '../ui/SmoothDropdown';
import CloseButton from '../ui/CloseButton';
import CustomCheckbox from '../ui/CustomCheckbox';
import ToggleSwitch from '../ui/ToggleSwitch';
import { InsumoModal } from './InsumoModal';
import { InsumoDetailsModal } from './InsumoDetailsModal';
import { ImportReportModal } from './ImportReportModal';
import { AlmacenesModal } from './AlmacenesModal';
import { MoveAlmacenModal } from './MoveAlmacenModal';
import { ImportInventoryTraceModal } from './ImportInventoryTraceModal';
import { analyzeInventoryExcelFile } from '../../utils/inventoryExcel';
import { areNamesMatching } from '../../utils/textMatching';
import { getActiveRestaurant } from '../../utils/tenant';

const DEFAULT_ALMACENES = ['Congelador', 'Congelador 2', 'Alacena', 'Refrigerador'];
const UNIDADES_DISPONIBLES = ['kg', 'L', 'und', 'g'];
const ESTADOS_DISPONIBLES = ['Todos', 'Bueno', 'Bajo Stock', 'Sin Stock', 'Vencido'];
const PAGE_SIZE = 10;

// Fallback para almacén y fecha
function getInsumoAlmacen(item, index, availableAlmacenes = DEFAULT_ALMACENES) {
  if (item.almacen) return item.almacen;
  return availableAlmacenes[(item.id || index) % availableAlmacenes.length] || 'Congelador';
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

  // Estado centralizado y persistente de Almacenes
  const [almacenes, setAlmacenes] = useState(() => {
    try {
      const saved = localStorage.getItem('bunker_almacenes_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_ALMACENES;
  });

  const [almacenesModalOpen, setAlmacenesModalOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); // { ids: [], label: '', currentAlmacen?: '' }

  // Sincronizar almacenes con insumos si vinieran almacenes adicionales de la base de datos
  useEffect(() => {
    if (insumos && insumos.length > 0) {
      setAlmacenes((prev) => {
        const set = new Set(prev);
        let changed = false;
        insumos.forEach((i) => {
          if (i.almacen && !set.has(i.almacen)) {
            set.add(i.almacen);
            changed = true;
          }
        });
        const updated = Array.from(set);
        if (changed) {
          try {
            localStorage.setItem('bunker_almacenes_list', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        }
        return prev;
      });
    }
  }, [insumos]);

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
  const [detailsInsumo, setDetailsInsumo] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [importAnalysis, setImportAnalysis] = useState(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [insumoToDelete, setInsumoToDelete] = useState(null);
  const importInputRef = useRef(null);

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
      const almacen = getInsumoAlmacen(item, idx, almacenes);
      const estado = calculateInsumoStatus(item.stock, fecha);
      return {
        ...item,
        almacen,
        fechaActualizacion: fecha,
        estado,
        formattedFecha: formatSpanishDate(fecha)
      };
    });
  }, [insumos, almacenes]);

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
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setEditingInsumo(item);
    setIsModalOpen(true);
  };

  // Guardar insumo (creación / edición / autocoincidencia palabra por palabra)
  const handleSaveInsumoModal = async (savedData) => {
    const tenantId = getActiveRestaurant()?.id || 1;
    const isEdit = modalMode === 'edit' || Boolean(savedData.isExistingMatch);
    const targetId = savedData.id || (savedData.matchedInsumo ? savedData.matchedInsumo.id : (editingInsumo ? editingInsumo.id : null));
    const url = (isEdit && targetId) ? `/api/insumos/${targetId}` : '/api/insumos';
    const method = (isEdit && targetId) ? 'PUT' : 'POST';

    const payload = {
      nombre: savedData.nombre,
      stock: savedData.stock,
      unidadMedida: savedData.unidadMedida,
      precioCompra: savedData.precioCompra,
      stockMinimo: savedData.stockMinimo,
      notificarAlerta: savedData.notificarAlerta,
      almacen: savedData.almacen
    };

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
        isEdit
          ? `Insumo "${savedData.nombre}" actualizado con éxito.`
          : `Insumo "${savedData.nombre}" registrado con éxito.`,
        'success'
      );
      setIsModalOpen(false);
      setEditingInsumo(null);
      onRefresh?.();
    } catch (err) {
      showToast?.(err.message || 'Error de conexión', 'error');
    }
  };

  // Handlers de Almacenes y Traslados
  const handleAddAlmacen = (nombre) => {
    const clean = nombre.trim();
    if (!clean) return;
    setAlmacenes((prev) => {
      const next = [...prev, clean];
      try { localStorage.setItem('bunker_almacenes_list', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    showToast?.(`Almacén "${clean}" creado con éxito.`, 'success');
  };

  const handleRenameAlmacen = async (oldName, newName) => {
    const clean = newName.trim();
    if (!clean || oldName === clean) return;
    const tenantId = getActiveRestaurant()?.id || 1;

    setAlmacenes((prev) => {
      const next = prev.map((a) => (a === oldName ? clean : a));
      try { localStorage.setItem('bunker_almacenes_list', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    if (almacenFilter === oldName) {
      setAlmacenFilter(clean);
    }

    try {
      await fetch('/api/insumos/rename-almacen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-restaurante-id': String(tenantId)
        },
        body: JSON.stringify({ oldName, newName: clean })
      });
      showToast?.(`Almacén "${oldName}" renombrado a "${clean}".`, 'success');
      onRefresh?.();
    } catch (e) {
      showToast?.(`Almacén "${oldName}" renombrado.`, 'success');
    }
  };

  const handleDeleteAlmacen = async (name, targetAlmacen) => {
    const tenantId = getActiveRestaurant()?.id || 1;

    setAlmacenes((prev) => {
      const next = prev.filter((a) => a !== name);
      try { localStorage.setItem('bunker_almacenes_list', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    if (almacenFilter === name) {
      setAlmacenFilter('Todos');
    }

    try {
      await fetch('/api/insumos/delete-almacen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-restaurante-id': String(tenantId)
        },
        body: JSON.stringify({ name, targetAlmacen })
      });
      showToast?.(
        targetAlmacen
          ? `Almacén "${name}" eliminado y sus insumos trasladados a "${targetAlmacen}".`
          : `Almacén "${name}" eliminado.`,
        'success'
      );
      onRefresh?.();
    } catch (e) {
      showToast?.(`Almacén "${name}" eliminado.`, 'success');
    }
  };

  const handleConfirmMoveAlmacen = async (targetAlmacen) => {
    if (!moveTarget) return;
    const tenantId = getActiveRestaurant()?.id || 1;
    const numericIds = moveTarget.ids.map((id) => parseInt(id)).filter((id) => !isNaN(id));

    try {
      const res = await fetch('/api/insumos/bulk-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-restaurante-id': String(tenantId)
        },
        body: JSON.stringify({ ids: numericIds, targetAlmacen })
      });

      if (res.ok) {
        showToast?.(
          moveTarget.ids.length > 1
            ? `${moveTarget.ids.length} insumos trasladados a "${targetAlmacen}".`
            : `Insumo "${moveTarget.label}" trasladado a "${targetAlmacen}".`,
          'success'
        );
        onRefresh?.();
      } else {
        showToast?.('Error al trasladar insumo(s)', 'error');
      }
    } catch (e) {
      showToast?.('Error de conexión al trasladar', 'error');
    } finally {
      setSelectedIds([]);
      setMoveTarget(null);
    }
  };

  // Descargar Plantilla Excel preconfigurada
  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/plantilla_inventario_bunker.xlsx';
    link.download = 'plantilla_inventario_bunker.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) showToast('Plantilla Excel descargada.', 'success');
  };

  // Importar Excel con análisis previo y modal de trazabilidad
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const analysis = await analyzeInventoryExcelFile(file, almacenes, enrichedInsumos);
      setImportAnalysis(analysis);
    } catch (err) {
      console.error('Error al analizar archivo Excel:', err);
      showToast?.('Error al leer el archivo Excel seleccionado.', 'error');
    }
  };

  // Confirmar e importar filas válidas con persistencia a base de datos
  const handleConfirmInventoryImport = async (validRows) => {
    if (!validRows || validRows.length === 0) return;

    // Registra automáticamente almacenes nuevos detectados en las filas válidas
    setAlmacenes((prev) => {
      const existingLower = new Set(prev.map((a) => a.trim().toLowerCase()));
      const additions = [];
      for (const row of validRows) {
        const clean = (row.almacen || '').trim();
        if (clean && !existingLower.has(clean.toLowerCase())) {
          existingLower.add(clean.toLowerCase());
          additions.push(clean);
        }
      }
      if (additions.length > 0) {
        const updated = [...prev, ...additions];
        try {
          localStorage.setItem('bunker_almacenes_list', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      }
      return prev;
    });

    // Guardar en la base de datos backend
    const tenantId = getActiveRestaurant()?.id || 1;
    let savedCount = 0;
    for (const row of validRows) {
      try {
        await fetch('/api/insumos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-restaurante-id': String(tenantId)
          },
          body: JSON.stringify({
            nombre: row.nombre,
            stock: row.cantidad,
            unidadMedida: row.unidad,
            almacen: row.almacen,
            precioCompra: row.costoUnitario,
            notificarAlerta: Boolean(row.alertaStockCritico),
            stockMinimo: row.stockCriticoMin || 0
          })
        });
        savedCount++;
      } catch (err) {
        console.error('Error al persistir fila importada:', row.nombre, err);
      }
    }

    onRefresh?.();
    showToast?.(
      `${savedCount} ${savedCount === 1 ? 'insumo importado' : 'insumos importados'} correctamente.`,
      'success'
    );
  };

  // Cerrar modal de trazabilidad y pasar suavemente al reporte de observaciones si hubo errores
  const handleCloseTraceModal = () => {
    if (importAnalysis) {
      const { duplicateErrors = [], missingFieldErrors = [], validRows = [], totalRows = 0 } = importAnalysis;
      if (duplicateErrors.length > 0 || missingFieldErrors.length > 0) {
        setImportReport({
          total: totalRows,
          agregados: validRows,
          duplicados: duplicateErrors.map((d) => ({
            fila: d.rowNumber,
            nombre: d.nombre,
            coincideCon: d.problem
          })),
          incompletos: missingFieldErrors.map((m) => ({
            fila: m.rowNumber,
            motivo: `${m.field}: ${m.problem}`
          }))
        });
      }
    }
    setImportAnalysis(null);
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

  // Items de acción centralizados para SmoothDropdown (Desktop y Mobile)
  const dropdownActions = [
    { id: 'details', label: 'Detalles', icon: Eye },
    { id: 'move', label: 'Mover almacén', icon: ArrowRightLeft },
    { id: 'edit', label: 'Editar', icon: Pencil },
    { id: 'delete', label: 'Borrar', icon: Trash2, isDestructive: true }
  ];

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. Header con Título, Fecha dinámica y Botón Gestionar Almacenes */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight font-sans">
            Gestión de Inventario
          </h1>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400 font-sans">
            {formatTodaySpanish()}
          </p>
        </div>

        {/* Botón Almacenes */}
        <button
          type="button"
          onClick={() => setAlmacenesModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Warehouse className="w-4 h-4 text-[#F26522]" />
          <span>Almacenes ({almacenes.length})</span>
        </button>
      </header>

      {/* 2. KPIs Row: 2 cols móvil (2 filas de 2 cards) -> 4 cols desktop con tamaño notablemente reducido */}
      <section aria-label="Resumen de inventario" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Totales */}
        <button
          type="button"
          onClick={() => handleKpiClick('Todos')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[88px] sm:min-h-[146px] active:scale-[0.98] ${
            statusFilter === 'Todos'
              ? 'border-[#10B981] ring-2 ring-[#10B981]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#E6F4EA] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-[#137333] dark:text-emerald-400" />
            </div>
            <h2 className="text-xs sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
              Totales
            </h2>
          </div>
          <div className="mt-1.5 sm:mt-4">
            <p className="hidden sm:block text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Total de insumos en stock
            </p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
              {kpiData.total}
            </p>
          </div>
        </button>

        {/* KPI 2: Bajo Stock */}
        <button
          type="button"
          onClick={() => handleKpiClick('Bajo Stock')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[88px] sm:min-h-[146px] active:scale-[0.98] ${
            statusFilter === 'Bajo Stock'
              ? 'border-[#10B981] ring-2 ring-[#10B981]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#FEF3C7] dark:bg-amber-950/60 flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-[#D97706] dark:text-amber-400" />
            </div>
            <h2 className="text-xs sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
              Bajo Stock
            </h2>
          </div>
          <div className="mt-1.5 sm:mt-4">
            <p className="hidden sm:block text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Insumos agotándose (≤ 10)
            </p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
              {kpiData.bajoStock}
            </p>
          </div>
        </button>

        {/* KPI 3: Vencidos */}
        <button
          type="button"
          onClick={() => handleKpiClick('Vencido')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[88px] sm:min-h-[146px] active:scale-[0.98] ${
            statusFilter === 'Vencido'
              ? 'border-[#10B981] ring-2 ring-[#10B981]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#FEE2E2] dark:bg-rose-950/60 flex items-center justify-center shrink-0">
              <ClockAlert className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626] dark:text-rose-400" />
            </div>
            <h2 className="text-xs sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
              Vencidos
            </h2>
          </div>
          <div className="mt-1.5 sm:mt-4">
            <p className="hidden sm:block text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Insumos pasados ({'>'} 3 meses)
            </p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
              {kpiData.vencidos}
            </p>
          </div>
        </button>

        {/* KPI 4: Sin Stock */}
        <button
          type="button"
          onClick={() => handleKpiClick('Sin Stock')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-5 transition-all duration-150 cursor-pointer border flex flex-col justify-between min-h-[88px] sm:min-h-[146px] active:scale-[0.98] ${
            statusFilter === 'Sin Stock'
              ? 'border-[#10B981] ring-2 ring-[#10B981]/20 shadow-sm'
              : 'border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F3F4F6] dark:bg-slate-800 flex items-center justify-center shrink-0">
              <PackageX className="w-4 h-4 sm:w-5 sm:h-5 text-[#374151] dark:text-slate-300" />
            </div>
            <h2 className="text-xs sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 leading-snug truncate">
              Sin Stock
            </h2>
          </div>
          <div className="mt-1.5 sm:mt-4">
            <p className="hidden sm:block text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              Insumos agotados (0)
            </p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none font-mono">
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
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-fade-in flex-wrap">
                <span className="tabular-nums font-semibold">
                  {selectedIds.length} {selectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() =>
                    setMoveTarget({
                      ids: selectedIds,
                      label: `${selectedIds.length} insumos`,
                    })
                  }
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Mover a almacén</span>
                </button>
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

          {/* Controles: Buscador completo en móvil, Filtros y Nuevo Insumo debajo en fila */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Buscador: ancho completo en móvil (w-full), ancho fijo en desktop (sm:w-64) */}
            <div className="relative w-full sm:w-64">
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
                className="w-full pl-9 pr-8 py-2.5 sm:py-2 text-[13px] rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
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

            {/* Fila debajo del buscador en móvil: Filtros y Nuevo Insumo ordenados */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Botón Filtros Desplegable */}
              <div className="relative flex-1 sm:flex-initial" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setFilterDropdownOpen((prev) => !prev)}
                  aria-expanded={filterDropdownOpen}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-[13px] font-semibold rounded-full border transition-all whitespace-nowrap cursor-pointer active:scale-95 shadow-sm ${
                    activeFiltersCount > 0
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
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

                {/* Panel Desplegable de Filtros: Centrado en pantalla en móvil con Backdrop, Dropdown clásico en Desktop */}
                {filterDropdownOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none sm:p-0 sm:inset-auto sm:absolute sm:right-0 sm:mt-2 sm:w-72 animate-fade-in"
                    onClick={() => setFilterDropdownOpen(false)}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-w-sm sm:max-w-none sm:w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 space-y-4 text-left"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Filtrar Inventario
                        </span>
                        <div className="flex items-center gap-2">
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
                              Limpiar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setFilterDropdownOpen(false)}
                            aria-label="Cerrar filtros"
                            className="sm:hidden w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
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
                          {['Todos', ...almacenes].map((alm) => {
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

                      {/* Botón Aplicar en móvil */}
                      <div className="sm:hidden pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setFilterDropdownOpen(false)}
                          className="w-full py-2.5 rounded-full text-xs font-bold text-white shadow-sm cursor-pointer active:scale-95 transition-all text-center"
                          style={{ backgroundColor: 'var(--primary)' }}
                        >
                          Aplicar Filtros
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón Descargar Plantilla */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-4 py-2.5 sm:py-2 rounded-full border-0 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Descargar Plantilla</span>
              </button>

              {/* Input archivo oculto */}
              <input
                type="file"
                ref={importInputRef}
                onChange={handleImportExcel}
                accept=".xlsx,.xls"
                className="hidden"
              />

              {/* Botón Importar Excel */}
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="px-4 py-2.5 sm:py-2 rounded-full border-0 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Importar Excel</span>
              </button>

              {/* Botón Nuevo Insumo - Estilo Pill Superadmin con color de tema */}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md border-0 active:scale-95 text-white whitespace-nowrap"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuevo Insumo</span>
              </button>
            </div>
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
          <>
            {/* Vista Tabla Desktop (md+) - 100% Inalterada */}
            <div className="hidden md:block overflow-x-auto">
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
                                if (actionId === 'details') {
                                  setDetailsInsumo(item);
                                } else if (actionId === 'move') {
                                  setMoveTarget({
                                    ids: [item.id],
                                    label: item.nombre,
                                    currentAlmacen: item.almacen
                                  });
                                } else if (actionId === 'edit') {
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

            {/* Sub-toolbar móvil para selección masiva */}
            <div className="md:hidden px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-slate-700 dark:text-slate-300">
                <CustomCheckbox
                  checked={allPageSelected}
                  onChange={handleToggleSelectAllPage}
                />
                <span>Seleccionar página ({paginatedItems.length})</span>
              </label>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setMoveTarget({
                        ids: selectedIds,
                        label: `${selectedIds.length} insumos`,
                      })
                    }
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Mover</span>
                  </button>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteModalOpen(true)}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Borrar ({selectedIds.length})
                  </button>
                </div>
              )}
            </div>

            {/* Vista Tarjetas Celular (< md) con SmoothDropdown y Botones Táctiles */}
            <div className="md:hidden border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedItems.map((item, index) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="pt-0.5 shrink-0">
                          <CustomCheckbox
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(item.id)}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-[14px] sm:text-[15px] font-bold text-slate-900 dark:text-white truncate">
                              {item.nombre}
                            </h3>
                            {item.notificarAlerta && item.stock <= item.stockMinimo && (
                              <span title={`Alerta de stock mínimo (${item.stockMinimo})`} className="text-amber-500 shrink-0">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            {renderStatusBadge(item.estado)}
                          </div>
                        </div>
                      </div>

                      {/* Acción con SmoothDropdown */}
                      <div className="shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                        <SmoothDropdown
                          id={`mobile-${item.id}`}
                          dropUp={index >= Math.max(1, paginatedItems.length - 2)}
                          compact={false}
                          items={dropdownActions}
                          onAction={(actionId) => {
                            if (actionId === 'details') {
                              setDetailsInsumo(item);
                            } else if (actionId === 'move') {
                              setMoveTarget({
                                ids: [item.id],
                                label: item.nombre,
                                currentAlmacen: item.almacen
                              });
                            } else if (actionId === 'edit') {
                              handleOpenEdit(item);
                            } else if (actionId === 'delete') {
                              handleDeleteSingle(item);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 pl-8 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Cantidad</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums font-mono">
                          {Number(item.stock).toFixed(2)} {item.unidadMedida}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Almacén</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                          {item.almacen}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 text-[11px] block">Última Actualización</span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums text-[11.5px]">
                          {item.formattedFecha}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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

      {/* MODAL: Nuevo Insumo / Editar Insumo con ToggleSwitch y word matching */}
      <InsumoModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialInsumo={editingInsumo}
        existingInsumos={enrichedInsumos}
        almacenes={almacenes}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInsumo(null);
        }}
        onSave={handleSaveInsumoModal}
      />

      {/* MODAL: Gestionar Almacenes */}
      <AlmacenesModal
        isOpen={almacenesModalOpen}
        almacenes={almacenes}
        insumos={enrichedInsumos}
        onClose={() => setAlmacenesModalOpen(false)}
        onAddAlmacen={handleAddAlmacen}
        onRenameAlmacen={handleRenameAlmacen}
        onDeleteAlmacen={handleDeleteAlmacen}
      />

      {/* MODAL: Mover a otro almacén */}
      <MoveAlmacenModal
        isOpen={moveTarget !== null}
        selectedCount={moveTarget?.ids?.length ?? 1}
        label={moveTarget?.label ?? ''}
        currentAlmacen={moveTarget?.currentAlmacen}
        almacenes={almacenes}
        onClose={() => setMoveTarget(null)}
        onConfirmMove={handleConfirmMoveAlmacen}
      />

      {/* MODAL: Detalles del Insumo (platos del menú asociados) */}
      <InsumoDetailsModal
        isOpen={Boolean(detailsInsumo)}
        insumo={detailsInsumo}
        onClose={() => setDetailsInsumo(null)}
      />

      {/* MODAL: Reporte de Importación Excel */}
      <ImportReportModal
        isOpen={Boolean(importReport)}
        report={importReport}
        onClose={() => setImportReport(null)}
      />

      {/* MODAL: Trazabilidad y Progreso de Importación Excel */}
      <ImportInventoryTraceModal
        isOpen={importAnalysis !== null}
        analysis={importAnalysis}
        onClose={handleCloseTraceModal}
        onConfirmImport={handleConfirmInventoryImport}
      />

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
