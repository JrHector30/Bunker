import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MoreVertical } from 'lucide-react';

export const SmoothDropDown = ({ items, ariaLabel, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex justify-end">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-150 cursor-pointer ${
          isOpen
            ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
            : 'border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full mt-1.5 z-40 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 py-1.5 text-left"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.id}>
                  {item.dividerBefore && (
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      item.onClick();
                    }}
                    className={`w-full border-0 bg-transparent px-3.5 py-2 text-[13px] font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                      item.danger
                        ? 'text-[#EF4444] hover:bg-red-50/80 dark:hover:bg-red-950/40'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        item.danger
                          ? 'text-[#EF4444]'
                          : 'text-slate-400 dark:text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmoothDropDown;
