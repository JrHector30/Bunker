import React, { useState, useRef, useEffect } from 'react';
import { Arqueo } from '../types';
import { TrendingUp, BarChart3, CreditCard, DollarSign, Smartphone, Download, HelpCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ChartsProps {
  arqueos: Arqueo[];
  selectedArqueoId: number;
  onSelectArqueo: (id: number) => void;
}

export function CustomCharts({ arqueos, selectedArqueoId, onSelectArqueo }: ChartsProps) {
  // Sort reverse to get chronological order for line chart (e.g. 40 -> 45)
  const lastArqueos = [...arqueos]
    .filter(a => a.id >= 38) // Get last 8 arqueos for a beautiful trend
    .sort((a, b) => a.id - b.id);

  const selectedArqueo = arqueos.find(a => a.id === selectedArqueoId) || arqueos[0];

  // Tooltip state for Area Chart
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState<{ label: string; ingreso: number; egreso: number } | null>(null);

  // Tooltip state for Payment Method Doughnut Chart
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  // SVG dimensions for Line/Area chart
  const padding = 35;
  const chartHeight = 145;
  const chartWidth = 500;

  // Find max values for scale
  const maxIngreso = Math.max(...lastArqueos.map(a => a.totalBruto), 100);
  const maxEgreso = Math.max(...lastArqueos.map(a => a.egreso), 50);
  const maxOverall = Math.max(maxIngreso, maxEgreso) * 1.15; // 15% margin at top

  // Coordinate calculations
  const pointsIngreso = lastArqueos.map((arq, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (lastArqueos.length - 1);
    const y = chartHeight - padding - (arq.totalBruto * (chartHeight - padding * 2)) / maxOverall;
    return { x, y, val: arq.totalBruto, id: arq.id, egreso: arq.egreso };
  });

  const pointsEgreso = lastArqueos.map((arq, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (lastArqueos.length - 1);
    const y = chartHeight - padding - (arq.egreso * (chartHeight - padding * 2)) / maxOverall;
    return { x, y, val: arq.egreso, id: arq.id };
  });

  // SVG Path generator helper
  const getAreaPath = (points: { x: number; y: number }[], baseHeight: number) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Use smooth curve calculation (Catmull-Rom style approximation)
      const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
      const cpY1 = points[i - 1].y;
      const cpX2 = points[i - 1].x + 2 * (points[i].x - points[i - 1].x) / 3;
      const cpY2 = points[i].y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
    }
    d += ` L ${points[points.length - 1].x} ${baseHeight}`;
    d += ` L ${points[0].x} ${baseHeight} Z`;
    return d;
  };

  const getLinePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 3;
      const cpY1 = points[i - 1].y;
      const cpX2 = points[i - 1].x + 2 * (points[i].x - points[i - 1].x) / 3;
      const cpY2 = points[i].y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const areaPathIngreso = getAreaPath(pointsIngreso, chartHeight - padding);
  const linePathIngreso = getLinePath(pointsIngreso);

  const areaPathEgreso = getAreaPath(pointsEgreso, chartHeight - padding);
  const linePathEgreso = getLinePath(pointsEgreso);

  // Method Distribution Calculation
  const details = selectedArqueo.ingresoDetalle;
  const methods = [
    { name: 'Efectivo', val: details.efectivo, color: '#10b981', icon: DollarSign },
    { name: 'Digital (Yape/Plin)', val: details.digital, color: '#3b82f6', icon: Smartphone },
    { name: 'Tarjeta (Visa/MC)', val: details.tarjeta, color: '#f59e0b', icon: CreditCard },
    { name: 'Manual/Otros', val: details.manual, color: '#64748b', icon: HelpCircle }
  ];

  const totalMethods = methods.reduce((acc, m) => acc + m.val, 0) || 1; // avoid divide by zero

  // Export functions (visual alerts / success states)
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const triggerExport = (chartName: string) => {
    setExportMessage(`Gráfico "${chartName}" exportado en formato PNG de alta resolución.`);
    setTimeout(() => setExportMessage(null), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Toast alert for export action */}
      {exportMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-md border border-slate-800 flex items-center space-x-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{exportMessage}</span>
        </div>
      )}

      {/* Gráfico A: Comparativa Ingresos vs Egresos */}
      <div id="chart-a" className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between transition-all">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análisis Histórico</span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Comparativa de Ingresos vs. Egresos
            </h3>
          </div>
          <button
            onClick={() => triggerExport('Ingresos vs Egresos')}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm bg-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs mb-3 text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
            <span>Ingresos (Bruto)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 block"></span>
            <span>Egresos</span>
          </div>
        </div>

        {/* Dynamic Interactive SVG Chart */}
        <div className="relative flex-1 min-h-[160px] select-none">
          <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="ingresoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="egresoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
              const y = padding + p * (chartHeight - padding * 2);
              const val = (maxOverall * (1 - p)).toFixed(0);
              return (
                <g key={i} className="opacity-40">
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="font-mono text-[9px] fill-slate-400"
                  >
                    S/. {val}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            {areaPathIngreso && <path d={areaPathIngreso} fill="url(#ingresoGrad)" />}
            {areaPathEgreso && <path d={areaPathEgreso} fill="url(#egresoGrad)" />}

            {/* Line Paths */}
            {linePathIngreso && (
              <path
                d={linePathIngreso}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            )}
            {linePathEgreso && (
              <path
                d={linePathEgreso}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            )}

            {/* Interactive Vertical Hover Lines and Dots */}
            {pointsIngreso.map((p, index) => {
              const isActive = activeBarIndex === index;
              return (
                <g key={index} className="cursor-pointer">
                  {/* Vertical hover line anchor */}
                  {isActive && (
                    <line
                      x1={p.x}
                      y1={padding}
                      x2={p.x}
                      y2={chartHeight - padding}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Hotspot for mouse hover */}
                  <rect
                    x={p.x - 15}
                    y={padding}
                    width={30}
                    height={chartHeight - padding * 2}
                    fill="transparent"
                    onMouseEnter={(e) => {
                      setActiveBarIndex(index);
                      setTooltipContent({
                        label: `Arqueo N° ${p.id}`,
                        ingreso: p.val,
                        egreso: p.egreso
                      });
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({
                        x: p.x,
                        y: p.y - 10
                      });
                    }}
                    onMouseLeave={() => {
                      setActiveBarIndex(null);
                      setTooltipContent(null);
                    }}
                    onClick={() => onSelectArqueo(p.id)}
                  />

                  {/* Node points for Ingresos */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 6 : p.id === selectedArqueoId ? 5 : 3.5}
                    fill={p.id === selectedArqueoId ? '#10b981' : '#ffffff'}
                    stroke="#10b981"
                    strokeWidth={isActive ? 3 : p.id === selectedArqueoId ? 2.5 : 2}
                    className="transition-all duration-150"
                  />

                  {/* Node points for Egresos */}
                  <circle
                    cx={p.x}
                    cy={pointsEgreso[index].y}
                    r={isActive ? 5 : 3}
                    fill="#ffffff"
                    stroke="#f43f5e"
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className="transition-all duration-150"
                  />

                  {/* X Axis Labels */}
                  {index % 2 === 0 && (
                    <text
                      x={p.x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className="font-display font-medium text-[10px] fill-slate-500"
                    >
                      N° {p.id}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating dynamic HTML tooltip */}
          {tooltipContent && (
            <div
              className="absolute z-10 bg-slate-900/95 backdrop-blur-xs text-white p-2.5 rounded-lg shadow-xl border border-slate-700/50 pointer-events-none text-xs transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(tooltipPos.x / chartWidth) * 100}%`,
                top: `${(tooltipPos.y / chartHeight) * 100 - 5}%`
              }}
            >
              <div className="font-bold border-b border-slate-700 pb-1 mb-1 font-display">
                {tooltipContent.label}
              </div>
              <div className="flex justify-between gap-4 text-emerald-400">
                <span>Ingreso:</span>
                <span className="font-mono font-bold">S/. {tooltipContent.ingreso.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4 text-rose-400 mt-0.5">
                <span>Egreso:</span>
                <span className="font-mono font-bold">S/. {tooltipContent.egreso.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-400 text-center mt-2 flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Tip: Haz clic en un nodo de arqueo para filtrar su desglose de pagos en el panel contiguo</span>
        </div>
      </div>

      {/* Gráfico B: Distribución de Métodos de Pago del Arqueo Seleccionado */}
      <div id="chart-b" className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between transition-all">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Análisis del Arqueo Seleccionado</span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Distribución de Métodos de Pago (Arqueo N° {selectedArqueo.id})
            </h3>
          </div>
          <button
            onClick={() => triggerExport(`Métodos Pago N° ${selectedArqueo.id}`)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm bg-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>

        {/* Selection Indicator Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex justify-between items-center text-xs mb-4">
          <span className="text-slate-500">Monto Neto Analizado:</span>
          <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-100">
            S/. {selectedArqueo.totalBruto.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Visual Bar Distribution Chart (Responsive CSS Rows) */}
          <div className="col-span-1 sm:col-span-6 flex flex-col justify-center space-y-3.5">
            {methods.map((method) => {
              const percentage = ((method.val / totalMethods) * 100);
              const isHovered = hoveredMethod === method.name;

              return (
                <div
                  key={method.name}
                  className={`p-1.5 rounded-xl border transition-all duration-150 ${
                    isHovered ? 'bg-slate-50 border-slate-200' : 'border-transparent'
                  }`}
                  onMouseEnter={() => setHoveredMethod(method.name)}
                  onMouseLeave={() => setHoveredMethod(null)}
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <method.icon className="w-3.5 h-3.5 text-slate-500" style={{ color: method.color }} />
                      <span>{method.name.split(' ')[0]}</span>
                    </div>
                    <div className="font-mono font-semibold text-slate-900">
                      S/. {method.val.toFixed(2)}
                      <span className="text-slate-400 text-[10px] ml-1">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  {/* Progress track */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: method.color,
                        boxShadow: isHovered ? `0 0 8px ${method.color}80` : 'none'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Graphic: Circular Donut or Summary Representation */}
          <div className="col-span-1 sm:col-span-6 flex flex-col items-center justify-center py-2">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Custom SVG Donut chart representation */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="3.2"
                />
                {(() => {
                  let accumulatedPercent = 0;
                  return methods.map((m) => {
                    const pct = (m.val / totalMethods) * 100;
                    if (pct <= 0) return null;
                    const strokeDashArray = `${pct} ${100 - pct}`;
                    const strokeDashOffset = 100 - accumulatedPercent;
                    accumulatedPercent += pct;
                    const isHovered = hoveredMethod === m.name;

                    return (
                      <circle
                        key={m.name}
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="transparent"
                        stroke={m.color}
                        strokeWidth={isHovered ? '4' : '3.2'}
                        strokeDasharray={strokeDashArray}
                        strokeDashoffset={strokeDashOffset}
                        className="transition-all duration-200"
                        onMouseEnter={() => setHoveredMethod(m.name)}
                        onMouseLeave={() => setHoveredMethod(null)}
                      />
                    );
                  });
                })()}
              </svg>
              {/* Inner details card */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Arqueo</span>
                <span className="text-sm font-bold text-slate-800 font-display">N° {selectedArqueo.id}</span>
                <span className="text-[9px] text-slate-500 font-mono">
                  S/. {selectedArqueo.totalBruto.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Quick stats details summary card */}
            <div className="mt-3 flex flex-wrap gap-2 justify-center max-w-[240px]">
              {methods.map((m) => (
                <div
                  key={m.name}
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 font-mono transition-colors ${
                    hoveredMethod === m.name
                      ? 'bg-slate-50 border-slate-300 font-semibold'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                  style={{ borderColor: hoveredMethod === m.name ? m.color : undefined }}
                >
                  <span className="w-1.5 h-1.5 rounded-full block" style={{ backgroundColor: m.color }}></span>
                  <span>{m.name.split(' ')[0]}: {((m.val / totalMethods) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
