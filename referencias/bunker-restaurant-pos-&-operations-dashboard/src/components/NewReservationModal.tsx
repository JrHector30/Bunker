import React, { useState } from 'react';
import { X, CalendarDays, Clock, Users, Check } from 'lucide-react';
import { TableItem } from '../types';

interface NewReservationModalProps {
  tables: TableItem[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tableId: string, clientName: string, time: string, guestsCount: number, notes?: string) => void;
}

export const NewReservationModal: React.FC<NewReservationModalProps> = ({
  tables,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || '');
  const [clientName, setClientName] = useState<string>('');
  const [time, setTime] = useState<string>('21:00');
  const [guestsCount, setGuestsCount] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    const tableId = selectedTableId || tables[0]?.id;
    onSubmit(tableId, clientName, time, guestsCount, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-md flex flex-col overflow-hidden border border-zinc-800 shadow-2xl">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Nueva Reserva de Mesa</h3>
              <p className="text-xs text-zinc-400">Programa reservas anticipadas para la sala</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Nombre del Cliente / Titular:</label>
            <input
              type="text"
              required
              placeholder="Ej: Lic. Marcelo Rossi"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder:text-zinc-600 font-medium focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Hora de Llegada:</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono-nums font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Comensales:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={guestsCount}
                onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono-nums font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Mesa a Asignar:</label>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-cyan-500"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  Mesa #{t.number} — {t.name} (Capacidad: {t.capacity}p, {t.zone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-300 mb-1">Notas Especiales / Preferencias:</label>
            <input
              type="text"
              placeholder="Ej: Aniversario, mesa tranquila, intolerancia al gluten"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

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
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20 transition-all"
            >
              Confirmar Reserva
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
