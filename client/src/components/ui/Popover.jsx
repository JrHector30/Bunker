import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const PopoverContext = createContext(null);

export function Popover({ open: controlledOpen, onOpenChange, children, className = "" }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (newOpen) => {
    if (onOpenChange) onOpenChange(newOpen);
    if (!isControlled) setUncontrolledOpen(newOpen);
  };

  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <PopoverContext.Provider value={{ open, setOpen, containerRef }}>
      <div ref={containerRef} className={`inline-block relative ${className}`} style={{ zIndex: open ? 9999 : undefined }}>
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ children, asChild }) {
  const { open, setOpen } = useContext(PopoverContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        e.preventDefault();
        setOpen(!open);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
    >
      {children}
    </button>
  );
}

export function PopoverContent({ children, className = "", align = "start" }) {
  const { open, containerRef } = useContext(PopoverContext);
  const contentRef = useRef(null);
  const [adjustedStyle, setAdjustedStyle] = useState({});

  useEffect(() => {
    if (!open || !containerRef?.current) return;

    const updatePosition = () => {
      const containerRect = containerRef.current.getBoundingClientRect();
      const contentEl = contentRef.current;
      const contentWidth = contentEl ? contentEl.offsetWidth : 300;
      const vw = window.innerWidth;

      if (vw < 768) {
        let idealScreenLeft = containerRect.left;
        if (align === "end") {
          idealScreenLeft = containerRect.right - contentWidth;
        }

        const minLeft = 8;
        const maxLeft = Math.max(8, vw - contentWidth - 8);
        const clampedScreenLeft = Math.min(Math.max(idealScreenLeft, minLeft), maxLeft);
        const relativeLeft = clampedScreenLeft - containerRect.left;

        setAdjustedStyle({
          left: `${relativeLeft}px`,
          right: 'auto',
          maxWidth: `${vw - 16}px`,
        });
      } else {
        setAdjustedStyle({});
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open, containerRef, align]);

  if (!open) return null;

  const alignClass = align === "end" ? "right-0" : "left-0";

  return (
    <div
      ref={contentRef}
      style={{ zIndex: 99999, ...adjustedStyle }}
      className={`absolute ${adjustedStyle.left ? '' : alignClass} z-[99999] mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl outline-none min-w-[280px] dark:border-gray-800 dark:bg-[#121214] ${className}`}
    >
      {children}
    </div>
  );
}
