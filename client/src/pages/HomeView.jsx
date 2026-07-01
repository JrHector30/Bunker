import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, TrendingUp, MoreHorizontal, ChefHat, Clock, Layers,
  Award, Sparkles, Receipt, CheckCircle, Bell, MessageSquare,
  Calendar, ChevronLeft, ChevronRight, Download, Utensils, Wine, Coffee
} from 'lucide-react';
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

// 1. MyCard Component (Simulated Weekly Earnings Ticking)
const MyCardComponent = ({ weeklyEarnings, setWeeklyEarnings }) => {
  useEffect(() => {
    const interval = setInterval(() => {
      const increment = parseFloat((Math.random() * 0.75 + 0.10).toFixed(2));
      setWeeklyEarnings(prev => prev + increment);
    }, 2500);
    return () => clearInterval(interval);
  }, [setWeeklyEarnings]);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-xs tracking-wide text-[var(--text-muted)]">Mi Tarjeta</h3>
        <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer bg-transparent border-none">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <GlassCard className="p-6 min-h-[190px] flex flex-col justify-between">
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

          <span className="text-xs font-medium text-[var(--text-muted)]">06/26</span>
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
              <span className="text-xs font-bold text-[var(--primary)]">S/.</span>
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

      <div className="grid grid-cols-3 gap-3 w-full">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative overflow-hidden rounded-[24px] p-4 flex flex-col justify-between items-center text-center min-h-[190px] group cursor-pointer bg-[var(--bg-secondary)]"
              style={{
                border: '1px solid rgb(228 228 231 / 0.5)',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl ${cat.iconBg} border border-zinc-200/50 shadow-sm`}>
                <Icon className={`w-5 h-5 ${cat.iconColor}`} />
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
        className="flex-1 rounded-[24px] p-5 flex flex-col justify-between min-h-[350px] bg-[var(--bg-secondary)]"
        style={{
          border: '1px solid rgb(228 228 231 / 0.5)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[250px] pr-1 scrollbar-none">
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
        <div className="mt-4 p-3 rounded-2xl border flex items-center justify-between bg-[var(--primary)]/5 border-zinc-200/40">
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
        className="flex-1 rounded-[24px] p-5 flex flex-col min-h-[350px] bg-[var(--bg-secondary)]"
        style={{
          border: '1px solid rgb(228 228 231 / 0.5)',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[320px] pr-1 scrollbar-none">
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
const StatisticsPanelComponent = ({ selectedDate, setSelectedDate, dailyEarnings, goalPercentage, currentEarning, onShowToast }) => {
  const [hasNotifications, setHasNotifications] = useState(true);

  // Generate June 2026 Calendar grid (starts on Monday June 1st, ends on Tuesday June 30th)
  const totalDays = 30;
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const handleDayClick = (dayNum) => {
    const formattedDate = `2026-06-${dayNum.toString().padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    onShowToast(`Estadísticas para el ${dayNum} de Junio, 2026.`, "info");
  };

  // Bar Chart comparison dates - June 24 to June 30
  const comparisonDays = [
    { label: 'Mié 24', date: '2026-06-24' },
    { label: 'Jue 25', date: '2026-06-25' },
    { label: 'Vie 26', date: '2026-06-26' },
    { label: 'Sáb 27', date: '2026-06-27' },
    { label: 'Dom 28', date: '2026-06-28' },
    { label: 'Lun 29', date: '2026-06-29' },
    { label: 'Mar 30', date: '2026-06-30' },
  ];

  // Circle progress calculations
  const radius = 40;
  const strokeDasharray = 2 * Math.PI * radius; // 251.2
  const strokeDashoffset = strokeDasharray - (strokeDasharray * goalPercentage) / 100;

  return (
    <div className="flex flex-col gap-4 w-full p-5 h-full bg-[var(--bg-secondary)]" style={{ borderLeft: '1px solid rgb(228 228 231 / 0.4)', boxShadow: '-1px 0 0 0 rgb(228 228 231 / 0.3)', height: '872px', transform: 'translateY(-171px)' }}>

      {/* Header Profile & Notification row */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setHasNotifications(false);
              onShowToast('Bandeja de alertas limpia.', 'info');
            }}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:bg-white/[0.04] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            style={{ border: '1px solid rgb(228 228 231 / 0.5)' }}
          >
            <Bell className="w-5 h-5" />
            {hasNotifications && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--primary)] ring-2 ring-[var(--bg-secondary)]"></span>
            )}
          </button>

          <button
            onClick={() => onShowToast('No tienes mensajes pendientes de cocina.', 'info')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:bg-white/[0.04] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            style={{ border: '1px solid rgb(228 228 231 / 0.5)' }}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
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
      <div className="flex flex-col items-center justify-center my-2 relative">
        <div className="relative w-44 h-44 flex items-center justify-center">
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

          <div className="absolute inset-2 rounded-full flex flex-col items-center justify-center bg-[var(--bg-secondary)] shadow-sm" style={{ border: '1px solid rgb(228 228 231 / 0.5)' }}>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
              CAJA DEL DÍA
            </span>
            <span className="text-xl font-black mt-1 tracking-tight text-[var(--text-main)] font-mono">
              S/. {currentEarning.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[9px] font-bold mt-1 tracking-wide px-2 py-0.5 rounded-full flex items-center gap-0.5 bg-green-500/10 text-green-500 border border-green-500/20">
              <TrendingUp className="w-3 h-3" /> {goalPercentage}% de Meta
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Calendar */}
      <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: 'rgba(var(--primary-rgb, 0 201 180) / 0.05)', border: '1px solid rgb(228 228 231 / 0.4)' }}>
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-main)]">
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
            Junio 2026
          </span>
          <div className="flex gap-1">
            <button className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer bg-transparent border-none">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer bg-transparent border-none">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mt-1 text-center text-[10px]">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
            <span key={idx} className="font-extrabold text-[var(--text-muted)]">{day}</span>
          ))}
          {daysArray.map((day) => {
            const formatted = `2026-06-${day.toString().padStart(2, '0')}`;
            const isSelected = selectedDate === formatted;

            // Check if day has data (show colored indicator)
            const daysWithData = [24, 25, 26, 27, 28, 29, 30];
            const hasData = daysWithData.includes(day);

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`w-6 h-6 rounded-lg text-center flex items-center justify-center font-bold transition-all cursor-pointer border-none bg-transparent ${isSelected
                  ? 'bg-[var(--primary)] text-white dark:text-black shadow-md shadow-[var(--primary)]/20 scale-110'
                  : hasData
                    ? 'text-[var(--primary)] hover:bg-[var(--primary)]/10 font-extrabold'
                    : 'text-[var(--text-muted)] hover:bg-white/[0.04]'
                  }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Labels inside Statistics */}
      <div className="flex items-center justify-between text-xs font-bold mt-2">
        <span className="text-[var(--text-muted)]">Ingresos</span>
        <div className="flex gap-2">
          <span className="border-b-2 pb-0.5 text-[var(--primary)] border-[var(--primary)]">Días</span>
          <span className="text-[var(--text-muted)]">Semanas</span>
        </div>
      </div>

      {/* Vertical Comparison Bar Chart */}
      <div className="relative h-28 flex items-end justify-between px-2 pt-6">
        <AnimatePresence mode="wait">
          {comparisonDays.some(c => c.date === selectedDate) && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                left: `${(comparisonDays.findIndex(c => c.date === selectedDate) / (comparisonDays.length - 1)) * 74 + 10}%`
              }}
              className="absolute top-0 transform -translate-x-1/2 z-10"
            >
              <div className="font-black text-[9px] px-2 py-0.5 rounded-full shadow-md tracking-wide bg-[var(--primary)] text-white dark:text-black">
                S/. {currentEarning}
              </div>
              <div className="w-1.5 h-1.5 rotate-45 mx-auto -mt-1 shadow-md bg-[var(--primary)]"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {comparisonDays.map((comp) => {
          const matchingEarning = dailyEarnings.find(e => e.date === comp.date)?.amount || 0;
          const maxAmount = Math.max(...dailyEarnings.map(e => e.amount));
          const heightPercent = maxAmount > 0 ? (matchingEarning / maxAmount) * 100 : 0;
          const isSelected = selectedDate === comp.date;

          return (
            <div
              key={comp.date}
              onClick={() => setSelectedDate(comp.date)}
              className="flex flex-col items-center gap-2 group cursor-pointer flex-1"
            >
              <div className="relative w-2.5 h-20 rounded-full overflow-hidden flex items-end" style={{ background: 'rgba(228,228,231,0.2)', border: '1px solid rgb(228 228 231 / 0.35)' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 15 }}
                  className={`w-full rounded-full transition-colors ${isSelected
                    ? 'bg-[var(--primary)]'
                    : 'bg-[var(--text-muted)]/20 group-hover:bg-[var(--primary)]/10'
                    }`}
                />
              </div>

              <span className={`text-[8px] font-bold ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                }`}>
                {comp.label}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
};

// Main HomeView Page
const HomeView = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { user } = useAuth();

  // Selected Date state
  const [selectedDate, setSelectedDate] = useState('2026-06-30');
  const [weeklyEarnings, setWeeklyEarnings] = useState(2485.50);

  // Active cashier state
  const [activeBalance, setActiveBalance] = useState(null);
  const [tables, setTables] = useState([]);
  const [waitersList, setWaitersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pre-populated comparison June earnings matching graph
  const dailyEarnings = [
    { date: '2026-06-24', amount: 450 },
    { date: '2026-06-25', amount: 720 },
    { date: '2026-06-26', amount: 980 },
    { date: '2026-06-27', amount: 1420 },
    { date: '2026-06-28', amount: 1650 },
    { date: '2026-06-29', amount: 890 },
    { date: '2026-06-30', amount: 1200 },
  ];

  // Fetch live active data from server
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [balanceRes, tablesRes, staffRes] = await Promise.all([
        fetch('/api/cashier/balance'),
        fetch('/api/tables'),
        fetch(`/api/staff/stats?date=${new Date().toISOString().split('T')[0]}`)
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setActiveBalance(balanceData);
      }
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(tablesData);
      }
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setWaitersList(staffData.waiters || []);
      }
    } catch (e) {
      console.error(e);
      showToast("Error de conexión al cargar datos de Bunker.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  // --- DERIVE PROPERTIES & DYNAMIC SYNC CONDITIONAL ---

  // 1. Daily goal & earnings
  const getEarningForSelectedDate = () => {
    // If the selected date is today (the active day), return the live totalCaja or totalBruto
    const isTodaySelected = selectedDate === '2026-06-30'; // Or matching simulated day
    if (isTodaySelected && activeBalance) {
      // Use actual active cashier earnings if available, else standard June 30th value
      return activeBalance.totalBruto > 0 ? activeBalance.totalBruto : 1200;
    }
    return dailyEarnings.find(e => e.date === selectedDate)?.amount || 400;
  };

  const currentEarning = getEarningForSelectedDate();
  const DAILY_GOAL = 1000;
  const goalPercentage = Math.min(100, Math.round((currentEarning / DAILY_GOAL) * 100));

  // 2. Waiters list for selected date
  const getWaitersForSelectedDate = () => {
    // If there is real active sales data and we are looking at the current day
    if (selectedDate === '2026-06-30' && waitersList.length > 0) {
      const activeWaitersWithSales = waitersList.filter(w => w.totalSales > 0);
      if (activeWaitersWithSales.length > 0) {
        return activeWaitersWithSales.sort((a, b) => b.totalSales - a.totalSales);
      }
    }
    // Fallback/Mock list matching design
    return [
      { id: 1, nombre: 'Carlos Mendoza', totalSales: 450.00 },
      { id: 2, nombre: 'Lucía Santos', totalSales: 380.00 },
      { id: 3, nombre: 'Mateo Ortiz', totalSales: 290.00 },
    ];
  };

  const currentWaiters = getWaitersForSelectedDate();
  const topWaiter = currentWaiters[0];

  // 3. Transactions / Closed Tables list for selected date
  const getTransactionsForSelectedDate = () => {
    if (selectedDate === '2026-06-30' && activeBalance?.ventas && activeBalance.ventas.length > 0) {
      return activeBalance.ventas.map(v => ({
        id: v.id,
        tableName: v.mesaNum ? `Mesa ${v.mesaNum}` : 'Mesa',
        closedAt: formatTime(v.hora),
        waiterName: v.waiterName || 'Mesero',
        total: v.total,
        metodo: v.metodo
      }));
    }
    // Mock transactions matching design
    return [
      { id: 101, tableName: 'Mesa 3', closedAt: '15:20', waiterName: 'Carlos Mendoza', total: 185.50 },
      { id: 102, tableName: 'Mesa 8', closedAt: '14:45', waiterName: 'Lucía Santos', total: 320.00 },
      { id: 103, tableName: 'Mesa 12', closedAt: '13:10', waiterName: 'Mateo Ortiz', total: 125.00 },
    ];
  };

  const currentTransactions = getTransactionsForSelectedDate();

  // 4. Category statistics derived from real tables count
  const totalTablesCount = tables.length || 15;
  const occupiedTablesCount = tables.filter(t => t.estado?.toLowerCase() === 'ocupada' || t.estado?.toLowerCase() === 'ocupado').length;
  const activeOrdersCount = occupiedTablesCount;
  const averageWaitTime = occupiedTablesCount > 0 ? 12 : 0; // Simulated dynamically

  return (
    <div className="min-h-screen p-6 flex flex-col gap-6 text-[var(--text-main)] font-sans bg-[var(--bg-primary)]">
      {/* Welcome Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)]">
            ¡Bienvenido, {user?.nombre || 'Usuario'}!
          </h1>
          <p className="text-xs mt-1 flex items-center gap-1.5 text-[var(--text-muted)]">
            <ChefHat className="w-3.5 h-3.5 text-[var(--primary)]" />
            Búnker &bull; Salón y Comandas &bull; Perú
          </p>
        </div>
      </header>

      {/* 2-Column Responsive Layout: Left content (widgets) + Right content (Statistics sidebar) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">

        {/* LEFT COMPONENT COLUMN (Occupies 3 columns out of 4) */}
        <div className="xl:col-span-3 flex flex-col gap-6">

          {/* Top Row: My Card + Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <MyCardComponent
              weeklyEarnings={weeklyEarnings}
              setWeeklyEarnings={setWeeklyEarnings}
            />

            <CategoryPanelComponent
              activeOrdersCount={activeOrdersCount}
              averageWaitTime={averageWaitTime}
              occupiedTablesCount={occupiedTablesCount}
              totalTablesCount={totalTablesCount}
            />
          </div>

          {/* Bottom Row: Waiters commissions + Closed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <PedidosAtendidosComponent
              waiters={currentWaiters}
              topWaiter={topWaiter}
            />

            <CierreMesasComponent
              transactions={currentTransactions}
              onDownloadPDF={() => handleDownloadPDF(currentTransactions)}
            />
          </div>
        </div>

        {/* RIGHT COMPONENT COLUMN (Occupies 1 column out of 4) */}
        <div className="xl:col-span-1 h-full">
          <StatisticsPanelComponent
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            dailyEarnings={dailyEarnings}
            goalPercentage={goalPercentage}
            currentEarning={currentEarning}
            onShowToast={showToast}
          />
        </div>

      </div>
    </div>
  );
};

export default HomeView;
