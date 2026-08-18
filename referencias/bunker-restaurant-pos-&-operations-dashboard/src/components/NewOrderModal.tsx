import React, { useState } from 'react';
import { X, Users, Utensils, UserCheck, Plus, Check } from 'lucide-react';
import { TableItem, OrderItem } from '../types';
import { STAFF_MEMBERS, MENU_CATALOG } from '../data/restaurantData';

interface NewOrderModalProps {
  tables: TableItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tableId: string, guestsCount: number, waiterId: string, waiterName: string, initialItems: OrderItem[]) => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  tables,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>(STAFF_MEMBERS[0].id);
  const [selectedItems, setSelectedItems] = useState<{ id: string; quantity: number }[]>([]);

  if (!isOpen) return null;

  const availableTables = tables.filter(t => t.status === 'free' || t.status === 'cleaning');
  const targetTable = tables.find(t => t.id === selectedTableId) || availableTables[0];

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.filter(i => i.id !== itemId);
      } else {
        return [...prev, { id: itemId, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.id === itemId) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tableId = selectedTableId || availableTables[0]?.id;
    if (!tableId) return;

    const waiter = STAFF_MEMBERS.find(s => s.id === selectedWaiterId) || STAFF_MEMBERS[0];

    const orderItems: OrderItem[] = selectedItems.map(si => {
      const itemDef = MENU_CATALOG.find(m => m.id === si.id)!;
      return {
        id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: itemDef.name,
        category: itemDef.category,
        price: itemDef.price,
        quantity: si.quantity,
        status: 'cooking',
        cookedBy: itemDef.category === 'bebida' ? 'Barra Bunker' : 'Chef Bruno',
        minutesElapsed: 1,
      };
    });

    onSubmit(tableId, guestsCount, waiter.id, waiter.name, orderItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-800 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Abrir Nueva Comanda / Sentar Mesa</h3>
              <p className="text-xs text-zinc-400">Asigna comensales, mozo y platos iniciales</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Table Selection */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1.5">Seleccionar Mesa Disponible:</label>
            {availableTables.length === 0 ? (
              <p className="text-rose-400 italic">No hay mesas libres en este momento.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTables.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`p-2.5 rounded-xl border text-center font-mono-nums transition-all ${
                      (selectedTableId === t.id || (!selectedTableId && t.id === availableTables[0].id))
                        ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-md'
                        : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-sm block">M#{t.number}</span>
                    <span className="text-[10px] opacity-80">{t.capacity} pers.</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guests and Waiter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Comensales Sentados:</label>
              <input
                type="number"
                min="1"
                max={targetTable?.capacity || 10}
                value={guestsCount}
                onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono-nums font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Mozo Asignado:</label>
              <select
                value={selectedWaiterId}
                onChange={(e) => setSelectedWaiterId(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                {STAFF_MEMBERS.filter(s => s.role === 'waiter').map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.zone})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick item selection from menu */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1.5">Platos o Tragos Iniciales (Opcional):</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {MENU_CATALOG.slice(0, 8).map((m) => {
                const isSelected = selectedItems.some(i => i.id === m.id);
                const quantity = selectedItems.find(i => i.id === m.id)?.quantity || 1;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleItem(m.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                        isSelected ? 'bg-emerald-500 text-black font-bold' : 'border border-zinc-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </span>
                      <span className="font-medium text-zinc-200">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono-nums font-bold text-emerald-400">${m.price.toFixed(2)}</span>
                      {isSelected && (
                        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg px-2 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(m.id, -1)}
                            className="text-zinc-400 hover:text-white"
                          >-</button>
                          <span className="font-mono-nums font-bold text-emerald-300 px-1">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(m.id, 1)}
                            className="text-zinc-400 hover:text-white"
                          >+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={availableTables.length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold shadow-lg shadow-emerald-500/20 transition-all"
            >
              Abrir Comanda
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
