import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";

const WEEKDAYS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export function Calendar({
  mode = "range",
  selected,
  onSelect,
  month,
  onMonthChange,
  className = "",
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const today = startOfDay(new Date());
  const rangeVal = mode === "range" && selected && !(selected instanceof Date) ? selected : undefined;
  const singleVal = mode === "single" && selected instanceof Date ? selected : undefined;

  const hasRangeSpan = Boolean(
    mode === "range" &&
      rangeVal?.from &&
      rangeVal?.to &&
      !isSameDay(rangeVal.from, rangeVal.to)
  );

  const handleDayClick = (day) => {
    const cleanDay = startOfDay(day);

    if (mode === "single") {
      onSelect?.(cleanDay);
      return;
    }

    if (!rangeVal?.from || (rangeVal.from && rangeVal.to)) {
      onSelect?.({ from: cleanDay, to: undefined });
      return;
    }

    if (isBefore(cleanDay, rangeVal.from)) {
      onSelect?.({ from: cleanDay, to: rangeVal.from });
    } else {
      onSelect?.({ from: rangeVal.from, to: cleanDay });
    }
  };

  return (
    <div className={`p-3 select-none ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => onMonthChange?.(subMonths(monthStart, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <span className="text-xs font-semibold capitalize text-slate-800 dark:text-slate-100">
          {format(monthStart, "MMMM yyyy", { locale: es })}
        </span>

        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => onMonthChange?.(addMonths(monthStart, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sin espacio horizontal (gap-x-0) para unir la banda del rango */}
      <div className="grid grid-cols-7 gap-x-0 gap-y-0.5 text-center">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="pb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500"
          >
            {wd}
          </div>
        ))}

        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);

          const isRangeStart =
            mode === "range" && Boolean(rangeVal?.from && isSameDay(day, rangeVal.from));
          const isRangeEnd =
            mode === "range" && Boolean(rangeVal?.to && isSameDay(day, rangeVal.to));
          const isInRange =
            mode === "range" &&
            Boolean(
              rangeVal?.from &&
                rangeVal?.to &&
                isAfter(day, rangeVal.from) &&
                isBefore(day, rangeVal.to)
            );
          const isSingleSelected =
            mode === "single" && Boolean(singleVal && isSameDay(day, singleVal));

          const isSameEndpoint = isRangeStart && isRangeEnd;
          const isEndpoint = isRangeStart || isRangeEnd || isSingleSelected;

          let radiusClass = "rounded-lg";
          if (hasRangeSpan) {
            if (isRangeStart && !isSameEndpoint) {
              radiusClass = "rounded-l-lg rounded-r-none";
            } else if (isRangeEnd && !isSameEndpoint) {
              radiusClass = "rounded-r-lg rounded-l-none";
            } else if (isInRange) {
              radiusClass = "rounded-none";
            }
          }

          let stateClass =
            "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
          if (isEndpoint) {
            stateClass =
              "bg-slate-900 font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200";
          } else if (isInRange) {
            stateClass =
              "bg-slate-200/80 font-medium text-slate-900 hover:bg-slate-200 dark:bg-[#1E222D] dark:text-slate-100 dark:hover:bg-[#262B38]";
          } else if (isToday) {
            stateClass =
              "border border-slate-300 font-semibold text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800";
          } else if (!isCurrentMonth) {
            stateClass =
              "text-slate-300 hover:bg-slate-50 dark:text-slate-700 dark:hover:bg-slate-800/40";
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              className={`flex h-8 w-9 items-center justify-center text-xs tabular-nums transition-colors cursor-pointer ${radiusClass} ${stateClass}`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
