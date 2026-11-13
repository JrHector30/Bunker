import React, { useMemo, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { KITCHEN_CAPACITY_TARGET } from './dashboardData';

const KitchenDonutTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-[#1A2232]">
      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <span
          className="h-2.5 w-2.5 rounded-xs"
          style={{ backgroundColor: item.color }}
        />
        <span>{item.label}</span>
        <span className="tabular-nums text-slate-600 dark:text-slate-300">
          {item.percentage}%
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
        {item.dishesCount} de {KITCHEN_CAPACITY_TARGET} platos
        {item.id !== 'restante' && item.avgPrepMinutes ? ` · ${item.avgPrepMinutes} min prom.` : ''}
      </p>
    </div>
  );
};

export const KitchenStatusChart = ({
  segments,
  isDark = false,
}) => {
  const [activeId, setActiveId] = useState(null);

  const totalActiveDishes = useMemo(
    () => segments.reduce((acc, seg) => acc + (seg.dishesCount || 0), 0),
    [segments]
  );

  const totalActivePercent = useMemo(
    () => Math.round((totalActiveDishes / KITCHEN_CAPACITY_TARGET) * 100),
    [totalActiveDishes]
  );

  const remainingDishes = Math.max(
    0,
    KITCHEN_CAPACITY_TARGET - totalActiveDishes
  );
  const remainingPercent = Math.max(0, 100 - totalActivePercent);

  const chartData = useMemo(() => {
    if (remainingPercent <= 0) return segments;
    return [
      ...segments,
      {
        id: 'restante',
        label: 'Disponible',
        dishesCount: remainingDishes,
        percentage: remainingPercent,
        avgPrepMinutes: 0,
        color: isDark ? '#263144' : '#E5E7EB',
        softBg: isDark ? '#1E293B' : '#F1F5F9',
        description: `Capacidad disponible para alcanzar los ${KITCHEN_CAPACITY_TARGET} platos.`,
      },
    ];
  }, [segments, remainingDishes, remainingPercent, isDark]);

  const activeSegment = chartData.find((s) => s.id === activeId) ?? null;

  return (
    <section
      aria-label="Estado de Cocina"
      className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-xs sm:p-5 dark:border-slate-800/90 dark:bg-[#131A26]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Estado de Cocina
        </h2>
        <span className="text-[11px] font-medium text-slate-400 tabular-nums dark:text-slate-500">
          {totalActiveDishes}/{KITCHEN_CAPACITY_TARGET} platos
        </span>
      </div>

      <div className="my-auto flex flex-col items-center justify-between gap-3 py-1 sm:flex-row">
        <div className="relative h-[156px] w-[156px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="percentage"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={69}
                startAngle={90}
                endAngle={-270}
                stroke={isDark ? '#131A26' : '#FFFFFF'}
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={450}
                onMouseEnter={(_, index) => {
                  const seg = chartData[index];
                  if (seg) setActiveId(seg.id);
                }}
                onMouseLeave={() => setActiveId(null)}
              >
                {chartData.map((segment) => {
                  const isHovered = activeId === segment.id;
                  const isDimmed = activeId !== null && !isHovered;
                  return (
                    <Cell
                      key={segment.id}
                      fill={segment.color}
                      fillOpacity={isDimmed ? 0.35 : 1}
                      className="cursor-pointer transition-opacity duration-150 outline-none"
                    />
                  );
                })}
              </Pie>
              <Tooltip
                content={<KitchenDonutTooltip />}
                wrapperStyle={{ zIndex: 30 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Central percentage indicator */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
              {activeSegment ? `${activeSegment.percentage}%` : `${totalActivePercent}%`}
            </span>
            <span className="max-w-[70px] truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {activeSegment ? activeSegment.label : 'Capacidad'}
            </span>
          </div>
        </div>

        {/* Legend pills */}
        <div className="flex w-full flex-col justify-center gap-1.5 sm:max-w-[150px]">
          {segments.map((segment) => {
            const isHovered = activeId === segment.id;
            return (
              <div
                key={segment.id}
                onMouseEnter={() => setActiveId(segment.id)}
                onMouseLeave={() => setActiveId(null)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors ${
                  isHovered
                    ? 'bg-slate-100 font-semibold dark:bg-slate-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-xs"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-slate-600 dark:text-slate-300">
                    {segment.label}
                  </span>
                </div>
                <span className="font-semibold text-slate-800 tabular-nums dark:text-slate-200">
                  {segment.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-[#F8F9FA] px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:bg-[#1A2232] dark:text-slate-400">
        {activeSegment ? (
          <p>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {activeSegment.label}:{' '}
            </span>
            {activeSegment.description}
          </p>
        ) : (
          <p>
            Capacidad proyectada sobre base de{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {KITCHEN_CAPACITY_TARGET} comandas
            </strong>{' '}
            para estimar tiempos pico de despacho.
          </p>
        )}
      </div>
    </section>
  );
};
