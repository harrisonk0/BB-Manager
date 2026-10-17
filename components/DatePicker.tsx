import React from "react";
import "./staff/staff.css";

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
}) => {
  // The old inputRef/handleIconClick/showPicker path was removed because browsers blocked it inconsistently.

  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        disabled={disabled}
        className="bb-input staff-date-input"
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default DatePicker;
