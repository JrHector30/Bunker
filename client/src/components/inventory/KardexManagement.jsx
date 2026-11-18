import React, { useState, useMemo } from 'react';
import {
  Download,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  User,
  SlidersHorizontal,
  ListFilter,
  Layers,
  ReceiptText,
  Package,
  List,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { FilterCombobox } from './FilterCombobox';
import CloseButton from '../ui/CloseButton';
import { DropdownRangeDatePicker } from '../DropdownRangeDatePicker';

const TYPE_STYLE = {
  VENTA: {
    badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
    text: 'text-[#F26522]',
  },
  ENTRADA: {
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  MERMA: {
    badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    text: 'text-rose-600 dark:text-rose-400',
  },
  AJUSTE: {
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
  },
  COMPRA: {
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
};

function formatSignedQty(cantidad, unidad) {
  const num = Number(cantidad) || 0;
  const sign = num > 0 ? '+' : '';
  return `${sign}${num} ${unidad || ''}`.trim();
}

function parseMotivo(motivo) {
  if (!motivo) return { line1: 'Sin motivo especificado', line2: null };
  const splitIdx = motivo.indexOf(' - Plato:');
  if (splitIdx !== -1) {
    return {
      line1: motivo.slice(0, splitIdx).trim(),
      line2: `Plato: ${motivo.slice(splitIdx + 9)}`.trim(),
    };
  }
  const dashIdx = motivo.indexOf(' - ');
  if (dashIdx !== -1) {
    return {
      line1: motivo.slice(0, dashIdx).trim(),
      line2: motivo.slice(dashIdx + 3).trim(),
    };
  }
  return { line1: motivo, line2: null };
}

export default function KardexManagement({
  kardex = [],
  insumos = [],
  user,
  fetchKardex,
  fetchInsumos,
  showToast,
  onBack,
  dateRange,
  setDateRange,
}) {
  // Filters & UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos'); // 'Todos' | 'VENTA' | 'ENTRADA' | 'MERMA'
  const [userFilter, setUserFilter] = useState('Todos');
  const [viewMode, setViewMode] = useState('agrupado'); // 'agrupado' | 'detallado'
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    insumoId: '',
    tipoMovimiento: 'MERMA',
    cantidad: '',
    motivo: '',
  });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Calculate running balances per insumo (stockAnterior & stockNuevo)
  const enrichedMovements = useMemo(() => {
    if (!kardex || !Array.isArray(kardex)) return [];

    const byInsumo = new Map();
    kardex.forEach((m) => {
      const id = m.insumoId;
      if (!byInsumo.has(id)) byInsumo.set(id, []);
      byInsumo.get(id).push(m);
    });

    const result = [];
    byInsumo.forEach((movs) => {
      const sorted = [...movs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      let currentStock = sorted[0]?.insumo?.stock != null ? Number(sorted[0].insumo.stock) : 0;

      sorted.forEach((m) => {
        const qty = Number(m.cantidad) || 0;
        const stockNuevo = Number(currentStock.toFixed(2));
        const stockAnterior = Number((currentStock - qty).toFixed(2));

        result.push({
          ...m,
          stockAnterior,
          stockNuevo,
        });

        currentStock = stockAnterior;
      });
    });

    return result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [kardex]);

  // 2. KPIs calculation
  const kpis = useMemo(() => {
    const all = enrichedMovements;
    let totalInKg = 0;
    let entradasCount = 0;
    let ventasCount = 0;
    let mermasCount = 0;

    all.forEach((m) => {
      const isPositive = ['COMPRA', 'ENTRADA', 'AJUSTE_POSITIVO'].includes(m.tipoMovimiento);
      const isVenta = m.tipoMovimiento === 'VENTA';
      const isMerma = ['MERMA', 'AJUSTE_NEGATIVO', 'AJUSTE', 'TRANSFERENCIA'].includes(m.tipoMovimiento);

      if (isPositive) {
        entradasCount++;
        totalInKg += Math.abs(Number(m.cantidad) || 0);
      } else if (isVenta) {
        ventasCount++;
      } else if (isMerma) {
        mermasCount++;
      }
    });

    return {
      total: all.length,
      totalInKg: Math.round(totalInKg),
      entradas: entradasCount,
      ventas: ventasCount,
      mermas: mermasCount,
    };
  }, [enrichedMovements]);

  // 3. User combobox options
  const userOptions = useMemo(() => {
    const set = new Set();
    enrichedMovements.forEach((m) => {
      if (m.usuario?.nombre) set.add(m.usuario.nombre);
    });
    const opts = [{ value: 'Todos', label: 'Todos los usuarios' }];
    Array.from(set)
      .sort()
      .forEach((name) => {
        opts.push({ value: name, label: name });
      });
    return opts;
  }, [enrichedMovements]);

  const typeOptions = [
    { value: 'Todos', label: 'Todos los tipos' },
    { value: 'VENTA', label: 'Salidas por Venta POS', indicatorClass: 'bg-[#F26522]' },
    { value: 'ENTRADA', label: 'Entradas / Compras', indicatorClass: 'bg-emerald-500' },
    { value: 'MERMA', label: 'Mermas y Ajustes', indicatorClass: 'bg-rose-500' },
  ];

  // 4. Filtering logic
  const filteredMovements = useMemo(() => {
    return enrichedMovements.filter((m) => {
      // Type Filter
      if (typeFilter !== 'Todos') {
        if (typeFilter === 'ENTRADA') {
          if (!['COMPRA', 'ENTRADA', 'AJUSTE_POSITIVO'].includes(m.tipoMovimiento)) return false;
        } else if (typeFilter === 'VENTA') {
          if (m.tipoMovimiento !== 'VENTA') return false;
        } else if (typeFilter === 'MERMA') {
          if (!['MERMA', 'AJUSTE_NEGATIVO', 'AJUSTE', 'TRANSFERENCIA'].includes(m.tipoMovimiento)) return false;
        } else if (m.tipoMovimiento !== typeFilter) {
          return false;
        }
      }

      // User Filter
      if (userFilter !== 'Todos') {
        const uName = m.usuario?.nombre || 'General / Sistema';
        if (uName !== userFilter) return false;
      }

      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const insumo = (m.insumo?.nombre || '').toLowerCase();
        const motivo = (m.motivo || '').toLowerCase();
        const usuario = (m.usuario?.nombre || '').toLowerCase();
        if (!insumo.includes(q) && !motivo.includes(q) && !usuario.includes(q)) {
          return false;
        }
      }

      // Date Range Filter
      if (dateRange && (dateRange.from || dateRange.to)) {
        const movDate = new Date(m.fecha);
        const d = new Date(movDate.getFullYear(), movDate.getMonth(), movDate.getDate());
        if (dateRange.from && dateRange.to) {
          const fromD = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
          const toD = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
          if (d < fromD || d > toD) return false;
        } else if (dateRange.from) {
          const fromD = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
          if (d.getTime() !== fromD.getTime()) return false;
        }
      }

      return true;
    });
  }, [enrichedMovements, typeFilter, userFilter, searchTerm, dateRange]);

  // 5. Grouped by Comanda / Operation
  const groupedComandas = useMemo(() => {
    const groups = [];
    const groupMap = new Map();

    filteredMovements.forEach((m) => {
      let key;
      let titulo = '';
      let subtitulo = '';
      const dateObj = new Date(m.fecha);
      const fechaHora = isNaN(dateObj.getTime())
        ? ''
        : dateObj.toLocaleString('es-PE', {
            dateStyle: 'short',
            timeStyle: 'medium',
          });
      const usuario = m.usuario?.nombre || 'General / Sistema';
      const isSinReceta = !!m.sinReceta;

      if (isSinReceta) {
        key = `SINRECETA-${m.id}`;
        titulo = `MERMA Comanda N° ${m.comandaNumero || 'S/N'} Plato: ${m.platoNombre || m.insumo?.nombre || 'Plato sin receta'}`;
        subtitulo = m.motivo || 'Anulación de pedido';
      } else if (m.tipoMovimiento === 'VENTA') {
        const match = m.motivo?.match(/Comanda N°\s*(\d+)/i);
        const comandaNum = match ? match[1] : null;
        const parsed = parseMotivo(m.motivo);
        const dateMinute = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 16) : '';

        key = comandaNum
          ? `VENTA-${comandaNum}-${parsed.line2 || ''}-${dateMinute}`
          : `VENTA-${m.id}`;

        titulo = comandaNum
          ? `Comanda N° ${comandaNum}${parsed.line2 ? ` · ${parsed.line2}` : ''}`
          : m.motivo || 'Venta POS';

        subtitulo = parsed.line1 || 'Venta POS';
      } else {
        const dateMinute = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 16) : '';
        key = `${m.tipoMovimiento}-${m.motivo || ''}-${dateMinute}-${usuario}`;
        titulo = `${m.insumo?.nombre || 'Insumo'} · ${m.motivo || m.tipoMovimiento}`;
        subtitulo = m.motivo || m.tipoMovimiento;
      }

      if (!groupMap.has(key)) {
        const groupObj = {
          key,
          tipo: m.tipoMovimiento,
          titulo,
          subtitulo,
          usuario,
          fechaHora,
          sinReceta: isSinReceta,
          items: [],
        };
        groupMap.set(key, groupObj);
        groups.push(groupObj);
      }

      if (!isSinReceta) {
        groupMap.get(key).items.push({
          id: m.id,
          insumo: m.insumo?.nombre || '-',
          stockAnterior: m.stockAnterior != null ? m.stockAnterior : '-',
          stockNuevo: m.stockNuevo != null ? m.stockNuevo : '-',
          unidad: m.insumo?.unidadMedida || '',
          usuario,
          cantidad: m.cantidad,
          fechaHora,
        });
      }
    });

    return groups;
  }, [filteredMovements]);

  // 6. Pagination
  const PAGE_SIZE = 10;
  const totalItems = viewMode === 'agrupado' ? groupedComandas.length : filteredMovements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageMovements = useMemo(() => {
    return filteredMovements.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [filteredMovements, safePage]);

  const pageGroups = useMemo(() => {
    return groupedComandas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [groupedComandas, safePage]);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, totalItems);

  // 7. KPI click handler
  const handleKpiClick = (type) => {
    if (type === 'TOTAL') {
      setTypeFilter('Todos');
    } else {
      setTypeFilter((prev) => (prev === type ? 'Todos' : type));
    }
    setCurrentPage(1);
  };

  // 8. Excel Export
  const handleExportExcel = () => {
    if (filteredMovements.length === 0) {
      showToast?.('No hay datos para exportar con los filtros seleccionados.', 'warning');
      return;
    }

    const exportData = filteredMovements.map((m) => {
      const isPositive = ['COMPRA', 'ENTRADA', 'AJUSTE_POSITIVO'].includes(m.tipoMovimiento);
      const sign = isPositive ? '+' : '';
      return {
        'Fecha y Hora': new Date(m.fecha).toLocaleString('es-PE'),
        Insumo: m.insumo?.nombre || '-',
        Tipo: m.tipoMovimiento,
        Variación: `${sign}${m.cantidad} ${m.insumo?.unidadMedida || ''}`,
        'Saldo Anterior': `${m.stockAnterior != null ? m.stockAnterior : '-'} ${m.insumo?.unidadMedida || ''}`,
        'Saldo Nuevo': `${m.stockNuevo != null ? m.stockNuevo : '-'} ${m.insumo?.unidadMedida || ''}`,
        Responsable: m.usuario?.nombre || 'General / Sistema',
        'Motivo / Comanda': m.motivo || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kardex');

    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    XLSX.writeFile(workbook, `Reporte_Kardex_${dateStr}.xlsx`);
    showToast?.('Reporte Excel generado correctamente.', 'success');
  };

  // 9. Manual movement submit
  const handleSaveManual = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!modalForm.insumoId) {
      setFormError('Debe seleccionar un insumo válido.');
      return;
    }
    if (!modalForm.cantidad || Number.isNaN(Number(modalForm.cantidad)) || Number(modalForm.cantidad) <= 0) {
      setFormError('La cantidad debe ser un número positivo.');
      return;
    }
    if (!modalForm.motivo.trim()) {
      setFormError('El motivo o justificación es requerido.');
      return;
    }
    if (!user || !user.id) {
      showToast?.('❌ Error: Usuario no autenticado', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        insumoId: Number(modalForm.insumoId),
        tipoMovimiento: modalForm.tipoMovimiento,
        cantidad: Number(modalForm.cantidad),
        motivo: modalForm.motivo.trim(),
        usuarioId: user.id,
      };

      const res = await fetch('/api/kardex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': localStorage.getItem('bunker_tenant_id') || '1',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast?.('Movimiento registrado en Kardex.', 'success');
        setIsManualModalOpen(false);
        setModalForm({ insumoId: '', tipoMovimiento: 'MERMA', cantidad: '', motivo: '' });
        fetchKardex?.();
        fetchInsumos?.();
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Error al guardar movimiento manual.');
      }
    } catch {
      setFormError('Error de conexión al registrar movimiento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in space-y-4">
      {/* ========================================================= */}
      {/* 1. HEADER WEB DE 2 NIVELES (Estilo Menú Platos)           */}
      {/* ========================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                Kardex de Inventario
              </h1>
              <span className="text-xs font-medium text-slate-400 tabular-nums">
                {enrichedMovements.length} movimientos
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Trazabilidad de entradas, descuentos automáticos por comanda y ajustes de stock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {setDateRange && (
            <DropdownRangeDatePicker
              mode="range"
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                setCurrentPage(1);
              }}
              placeholder="Filtrar por Fecha"
              triggerClassName="!w-auto min-h-[40px] text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800"
            />
          )}
          <button
            type="button"
            onClick={handleExportExcel}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border-0 bg-[#F26522] hover:bg-[#DC5616] text-white shadow-[0_6px_16px_-4px_rgba(242,101,34,0.45)] cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 4 TARJETAS KPI CLICABLES (Filtro rápido con 1 clic)    */}
      {/* ========================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="Indicadores de Kardex">
        {/* KPI 1: Movimientos Totales */}
        <button
          type="button"
          onClick={() => handleKpiClick('TOTAL')}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-4 transition-all cursor-pointer shadow-xs ${
            typeFilter === 'Todos'
              ? 'border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Movimientos Totales
            </span>
            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {kpis.total}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
            Registro auditado en tiempo real
          </p>
        </button>

        {/* KPI 2: Entradas / Compras */}
        <button
          type="button"
          onClick={() => handleKpiClick('ENTRADA')}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-4 transition-all cursor-pointer shadow-xs ${
            typeFilter === 'ENTRADA'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Entradas / Compras
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{kpis.totalInKg} kg
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
            {kpis.entradas} ingresos registrados
          </p>
        </button>

        {/* KPI 3: Salidas por Venta POS */}
        <button
          type="button"
          onClick={() => handleKpiClick('VENTA')}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-4 transition-all cursor-pointer shadow-xs ${
            typeFilter === 'VENTA'
              ? 'border-[#F26522] ring-2 ring-[#F26522]/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Salidas por Venta POS
            </span>
            <span className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#F26522] flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-[#F26522] tabular-nums">
            {kpis.ventas}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
            Descuento automático por receta
          </p>
        </button>

        {/* KPI 4: Mermas y Ajustes */}
        <button
          type="button"
          onClick={() => handleKpiClick('MERMA')}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-4 transition-all cursor-pointer shadow-xs ${
            typeFilter === 'MERMA'
              ? 'border-rose-500 ring-2 ring-rose-500/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Mermas y Ajustes
            </span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {kpis.mermas}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
            Desperdicios y cuadres de stock
          </p>
        </button>
      </section>

      {/* ========================================================= */}
      {/* 3. CARD PRINCIPAL CON TOOLBAR INTEGRADA                   */}
      {/* ========================================================= */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por insumo, comanda, plato o usuario..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#F26522] transition-colors"
            />
          </div>

          {/* Comboboxes + Segmented Toggle idéntico a Menú (Platos) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Combobox Tipo */}
            <FilterCombobox
              value={typeFilter}
              defaultValue="Todos"
              options={typeOptions}
              onChange={(val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              }}
              icon={SlidersHorizontal}
              ariaLabel="Filtrar por tipo"
            />

            {/* Combobox Usuario */}
            <FilterCombobox
              value={userFilter}
              defaultValue="Todos"
              options={userOptions}
              onChange={(val) => {
                setUserFilter(val);
                setCurrentPage(1);
              }}
              icon={User}
              ariaLabel="Filtrar por usuario"
            />

            {/* Toggle de vista (visible también en Mobile, seguro para preflight: false) */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 ml-auto xl:ml-0">
              <button
                type="button"
                onClick={() => {
                  setViewMode('agrupado');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg border-0 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'agrupado'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Por Comanda</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('detallado');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg border-0 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'detallado'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Detallado</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. VISTA WEB DETALLADA (CABECERAS ALINEADAS CON CONTENIDO) */}
        {/* ========================================================= */}
        {viewMode === 'detallado' && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F26522] text-white text-[11px] font-bold tracking-wider uppercase">
                  <th style={{ textAlign: 'left' }} className="py-3.5 px-5 text-left font-bold">
                    Fecha y Hora
                  </th>
                  <th style={{ textAlign: 'left' }} className="py-3.5 px-4 text-left font-bold">
                    Insumo
                  </th>
                  <th style={{ textAlign: 'left' }} className="py-3.5 px-4 text-left font-bold">
                    Tipo
                  </th>
                  <th style={{ textAlign: 'right' }} className="py-3.5 px-4 text-right font-bold">
                    Variación
                  </th>
                  <th style={{ textAlign: 'right' }} className="py-3.5 px-4 text-right font-bold">
                    Saldo Post-Mov.
                  </th>
                  <th style={{ textAlign: 'left' }} className="py-3.5 px-4 text-left font-bold">
                    Responsable
                  </th>
                  <th style={{ textAlign: 'left' }} className="py-3.5 px-5 text-left font-bold">
                    Motivo / Comanda
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[13px]">
                {pageMovements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                      No se encontraron movimientos con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  pageMovements.map((m) => {
                    const isPositive = ['COMPRA', 'ENTRADA', 'AJUSTE_POSITIVO'].includes(m.tipoMovimiento);
                    const isVenta = m.tipoMovimiento === 'VENTA';
                    const isMerma = ['MERMA', 'AJUSTE_NEGATIVO', 'AJUSTE', 'TRANSFERENCIA'].includes(m.tipoMovimiento);

                    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                    let dotClass = 'bg-slate-400';
                    if (isVenta) {
                      badgeClass = 'bg-orange-50 text-[#C2410C] border-orange-200/80';
                      dotClass = 'bg-[#F26522]';
                    } else if (isPositive) {
                      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
                      dotClass = 'bg-emerald-500';
                    } else if (isMerma) {
                      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200/80';
                      dotClass = 'bg-rose-500';
                    } else {
                      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200/80';
                      dotClass = 'bg-amber-500';
                    }

                    const parsed = parseMotivo(m.motivo);

                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td
                          style={{ textAlign: 'left' }}
                          className="py-3 px-5 text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap text-left"
                        >
                          {new Date(m.fecha).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td
                          style={{ textAlign: 'left' }}
                          className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap text-left"
                        >
                          {m.insumo?.nombre || '-'}
                        </td>
                        <td style={{ textAlign: 'left' }} className="py-3 px-4 whitespace-nowrap text-left">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                            {m.tipoMovimiento}
                          </span>
                        </td>
                        <td
                          style={{ textAlign: 'right' }}
                          className={`py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#F26522]'
                          }`}
                        >
                          {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad} {m.insumo?.unidadMedida || ''}
                        </td>
                        <td
                          style={{ textAlign: 'right' }}
                          className="py-3 px-4 text-right text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap"
                        >
                          <span>{m.stockAnterior != null ? m.stockAnterior : '-'}</span>
                          <span className="mx-1 text-slate-300 dark:text-slate-600">→</span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {m.stockNuevo != null ? m.stockNuevo : '-'} {m.insumo?.unidadMedida || ''}
                          </strong>
                        </td>
                        <td
                          style={{ textAlign: 'left' }}
                          className="py-3 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-left"
                        >
                          {m.usuario?.nombre || 'General / Sistema'}
                        </td>
                        <td style={{ textAlign: 'left' }} className="py-3 px-5 text-xs text-left">
                          <p className="text-slate-600 dark:text-slate-300">{parsed.line1}</p>
                          {parsed.line2 && (
                            <p className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                              {parsed.line2}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. VISTA AGRUPADA POR COMANDA (ANIMADA PC & MÓVIL)        */}
        {/* ========================================================= */}
        {viewMode === 'agrupado' && (
          <div className="p-4 sm:p-5 space-y-3.5 bg-slate-50/40 dark:bg-slate-950/30">
            {pageGroups.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No se encontraron operaciones con los filtros aplicados.
              </div>
            ) : (
              pageGroups.map((grp) => {
                const isOpen = !!expandedGroups[grp.key];
                const style = TYPE_STYLE[grp.tipo] || TYPE_STYLE['AJUSTE'];
                const GroupIcon =
                  grp.tipo === 'VENTA'
                    ? ReceiptText
                    : grp.tipo === 'ENTRADA'
                      ? ArrowDownLeft
                      : grp.tipo === 'MERMA'
                        ? AlertTriangle
                        : SlidersHorizontal;

                return (
                  <div
                    key={grp.key}
                    onClick={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [grp.key]: !prev[grp.key],
                      }))
                    }
                    className={`w-full cursor-pointer overflow-hidden select-none bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-lg shadow-black/5 dark:shadow-black/40 transition-all duration-500 ease-in-out ${
                      isOpen ? 'rounded-3xl' : 'rounded-2xl'
                    }`}
                  >
                    {/* Cabecera */}
                    <div className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 transition-colors duration-300 dark:bg-neutral-800">
                        <GroupIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                      </div>

                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-900 dark:text-white truncate">
                            {grp.titulo}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold ${style.badge}`}
                          >
                            {grp.tipo}
                          </span>
                          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 tabular-nums">
                            · {grp.items.length}{' '}
                            {grp.items.length === 1 ? 'insumo' : 'insumos'}
                          </span>
                        </div>

                        <p
                          className={`text-sm text-neutral-500 dark:text-neutral-400 truncate transition-all duration-500 ease-in-out ${
                            isOpen
                              ? 'mt-0 max-h-0 opacity-0'
                              : 'mt-0.5 max-h-6 opacity-100'
                          }`}
                        >
                          {grp.subtitulo} · {grp.usuario}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
                          {grp.fechaHora}
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center">
                          <ChevronUp
                            className={`h-5 w-5 text-neutral-400 transition-transform duration-500 ease-in-out ${
                              isOpen ? 'rotate-0' : 'rotate-180'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lista desplegable con animación de arriba hacia abajo */}
                    <div
                      className={`grid transition-all duration-500 ease-in-out ${
                        isOpen
                          ? 'grid-rows-[1fr] opacity-100'
                          : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-2 pb-4">
                          {grp.items.length === 0 ? (
                            <div className="mx-2 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-medium flex items-center gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>El plato o los platos no tienen receta asignada.</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {grp.items.map((item, index) => (
                                <div
                                  key={item.id}
                                  className={`flex items-start gap-3 rounded-xl p-3 transition-all duration-500 ease-in-out hover:bg-neutral-100 dark:hover:bg-neutral-800/50 ${
                                    isOpen
                                      ? 'translate-y-0 opacity-100'
                                      : 'translate-y-4 opacity-0'
                                  }`}
                                  style={{
                                    transitionDelay: isOpen ? `${index * 75}ms` : '0ms',
                                  }}
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 transition-colors duration-300 dark:bg-neutral-800">
                                    <Package className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                                      {item.insumo}
                                    </h4>
                                    <p className="truncate text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
                                      Stock: {item.stockAnterior} → {item.stockNuevo}{' '}
                                      {item.unidad} · {item.usuario}
                                    </p>
                                  </div>

                                  <div className="shrink-0 pt-0.5 text-right tabular-nums">
                                    <span
                                      className={`block text-xs sm:text-sm font-bold ${style.text}`}
                                    >
                                      {formatSignedQty(item.cantidad, item.unidad)}
                                    </span>
                                    <span className="block text-[11px] text-neutral-400 dark:text-neutral-500">
                                      {item.fechaHora.split(', ')[1] ?? item.fechaHora}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. VISTA MÓVIL DETALLADA (SOLO CUANDO viewMode === 'detallado') */}
        {/* ========================================================= */}
        {viewMode === 'detallado' && (
          <div className="md:hidden p-3.5 space-y-3">
            {pageMovements.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6">
                No se encontraron movimientos registrados.
              </div>
            ) : (
              pageMovements.map((m) => {
                const isPositive = ['COMPRA', 'ENTRADA', 'AJUSTE_POSITIVO'].includes(m.tipoMovimiento);
                const isVenta = m.tipoMovimiento === 'VENTA';
                const colorTypeClass = isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isVenta
                  ? 'text-[#F26522]'
                  : 'text-rose-600 dark:text-rose-400';
                const qtyColorClass = isPositive ? 'text-emerald-600' : 'text-[#F26522]';
                const sign = isPositive ? '+' : '';

                const parsed = parseMotivo(m.motivo);

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {m.insumo?.nombre || '-'}
                        </h3>
                        <span className={`text-[10.5px] font-bold tracking-wider uppercase ${colorTypeClass}`}>
                          {m.tipoMovimiento}
                        </span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${qtyColorClass}`}>
                        {sign}{m.cantidad} {m.insumo?.unidadMedida || ''}
                      </span>
                    </div>

                    {/* Motivo en 2 líneas ordenadas (Tarjeta Móvil) */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-0.5">
                      <span className="block">{parsed.line1}</span>
                      {parsed.line2 && (
                        <span className="block font-semibold text-slate-800 dark:text-slate-100">
                          {parsed.line2}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px] text-slate-400 tabular-nums">
                      <span>
                        {new Date(m.fecha).toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                      <span className="font-medium text-slate-500 truncate">
                        {m.usuario?.nombre || 'General / Sistema'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. PAGINACIÓN IDÉNTICA A ARQUEO DE CAJA (AL MEDIO)        */}
        {/* ========================================================= */}
        {totalPages > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-sans relative">
            {/* Lado izquierdo: "Mostrando 1-10 de # movimientos" */}
            <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              Mostrando{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                {startItem}-{endItem}
              </strong>{' '}
              de{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                {totalItems}
              </strong>{' '}
              {viewMode === 'agrupado' ? 'operaciones' : 'movimientos'}
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
        )}
      </section>

      {/* ========================================================= */}
      {/* 8. MODAL NUEVO MOVIMIENTO MANUAL (Diseño SuperAdmin)       */}
      {/* ========================================================= */}
      {isManualModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Registrar Movimiento Manual
              </h3>
              <CloseButton onClick={() => setIsManualModalOpen(false)} />
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveManual} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Insumo Afectado *
                </label>
                <FilterCombobox
                  value={String(modalForm.insumoId || '')}
                  onChange={(val) => setModalForm({ ...modalForm, insumoId: val })}
                  options={insumos.map((i) => ({
                    value: String(i.id),
                    label: `${i.nombre} (${i.unidadMedida}) - Disp: ${i.stock}`,
                  }))}
                  placeholder="Seleccione un insumo..."
                  ariaLabel="Insumo Afectado"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Movimiento *
                  </label>
                  <FilterCombobox
                    value={modalForm.tipoMovimiento}
                    onChange={(val) => setModalForm({ ...modalForm, tipoMovimiento: val })}
                    options={[
                      { value: 'COMPRA', label: 'COMPRA (+)' },
                      { value: 'MERMA', label: 'MERMA (-)' },
                      { value: 'TRANSFERENCIA', label: 'TRANSFERENCIA (-)' },
                      { value: 'AJUSTE', label: 'AJUSTE' },
                    ]}
                    ariaLabel="Tipo de Movimiento"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={modalForm.cantidad}
                    onChange={(e) => setModalForm({ ...modalForm, cantidad: e.target.value })}
                    placeholder="0.00"
                    required
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo / Justificación *
                </label>
                <input
                  type="text"
                  value={modalForm.motivo}
                  onChange={(e) => setModalForm({ ...modalForm, motivo: e.target.value })}
                  placeholder="Ej: Fuga, Ingreso Factura #123, Ajuste de auditoría"
                  required
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-full border-0 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-full border-0 bg-[#F26522] hover:bg-[#DC5616] text-white shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Registrar en Kardex'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
