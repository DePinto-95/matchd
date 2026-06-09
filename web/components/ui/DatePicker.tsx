'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string; // DD/MM/YYYY
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseValue(value: string): Date | null {
  if (!value || value.length !== 10) return null;
  const [d, m, y] = value.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime()) || dt.getDate() !== d || dt.getMonth() !== m - 1) return null;
  return dt;
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '/';
    result += digits[i];
  }
  return result;
}

export function DatePicker({ value, onChange, label, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const parsed = parseValue(value);
    const base = parsed ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  const selectedDate = parseValue(value);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rawFirstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const firstDay = rawFirstDay === 0 ? 6 : rawFirstDay - 1; // Mon=0

  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day: number) => {
    const date = new Date(year, month, day);
    if (date < today || date > maxDate) return;
    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');
    onChange(`${dd}/${mm}/${year}`);
    setOpen(false);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && <label className="text-sm font-medium text-text-muted">{label}</label>}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder ?? 'DD/MM/YYYY'}
          maxLength={10}
          value={value}
          onChange={(e) => onChange(formatDateInput(e.target.value))}
          onFocus={() => setOpen(true)}
          className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm bg-surface-alt border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand transition-colors"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-2 z-50 bg-surface border border-border rounded-2xl shadow-2xl p-4 w-72">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors text-text-muted hover:text-text"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-text">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors text-text-muted hover:text-text"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-text-muted py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} />;
                const date = new Date(year, month, day);
                const disabled = date < today || date > maxDate;
                const selected = selectedDate?.getTime() === date.getTime();
                const isToday = date.getTime() === today.getTime();

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDay(day)}
                    className={[
                      'mx-auto flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all',
                      selected ? 'bg-brand text-white' : '',
                      isToday && !selected ? 'border border-brand text-brand' : '',
                      !selected && !isToday && !disabled ? 'hover:bg-surface-alt text-text cursor-pointer' : '',
                      disabled ? 'text-text-muted/25 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
