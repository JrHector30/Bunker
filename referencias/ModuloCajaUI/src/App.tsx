import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  initialArqueos,
  initialCuentasAbiertas,
  initialMovimientos
} from './data';
import { Arqueo, CuentaAbierta, MovimientoCaja } from './types';
import { CustomCharts } from './components/CustomCharts';
import { MovimientoModal } from './components/MovimientoModal';
import { CheckoutModal } from './components/CheckoutModal';
import { DetailModal } from './components/DetailModal';

// Icons
import {
  TrendingUp,
  BarChart3,
  CreditCard,
  DollarSign,
  Smartphone,
  Download,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Plus,
  Search,
  Filter,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Trash2,
  Printer,
  Receipt,
  CalendarDays,
  Sparkles,
  Info,
  AlertCircle,
  Eye,
  Menu,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCircle
} from 'lucide-react';

export default function App() {
  // --- Core States ---
  const [arqueos, setArqueos] = useState<Arqueo[]>(initialArqueos);
  const [cuentasAbiertas, setCuentasAbiertas] = useState<CuentaAbierta[]>(initialCuentasAbiertas);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>(initialMovimientos);

  // --- UI Filter States ---
  const [selectedArqueoId, setSelectedArqueoId] = useState<number>(45);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'todos' | 'hoy' | 'mes' | 'curso'>('todos');
  
  // --- Modal Open States ---
  const [isMovModalOpen, setIsMovModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // --- Active Selections ---
  const [selectedCheckoutCuenta, setSelectedCheckoutCuenta] = useState<CuentaAbierta | null>(null);
  const [selectedDetailArqueo, setSelectedDetailArqueo] = useState<Arqueo | null>(null);
  
  // --- Drawer & Sidebar State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar drawer
  const [isSidebarDocked, setIsSidebarDocked] = useState(true); // Pinned sidebar on large screens
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // --- Notification / Toast state ---
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- Active Arqueo (usually ID 45, which is OPEN) ---
  const activeArqueo = useMemo(() => {
    return arqueos.find(a => a.estado === 'ABIERTO') || arqueos[0];
  }, [arqueos]);

  // --- Handle Registering a Cash Movement ---
  const handleAddMovimiento = (newMov: Omit<MovimientoCaja, 'id' | 'fecha' | 'arqueoId'>) => {
    const timestamp = new Date().toLocaleDateString('es-PE') + ' ' + new Date().toLocaleTimeString('es-PE');
    const movementId = 'm_' + Date.now();

    const createdMov: MovimientoCaja = {
      ...newMov,
      id: movementId,
      fecha: timestamp,
      arqueoId: activeArqueo.id
    };

    // Update movements logs
    setMovimientos((prev) => [createdMov, ...prev]);

    // Live update active arqueo balances
    setArqueos((prevArqueos) =>
      prevArqueos.map((arq) => {
        if (arq.id === activeArqueo.id) {
          const updatedIngreso = { ...arq.ingresoDetalle };
          let updatedEgreso = arq.egreso;
          let updatedTotalCaja = arq.totalCaja;
          let updatedTotalBruto = arq.totalBruto;

          // Ensure yape and plin are initialized
          if (updatedIngreso.yape === undefined) updatedIngreso.yape = 0;
          if (updatedIngreso.plin === undefined) updatedIngreso.plin = 0;

          if (newMov.tipo === 'ingreso') {
            if (newMov.metodoPago === 'yape') {
              updatedIngreso.yape = (updatedIngreso.yape || 0) + newMov.monto;
              updatedIngreso.digital = (updatedIngreso.digital || 0) + newMov.monto;
            } else if (newMov.metodoPago === 'plin') {
              updatedIngreso.plin = (updatedIngreso.plin || 0) + newMov.monto;
              updatedIngreso.digital = (updatedIngreso.digital || 0) + newMov.monto;
            } else {
              updatedIngreso[newMov.metodoPago] = (updatedIngreso[newMov.metodoPago] || 0) + newMov.monto;
            }
            updatedTotalBruto += newMov.monto;
            if (newMov.metodoPago === 'efectivo') {
              updatedTotalCaja += newMov.monto;
            }
          } else {
            // Egresos can be subtracted from cash or digital balances
            updatedEgreso += newMov.monto;
            if (newMov.metodoPago === 'efectivo') {
              updatedTotalCaja -= newMov.monto;
            } else if (newMov.metodoPago === 'yape') {
              updatedIngreso.yape = (updatedIngreso.yape || 0) - newMov.monto;
              updatedIngreso.digital = (updatedIngreso.digital || 0) - newMov.monto;
            } else if (newMov.metodoPago === 'plin') {
              updatedIngreso.plin = (updatedIngreso.plin || 0) - newMov.monto;
              updatedIngreso.digital = (updatedIngreso.digital || 0) - newMov.monto;
            }
          }

          return {
            ...arq,
            ingresoDetalle: updatedIngreso,
            egreso: updatedEgreso,
            totalCaja: updatedTotalCaja,
            totalBruto: updatedTotalBruto
          };
        }
        return arq;
      })
    );

    addToast(
      `¡Movimiento registrado con éxito! ${newMov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de S/. ${newMov.monto.toFixed(2)}`,
      newMov.tipo === 'ingreso' ? 'success' : 'info'
    );
  };

  // --- Handle Closing/Checking Out a Table Account ---
  const handleConfirmCheckout = (
    cuentaId: string,
    metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta',
    montoTotal: number,
    propina: number
  ) => {
    const cuenta = cuentasAbiertas.find((c) => c.id === cuentaId);
    if (!cuenta) return;

    const timestamp = new Date().toLocaleDateString('es-PE') + ' ' + new Date().toLocaleTimeString('es-PE');
    
    // Register Checkout as a cash movement
    const movementId = 'm_' + Date.now();
    const createdMov: MovimientoCaja = {
      id: movementId,
      tipo: 'ingreso',
      monto: montoTotal,
      metodoPago: metodo,
      descripcion: `Cobro ${cuenta.mesa} - Cierre Cuenta`,
      fecha: timestamp,
      arqueoId: activeArqueo.id
    };

    setMovimientos((prev) => [createdMov, ...prev]);

    // Live update balances in current active session
    setArqueos((prevArqueos) =>
      prevArqueos.map((arq) => {
        if (arq.id === activeArqueo.id) {
          const updatedIngreso = { ...arq.ingresoDetalle };
          
          if (updatedIngreso.yape === undefined) updatedIngreso.yape = 0;
          if (updatedIngreso.plin === undefined) updatedIngreso.plin = 0;

          if (metodo === 'yape') {
            updatedIngreso.yape = (updatedIngreso.yape || 0) + montoTotal;
            updatedIngreso.digital = (updatedIngreso.digital || 0) + montoTotal;
          } else if (metodo === 'plin') {
            updatedIngreso.plin = (updatedIngreso.plin || 0) + montoTotal;
            updatedIngreso.digital = (updatedIngreso.digital || 0) + montoTotal;
          } else {
            updatedIngreso[metodo] = (updatedIngreso[metodo] || 0) + montoTotal;
          }
          
          const updatedTotalBruto = arq.totalBruto + montoTotal;
          const updatedPropinas = arq.propinas + propina;
          
          // Only physical cash adds to the visual totalCaja balance
          const updatedTotalCaja = arq.totalCaja + (metodo === 'efectivo' ? montoTotal : 0);

          return {
            ...arq,
            ingresoDetalle: updatedIngreso,
            totalBruto: updatedTotalBruto,
            totalCaja: updatedTotalCaja,
            propinas: updatedPropinas
          };
        }
        return arq;
      })
    );

    // Remove the open account
    setCuentasAbiertas((prev) => prev.filter((c) => c.id !== cuentaId));

    addToast(
      `¡Cuenta de ${cuenta.mesa} cerrada por S/. ${montoTotal.toFixed(2)} (${metodo.toUpperCase()})! Propina: S/. ${propina.toFixed(2)}.`,
      'success'
    );
  };

  // --- Handle Discarding an Open Account ("X") ---
  const handleDiscardCuenta = (cuentaId: string) => {
    const cuenta = cuentasAbiertas.find((c) => c.id === cuentaId);
    if (!cuenta) return;

    if (window.confirm(`¿Está seguro de descartar y archivar los consumos de ${cuenta.mesa}? Esta acción no se puede deshacer.`)) {
      setCuentasAbiertas((prev) => prev.filter((c) => c.id !== cuentaId));
      addToast(`Se descartó y archivó la cuenta de ${cuenta.mesa}.`, 'error');
    }
  };

  // --- Export Table Page to mock CSV / Excel ---
  const handleExportCSV = () => {
    const headers = ['N', 'Fecha Inicio', 'Fecha Cierre', 'Estado', 'Inicio', 'Egreso', 'Ingreso Efectivo', 'Ingreso Digital', 'Ingreso Tarjeta', 'Ingreso Manual', 'Propinas', 'Total Caja', 'Total Bruto', 'Pendiente'];
    const rows = filteredArqueos.map(a => [
      a.id,
      a.fechaInicio,
      a.fechaCierre,
      a.estado,
      a.inicio,
      a.egreso,
      a.ingresoDetalle.efectivo,
      a.ingresoDetalle.digital,
      a.ingresoDetalle.tarjeta,
      a.ingresoDetalle.manual,
      a.propinas,
      a.totalCaja,
      a.totalBruto,
      a.pendiente
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `comandago_reporte_caja_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('Excel/CSV de arqueos generado e iniciado descarga con éxito.', 'success');
  };

  // --- Filters and Searches ---
  const filteredArqueos = useMemo(() => {
    return arqueos.filter((arq) => {
      // Search matching
      const matchesSearch =
        arq.id.toString().includes(searchQuery) ||
        arq.fechaInicio.toLowerCase().includes(searchQuery.toLowerCase()) ||
        arq.fechaCierre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        arq.estado.toLowerCase().includes(searchQuery.toLowerCase());

      // Date matching
      let matchesDate = true;
      if (dateFilter === 'hoy') {
        matchesDate = arq.fechaInicio.includes('01/07/2026') || arq.fechaInicio.includes('03/07/2026');
      } else if (dateFilter === 'mes') {
        matchesDate = arq.fechaInicio.includes('2026');
      } else if (dateFilter === 'curso') {
        matchesDate = arq.estado === 'ABIERTO';
      }

      return matchesSearch && matchesDate;
    });
  }, [arqueos, searchQuery, dateFilter]);

  // --- Pagination (5 items per page) ---
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredArqueos.length / itemsPerPage) || 1;
  const paginatedArqueos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredArqueos.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredArqueos, currentPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notifier */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className="pointer-events-auto w-full bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3"
            >
              <div className="mt-0.5">
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {t.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
                {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold font-display">Notificación del Sistema</p>
                <p className="text-[11px] text-slate-300 mt-0.5">{t.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                className="text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Container Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Core Workspace Panel */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Top Banner Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Módulo de Caja</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Arqueo de Caja <span className="text-emerald-600 font-bold">[ABIERTO]</span></p>
              </div>
            </div>

            {/* Actions & Filters Ribbon */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsMovModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer group"
              >
                <Plus className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform" />
                <span>+ Movimiento</span>
              </button>
              
              <button
                onClick={handleExportCSV}
                title="Descargar historial de caja en formato Excel/CSV"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm font-mono cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>

              {/* Date Filter selector */}
              <div className="relative inline-flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 shadow-sm">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 mr-2" />
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-hidden pr-6 cursor-pointer"
                >
                  <option value="todos">Todos los Arqueos</option>
                  <option value="hoy">Sesión de Hoy</option>
                  <option value="mes">Año Fiscal 2026</option>
                  <option value="curso">Solo [EN CURSO]</option>
                </select>
              </div>

              {/* Sidebar toggle button (Mobile) */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden relative inline-flex items-center justify-center p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm cursor-pointer"
              >
                <Menu className="w-4 h-4" />
                {cuentasAbiertas.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {cuentasAbiertas.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Status Sub-Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-500">Sesión Activa:</span>
              <span className="text-sm font-bold text-slate-800">Arqueo de Caja</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ABIERTO
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Iniciado: {activeArqueo.fechaInicio}</span>
            </div>
          </div>

          {/* Table Search & Title Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Historial de Sesiones de Arqueo</h2>
                <p className="text-xs text-slate-400 mt-0.5">Auditoría completa de movimientos de caja registrados en el sistema.</p>
              </div>

              {/* Dynamic search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar arqueo por N°, fecha, estado..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-white text-slate-700 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-hidden focus:border-slate-800 transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-3 my-auto text-slate-400 hover:text-slate-950 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Custom Interactive Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200">
                    <th className="py-3 px-4 text-center w-12">N°</th>
                    <th className="py-3 px-4 w-52">Fechas Sesión</th>
                    <th className="py-3 px-4 text-right">Inicio (S/.)</th>
                    <th className="py-3 px-4 text-right">Egresos (S/.)</th>
                    <th className="py-3 px-4 text-center w-64">Ingresos Desglosados (S/.)</th>
                    <th className="py-3 px-4 text-right">Propinas</th>
                    <th className="py-3 px-4 text-right font-semibold">Total Caja</th>
                    <th className="py-3 px-4 text-right">Total Bruto</th>
                    <th className="py-3 px-4 text-right">Pendiente</th>
                    <th className="py-3 px-4 text-center w-16">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedArqueos.map((arq) => {
                    const isSelected = arq.id === selectedArqueoId;
                    const isActiveSession = arq.estado === 'ABIERTO';

                    return (
                      <tr
                        key={arq.id}
                        onClick={() => setSelectedArqueoId(arq.id)}
                        className={`transition-colors cursor-pointer group hover:bg-slate-50/60 ${
                          isSelected ? 'bg-slate-50/85' : ''
                        }`}
                      >
                        {/* Number */}
                        <td className="py-4 px-4 text-center font-bold font-mono text-slate-800">
                          {arq.id}
                        </td>

                        {/* Dates */}
                        <td className="py-4 px-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-[10px] font-bold text-slate-400">Inicio:</span>
                            <span className="font-mono text-[11px]">{arq.fechaInicio}</span>
                          </div>
                          {isActiveSession ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              [EN CURSO]
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span className="text-[10px] font-medium text-slate-400">Cierre:</span>
                              <span className="font-mono text-[11px]">{arq.fechaCierre}</span>
                            </div>
                          )}
                        </td>

                        {/* Inicio */}
                        <td className="py-4 px-4 text-right font-mono font-medium text-slate-700">
                          S/. {arq.inicio.toFixed(2)}
                        </td>

                        {/* Egreso */}
                        <td className="py-4 px-4 text-right font-mono font-medium text-rose-600">
                          Efec: S/. {arq.egreso.toFixed(2)}
                        </td>

                        {/* Ingreso Detalle Breakdown */}
                        <td className="py-4 px-4">
                          <div className="grid grid-cols-2 gap-1.5 max-w-[240px] mx-auto text-[10px] text-slate-500 font-mono">
                            <div className="flex items-center justify-between px-1.5 py-0.5 bg-slate-50 rounded-sm border border-slate-100">
                              <span>Efec:</span>
                              <span className="font-bold text-slate-700">{arq.ingresoDetalle.efectivo.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between px-1.5 py-0.5 bg-blue-50/50 rounded-sm border border-blue-100 group/eye">
                              <span className="flex items-center gap-0.5">
                                Dig:
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailArqueo(arq);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="text-blue-400 hover:text-blue-700 focus:outline-hidden"
                                >
                                  <Eye className="w-2.5 h-2.5 cursor-pointer" />
                                </button>
                              </span>
                              <span className="font-bold text-blue-700">{arq.ingresoDetalle.digital.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between px-1.5 py-0.5 bg-amber-50/50 rounded-sm border border-amber-100">
                              <span className="flex items-center gap-0.5">
                                Tarj:
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailArqueo(arq);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="text-amber-400 hover:text-amber-700 focus:outline-hidden"
                                >
                                  <Eye className="w-2.5 h-2.5 cursor-pointer" />
                                </button>
                              </span>
                              <span className="font-bold text-amber-700">{arq.ingresoDetalle.tarjeta.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between px-1.5 py-0.5 bg-slate-50 rounded-sm border border-slate-100">
                              <span>Man:</span>
                              <span className="font-bold text-slate-700">{arq.ingresoDetalle.manual.toFixed(2)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Propinas */}
                        <td className="py-4 px-4 text-right font-mono font-medium text-amber-600">
                          S/. {arq.propinas.toFixed(2)}
                        </td>

                        {/* Total Caja */}
                        <td className="py-4 px-4 text-right font-mono font-black text-emerald-600 bg-emerald-50/10">
                          S/. {arq.totalCaja.toFixed(2)}
                        </td>

                        {/* Total Bruto */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-700">
                          S/. {arq.totalBruto.toFixed(2)}
                        </td>

                        {/* Pendiente */}
                        <td className="py-4 px-4 text-right font-mono font-medium text-amber-500">
                          S/. {arq.pendiente.toFixed(2)}
                        </td>

                        {/* Action Dots Dropdown */}
                        <td className="py-4 px-4 text-center relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === arq.id ? null : arq.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer focus:outline-hidden"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Quick dropdown panel */}
                          {activeDropdownId === arq.id && (
                            <>
                              {/* Overlay backing for quick dismiss */}
                              <div className="fixed inset-0 z-10" onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(null);
                              }} />
                              
                              <div className="absolute right-4 top-10 w-44 bg-white border border-slate-150 rounded-xl shadow-xl z-20 overflow-hidden text-left py-1 text-xs">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailArqueo(arq);
                                    setIsDetailModalOpen(true);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Auditar Detalles</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alert(`Re-imprimiendo reporte de arqueo N° ${arq.id}...`);
                                    addToast(`Impresión de reporte N° ${arq.id} enviada a cocina.`, 'info');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Imprimir Reporte</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedArqueoId(arq.id);
                                    setActiveDropdownId(null);
                                    addToast(`Analizando gráfico de métodos del arqueo N° ${arq.id}.`, 'info');
                                  }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Ver Distribución</span>
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Responsive Card-List View for Mobile and Tablets */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {paginatedArqueos.map((arq) => {
                const isSelected = arq.id === selectedArqueoId;
                const isActiveSession = arq.estado === 'ABIERTO';

                return (
                  <div
                    key={arq.id}
                    onClick={() => setSelectedArqueoId(arq.id)}
                    className={`p-4 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-50/90 border-l-4 border-emerald-500' : 'bg-white'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">Sesión N° {arq.id}</span>
                          {isActiveSession ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                              ABIERTO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              CERRADO
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                          Apertura: {arq.fechaInicio}
                        </p>
                        {!isActiveSession && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Cierre: {arq.fechaCierre}
                          </p>
                        )}
                      </div>
                      
                      {/* Dropdown triggers */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === arq.id ? null : arq.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeDropdownId === arq.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                            }} />
                            <div className="absolute right-0 top-8 w-44 bg-white border border-slate-150 rounded-xl shadow-xl z-20 overflow-hidden text-left py-1 text-xs">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailArqueo(arq);
                                  setIsDetailModalOpen(true);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                <span>Auditar Detalles</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(`Re-imprimiendo reporte de arqueo N° ${arq.id}...`);
                                  addToast(`Impresión de reporte N° ${arq.id} enviada a cocina.`, 'info');
                                  setActiveDropdownId(null);
                                }}
                                className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-400" />
                                <span>Imprimir Reporte</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedArqueoId(arq.id);
                                  setActiveDropdownId(null);
                                  addToast(`Analizando gráfico de métodos del arqueo N° ${arq.id}.`, 'info');
                                }}
                                className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Ver Distribución</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Numeric Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] mb-3">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Inicio</span>
                        <span className="font-mono font-semibold text-slate-700">S/. {arq.inicio.toFixed(2)}</span>
                      </div>
                      <div className="bg-rose-50/40 p-2 rounded-lg border border-rose-100">
                        <span className="block text-[8px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Egresos</span>
                        <span className="font-mono font-semibold text-rose-600">S/. {arq.egreso.toFixed(2)}</span>
                      </div>
                      <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                        <span className="block text-[8px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Caja</span>
                        <span className="font-mono font-bold text-emerald-600">S/. {arq.totalCaja.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Breakdown Summary */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-500 p-2 rounded-lg bg-slate-50 border border-slate-100 mb-2.5">
                      <div className="flex justify-between">
                        <span>Efec:</span>
                        <span className="font-bold text-slate-700">S/. {arq.ingresoDetalle.efectivo.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Yape/Plin:</span>
                        <span className="font-bold text-slate-700">S/. {arq.ingresoDetalle.digital.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tarj:</span>
                        <span className="font-bold text-slate-700">S/. {arq.ingresoDetalle.tarjeta.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Man:</span>
                        <span className="font-bold text-slate-700">S/. {arq.ingresoDetalle.manual.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Footer values */}
                    <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-100">
                      <div className="flex gap-4">
                        <div>
                          <span className="text-slate-400">Bruto:</span>{' '}
                          <span className="font-mono font-bold text-slate-700">S/. {arq.totalBruto.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Propina:</span>{' '}
                          <span className="font-mono font-bold text-amber-600">S/. {arq.propinas.toFixed(2)}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Pend:</span>{' '}
                        <span className="font-mono font-bold text-amber-500">S/. {arq.pendiente.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-400">
                Total de Arqueos: {filteredArqueos.length} (Sesiones registradas)
              </span>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <span className="font-semibold text-slate-700 font-mono">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* KPI Statistics Section (Analytical Incorporation) - Reordered & Compact */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* KPI 1: Total en Caja Actual */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total en Caja</p>
                <h2 className="text-lg font-extrabold text-emerald-600 mt-1 font-display">S/. {activeArqueo.totalCaja.toFixed(2)}</h2>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">Actualización: hace 2 min</p>
            </div>

            {/* KPI 2: Total Bruto Acumulado */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bruto</p>
                <h2 className="text-lg font-extrabold text-slate-800 mt-1 font-display">S/. {activeArqueo.totalBruto.toFixed(2)}</h2>
              </div>
              <div className="flex gap-1 mt-2">
                <div className="h-1 bg-emerald-400 rounded-full" style={{ width: `${Math.max(10, (activeArqueo.ingresoDetalle.efectivo / (activeArqueo.totalBruto || 1)) * 100)}%` }} title="Efectivo"></div>
                <div className="h-1 bg-blue-400 rounded-full" style={{ width: `${Math.max(10, (activeArqueo.ingresoDetalle.digital / (activeArqueo.totalBruto || 1)) * 100)}%` }} title="Digital"></div>
                <div className="h-1 bg-amber-400 rounded-full" style={{ width: `${Math.max(10, (activeArqueo.ingresoDetalle.tarjeta / (activeArqueo.totalBruto || 1)) * 100)}%` }} title="Tarjeta"></div>
              </div>
            </div>

            {/* KPI 3: Desglose Digital */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flujo Digital</p>
                <h2 className="text-lg font-extrabold text-blue-500 mt-1 font-display">S/. {activeArqueo.ingresoDetalle.digital.toFixed(2)}</h2>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono">{((activeArqueo.ingresoDetalle.digital / (activeArqueo.totalBruto || 1)) * 100).toFixed(0)}% del total</p>
            </div>

            {/* KPI 4: Tarjetas & POS */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flujo Tarjeta</p>
                <h2 className="text-lg font-extrabold text-amber-500 mt-1 font-display">S/. {activeArqueo.ingresoDetalle.tarjeta.toFixed(2)}</h2>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-mono">{((activeArqueo.ingresoDetalle.tarjeta / (activeArqueo.totalBruto || 1)) * 100).toFixed(0)}% del total</p>
            </div>
          </div>

          {/* Interactive Chart Visualizations section - Reordered to bottom */}
          <CustomCharts
            arqueos={arqueos}
            selectedArqueoId={selectedArqueoId}
            onSelectArqueo={(id) => setSelectedArqueoId(id)}
          />
        </div>

        {/* SECTION 3: Optimizacion Cuentas Abiertas (Slidable/Dockable Right Sidebar Drawer) */}
        {/* Docked Sidebar (Desktop Grid View) */}
        {isSidebarDocked && (
          <aside className="hidden lg:flex flex-col w-80 bg-white border-l border-slate-200 p-5 shrink-0 select-none">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              
              {/* Header Title with action to undock or close */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                    <Receipt className="w-4 h-4 text-emerald-500" />
                    Cuentas Abiertas
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Control de mesas en salón activo</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                    {cuentasAbiertas.length} activa(s)
                  </span>
                </div>
              </div>

              {/* Accounts cards render */}
              {cuentasAbiertas.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">¡Todo facturado!</p>
                  <p className="text-[10px] px-4">No hay cuentas pendientes en salón en este momento.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {cuentasAbiertas.map((cuenta) => (
                    <div
                      key={cuenta.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group"
                    >
                      {/* Name of Table and Total Price */}
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-800">{cuenta.mesa}</span>
                        <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100">
                          S/. {cuenta.monto.toFixed(2)}
                        </span>
                      </div>

                      {/* Products detailed breakdown list */}
                      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                        {cuenta.productos.map((prod, pIdx) => (
                          <div key={pIdx} className="flex justify-between text-[11px] text-slate-500">
                            <span className="truncate max-w-[170px]">
                              <span className="font-mono font-semibold text-slate-400 mr-1">{prod.cantidad}x</span>
                              {prod.nombre}
                            </span>
                            <span className="font-mono">S/. {prod.precio.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => handleDiscardCuenta(cuenta.id)}
                          title="Descartar y archivar esta mesa"
                          className="p-2 rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCheckoutCuenta(cuenta);
                            setIsCheckoutModalOpen(true);
                          }}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Cerrar e Imprimir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats totals */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Por cobrar en salón:</span>
                <span className="font-mono font-semibold text-slate-700">
                  S/. {cuentasAbiertas.reduce((acc, c) => acc + c.monto, 0).toFixed(2)}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Estas cuentas representan capital flotante pendiente de facturar en salón.
              </div>
            </div>
          </aside>
        )}

        {/* Mobile floating toggle-overlay Sidebar (Slidable Drawer) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
              />

              {/* Slidable Content Box */}
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-80 bg-white z-50 p-6 flex flex-col justify-between shadow-lg lg:hidden"
              >
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                  
                  {/* Title Header with Close */}
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                        <Receipt className="w-4 h-4 text-emerald-500" />
                        Cuentas Abiertas
                      </h3>
                      <p className="text-[10px] text-slate-400">Control de mesas en salón activo</p>
                    </div>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Accounts Cards mobile list */}
                  {cuentasAbiertas.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-2">
                      <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">¡Todo facturado!</p>
                      <p className="text-[10px] px-4">No hay cuentas pendientes en salón en este momento.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {cuentasAbiertas.map((cuenta) => (
                        <div
                          key={cuenta.id}
                          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between group"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-semibold text-slate-800">{cuenta.mesa}</span>
                            <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100">
                              S/. {cuenta.monto.toFixed(2)}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                            {cuenta.productos.map((prod, pIdx) => (
                              <div key={pIdx} className="flex justify-between text-[11px] text-slate-500">
                                <span className="truncate max-w-[170px]">
                                  <span className="font-mono font-semibold text-slate-400 mr-1">{prod.cantidad}x</span>
                                  {prod.nombre}
                                </span>
                                <span className="font-mono">S/. {prod.precio.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <button
                              onClick={() => {
                                handleDiscardCuenta(cuenta.id);
                                setIsSidebarOpen(false);
                              }}
                              className="p-2 rounded-lg border border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCheckoutCuenta(cuenta);
                                setIsCheckoutModalOpen(true);
                                setIsSidebarOpen(false);
                              }}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Cerrar e Imprimir</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Por cobrar en salón:</span>
                    <span className="font-mono font-semibold text-slate-700">
                      S/. {cuentasAbiertas.reduce((acc, c) => acc + c.monto, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Estas cuentas representan capital flotante pendiente de facturar en salón.
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Toggle trigger for open accounts on screens without the sidebar docked */}
      {!isSidebarDocked && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed bottom-6 right-6 z-30 bg-slate-900 text-white hover:bg-slate-800 p-4 rounded-full shadow-2xl transition-all cursor-pointer flex items-center gap-2"
        >
          <Receipt className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold font-display">Cuentas Abiertas</span>
          <span className="bg-emerald-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {cuentasAbiertas.length}
          </span>
        </button>
      )}

      {/* Footer copyright */}
      <footer className="bg-slate-900 text-slate-500 py-4 text-center text-[11px] border-t border-slate-800 font-mono mt-auto select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>ComandaGo v2.4 ERP • Módulo de Caja Registradora</span>
          <span>© 2026 Todos los derechos reservados. Diseñado por Senior UX/UI Studio.</span>
        </div>
      </footer>

      {/* --- Register Movement Modal --- */}
      <MovimientoModal
        isOpen={isMovModalOpen}
        onClose={() => setIsMovModalOpen(false)}
        onAddMovimiento={handleAddMovimiento}
        activeArqueo={activeArqueo}
      />

      {/* --- Table checkout register modal --- */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setSelectedCheckoutCuenta(null);
        }}
        cuenta={selectedCheckoutCuenta}
        onConfirmCheckout={handleConfirmCheckout}
      />

      {/* --- Audit details logs modal --- */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailArqueo(null);
        }}
        arqueo={selectedDetailArqueo}
        movimientos={movimientos}
      />
    </div>
  );
}
