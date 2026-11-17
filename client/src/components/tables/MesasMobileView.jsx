import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  Lock,
  Unlock,
  RotateCw,
  Plus,
  Minus,
  Users,
  Receipt,
  Check,
  X,
  Unlink,
  UtensilsCrossed,
  Trash2,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'LIBRE', label: 'Libres' },
  { value: 'OCUPADA', label: 'Ocupadas' },
  { value: 'CUENTA', label: 'Cuenta' },
];

export const MesasMobileView = ({
  tables = [],
  onUpdateTables,
  dishes = [],
  onOpenOrder,
  onNotify = () => {},
}) => {
  const navigate = useNavigate();
  const [locked, setLocked] = useState(true);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [activeTableId, setActiveTableId] = useState(null);
  const [guestCountInput, setGuestCountInput] = useState(2);
  const [dishSearch, setDishSearch] = useState('');

  const activeTable = useMemo(
    () => tables.find((t) => t.id === activeTableId) ?? null,
    [tables, activeTableId]
  );

  const visibleTables = useMemo(() => {
    if (statusFilter === 'TODAS') return tables;
    return tables.filter((t) => t.estado === statusFilter);
  }, [tables, statusFilter]);

  const counts = useMemo(() => {
    let libres = 0;
    let ocupadas = 0;
    let cuenta = 0;
    for (const t of tables) {
      if (t.estado === 'LIBRE') libres += 1;
      else if (t.estado === 'OCUPADA') ocupadas += 1;
      else if (t.estado === 'CUENTA') cuenta += 1;
    }
    return { total: tables.length, libres, ocupadas, cuenta };
  }, [tables]);

  const activeDishes = useMemo(() => {
    const q = dishSearch.trim().toLowerCase();
    return dishes
      .filter((d) => d.estado === 'Activo')
      .filter((d) => (q ? d.nombre.toLowerCase().includes(q) : true))
      .slice(0, 10);
  }, [dishes, dishSearch]);

  const handleRefresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      onNotify('Estado del Salón Principal actualizado.');
    }, 450);
  };

  const handleToggleLock = () => {
    setLocked((prev) => {
      const next = !prev;
      if (!next) {
        setMergeMode(false);
        setMergeSelection([]);
        onNotify('Plano desbloqueado. Puedes ajustar sillas o agregar mesas.');
      } else {
        onNotify('Plano bloqueado.');
      }
      return next;
    });
  };

  const handleToggleMergeMode = () => {
    if (mergeMode) {
      setMergeMode(false);
      setMergeSelection([]);
    } else {
      setLocked(true);
      setMergeMode(true);
      setMergeSelection([]);
    }
  };

  const handleConfirmMerge = () => {
    if (mergeSelection.length < 2) {
      onNotify('Selecciona al menos 2 mesas para unir.');
      return;
    }
    const sorted = [...mergeSelection].sort((a, b) => a - b);
    const primary = sorted[0];
    const others = sorted.slice(1);

    onUpdateTables((prev) =>
      prev.map((t) => {
        if (t.numero === primary) {
          const existing = t.mergedWith ?? [];
          return {
            ...t,
            mergedWith: Array.from(new Set([...existing, ...others])).sort(
              (a, b) => a - b
            ),
          };
        }
        if (others.includes(t.numero)) {
          return {
            ...t,
            mergedWith: [primary],
          };
        }
        return t;
      })
    );

    setMergeMode(false);
    setMergeSelection([]);
    onNotify(`Mesas ${sorted.join(', ')} unidas correctamente.`);
  };

  const handleTableClick = (table) => {
    if (mergeMode) {
      setMergeSelection((prev) =>
        prev.includes(table.numero)
          ? prev.filter((n) => n !== table.numero)
          : [...prev, table.numero]
      );
      return;
    }

    setGuestCountInput(table.comensales > 0 ? table.comensales : table.capacidad);
    setDishSearch('');
    setActiveTableId(table.id);
  };

  const handleOpenTable = (table) => {
    setActiveTableId(null);
    if (onOpenOrder) {
      onOpenOrder(table.id, guestCountInput);
    } else {
      navigate(`/order/${table.id}`, { state: { comensales: guestCountInput } });
    }
  };

  const handleAddDishToTable = (tableId, dish) => {
    onUpdateTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const existing = t.pedidos.find((p) => p.dishId === dish.id);
        const nextPedidos = existing
          ? t.pedidos.map((p) =>
              p.dishId === dish.id ? { ...p, cantidad: p.cantidad + 1 } : p
            )
          : [
              ...t.pedidos,
              {
                dishId: dish.id,
                nombre: dish.nombre,
                precio: dish.precioVenta,
                cantidad: 1,
              },
            ];
        return {
          ...t,
          estado: t.estado === 'CERRADA' ? 'OCUPADA' : t.estado,
          comensales: t.comensales > 0 ? t.comensales : 2,
          pedidos: nextPedidos,
        };
      })
    );
  };

  const handleChangeOrderQty = (tableId, dishId, delta) => {
    onUpdateTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const nextPedidos = t.pedidos
          .map((p) =>
            p.dishId === dishId ? { ...p, cantidad: p.cantidad + delta } : p
          )
          .filter((p) => p.cantidad > 0);
        return { ...t, pedidos: nextPedidos };
      })
    );
  };

  const handleRequestBill = (table) => {
    onUpdateTables((prev) =>
      prev.map((t) => (t.id === table.id ? { ...t, estado: 'CUENTA' } : t))
    );
    onNotify(`Cuenta solicitada para Mesa ${table.numero}.`);
  };

  const handleCloseTable = (table) => {
    onUpdateTables((prev) =>
      prev.map((t) =>
        t.id === table.id
          ? {
              ...t,
              estado: 'CERRADA',
              comensales: 0,
              horaApertura: undefined,
              mesero: undefined,
              pedidos: [],
            }
          : t
      )
    );
    setActiveTableId(null);
    onNotify(`Mesa ${table.numero} cerrada y liberada.`);
  };

  const handleUnlinkTable = (table) => {
    const num = table.numero;
    onUpdateTables((prev) =>
      prev.map((t) => {
        if (t.id === table.id) {
          return { ...t, mergedWith: undefined };
        }
        if (t.mergedWith?.includes(num)) {
          const rest = t.mergedWith.filter((n) => n !== num);
          return { ...t, mergedWith: rest.length > 0 ? rest : undefined };
        }
        return t;
      })
    );
    onNotify(`Mesa ${num} separada.`);
  };

  const handleCycleSeats = (tableId) => {
    const order = [2, 3, 4, 6];
    onUpdateTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const next = order[(order.indexOf(t.capacidad) + 1) % order.length];
        return { ...t, capacidad: next };
      })
    );
  };

  const handleAddNewTable = () => {
    const maxNum = tables.reduce((m, t) => Math.max(m, t.numero), 0);
    const nextNum = maxNum + 1;
    const newTable = {
      id: `mesa-${Date.now()}`,
      numero: nextNum,
      capacidad: 4,
      estado: 'CERRADA',
      comensales: 0,
      pedidos: [],
    };
    onUpdateTables((prev) => [...prev, newTable]);
    onNotify(`Mesa ${nextNum} agregada al Salón Principal.`);
  };

  const handleRemoveTable = (table) => {
    if (table.estado !== 'CERRADA') {
      onNotify('Cierra la mesa antes de eliminarla del plano.');
      return;
    }
    onUpdateTables((prev) => prev.filter((t) => t.id !== table.id));
    setActiveTableId(null);
    onNotify(`Mesa ${table.numero} eliminada del plano.`);
  };

  const activeTotal = activeTable
    ? activeTable.pedidos.reduce((s, p) => s + p.precio * p.cantidad, 0)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header Mobile */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Salón Principal
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {counts.total} mesas · {counts.ocupadas} ocupadas
              {counts.cuenta > 0 ? ` · ${counts.cuenta} por cobrar` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Actualizar salón"
            title="Actualizar salón"
            className="min-h-[44px] min-w-[44px] rounded-xl border-0 bg-[#9CA3AF]/75 hover:bg-[#9CA3AF] dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <RotateCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {/* Botonera táctil Mobile */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleToggleMergeMode}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
              mergeMode
                ? 'bg-[#10B981] border-[#10B981] text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border-[#6EE7B7] dark:border-emerald-800 text-[#059669] dark:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30'
            }`}
          >
            <Link2 className="w-4 h-4 shrink-0" />
            <span>{mergeMode ? 'Cancelar Unión' : 'Unir Mesas'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLock}
            aria-pressed={!locked}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.03)] cursor-pointer whitespace-nowrap"
          >
            <span
              className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
                locked ? 'bg-[#F43F5E]' : 'bg-[#10B981]'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                  locked ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              >
                {locked ? (
                  <Lock className="w-2.5 h-2.5 text-slate-800" />
                ) : (
                  <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                )}
              </span>
            </span>
            <span>{locked ? 'Bloqueado' : 'Editando'}</span>
          </button>
        </div>
      </header>

      {/* Filtros rápidos + Agregar Mesa */}
      <div className="flex flex-col gap-2.5">
        <div
          role="tablist"
          aria-label="Filtrar mesas por estado"
          className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-x-auto w-full"
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(f.value)}
                className={`flex-1 min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg border-0 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#F26522] text-white shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {!locked && (
          <button
            type="button"
            onClick={handleAddNewTable}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border-0 bg-[#F26522] hover:bg-[#DC5616] text-white shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Mesa</span>
          </button>
        )}
      </div>

      {/* Banner Modo Unión */}
      {mergeMode && (
        <div className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex flex-col gap-2.5">
          <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
            Toca 2 o más mesas en el plano para unirlas (
            <strong className="tabular-nums">
              {mergeSelection.length} seleccionadas
            </strong>
            ).
          </p>
          <button
            type="button"
            onClick={handleConfirmMerge}
            disabled={mergeSelection.length < 2}
            className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold rounded-xl border-0 bg-[#10B981] hover:bg-[#059669] disabled:opacity-45 text-white cursor-pointer"
          >
            Confirmar Unión
          </button>
        </div>
      )}

      {/* Plano de Mesas Mobile (Grid 2 columnas) */}
      <section
        aria-label="Plano de mesas del Salón Principal"
        className="rounded-2xl bg-[#EAEAE8] dark:bg-slate-900/90 border border-slate-300/70 dark:border-slate-800 p-4 min-h-[480px]"
      >
        {visibleTables.length === 0 ? (
          <div className="h-[340px] flex flex-col items-center justify-center text-center px-4">
            <UtensilsCrossed className="w-8 h-8 text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No hay mesas con estado "{statusFilter}"
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter('TODAS')}
              className="mt-3 px-4 py-2 text-xs font-semibold rounded-xl border-0 bg-[#F26522] text-white cursor-pointer min-h-[40px]"
            >
              Ver todas las mesas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-7 gap-x-4 place-items-center py-2">
            {visibleTables.map((table) => {
              const isSelectedForMerge = mergeSelection.includes(table.numero);
              const isOcupada = table.estado === 'OCUPADA';
              const isCuenta = table.estado === 'CUENTA';
              const isLibre = table.estado === 'LIBRE';
              const isCerrada = table.estado === 'CERRADA';
              const tableTotal = table.pedidos.reduce(
                (s, p) => s + p.precio * p.cantidad,
                0
              );

              const showTopChair = table.capacidad >= 4;
              const showBottomChair = table.capacidad >= 3;
              const showExtraChairs = table.capacidad === 6;

              const chairColor = isOcupada
                ? 'bg-[#F26522]/45'
                : isCuenta
                  ? 'bg-amber-400/60'
                  : isLibre
                    ? 'bg-emerald-500/40 dark:bg-emerald-400/40'
                    : 'bg-[#C4C6CA] dark:bg-slate-600';

              return (
                <div
                  key={table.id}
                  className="relative flex items-center justify-center p-3"
                >
                  {showTopChair && (
                    <span
                      aria-hidden="true"
                      className={`absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-t-md ${chairColor}`}
                    />
                  )}
                  {showBottomChair && (
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-b-md ${chairColor}`}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0.5 ${
                      showExtraChairs ? 'top-8' : 'top-1/2 -translate-y-1/2'
                    } w-2 h-5 rounded-l-md ${chairColor}`}
                  />
                  {showExtraChairs && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-0.5 bottom-8 w-2 h-5 rounded-l-md ${chairColor}`}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`absolute right-0.5 ${
                      showExtraChairs ? 'top-8' : 'top-1/2 -translate-y-1/2'
                    } w-2 h-5 rounded-r-md ${chairColor}`}
                  />
                  {showExtraChairs && (
                    <span
                      aria-hidden="true"
                      className={`absolute right-0.5 bottom-8 w-2 h-5 rounded-r-md ${chairColor}`}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => handleTableClick(table)}
                    className={`relative w-[108px] h-[108px] rounded-[20px] flex flex-col items-center justify-center transition-all duration-150 cursor-pointer active:scale-[0.97] select-none border ${
                      isSelectedForMerge
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-[#10B981] ring-3 ring-[#10B981]/30 shadow-md'
                        : isOcupada
                          ? 'bg-white dark:bg-slate-800 border-[#F26522] ring-2 ring-[#F26522]/15 shadow-sm'
                          : isCuenta
                            ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-400 shadow-sm'
                            : isLibre
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/80 dark:border-emerald-600 ring-2 ring-emerald-500/15 shadow-sm'
                              : 'bg-[#F4F4F3] dark:bg-slate-800 border-slate-300/60 dark:border-slate-700 opacity-60 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
                    }`}
                  >
                    {table.mergedWith && table.mergedWith.length > 0 && (
                      <span className="absolute -top-2 right-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold tracking-tight shadow-xs tabular-nums">
                        +{table.mergedWith.join(',')}
                      </span>
                    )}

                    {isSelectedForMerge && (
                      <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}

                    <span
                      className={`text-[21px] font-bold tabular-nums leading-none ${
                        isOcupada
                          ? 'text-[#F26522]'
                          : isCuenta
                            ? 'text-amber-700 dark:text-amber-300'
                            : isLibre
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-slate-600 dark:text-slate-200'
                      }`}
                    >
                      {table.numero}
                    </span>

                    <span
                      className={`mt-1.5 text-[10px] font-bold tracking-[0.06em] uppercase ${
                        isOcupada
                          ? 'text-[#F26522]'
                          : isCuenta
                            ? 'text-amber-700 dark:text-amber-300'
                            : isLibre
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-400'
                      }`}
                    >
                      {table.estado === 'CUENTA' ? 'POR COBRAR' : table.estado}
                    </span>

                    {tableTotal > 0 && (
                      <span className="mt-1 text-[11px] font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                        S/. {tableTotal.toFixed(2)}
                      </span>
                    )}

                    {!locked && (
                      <span className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                        {table.capacidad} sillas
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Sheet Mobile al tocar una mesa */}
      {activeTable && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mesa-sheet-title"
          onClick={() => setActiveTableId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col"
          >
            {/* Indicador de arrastre */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Header Bottom Sheet */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2
                    id="mesa-sheet-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    Mesa {activeTable.numero}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      activeTable.estado === 'OCUPADA'
                        ? 'bg-orange-100 text-[#C2410C] dark:bg-orange-950/60 dark:text-orange-300'
                        : activeTable.estado === 'CUENTA'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : activeTable.estado === 'LIBRE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {activeTable.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  Capacidad: {activeTable.capacidad} personas
                  {activeTable.horaApertura
                    ? ` · Abierta ${activeTable.horaApertura}`
                    : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTableId(null)}
                aria-label="Cerrar detalle de mesa"
                className="w-10 h-10 rounded-xl bg-transparent border-0 p-0 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {!locked && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                      Configuración de plano
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                      Actualmente {activeTable.capacidad} sillas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCycleSeats(activeTable.id)}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Cambiar Sillas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTable(activeTable)}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTable.mergedWith && activeTable.mergedWith.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 tabular-nums">
                    Unida con Mesa {activeTable.mergedWith.join(', ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUnlinkTable(activeTable)}
                    className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Separar</span>
                  </button>
                </div>
              )}

              {activeTable.estado === 'CERRADA' ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-bold">Mesa Bloqueada (Caja Cerrada)</p>
                  <p className="text-[11px] mt-1">Se requiere la apertura de caja para iniciar comandas.</p>
                </div>
              ) : activeTable.estado === 'LIBRE' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Número de comensales
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setGuestCountInput((c) => Math.max(1, c - 1))
                        }
                        aria-label="Restar comensal"
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-base tabular-nums">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>{guestCountInput}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setGuestCountInput((c) => Math.min(12, c + 1))
                        }
                        aria-label="Sumar comensal"
                        className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenTable(activeTable)}
                    className="w-full min-h-[48px] rounded-xl border-0 bg-[var(--primary,#F26522)] hover:opacity-90 text-white font-semibold text-sm shadow-sm cursor-pointer transition-colors"
                  >
                    Abrir Mesa {activeTable.numero}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTableId(null);
                      if (onOpenOrder) onOpenOrder(activeTable.id, activeTable.comensales);
                      else navigate(`/order/${activeTable.id}`);
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-[var(--primary,#F26522)] bg-transparent text-[var(--primary,#F26522)] font-bold text-xs shadow-xs hover:bg-[var(--primary,#F26522)]/10 cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Ir a Comanda / Enviar a Cocina</span>
                  </button>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Comanda Actual
                    </h3>
                    {activeTable.pedidos.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 py-3 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                        Sin platos agregados aún. Selecciona abajo para añadir
                        al pedido.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                        {activeTable.pedidos.map((item) => (
                          <div
                            key={item.dishId}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {item.nombre}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                S/. {item.precio.toFixed(2)} c/u
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleChangeOrderQty(
                                    activeTable.id,
                                    item.dishId,
                                    -1
                                  )
                                }
                                aria-label="Quitar uno"
                                className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold tabular-nums">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleChangeOrderQty(
                                    activeTable.id,
                                    item.dishId,
                                    1
                                  )
                                }
                                aria-label="Agregar uno"
                                className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Agregar del Menú
                      </h3>
                      <input
                        type="text"
                        value={dishSearch}
                        onChange={(e) => setDishSearch(e.target.value)}
                        placeholder="Filtrar plato..."
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#F26522] w-36"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-0.5">
                      {activeDishes.map((dish) => (
                        <button
                          key={dish.id}
                          type="button"
                          onClick={() =>
                            handleAddDishToTable(activeTable.id, dish)
                          }
                          className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:border-[#F26522] hover:bg-orange-50/50 dark:hover:bg-orange-950/30 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {dish.nombre}
                          </span>
                          <span className="text-xs font-bold text-[#F26522] tabular-nums shrink-0">
                            + S/. {dish.precioVenta.toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer fijo del Bottom Sheet */}
            {activeTable.estado !== 'CERRADA' && (
              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Total Mesa ({activeTable.comensales} pers.)
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                    S/. {activeTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeTable.estado !== 'CUENTA' && (
                    <button
                      type="button"
                      onClick={() => handleRequestBill(activeTable)}
                      className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Cuenta</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCloseTable(activeTable)}
                    className="min-h-[44px] flex-1 px-4 py-2 text-xs font-semibold rounded-xl border-0 bg-[#10B981] hover:bg-[#059669] text-white cursor-pointer"
                  >
                    Cerrar y Cobrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MesasMobileView;
