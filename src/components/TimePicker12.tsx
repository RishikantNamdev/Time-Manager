import React, { useState, useEffect } from 'react';
import { parse24To12, format12To24 } from '../utils/timeMath';
import { clsx } from 'clsx';

export interface TimePicker12Props {
  id?: string;
  idPrefix?: string;
  label?: string;
  value: string; // 24-hour 'HH:mm'
  onChange: (value24: string) => void;
}

export const TimePicker12: React.FC<TimePicker12Props> = ({ id, idPrefix, label = 'Time', value, onChange }) => {
  const baseId = idPrefix || id || 'time-picker';
  const { hour, minute, period } = parse24To12(value);
  const [hourInput, setHourInput] = useState<string>(hour.toString());
  const [minuteInput, setMinuteInput] = useState<string>(minute.toString().padStart(2, '0'));

  // Sync inputs when value changes externally (e.g. +15m, +30m, +1h buttons, initial load)
  useEffect(() => {
    const p = parse24To12(value);
    const curH = parseInt(hourInput, 10);
    const curM = parseInt(minuteInput, 10);

    if (p.hour !== curH) {
      setHourInput(p.hour.toString());
    }
    if (p.minute !== curM) {
      setMinuteInput(p.minute.toString().padStart(2, '0'));
    }
  }, [value]);

  const handlePeriodToggle = (newPeriod: 'AM' | 'PM') => {
    if (newPeriod === period) return;
    const currentH = Math.min(Math.max(parseInt(hourInput, 10) || hour, 1), 12);
    const currentM = Math.min(Math.max(parseInt(minuteInput, 10) || minute, 0), 59);
    onChange(format12To24(currentH, currentM, newPeriod));
  };

  const handleKeyDownCommon = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      handlePeriodToggle('AM');
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      handlePeriodToggle('PM');
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setHourInput('');
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;

    if (val > 12) {
      setHourInput('12');
      onChange(format12To24(12, minute, period));
    } else if (val === 0) {
      setHourInput('0');
    } else {
      setHourInput(val.toString());
      onChange(format12To24(val, minute, period));
    }
  };

  const handleHourBlur = () => {
    if (hourInput === '' || hourInput === '0') {
      setHourInput('12');
      onChange(format12To24(12, minute, period));
    } else {
      const val = parseInt(hourInput, 10);
      const clamped = Math.min(Math.max(val || 12, 1), 12);
      setHourInput(clamped.toString());
      onChange(format12To24(clamped, minute, period));
    }
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentH = parseInt(hourInput, 10) || hour;
      const nextH = currentH === 12 ? 1 : currentH + 1;
      setHourInput(nextH.toString());
      onChange(format12To24(nextH, minute, period));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentH = parseInt(hourInput, 10) || hour;
      const prevH = currentH === 1 ? 12 : currentH - 1;
      setHourInput(prevH.toString());
      onChange(format12To24(prevH, minute, period));
    } else {
      handleKeyDownCommon(e);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setMinuteInput('');
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;

    if (val > 59) {
      setMinuteInput('59');
      onChange(format12To24(hour, 59, period));
    } else if (val < 0) {
      setMinuteInput('00');
      onChange(format12To24(hour, 0, period));
    } else {
      setMinuteInput(raw);
      onChange(format12To24(hour, val, period));
    }
  };

  const handleMinuteBlur = () => {
    if (minuteInput === '') {
      setMinuteInput('00');
      onChange(format12To24(hour, 0, period));
    } else {
      const val = parseInt(minuteInput, 10);
      const clamped = Math.min(Math.max(val || 0, 0), 59);
      const padded = clamped.toString().padStart(2, '0');
      setMinuteInput(padded);
      onChange(format12To24(hour, clamped, period));
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const step = e.shiftKey ? 15 : 1;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentM = parseInt(minuteInput, 10) || minute;
      const nextM = (currentM + step) % 60;
      const padded = nextM.toString().padStart(2, '0');
      setMinuteInput(padded);
      onChange(format12To24(hour, nextM, period));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentM = parseInt(minuteInput, 10) || minute;
      const prevM = (currentM - step + 60) % 60;
      const padded = prevM.toString().padStart(2, '0');
      setMinuteInput(padded);
      onChange(format12To24(hour, prevM, period));
    } else {
      handleKeyDownCommon(e);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Time Digits Box */}
      <div className="flex items-center h-9 px-2 rounded-sm border border-hairline dark:border-slate-700 bg-canvas dark:bg-slate-800 focus-within:border-ink dark:focus-within:border-slate-400 transition-colors flex-1 justify-center shadow-level-1">
        <input
          id={baseId}
          type="number"
          min={1}
          max={12}
          step={1}
          aria-label={`${label} Hour`}
          value={hourInput}
          onFocus={(e) => e.target.select()}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          onKeyDown={handleHourKeyDown}
          className="w-8 text-center bg-transparent font-mono text-body-sm font-semibold text-ink dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-ink-mute dark:text-slate-400 font-mono font-bold select-none px-0.5 pb-0.5">:</span>
        <input
          id={`${baseId}-minute`}
          type="number"
          min={0}
          max={59}
          step={1}
          aria-label={`${label} Minute`}
          value={minuteInput}
          onFocus={(e) => e.target.select()}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
          onKeyDown={handleMinuteKeyDown}
          className="w-8 text-center bg-transparent font-mono text-body-sm font-semibold text-ink dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      {/* Segmented AM/PM Toggle Pill */}
      <div className="flex h-9 p-0.5 rounded-sm bg-canvas-soft-2 dark:bg-slate-800/80 border border-hairline dark:border-slate-700 select-none shadow-level-1">
        <button
          type="button"
          onClick={() => handlePeriodToggle('AM')}
          aria-label={`${label} AM`}
          className={clsx(
            'px-2.5 h-full text-xs font-semibold rounded-xs transition-all font-mono tracking-wider flex items-center justify-center',
            period === 'AM'
              ? 'bg-blue-600 text-white shadow-sm dark:bg-cyan-400 dark:text-gray-950 font-bold'
              : 'text-ink-mute hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => handlePeriodToggle('PM')}
          aria-label={`${label} PM`}
          className={clsx(
            'px-2.5 h-full text-xs font-semibold rounded-xs transition-all font-mono tracking-wider flex items-center justify-center',
            period === 'PM'
              ? 'bg-blue-600 text-white shadow-sm dark:bg-cyan-400 dark:text-gray-950 font-bold'
              : 'text-ink-mute hover:text-ink dark:text-slate-400 dark:hover:text-slate-200'
          )}
        >
          PM
        </button>
      </div>
    </div>
  );
};
