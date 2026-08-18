import React from 'react';
import { 
  Flame, 
  UtensilsCrossed, 
  Clock, 
  Bell, 
  Sparkles, 
  Plus, 
  CalendarDays, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Zap,
  TrendingUp
} from 'lucide-react';
import { TableItem, OperationalAlert } from '../types';

interface HeaderNavProps {
  tables: TableItem[];
  alerts: OperationalAlert[];
  onOpenNewOrder: () => void;
  onOpenNewReservation: () => void;
  onSimulateEvent: () => void;
  onResetData: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  activeZoneTab: string;
  onSelectZone: (zone: any) => void;
  onOpenAlerts: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  tables,
  alerts,
  onOpenNewOrder,
  onOpenNewReservation,
  onSimulateEvent,
  onResetData,
  soundEnabled,
  onToggleSound,
  onOpenAlerts,
}) => {
  const [currentTime, setCurrentTime] = React.useState<string>('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const occupiedCount = tables.filter(t => t.status === 'occupied' || t.status === 'billing').length;
  const occupancyPercent = Math.round((occupiedCount / tables.length) * 100);
  const urgentAlertsCount = alerts.filter(a => a.type === 'urgent' || a.type === 'ready').length;

  return (
    <header id="bunker-header-nav" className="bg-[#0a0a0a] border-b border-zinc-800 sticky top-0 z-40 px-4 lg:px-6 py-3.5">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Live status */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-black shadow-[0_0_12px_rgba(52,211,153,0.3)]">
              B
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                BUNKER <span className="text-zinc-500 font-normal">| RESTO OPS</span>
              </h1>
              <p className="text-[11px] text-zinc-500 hidden sm:block">Control de Salón & Facturación en Vivo</p>
            </div>
          </div>

          {/* System status & time */}
          <div className="flex items-center space-x-4 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Estado del Sistema</p>
              <p className="text-xs font-medium text-emerald-400 italic">Operativo • {currentTime || '19:42 PM'}</p>
            </div>
            <div className="sm:hidden flex items-center gap-1.5 text-emerald-400 font-mono-nums text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{currentTime || '19:42'}</span>
            </div>
          </div>
        </div>

        {/* Global Live Occupancy & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0">
          
          {/* Occupancy chip */}
          <div className="hidden lg:flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Ocupación:</div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${occupancyPercent > 80 ? 'bg-rose-500' : occupancyPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${occupancyPercent}%` }}
                />
              </div>
              <span className="font-mono-nums text-xs font-bold text-white">{occupancyPercent}%</span>
            </div>
          </div>

          {/* Sound alert toggle */}
          <button
            id="btn-toggle-sound"
            onClick={onToggleSound}
            title={soundEnabled ? "Silenciar alertas" : "Activar sonido de comandas"}
            className={`p-2 rounded-xl border text-xs transition-colors ${
              soundEnabled 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Live Alerts Bell */}
          <button
            id="btn-open-alerts"
            onClick={onOpenAlerts}
            className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
            title="Ver alertas en vivo"
          >
            <Bell className="w-4 h-4" />
            {urgentAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-black font-mono-nums font-extrabold text-[10px] rounded-full flex items-center justify-center animate-bounce">
                {urgentAlertsCount}
              </span>
            )}
          </button>

          {/* Quick Simulation Trigger */}
          <button
            id="btn-simulate-event"
            onClick={onSimulateEvent}
            title="Simular nuevo pedido o comanda en tiempo real"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-emerald-400 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="hidden sm:inline">Simular Evento</span>
            <span className="sm:hidden">Simular</span>
          </button>

          {/* Reset button */}
          <button
            id="btn-reset-data"
            onClick={onResetData}
            title="Restablecer datos originales de demostración"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Primary Action: Nueva Comanda / Asignar */}
          <button
            id="btn-new-order-modal"
            onClick={onOpenNewOrder}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-[0_0_15px_rgba(52,211,153,0.3)] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Comanda</span>
          </button>

          {/* Secondary Action: Nueva Reserva */}
          <button
            id="btn-new-reservation-modal"
            onClick={onOpenNewReservation}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-xs transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
            <span>+ Reserva</span>
          </button>

        </div>
      </div>
    </header>
  );
};
