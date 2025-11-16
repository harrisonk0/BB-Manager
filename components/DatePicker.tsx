"use client";

import React from 'react';
// CalendarIcon is no longer needed as the custom button is removed.
// import { CalendarIcon } from './Icons'; 

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
  // The inputRef and handleIconClick are no longer needed as showPicker() is removed.
  // const inputRef = useRef<HTMLInputElement>(null);
  // const handleIconClick = () => {
  //   if (inputRef.current && !disabled) {
  //     inputRef.current.showPicker(); // Programmatically open the date picker
  //   }
  // };

  return (
    <div className="relative">
      <input
        type="date"
        // ref={inputRef} // No longer needed
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`block w-full px-3 py-2 pr-3 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRingClass} disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
        aria-label={ariaLabel}
      />
      {/* The custom button to trigger the date picker is removed to avoid the cross-origin error.
          Users can still click directly on the input field to open the native date picker. */}
      {/* <button
        type="button"
        onClick={handleIconClick}
        disabled={disabled}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Open date picker"
      >
        <CalendarIcon className="h-5 w-5" />
      </button> */}
    </div>
  );
};

export default DatePicker;