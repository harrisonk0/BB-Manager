"use client";

import React from 'react';

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
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`block w-full px-3 py-2 pr-3 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRingClass} disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default DatePicker;