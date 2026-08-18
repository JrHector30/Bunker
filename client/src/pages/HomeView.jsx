import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  CreditCard, TrendingUp, MoreHorizontal, ChefHat, Clock, Layers,
  Award, Sparkles, Receipt, CheckCircle, Bell, MessageSquare,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Utensils, Wine, Coffee,
  Eye, EyeOff, MapPin, Printer, Star, ArrowRight, ShieldCheck, AlertTriangle, Compass, Users,
  Trophy, Zap, Crown, Medal, ArrowUpRight, Flame, X, LayoutDashboard, UtensilsCrossed, Menu,
  Grid3X3, DollarSign, Search, CheckCircle2
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { enqueueTicket } from '../utils/printer';
import { CheckoutModal } from '../components/CheckoutModal';

// Reusable premium card container using native classes for theme sync
const GlassCard = ({ children, className = "", style = {}, onClick }) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden rounded-[24px] transition-all duration-300 group bg-[var(--bg-secondary)] border border-[var(--glass-border)] hover:border-[var(--primary)]/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${className}`}
    style={{
      boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.2)',
      ...style,
    }}
  >
    {children}
  </div>
);

// Helper to determine status color settings
const getStatusColorConfig = (status, isDelayed) => {
  if (isDelayed) {
    return {
      bg: 'bg-rose-500/10 hover:bg-rose-500/20',
      border: 'border-rose-500 hover:border-rose-450',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.25)]',
      indicator: 'bg-rose-500',
      text: 'text-rose-400',
      label: 'Demorada'
    };
  }

  switch (status?.toLowerCase()) {
    case 'libre':
    case 'free':
      return {
        bg: 'bg-emerald-500/5 hover:bg-emerald-500/15',
        border: 'border-emerald-500/40 hover:border-emerald-400',
        glow: 'shadow-[0_0_10px_rgba(16,185,129,0.15)]',
        indicator: 'bg-emerald-400',
        text: 'text-emerald-400',
        label: 'Libre'
      };
    case 'ocupada':
    case 'ocupado':
    case 'occupied':
      return {
        bg: 'bg-amber-500/5 hover:bg-amber-500/15',
        border: 'border-amber-500/40 hover:border-amber-400',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
        indicator: 'bg-amber-400',
        text: 'text-amber-400',
        label: 'Ocupada'
      };
    case 'por pagar':
    case 'billing':
    case 'cuenta':
      return {
        bg: 'bg-rose-500/10 hover:bg-rose-500/20',
        border: 'border-rose-500/60 hover:border-rose-400 animate-pulse',
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
        indicator: 'bg-rose-400',
        text: 'text-rose-400',
        label: 'Por Pagar'
      };
    case 'reservada':
    case 'reserved':
      return {
        bg: 'bg-cyan-500/5 hover:bg-cyan-500/15',
        border: 'border-cyan-500/40 hover:border-cyan-400',
        glow: 'shadow-[0_0_12px_rgba(6,182,212,0.2)]',
        indicator: 'bg-cyan-400',
        text: 'text-cyan-400',
        label: 'Reservada'
      };
    case 'cleaning':
    case 'limpieza':
      return {
        bg: 'bg-zinc-700/10 hover:bg-zinc-700/20',
        border: 'border-zinc-600/40 hover:border-zinc-500',
        glow: '',
        indicator: 'bg-zinc-400',
        text: 'text-zinc-400',
        label: 'Limpieza'
      };
    default:
      return {
        bg: 'bg-zinc-800/10 hover:bg-zinc-800/20',
        border: 'border-zinc-700/40',
        glow: '',
        indicator: 'bg-zinc-400',
        text: 'text-zinc-400',
        label: 'Desconocido'
      };
  }
};

// 1. Quick KPI Bar Component (Bento Row)
const QuickKpiBarComponent = ({
  tables,
  occupiedTablesCount,
  totalTablesCount,
  averageWaitTime,
  currentEarning,
  DAILY_GOAL,
  goalPercentage,
  lowStockInsumosCount,
  onHide,
  hiddenWidgets,
  designMode
}) => {
  const isHidden = hiddenWidgets.includes('quickKpiBar');
  if (isHidden && !designMode) return null;

  const freeTables = tables.filter(t => t.estado?.toLowerCase() === 'libre' || t.estado?.toLowerCase() === 'free').length;
  const billingTables = tables.filter(t => t.estado?.toLowerCase() === 'por pagar' || t.estado?.toLowerCase() === 'billing' || t.estado?.toLowerCase() === 'cuenta').length;
  const delayedTables = tables.filter(t => {
    if (t.comandas && t.comandas.length > 0) {
      const diff = Date.now() - new Date(t.comandas[0].fecha).getTime();
      return Math.floor(diff / 60000) > 15;
    }
    return false;
  }).length;

  return (
    <section
      id="bunker-kpi-bar"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-5 relative ${isHidden ? 'opacity-40 border border-dashed border-red-500/50 rounded-3xl p-1 bg-red-500/5' : ''}`}
    >
      {/* KPI 1: Ocupación de Mesas (Bento 3-col) */}
      <GlassCard className="lg:col-span-3 p-4 flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Ocupación de Mesas</span>
          <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 px-2.5 py-0.5 rounded-lg font-bold font-mono-nums flex items-center gap-0.5 shadow-[0_0_10px_rgba(249,115,22,0.15)]">
            {Math.round((occupiedTablesCount / (totalTablesCount || 1)) * 100)}% Cap.
          </span>
        </div>

        <div className="flex items-end justify-between my-2">
          <h2 className="text-3xl font-black font-mono-nums text-[var(--text-main)] tracking-tight">
            {occupiedTablesCount}<span className="text-[var(--text-muted)] text-lg font-normal">/{totalTablesCount}</span>
          </h2>
          <div className="text-right text-[11px] text-[var(--text-muted)] font-medium">
            <span className="text-emerald-450 font-bold">{freeTables} libres</span>
            {billingTables > 0 && <span className="text-rose-455 ml-1.5 font-bold">• {billingTables} cobro</span>}
          </div>
        </div>

        <div className="w-full bg-black/60 h-1.5 rounded-full mt-1 overflow-hidden border border-[var(--glass-border)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${(occupiedTablesCount / (totalTablesCount || 1)) > 0.8 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            style={{ width: `${Math.round((occupiedTablesCount / (totalTablesCount || 1)) * 100)}%` }}
          />
        </div>

        {designMode && (
          <button
            onClick={() => onHide('quickKpiBar')}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-zinc-400 hover:text-white transition-all z-30"
          >
            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}
      </GlassCard>

      {/* KPI 2: Tiempo de Espera (Bento 3-col) */}
      <GlassCard className="lg:col-span-3 p-4 flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Tiempo Promedio</span>
          {delayedTables > 0 ? (
            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg font-bold font-mono-nums flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.25)]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-450 animate-ping"></span>
              {delayedTables} demoras
            </span>
          ) : (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-bold font-mono-nums flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Óptimo
            </span>
          )}
        </div>

        <div className="flex items-end justify-between my-2">
          <h2 className="text-3xl font-black font-mono-nums text-[var(--text-main)] tracking-tight">
            {averageWaitTime}<span className="text-[var(--text-muted)] text-lg font-normal">min</span>
          </h2>
          <span className="text-[11px] text-[var(--text-muted)] font-mono-nums">Meta: &lt;14m</span>
        </div>

        {/* Multi-segment mini progress bar */}
        <div className="flex space-x-1 mt-1">
          <div className="h-1 flex-grow bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
          <div className="h-1 flex-grow bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
          <div className="h-1 flex-grow bg-amber-500 rounded-full"></div>
          <div className="h-1 flex-grow bg-black/40 rounded-full border border-[var(--glass-border)]"></div>
        </div>

        {designMode && (
          <button
            onClick={() => onHide('quickKpiBar')}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-zinc-400 hover:text-white transition-all z-30"
          >
            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}
      </GlassCard>

      {/* KPI 3: Venta del Turno (Bento 4-col) */}
      <GlassCard className="lg:col-span-4 p-4 flex items-center justify-between min-h-[110px]">
        <div className="flex-1">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Venta del Turno</span>
          <h2 className="text-2xl sm:text-3xl font-black font-mono-nums text-[var(--text-main)] mt-1 tracking-tight">
            S/. {currentEarning.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-[10px] text-emerald-400 font-mono-nums mt-0.5 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> +12% vs turno ant.
          </p>
        </div>

        <div className="flex items-center space-x-3 ml-2">
          <div className="text-right">
            <p className="text-[9px] text-[var(--text-muted)] uppercase font-bold">Meta</p>
            <p className="text-xs font-bold font-mono-nums text-[var(--text-main)]">S/. {DAILY_GOAL}</p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-black/40 border-t-[var(--primary)] flex items-center justify-center shadow-[0_0_12px_var(--color-brand-glow)]">
            <span className="text-[10px] font-black font-mono-nums text-[var(--text-main)]">{goalPercentage}%</span>
          </div>
        </div>

        {designMode && (
          <button
            onClick={() => onHide('quickKpiBar')}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-zinc-400 hover:text-white transition-all z-30"
          >
            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}
      </GlassCard>

      {/* KPI 4: KDS Cocina (Bento 2-col) */}
      <GlassCard className="lg:col-span-2 p-4 flex flex-col justify-between min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cocina KDS</span>
          <ChefHat className="w-4 h-4 text-amber-500" />
        </div>

        <div className="my-2">
          <h2 className="text-2xl font-black font-mono-nums text-[var(--text-main)]">
            {lowStockInsumosCount} <span className="text-xs text-[var(--text-muted)] font-normal">alertas</span>
          </h2>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--glass-border)]">
          <span>Insumos bajos</span>
          <span className="font-mono-nums font-bold text-amber-500">{lowStockInsumosCount}</span>
        </div>

        {designMode && (
          <button
            onClick={() => onHide('quickKpiBar')}
            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-zinc-400 hover:text-white transition-all z-30"
          >
            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        )}
      </GlassCard>
    </section>
  );
};

