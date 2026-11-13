import React from 'react';
import {
  User,
  Clock,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import { formatCurrencyAmount } from './dashboardData';

const STATUS_OPTIONS = ['Pendiente', 'En Proceso', 'Listo'];

export const OrderDetailModal = ({
  order,
  currency = 'PEN',
  onClose,
  onUpdateStatus,
}) => {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] dark:bg-black/65 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#131A26]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#FFF1EB] px-2 py-0.5 text-xs font-bold text-[#F26522] dark:bg-[#F26522]/15 dark:text-[#FF7A3D]">
                {order.id}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {order.status}
              </span>
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
              {order.dish}
            </h3>
          </div>
          <CloseButton onClick={onClose} className="scale-90 shrink-0" />
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Mozo</span>
            </dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">
              {order.waiter}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Cliente / Referencia</span>
            </dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">
              {order.customer}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Mesa / Canal</span>
            </dt>
            <dd className="font-semibold text-slate-900 dark:text-slate-100">
              {order.tableOrChannel}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Fecha y Hora</span>
            </dt>
            <dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {order.dateTime}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <UtensilsCrossed className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Cantidad</span>
            </dt>
            <dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {order.quantity} {order.quantity === 1 ? 'unidad' : 'unidades'}
            </dd>
          </div>
          {order.notes && (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">
                <span>Nota</span>
              </dt>
              <dd className="text-right italic text-slate-700 dark:text-slate-300">
                "{order.notes}"
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <dt className="font-semibold text-slate-900 dark:text-slate-100">
              Total
            </dt>
            <dd className="text-base font-bold text-[#F26522] tabular-nums dark:text-[#FF7A3D]">
              {formatCurrencyAmount(
                currency === 'PEN' ? order.totalPen : order.totalUsd,
                currency
              )}
            </dd>
          </div>
        </dl>

        {/* Change status section */}
        {onUpdateStatus && (
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Actualizar Estado en Cocina
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((st) => {
                const isCurrent = order.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => onUpdateStatus(order, st)}
                    className={`rounded-xl px-2 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--primary)] text-white shadow-sm ring-2 ring-[var(--primary)]/30'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
