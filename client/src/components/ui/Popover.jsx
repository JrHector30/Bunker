import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const PopoverContext = createContext(null);

export function Popover({ open: controlledOpen, onOpenChange, children }) {
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
      <div ref={containerRef} className="inline-block">
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
  const { open } = useContext(PopoverContext);
  if (!open) return null;

  const alignClass = align === "end" ? "right-0" : "left-0";

  return (
    <div
      className={`absolute ${alignClass} z-[9999] mt-2 rounded-xl border border-gray-800 bg-[#121214] p-4 shadow-2xl outline-none min-w-[280px] ${className}`}
    >
      {children}
    </div>
  );
}
