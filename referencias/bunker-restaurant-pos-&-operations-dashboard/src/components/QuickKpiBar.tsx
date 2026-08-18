import React from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChefHat
} from 'lucide-react';
import { TableItem } from '../types';

interface QuickKpiBarProps {
  tables: TableItem[];
  totalPeriodSales: number;
  periodSalesGrowth: number;
  avgDeliveryMinutes: number;
  avgTicketAmount: number;
  kitchenActiveTicketsCount: number;
}

export const QuickKpiBar: React.FC<QuickKpiBarProps> = ({
  tables,
  totalPeriodSales,
  periodSalesGrowth,
  avgDeliveryMinutes,
  avgTicketAmount,
  kitchenActiveTicketsCount,
}) => {
  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => t.status === 'occupied' || t.status === 'billing').length;
  const freeTables = tables.filter(t => t.status === 'free').length;
  const billingTables = tables.filter(t => t.status === 'billing').length;
  const delayedTables = tables.filter(t => t.isDelayed).length;
  const occupancyPercent = Math.round((occupiedTables / totalTables) * 100);
  const targetSales = 6000.00;
  const targetProgress = Math.min(100, Math.round((totalPeriodSales / targetSales) * 100));

  return (
    <section id="bunker-kpi-bar" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-5">
      
      {/* KPI 1: Ocupación Actual (Bento 3-col) */}
      <div className="lg:col-span-3 glass-card rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Ocupación de Mesas</p>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg font-bold font-mono-nums neon-glow-emerald">
            {occupancyPercent}% Cap.
          </span>
        </div>
        
        <div className="flex items-end justify-between my-2">
          <h2 className="text-3xl font-black font-mono-nums text-white tracking-tight">
            {occupiedTables}<span className="text-zinc-500 text-lg font-normal">/{totalTables}</span>
          </h2>
          <div className="text-right text-[11px] text-zinc-400 font-medium">
            <span className="text-emerald-400 font-bold">{freeTables} libres</span>
            {billingTables > 0 && <span className="text-rose-400 ml-1.5 font-bold">• {billingTables} cobro</span>}
          </div>
        </div>

        <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-1 overflow-hidden border border-white/5">
          <div 
            className={`h-full rounded-full transition-all ${occupancyPercent > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
      </div>

      {/* KPI 2: Tiempo de Espera (Bento 3-col) */}
      <div className="lg:col-span-3 glass-card rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Tiempo Promedio</p>
          {delayedTables > 0 ? (
            <span className="text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg font-bold font-mono-nums flex items-center gap-1 neon-glow-rose">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
              {delayedTables} demoradas
            </span>
          ) : (
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-bold font-mono-nums flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Óptimo
            </span>
          )}
        </div>

        <div className="flex items-end justify-between my-2">
          <h2 className="text-3xl font-black font-mono-nums text-white tracking-tight">
            {avgDeliveryMinutes}<span className="text-zinc-500 text-lg font-normal">min</span>
          </h2>
          <span className="text-[11px] text-zinc-400 font-mono-nums">Meta: &lt;14m</span>
        </div>

        {/* Multi-segment mini progress bar */}
        <div className="flex space-x-1 mt-1">
          <div className="h-1 flex-grow bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]"></div>
          <div className="h-1 flex-grow bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]"></div>
          <div className="h-1 flex-grow bg-amber-400 rounded-full"></div>
          <div className="h-1 flex-grow bg-zinc-800 rounded-full"></div>
        </div>
      </div>

      {/* KPI 3: Venta del Turno con Medidor Circular (Bento 4-col) */}
      <div className="lg:col-span-4 glass-card rounded-2xl p-4 flex items-center justify-between hover:border-white/20 transition-all">
        <div>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Venta del Turno</p>
          <h2 className="text-2xl sm:text-3xl font-black font-mono-nums text-white mt-1 tracking-tight">
            ${totalPeriodSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-[11px] text-emerald-400 font-mono-nums mt-0.5 flex items-center gap-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> +{periodSalesGrowth}% vs promedio
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase font-semibold">Objetivo</p>
            <p className="text-xs sm:text-sm font-bold font-mono-nums text-zinc-200">${targetSales.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <span className="text-[10px] font-black font-mono-nums text-white">{targetProgress}%</span>
          </div>
        </div>
      </div>

      {/* KPI 4: KDS & Ticket Rápido (Bento 2-col) */}
      <div className="lg:col-span-2 glass-card rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cocina KDS</p>
          <ChefHat className="w-4 h-4 text-amber-400" />
        </div>

        <div className="my-2">
          <h2 className="text-2xl font-black font-mono-nums text-white">
            {kitchenActiveTicketsCount} <span className="text-xs text-zinc-500 font-normal">comandas</span>
          </h2>
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-white/5">
          <span>Ticket Promedio</span>
          <span className="font-mono-nums font-bold text-emerald-400">${avgTicketAmount.toFixed(0)}</span>
        </div>
      </div>

    </section>
  );
};
