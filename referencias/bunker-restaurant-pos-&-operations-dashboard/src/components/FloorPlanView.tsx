import React, { useState } from 'react';
import {
  Users,
  Clock,
  DollarSign,
  UserCheck,
  Sparkles,
  AlertCircle,
  CreditCard,
  Compass,
  Grid3X3,
  MapPin,
  Search,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { TableItem, TableStatus, TableZone } from '../types';
import { TablePopoverLive } from './TablePopoverLive';

interface FloorPlanViewProps {
  tables: TableItem[];
  selectedTable: TableItem | null;
  onSelectTable: (table: TableItem) => void;
  activeZone: TableZone;
  onChangeZone: (zone: TableZone) => void;
  onQuickStatusChange: (tableId: string, newStatus: TableStatus) => void;
  onOpenFullModal?: (table: TableItem) => void;
}

export const FloorPlanView: React.FC<FloorPlanViewProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  activeZone,
  onChangeZone,
  onQuickStatusChange,
  onOpenFullModal
}) => {
  const [viewMode, setViewMode] = useState<'floor_plan' | 'pos_grid'>('floor_plan');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPopoverDismissed, setIsPopoverDismissed] = useState<boolean>(false);

  // Zone filters
  const filteredByZone = activeZone === 'all'
    ? tables
    : tables.filter(t => t.zone === activeZone);

  // Status and search filters
  const filteredTables = filteredByZone.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.number.toString().includes(q) ||
        (t.waiterName && t.waiterName.toLowerCase().includes(q)) ||
        (t.reservationName && t.reservationName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusColorConfig = (status: TableStatus, isDelayed?: boolean) => {
    if (isDelayed) {
      return {
        bg: 'bg-rose-500/20 hover:bg-rose-500/30',
        border: 'border-rose-500 hover:border-rose-400',
        glow: 'neon-glow-rose',
        badgeBg: 'bg-rose-500/30 text-rose-300 border-rose-500/50',
        indicator: 'bg-rose-500',
        text: 'text-rose-400',
        label: 'Demorada'
      };
    }

    switch (status) {
      case 'free':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
          border: 'border-emerald-500/40 hover:border-emerald-400',
          glow: 'neon-glow-emerald',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          indicator: 'bg-emerald-400',
          text: 'text-emerald-400',
          label: 'Libre'
        };
      case 'occupied':
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/20',
          border: 'border-amber-500/50 hover:border-amber-400',
          glow: 'neon-glow-amber',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          indicator: 'bg-amber-400',
          text: 'text-amber-400',
          label: 'Ocupada'
        };
      case 'reserved':
        return {
          bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
          border: 'border-cyan-500/50 hover:border-cyan-400',
          glow: 'neon-glow-cyan',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          indicator: 'bg-cyan-400',
          text: 'text-cyan-400',
          label: 'Reservada'
        };
      case 'billing':
        return {
          bg: 'bg-rose-500/15 hover:bg-rose-500/25',
          border: 'border-rose-500/70 hover:border-rose-400',
          glow: 'neon-glow-rose',
          badgeBg: 'bg-rose-500/25 text-rose-300 border-rose-500/40',
          indicator: 'bg-rose-400',
          text: 'text-rose-400',
          label: 'Por Pagar'
        };
      case 'cleaning':
        return {
          bg: 'bg-slate-700/20 hover:bg-slate-700/30',
          border: 'border-slate-600/50 hover:border-slate-500',
          glow: '',
          badgeBg: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
          indicator: 'bg-slate-400',
          text: 'text-slate-400',
          label: 'Limpieza'
        };
      default:
        return {
          bg: 'bg-slate-800',
          border: 'border-slate-700',
          glow: '',
          badgeBg: 'bg-slate-800 text-slate-400 border-slate-700',
          indicator: 'bg-slate-400',
          text: 'text-slate-400',
          label: 'Desconocido'
        };
    }
  };

  const calculateTableTotal = (table: TableItem) => {
    return table.activeOrders.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleTableClick = (table: TableItem) => {
    setIsPopoverDismissed(false);
    onSelectTable(table);
  };

  // Counts for status chips
  const counts = {
    all: tables.length,
    free: tables.filter(t => t.status === 'free').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    billing: tables.filter(t => t.status === 'billing').length,
    delayed: tables.filter(t => t.isDelayed).length,
  };

  return (
    <div id="restaurant-floor-plan-card" className="glass-panel rounded-2xl p-4 sm:p-5 lg:p-6 flex flex-col h-full hover:border-white/15 transition-all">

      {/* Floor Plan Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-white/10">

        {/* Title & View Toggle */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2 tracking-tight">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Plano de Sala en Vivo
              </h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-black/80 text-white font-mono-nums font-bold border border-white/10 shadow-inner">
                {filteredTables.length} mesas
              </span>
            </div>
            <p className="text-xs text-white mt-0.5 font-medium">
              Distribución arquitectónica orgánica con alertas de espera y comanda interactiva
            </p>
          </div>

          {/* Segmented View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 ml-auto md:ml-2">
            <button
              id="view-mode-floor-plan"
              onClick={() => setViewMode('floor_plan')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'floor_plan'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
              title="Plano arquitectónico interactivo"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plano</span>
            </button>
            <button
              id="view-mode-pos-grid"
              onClick={() => setViewMode('pos_grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'pos_grid'
                ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
              title="Matriz rápida de TPV / POS"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Matriz POS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zone Tabs & Status Pills Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 border-b border-white/10">

        {/* Zone switcher pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'Todas las Zonas', icon: '🏛️' },
            { id: 'main_hall', label: 'Salón Principal', icon: '🍷' },
            { id: 'terrace', label: 'Terraza Exterior', icon: '🌿' },
            { id: 'bar_lounge', label: 'Barra & Lounge', icon: '🍸' },
            { id: 'vip_room', label: 'Cava VIP', icon: '👑' },
          ].map((z) => (
            <button
              key={z.id}
              id={`zone-tab-${z.id}`}
              onClick={() => onChangeZone(z.id as TableZone)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold transition-all flex items-center gap-1.5 ${activeZone === z.id
                ? 'bg-zinc-800/90 text-white border border-white/20 shadow-md'
                : 'bg-black/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                }`}
            >
              <span>{z.icon}</span>
              <span>{z.label}</span>
            </button>
          ))}
        </div>

        {/* Status Filter Badges with live counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${statusFilter === 'all'
              ? 'bg-zinc-800 text-white border-white/20 font-bold'
              : 'bg-black/50 text-zinc-400 border-white/10 hover:text-zinc-200'
              }`}
          >
            Todas ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('occupied')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'occupied'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
              : 'bg-black/50 text-amber-400/90 border-white/10 hover:border-amber-500/30'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Ocupadas ({counts.occupied})
          </button>
          <button
            onClick={() => setStatusFilter('free')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'free'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold'
              : 'bg-black/50 text-emerald-400/90 border-white/10 hover:border-emerald-500/30'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Libres ({counts.free})
          </button>
          <button
            onClick={() => setStatusFilter('billing')}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'billing'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 font-bold neon-glow-rose'
              : 'bg-black/50 text-rose-400/90 border-white/10 hover:border-rose-500/30'
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Cobro ({counts.billing})
          </button>
        </div>
      </div>

      {/* Main Floor Plan Area or POS Grid */}
      <div className="flex-1 mt-4 relative min-h-[500px] lg:min-h-[540px]">
        {viewMode === 'floor_plan' ? (
          /* ARCHITECTURAL FLOOR PLAN CANVAS */
          <div
            id="interactive-floor-map-canvas"
            className="w-full h-full min-h-[500px] lg:min-h-[540px] bg-black/90 rounded-2xl border border-white/10 p-4 relative overflow-hidden select-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          >
            {/* Zone Markers / Structural Dividers */}
            <div className="absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5 z-0">
              <span className="text-zinc-400">🍷 Salón Principal</span>
              <span className="text-zinc-700">•</span>
              <span className="text-zinc-500">Ventanal Norte</span>
            </div>

            <div className="absolute top-3 right-4 text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5 z-0">
              <span className="text-emerald-400/80">🌿 Terraza & Deck Exterior</span>
            </div>

            {/* BAR COUNTER FIXTURE */}
            <div className="absolute bottom-[4%] right-[10%] left-[45%] h-7 bg-zinc-900/90 border border-amber-500/30 rounded-xl flex items-center justify-between px-3 text-[9px] font-bold text-amber-300/80 pointer-events-none z-0 shadow-lg shadow-black">
              <span className="flex items-center gap-1">🍸 BARRA DE COCTELERÍA & TRAGOS DE AUTOR</span>
              <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono">Pase 1</span>
            </div>

            <div className="absolute bottom-3 left-3 text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5 z-0">
              <span className="text-amber-400/80">👑 Cava & Salón VIP</span>
            </div>

            {/* Architectural subtle grid lines */}
            <div className="absolute top-0 bottom-0 left-[64%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none"></div>
            <div className="absolute left-0 right-[36%] bottom-[22%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"></div>

            {/* Render Tables on Floor Map */}
            {filteredTables.map((table) => {
              const cfg = getStatusColorConfig(table.status, table.isDelayed);
              const isSelected = selectedTable?.id === table.id;
              const totalAmount = calculateTableTotal(table);
              const shape = table.position.shape || 'rect';

              // Shape styling classes
              let shapeClasses = 'rounded-2xl';
              if (shape === 'round') shapeClasses = 'rounded-full';
              else if (shape === 'rect_h') shapeClasses = 'rounded-2xl';
              else if (shape === 'bar_stool') shapeClasses = 'rounded-xl';
              else if (shape === 'booth') shapeClasses = 'rounded-t-2xl rounded-b-md border-b-2 border-b-amber-500/40';

              return (
                <div
                  key={table.id}
                  id={`table-map-node-${table.number}`}
                  onClick={() => handleTableClick(table)}
                  style={{
                    left: `${table.position.x}%`,
                    top: `${table.position.y}%`,
                    width: `${Math.max(table.position.width, 7)}%`,
                    height: `${Math.max(table.position.height, 9)}%`,
                  }}
                  className={`absolute border cursor-pointer transition-all duration-200 group flex flex-col justify-between p-2 z-10 ${shapeClasses} ${cfg.bg} ${cfg.border} ${cfg.glow} ${isSelected ? 'ring-2 ring-emerald-400 scale-[1.04] z-30 shadow-[0_0_25px_rgba(16,185,129,0.5)]' : ''
                    } ${table.isDelayed ? 'table-delayed-ring' : ''}`}
                >
                  {/* Table Header: Number & Status Beacon */}
                  <div className="flex items-center justify-between pointer-events-none">
                    <span className="text-xs font-mono-nums font-black text-white group-hover:text-emerald-300 transition-colors">
                      M#{table.number < 10 ? `0${table.number}` : table.number}
                    </span>

                    {/* Visual Alert Indicator (>15m wait) */}
                    {table.isDelayed ? (
                      <span className="relative flex h-3 w-3" title={table.delayReason || 'Mesa demorada (>15m)'}>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-black shadow-[0_0_8px_#f43f5e]"></span>
                      </span>
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${cfg.indicator} shadow-sm shadow-black`} />
                    )}
                  </div>

                  {/* Table Body: Capacity / Waiter / Seated Time */}
                  <div className="my-auto text-center pointer-events-none">
                    {shape === 'bar_stool' ? (
                      <div className="text-[10px] font-bold font-mono-nums text-zinc-300">
                        {table.status === 'occupied' ? `$${totalAmount.toFixed(0)}` : 'Tab'}
                      </div>
                    ) : table.status === 'occupied' ? (
                      <div>
                        <div className="text-xs font-black text-amber-300 font-mono-nums flex items-center justify-center gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          <span>{totalAmount.toFixed(0)}</span>
                        </div>
                        <div className="text-[9px] text-zinc-300 font-mono-nums flex items-center justify-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          <span>{table.seatedMinutes}m</span>
                        </div>
                      </div>
                    ) : table.status === 'billing' ? (
                      <div className="bg-rose-500/30 rounded-lg py-0.5 px-1 border border-rose-500/50 shadow-inner">
                        <div className="text-xs font-black text-rose-200 font-mono-nums">
                          ${totalAmount.toFixed(0)}
                        </div>
                        <div className="text-[8px] font-black text-rose-300 uppercase tracking-tighter">
                          Cobro
                        </div>
                      </div>
                    ) : table.status === 'reserved' ? (
                      <div>
                        <div className="text-[9px] font-bold text-cyan-300 font-mono-nums">
                          {table.reservationTime}
                        </div>
                        <div className="text-[8px] text-zinc-400 truncate max-w-[80px] mx-auto">
                          {table.reservationName?.split(' ')[0] || 'Reserva'}
                        </div>
                      </div>
                    ) : table.status === 'cleaning' ? (
                      <div className="text-[9px] text-zinc-400 italic">
                        Limpieza
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <Users className="w-2.5 h-2.5" />
                        <span>{table.capacity}p</span>
                      </div>
                    )}
                  </div>

                  {/* Table Footer: Waiter initials / micro label */}
                  {shape !== 'bar_stool' && (
                    <div className="flex items-center justify-between text-[9px] text-zinc-400 border-t border-white/10 pt-0.5 pointer-events-none">
                      <span className="truncate max-w-[50px] text-zinc-300 font-medium">
                        {table.waiterName ? table.waiterName.split(' ')[0] : `${table.capacity}p`}
                      </span>
                      {table.isDelayed ? (
                        <span className="text-[8px] font-black text-rose-400 animate-pulse">
                          +15m
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-zinc-500">
                          {table.guestsCount > 0 ? `${table.guestsCount}c` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Micro Chair Dots on sides according to geometry */}
                  {shape === 'rect' && (
                    <>
                      <div className="absolute -top-1 left-1/4 w-1.5 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -top-1 right-1/4 w-1.5 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -bottom-1 left-1/4 w-1.5 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -bottom-1 right-1/4 w-1.5 h-1 bg-zinc-600 rounded-sm"></div>
                    </>
                  )}
                  {shape === 'rect_h' && (
                    <>
                      <div className="absolute -top-1 left-1/4 w-2 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -top-1 right-1/4 w-2 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -bottom-1 left-1/4 w-2 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-zinc-600 rounded-sm"></div>
                      <div className="absolute -bottom-1 right-1/4 w-2 h-1 bg-zinc-600 rounded-sm"></div>
                    </>
                  )}
                  {shape === 'round' && (
                    <>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
                      <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-1.5 bg-zinc-600 rounded-full"></div>
                    </>
                  )}
                </div>
              );
            })}

            {/* FLOATING LIVE POPOVER (Simulated Live Interaction on M#84 / Selected Table) */}
            {selectedTable && !isPopoverDismissed && (
              <TablePopoverLive
                table={selectedTable}
                onClose={() => setIsPopoverDismissed(true)}
                onConfirmPayment={(id) => {
                  onQuickStatusChange(id, 'cleaning');
                  setIsPopoverDismissed(true);
                }}
                onOpenFullModal={(t) => {
                  if (onOpenFullModal) onOpenFullModal(t);
                }}
                onTriggerBill={(id) => {
                  onQuickStatusChange(id, 'billing');
                }}
              />
            )}
          </div>
        ) : (
          /* POS QUICK GRID VIEW (Table Seating Matrix) */
          <div id="pos-quick-grid-matrix" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredTables.map((table) => {
              const cfg = getStatusColorConfig(table.status, table.isDelayed);
              const isSelected = selectedTable?.id === table.id;
              const totalAmount = calculateTableTotal(table);

              return (
                <div
                  key={table.id}
                  id={`pos-table-card-${table.number}`}
                  onClick={() => handleTableClick(table)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${cfg.bg} ${cfg.border} ${isSelected ? 'ring-2 ring-emerald-400 scale-[1.02] shadow-lg shadow-emerald-500/20' : ''
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black font-mono-nums text-white">
                        #{table.number < 10 ? `0${table.number}` : table.number}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate max-w-[60px]">{table.name.split('-')[1] || ''}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cfg.badgeBg}`}>
                      {table.isDelayed ? '⚠️ Demora' : cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-300 mb-2 font-mono-nums">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{table.guestsCount}/{table.capacity} comensales</span>
                    </div>
                    {table.seatedMinutes ? (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{table.seatedMinutes} min</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Financial or Reservation Note */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    {table.status === 'occupied' || table.status === 'billing' ? (
                      <>
                        <span className="text-zinc-400 text-[11px]">Consumo:</span>
                        <span className="font-mono-nums font-black text-amber-400">${totalAmount.toFixed(2)}</span>
                      </>
                    ) : table.status === 'reserved' ? (
                      <>
                        <span className="text-cyan-400 text-[11px] font-semibold">{table.reservationTime}</span>
                        <span className="text-zinc-400 text-[11px] truncate max-w-[90px]">{table.reservationName}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-emerald-400 text-[11px]">Disponible</span>
                        <span className="text-zinc-500 text-[11px]">{table.zone.replace('_', ' ')}</span>
                      </>
                    )}
                  </div>

                  {/* Mozo in charge */}
                  {table.waiterName && (
                    <div className="mt-1.5 text-[10px] text-zinc-400 flex items-center gap-1 truncate">
                      <UserCheck className="w-3 h-3 text-amber-400" />
                      <span>Mozo: <b className="text-zinc-300">{table.waiterName}</b></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floor Plan Footer Note & Quick Action hint */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 neon-glow-emerald"></span>
          <span>Haz clic sobre cualquier mesa en el plano (ej. <b className="text-emerald-300">M#84</b>) para abrir la comanda interactiva y confirmar pagos.</span>
        </div>
        <div className="text-[11px] text-zinc-500">
          Estado POS: <b className="text-emerald-400 font-mono-nums font-semibold">En vivo • KDS conectado</b>
        </div>
      </div>

    </div>
  );
};
