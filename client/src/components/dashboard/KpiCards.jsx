import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
  ArrowUp,
  ArrowDown,
  Repeat,
  BarChart3,
  Download,
  MoreHorizontal
} from 'lucide-react';
import SmoothDropdown from '../ui/SmoothDropdown';
import { formatCurrencyAmount } from './dashboardData';

const KPI_STYLE_MAP = {
  income: {
    icon: Wallet,
    softBg: 'bg-white/20',
    iconColor: 'text-white',
  },
  total_orders: {
    icon: ShoppingBag,
    softBg: 'bg-[#FFF1EB] dark:bg-[#F26522]/15',
    iconColor: 'text-[#F26522]',
  },
  in_progress: {
    icon: Clock,
    softBg: 'bg-[#DBEAFE] dark:bg-[#3B82F6]/15',
    iconColor: 'text-[#3B82F6] dark:text-[#60A5FA]',
  },
  completed: {
    icon: CheckCircle2,
    softBg: 'bg-[#DCFCE7] dark:bg-[#22C55E]/15',
    iconColor: 'text-[#22C55E] dark:text-[#4ADE80]',
  },
  dishes_sold: {
    icon: UtensilsCrossed,
    softBg: 'bg-[#FEE2E2] dark:bg-[#EF4444]/15',
    iconColor: 'text-[#EF4444] dark:text-[#F87171]',
  },
};

export const KpiCards = ({
  metrics,
  currency,
  onToggleCurrency,
  onSelectKpiDetail,
  onExportSummary,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {metrics.map((metric) => {
        const style = KPI_STYLE_MAP[metric.id] || KPI_STYLE_MAP.total_orders;
        const Icon = style.icon;
        const isHighlighted = Boolean(metric.highlighted);

        const displayValue = metric.isCurrency
          ? formatCurrencyAmount(metric.value, currency)
          : (metric.value || 0).toLocaleString('es-PE');

        const isUp = metric.trendDirection === 'up';

        // Dropdown actions for this KPI
        const dropdownItems = [];
        if (metric.isCurrency) {
          dropdownItems.push({
            id: 'toggle_currency',
            label: currency === 'PEN' ? 'Mostrar en Dólares ($)' : 'Mostrar en Soles (S/)',
            icon: Repeat
          });
        }
        dropdownItems.push(
          { id: 'detail', label: 'Ver desglose del día', icon: BarChart3 },
          { id: 'export', label: 'Exportar resumen CSV', icon: Download }
        );

        const handleDropdownAction = (actionId) => {
          if (actionId === 'toggle_currency') {
            onToggleCurrency?.();
          } else if (actionId === 'detail') {
            onSelectKpiDetail?.(metric);
          } else if (actionId === 'export') {
            onExportSummary?.();
          }
        };

        return (
          <div
            key={metric.id}
            className={`relative rounded-xl px-4 py-3.5 transition-all duration-200 border ${
              isHighlighted
                ? 'border-transparent text-white shadow-md'
                : 'border-slate-100 bg-white text-slate-900 shadow-xs hover:shadow-md dark:border-slate-800/90 dark:bg-[#131A26] dark:text-slate-100'
            }`}
            style={
              isHighlighted
                ? {
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover, var(--primary)) 100%)',
                    boxShadow: '0 4px 14px var(--color-brand-glow, rgba(0, 0, 0, 0.2))'
                  }
                : {}
            }
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isHighlighted
                      ? 'bg-white/20 text-white'
                      : `${style.softBg} ${style.iconColor}`
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className={`truncate text-xs font-semibold ${
                    isHighlighted
                      ? 'text-white'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {metric.title}
                </span>
              </div>

              {/* 3 dots menu powered by SmoothDropdown */}
              <div className="relative shrink-0">
                <SmoothDropdown
                  id={`kpi-${metric.id}`}
                  compact={true}
                  triggerIcon={MoreHorizontal}
                  isHighlighted={isHighlighted}
                  openWidth={210}
                  items={dropdownItems}
                  onAction={handleDropdownAction}
                />
              </div>
            </div>

            <div className="mt-2.5">
              <p
                className={`text-xl xl:text-[22px] font-bold tracking-tight tabular-nums leading-none ${
                  isHighlighted
                    ? 'text-white'
                    : 'text-slate-900 dark:text-slate-50'
                }`}
              >
                {displayValue}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-1 text-[11px]">
              <span
                className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                  isHighlighted
                    ? 'text-white'
                    : isUp
                      ? 'text-[#22C55E] dark:text-[#4ADE80]'
                      : 'text-[#EF4444] dark:text-[#F87171]'
                }`}
              >
                {isUp ? (
                  <ArrowUp className="h-2.5 w-2.5 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="h-2.5 w-2.5 stroke-[2.5]" />
                )}
                {metric.trendPercent}%
              </span>
              <span
                className={`truncate ${
                  isHighlighted
                    ? 'text-white/85'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {metric.comparisonLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
