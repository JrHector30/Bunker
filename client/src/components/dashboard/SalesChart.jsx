import React, { useMemo, useState } from 'react';
import { formatCurrencyAmount } from './dashboardData';

function buildSmoothSplinePath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  const tension = 0.22;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

export const SalesChart = ({
  data,
  currency = 'PEN',
  className = '',
}) => {
  const defaultIndex = Math.max(
    0,
    data.findIndex((item) => item.day === 'Jue')
  );
  const [activeIndex, setActiveIndex] = useState(defaultIndex >= 0 ? defaultIndex : 0);

  const width = 520;
  const height = 180;
  const padLeft = 40;
  const padRight = 18;
  const padTop = 30;
  const padBottom = 26;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const yTicks = [60, 50, 40, 30, 20, 10];
  const minVal = 10;
  const maxVal = 60;

  const coords = useMemo(() => {
    return data.map((point, index) => {
      const x =
        padLeft +
        (data.length > 1
          ? (index / (data.length - 1)) * plotWidth
          : plotWidth / 2);
      const clamped = Math.min(maxVal, Math.max(minVal, point.percentage));
      const ratio = (clamped - minVal) / (maxVal - minVal);
      const y = padTop + plotHeight - ratio * plotHeight;
      return { x, y, data: point };
    });
  }, [data, plotHeight, plotWidth]);

  const linePath = useMemo(() => buildSmoothSplinePath(coords), [coords]);
  const areaPath = useMemo(() => {
    if (coords.length === 0) return '';
    const baselineY = padTop + plotHeight;
    return `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${baselineY} L ${coords[0].x.toFixed(2)} ${baselineY} Z`;
  }, [coords, linePath, plotHeight]);

  const activePoint = coords[activeIndex] ?? coords[0] ?? { x: 0, y: 0, data: {} };
  const baselineY = padTop + plotHeight;

  const activeRevenue =
    currency === 'PEN'
      ? activePoint.data.revenuePen
      : activePoint.data.revenueUsd;

  return (
    <section
      aria-label="Gráfico de Ventas"
      className={`flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-xs sm:p-4 dark:border-slate-800/90 dark:bg-[#131A26] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Gráfico de Ventas
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {activePoint.data.fullDay}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatCurrencyAmount(activeRevenue, currency)}</span>
          <span aria-hidden="true">·</span>
          <span>{activePoint.data.orders} ped.</span>
        </div>
      </div>

      <div className="relative mt-2 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full select-none overflow-visible"
          role="img"
          aria-label="Tendencia semanal de ventas de domingo a sábado"
        >
          <defs>
            <linearGradient id="bunkerSalesArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F26522" stopOpacity="0.22" />
              <stop offset="85%" stopColor="#F26522" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#F26522" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const ratio = (tick - minVal) / (maxVal - minVal);
            const y = padTop + plotHeight - ratio * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-medium tabular-nums dark:fill-slate-500"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#bunkerSalesArea)" />

          <path
            d={linePath}
            fill="none"
            stroke="#F26522"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coords.map((point, index) => {
            const isActive = index === activeIndex;
            return (
              <g key={point.data.day}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive ? 4.5 : 2.5}
                  className="transition-all duration-150"
                  fill={isActive ? '#F26522' : '#FFFFFF'}
                  stroke="#F26522"
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                {isActive && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={9}
                    fill="#F26522"
                    fillOpacity="0.18"
                    className="animate-pulse"
                  />
                )}
                <line
                  x1={point.x}
                  y1={padTop}
                  x2={point.x}
                  y2={baselineY}
                  stroke="transparent"
                  strokeWidth={plotWidth / coords.length}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIndex(index)}
                  onTouchStart={() => setActiveIndex(index)}
                />
                <text
                  x={point.x}
                  y={height - 6}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isActive
                      ? 'fill-[#F26522] font-semibold'
                      : 'fill-slate-400 dark:fill-slate-500'
                  }`}
                >
                  {point.data.day}
                </text>
              </g>
            );
          })}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full transition-all duration-150"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              top: `${(activePoint.y / height) * 100}%`,
            }}
          >
            <div className="relative mb-2 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white shadow-md dark:bg-white dark:text-slate-900 whitespace-nowrap">
              <span>{activePoint.data.percentage}%</span>
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-white"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
