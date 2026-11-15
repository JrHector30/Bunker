import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';

export function FilterCombobox({
  value,
  options = [],
  onChange,
  defaultValue,
  icon: LeadingIcon,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selectedOption =
    options.find((opt) => String(opt.value) === String(value)) ?? options[0];
  const isFiltered = value !== defaultValue && value !== '';

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center justify-between gap-2.5 px-3.5 py-2 text-[13px] font-medium rounded-full border transition-all duration-150 cursor-pointer whitespace-nowrap select-none ${
          isFiltered
            ? 'border-[#F26522]/45 bg-orange-50/80 dark:bg-orange-950/40 text-[#C2410C] dark:text-orange-300 shadow-[0_1px_2px_rgba(242,101,34,0.08)]'
            : open
              ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs ring-2 ring-[#F26522]/15'
              : 'border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selectedOption?.emoji ? (
            <span className="text-sm leading-none" aria-hidden="true">
              {selectedOption.emoji}
            </span>
          ) : selectedOption?.indicatorClass ? (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.indicatorClass}`}
              aria-hidden="true"
            />
          ) : LeadingIcon ? (
            <LeadingIcon
              className={`w-3.5 h-3.5 shrink-0 ${
                isFiltered
                  ? 'text-[#F26522]'
                  : 'text-slate-400 dark:text-slate-400'
              }`}
            />
          ) : null}
          <span className="truncate">{selectedOption?.label}</span>
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          } ${isFiltered ? 'text-[#F26522]' : 'text-slate-400'}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top left', margin: 0, padding: '6px', listStyle: 'none' }}
            className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] max-h-72 overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 m-0 p-1.5 list-none focus:outline-none"
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-[13px] font-medium rounded-xl flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-orange-50/80 dark:bg-orange-950/40 text-[#C2410C] dark:text-orange-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.emoji && (
                      <span className="text-sm leading-none" aria-hidden="true">
                        {opt.emoji}
                      </span>
                    )}
                    {opt.indicatorClass && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${opt.indicatorClass}`}
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#F26522] shrink-0" />
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
export default FilterCombobox;
