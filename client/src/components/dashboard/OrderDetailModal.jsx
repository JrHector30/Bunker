import React from 'react';
import {
  X,
  User,
  Clock,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] dark:bg-black/65"
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
          <button
            type="button"
            aria-label="Cerrar detalle de pedido"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
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
            <dd className="font-medium text-slate-800 dark:text-slate-200">
              {order.customer}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Ubicación</span>
            </dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">
              {order.tableOrChannel}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Fecha y Hora</span>
            </dt>
            <dd className="font-medium text-slate-800 tabular-nums dark:text-slate-200">
              {order.dateTime}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <UtensilsCrossed className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span>Cantidad · Total</span>
            </dt>
            <dd className="font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {order.quantity} unid. ·{' '}
              {formatCurrencyAmount(
                currency === 'PEN' ? order.totalPen : order.totalUsd,
                currency
              )}
            </dd>
          </div>
        </dl>

        {/* Items breakdown if present */}
        {order.items && order.items.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-[#F8F9FA] p-3 text-xs dark:border-slate-800 dark:bg-[#1A2232]">
            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Detalle de platos:
            </p>
            <ul className="space-y-1.5">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>
                    <strong className="text-slate-900 dark:text-slate-100">{item.cantidad}x</strong> {item.nombre}
                    {item.observacion ? ` (${item.observacion})` : ''}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                    S/ {((item.precio || 0) * (item.cantidad || 1)).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {order.notes && (
          <div className="mt-3 rounded-xl bg-[#F8F9FA] p-3 text-xs text-slate-600 dark:bg-[#1A2232] dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Notas de cocina:{' '}
            </span>
            {order.notes}
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Actualizar estado de comanda (Sincronizado con Cocina)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((statusOption) => {
              const isCurrent = order.status === statusOption;
              return (
                <button
                  key={statusOption}
                  type="button"
                  onClick={() => onUpdateStatus?.(order, statusOption)}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    isCurrent
                      ? 'border-[#F26522] bg-[#FFF1EB] text-[#F26522] dark:bg-[#F26522]/15 dark:text-[#FF7A3D]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1A2232] dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {statusOption}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
