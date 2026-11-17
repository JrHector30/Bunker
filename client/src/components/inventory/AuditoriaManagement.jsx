import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Minus,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FilterCombobox } from './FilterCombobox';
import CloseButton from '../ui/CloseButton';

const PAGE_SIZE = 10;

export default function AuditoriaManagement({
  insumos = [],
  user,
  fetchInsumos,
  fetchKardex,
  onBack,
  showToast,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [almacenFilter, setAlmacenFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const [physicalInputs, setPhysicalInputs] = useState({});
  const [verifiedIds, setVerifiedIds] = useState({});
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [auditNote, setAuditNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Opciones de Almacén (extraídas dinámicamente de los insumos)
  const almacenOptions = useMemo(() => {
    const set = new Set();
    insumos.forEach((i) => {
      if (i.almacen) set.add(i.almacen);
    });
    // Defaults comunes si están vacíos
    ['Congelador', 'Congelador 2', 'Refrigerador', 'Alacena'].forEach((def) => set.add(def));

    const opts = [{ value: 'Todos', label: 'Todos los almacenes' }];
    Array.from(set)
      .sort()
      .forEach((alm) => {
        opts.push({ value: alm, label: alm });
      });
    return opts;
  }, [insumos]);

  const auditStatusOptions = [
    { value: 'Todos', label: 'Todos los estados' },
    { value: 'ConDiferencia', label: 'Solo con diferencias', indicatorClass: 'bg-[#F26522]' },
    { value: 'Merma', label: 'Mermas (Faltante)', indicatorClass: 'bg-rose-500' },
    { value: 'Excedente', label: 'Excedentes (Sobrante)', indicatorClass: 'bg-blue-500' },
    { value: 'Cuadrado', label: 'Cuadrados / Verificados', indicatorClass: 'bg-emerald-500' },
    { value: 'Pendiente', label: 'Pendientes de conteo', indicatorClass: 'bg-amber-400' },
  ];

  // 2. Cálculo de filas de auditoría con estado y diferencias
  const auditRows = useMemo(() => {
    return insumos.map((item) => {
      const teorico = Number(item.cantidad ?? item.stock ?? 0);
      const almacen = item.almacen || 'Alacena';
      const unidad = item.unidadMedida || item.unidad || 'kg';

      const rawInput = physicalInputs[item.id];
      const hasInput = rawInput !== undefined && rawInput !== '';
      const parsedVal = hasInput ? Number(rawInput) : teorico;
      const stockFisico = Number.isFinite(parsedVal) && parsedVal >= 0 ? parsedVal : teorico;
      const diff = Number((stockFisico - teorico).toFixed(2));
      const isModified = hasInput && Math.abs(diff) >= 0.005;
      const isVerified = !!verifiedIds[item.id] || isModified;

      let auditState = 'pendiente';
      if (diff <= -0.005) auditState = 'merma';
      else if (diff >= 0.005) auditState = 'excedente';
      else if (isVerified) auditState = 'cuadrado';

      return {
        ...item,
        cantidad: teorico,
        almacen,
        unidad,
        displayInput: rawInput !== undefined ? rawInput : teorico.toFixed(2),
        stockFisico,
        diff,
        isModified,
        isVerified,
        auditState,
      };
    });
  }, [insumos, physicalInputs, verifiedIds]);

  // 3. KPIs del Conteo
  const kpis = useMemo(() => {
    let verificados = 0;
    let cuadrados = 0;
    let mermas = 0;
    let excedentes = 0;
    let totalChanges = 0;

    for (const r of auditRows) {
      if (r.isVerified) verificados += 1;
      if (r.auditState === 'cuadrado') cuadrados += 1;
      else if (r.auditState === 'merma') {
        mermas += 1;
        totalChanges += 1;
      } else if (r.auditState === 'excedente') {
        excedentes += 1;
        totalChanges += 1;
      }
    }

    const progressPct =
      auditRows.length > 0 ? Math.round((verificados / auditRows.length) * 100) : 0;

    return {
      total: auditRows.length,
      verificados,
      cuadrados,
      mermas,
      excedentes,
      totalChanges,
      progressPct,
    };
  }, [auditRows]);

  // 4. Ajustes pendientes para modal
  const pendingAdjustments = useMemo(() => {
    return auditRows
      .filter((r) => r.auditState === 'merma' || r.auditState === 'excedente')
      .map((r) => ({
        insumoId: r.id,
        nombre: r.nombre,
        stockTeorico: r.cantidad,
        stockFisico: r.stockFisico,
        diferencia: r.diff,
        unidad: r.unidad,
      }));
  }, [auditRows]);

  // 5. Filtros y ordenamiento
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = auditRows.filter((r) => {
      if (almacenFilter !== 'Todos' && r.almacen !== almacenFilter) return false;
      if (statusFilter === 'ConDiferencia' && r.auditState !== 'merma' && r.auditState !== 'excedente') {
        return false;
      }
      if (statusFilter === 'Merma' && r.auditState !== 'merma') return false;
      if (statusFilter === 'Excedente' && r.auditState !== 'excedente') return false;
      if (statusFilter === 'Cuadrado' && r.auditState !== 'cuadrado') return false;
      if (statusFilter === 'Pendiente' && r.auditState !== 'pendiente') return false;
      if (q) {
        const matchName = r.nombre.toLowerCase().includes(q);
        const matchAlmacen = r.almacen.toLowerCase().includes(q);
        if (!matchName && !matchAlmacen) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre, 'es') * factor;
      return (a.cantidad - b.cantidad) * factor;
    });

    return list;
  }, [auditRows, searchQuery, almacenFilter, statusFilter, sortBy, sortDir]);

  // 6. Paginación de Arqueo de Caja
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const startItem = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, filteredRows.length);

  const handleSortToggle = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const handleInputChange = (id, val) => {
    setPhysicalInputs((prev) => ({ ...prev, [id]: val }));
    setVerifiedIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleStep = (id, currentVal, delta) => {
    const next = Math.max(0, Number((currentVal + delta).toFixed(2)));
    setPhysicalInputs((prev) => ({ ...prev, [id]: next.toFixed(2) }));
    setVerifiedIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleConfirmMatch = (id, teorico) => {
    setPhysicalInputs((prev) => ({ ...prev, [id]: teorico.toFixed(2) }));
    setVerifiedIds((prev) => ({ ...prev, [id]: true }));
  };

  const handleResetRow = (id) => {
    setPhysicalInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setVerifiedIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleMarkPageVerified = () => {
    const nextInputs = { ...physicalInputs };
    const nextVerified = { ...verifiedIds };
    for (const row of pageItems) {
      if (nextInputs[row.id] === undefined) {
        nextInputs[row.id] = row.cantidad.toFixed(2);
      }
      nextVerified[row.id] = true;
    }
    setPhysicalInputs(nextInputs);
    setVerifiedIds(nextVerified);
    showToast?.(`${pageItems.length} insumos de esta página marcados como verificados.`, 'success');
  };

  const handleExportAuditSheet = () => {
    if (filteredRows.length === 0) {
      showToast?.('No hay insumos para exportar.', 'warning');
      return;
    }

    const exportData = filteredRows.map((r) => ({
      Insumo: r.nombre,
      Almacén: r.almacen,
      'Stock Teórico': `${r.cantidad.toFixed(2)} ${r.unidad}`,
      'Stock Físico': `${r.stockFisico.toFixed(2)} ${r.unidad}`,
      Diferencia: `${r.diff > 0 ? `+${r.diff.toFixed(2)}` : r.diff.toFixed(2)} ${r.unidad}`,
      Estado: r.auditState.toUpperCase(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría');
    XLSX.writeFile(workbook, `Conciliacion_Auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast?.('Hoja de conciliación exportada con éxito.', 'success');
  };

  const handleConfirmApply = async () => {
    if (pendingAdjustments.length === 0) return;
    if (!user || !user.id) {
      showToast?.('❌ Error: Usuario no autenticado', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const tenantId = localStorage.getItem('bunker_tenant_id') || '1';

      const promises = pendingAdjustments.map((adj) => {
        const diff = adj.diferencia;
        const tipoMovimiento = diff > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
        const motivo = auditNote.trim()
          ? `${auditNote.trim()} - Stock anterior: ${adj.stockTeorico}, Nuevo: ${adj.stockFisico}`
          : `Conciliación Física. Stock anterior: ${adj.stockTeorico}, Nuevo: ${adj.stockFisico}`;

        return fetch('/api/kardex', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
          },
          body: JSON.stringify({
            insumoId: adj.insumoId,
            tipoMovimiento,
            cantidad: Math.abs(diff),
            motivo,
            usuarioId: user.id,
          }),
        });
      });

      await Promise.all(promises);
      showToast?.(`✅ ${pendingAdjustments.length} ajustes de stock aplicados correctamente.`, 'success');

      setPhysicalInputs({});
      setVerifiedIds({});
      setAuditNote('');
      setConfirmModalOpen(false);

      fetchInsumos?.();
      fetchKardex?.();
    } catch {
      showToast?.('❌ Error al aplicar conciliación en el servidor.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepAmount = (unidad) => {
    const u = (unidad || '').toLowerCase();
    if (u === 'gr' || u === 'ml') return 50;
    if (u === 'und' || u === 'ud' || u === 'unid') return 1;
    return 0.5;
  };

  return (
    <div className="fade-in space-y-4 sm:space-y-5 pb-20 md:pb-0">
      {/* ========================================================= */}
      {/* 1. HEADER (Web + Mobile)                                  */}
      {/* ========================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] sm:text-[24px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Auditoría de Insumos
            </h1>
            <span className="text-xs font-medium text-slate-400 tabular-nums">
              {insumos.length} insumos
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Conciliación de stock físico vs teórico para detectar mermas, faltantes o excedentes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportAuditSheet}
            className="min-h-[40px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportar Hoja</span>
          </button>

          <button
            type="button"
            disabled={kpis.totalChanges === 0}
            onClick={() => setConfirmModalOpen(true)}
            className={`min-h-[40px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border-0 transition-all whitespace-nowrap ${
              kpis.totalChanges > 0
                ? 'bg-[#F26522] hover:bg-[#DC5616] text-white shadow-[0_6px_16px_-4px_rgba(242,101,34,0.45)] cursor-pointer active:scale-95'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>
              Aplicar Ajustes{kpis.totalChanges > 0 ? ` (${kpis.totalChanges})` : ''}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. 4 TARJETAS KPI CLICABLES (Con Barra de Progreso)       */}
      {/* ========================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Progreso Conteo */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('Todos');
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-3.5 sm:p-4 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'Todos'
              ? 'border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Progreso Conteo
            </span>
            <span className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#F26522] flex items-center justify-center">
              <ClipboardCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {kpis.verificados}/{kpis.total}
            </p>
            <span className="text-xs font-bold text-[#F26522] tabular-nums">
              {kpis.progressPct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F26522] transition-all duration-300"
              style={{ width: `${kpis.progressPct}%` }}
            />
          </div>
        </button>

        {/* KPI 2: Cuadrados (Exactos) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((s) => (s === 'Cuadrado' ? 'Todos' : 'Cuadrado'));
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-3.5 sm:p-4 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'Cuadrado'
              ? 'border-emerald-500 ring-2 ring-emerald-500/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Cuadrados (Exactos)
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {kpis.cuadrados}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">Stock físico igual al teórico</p>
        </button>

        {/* KPI 3: Mermas / Faltantes */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((s) => (s === 'Merma' ? 'Todos' : 'Merma'));
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-3.5 sm:p-4 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'Merma'
              ? 'border-rose-500 ring-2 ring-rose-500/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Mermas / Faltantes
            </span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {kpis.mermas}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">Físico menor al sistema</p>
        </button>

        {/* KPI 4: Excedentes */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((s) => (s === 'Excedente' ? 'Todos' : 'Excedente'));
            setCurrentPage(1);
          }}
          className={`text-left rounded-2xl bg-white dark:bg-slate-900 border p-3.5 sm:p-4 transition-all cursor-pointer shadow-xs ${
            statusFilter === 'Excedente'
              ? 'border-blue-500 ring-2 ring-blue-500/15'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Excedentes
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
            {kpis.excedentes}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">Físico mayor al sistema</p>
        </button>
      </section>

      {/* ========================================================= */}
      {/* 3. CARD PRINCIPAL CON TOOLBAR INTEGRADA                   */}
      {/* ========================================================= */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar insumo o zona de almacén..."
              className="w-full min-h-[40px] pl-10 pr-8 py-2 text-xs rounded-full border border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#F26522] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterCombobox
              value={almacenFilter}
              defaultValue="Todos"
              options={almacenOptions}
              onChange={(v) => {
                setAlmacenFilter(v);
                setCurrentPage(1);
              }}
              icon={Warehouse}
              ariaLabel="Filtrar por almacén"
            />

            <FilterCombobox
              value={statusFilter}
              defaultValue="Todos"
              options={auditStatusOptions}
              onChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
              icon={SlidersHorizontal}
              ariaLabel="Filtrar por resultado de auditoría"
            />

            <button
              type="button"
              onClick={handleMarkPageVerified}
              disabled={pageItems.length === 0}
              className="min-h-[40px] px-3.5 py-2 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Confirmar página</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. VISTA WEB (Tabla md+ con Cabeceras Alineadas)          */}
        {/* ========================================================= */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F26522] text-white text-[11px] font-bold tracking-wider uppercase">
                <th
                  style={{ textAlign: 'left' }}
                  className="py-3.5 px-5 text-left font-bold cursor-pointer select-none"
                  onClick={() => handleSortToggle('nombre')}
                >
                  <div className="inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                    <span>Insumo / Almacén</span>
                    {sortBy === 'nombre' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-white" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-white opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  style={{ textAlign: 'right' }}
                  className="py-3.5 px-4 text-right font-bold cursor-pointer select-none"
                  onClick={() => handleSortToggle('cantidad')}
                >
                  <div className="inline-flex items-center justify-end gap-1.5 ml-auto hover:opacity-90 transition-opacity">
                    <span>Stock Teórico</span>
                    {sortBy === 'cantidad' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-white" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5 text-white opacity-40" />
                    )}
                  </div>
                </th>
                <th style={{ textAlign: 'center' }} className="py-3.5 px-4 text-center font-bold">
                  Stock Físico (Real)
                </th>
                <th style={{ textAlign: 'right' }} className="py-3.5 px-4 text-right font-bold">
                  Diferencia
                </th>
                <th style={{ textAlign: 'right' }} className="py-3.5 px-5 text-right font-bold">
                  Estado / Verificación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[13px]">
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    No se encontraron insumos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pageItems.map((row) => {
                  const step = getStepAmount(row.unidad);
                  const rowHighlight =
                    row.auditState === 'merma'
                      ? 'bg-rose-50/35 dark:bg-rose-950/15'
                      : row.auditState === 'excedente'
                      ? 'bg-blue-50/35 dark:bg-blue-950/15'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40';

                  return (
                    <tr key={row.id} className={`transition-colors ${rowHighlight}`}>
                      <td style={{ textAlign: 'left' }} className="py-3 px-5 text-left">
                        <p className="font-bold text-slate-900 dark:text-white">{row.nombre}</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">{row.almacen}</p>
                      </td>

                      <td
                        style={{ textAlign: 'right' }}
                        className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap"
                      >
                        {row.cantidad.toFixed(2)} {row.unidad}
                      </td>

                      <td style={{ textAlign: 'center' }} className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStep(row.id, row.stockFisico, -step)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.displayInput}
                            onChange={(e) => handleInputChange(row.id, e.target.value)}
                            className={`w-24 h-9 px-2.5 text-center font-bold text-sm tabular-nums rounded-lg border focus:outline-none focus:ring-1 transition-colors ${
                              row.auditState === 'merma'
                                ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 focus:ring-rose-500'
                                : row.auditState === 'excedente'
                                ? 'border-blue-300 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 focus:ring-blue-500'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-[#F26522]'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleStep(row.id, row.stockFisico, step)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-medium text-slate-400 w-7 text-left">{row.unidad}</span>
                        </div>
                      </td>

                      <td
                        style={{ textAlign: 'right' }}
                        className="py-3 px-4 text-right tabular-nums whitespace-nowrap"
                      >
                        {row.auditState === 'merma' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-100/80 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            {row.diff.toFixed(2)} {row.unidad}
                          </span>
                        ) : row.auditState === 'excedente' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            +{row.diff.toFixed(2)} {row.unidad}
                          </span>
                        ) : row.auditState === 'cuadrado' ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            0.00 {row.unidad}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }} className="py-3 px-5 text-right whitespace-nowrap">
                        {row.isModified ? (
                          <button
                            type="button"
                            onClick={() => handleResetRow(row.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1 cursor-pointer shadow-xs active:scale-95 transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restablecer</span>
                          </button>
                        ) : row.isVerified ? (
                          <button
                            type="button"
                            onClick={() => handleResetRow(row.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verificado</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConfirmMatch(row.id, row.cantidad)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/60 dark:hover:bg-slate-700 inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Confirmar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================================= */}
        {/* 5. VERSIÓN MOBILE (Tarjetas Táctiles < md)                */}
        {/* ========================================================= */}
        <div className="md:hidden p-3.5 space-y-2.5">
          {pageItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No se encontraron insumos con los filtros seleccionados.
            </div>
          ) : (
            pageItems.map((row) => {
              const step = getStepAmount(row.unidad);
              return (
                <div
                  key={row.id}
                  className={`rounded-2xl border p-3.5 space-y-3 transition-colors ${
                    row.auditState === 'merma'
                      ? 'border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800'
                      : row.auditState === 'excedente'
                      ? 'border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-800'
                      : row.auditState === 'cuadrado'
                      ? 'border-emerald-200/80 bg-emerald-50/20 dark:bg-emerald-950/20 dark:border-emerald-800'
                      : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {row.nombre}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400">{row.almacen}</span>
                    </div>

                    {row.auditState === 'merma' ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 tabular-nums shrink-0">
                        Merma {row.diff.toFixed(2)} {row.unidad}
                      </span>
                    ) : row.auditState === 'excedente' ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 tabular-nums shrink-0">
                        +{row.diff.toFixed(2)} {row.unidad}
                      </span>
                    ) : row.auditState === 'cuadrado' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Cuadrado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        Pendiente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Teórico
                      </span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {row.cantidad.toFixed(2)} {row.unidad}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStep(row.id, row.stockFisico, -step)}
                        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.displayInput}
                        onChange={(e) => handleInputChange(row.id, e.target.value)}
                        className="w-20 h-10 px-2 text-center font-bold text-sm tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#F26522]"
                      />
                      <button
                        type="button"
                        onClick={() => handleStep(row.id, row.stockFisico, step)}
                        className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-95 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Unidad: <strong className="text-slate-600 dark:text-slate-300">{row.unidad}</strong>
                    </span>
                    {row.isModified ? (
                      <button
                        type="button"
                        onClick={() => handleResetRow(row.id)}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restablecer a {row.cantidad.toFixed(2)}</span>
                      </button>
                    ) : row.isVerified ? (
                      <button
                        type="button"
                        onClick={() => handleResetRow(row.id)}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verificado</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConfirmMatch(row.id, row.cantidad)}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Confirmar igual</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================= */}
        {/* 6. PAGINACIÓN IDÉNTICA A ARQUEO DE CAJA                   */}
        {/* ========================================================= */}
        {totalPages > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-sans relative">
            {/* Lado izquierdo: "Mostrando 1-10 de # insumos" */}
            <span className="font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              Mostrando{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                {startItem}-{endItem}
              </strong>{' '}
              de{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                {filteredRows.length}
              </strong>{' '}
              insumos
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
      {/* 7. BARRA FIJA INFERIOR EN MOBILE AL DETECTAR AJUSTES      */}
      {/* ========================================================= */}
      {kpis.totalChanges > 0 && (
        <div className="md:hidden fixed bottom-4 inset-x-4 z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="rounded-2xl bg-[#0B0F19] text-white p-3.5 shadow-2xl border border-white/10 flex items-center justify-between gap-3">
            <div className="pl-1">
              <p className="text-xs font-bold tabular-nums">
                {kpis.totalChanges} ajuste(s) detectados
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {kpis.mermas} merma(s) · {kpis.excedentes} excedente(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              className="min-h-[40px] px-4 rounded-xl border-0 bg-[#F26522] hover:bg-[#DC5616] text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              Aplicar Ajustes
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. MODAL DE CONFIRMACIÓN ANTES DE IMPACTAR STOCK          */}
      {/* ========================================================= */}
      {confirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setConfirmModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmar Conciliación de Inventario
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Se actualizará el stock y se registrará cada diferencia en Kardex.
                </p>
              </div>
              <CloseButton onClick={() => setConfirmModalOpen(false)} />
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl max-h-60">
              {pendingAdjustments.map((adj) => (
                <div
                  key={adj.insumoId}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{adj.nombre}</p>
                    <p className="text-slate-400 tabular-nums">
                      {adj.stockTeorico.toFixed(2)} →{' '}
                      <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                        {adj.stockFisico.toFixed(2)}
                      </strong>{' '}
                      {adj.unidad}
                    </p>
                  </div>
                  <span
                    className={`font-bold tabular-nums px-2.5 py-0.5 rounded-md text-xs ${
                      adj.diferencia < 0
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                    }`}
                  >
                    {adj.diferencia > 0
                      ? `+${adj.diferencia.toFixed(2)}`
                      : adj.diferencia.toFixed(2)}{' '}
                    {adj.unidad}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Observación de auditoría (opcional)
              </label>
              <input
                type="text"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="Ej. Inventario semanal cierre domingo"
                className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#F26522]"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 min-h-[42px] rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer active:scale-95 transition-all"
              >
                Seguir Revisando
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmApply}
                className="flex-1 min-h-[42px] rounded-full border-0 bg-[#F26522] hover:bg-[#DC5616] text-white text-xs font-bold cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Aplicando...' : `Confirmar (${pendingAdjustments.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
