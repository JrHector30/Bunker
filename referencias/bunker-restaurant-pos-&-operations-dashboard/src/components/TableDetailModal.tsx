import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Clock, 
  UserCheck, 
  Plus, 
  DollarSign, 
  ChefHat, 
  Printer, 
  CreditCard, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle,
  ArrowRight,
  Receipt,
  MessageSquare
} from 'lucide-react';
import { TableItem, TableStatus, OrderItem } from '../types';
import { STAFF_MEMBERS, MENU_CATALOG } from '../data/restaurantData';

interface TableDetailModalProps {
  table: TableItem | null;
  onClose: () => void;
  onUpdateTableStatus: (tableId: string, status: TableStatus) => void;
  onAssignWaiter: (tableId: string, waiterId: string, waiterName: string) => void;
  onAddOrderItem: (tableId: string, item: OrderItem) => void;
  onRemoveOrderItem: (tableId: string, orderId: string) => void;
  onTriggerBill: (tableId: string) => void;
  onFreeTable: (tableId: string) => void;
}

export const TableDetailModal: React.FC<TableDetailModalProps> = ({
  table,
  onClose,
  onUpdateTableStatus,
  onAssignWaiter,
  onAddOrderItem,
  onRemoveOrderItem,
  onTriggerBill,
  onFreeTable,
}) => {
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'orders' | 'details' | 'billing'>('orders');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  if (!table) return null;

  const totalAmount = table.activeOrders.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = totalAmount * 0.10;
  const tip10 = totalAmount * 0.10;
  const grandTotal = totalAmount + tax;

  const handleAddDish = () => {
    if (!selectedMenuItemId) return;
    const menuItem = MENU_CATALOG.find(m => m.id === selectedMenuItemId);
    if (!menuItem) return;

    const newOrder: OrderItem = {
      id: `ord-${Date.now()}`,
      name: menuItem.name,
      category: menuItem.category,
      price: menuItem.price,
      quantity: itemQuantity,
      status: 'cooking',
      cookedBy: menuItem.category === 'bebida' ? 'Barra Bunker' : 'Chef Bruno',
      minutesElapsed: 1,
    };

    onAddOrderItem(table.id, newOrder);
    setSelectedMenuItemId('');
    setItemQuantity(1);
    showNotice(`¡${menuItem.name} enviado a comandera!`);
  };

  const showNotice = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'free': return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-bold">🟢 Disponible / Libre</span>;
      case 'occupied': return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-bold">🟡 Mesa Ocupada</span>;
      case 'billing': return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">🔴 Cuenta Solicitada</span>;
      case 'reserved': return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-full text-xs font-bold">🔵 Reservada</span>;
      case 'cleaning': return <span className="bg-slate-700/40 text-slate-300 border border-slate-600 px-2.5 py-1 rounded-full text-xs font-bold">⚪ En Limpieza</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div 
        id="table-detail-modal-container"
        className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-zinc-800 shadow-2xl shadow-black"
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-xl font-mono-nums">
              #{table.number < 10 ? `0${table.number}` : table.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{table.name}</h3>
                {getStatusBadge(table.status)}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono-nums">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  Capacidad: <b className="text-zinc-200">{table.capacity} personas</b>
                </span>
                <span className="text-zinc-700">•</span>
                <span className="capitalize text-zinc-300">Zona: {table.zone.replace('_', ' ')}</span>
              </div>
            </div>
          </div>

          <button
            id="close-table-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Notice Toast */}
        {notificationMsg && (
          <div className="bg-emerald-500/20 border-y border-emerald-500/40 text-emerald-300 text-xs px-4 py-2 flex items-center gap-2 animate-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 pt-3 bg-black/40 border-b border-zinc-800 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'orders'
                ? 'text-emerald-400 border-emerald-400 font-bold'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Comanda Activa ({table.activeOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'billing'
                ? 'text-emerald-400 border-emerald-400 font-bold'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Cuenta & Facturación (${totalAmount.toFixed(2)})</span>
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'details'
                ? 'text-emerald-400 border-emerald-400 font-bold'
                : 'text-zinc-500 border-transparent hover:text-zinc-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Asignación de Personal</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {activeTab === 'orders' && (
            <div className="space-y-4">
              
              {/* Seated Info & Waiter */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-black/60 border border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Mozo a Cargo:</span>
                  <span className="font-bold text-zinc-200 flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {table.waiterName || 'Sin asignar'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Tiempo en Mesa:</span>
                  <span className="font-mono-nums font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {table.seatedMinutes ? `${table.seatedMinutes} min transcurridos` : 'Mesa libre'}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 block text-[11px]">Comensales Sentados:</span>
                  <span className="font-bold text-zinc-200 flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    {table.guestsCount} personas
                  </span>
                </div>
              </div>

              {/* Order Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Platos & Bebidas en Comanda</span>
                  <span className="text-xs font-mono-nums text-emerald-400 font-semibold">Subtotal: ${totalAmount.toFixed(2)}</span>
                </div>

                {table.activeOrders.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-black/40 border border-dashed border-zinc-800 text-zinc-500 text-xs">
                    No hay platos activos en esta mesa. Añade un ítem abajo para abrir la comanda.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {table.activeOrders.map((ord) => (
                      <div 
                        key={ord.id}
                        className="p-2.5 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between gap-3 text-xs hover:border-zinc-700 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-zinc-800 text-emerald-400 font-mono-nums font-bold flex items-center justify-center text-xs">
                            {ord.quantity}x
                          </span>
                          <div>
                            <span className="font-semibold text-zinc-200 block">{ord.name}</span>
                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                              {ord.cookedBy ? `Cocinado por: ${ord.cookedBy}` : 'Barra de Tragos'}
                              <span>•</span>
                              <span>{ord.minutesElapsed}m atrás</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                            ord.status === 'served'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : ord.status === 'ready'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {ord.status === 'served' ? 'Servido' : ord.status === 'ready' ? 'Listo p/ Servir' : 'En Cocina'}
                          </span>

                          <span className="font-mono-nums font-bold text-white w-16 text-right">
                            ${(ord.price * ord.quantity).toFixed(2)}
                          </span>

                          <button
                            onClick={() => onRemoveOrderItem(table.id, ord.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Eliminar plato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add dish selector */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 space-y-2">
                <span className="text-xs font-semibold text-zinc-300 block">+ Agregar Producto a la Comanda:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(e.target.value)}
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Seleccionar de la carta Bunker...</option>
                    {MENU_CATALOG.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — ${m.price.toFixed(2)} ({m.category})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                    className="w-14 bg-black border border-zinc-800 rounded-xl px-2 py-2 text-xs text-center text-zinc-200 font-mono-nums"
                  />

                  <button
                    onClick={handleAddDish}
                    disabled={!selectedMenuItemId}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              
              {/* Receipt Preview */}
              <div className="p-4 rounded-xl bg-black border border-zinc-800 font-mono-nums text-xs space-y-2">
                <div className="text-center border-b border-dashed border-zinc-800 pb-2">
                  <h4 className="font-bold text-sm text-white tracking-wider">BUNKER RESTAURANT</h4>
                  <p className="text-[10px] text-zinc-500">Av. Gastronómica 1040 | Comanda #{table.number}</p>
                  <p className="text-[10px] text-zinc-500">Mozo: {table.waiterName || 'Staff'}</p>
                </div>

                <div className="space-y-1.5 py-2 border-b border-dashed border-zinc-800 max-h-40 overflow-y-auto">
                  {table.activeOrders.map((ord) => (
                    <div key={ord.id} className="flex justify-between text-[11px] text-zinc-300">
                      <span>{ord.quantity}x {ord.name}</span>
                      <span>${(ord.price * ord.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 pt-1 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal:</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>IVA / Impuestos (10%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Propina Sugerida (10%):</span>
                    <span>+${tip10.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-zinc-800">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-emerald-400 text-base font-bold">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Billing Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onTriggerBill(table.id);
                    showNotice('¡Cuenta emitida y enviada a la mesa!');
                  }}
                  className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Imprimir Pre-Cuenta</span>
                </button>

                <button
                  onClick={() => {
                    onFreeTable(table.id);
                    showNotice('¡Mesa cobrada exitosamente y marcada para limpieza!');
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cobrar & Liberar Mesa</span>
                </button>
              </div>

            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4 text-xs">
              
              <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 space-y-3">
                <span className="font-bold text-zinc-200 block">Reasignar Mozo a Cargo:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STAFF_MEMBERS.filter(s => s.role === 'waiter').map((waiter) => (
                    <button
                      key={waiter.id}
                      onClick={() => {
                        onAssignWaiter(table.id, waiter.id, waiter.name);
                        showNotice(`Mozo asignado: ${waiter.name}`);
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        table.waiterId === waiter.id
                          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                          : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <img src={waiter.avatar} alt={waiter.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <span className="font-semibold block text-zinc-200">{waiter.name}</span>
                        <span className="text-[10px] text-zinc-500">{waiter.zone} • {waiter.avgSpeedMinutes}m avg</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Force status transitions */}
              <div className="p-3.5 rounded-xl bg-black/60 border border-zinc-800 space-y-2">
                <span className="font-bold text-zinc-200 block">Cambio Manual de Estado:</span>
                <div className="flex flex-wrap gap-2">
                  {(['free', 'occupied', 'reserved', 'billing', 'cleaning'] as TableStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateTableStatus(table.id, st)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        table.status === st
                          ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                          : 'bg-black border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {st === 'free' ? 'Libre' : st === 'occupied' ? 'Ocupada' : st === 'billing' ? 'Por Pagar' : st === 'reserved' ? 'Reservada' : 'En Limpieza'}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Quick Actions */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {table.notes ? <span>Nota: <b className="text-amber-400">{table.notes}</b></span> : <span>Sin incidencias registradas</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
