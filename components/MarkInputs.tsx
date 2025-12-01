import React from 'react';

interface MarkInputProps {
  boyId: string;
  isPresent: boolean;
  isLocked: boolean;
  accentRing: string;
}

interface CompanyMarkInputProps extends MarkInputProps {
  score: number | string;
  error?: string;
  onChange: (value: string) => void;
}

interface JuniorMarkInputProps extends MarkInputProps {
  uniform: number | string;
  behaviour: number | string;
  uniformError?: string;
  behaviourError?: string;
  onUniformChange: (value: string) => void;
  onBehaviourChange: (value: string) => void;
}

export const CompanyMarkInput: React.FC<CompanyMarkInputProps> = ({
  boyId,
  score,
  error,
  isPresent,
  isLocked,
  accentRing,
  onChange,
}) => (
  <div className="flex flex-col items-center">
    <input
      type="number"
      min="0"
      max="10"
      step="0.01"
      value={score}
      onChange={(e) => onChange(e.target.value)}
      disabled={!isPresent || isLocked}
      className={`w-20 text-center px-2 py-1 bg-white border rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${error ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
      placeholder="0-10"
      aria-label="Score"
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export const JuniorMarkInput: React.FC<JuniorMarkInputProps> = ({
  boyId,
  uniform,
  behaviour,
  uniformError,
  behaviourError,
  isPresent,
  isLocked,
  accentRing,
  onUniformChange,
  onBehaviourChange,
}) => (
  <div className="flex items-center space-x-2">
    <div className="flex flex-col items-center">
      <label htmlFor={`uniform-${boyId}`} className="block text-xs text-center text-slate-500">Uniform</label>
      <input
        id={`uniform-${boyId}`}
        type="number"
        min="0"
        max="10"
        step="0.01"
        value={uniform}
        onChange={(e) => onUniformChange(e.target.value)}
        disabled={!isPresent || isLocked}
        className={`w-16 text-center px-2 py-1 bg-white border rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${uniformError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
        placeholder="/10"
      />
      {uniformError && <p className="text-red-500 text-xs mt-1">{uniformError}</p>}
    </div>
    <div className="flex flex-col items-center">
      <label htmlFor={`behaviour-${boyId}`} className="block text-xs text-center text-slate-500">Behaviour</label>
      <input
        id={`behaviour-${boyId}`}
        type="number"
        min="0"
        max="5"
        step="0.01"
        value={behaviour}
        onChange={(e) => onBehaviourChange(e.target.value)}
        disabled={!isPresent || isLocked}
        className={`w-16 text-center px-2 py-1 bg-white border rounded-md shadow-sm focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${behaviourError ? 'border-red-500' : 'border-slate-300'} ${accentRing}`}
        placeholder="/5"
      />
      {behaviourError && <p className="text-red-500 text-xs mt-1">{behaviourError}</p>}
    </div>
  </div>
);