import React, { useState } from 'react';
import { 
  X, 
  CreditCard, 
  Printer, 
  Clock, 
  UserCheck, 
  Receipt, 
  CheckCircle, 
  Sparkles, 
  Utensils, 
  Wine, 
  Flame, 
  Share2, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { TableItem, TableStatus } from '../types';
import { playPosChime } from '../utils/audio';

interface TablePopoverLiveProps {
  table: TableItem;
  onClose: () => void;
  onConfirmPayment: (tableId: string) => void;
  onOpenFullModal: (table: TableItem) => void;
  onTriggerBill?: (tableId: string) => void;
}

export const TablePopoverLive: React.FC<TablePopoverLiveProps> = ({
  table,
  onClose,
  onConfirmPayment,
  onOpenFullModal,
  onTriggerBill
}) => {
  const [isPaymentSuccess, setIsPaymentSuccess] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [splitCount, setSplitCount] = useState<number>(1);
  const [showSplit, setShowSplit] = useState<boolean>(false);

  const totalAmount = table.activeOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
  const taxAmount = totalAmount * 0.10;
  const tipAmount = totalAmount * 0.10;

  const handlePay = () => {
    setIsPaymentSuccess(true);
    playPosChime('cash');
  };

  const handleFinalize = () => {
    onConfirmPayment(table.id);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'principal':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'bebida':
        return <Wine className="w-3.5 h-3.5 text-cyan-400" />;
      case 'postre':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Utensils className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div 
      id={`table-floating-live-popover-${table.number}`}
      className="absolute top-3 right-3 bottom-3 w-[340px] sm:w-[380px] z-40 flex flex-col glass-popover rounded-2xl border border-white/15 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 shadow-2xl"
    >
      {/* Decorative top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />

      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-start justify-between gap-2 bg-white/[0.02]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono-nums font-black text-xs border border-emerald-500/30 neon-glow-emerald">
              M#{table.number < 10 ? `0${table.number}` : table.number}
            </span>
            <h4 className="font-extrabold text-white text-sm tracking-tight truncate max-w-[180px]">
              {table.name}
            </h4>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
            <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px]">
              {table.status === 'billing' ? 'En Cobro' : table.status === 'occupied' ? 'Ocupada' : 'Activa'}
            </span>
            <span>•</span>
            <span className="font-mono-nums">{table.guestsCount} comensales</span>
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenFullModal(table)}
            title="Expandir a pantalla completa"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all text-xs"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Cerrar popover"
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body with scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        
        {/* Waiter & Session Meta Card */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img 
                src={table.waiterAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} 
                alt={table.waiterName || "Mozo"} 
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black flex items-center justify-center">
                <CheckCircle className="w-2.5 h-2.5 text-black" />
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block font-medium">Mozo Asignado</span>
              <span className="text-xs font-bold text-zinc-100 flex items-center gap-1">
                {table.waiterName || 'Lucas Vega'}
                <span className="text-[10px] text-amber-400">★ 4.9</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-zinc-400 font-medium flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Tiempo de estadía</span>
            </div>
            <div className="font-mono-nums font-black text-amber-300 text-xs mt-0.5">
              {table.seatedMinutes ? `${Math.floor(table.seatedMinutes / 60)}h ${table.seatedMinutes % 60}m` : '1h 24m'}
            </div>
            <div className="text-[9px] text-zinc-500">
              Inicio: {table.seatedAt || '12:10'}
            </div>
          </div>
        </div>

        {/* Order Breakdown list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-zinc-200 text-xs flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              Desglose de Comanda ({table.activeOrders.length} ítems)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono-nums font-semibold">
              Mesa M#{table.number}
            </span>
          </div>

          <div className="space-y-2">
            {table.activeOrders.map((item) => (
              <div 
                key={item.id}
                className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center justify-between transition-colors"
              >
                <div className="flex items-start gap-2 max-w-[70%]">
                  <div className="mt-0.5 p-1 rounded-md bg-white/[0.04]">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-100 text-xs leading-tight">
                      <span className="text-emerald-400 font-mono-nums font-bold mr-1">
                        {item.quantity}x
                      </span>
                      {item.name}
                    </div>
                    {item.notes && (
                      <div className="text-[10px] text-zinc-400 mt-0.5 italic truncate">
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono-nums font-bold text-white text-xs">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono-nums">
                    ${item.price.toFixed(2)} c/u
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subtotals and Totals Financial Breakdown */}
        <div className="p-3 rounded-xl bg-black/70 border border-white/10 space-y-1.5">
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Subtotal Consumo</span>
            <span className="font-mono-nums font-semibold text-zinc-300">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>IVA discriminado (10%)</span>
            <span className="font-mono-nums text-zinc-400">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[11px] text-zinc-400">
            <span>Propina sugerida (10%)</span>
            <span className="font-mono-nums text-zinc-400">${tipAmount.toFixed(2)}</span>
          </div>
          
          <div className="pt-2 mt-1 border-t border-white/10 flex items-baseline justify-between">
            <div>
              <span className="font-black text-white text-xs block">TOTAL A COBRAR</span>
              <span className="text-[9px] text-emerald-400 font-medium">Comprobante Fiscal POS</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono-nums font-black text-emerald-400 neon-text-emerald">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Split Bill Calculator Optional */}
        {showSplit && (
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2 animate-in fade-in duration-200">
            <span className="font-bold text-zinc-200 block text-[11px]">Dividir cuenta entre personas:</span>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSplitCount(n)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${
                    splitCount === n
                      ? 'bg-emerald-500 text-black border-emerald-400'
                      : 'bg-black text-zinc-300 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {n}p
                </button>
              ))}
            </div>
            <div className="text-center font-mono-nums font-bold text-emerald-400 text-xs pt-1">
              ${(totalAmount / splitCount).toFixed(2)} por persona
            </div>
          </div>
        )}

      </div>

      {/* Footer Actions / Highlighted Green Payment Button */}
      <div className="p-4 bg-zinc-950/90 border-t border-white/10 space-y-2">
        
        {isPaymentSuccess ? (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-center space-y-2 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-1.5 text-emerald-300 font-bold text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>¡Pago Aprobado y Registrado!</span>
            </div>
            <p className="text-[10px] text-zinc-300">
              Comprobante fiscal emitido con éxito.
            </p>
            <button
              onClick={handleFinalize}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Liberar Mesa para Sanitización</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Primary Requested Highlighted Button */}
            <button
              id="btn-confirm-payment-popover"
              onClick={handlePay}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Confirmar Pago / Emitir Comprobante</span>
            </button>

            {/* Quick Secondary Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSplit(!showSplit)}
                className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <span>Dividir Cuenta</span>
              </button>
              <button
                onClick={() => {
                  if (onTriggerBill) onTriggerBill(table.id);
                  setIsPrinting(true);
                  setTimeout(() => setIsPrinting(false), 1500);
                }}
                className="py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isPrinting ? 'Imprimiendo...' : 'Pre-Cuenta'}</span>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
