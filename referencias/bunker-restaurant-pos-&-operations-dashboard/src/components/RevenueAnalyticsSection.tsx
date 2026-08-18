import React, { useState } from 'react';
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
  DollarSign, 
  TrendingUp, 
  Calendar, 
  PieChart, 
  Flame, 
  ArrowUpRight, 
  Clock, 
  Users, 
  Sparkles,
  BarChart3,
  LineChart as LineChartIcon
} from 'lucide-react';
import { RevenuePeriod, RevenueDataPoint } from '../types';
import { REVENUE_DATA, CATEGORIES_BREAKDOWN, HOURLY_HEATMAP } from '../data/restaurantData';

interface RevenueAnalyticsSectionProps {
  currentPeriod: RevenuePeriod;
  onChangePeriod: (period: RevenuePeriod) => void;
}

export const RevenueAnalyticsSection: React.FC<RevenueAnalyticsSectionProps> = ({
  currentPeriod,
  onChangePeriod,
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'guests' | 'ticket'>('revenue');

  const rawData: RevenueDataPoint[] = REVENUE_DATA[currentPeriod] || REVENUE_DATA.day;

  // Calculate totals
  const totalRevenue = rawData.reduce((sum, item) => sum + item.revenue, 0);
  const prevTotalRevenue = rawData.reduce((sum, item) => sum + item.previousRevenue, 0);
  const growthPercent = (((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100).toFixed(1);
  const totalOrders = rawData.reduce((sum, item) => sum + item.ordersCount, 0);
  const totalGuests = rawData.reduce((sum, item) => sum + item.guestsCount, 0);
  const avgTicket = totalRevenue / (totalOrders || 1);

  // Period label
  const getPeriodLabel = () => {
    switch (currentPeriod) {
      case 'day': return 'Hoy (Horas del Turno)';
      case 'week': return 'Esta Semana (Lun - Dom)';
      case 'month': return 'Este Mes (Semanas)';
      case 'year': return 'Este Año (Meses)';
    }
  };

  // Custom Dark Luxury Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/95 border border-zinc-800 rounded-xl p-3 shadow-2xl font-mono-nums text-xs min-w-[170px]">
          <div className="text-emerald-400 font-bold text-sm mb-1.5 border-b border-zinc-800 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-zinc-400 font-normal">{getPeriodLabel()}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-white">
              <span className="text-zinc-400">Ingresos:</span>
              <span className="font-bold text-emerald-400">${data.revenue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-zinc-500 text-[11px]">
              <span>Periodo Ant.:</span>
              <span>${data.previousRevenue.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-zinc-300 text-[11px] pt-1 border-t border-zinc-800">
              <span className="text-zinc-400">Comensales:</span>
              <span className="text-zinc-200 font-semibold">{data.guestsCount} pers.</span>
            </div>

            <div className="flex justify-between text-zinc-300 text-[11px]">
              <span className="text-zinc-400">Ticket Prom.:</span>
              <span className="text-emerald-400 font-semibold">${data.avgTicket.toFixed(1)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="revenue-analytics-card" className="glass-panel rounded-2xl p-5 lg:p-6 flex flex-col h-full hover:border-white/15 transition-all">
      
      {/* Revenue Header with Segmented Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-lg text-white tracking-tight">Rendimiento de Ventas</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono-nums font-bold flex items-center gap-0.5 neon-glow-emerald">
              <TrendingUp className="w-3.5 h-3.5" /> +{growthPercent}%
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-medium">Ingresos en tiempo real, ticket medio y proyección financiera</p>
        </div>

        {/* Floating Segmented Period Control (Día / Semana / Mes / Año) */}
        <div className="flex items-center gap-2">
          
          {/* Chart Style Switcher */}
          <div className="hidden sm:flex items-center p-1 rounded-xl bg-black/60 border border-white/10">
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                chartType === 'area' ? 'bg-zinc-800 text-white font-bold border border-white/10' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Gráfico de Línea Suave"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                chartType === 'bar' ? 'bg-zinc-800 text-white font-bold border border-white/10' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Gráfico de Barras"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Segmented Period Tabs - Bento Style */}
          <div className="bg-black/60 p-1 rounded-xl flex space-x-1 border border-white/10">
            {(['day', 'week', 'month', 'year'] as RevenuePeriod[]).map((period) => (
              <button
                key={period}
                id={`revenue-period-btn-${period}`}
                onClick={() => onChangePeriod(period)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-lg uppercase tracking-wider transition-all ${
                  currentPeriod === period
                    ? 'bg-zinc-800 text-white shadow-sm border border-white/15'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {period === 'day' ? 'DÍA' : period === 'week' ? 'SEMANA' : period === 'month' ? 'MES' : 'AÑO'}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Quick Financial Highlight Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div 
          onClick={() => setActiveMetric('revenue')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeMetric === 'revenue' 
              ? 'bg-zinc-800/80 border-emerald-500/50 text-white' 
              : 'bg-black/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] text-zinc-400 block font-medium">Venta Total</span>
          <div className="text-lg font-bold text-white font-mono-nums mt-0.5">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono-nums font-semibold flex items-center">
            <ArrowUpRight className="w-3 h-3 mr-0.5" /> +{growthPercent}% vs ant.
          </span>
        </div>

        <div 
          onClick={() => setActiveMetric('ticket')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeMetric === 'ticket' 
              ? 'bg-zinc-800/80 border-emerald-500/50 text-white' 
              : 'bg-black/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] text-zinc-400 block font-medium">Ticket Medio</span>
          <div className="text-lg font-bold text-white font-mono-nums mt-0.5">
            ${avgTicket.toFixed(2)}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono-nums">
            {totalOrders} comandas
          </span>
        </div>

        <div 
          onClick={() => setActiveMetric('guests')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeMetric === 'guests' 
              ? 'bg-zinc-800/80 border-emerald-500/50 text-white' 
              : 'bg-black/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] text-zinc-400 block font-medium">Comensales</span>
          <div className="text-lg font-bold text-white font-mono-nums mt-0.5">
            {totalGuests.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-500 font-mono-nums">
            ~{(totalGuests / (totalOrders || 1)).toFixed(1)} com./mesa
          </span>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Hora Pico / Rush</span>
          <div className="text-lg font-bold text-white font-mono-nums mt-0.5">
            21:00 - 22:30
          </div>
          <span className="text-[10px] text-emerald-400 font-mono-nums">
            Ocupación 100%
          </span>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="flex-1 min-h-[240px] w-full pt-1">
        <ResponsiveContainer width="100%" height={240}>
          {chartType === 'area' ? (
            <AreaChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="bunkerRevenueGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="bunkerPrevRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#71717a" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="#71717a" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="previousRevenue" 
                name="Periodo Anterior" 
                stroke="#52525b" 
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1} 
                fill="url(#bunkerPrevRevenue)" 
              />
              <Area 
                type="monotone" 
                dataKey={activeMetric === 'revenue' ? 'revenue' : activeMetric === 'guests' ? 'guestsCount' : 'avgTicket'} 
                name="Ingresos Actuales" 
                stroke="#10b981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#bunkerRevenueGlow)" 
              />
            </AreaChart>
          ) : (
            <BarChart data={rawData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="#71717a" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="previousRevenue" name="Periodo Ant." fill="#27272a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown & Rush Timeline */}
      <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Category breakdown bars */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-2.5">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-emerald-400" />
              Desglose por Categorías
            </span>
            <span className="text-[11px] text-zinc-500">100% cartas</span>
          </div>

          <div className="space-y-2">
            {CATEGORIES_BREAKDOWN.map((cat) => (
              <div key={cat.name} className="text-xs">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">{cat.name}</span>
                  <span className="font-mono-nums font-semibold text-white">
                    ${cat.amount.toLocaleString()} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rush Hours Heatmap Tracker */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-2.5">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Horarios Pico & Demanda
            </span>
            <span className="text-[11px] text-zinc-500 font-mono-nums">Almuerzo / Cena</span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center">
            {HOURLY_HEATMAP.slice(0, 10).map((heat) => (
              <div 
                key={heat.hour}
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  heat.isPeak
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-black/40 border-zinc-800 text-zinc-400'
                }`}
              >
                <span className="text-[10px] font-mono-nums font-medium">{heat.hour}</span>
                <span className={`text-xs font-bold font-mono-nums my-0.5 ${heat.isPeak ? 'text-emerald-400' : 'text-zinc-300'}`}>
                  {heat.occupancyRate}%
                </span>
                <span className="text-[9px] text-zinc-500 truncate">
                  {heat.isPeak ? '🔥 Rush' : 'Normal'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
