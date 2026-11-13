import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "./ui/Calendar";
import { Button } from "./ui/Button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/Select";
import { Calendar as CalendarIcon } from "lucide-react";
import { CloseButton } from "./ui/CloseButton";

export function DropdownRangeDatePicker({
  mode = "range", // "range" | "single"
  value,
  onChange,
  placeholder = "Filtrar por Fecha",
  triggerClassName = "",
}) {
  const today = new Date();

  const [tempSelected, setTempSelected] = React.useState(value);
  const [month, setMonth] = React.useState(today.getMonth());
  const [year, setYear] = React.useState(today.getFullYear());
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setTempSelected(value);

    if (mode === "range" && value?.from) {
      setMonth(value.from.getMonth());
      setYear(value.from.getFullYear());
    } else if (mode === "single" && value) {
      const d = new Date(value);
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    }
  }, [value, mode]);

  const displayMonth = new Date(year, month, 1);

  const formatDateValue = (val) => {
    if (!val) return null;
    return format(val, "dd-MM-yyyy", { locale: es });
  };

  const formattedValue = React.useMemo(() => {
    if (mode === "range") {
      const range = value;
      return range?.from
        ? range.to
          ? `${formatDateValue(range.from)} a ${formatDateValue(range.to)}`
          : formatDateValue(range.from)
        : placeholder;
    } else {
      const dateVal = value;
      return dateVal ? formatDateValue(dateVal) : placeholder;
    }
  }, [value, mode, placeholder]);

  const handleApply = () => {
    onChange(tempSelected);
    setOpen(false);
  };

  const handleClear = () => {
    setTempSelected(undefined);
    onChange(undefined);
    setOpen(false);
  };

  const handleTriggerClear = (e) => {
    e.stopPropagation();
    handleClear();
  };

  const hasValue = mode === "range" ? !!value?.from : !!value;
  const isApplyDisabled = mode === "range" ? !tempSelected?.from : !tempSelected;

  return (
    <div
      className={`relative inline-flex items-center w-[280px] ${triggerClassName} ${open ? 'z-[9999]' : 'z-20'}`}
      style={{ zIndex: open ? 9999 : undefined }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal pr-10 font-sans bg-white border-slate-200 text-slate-800 hover:bg-slate-50 dark:bg-[#131A26] dark:border-slate-800 dark:text-slate-100 dark:hover:bg-[#1A2232] cursor-pointer"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <span
              className={`truncate overflow-hidden font-sans tabular-nums ${
                hasValue
                  ? "text-slate-800 dark:text-gray-200"
                  : "text-slate-500 dark:text-gray-400"
              }`}
            >
              {formattedValue}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-4 bg-white border border-slate-200 text-slate-900 shadow-xl dark:bg-[#0D1117] dark:border-slate-800 dark:text-slate-100"
          align="end"
        >
          <div className="space-y-4">
            {/* Dropdowns - Año a la izquierda, Mes a la derecha */}
            <div className="flex gap-2 mb-2">
              <Select value={year.toString()} onValueChange={(val) => setYear(Number(val))}>
                <SelectTrigger className="font-sans w-[120px] bg-white border-slate-200 text-slate-800 dark:bg-[#131A26] dark:border-slate-800 dark:text-slate-100 cursor-pointer">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 dark:bg-[#131A26] dark:border-slate-800 dark:text-slate-100">
                  {Array.from({ length: 40 }, (_, i) => today.getFullYear() - 20 + i).map(
                    (y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Select value={month.toString()} onValueChange={(val) => setMonth(Number(val))}>
                <SelectTrigger className="font-sans w-[140px] bg-white border-slate-200 text-slate-800 dark:bg-[#131A26] dark:border-slate-800 dark:text-slate-100 cursor-pointer">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 dark:bg-[#131A26] dark:border-slate-800 dark:text-slate-100">
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {format(new Date(2000, i, 1), "MMMM", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calendar */}
            <Calendar
              mode={mode}
              selected={tempSelected}
              onSelect={(val) => {
                setTempSelected(val);
                if (mode === "single" && val) {
                  onChange(val);
                  setOpen(false);
                }
              }}
              month={displayMonth}
              onMonthChange={(date) => {
                setMonth(date.getMonth());
                setYear(date.getFullYear());
              }}
              className="font-sans rounded-lg border border-slate-200 bg-white text-slate-900 dark:border-gray-800 dark:bg-[#060609] dark:text-slate-100"
            />

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 select-none">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                disabled={isApplyDisabled}
                className="font-sans !bg-transparent !border-none text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-gray-400 font-medium transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none p-0 h-auto"
              >
                Limpiar
              </Button>

              <Button
                size="sm"
                onClick={handleApply}
                disabled={isApplyDisabled}
                className="font-sans !bg-slate-900 !text-white hover:!bg-slate-800 dark:!bg-white dark:!text-black dark:hover:!bg-neutral-200 font-semibold px-4 h-8 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none border-none"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasValue && (
        <CloseButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleTriggerClear(e);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
        />
      )}
    </div>
  );
}
