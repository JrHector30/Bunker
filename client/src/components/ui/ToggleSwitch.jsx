import React from 'react';

export const ToggleSwitch = ({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 border-0 p-0 outline-none focus:outline-none focus:ring-0 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        checked ? '' : 'bg-slate-300 dark:bg-slate-600'
      } ${className}`}
      style={{
        border: 'none',
        outline: 'none',
        ...(checked ? { backgroundColor: 'var(--primary, #F26522)' } : {}),
      }}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out pointer-events-none ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default ToggleSwitch;
