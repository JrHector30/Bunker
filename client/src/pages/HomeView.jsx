import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, TrendingUp, MoreHorizontal, ChefHat, Clock, Layers,
  Award, Sparkles, Receipt, CheckCircle, Bell, MessageSquare,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Utensils, Wine, Coffee
} from 'lucide-react';
import { Calendar } from '../components/ui/Calendar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Subtle gray card border matching GestionDeComandas panel-bg style
const CARD_STYLE = {
  border: '1px solid rgb(228 228 231 / 0.6)',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
};

// Dark mode card border variant
const CARD_STYLE_DARK = {
  border: '1px solid rgb(63 63 70 / 0.5)',
  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.25), 0 1px 2px -1px rgb(0 0 0 / 0.25)',
};

// Helper component for date formatting in transactions
const formatTime = (dateStr) => {
  try {
    const d = new Date(dateStr);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  } catch (e) {
    return '12:00';
  }
};

// Reusable premium card container – uses subtle zinc/gray borders matching GestionDeComandas
const GlassCard = ({ children, className = "" }) => (
  <div
    className={`relative overflow-hidden rounded-[24px] transition-all duration-300 group bg-[var(--bg-secondary)] ${className}`}
    style={{
      border: '1px solid rgb(228 228 231 / 0.5)',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',

    }}
  >
    {children}
  </div>
);

// Same card for internal sub-panels
const SubCard = ({ children, className = "", style = {} }) => (
  <div
    className={`rounded-[24px] transition-all duration-300 bg-[var(--bg-secondary)] ${className}`}
    style={{
      border: '1px solid rgb(228 228 231 / 0.5)',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      ...style,
    }}
  >
    {children}
  </div>
);

