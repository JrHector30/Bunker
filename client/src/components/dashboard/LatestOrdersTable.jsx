import React, { useMemo, useState } from 'react';

const FILTER_OPTIONS = ['Todos', 'Pendiente', 'En Proceso', 'Listo'];

const STATUS_BADGE_MAP = {
  Listo: 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#22C55E]/15 dark:text-[#4ADE80]',
  'En Proceso': 'bg-[#DBEAFE] text-[#1D4ED8] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]',
  Pendiente: 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#F59E0B]/15 dark:text-[#FBBF24]',
};

export const LatestOrdersTable = ({ orders = [], onSelectOrder }) => {
  const [statusFilter, setStatusFilter] = useState('Todos');

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'Todos') return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  return (
    <section
      aria-label="Últimos Pedidos"
      className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800/90 dark:bg-[#131A26]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Últimos Pedidos
        </h2>

        {/* Segmented status filter */}
        <div
          role="tablist"
          aria-label="Filtrar pedidos por estado"
          className="flex flex-wrap items-center gap-1 rounded-xl bg-[#F8F9FA] p-0.5 dark:bg-[#1A2232]"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = statusFilter === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setStatusFilter(option)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/40 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-[#253045] dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left">
          <thead>
            <tr className="bg-[#F8F9FA] text-[11px] font-medium text-slate-500 dark:bg-[#1A2232] dark:text-slate-400">
              <th className="rounded-l-lg px-3 py-2 font-medium whitespace-nowrap">
                ID Pedido
              </th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">Mozo</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">
                Fecha y Hora
              </th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">
                Pedido
              </th>
              <th className="px-3 py-2 text-center font-medium whitespace-nowrap">
                Cant.
              </th>
              <th className="rounded-r-lg px-3 py-2 text-center font-medium whitespace-nowrap">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800/80">
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-slate-400 dark:text-slate-500"
                >
                  No hay pedidos registrados con el estado &ldquo;{statusFilter}&rdquo;.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, idx) => {
                const isLeadOrder = idx === 0;
                return (
                  <tr
                    key={order.id || idx}
                    onClick={() => onSelectOrder?.(order)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectOrder?.(order);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-slate-50/90 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/45 dark:focus-visible:bg-slate-800/60"
                  >
                    <td
                      className={`px-3 py-2.5 font-semibold tabular-nums whitespace-nowrap ${
                        isLeadOrder
                          ? 'text-[#F26522] dark:text-[#FF7A3D]'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {order.id}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap dark:text-slate-200">
                      {order.waiter || 'Mozo'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 tabular-nums whitespace-nowrap dark:text-slate-400">
                      {order.dateTime}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap dark:text-slate-200">
                      {order.dish}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-slate-700 tabular-nums dark:text-slate-300">
                      {order.quantity}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${
                          STATUS_BADGE_MAP[order.status] || STATUS_BADGE_MAP.Pendiente
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
