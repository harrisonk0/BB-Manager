"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isMatch } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  accentRingClass?: string; // Tailwind class for focus ring color
}

const DATE_FORMAT = 'yyyy-MM-dd';

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  disabled = false,
  ariaLabel = "Select date",
  accentRingClass = "focus:ring-junior-blue focus:border-junior-blue"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => {
    if (value && isMatch(value, DATE_FORMAT)) {
      return parseISO(value);
    }
    return undefined;
  }, [value]);

  const handleDayClick = useCallback((day: Date) => {
    onChange(format(day, DATE_FORMAT));
    setIsOpen(false);
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    // Only update if it matches the required format or is empty
    if (newDateStr === '' || isMatch(newDateStr, DATE_FORMAT)) {
      onChange(newDateStr);
    }
  }, [onChange]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine accent color for selected day based on active section
  const isCompany = localStorage.getItem('activeSection') === 'company';
  const accentBg = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
  const accentHoverBg = isCompany ? 'hover:bg-company-blue/90' : 'hover:bg-junior-blue/90';

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={DATE_FORMAT.toUpperCase()}
          disabled={disabled}
          className={`block w-36 px-3 py-2 pr-10 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm ${accentRingClass} disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-slate-700 disabled:opacity-50`}
          aria-label={isOpen ? "Close calendar" : "Open calendar"}
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full mt-2 right-0 z-50">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDayClick}
            showOutsideDays
            // Apply custom Tailwind classes to fully control styling
            classNames={{
              root: 'p-3 bg-white rounded-lg shadow-xl border border-slate-200',
              caption: 'flex justify-center py-2 mb-4 relative items-center',
              caption_label: 'text-sm font-medium text-slate-900',
              nav: 'flex items-center',
              nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse',
              head_row: 'flex font-medium text-slate-500 text-xs',
              head_cell: 'm-0.5 w-9 font-normal',
              row: 'flex w-full mt-1',
              cell: 'p-0.5 text-center text-sm',
              day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full transition-colors',
              day_selected: `${accentBg} text-white ${accentHoverBg} focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`,
              day_today: 'border border-blue-500 text-blue-500',
              day_outside: 'text-slate-400 opacity-50',
              day_disabled: 'text-slate-300 opacity-50 cursor-not-allowed',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DatePicker;