// 1. MyCard Component (Real Weekly Earnings Static Display)
const MyCardComponent = ({ weeklyEarnings }) => {

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-xs tracking-wide text-[var(--text-muted)]">Mi Tarjeta</h3>
        <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer bg-transparent border-none">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <GlassCard className="p-5 min-h-[160px] flex flex-col justify-between">
        {/* Glow effects */}
        <div className="absolute top-[-20%] right-[-20%] w-[180px] h-[180px] rounded-full bg-[var(--primary)]/5 blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
        <div className="absolute bottom-[-30%] left-[-10%] w-[160px] h-[160px] rounded-full bg-[var(--primary)]/5 blur-3xl pointer-events-none"></div>

        {/* Top Card Row */}
        <div className="flex items-center justify-between relative z-10">
          <div className="p-2.5 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 text-[var(--primary)]">
            <CreditCard className="w-5 h-5" />
          </div>

          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-[var(--primary)]/40 blur-sm"></div>
            <div className="relative w-11 h-11 rounded-full bg-[var(--primary)] flex items-center justify-center border border-white/20 text-[10px] font-black text-white dark:text-black uppercase tracking-wider shadow-inner">
              VISA
            </div>
          </div>

          <span className="text-xs font-medium text-[var(--text-muted)]">
            {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>

        {/* Middle divider */}
        <div className="my-1 border-t  border-zinc-200/50 w-full relative z-10"></div>

        {/* Bottom Card Row */}
        <div className="flex items-end justify-between relative z-10 mt-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest font-semibold mb-1 text-[var(--text-muted)]">
              GANANCIA SEMANAL
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-bold text-[var(--primary)] font-mono">S/.</span>
              <motion.span
                key={Math.floor(weeklyEarnings)}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-black tracking-tight text-[var(--text-main)] font-mono"
              >
                {weeklyEarnings.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </motion.span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest font-semibold mb-1 text-[var(--text-muted)]">
              ADMINISTRADOR
            </span>
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-main)]">
              Hector
            </span>
          </div>
        </div>

        {/* Floating live indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full py-0.5 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 absolute"></span>
          <span className="text-[8px] font-bold text-green-500 tracking-wider uppercase ml-2">EN VIVO</span>
        </div>
      </GlassCard>
    </div>
  );
};

// 2. CategoryPanel Component
const CategoryPanelComponent = ({ activeOrdersCount, averageWaitTime, occupiedTablesCount, totalTablesCount }) => {
  const categories = [
    {
      id: 'active_orders',
      title: 'Órdenes',
      subtitle: 'Comandas Activas',
      value: `${activeOrdersCount} Activas`,
      icon: ChefHat,
      iconColor: 'text-[var(--primary)]',
      iconBg: 'bg-[var(--primary)]/5 border-[var(--primary)]/20'
    },
    {
      id: 'wait_time',
      title: 'Tiempo',
      subtitle: 'Espera Promedio',
      value: `${averageWaitTime} min`,
      icon: Clock,
      iconColor: 'text-[var(--primary)]',
      iconBg: 'bg-[var(--primary)]/5 border-[var(--primary)]/20'
    },
    {
      id: 'tables_occupied',
      title: 'Mesas',
      subtitle: 'Ocupación Local',
      value: `${occupiedTablesCount} / ${totalTablesCount}`,
      icon: Layers,
      iconColor: 'text-[var(--text-main)]',
      iconBg: 'bg-white/[0.02] border-[var(--glass-border)]'
    }
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-xs tracking-wide text-[var(--text-muted)]">Categoría</h3>
        {/* Ver Todo removed per User Request */}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full home-categories-grid">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative overflow-hidden rounded-[24px] p-3 flex flex-col justify-between items-center text-center min-h-[160px] group cursor-pointer bg-[var(--bg-secondary)]"
              style={{
                border: '1px solid rgb(228 228 231 / 0.5)',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl ${cat.iconBg} border border-zinc-200/50 shadow-sm`}>
                <Icon className={`w-4 h-4 ${cat.iconColor}`} />
                <div className="absolute -inset-1 rounded-2xl border border-zinc-200/40 opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100"></div>
              </div>

              <div className="flex flex-col items-center mt-3">
                <span className="text-[10px] uppercase font-bold tracking-widest mb-1 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                  {cat.title}
                </span>
                <span className="text-[14px] font-black tracking-tight text-[var(--text-main)]">
                  {cat.value}
                </span>
                <span className="text-[9px] mt-1 font-medium text-[var(--text-muted)] hidden sm:inline">
                  {cat.subtitle}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// 3. PedidosAtendidos Component (Mozos commissions / orders)
const PedidosAtendidosComponent = ({ waiters, topWaiter }) => {
  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-xs tracking-wide text-[var(--text-muted)]">Pedidos Atendidos</h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
            Comisión
          </span>
        </div>
        <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer bg-transparent border-none">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div
        className="flex-1 rounded-[24px] p-4 flex flex-col bg-[var(--bg-secondary)]"
        style={{
          border: '1px solid rgb(228 228 231 / 0.5)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[185px] pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700/50">
          {waiters.map((waiter, index) => {
            const isTop = topWaiter && waiter.id === topWaiter.id;
            const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${waiter.nombre || waiter.id}`;

            return (
              <motion.div
                key={waiter.id}
                whileHover={{ x: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                className="flex items-center justify-between p-2 rounded-2xl border border-transparent hover:border-zinc-200/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={avatarUrl}
                      alt={waiter.nombre}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-200/40 bg-slate-800"
                    />
                    {isTop && (
                      <span className="absolute -top-1 -right-1 bg-[var(--primary)] text-white dark:text-black p-0.5 rounded-full shadow-md">
                        <Award className="w-3 h-3 font-bold" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xs font-bold tracking-wide flex items-center gap-1 text-[var(--text-main)]">
                      {waiter.nombre}
                      {isTop && (
                        <span className="text-[8px] font-bold uppercase tracking-widest bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded-md hidden sm:inline">
                          TOP
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                      {index === 0 ? 'Turno Mañana' : index === 1 ? 'Turno Tarde' : 'Turno Completo'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-[var(--text-main)] font-mono">
                    S/. {(waiter.totalSales || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded-md font-bold tracking-wider uppercase bg-green-500/10 border border-green-500/20 text-green-500">
                    PAGADO
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Líder del Día widget */}
        <div className="mt-9 p-3 rounded-2xl border flex items-center justify-between bg-[var(--primary)]/5 border-zinc-200/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Líder del Día</span>
              <span className="text-[11px] font-semibold text-[var(--text-main)]">{topWaiter ? topWaiter.nombre : 'Ninguno'}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono border px-2 py-0.5 rounded-md font-bold bg-green-500/10 text-green-500 border-green-500/20">
            Eficiencia +24%
          </span>
        </div>
      </div>
    </div>
  );
};

// 4. CierreMesas Component (Closed tables list + PDF Export)
const CierreMesasComponent = ({ transactions, onDownloadPDF }) => {
  const getTableIcon = (tableName) => {
    const num = parseInt(tableName.replace(/\D/g, '')) || 1;
    if (num % 3 === 0) return { icon: Utensils, bg: 'bg-[var(--primary)]/5 border-[var(--primary)]/20', text: 'text-[var(--primary)]' };
    if (num % 3 === 1) return { icon: Wine, bg: 'bg-[var(--primary)]/5 border-[var(--primary)]/20', text: 'text-[var(--primary)]' };
    return { icon: Coffee, bg: 'bg-white/[0.02] border-[var(--glass-border)]', text: 'text-[var(--text-main)]' };
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-xs tracking-wide text-[var(--text-muted)]">Cierre de Mesas</h3>

        {/* PDF Download Button replacing Sort by dropdown per User Request */}
        <button
          onClick={onDownloadPDF}
          className="flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer text-[var(--text-muted)] hover:text-[var(--primary)] active:scale-95 bg-[var(--bg-secondary)]"
          style={{ border: '1px solid rgb(228 228 231 / 0.5)', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
          title="Descargar Reporte de Mesas Cerradas"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div
        className="flex-1 rounded-[24px] p-4 flex flex-col justify-between bg-[var(--bg-secondary)]"
        style={{
          border: '1px solid rgb(228 228 231 / 0.5)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[190px] pr-1 scrollbar-none">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
              <Receipt className="w-8 h-8 opacity-25 mb-2" />
              <span className="text-xs">No hay mesas cerradas para el filtro seleccionado.</span>
            </div>
          ) : (
            transactions.map((tx) => {
              const iconStyle = getTableIcon(tx.tableName);
              const TableIcon = iconStyle.icon;

              return (
                <motion.div
                  key={tx.id}
                  whileHover={{ x: 3, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                  className="flex items-center justify-between p-2 rounded-2xl border border-transparent hover:border-zinc-200/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm ${iconStyle.bg} ${iconStyle.text}`}>
                      <TableIcon className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs font-bold tracking-wide text-[var(--text-main)]">
                        {tx.tableName}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        Cierre: {tx.closedAt}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-[var(--text-main)] font-mono">
                        S/. {(tx.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] font-medium">
                        Atendido por {tx.waiterName.split(' ')[0]}
                      </span>
                    </div>

                    <CheckCircle className="w-4 h-4 text-green-500 opacity-80" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// 5. StatisticsPanel Component (Right sidebar panel)
const StatisticsPanelComponent = ({
  selectedDate,
  setSelectedDate,
  goalPercentage,
  currentEarning,
  chartData = [],
  fundFilter = 'week',
  setFundFilter,
  onShowToast,
  unpaidTables = [],
  lowStockInsumos = []
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Circle progress calculations
  const radius = 40;
  const strokeDasharray = 2 * Math.PI * radius; // 251.2
  const strokeDashoffset = strokeDasharray - (strokeDasharray * goalPercentage) / 100;

  // Calculate coordinates for the 2D Area Chart (Flujo de Fondos)
  const svgWidth = 320;
  const svgHeight = 90;
  const chartPaddingLeft = 28;
  const chartPaddingRight = 12;
  const chartPaddingTop = 18;
  const chartPaddingBottom = 14;

  const chartWidth = svgWidth - chartPaddingLeft - chartPaddingRight;
  const chartHeight = svgHeight - chartPaddingTop - chartPaddingBottom;

  const maxAmount = chartData.length > 0 ? Math.max(...chartData.map(c => c.amount)) : 1000;

  // Create coordinate points
  const points = chartData.map((item, i) => {
    const x = chartPaddingLeft + (i / (chartData.length - 1 || 1)) * chartWidth;
    const ratio = maxAmount > 0 ? (item.amount / maxAmount) : 0.5;
    const y = chartPaddingTop + chartHeight - ratio * chartHeight;
    return { x, y, earning: item.amount, date: item.date, label: item.label };
  });

  // Hermite Spline Path
  let curvePath = '';
  if (points.length > 0) {
    curvePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      curvePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const areaPath = points.length > 0
    ? `${curvePath} L ${points[points.length - 1].x} ${chartPaddingTop + chartHeight} L ${points[0].x} ${chartPaddingTop + chartHeight} Z`
    : '';

  // Find active point
  const activeIdx = hoveredIdx !== null
    ? hoveredIdx
    : chartData.findIndex(c => c.date === selectedDate);

  const activePoint = activeIdx !== -1 && points[activeIdx] !== undefined
    ? points[activeIdx]
    : points[points.length - 1];

  const activeEarning = activePoint?.earning || 0;
  const activeLabel = activePoint?.label || '';

  return (
    <GlassCard className="flex flex-col gap-3 w-full p-4 h-full">

      {/* Header Profile & Notification row */}
      <div className="flex items-center justify-between w-full relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:bg-white/[0.04] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            style={{ border: '1px solid rgb(228 228 231 / 0.5)' }}
          >
            <Bell className="w-5 h-5" />
            {(unpaidTables.length + lowStockInsumos.length) > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--primary)] ring-2 ring-[var(--bg-secondary)]"></span>
            )}
          </button>

          {/* Floating Live Alerts Dropdown */}
          {showNotifications && (
            <div
              className="absolute left-0 top-12 w-72 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-3 bg-[var(--bg-secondary)]"
              style={{
                border: '1px solid rgb(228 228 231 / 0.6)',
                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
              }}
            >
              <div className="flex items-center justify-between border-b border-zinc-200/20 pb-2">
                <span className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider">Alertas en Vivo</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  {unpaidTables.length + lowStockInsumos.length} alertas
                </span>
              </div>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {unpaidTables.length === 0 && lowStockInsumos.length === 0 ? (
                  <span className="text-[10px] text-[var(--text-muted)] py-3 text-center block">No hay alertas activas en este momento.</span>
                ) : (
                  <>
                    {unpaidTables.map(t => (
                      <div key={`table-${t.id}`} className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-amber-500">Mesa {t.numero}</span>
                          <span className="text-[9px] text-[var(--text-muted)]">Falta pagar / Ocupada</span>
                        </div>
                        <span className="text-[8px] font-mono font-bold bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">Pendiente</span>
                      </div>
                    ))}
                    {lowStockInsumos.map(i => (
                      <div key={`insumo-${i.id}`} className="flex items-center justify-between p-2 rounded-xl bg-red-500/5 border border-red-500/20">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-red-500">{i.nombre}</span>
                          <span className="text-[9px] text-[var(--text-muted)]">Stock: {i.stock} {i.unidadMedida} (Min: {i.stockMinimo})</span>
                        </div>
                        <span className="text-[8px] font-mono font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">Stock Crítico</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-[var(--text-main)]">Hector Q.</span>
            <span className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-500">ADMIN LIVE</span>
          </div>
          <div className="relative">
            <img
              src="https://api.dicebear.com/7.x/adventurer/svg?seed=Hector"
              alt="Hector Admin"
              className="w-10 h-10 rounded-2xl object-cover bg-slate-800"
              style={{ border: '1px solid rgb(228 228 231 / 0.4)' }}
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-[var(--bg-secondary)]"></span>
          </div>
        </div>
      </div>

      {/* Statistics Label */}
      <div className="flex items-center justify-between mt-2">
        <h3 className="font-bold text-base tracking-wide text-[var(--text-main)]">Estadísticas</h3>
        <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer bg-transparent border-none">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Donut Chart */}
      <div className="flex flex-col items-center justify-center my-1 relative">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="fill-transparent stroke-white/[0.04]"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="var(--primary)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <div className="absolute inset-1.5 rounded-full flex flex-col items-center justify-center bg-[var(--bg-secondary)] shadow-sm" style={{ border: '1px solid rgb(228 228 231 / 0.5)' }}>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
              CAJA DEL DÍA
            </span>
            <span className="text-lg font-black mt-0.5 tracking-tight text-[var(--text-main)] font-mono">
              S/. {currentEarning.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[8px] font-bold mt-0.5 tracking-wide px-1.5 py-0.2 rounded-full flex items-center gap-0.5 bg-green-500/10 text-green-500 border border-green-500/20">
              <TrendingUp className="w-2.5 h-2.5" /> {goalPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Calendar */}
      <div className="flex justify-center w-full relative z-30 select-none">
        <Calendar
          mode="single"
          selected={selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date()}
          onSelect={(date) => {
            if (date) {
              const yearVal = date.getFullYear();
              const monthVal = String(date.getMonth() + 1).padStart(2, '0');
              const dayVal = String(date.getDate()).padStart(2, '0');
              setSelectedDate(`${yearVal}-${monthVal}-${dayVal}`);
            }
          }}
          className="w-full"
        />
      </div>

      {/* PREMIUM INTERACTIVE 2D AREA CHART CARD: CASH FLOW */}
      <SubCard className="p-2.5 flex flex-col gap-1.5 relative mt-1 text-[var(--text-main)]">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Flujo de Fondos</span>
            <span className="text-lg font-black mt-0.5 tracking-tight font-mono text-[var(--text-main)]">
              S/. {activeEarning.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] text-green-500 font-extrabold flex items-center">
                <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> 10.2% vs semana anterior
              </span>
              <span className="text-[9px] text-[var(--text-muted)] font-bold font-sans">({activeLabel})</span>
            </div>
          </div>

          <div className="relative">
            <select
              value={fundFilter}
              onChange={(e) => setFundFilter(e.target.value)}
              className="bg-white/5 border border-zinc-500/20 rounded-xl px-2.5 py-1 text-[9px] font-extrabold text-[var(--text-main)] focus:outline-none cursor-pointer"
            >
              <option value="week" className="bg-[#0b0b10]">Esta semana</option>
              <option value="month" className="bg-[#0b0b10]">Últimos 30 días</option>
            </select>
          </div>
        </div>

        <div className="relative w-full h-[90px] mt-1 select-none">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.5, 1].map((ratio, index) => {
              const yVal = chartPaddingTop + ratio * chartHeight;
              const gridAmount = maxAmount - ratio * maxAmount;
              return (
                <g key={index} className="opacity-40">
                  <line
                    x1={chartPaddingLeft}
                    y1={yVal}
                    x2={svgWidth - chartPaddingRight}
                    y2={yVal}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="0.8"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={chartPaddingLeft - 6}
                    y={yVal + 3}
                    fill="var(--text-muted)"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="end"
                    className="font-mono"
                  >
                    {gridAmount >= 1000 ? `${(gridAmount / 1000).toFixed(1)}K` : Math.round(gridAmount)}
                  </text>
                </g>
              );
            })}

            {/* Filled Area Gradient */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#chartAreaGradient)"
                className="transition-all duration-300 ease-out"
              />
            )}

            {/* Spline Curve Line */}
            {curvePath && (
              <path
                d={curvePath}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
            )}

            {/* X-Axis Labels */}
            {points.map((p, i) => {
              if (points.length > 7 && i % Math.ceil(points.length / 6) !== 0 && activeIdx !== i) {
                return null;
              }
              return (
                <text
                  key={i}
                  x={p.x}
                  y={chartPaddingTop + chartHeight + 11}
                  fill={activeIdx === i ? "var(--primary)" : "var(--text-muted)"}
                  fontSize="7"
                  fontWeight="900"
                  textAnchor="middle"
                  className="transition-colors duration-200"
                >
                  {p.label.split(' ')[1]}
                </text>
              );
            })}

            {/* Glowing Active Point */}
            {activePoint && (
              <g className="transition-all duration-150 ease-out">
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="7"
                  fill="var(--primary)"
                  opacity="0.35"
                  className="animate-ping"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="5"
                  fill="white"
                  stroke="var(--primary)"
                  strokeWidth="2.5"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="1.5"
                  fill="var(--primary)"
                />

                {/* Speech Bubble Tooltip */}
                <g transform={`translate(${activePoint.x}, ${activePoint.y})`}>
                  <path
                    d="M -26 -32 h 52 a 4 4 0 0 1 4 4 v 11 a 4 4 0 0 1 -4 4 h -22 l -4 4 l -4 -4 h -22 a 4 4 0 0 1 -4 -4 v -11 a 4 4 0 0 1 4 -4 z"
                    fill="var(--primary)"
                    className="shadow-lg filter drop-shadow-md"
                  />
                  <text
                    y="-20"
                    fill="white"
                    fontSize="7.5"
                    fontWeight="900"
                    textAnchor="middle"
                    className="font-mono tracking-tight"
                  >
                    S/.{Math.round(activePoint.earning)}
                  </text>
                </g>
              </g>
            )}

            {/* Invisible Hover triggers */}
            {points.map((p, i) => {
              const colWidth = chartWidth / (chartData.length - 1 || 1);
              const triggerX = p.x - colWidth / 2;
              return (
                <rect
                  key={i}
                  x={triggerX}
                  y={0}
                  width={colWidth}
                  height={svgHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setSelectedDate(p.date)}
                />
              );
            })}
          </svg>
        </div>
      </SubCard>

    </GlassCard>
  );
};

// Editable widget container that allows dragging and resizing (VisBug style)
const EditableWidget = ({ id, layout, onLayoutChange, designMode, children, className = "" }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (!designMode) return;
    // Don't drag if clicking buttons, links, inputs, or selects
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('input')) return;

    if (e.target.closest('.resize-handle')) {
      setIsResizing(true);
      setResizeStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - (layout.x || 0), y: e.clientY - (layout.y || 0) });
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        onLayoutChange(id, {
          ...layout,
          x: dx,
          y: dy,
          absolute: true
        });
      } else if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        onLayoutChange(id, {
          ...layout,
          width: Math.max(100, (layout.width || 300) + dx),
          height: Math.max(80, (layout.height || 200) + dy),
          absolute: true
        });
        setResizeStart({ x: e.clientX, y: e.clientY });
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

  const style = layout.absolute ? {
    position: 'absolute',
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    width: typeof layout.width === 'number' ? `${layout.width}px` : layout.width,
    height: typeof layout.height === 'number' ? `${layout.height}px` : layout.height,
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
      className={`${className} ${designMode ? 'border border-dashed border-[var(--primary)]/60 rounded-[26px] p-0.5 bg-[var(--primary)]/5 select-none shadow-xl' : ''}`}
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

  // VisBug Design Mode States
  const [designMode, setDesignMode] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState('auto');
  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem('bunker_dashboard_layouts');
    return saved ? JSON.parse(saved) : {
      welcomeHeader: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      myCard: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      categories: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      pedidos: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      cierre: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      statistics: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
    };
  });

  const resetLayout = () => {
    setDesignMode(false);
    setCanvasHeight('auto');
    const defaultLayouts = {
      welcomeHeader: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      myCard: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      categories: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      pedidos: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      cierre: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
      statistics: { x: 0, y: 0, width: '100%', height: 'auto', absolute: false },
    };
    setLayouts(defaultLayouts);
    localStorage.removeItem('bunker_dashboard_layouts');
    // showToast('Diseño restablecido al grid original.', 'info');
  };

  // Run a layout migration on first render to clear any broken states in the user's browser local storage
  useEffect(() => {
    const migrationKey = 'bunker_dashboard_layout_migration_v4';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.removeItem('bunker_dashboard_layouts');
      localStorage.setItem(migrationKey, 'true');
      resetLayout();
    }
  }, []);

  // Calculate canvas height dynamically based on layout coordinates to avoid collapses
  useEffect(() => {
    const hasAbsolute = Object.values(layouts).some(l => l.absolute);
    if (hasAbsolute) {
      const maxBottom = Object.values(layouts).reduce((max, lay) => {
        if (!lay.absolute) return max;
        const bottom = (lay.y || 0) + (typeof lay.height === 'number' ? lay.height : 250);
        return Math.max(max, bottom);
      }, 550);
      setCanvasHeight(`${maxBottom + 20}px`);
    } else {
      setCanvasHeight('auto');
    }
  }, [layouts]);

  const updateLayout = (id, newLayout) => {
    setLayouts(prev => {
      const updated = { ...prev, [id]: newLayout };
      localStorage.setItem('bunker_dashboard_layouts', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleDesignMode = () => {
    if (!designMode) {
      const hasAbsolute = Object.values(layouts).some(l => l.absolute);
      if (!hasAbsolute) {
        const container = document.getElementById('dashboard-canvas');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const ids = ['welcomeHeader', 'myCard', 'categories', 'pedidos', 'cierre', 'statistics'];
          const newLayouts = { ...layouts };

          ids.forEach(id => {
            const el = document.getElementById(`widget-${id}`);
            if (el) {
              const rect = el.getBoundingClientRect();
              newLayouts[id] = {
                x: rect.left - containerRect.left,
                y: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height,
                absolute: true
              };
            }
          });

          setLayouts(newLayouts);
          localStorage.setItem('bunker_dashboard_layouts', JSON.stringify(newLayouts));
        }
      }
      setDesignMode(true);
      showToast('Modo Diseño activado. Arrastra y deforma libremente las cartillas y cabecera.', 'info');
    } else {
      setDesignMode(false);
      showToast('Diseño personalizado guardado.', 'success');
    }
  };

  // Selected Date state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [fundFilter, setFundFilter] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lowStockInsumos, setLowStockInsumos] = useState([]);
  const [unpaidTables, setUnpaidTables] = useState([]);

  // Active cashier state
  const [activeBalance, setActiveBalance] = useState(null);
  const [tables, setTables] = useState([]);
  const [waitersList, setWaitersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch static data on mount & periodic sync
  const loadStaticData = async () => {
    try {
      const [weeklyRes, alertsRes, balanceRes] = await Promise.all([
        fetch('/api/stats/weekly-earnings'),
        fetch('/api/insumos/alertas'),
        fetch('/api/cashier/balance')
      ]);

      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        setWeeklyEarnings(data.total || 0);
      }
      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setLowStockInsumos(data);
      }
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setActiveBalance(balanceData);
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
        fetch(`/api/staff/stats?fecha=${selectedDate}`),
        fetch(`/api/stats/transactions?fecha=${selectedDate}`),
        fetch(`/api/stats/fund-flow?range=${fundFilter}`)
      ]);

      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData);
        // Filtro de mesas ocupadas que faltan pagar
        const unpaid = tablesData.filter(t => t.estado?.toLowerCase() === 'ocupada' || t.estado?.toLowerCase() === 'ocupado');
        setUnpaidTables(unpaid);
      }
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setWaitersList(staffData.waiters || []);
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
    // Periodic refresh every 30 seconds for background notifications/alert monitoring
    const interval = setInterval(loadStaticData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, fundFilter]);

  // PDF Export for Cierre de Mesas
  const handleDownloadPDF = (transactionsToExport) => {
    try {
      const doc = new jsPDF();

      // Header Banner
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(0, 201, 180);
      doc.text("Bunker - Cierre de Mesas", 14, 20);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado el: ${new Date().toLocaleString()} | Fecha Reporte: ${selectedDate}`, 14, 26);

      // Table data mapping
      const headers = [["Mesa", "Hora Cierre", "Mozo Atendió", "Monto Final"]];
      const tableRows = transactionsToExport.map(tx => [
        tx.tableName,
        tx.closedAt,
        tx.waiterName,
        `S/. ${(tx.total || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 32,
        head: headers,
        body: tableRows,
        headStyles: { fillColor: [0, 201, 180], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });

      doc.save(`Bunker_Cierre_Mesas_${selectedDate}.pdf`);
      showToast("Reporte PDF descargado con éxito.", "success");
    } catch (e) {
      console.error(e);
      showToast("Error al generar PDF.", "error");
    }
  };

  // --- DERIVE PROPERTIES & DYNAMIC SYNC ---
  const currentTransactions = transactions;
  const currentEarning = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
  const DAILY_GOAL = 1000;
  const goalPercentage = Math.min(100, Math.round((currentEarning / DAILY_GOAL) * 100));

  const currentWaiters = waitersList && waitersList.length > 0
    ? [...waitersList].sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0))
    : [];
  const topWaiter = currentWaiters.length > 0 ? currentWaiters[0] : null;

  // Category statistics derived from real tables count
  const totalTablesCount = tables.length || 15;
  const occupiedTables = tables.filter(t => t.estado?.toLowerCase() === 'ocupada' || t.estado?.toLowerCase() === 'ocupado');
  const occupiedTablesCount = occupiedTables.length;
  const activeOrdersCount = occupiedTablesCount;

  // Real average wait time calculation
  let averageWaitTime = 0;
  let activeComandasWithTime = 0;
  let totalWaitTime = 0;

  occupiedTables.forEach(t => {
    if (t.comandas && t.comandas.length > 0) {
      const comandaDate = new Date(t.comandas[0].fecha);
      const diffMs = Date.now() - comandaDate.getTime();
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      if (diffMins < 90) { // filter out stale ones
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

  const hasAbsoluteLayout = Object.values(layouts).some(l => l.absolute);

  // Helper render function for the Welcome Header content
  const renderHeaderContent = () => (
    <header id="widget-welcomeHeader" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 w-full relative z-30">
      <div className="flex flex-col">
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-main)] flex items-center gap-2">
          ¡Bienvenido, {user?.nombre || 'Usuario'}!
          {/* Discreet Button for Design Mode */}
          <button
            onClick={toggleDesignMode}
            className="p-1 rounded-lg opacity-20 hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all cursor-pointer bg-transparent border-none flex items-center justify-center"
            title={designMode ? "Guardar y Salir" : "Alternar Modo Diseño (Estilo VisBug)"}
          >
            <Sparkles className={`w-3.5 h-3.5 ${designMode ? 'text-[var(--primary)] animate-pulse' : ''}`} />
          </button>
        </h1>
        <p className="text-[11px] mt-0.5 flex items-center gap-1.5 text-[var(--text-muted)] font-sans">
          <ChefHat className="w-3 h-3 text-[var(--primary)]" />
          Búnker &bull; Salón y Comandas &bull; Perú
        </p>
      </div>
    </header>
  );

  return (
    <div id="dashboard-canvas" style={{ height: canvasHeight }} className="flex flex-col gap-3 text-[var(--text-main)] font-sans bg-[var(--bg-primary)] pb-1 relative w-full">
      {designMode || hasAbsoluteLayout ? (
        // VisBug Drag and Resize Layout Canvas
        <>
          {/* If the header is NOT absolute yet, we render it at the top as static */}
          {!layouts.welcomeHeader.absolute ? (
            renderHeaderContent()
          ) : null}

          {/* If the header is absolute, we render it inside the canvas as an EditableWidget */}
          {layouts.welcomeHeader.absolute && (
            <EditableWidget id="welcomeHeader" layout={layouts.welcomeHeader} onLayoutChange={updateLayout} designMode={designMode} className="w-full">
              {renderHeaderContent()}
            </EditableWidget>
          )}

          <EditableWidget id="myCard" layout={layouts.myCard} onLayoutChange={updateLayout} designMode={designMode}>
            <MyCardComponent
              weeklyEarnings={weeklyEarnings}
            />
          </EditableWidget>

          <EditableWidget id="categories" layout={layouts.categories} onLayoutChange={updateLayout} designMode={designMode}>
            <CategoryPanelComponent
              activeOrdersCount={activeOrdersCount}
              averageWaitTime={averageWaitTime}
              occupiedTablesCount={occupiedTablesCount}
              totalTablesCount={totalTablesCount}
            />
          </EditableWidget>

          <EditableWidget id="pedidos" layout={layouts.pedidos} onLayoutChange={updateLayout} designMode={designMode}>
            <PedidosAtendidosComponent
              waiters={currentWaiters}
              topWaiter={topWaiter}
            />
          </EditableWidget>

          <EditableWidget id="cierre" layout={layouts.cierre} onLayoutChange={updateLayout} designMode={designMode}>
            <CierreMesasComponent
              transactions={currentTransactions}
              onDownloadPDF={() => handleDownloadPDF(currentTransactions)}
            />
          </EditableWidget>

          <EditableWidget id="statistics" layout={layouts.statistics} onLayoutChange={updateLayout} designMode={designMode}>
            <StatisticsPanelComponent
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              goalPercentage={goalPercentage}
              currentEarning={currentEarning}
              chartData={chartData}
              fundFilter={fundFilter}
              setFundFilter={setFundFilter}
              onShowToast={showToast}
              unpaidTables={unpaidTables}
              lowStockInsumos={lowStockInsumos}
            />
          </EditableWidget>
        </>
      ) : (
        // Standard Responsive Layout Grid
        <>
          {renderHeaderContent()}

          <div className="grid grid-cols-1 xl:grid-cols-10 gap-4 items-start w-full h-full">
            {/* LEFT COMPONENT COLUMN (Occupies 7 columns out of 10) */}
            <div className="xl:col-span-7 flex flex-col gap-4">
              {/* Top Row: My Card + Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                <div id="widget-myCard" className="w-full">
                  <MyCardComponent
                    weeklyEarnings={weeklyEarnings}
                  />
                </div>

                <div id="widget-categories" className="w-full">
                  <CategoryPanelComponent
                    activeOrdersCount={activeOrdersCount}
                    averageWaitTime={averageWaitTime}
                    occupiedTablesCount={occupiedTablesCount}
                    totalTablesCount={totalTablesCount}
                  />
                </div>
              </div>

              {/* Bottom Row: Waiters commissions + Closed Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                <div id="widget-pedidos" className="w-full">
                  <PedidosAtendidosComponent
                    waiters={currentWaiters}
                    topWaiter={topWaiter}
                  />
                </div>

                <div id="widget-cierre" className="w-full">
                  <CierreMesasComponent
                    transactions={currentTransactions}
                    onDownloadPDF={() => handleDownloadPDF(currentTransactions)}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COMPONENT COLUMN (Occupies 3 columns out of 10) */}
            <div id="widget-statistics" className="xl:col-span-3 h-full w-full">
              <StatisticsPanelComponent
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                goalPercentage={goalPercentage}
                currentEarning={currentEarning}
                chartData={chartData}
                fundFilter={fundFilter}
                setFundFilter={setFundFilter}
                onShowToast={showToast}
                unpaidTables={unpaidTables}
                lowStockInsumos={lowStockInsumos}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HomeView;
