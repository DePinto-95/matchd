'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string; // HH:MM
  onChange: (value: string) => void;
  label?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function parseValue(value: string): { hour: number; minute: number } | null {
  if (!value || value.length !== 5) return null;
  const [h, m] = value.split(':').map(Number);
  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;
  return { hour: h, minute: m };
}

export function TimePicker({ value, onChange, label }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const parsed = parseValue(value);
  const selectedHour = parsed?.hour ?? -1;
  const selectedMinute = parsed?.minute ?? -1;

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Scroll selected item into view when popup opens
  useEffect(() => {
    if (!open) return;
    // Slight delay so the DOM is rendered
    const id = setTimeout(() => {
      if (hourListRef.current && selectedHour >= 0) {
        const el = hourListRef.current.children[selectedHour] as HTMLElement;
        el?.scrollIntoView({ block: 'center' });
      }
      if (minuteListRef.current && selectedMinute >= 0) {
        const idx = Math.round(selectedMinute / 5);
        const el = minuteListRef.current.children[idx] as HTMLElement;
        el?.scrollIntoView({ block: 'center' });
      }
    }, 10);
    return () => clearTimeout(id);
  }, [open, selectedHour, selectedMinute]);

  const pickHour = (h: number) => {
    const m = selectedMinute >= 0 ? selectedMinute : 0;
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const pickMinute = (m: number) => {
    const h = selectedHour >= 0 ? selectedHour : 0;
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && <label className="text-sm font-medium text-text-muted">{label}</label>}
      <div className="relative">
        <input
          type="text"
          placeholder="HH:MM"
          maxLength={5}
          value={value}
          onChange={(e) => onChange(formatTimeInput(e.target.value))}
          onFocus={() => setOpen(true)}
          className="w-full px-4 py-2.5 pr-10 rounded-xl text-sm bg-surface-alt border border-border text-text placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand transition-colors"
        >
          <Clock className="w-4 h-4" />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-2 z-50 bg-surface border border-border rounded-2xl shadow-2xl p-4 w-44">
            <p className="text-xs font-semibold text-text-muted text-center mb-3">Pick a time</p>

            <div className="flex gap-2">
              {/* Hours column */}
              <div className="flex-1 flex flex-col">
                <p className="text-xs text-text-muted text-center mb-1.5">Hr</p>
                <div
                  ref={hourListRef}
                  className="overflow-y-auto h-36 flex flex-col gap-0.5 pr-0.5"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => pickHour(h)}
                      className={[
                        'w-full py-1.5 rounded-lg text-sm font-medium text-center transition-all shrink-0',
                        selectedHour === h
                          ? 'bg-brand text-white'
                          : 'hover:bg-surface-alt text-text',
                      ].join(' ')}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px bg-border self-stretch" />

              {/* Minutes column */}
              <div className="flex-1 flex flex-col">
                <p className="text-xs text-text-muted text-center mb-1.5">Min</p>
                <div
                  ref={minuteListRef}
                  className="overflow-y-auto h-36 flex flex-col gap-0.5 pl-0.5"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => pickMinute(m)}
                      className={[
                        'w-full py-1.5 rounded-lg text-sm font-medium text-center transition-all shrink-0',
                        selectedMinute === m
                          ? 'bg-brand text-white'
                          : 'hover:bg-surface-alt text-text',
                      ].join(' ')}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current selection display */}
            {parsed && (
              <p className="text-center text-brand font-bold text-base mt-3">
                {String(parsed.hour).padStart(2, '0')}:{String(parsed.minute).padStart(2, '0')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
