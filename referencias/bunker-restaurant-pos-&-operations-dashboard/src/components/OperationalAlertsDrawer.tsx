import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle2, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { OperationalAlert } from '../types';

interface OperationalAlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: OperationalAlert[];
  onActionClick: (alert: OperationalAlert) => void;
  onDismissAlert: (id: string) => void;
}

export const OperationalAlertsDrawer: React.FC<OperationalAlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onActionClick,
  onDismissAlert,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-md h-full flex flex-col shadow-2xl p-5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Notificaciones & Alertas</h3>
              <p className="text-xs text-zinc-400">Eventos críticos de mesas, cocina KDS y cobro</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40 mb-2" />
              <span>Sin alertas pendientes. Todas las mesas y partidas están operando con normalidad.</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 text-xs transition-all ${
                  alert.type === 'urgent'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                    : alert.type === 'ready'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                    : 'bg-black border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5">
                      {alert.type === 'urgent' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                      ) : alert.type === 'ready' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400" />
                      )}
                    </span>
                    <div>
                      <span className="font-bold text-white block">{alert.title}</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-nums text-zinc-500 whitespace-nowrap">{alert.timestamp}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => onDismissAlert(alert.id)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  >
                    Descartar
                  </button>

                  {alert.actionText && (
                    <button
                      onClick={() => onActionClick(alert)}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span>{alert.actionText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 transition-colors"
          >
            Cerrar Panel
          </button>
        </div>

      </div>
    </div>
  );
};
