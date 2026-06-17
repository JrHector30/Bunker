import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const SelectContext = createContext(null);

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState({});
  const containerRef = useRef(null);

  const registerItem = (val, label) => {
    setItems((prev) => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  };

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
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, registerItem, items }}>
      <div ref={containerRef} className="relative inline-block w-full text-left">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children }) {
  const { open, setOpen } = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between rounded-lg border border-gray-800 bg-[#0c0c0e] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${className}`}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0 text-gray-400" />
    </button>
  );
}

export function SelectValue({ placeholder }) {
  const { value, items } = useContext(SelectContext);
  return <span className="truncate">{items[value] !== undefined ? items[value] : placeholder}</span>;
}

export function SelectContent({ children }) {
  const { open } = useContext(SelectContext);
  if (!open) return null;

  return (
    <div className="absolute left-0 z-[10000] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-800 bg-[#121214] p-1 shadow-2xl focus:outline-none">
      {children}
    </div>
  );
}

export function SelectItem({ value, children }) {
  const { value: selectedValue, onValueChange, setOpen, registerItem } = useContext(SelectContext);
  const isSelected = selectedValue === value;

  useEffect(() => {
    registerItem(value, children);
  }, [value, children]);

  return (
    <div
      onClick={() => {
        onValueChange(value);
        setOpen(false);
      }}
      className={`relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-3 pr-8 text-sm outline-none hover:bg-teal-600 hover:text-white transition-colors ${
        isSelected ? 'bg-teal-700 text-white font-medium' : 'text-gray-300'
      }`}
    >
      <span className="truncate">{children}</span>
    </div>
  );
}