// 2. Interactive Floor Plan View
const FloorPlanComponent = ({
  tables,
  selectedTable,
  onSelectTable,
  activeZone,
  onChangeZone,
  onHide,
  hiddenWidgets,
  designMode
}) => {
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isHidden = hiddenWidgets.includes('floorPlan');
  if (isHidden && !designMode) return null;

  // Filter logic
  const filteredTables = tables.filter(t => {
    // Exclude special tables
    if (t.numero === '100' || t.numero === '101') return false;

    // Zone filter
    if (activeZone !== 'all') {
      const parentZone = t.posX > 64 ? 'terraza' : (t.posY > 70 ? 'barra' : 'principal');
      if (activeZone !== parentZone) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const state = t.estado?.toLowerCase();
      if (statusFilter === 'occupied' && state !== 'ocupada' && state !== 'ocupado') return false;
      if (statusFilter === 'free' && state !== 'libre' && state !== 'free') return false;
      if (statusFilter === 'billing' && state !== 'por pagar' && state !== 'billing') return false;
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const waiter = t.comandas?.[0]?.usuario?.nombre?.toLowerCase() || '';
      return t.numero.toString().includes(q) || waiter.includes(q);
    }

    return true;
  });

  const getDinersCount = (table) => {
    return table.comandas?.[0]?.comensales || table.capacidad || 2;
  };

  const getActiveBillAmount = (table) => {
    const comanda = table.comandas?.[0];
    if (!comanda || !comanda.detalles) return 0;
    return comanda.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
  };

  const getTableElapsedMins = (table) => {
    const comanda = table.comandas?.[0];
    if (!comanda) return null;
    const diffMs = Date.now() - new Date(comanda.fecha).getTime();
    return Math.max(1, Math.floor(diffMs / 60000));
  };

  const counts = {
    all: tables.length,
    free: tables.filter(t => t.estado?.toLowerCase() === 'libre' || t.estado?.toLowerCase() === 'free').length,
    occupied: tables.filter(t => t.estado?.toLowerCase() === 'ocupada' || t.estado?.toLowerCase() === 'ocupado').length,
    billing: tables.filter(t => t.estado?.toLowerCase() === 'por pagar' || t.estado?.toLowerCase() === 'billing' || t.estado?.toLowerCase() === 'cuenta').length,
  };

  const activeOrder = selectedTable?.comandas?.[0];
  const activeBill = selectedTable ? getActiveBillAmount(selectedTable) : 0;
  const elapsed = selectedTable ? getTableElapsedMins(selectedTable) : null;

  return (
    <GlassCard
      className={`p-4 sm:p-5 lg:p-6 flex flex-col h-full relative ${isHidden ? 'opacity-40 border border-dashed border-red-500/50 p-1 bg-red-500/5' : ''}`}
    >
      {/* Floor Plan Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-[var(--glass-border)]">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-450 animate-bounce" />
            <h3 className="font-extrabold text-base text-[var(--text-main)] tracking-tight">Plano de Sala en Vivo</h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white text-[var(--text-main)] font-mono-nums font-bold border border-[var(--glass-border)] shadow-inner">
              {filteredTables.length} mesas
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
            Distribución física en tiempo real y comanda interactiva
          </p>
        </div>
      </div>

      {/* Zone Tabs & Status Pills Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 py-3 border-b border-[var(--glass-border)]">
        {/* Zone switcher pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none">
          <button
            onClick={() => onChangeZone('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-semibold font-sans transition-all flex items-center gap-1.5 bg-zinc-800 text-white border border-[var(--glass-border)] shadow-md`}
          >
            <span>🏛️</span>
            <span>Todas las Zonas</span>
          </button>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg border font-medium font-sans transition-all ${statusFilter === 'all'
              ? (isDarkMode ? 'bg-zinc-800 text-white border-[var(--glass-border)] font-bold' : 'bg-zinc-300 text-zinc-950 border-zinc-400 font-bold')
              : (isDarkMode ? 'bg-black/50 text-[var(--text-muted)] border-[var(--glass-border)]/50 hover:text-[var(--text-main)]' : 'bg-white/45 text-zinc-600 border-zinc-200/60 hover:text-zinc-900')
              }`}
          >
            Todas ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('occupied')}
            className={`px-2.5 py-1 rounded-lg border font-medium font-sans transition-all flex items-center gap-1.5 ${statusFilter === 'occupied'
              ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/60 font-bold'
              : (isDarkMode ? 'bg-black/50 text-amber-500/90 border-[var(--glass-border)] hover:border-amber-500/30' : 'bg-white/45 text-amber-600 border-zinc-200/60 hover:border-amber-500/30')
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Ocupadas ({counts.occupied})
          </button>
          <button
            onClick={() => setStatusFilter('free')}
            className={`px-2.5 py-1 rounded-lg border font-medium font-sans transition-all flex items-center gap-1.5 ${statusFilter === 'free'
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/60 font-bold'
              : (isDarkMode ? 'bg-black/50 text-emerald-500/90 border-[var(--glass-border)] hover:border-emerald-550' : 'bg-white/45 text-emerald-600 border-zinc-200/60 hover:border-emerald-550')
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Libres ({counts.free})
          </button>
          <button
            onClick={() => setStatusFilter('billing')}
            className={`px-2.5 py-1 rounded-lg border font-medium font-sans transition-all flex items-center gap-1.5 ${statusFilter === 'billing'
              ? 'bg-rose-500/20 text-rose-500 dark:text-rose-300 border-rose-500/60 font-bold animate-pulse'
              : (isDarkMode ? 'bg-black/50 text-rose-500/90 border-[var(--glass-border)] hover:border-rose-500/30' : 'bg-white/45 text-rose-600 border-zinc-200/60 hover:border-rose-500/30')
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Cobro ({counts.billing})
          </button>
        </div>
      </div>

      {/* Main Floor Area Grid */}
      <div className="flex-1 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[410px] lg:min-h-[440px]">
        {/* Interactive Floor Plan (Left 8 Cols) */}
        <div
          className="lg:col-span-8 bg-black/90 rounded-2xl border border-[var(--glass-border)] p-4 relative overflow-hidden select-none min-h-[390px] lg:min-h-[420px]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        >
          {/* Zone Dividers */}
          <div className="absolute top-3 left-3 text-[9px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1 pointer-events-none z-0">
            🍷 Salón Principal
          </div>
          <div className="absolute top-3 right-3 text-[9px] uppercase font-bold tracking-wider text-emerald-500/80 pointer-events-none z-0">
            🌿 Terraza Exterior
          </div>
          <div className="absolute bottom-[3.5%] right-[10%] left-[45%] h-7 bg-zinc-900/95 border border-[var(--glass-border)] rounded-xl flex items-center justify-center text-[9px] font-bold text-amber-500/80 pointer-events-none z-0 shadow-lg shadow-black/80">
            🍸 BARRA COCTELERÍA & LOUNGE
          </div>

          {/* Render Tables on Floor Map */}
          {filteredTables.map((table) => {
            const isSelected = selectedTable?.id === table.id;
            const totalAmount = getActiveBillAmount(table);
            const state = table.estado?.toLowerCase();
            const isOccupied = state === 'ocupada' || state === 'ocupado';
            const isBilling = state === 'por pagar' || state === 'billing' || state === 'cuenta';

            // Class selection based on theme index.css classes
            let classeNeon = 'mesa-libre-neon';

            if (isOccupied) {
              classeNeon = 'mesa-ocupada-neon';
            } else if (isBilling) {
              classeNeon = 'mesa-ocupada-neon border-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.35)]';
            } else if (state === 'limpieza' || state === 'cleaning') {
              classeNeon = 'mesa-apagada';
            }

            const rawY = table.posY !== undefined && table.posY !== null ? table.posY : 25;
            // Compress vertical range from [19, 95] to [6, 56] to strongly reduce vertical spacing and fit screen
            const finalTop = 12 + ((rawY - 19) / 76) * 50;

            return (
              <div
                key={table.id}
                onClick={() => onSelectTable(table)}
                style={{
                  position: 'absolute',
                  left: `${table.posX !== undefined && table.posX !== null ? table.posX : 15}%`,
                  top: `${finalTop}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '84px',
                  height: '84px',
                  background: 'var(--mesa-bg, rgba(15, 15, 20, 0.8))',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: isSelected ? 40 : 20,
                  transition: 'all 0.2s ease',
                }}
                className={`mesa-mapa cursor-pointer border ${classeNeon} ${isSelected ? 'ring-2 ring-emerald-400 scale-[1.05] shadow-[0_0_25px_rgba(16,185,129,0.45)]' : ''
                  }`}
              >
                {/* Table Header: Table Name / Number */}
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main, #fff)', pointerEvents: 'none' }}>
                  {table.numero < 10 ? `0${table.numero}` : table.numero}
                </div>

                {/* Table Center Body */}
                <div className="pointer-events-none">
                  {isOccupied ? (
                    <div>
                      <div className="text-[10px] font-black text-amber-400 font-mono-nums flex items-center justify-center gap-0.5">
                        <span>S/. {totalAmount.toFixed(0)}</span>
                      </div>
                      <div className="text-[8px] text-zinc-400 font-mono-nums flex items-center justify-center gap-0.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5 text-amber-500" />
                        <span>{getTableElapsedMins(table)}m</span>
                      </div>
                    </div>
                  ) : isBilling ? (
                    <div className="bg-rose-500/25 rounded-md px-1 py-0.5 border border-rose-500/40 text-center">
                      <div className="text-[10px] font-black text-rose-200 font-mono-nums">
                        S/. {totalAmount.toFixed(0)}
                      </div>
                      <div className="text-[7px] font-bold text-rose-300 uppercase tracking-tight leading-none mt-0.5">
                        COBRO
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-0.5 text-[9px] text-emerald-450 font-bold">
                      <Users className="w-2.5 h-2.5" />
                      <span>{table.capacidad}p</span>
                    </div>
                  )}
                </div>

                {/* Table Footer: Assigned Waiter */}
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', gap: 10, width: '100%', justifyContents: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2px', pointerEvents: 'none' }}>
                  <span className="truncate max-w-[70px] text-center font-medium">
                    {table.comandas?.[0]?.usuario?.nombre?.split(' ')[0] || 'Libre'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Table Detail Panel (Right 4 Cols) */}
        <div className={`lg:col-span-4 border rounded-2xl p-4 flex flex-col justify-between select-none backdrop-blur-md ${isDarkMode ? 'bg-black/40 border-[var(--glass-border)]' : 'bg-white/45 border-zinc-200 shadow-sm'
          }`}>
          {selectedTable ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className={`flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-[var(--glass-border)]' : 'border-zinc-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-white font-mono-nums font-black text-xs border border-zinc-700">
                      M#{selectedTable.numero}
                    </span>
                    <h4 className={`font-extrabold text-xs truncate max-w-[120px] ${isDarkMode ? 'text-[var(--text-main)]' : 'text-zinc-900'}`}>
                      Mesa #{selectedTable.numero}
                    </h4>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${selectedTable.estado?.toLowerCase() === 'ocupada' || selectedTable.estado?.toLowerCase() === 'ocupado' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                    selectedTable.estado?.toLowerCase() === 'por pagar' || selectedTable.estado?.toLowerCase() === 'billing' || selectedTable.estado?.toLowerCase() === 'cuenta' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20 animate-pulse' :
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20'
                    }`}>
                    {selectedTable.estado}
                  </span>
                </div>

                {/* Comanda details */}
                {activeOrder ? (
                  <div className="mt-3 space-y-3">
                    <div className={`flex items-center justify-between text-[10px] p-2 rounded-xl border ${isDarkMode ? 'bg-zinc-900/40 border-[var(--glass-border)]/40 text-[var(--text-muted)]' : 'bg-zinc-100/50 border-zinc-200/50 text-zinc-600'
                      }`}>
                      <span className="flex items-center gap-1 font-bold">
                        <Users className="w-3.5 h-3.5 text-cyan-500" />
                        {getDinersCount(selectedTable)} pers.
                      </span>
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {elapsed} min activo
                      </span>
                    </div>

                    <div className={`flex items-center gap-2.5 p-2 rounded-xl border ${isDarkMode ? 'bg-zinc-900/60 border-[var(--glass-border)]/40' : 'bg-zinc-100/60 border-zinc-200/50'
                      }`}>
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-black text-white">
                        {activeOrder.usuario?.nombre?.[0] || 'M'}
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 dark:text-[var(--text-muted)] block font-medium">Atendido por:</span>
                        <span className={`text-[11px] font-bold ${isDarkMode ? 'text-[var(--text-main)]' : 'text-zinc-800'}`}>{activeOrder.usuario?.nombre || 'Mozo'}</span>
                      </div>
                    </div>

                    {/* Dishes list */}
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      <span className="text-[9px] font-bold text-zinc-500 dark:text-[var(--text-muted)] uppercase tracking-wider block">Consumo comanda</span>
                      {activeOrder.detalles?.map(d => (
                        <div key={d.id} className={`flex items-center justify-between text-[11px] p-1.5 rounded-lg border ${isDarkMode ? 'bg-zinc-950/40 border-[var(--glass-border)]/30 text-white' : 'bg-zinc-100/40 border-zinc-200/50 text-zinc-800'
                          }`}>
                          <span className="truncate max-w-[130px] font-semibold">
                            <b className="text-[var(--primary)] font-mono-nums mr-1">{d.cantidad}x</b> {d.plato?.nombre}
                          </span>
                          <span className="font-bold font-mono-nums">
                            S/. {(d.plato?.precio * d.cantidad).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-zinc-550 dark:text-[var(--text-muted)] text-[11px] flex flex-col items-center gap-2">
                    <Utensils className="w-7 h-7 text-zinc-400 dark:text-zinc-700" />
                    <span>Mesa disponible.<br />No hay comanda abierta en este turno.</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              {activeOrder && (
                <div className={`mt-4 pt-3 border-t ${isDarkMode ? 'border-[var(--glass-border)]' : 'border-zinc-200'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-550 dark:text-[var(--text-muted)]">Total comanda:</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-450 font-mono-nums">
                      S/. {activeBill.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center text-zinc-500 dark:text-[var(--text-muted)] text-xs flex flex-col items-center justify-center gap-3 h-full">
              <Compass className="w-8 h-8 text-zinc-400 dark:text-zinc-700 animate-spin-slow" />
              <span>Selecciona una mesa en el mapa<br />para gestionar la comanda o facturar.</span>
            </div>
          )}
        </div>
      </div>

      {designMode && (
        <button
          onClick={() => onHide('floorPlan')}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-zinc-400 hover:text-white transition-all z-45"
        >
          {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      )}
    </GlassCard>
  );
};

// 3. Revenue Analytics Component (using Recharts)
const RevenueAnalyticsComponent = ({
  chartData,
  transactions,
  selectedDate,
  setSelectedDate,
  fundFilter,
  setFundFilter,
  revenuePeriod,
  setRevenuePeriod,
  onHide,
  hiddenWidgets,
  designMode
}) => {
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';

  const [chartType, setChartType] = useState('area');
  const [activeMetric, setActiveMetric] = useState('revenue');

  const isHidden = hiddenWidgets.includes('revenueAnalytics');
  if (isHidden && !designMode) return null;

  // Process data based on period
  let rawData = [];
  let totalRevenue = 0;
  let totalGuests = 0;
  let totalOrders = 0;

  if (revenuePeriod === 'day') {
    const hourlyData = [];
    for (let h = 11; h <= 23; h++) {
      hourlyData.push({ timeLabel: `${h}:00`, label: `${h}:00`, revenue: 0, guestsCount: 0, previousRevenue: 0, avgTicket: 0, ordersCount: 0 });
    }
    transactions.forEach(tx => {
      try {
        const d = new Date(tx.fecha || tx.createdAt);
        const hr = d.getHours();
        if (hr >= 11 && hr <= 23) {
          const idx = hr - 11;
          hourlyData[idx].revenue += (tx.total || 0);
          hourlyData[idx].guestsCount += (tx.comensales || 2);
          hourlyData[idx].ordersCount += 1;
        }
      } catch (e) { }
    });

    // Mock comparisons
    hourlyData.forEach((d, i) => {
      d.previousRevenue = Math.max(0, Math.round(d.revenue * 0.85 + (i % 2 === 0 ? 50 : -40)));
      d.avgTicket = d.ordersCount > 0 ? d.revenue / d.ordersCount : 0;
    });

    rawData = hourlyData;
    totalRevenue = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
    totalGuests = transactions.reduce((sum, tx) => sum + (tx.comensales || 2), 0);
    totalOrders = transactions.length;
  } else {
    // Week or Month
    rawData = (chartData || []).map((item, idx) => ({
      timeLabel: item.label,
      label: item.label,
      revenue: item.amount || 0,
      previousRevenue: Math.max(100, Math.round((item.amount || 0) * 0.9 + (idx % 2 === 0 ? 100 : -100))),
      guestsCount: Math.round((item.amount || 0) / 25),
      ordersCount: Math.round((item.amount || 0) / 48),
      avgTicket: 48
    }));
    totalRevenue = rawData.reduce((sum, d) => sum + d.revenue, 0);
    totalGuests = rawData.reduce((sum, d) => sum + d.guestsCount, 0);
    totalOrders = rawData.reduce((sum, d) => sum + d.ordersCount, 0);
  }

  const prevTotalRevenue = rawData.reduce((sum, item) => sum + item.previousRevenue, 0);
  const growthPercent = (((totalRevenue - prevTotalRevenue) / (prevTotalRevenue || 1)) * 100).toFixed(1);
  const avgTicket = totalRevenue / (totalOrders || 1);

  const getPeriodLabel = () => {
    switch (revenuePeriod) {
      case 'day': return 'Hoy (Turno)';
      case 'week': return 'Semana (Lun - Dom)';
      case 'month': return 'Mes (Semanas)';
    }
  };

  const handlePeriodChange = (p) => {
    setRevenuePeriod(p);
    if (p === 'week') setFundFilter('week');
    if (p === 'month') setFundFilter('month');
  };

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/95 border border-[var(--glass-border)] rounded-xl p-3 shadow-2xl font-mono text-[10px] min-w-[170px] text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[var(--primary)] font-bold text-xs mb-1.5 border-b border-[var(--glass-border)]/50 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[9px] text-[var(--text-muted)] font-normal">{getPeriodLabel()}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-white font-semibold">
              <span className="text-[var(--text-muted)]">Ingreso:</span>
              <span className="font-mono-nums text-emerald-450">S/. {data.revenue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-[var(--text-muted)] text-[9px]">
              <span>Periodo Ant.:</span>
              <span className="font-mono-nums">S/. {data.previousRevenue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-[var(--text-main)] text-[9px] pt-1 border-t border-[var(--glass-border)]/30">
              <span className="text-[var(--text-muted)]">Comensales:</span>
              <span className="font-semibold">{data.guestsCount} pers.</span>
            </div>

            <div className="flex justify-between text-[9px]">
              <span className="text-[var(--text-muted)]">Ticket Prom.:</span>
              <span className="text-[var(--primary)] font-semibold font-mono-nums">S/. {data.avgTicket ? data.avgTicket.toFixed(0) : '48'}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <GlassCard
      className={`p-4 sm:p-5 lg:p-6 flex flex-col h-full relative ${isHidden ? 'opacity-40 border border-dashed border-red-500/50 p-1 bg-red-500/5' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--glass-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-[var(--text-main)] tracking-tight">Rendimiento de Ventas</h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30 font-mono-nums font-bold flex items-center gap-0.5 shadow-[0_0_10px_rgba(249,115,22,0.15)]">
              <TrendingUp className="w-3.5 h-3.5" /> {growthPercent >= 0 ? `+${growthPercent}` : growthPercent}%
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">Ingresos, proyecciones y ticket promedio en tiempo real</p>
        </div>

        {/* Floating Filters control */}
        <div className="flex items-center gap-2">
          {/* Chart Style Switcher */}
          <div className={`hidden sm:flex items-center p-1 rounded-xl border backdrop-blur-md ${isDarkMode ? 'bg-black/60 border-[var(--glass-border)]' : 'bg-zinc-200/60 border-zinc-200'
            }`}>
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${chartType === 'area'
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_8px_var(--color-brand-glow)] font-sans font-bold'
                : `bg-transparent border-transparent font-sans font-bold ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-zinc-800 hover:bg-zinc-100'}`
                }`}
              title="Línea Suave"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${chartType === 'bar'
                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_8px_var(--color-brand-glow)] font-sans font-bold'
                : `bg-transparent border-transparent font-sans font-bold ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-zinc-800 hover:bg-zinc-100'}`
                }`}
              title="Barras"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Period Selection */}
          <div className={`p-1 rounded-xl flex space-x-1 border backdrop-blur-md text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-black/60 border-[var(--glass-border)]' : 'bg-zinc-200/60 border-zinc-200'
            }`}>
            {(['day', 'week', 'month']).map((period) => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer border ${revenuePeriod === period
                  ? 'bg-[var(--primary)] text-white font-sans font-extrabold shadow-sm border-[var(--primary)] shadow-[0_0_8px_var(--color-brand-glow)]'
                  : `bg-transparent border-transparent font-sans font-bold ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-zinc-800 hover:bg-zinc-100'}`
                  }`}
              >
                {period === 'day' ? 'DÍA' : period === 'week' ? 'SEMANA' : 'MES'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 select-none">
        <div
          onClick={() => setActiveMetric('revenue')}
          className={`p-3 rounded-xl border cursor-pointer backdrop-blur-md transition-all ${activeMetric === 'revenue'
            ? (isDarkMode ? 'bg-zinc-800/85 border-[var(--primary)]/60 text-white font-bold' : 'bg-zinc-200/85 border-[var(--primary)]/60 text-zinc-950 font-bold shadow-sm')
            : (isDarkMode ? 'bg-black/40 border-[var(--glass-border)] text-zinc-400 hover:bg-zinc-800/40' : 'bg-white/45 border-zinc-200/60 text-zinc-700 hover:bg-zinc-100')
            }`}
        >
          <span className={`text-[10px] block font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Venta Total</span>
          <div className={`text-base font-black font-mono-nums mt-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            S/. {totalRevenue.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-mono-nums font-semibold flex items-center mt-1">
            <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12%
          </span>
        </div>

        <div
          onClick={() => setActiveMetric('ticket')}
          className={`p-3 rounded-xl border cursor-pointer backdrop-blur-md transition-all ${activeMetric === 'ticket'
            ? (isDarkMode ? 'bg-zinc-800/85 border-[var(--primary)]/60 text-white font-bold' : 'bg-zinc-200/85 border-[var(--primary)]/60 text-zinc-950 font-bold shadow-sm')
            : (isDarkMode ? 'bg-black/40 border-[var(--glass-border)] text-zinc-400 hover:bg-zinc-800/40' : 'bg-white/45 border-zinc-200/60 text-zinc-700 hover:bg-zinc-100')
            }`}
        >
          <span className={`text-[10px] block font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Ticket Medio</span>
          <div className={`text-base font-black font-mono-nums mt-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            S/. {avgTicket > 0 ? avgTicket.toFixed(0) : '48'}
          </div>
          <span className={`text-[9px] font-mono-nums mt-1 block leading-none ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {totalOrders} pedidos
          </span>
        </div>

        <div
          onClick={() => setActiveMetric('guests')}
          className={`p-3 rounded-xl border cursor-pointer backdrop-blur-md transition-all ${activeMetric === 'guests'
            ? (isDarkMode ? 'bg-zinc-800/85 border-[var(--primary)]/60 text-white font-bold' : 'bg-zinc-200/85 border-[var(--primary)]/60 text-zinc-950 font-bold shadow-sm')
            : (isDarkMode ? 'bg-black/40 border-[var(--glass-border)] text-zinc-400 hover:bg-zinc-800/40' : 'bg-white/45 border-zinc-200/60 text-zinc-700 hover:bg-zinc-100')
            }`}
        >
          <span className={`text-[10px] block font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Comensales</span>
          <div className={`text-base font-black font-mono-nums mt-1 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
            {totalGuests}
          </div>
          <span className={`text-[9px] font-mono-nums mt-1 block leading-none ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            ~{totalOrders > 0 ? (totalGuests / totalOrders).toFixed(1) : '2.1'} p./mesa
          </span>
        </div>

        <div className={`p-3 rounded-xl border backdrop-blur-md ${isDarkMode ? 'bg-black/40 border-[var(--glass-border)]' : 'bg-white/45 border-zinc-200/60'
          }`}>
          <span className={`text-[10px] block font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Hora Rush</span>
          <div className="text-base font-black mt-1 text-[var(--primary)] font-mono-nums">
            13:15 - 14:45
          </div>
          <span className={`text-[9px] font-mono-nums mt-1 block leading-none ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}>
            Capacidad 100%
          </span>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="flex-1 min-h-[220px] w-full pt-1 flex items-center justify-center">
        {rawData.length === 0 ? (
          <div className="text-zinc-550 text-xs font-semibold">No hay transacciones guardadas.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            {chartType === 'area' ? (
              <AreaChart data={rawData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="bunkerRevenueGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bunkerPrevRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `S/.${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="previousRevenue"
                  stroke="#52525b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#bunkerPrevRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey={activeMetric === 'revenue' ? 'revenue' : activeMetric === 'guests' ? 'guestsCount' : 'avgTicket'}
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#bunkerRevenueGlow)"
                />
              </AreaChart>
            ) : (
              <BarChart data={rawData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `S/.${val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="previousRevenue" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} />
                <Bar dataKey={activeMetric === 'revenue' ? 'revenue' : activeMetric === 'guests' ? 'guestsCount' : 'avgTicket'} fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {designMode && (
        <button
          onClick={() => onHide('revenueAnalytics')}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-zinc-400 hover:text-white transition-all z-30"
        >
          {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      )}
    </GlassCard>
  );
};

// 4. Staff Leaderboard Component
const StaffLeaderboardComponent = ({
  waitersList,
  cooksList,
  allUsersList = [],
  onHide,
  hiddenWidgets,
  designMode
}) => {
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';

  const [selectedRole, setSelectedRole] = useState('waiter'); // 'waiter' | 'chef'
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const isHidden = hiddenWidgets.includes('staffLeaderboard');
  if (isHidden && !designMode) return null;

  const getAvatarElement = (staff) => {
    if (staff.avatar) {
      return (
        <img
          src={staff.avatar}
          alt={staff.name}
          className="w-11 h-11 rounded-xl object-cover bg-slate-900 border border-[var(--glass-border)]"
        />
      );
    }
    const initials = staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US';
    return (
      <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-[var(--glass-border)] flex items-center justify-center font-black text-xs text-[var(--primary)] shadow-inner font-sans">
        {initials}
      </div>
    );
  };

  const getListAvatarElement = (staff) => {
    if (staff.avatar) {
      return (
        <img
          src={staff.avatar}
          alt={staff.name}
          className="w-8 h-8 rounded-lg object-cover bg-slate-900 border border-[var(--glass-border)]"
        />
      );
    }
    const initials = staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US';
    return (
      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-[var(--glass-border)] flex items-center justify-center font-bold text-[10px] text-[var(--primary)] font-sans">
        {initials}
      </div>
    );
  };

  const getModalAvatarElement = (staff) => {
    if (staff.avatar) {
      return (
        <img
          src={staff.avatar}
          alt={staff.name}
          className="w-16 h-16 rounded-2xl object-cover bg-slate-955 border border-[var(--glass-border)]"
        />
      );
    }
    const initials = staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US';
    return (
      <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-[var(--glass-border)] flex items-center justify-center font-black text-lg text-[var(--primary)] shadow-inner font-sans">
        {initials}
      </div>
    );
  };

  const dbWaiters = allUsersList.filter(u => u.rol === 'mozo' || u.rol === 'admin');
  const dbCooks = allUsersList.filter(u => u.rol === 'cocina' || u.rol === 'cocinero' || u.rol === 'cocina_admin');

  const activeWaiters = (waitersList && waitersList.length > 0) ? waitersList : dbWaiters;
  const activeCooks = (cooksList && cooksList.length > 0) ? cooksList : dbCooks;

  let detailed = [];

  if (selectedRole === 'waiter') {
    const sorted = [...activeWaiters].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0));
    detailed = sorted.map((w, idx) => {
      const mockTimes = [9.8, 11.2, 12.4, 13.1, 14.5];
      const avgTime = mockTimes[idx] || 15;
      const stars = (5 - idx * 0.08).toFixed(2);
      return {
        id: w.id,
        name: w.name || w.nombre,
        avatar: w.foto,
        role: 'waiter',
        completedOrders: w.completedOrders || w.totalTables || 0,
        totalSales: w.totalSales || 0,
        avgSpeedMinutes: w.avgSpeedMinutes || avgTime,
        rating: w.rating || stars,
        rank: idx + 1,
        targetSpeedMinutes: 14,
        zone: idx % 2 === 0 ? 'Salón A' : 'Terraza',
        badges: idx === 0 ? [{ id: '1', label: 'Speed Demon' }, { id: '2', label: 'Top Vendedor' }] : (idx === 1 ? [{ id: '1', label: 'Master Upseller' }] : [])
      };
    });
  } else {
    const sorted = [...activeCooks].sort((a, b) => (b.totalDishes || 0) - (a.totalDishes || 0));
    detailed = sorted.map((c, idx) => {
      const stars = (4.98 - idx * 0.05).toFixed(2);
      return {
        id: c.id,
        name: c.name || c.nombre,
        avatar: c.foto,
        role: 'chef',
        completedOrders: c.completedOrders || c.totalDishes || 0,
        avgSpeedMinutes: c.avgSpeedMinutes || (c.avgTimeMin ? Number(c.avgTimeMin.toFixed(1)) : 10),
        rating: c.rating || stars,
        rank: idx + 1,
        targetSpeedMinutes: 12,
        zone: 'Cocina',
        station: c.station || (idx === 0 ? 'Plancha caliente' : (idx === 1 ? 'Pase / Salsas' : 'Cocina Fría')),
        speedScore: c.speedScore || Math.round(92 - idx * 4),
        badges: idx === 0 ? [{ id: '1', label: 'Chef de Línea' }] : []
      };
    });
  }

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-amber-500/40 ring-2 ring-yellow-400">
            <Crown className="w-4 h-4 fill-slate-950" />
          </div>
        );
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-slate-300/30 ring-2 ring-slate-200">
            <Medal className="w-4 h-4" />
          </div>
        );
      case 3:
        return (
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 text-amber-100 flex items-center justify-center font-extrabold shadow-md shadow-amber-700/30 ring-2 ring-amber-600">
            <Award className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-zinc-800 text-[var(--text-muted)] flex items-center justify-center font-bold text-xs border border-zinc-700">
            #{rank}
          </div>
        );
    }
  };

  return (
    <GlassCard
      className={`p-4 sm:p-5 lg:p-6 flex flex-col h-full relative ${isHidden ? 'opacity-40 border border-dashed border-red-500/50 p-1 bg-red-500/5' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--glass-border)]">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-base text-[var(--text-main)] flex items-center gap-2 tracking-tight">
              Personal del Turno & Leaderboard
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 font-mono-nums font-bold border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
              En Vivo
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">Clasificación por velocidad de atención y satisfacción</p>
        </div>

        {/* Toggle Selectors */}
        <div className={`p-1 rounded-xl flex space-x-1 border backdrop-blur-md text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-black/60 border-[var(--glass-border)]' : 'bg-zinc-200/60 border-zinc-200'
          }`}>
          <button
            onClick={() => setSelectedRole('waiter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${selectedRole === 'waiter'
              ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_8px_var(--color-brand-glow)] font-sans font-bold'
              : `bg-transparent border-transparent font-sans font-bold ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-zinc-800 hover:bg-zinc-100'}`
              }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mozos</span>
          </button>

          <button
            onClick={() => setSelectedRole('chef')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${selectedRole === 'chef'
              ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_8px_var(--color-brand-glow)] font-sans font-bold'
              : `bg-transparent border-transparent font-sans font-bold ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-zinc-800 hover:bg-zinc-100'}`
              }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>KDS Cocina</span>
          </button>
        </div>
      </div>

      {/* Podium Top 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 select-none">
        {detailed.slice(0, 3).map((staff) => (
          <div
            key={staff.id}
            onClick={() => setSelectedEmployee(staff)}
            className={`p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden group hover:scale-[1.02] ${staff.rank === 1
              ? (isDarkMode ? 'bg-zinc-800/90 border-[var(--primary)]/40 text-white' : 'bg-zinc-200/90 border-[var(--primary)]/40 text-zinc-950 shadow')
              : (isDarkMode ? 'bg-black/40 border-[var(--glass-border)] text-zinc-300' : 'bg-white/45 border-zinc-200 text-zinc-800')
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getRankBadge(staff.rank)}
                <span className={`text-xs font-bold group-hover:text-[var(--primary)] transition-colors truncate max-w-[80px] ${isDarkMode ? 'text-white' : 'text-zinc-950'
                  }`}>
                  {staff.name}
                </span>
              </div>
              <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-mono-nums font-bold">
                <Star className="w-3 h-3 fill-amber-500" />
                <span>{staff.rating}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                {getAvatarElement(staff)}
                {staff.rank === 1 && (
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[var(--primary)] text-[var(--text-inverse)] shadow">
                    <Sparkles className="w-3 h-3" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-0.5 font-mono-nums text-[10px]">
                <div className={`flex justify-between ${isDarkMode ? 'text-zinc-400' : 'text-zinc-550'}`}>
                  <span>Velocidad:</span>
                  <span className={`font-bold ${isDarkMode ? 'text-emerald-450' : 'text-emerald-600'}`}>{staff.avgSpeedMinutes} min</span>
                </div>
                <div className={`flex justify-between ${isDarkMode ? 'text-zinc-400' : 'text-zinc-550'}`}>
                  <span>Comandas:</span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{staff.completedOrders}</span>
                </div>
                <div className={`flex justify-between ${isDarkMode ? 'text-zinc-400' : 'text-zinc-550'}`}>
                  <span>{staff.role === 'waiter' ? 'Venta:' : 'Partida:'}</span>
                  <span className="font-semibold text-amber-500 truncate max-w-[50px]">
                    {staff.role === 'waiter' ? `S/. ${staff.totalSales.toFixed(0)}` : staff.station?.split(' ')[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Full Staff list */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px] pr-1">
        <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 px-2 flex justify-between ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <span>Ranking Detallado</span>
          <span>Velocidad Promedio</span>
        </div>

        {detailed.map((staff) => {
          const speedEfficiency = Math.max(10, Math.min(100, Math.round((staff.targetSpeedMinutes / staff.avgSpeedMinutes) * 75)));

          return (
            <div
              key={staff.id}
              onClick={() => setSelectedEmployee(staff)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${isDarkMode
                ? 'bg-black/40 border-[var(--glass-border)] hover:bg-zinc-800/80 hover:border-zinc-700'
                : 'bg-white/45 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                }`}
            >
              <div className="flex items-center gap-3 min-w-[150px]">
                {getRankBadge(staff.rank)}
                {getListAvatarElement(staff)}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-xs group-hover:text-[var(--primary)] transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-950'
                      }`}>
                      {staff.name}
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded border ${isDarkMode ? 'bg-zinc-850 border-zinc-700 text-zinc-400' : 'bg-zinc-200 border-zinc-300 text-zinc-600'
                      }`}>
                      {staff.zone}
                    </span>
                  </div>
                  <div className={`text-[10px] flex items-center gap-2 mt-0.5 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <span>{staff.role === 'waiter' ? 'Camarero' : staff.station || 'Chef'}</span>
                    <span>•</span>
                    <span className="text-amber-500 font-mono-nums font-bold">★ {staff.rating}</span>
                  </div>
                </div>
              </div>

              {/* Progress Speed metrics */}
              <div className="flex-grow max-w-xs space-y-1">
                <div className="flex justify-between text-[10px] font-mono-nums">
                  <span className={`${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Tiempo Prom.:</span>
                  <span className={`font-bold ${staff.avgSpeedMinutes <= staff.targetSpeedMinutes ? (isDarkMode ? 'text-emerald-450' : 'text-emerald-600') : (isDarkMode ? 'text-amber-450' : 'text-amber-600')}`}>
                    {staff.avgSpeedMinutes} min <span className={`font-normal ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>(&lt;{staff.targetSpeedMinutes}m)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[var(--glass-border)]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${staff.avgSpeedMinutes <= staff.targetSpeedMinutes ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    style={{ width: `${speedEfficiency}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-mono-nums justify-between sm:justify-end">
                <div className="text-right">
                  <span className={`text-[9px] block ${isDarkMode ? 'text-zinc-400' : 'text-zinc-550'}`}>Comandas</span>
                  <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{staff.completedOrders}</span>
                </div>

                <div className="text-right min-w-[70px]">
                  <span className={`text-[9px] block ${isDarkMode ? 'text-zinc-400' : 'text-zinc-550'}`}>{staff.role === 'waiter' ? 'Venta Total' : 'Rendimiento'}</span>
                  <span className={`font-bold font-mono-nums ${isDarkMode ? 'text-emerald-450' : 'text-emerald-600'}`}>
                    {staff.role === 'waiter' ? `S/. ${staff.totalSales.toFixed(0)}` : `${staff.speedScore}%`}
                  </span>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee Detail Modal/Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in select-none">
          <div className={`rounded-2xl w-full max-w-md border shadow-2xl p-6 relative ${isDarkMode ? 'bg-zinc-900 border-[var(--glass-border)] text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
            }`}>
            <button
              onClick={() => setSelectedEmployee(null)}
              className={`absolute top-4 right-4 p-1.5 rounded-lg transition-all cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-650 hover:text-zinc-900 border border-zinc-250'
                }`}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              {getModalAvatarElement(selectedEmployee)}
              <div>
                <h4 className={`font-extrabold text-lg ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{selectedEmployee.name}</h4>
                <p className={`text-xs mt-0.5 font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-[var(--text-muted)]' : 'text-zinc-550'}`}>
                  <span className={`px-2 py-0.5 rounded uppercase text-[9px] font-bold ${isDarkMode ? 'bg-zinc-800 border border-zinc-700 text-zinc-300' : 'bg-zinc-150 border border-zinc-250 text-zinc-700'
                    }`}>
                    {selectedEmployee.role === 'waiter' ? 'Mozo de salón' : 'Cocinero KDS'}
                  </span>
                  <span>&bull;</span>
                  <span className="text-amber-500 font-bold flex items-center gap-0.5">★ {selectedEmployee.rating}</span>
                </p>
              </div>
            </div>

            <div className={`space-y-3 p-4 rounded-xl border font-mono text-xs ${isDarkMode ? 'bg-black/40 border-[var(--glass-border)]/50' : 'bg-zinc-100/60 border-zinc-200'
              }`}>
              <h5 className={`font-bold text-[10px] uppercase tracking-wider mb-2 border-b pb-1 ${isDarkMode ? 'text-[var(--text-muted)] border-[var(--glass-border)]' : 'text-zinc-500 border-zinc-200'
                }`}>Métricas clave del turno</h5>

              <div className="flex justify-between items-center pb-1">
                <span className={isDarkMode ? 'text-[var(--text-muted)]' : 'text-zinc-550'}>Rango de servicio:</span>
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>Top #{selectedEmployee.rank}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className={isDarkMode ? 'text-[var(--text-muted)]' : 'text-zinc-550'}>Velocidad promedio:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-450">{selectedEmployee.avgSpeedMinutes} minutos</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className={isDarkMode ? 'text-[var(--text-muted)]' : 'text-zinc-550'}>Tiempo objetivo:</span>
                <span className={`font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>&lt; {selectedEmployee.targetSpeedMinutes} minutos</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className={isDarkMode ? 'text-[var(--text-muted)]' : 'text-zinc-550'}>Comandas cerradas:</span>
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-zinc-950'}`}>{selectedEmployee.completedOrders} comandas</span>
              </div>
              {selectedEmployee.role === 'waiter' ? (
                <div className={`flex justify-between items-center pt-2 border-t text-sm ${isDarkMode ? 'border-[var(--glass-border)] text-[var(--primary)] font-black' : 'border-zinc-250 text-[var(--primary)] font-black'
                  }`}>
                  <span>Ventas en Caja:</span>
                  <span>S/. {selectedEmployee.totalSales.toLocaleString('es-PE')}</span>
                </div>
              ) : (
                <div className={`flex justify-between items-center pt-2 border-t font-black ${isDarkMode ? 'border-[var(--glass-border)] text-emerald-450' : 'border-zinc-250 text-emerald-600'
                  }`}>
                  <span>Partida/Estación:</span>
                  <span>{selectedEmployee.station}</span>
                </div>
              )}
            </div>

            {selectedEmployee.badges && selectedEmployee.badges.length > 0 && (
              <div className="mt-4">
                <h5 className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${isDarkMode ? 'text-[var(--text-muted)]' : 'text-zinc-550'}`}>Insignias logradas</h5>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployee.badges.map(b => (
                    <span
                      key={b.id}
                      className={`text-[9px] px-2 py-0.5 rounded-lg font-bold border ${isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-500/10 text-amber-800 border-amber-500/30'
                        }`}
                    >
                      🏆 {b.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {designMode && (
        <button
          onClick={() => onHide('staffLeaderboard')}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 text-zinc-400 hover:text-white transition-all z-30"
        >
          {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      )}
    </GlassCard>
  );
};

// Reorderable layout widget supporting absolute layout in percentages horizontally for sidebar safety
const EditableWidget = ({ id, layout, onLayoutChange, designMode, children, className = "" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (!designMode) return;
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('input')) return;

    const container = document.getElementById('dashboard-canvas');
    if (!container) return;

    const containerWidth = container.clientWidth || 1000;

    // Convert stored percentages back to current pixels for dragging calculations
    const currentX = layout.absolute ? (layout.xPct * containerWidth) / 100 : 0;
    const currentY = layout.absolute ? layout.y : 0;
    const currentW = layout.absolute ? (layout.widthPct * containerWidth) / 100 : e.currentTarget.clientWidth;
    const currentH = layout.absolute ? layout.height : e.currentTarget.clientHeight;

    if (e.target.closest('.resize-handle')) {
      setIsResizing(true);
      setResizeStart({ x: e.clientX, y: e.clientY, w: currentW, h: currentH });
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - currentX, y: e.clientY - currentY });
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      const container = document.getElementById('dashboard-canvas');
      if (!container) return;

      const containerWidth = container.clientWidth || 1000;

      if (isDragging) {
        let dx = e.clientX - dragStart.x;
        let dy = e.clientY - dragStart.y;

        // Keep coordinates within bounds
        dx = Math.max(0, dx);
        dy = Math.max(0, dy);

        // Convert horizontal positions to percentages
        const xPct = (dx / containerWidth) * 100;

        onLayoutChange(id, {
          ...layout,
          xPct,
          y: dy,
          absolute: true
        });
      } else if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;

        const newW = Math.max(150, resizeStart.w + dx);
        const newH = Math.max(100, resizeStart.h + dy);

        // Convert horizontal width to percentage
        const widthPct = (newW / containerWidth) * 100;

        onLayoutChange(id, {
          ...layout,
          widthPct,
          height: newH,
          absolute: true
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, layout, id, onLayoutChange]);

  const style = (layout && layout.absolute) ? {
    position: 'absolute',
    left: `${layout.xPct}%`,
    top: `${layout.y}px`,
    width: `${layout.widthPct}%`,
    height: `${layout.height}px`,
    zIndex: isDragging || isResizing ? 50 : 10,
    cursor: designMode ? 'move' : 'default',
    transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease',
  } : {
    position: 'relative',
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={style}
      className={`${className} ${designMode
        ? 'border border-dashed border-[var(--primary)]/60 rounded-[26px] p-0.5 bg-[var(--primary)]/5 select-none shadow-xl'
        : ''
        }`}
    >
      {designMode && (
        <div className="absolute top-1 left-2 px-1.5 py-0.5 rounded bg-[var(--primary)] text-white dark:text-black font-extrabold text-[8px] tracking-wider uppercase z-20 pointer-events-none">
          {id}
        </div>
      )}
      {children}
      {designMode && (
        <div
          className="resize-handle absolute bottom-1.5 right-1.5 w-4 h-4 rounded-br-2xl bg-[var(--primary)] cursor-se-resize flex items-center justify-center text-white dark:text-black z-30"
          style={{ borderTopLeftRadius: '6px' }}
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" className="rotate-90 opacity-80">
            <path d="M6 0L0 6M6 3L3 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Main HomeView Page
const HomeView = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { user } = useAuth();
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';

  // VisBug Design Mode States
  const [designMode, setDesignMode] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState('auto');
  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem('bunker_dashboard_layouts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const requiredKeys = ['welcomeHeader', 'quickKpiBar', 'floorPlan', 'revenueAnalytics', 'staffLeaderboard'];
        const hasAllKeys = requiredKeys.every(k => parsed[k] !== undefined && parsed[k] !== null);
        if (hasAllKeys) {
          return parsed;
        }
      } catch (e) {
        console.error("Error parsing saved layouts:", e);
      }
    }
    // Default initial absolute coordinates in percentages (xPct/widthPct) for responsive scaling
    return {
      welcomeHeader: { xPct: 0, y: 0, widthPct: 100, height: 50, absolute: true },
      quickKpiBar: { xPct: 0, y: 70, widthPct: 100, height: 130, absolute: true },
      floorPlan: { xPct: 0, y: 220, widthPct: 65, height: 500, absolute: true },
      revenueAnalytics: { xPct: 67, y: 220, widthPct: 33, height: 240, absolute: true },
      staffLeaderboard: { xPct: 67, y: 480, widthPct: 33, height: 240, absolute: true },
    };
  });

  // Hidden cards state
  const [hiddenWidgets, setHiddenWidgets] = useState(() => {
    const saved = localStorage.getItem('bunker_hidden_widgets');
    return saved ? JSON.parse(saved) : [];
  });

  const toggleWidgetVisibility = (id) => {
    setHiddenWidgets(prev => {
      const updated = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      localStorage.setItem('bunker_hidden_widgets', JSON.stringify(updated));
      return updated;
    });
    showToast(`Tarjeta modificada. Entra a Modo Diseño para ver o restaurar.`, 'info');
  };

  const resetLayout = () => {
    setDesignMode(false);
    setCanvasHeight('auto');
    const defaultLayouts = {
      welcomeHeader: { xPct: 0, y: 0, widthPct: 100, height: 50, absolute: true },
      quickKpiBar: { xPct: 0, y: 70, widthPct: 100, height: 130, absolute: true },
      floorPlan: { xPct: 0, y: 220, widthPct: 65, height: 500, absolute: true },
      revenueAnalytics: { xPct: 67, y: 220, widthPct: 33, height: 240, absolute: true },
      staffLeaderboard: { xPct: 67, y: 480, widthPct: 33, height: 240, absolute: true },
    };
    setLayouts(defaultLayouts);
    localStorage.removeItem('bunker_dashboard_layouts');
  };

  // Run layout migration
  useEffect(() => {
    const migrationKey = 'bunker_dashboard_layout_migration_v8';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.removeItem('bunker_dashboard_layouts');
      localStorage.setItem(migrationKey, 'true');
      resetLayout();
    }
  }, []);

  const updateLayout = (id, newLayout) => {
    setLayouts(prev => {
      const updated = { ...prev, [id]: newLayout };
      localStorage.setItem('bunker_dashboard_layouts', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleDesignMode = () => {
    if (!designMode) {
      // Find bottom most coordinate
      const hasAbsolute = Object.values(layouts).some(l => l && l.absolute);
      if (hasAbsolute) {
        const maxBottom = Object.values(layouts).reduce((max, lay) => {
          if (lay && lay.absolute) {
            const bottom = (lay.y || 0) + (typeof lay.height === 'number' ? lay.height : 250);
            return Math.max(max, bottom);
          }
          return max;
        }, 600);
        setCanvasHeight(`${maxBottom + 100}px`);
      }
      setDesignMode(true);
      showToast('Modo Diseño activado. Arrastra y deforma libremente las tarjetas por la pantalla.', 'info');
    } else {
      setDesignMode(false);
      showToast('Diseño personalizado guardado de forma responsiva.', 'success');
    }
  };

  // Selected Date state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [fundFilter, setFundFilter] = useState('week');
  const [revenuePeriod, setRevenuePeriod] = useState('day');
  const [chartData, setChartData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lowStockInsumosCount, setLowStockInsumosCount] = useState(0);
  const [allUsersList, setAllUsersList] = useState([]);

  // Active cashier & live operational states
  const [activeBalance, setActiveBalance] = useState(null);
  const [tables, setTables] = useState([]);
  const [waitersList, setWaitersList] = useState([]);
  const [cooksList, setCooksList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Seating plan interactive states
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeZone, setActiveZone] = useState('all');

  // Checkout modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedCheckoutOrder, setSelectedCheckoutOrder] = useState(null);

  // Fetch static data on mount & periodic sync
  const loadStaticData = async () => {
    try {
      const [alertsRes, balanceRes, usersRes] = await Promise.all([
        fetch('/api/insumos/alertas'),
        fetch('/api/cashier/balance'),
        fetch('/api/users')
      ]);

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setLowStockInsumosCount(data.length || 0);
      }
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setActiveBalance(balanceData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAllUsersList(usersData);
      }
    } catch (e) {
      console.error("Error al cargar datos estáticos del dashboard:", e);
    }
  };

  // Fetch live active data from server
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [tablesRes, staffRes, txRes, flowRes] = await Promise.all([
        fetch('/api/tables'),
        fetch(`/api/staff/stats?date=${selectedDate}`),
        fetch(`/api/stats/transactions?fecha=${selectedDate}`),
        fetch(`/api/stats/fund-flow?range=${fundFilter}`)
      ]);

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData);

        if (selectedTable) {
          const fresh = tablesData.find(t => t.id === selectedTable.id);
          if (fresh) setSelectedTable(fresh);
        }
      }
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setWaitersList(staffData.waiters || []);
        setCooksList(staffData.cooks || []);
      }
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }
      if (flowRes.ok) {
        const flowData = await flowRes.json();
        setChartData(flowData);
      }
    } catch (e) {
      console.error(e);
      showToast("Error de conexión al cargar datos de Bunker.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    loadStaticData();
    const interval = setInterval(loadStaticData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, fundFilter]);

  // Hook sync events from other modules
  useEffect(() => {
    const handleSyncEvent = () => {
      loadDashboardData();
      loadStaticData();
    };
    window.addEventListener('refreshTables', handleSyncEvent);
    window.addEventListener('refreshCashCount', handleSyncEvent);
    return () => {
      window.removeEventListener('refreshTables', handleSyncEvent);
      window.removeEventListener('refreshCashCount', handleSyncEvent);
    };
  }, [selectedTable]);

  // Checkouts triggers
  const handleOpenCheckout = (table) => {
    if (!activeBalance || activeBalance.estado !== 'abierto') {
      showToast("Debe ABRIR CAJA en el módulo Caja antes de cobrar.", 'error');
      return;
    }
    const activeOrder = table.comandas?.[0];
    if (!activeOrder) return;

    const hijasNumeros = table.mesasHijas?.length > 0
      ? ' - ' + table.mesasHijas.map(h => h.numero).join(' - ')
      : '';
    const tableNumero = `${table.numero || ''}${hijasNumeros}`;

    setSelectedCheckoutOrder({ ...activeOrder, mesa: table, tableNumero });
    setIsCheckoutModalOpen(true);
  };

  const handlePrintPrecuenta = async (table) => {
    try {
      const activeOrder = table.comandas?.[0];
      if (!activeOrder || !activeOrder.detalles) return;

      const content = activeOrder.detalles.map(d => ({
        cantidad: d.cantidad,
        nombre: d.plato?.nombre || 'Plato',
        observacion: d.observacion || ''
      }));

      const hijasNumeros = table.mesasHijas?.length > 0
        ? ' - ' + table.mesasHijas.map(h => h.numero).join(' - ')
        : '';
      const tableName = `Mesa ${table.numero}${hijasNumeros}`;

      await enqueueTicket(tableName, activeOrder.usuario?.nombre || 'Mozo', content, 'Caja');
      showToast(`Pre-cuenta de Mesa ${table.numero} enviada a la ticketera.`, 'success');
    } catch (e) {
      console.error(e);
      showToast("Error al imprimir pre-cuenta: " + e.message, 'error');
    }
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutModalOpen(false);
    setSelectedTable(null);
    loadDashboardData();
    loadStaticData();
  };

  // Derive static properties
  const DAILY_GOAL = 1000;
  const currentEarning = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  const goalPercentage = Math.min(100, Math.round((currentEarning / DAILY_GOAL) * 100));

  const occupiedTables = tables.filter(t => {
    const state = t.estado?.toLowerCase();
    return state === 'ocupada' || state === 'ocupado' || state === 'por pagar' || state === 'billing' || state === 'cuenta';
  });
  const occupiedTablesCount = occupiedTables.length;
  const totalTablesCount = tables.length || 15;

  let averageWaitTime = 0;
  let activeComandasWithTime = 0;
  let totalWaitTime = 0;

  occupiedTables.forEach(t => {
    if (t.comandas && t.comandas.length > 0) {
      const comandaDate = new Date(t.comandas[0].fecha);
      const diffMs = Date.now() - comandaDate.getTime();
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      if (diffMins < 90) {
        totalWaitTime += diffMins;
        activeComandasWithTime++;
      }
    }
  });

  if (activeComandasWithTime > 0) {
    averageWaitTime = Math.round(totalWaitTime / activeComandasWithTime);
  } else {
    averageWaitTime = occupiedTablesCount > 0 ? 12 : 0;
  }

  const renderHeaderContent = () => (
    <header id="widget-welcomeHeader" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 w-full relative z-30 mb-2">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-2">
          ¡Bienvenido, {user?.nombre || 'Usuario'}!

          <button
            onClick={toggleDesignMode}
            className="p-1 rounded-lg opacity-25 hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all cursor-pointer bg-transparent border-none flex items-center justify-center animate-pulse"
            title={designMode ? "Guardar y Salir" : "Alternar Modo Diseño"}
          >
            <Sparkles className={`w-3.5 h-3.5 ${designMode ? 'text-[var(--primary)] animate-spin-slow' : ''}`} />
          </button>

          {hiddenWidgets.length > 0 && (
            <button
              onClick={() => {
                setHiddenWidgets([]);
                localStorage.removeItem('bunker_hidden_widgets');
                showToast("Todas las tarjetas son visibles de nuevo.", "success");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all border border-zinc-700 ml-2"
              title="Restaurar visibilidad de todas las tarjetas ocultadas"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-450" />
              <span>Restaurar ({hiddenWidgets.length})</span>
            </button>
          )}
        </h1>
        <p className="text-[11px] mt-0.5 flex items-center gap-1.5 text-[var(--text-muted)] font-sans">
          <ChefHat className="w-3 h-3 text-[var(--primary)]" />
          Búnker &bull; Centro de Mando &bull; Perú
        </p>
      </div>
    </header>
  );

  const hasAbsoluteLayout = Object.values(layouts).some(l => l && l.absolute);

  return (
    <div id="dashboard-canvas" style={{ height: canvasHeight }} className="flex flex-col gap-3 text-[var(--text-main)] font-sans bg-[var(--bg-primary)] pb-1 relative w-full select-none">
      {designMode || hasAbsoluteLayout ? (
        // Absolute custom coordinate canvas
        <>
          <EditableWidget id="welcomeHeader" layout={layouts.welcomeHeader} onLayoutChange={updateLayout} designMode={designMode} className="w-full">
            {renderHeaderContent()}
          </EditableWidget>

          <EditableWidget id="quickKpiBar" layout={layouts.quickKpiBar} onLayoutChange={updateLayout} designMode={designMode} className="w-full">
            <QuickKpiBarComponent
              tables={tables}
              occupiedTablesCount={occupiedTablesCount}
              totalTablesCount={totalTablesCount}
              averageWaitTime={averageWaitTime}
              currentEarning={currentEarning}
              DAILY_GOAL={DAILY_GOAL}
              goalPercentage={goalPercentage}
              lowStockInsumosCount={lowStockInsumosCount}
              onHide={toggleWidgetVisibility}
              hiddenWidgets={hiddenWidgets}
              designMode={designMode}
            />
          </EditableWidget>

          <EditableWidget id="floorPlan" layout={layouts.floorPlan} onLayoutChange={updateLayout} designMode={designMode} className="w-full">
            <FloorPlanComponent
              tables={tables}
              selectedTable={selectedTable}
              onSelectTable={setSelectedTable}
              activeZone={activeZone}
              onChangeZone={setActiveZone}
              onHide={toggleWidgetVisibility}
              hiddenWidgets={hiddenWidgets}
              designMode={designMode}
            />
          </EditableWidget>

          <EditableWidget id="revenueAnalytics" layout={layouts.revenueAnalytics} onLayoutChange={updateLayout} designMode={designMode} className="w-full">
            <RevenueAnalyticsComponent
              chartData={chartData}
              transactions={transactions}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              fundFilter={fundFilter}
              setFundFilter={setFundFilter}
              revenuePeriod={revenuePeriod}
              setRevenuePeriod={setRevenuePeriod}
              onHide={toggleWidgetVisibility}
              hiddenWidgets={hiddenWidgets}
              designMode={designMode}
            />
          </EditableWidget>

          <EditableWidget id="staffLeaderboard" layout={layouts.staffLeaderboard} onLayoutChange={updateLayout} designMode={designMode} className="w-full">
            <StaffLeaderboardComponent
              waitersList={waitersList}
              cooksList={cooksList}
              allUsersList={allUsersList}
              onHide={toggleWidgetVisibility}
              hiddenWidgets={hiddenWidgets}
              designMode={designMode}
            />
          </EditableWidget>
        </>
      ) : (
        // Standard Bento Grid layout
        <>
          {renderHeaderContent()}

          {/* Row 1: KPI Statistics bar */}
          <QuickKpiBarComponent
            tables={tables}
            occupiedTablesCount={occupiedTablesCount}
            totalTablesCount={totalTablesCount}
            averageWaitTime={averageWaitTime}
            currentEarning={currentEarning}
            DAILY_GOAL={DAILY_GOAL}
            goalPercentage={goalPercentage}
            lowStockInsumosCount={lowStockInsumosCount}
            onHide={toggleWidgetVisibility}
            hiddenWidgets={hiddenWidgets}
            designMode={designMode}
          />

          {/* Row 2: Bento Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch w-full">
            {/* Bento Left: Seating Map (8 Columns) */}
            <div className="xl:col-span-8">
              <FloorPlanComponent
                tables={tables}
                selectedTable={selectedTable}
                onSelectTable={setSelectedTable}
                activeZone={activeZone}
                onChangeZone={setActiveZone}
                onHide={toggleWidgetVisibility}
                hiddenWidgets={hiddenWidgets}
                designMode={designMode}
              />
            </div>

            {/* Bento Right: Sales Curve & Leaderboard (4 Columns) */}
            <div className="xl:col-span-4 flex flex-col gap-5">
              <div className="flex-1">
                <RevenueAnalyticsComponent
                  chartData={chartData}
                  transactions={transactions}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  fundFilter={fundFilter}
                  setFundFilter={setFundFilter}
                  revenuePeriod={revenuePeriod}
                  setRevenuePeriod={setRevenuePeriod}
                  onHide={toggleWidgetVisibility}
                  hiddenWidgets={hiddenWidgets}
                  designMode={designMode}
                />
              </div>

              <div className="flex-1">
                <StaffLeaderboardComponent
                  waitersList={waitersList}
                  cooksList={cooksList}
                  allUsersList={allUsersList}
                  onHide={toggleWidgetVisibility}
                  hiddenWidgets={hiddenWidgets}
                  designMode={designMode}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Checkout Payment Modal */}
      {isCheckoutModalOpen && selectedCheckoutOrder && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => {
            setIsCheckoutModalOpen(false);
            setSelectedCheckoutOrder(null);
          }}
          order={selectedCheckoutOrder}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default HomeView;
