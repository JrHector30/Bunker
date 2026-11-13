import React, { useMemo, useState } from 'react';
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
} from 'lucide-react';

const FILTER_OPTIONS = ['Todos', 'Pendiente', 'En Proceso', 'Listo'];
const ITEMS_PER_PAGE = 5;

const STATUS_BADGE_MAP = {
  Listo: 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#22C55E]/15 dark:text-[#4ADE80]',
  'En Proceso': 'bg-[#DBEAFE] text-[#1D4ED8] dark:bg-[#3B82F6]/15 dark:text-[#60A5FA]',
  Pendiente: 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#F59E0B]/15 dark:text-[#FBBF24]',
};

export const LatestOrdersTable = ({ orders = [], onSelectOrder }) => {
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'Todos') return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const handleFilterChange = (option) => {
    setStatusFilter(option);
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <section
      aria-label="Últimos Pedidos"
      className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4 dark:border-slate-800/90 dark:bg-[#131A26]"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Últimos Pedidos
          </h2>

          {/* Botones de Filtro por Estado - Estilo Pill SuperAdmin sin borde gris */}
          <div
            role="tablist"
            aria-label="Filtrar pedidos por estado"
            className="flex items-center gap-1.5 sm:gap-2 flex-wrap"
          >
            {FILTER_OPTIONS.map((option) => {
              const isActive = statusFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleFilterChange(option)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 active:scale-95 whitespace-nowrap select-none ${
                    isActive
                      ? 'font-bold shadow-md bg-zinc-950 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black'
                      : 'shadow-sm bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2.5 overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F8F9FA] text-[11px] font-medium text-slate-500 dark:bg-[#1A2232] dark:text-slate-400">
                <th className="rounded-l-lg px-3 py-1.5 font-medium whitespace-nowrap">
                  ID Pedido
                </th>
                <th className="px-3 py-1.5 font-medium whitespace-nowrap">Mozo</th>
                <th className="px-3 py-1.5 font-medium whitespace-nowrap">
                  Fecha y Hora
                </th>
                <th className="px-3 py-1.5 font-medium whitespace-nowrap">
                  Pedido
                </th>
                <th className="px-3 py-1.5 text-center font-medium whitespace-nowrap">
                  Cant.
                </th>
                <th className="rounded-r-lg px-3 py-1.5 text-center font-medium whitespace-nowrap">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800/80">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-xs text-slate-400 dark:text-slate-500"
                  >
                    No hay pedidos registrados con el estado &ldquo;{statusFilter}&rdquo;.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, idx) => {
                  const isLeadOrder = idx === 0 && currentPage === 1;
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
                        className={`px-3 py-2 font-semibold tabular-nums whitespace-nowrap ${
                          isLeadOrder
                            ? 'text-[#F26522] dark:text-[#FF7A3D]'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {order.id}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap dark:text-slate-200">
                        {order.waiter || 'Mozo'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 tabular-nums whitespace-nowrap dark:text-slate-400">
                        {order.dateTime}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap dark:text-slate-200">
                        {order.dish}
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-slate-700 tabular-nums dark:text-slate-300">
                        {order.quantity}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
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
      </div>

      {/* Pagination JSX (aligned with Arqueo de Caja) */}
      <div className="mt-2.5 pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-sans border-t border-slate-100 dark:border-slate-800">
        <span className="font-medium text-[11px] text-slate-500 dark:text-slate-400 select-none">
          Total de Pedidos: {filteredOrders.length}
        </span>
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="Ir al inicio"
            aria-label="Primera página"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
          >
            <ChevronFirst className="w-3.5 h-3.5 text-[var(--text-main)]" />
          </button>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            title="Página anterior"
            aria-label="Página anterior"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-main)]" />
          </button>
          <span className="font-semibold text-[var(--text-main)] px-2 select-none whitespace-nowrap text-xs">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            title="Página siguiente"
            aria-label="Página siguiente"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-main)]" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Ir al final"
            aria-label="Última página"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
          >
            <ChevronLast className="w-3.5 h-3.5 text-[var(--text-main)]" />
          </button>
        </div>
        <div className="hidden sm:block sm:w-20" />
      </div>
    </section>
  );
};
