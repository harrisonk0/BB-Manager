"use client";

import React, { useRef } from 'react';
import { CalendarIcon } from './Icons'; // Assuming CalendarIcon exists or will be added

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  accentRingClass?: string; // Tailwind class for focus ring color
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Select date",
  accentRingClass = "focus:ring-junior-blue focus:border-junior-blue"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.showPicker(); // Programmatically open the date picker
    }
  };

  return (
    <div className="relative">
      <input
        type="date"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`block w-full px-3 py-2 pr-10 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRingClass} disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        onClick={handleIconClick}
        disabled={disabled}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Open date picker"
      >
        <CalendarIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default DatePicker;