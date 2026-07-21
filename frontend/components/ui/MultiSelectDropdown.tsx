'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';

/**
 * Dropdown multiselect: click to open a searchable checklist, select any
 * number of predefined options, or type a value that isn't listed and add it
 * as a custom option. Selected values render as removable chips in the box.
 */
export default function MultiSelectDropdown({
  options,
  selected,
  onChange,
  max,
  label,
  hint,
  placeholder = 'Search or type to add…',
  id,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label: string;
  hint?: string;
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Custom values the lawyer typed in that weren't in the seeded list still
  // need to show up (checked) so they can be reviewed/removed like any other.
  const allOptions = useMemo(() => {
    const extra = selected.filter((s) => !options.some((o) => o.toLowerCase() === s.toLowerCase()));
    return [...options, ...extra];
  }, [options, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((o) => o.toLowerCase().includes(q));
  }, [allOptions, query]);

  const atMax = !!max && selected.length >= max;
  const exactMatch = allOptions.some((o) => o.toLowerCase() === query.trim().toLowerCase());
  const canAddCustom = query.trim().length > 0 && !exactMatch && !atMax;

  function toggle(value: string) {
    const on = selected.some((s) => s.toLowerCase() === value.toLowerCase());
    if (on) {
      onChange(selected.filter((s) => s.toLowerCase() !== value.toLowerCase()));
    } else if (!atMax) {
      onChange([...selected, value]);
    }
  }

  function addCustom() {
    const value = query.trim();
    if (!value || atMax) return;
    const existing = allOptions.find((o) => o.toLowerCase() === value.toLowerCase());
    toggle(existing ?? value);
    setQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) toggle(filtered[0]);
      else addCustom();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      onChange(selected.slice(0, -1));
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <span id={id ? `${id}-label` : undefined} className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label} <span className="text-rose-500">*</span>
        {hint && <span className="ml-1 font-medium normal-case text-slate-400">({hint})</span>}
      </span>

      <div
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        className={`flex min-h-[3rem] w-full flex-wrap items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm ${
          open ? 'border-gold ring-2 ring-amber-500/20' : 'border-gray-200'
        }`}
      >
        {selected.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-xs font-medium text-white">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={(e) => { e.stopPropagation(); toggle(v); }}
              className="rounded-full hover:text-gold"
            >
              <Icon name="xmark" className="text-[10px]" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          autoComplete="off"
          className="min-w-[6rem] flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          {filtered.length === 0 && !canAddCustom && (
            <p className="px-3.5 py-2 text-xs text-slate-400">No matches.</p>
          )}
          {filtered.map((o) => {
            const on = selected.some((s) => s.toLowerCase() === o.toLowerCase());
            const disabled = !on && atMax;
            return (
              <div
                key={o}
                role="option"
                aria-selected={on}
                onMouseDown={(e) => { e.preventDefault(); if (!disabled) toggle(o); }}
                className={`flex cursor-pointer items-center gap-2 px-3.5 py-2 text-sm ${
                  disabled ? 'cursor-not-allowed text-slate-300' : on ? 'bg-bg-soft text-navy' : 'text-slate-700 hover:bg-bg-soft'
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-navy bg-navy text-white' : 'border-gray-300'}`}>
                  {on && <Icon name="check" className="text-[10px]" />}
                </span>
                {o}
              </div>
            );
          })}
          {canAddCustom && (
            <div
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); addCustom(); }}
              className="flex cursor-pointer items-center gap-2 border-t border-gray-100 px-3.5 py-2 text-sm font-semibold text-gold hover:bg-bg-soft"
            >
              <Icon name="plus" className="text-xs" />
              Add &ldquo;{query.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
      {max && (
        <p className="mt-1 text-[11px] text-slate-400">{selected.length}/{max} selected</p>
      )}
    </div>
  );
}
