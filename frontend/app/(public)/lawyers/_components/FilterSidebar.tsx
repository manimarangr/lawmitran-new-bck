'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import { detectCity, saveCity } from '@/lib/geo';
import { fetchLocalities, type LocalityRef } from '@/lib/api/lawyers';
import type { SearchFilters } from '@/types/lawyer';

const schema = z.object({
  locality: z.string().optional(),
  language: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  ratingMin: z.string().optional(),
  experienceMin: z.string().optional(),
  experienceMax: z.string().optional(),
  sort: z.enum(['rating', 'experience', 'createdAt']).optional(),
});
type FormValues = z.infer<typeof schema>;

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'];

export function FilterSidebar({ variant = 'rail' }: { variant?: 'card' | 'rail' | 'map' }) {
  const { filters, setFilters, resetFilters } = useLawyerSearchStore();
  const [locating, setLocating] = useState(false);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: filters as FormValues,
  });

  // Metro-only locality list for the currently applied city. Empty for small
  // cities, which hides the locality filter entirely.
  const [localities, setLocalities] = useState<LocalityRef[]>([]);
  useEffect(() => {
    let alive = true;
    if (!filters.city) {
      setLocalities([]);
      return;
    }
    fetchLocalities(filters.city).then((list) => {
      if (alive) setLocalities(list);
    });
    return () => {
      alive = false;
    };
  }, [filters.city]);

  // Keep the form in sync when filters are seeded from URL params
  // (e.g. the homepage hero search: /lawyers?city=Chennai&practiceArea=...).
  useEffect(() => {
    reset(filters as FormValues);
  }, [filters, reset]);

  function onSubmit(data: FormValues) {
    // City & practice area live in the hero search card — preserve them here.
    const clean: SearchFilters = {};
    if (filters.city) clean.city = filters.city;
    if (filters.practiceArea) clean.practiceArea = filters.practiceArea;
    if (filters.city && data.locality) clean.locality = data.locality;
    if (data.language) clean.language = data.language;
    if (data.gender) clean.gender = data.gender;
    if (data.ratingMin) clean.ratingMin = parseFloat(data.ratingMin);
    if (data.experienceMin) clean.experienceMin = parseInt(data.experienceMin, 10);
    if (data.experienceMax) clean.experienceMax = parseInt(data.experienceMax, 10);
    if (data.sort) clean.sort = data.sort;
    setFilters(clean);
  }

  function handleReset() {
    reset({});
    resetFilters();
  }

  /** Browser location → nearest seeded city → applied to the search immediately. */
  async function useMyLocation() {
    setLocating(true);
    const city = await detectCity();
    setLocating(false);
    if (city) {
      saveCity(city);
      setFilters({ ...filters, city });
    }
  }

  return (
    <aside
      className={
        variant === 'card'
          ? 'rounded-2xl border border-gray-200/60 bg-white shadow-sm lg:sticky lg:top-24'
          : variant === 'map'
            ? 'w-full flex-shrink-0 border-b border-line bg-white'
            : 'w-72 shrink-0 overflow-y-auto border-r border-line bg-white'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy">Filters</h2>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Reset all
          </button>
        </div>

        <button
          type="button"
          onClick={() => void useMyLocation()}
          disabled={locating}
          className="text-xs font-semibold text-gold hover:underline disabled:opacity-60"
        >
          {locating ? 'Detecting your city…' : '📍 Use my location'}
        </button>

        {localities.length > 0 && (
          <Field label="Locality">
            <select {...register('locality')} className={inputCls}>
              <option value="">Anywhere in {filters.city}</option>
              {localities.map((l) => (
                <option key={l.id} value={l.slug}>{l.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Lawyers nearest this locality are shown first.
            </p>
          </Field>
        )}

        <Field label="Language">
          <select {...register('language')} className={inputCls}>
            <option value="">Any language</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Gender">
          <select {...register('gender')} className={inputCls}>
            <option value="">Any</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>

        <Field label="Minimum rating">
          <select {...register('ratingMin')} className={inputCls}>
            <option value="">Any rating</option>
            {[4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{'★'.repeat(r)} {r}+</option>
            ))}
          </select>
        </Field>

        <Field label="Experience (years)">
          <div className="flex gap-2">
            <input
              {...register('experienceMin')}
              type="number"
              min={0}
              placeholder="Min"
              aria-label="Minimum experience in years"
              className={`${inputCls} w-1/2`}
            />
            <input
              {...register('experienceMax')}
              type="number"
              min={0}
              placeholder="Max"
              aria-label="Maximum experience in years"
              className={`${inputCls} w-1/2`}
            />
          </div>
        </Field>

        <Field label="Sort by">
          <select {...register('sort')} className={inputCls}>
            <option value="createdAt">Newest</option>
            <option value="rating">Highest rated</option>
            <option value="experience">Most experienced</option>
          </select>
        </Field>

        <button
          type="submit"
          className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-2 transition-colors"
        >
          Apply filters
        </button>
      </form>
    </aside>
  );
}

const inputCls =
  'w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-gold focus:ring-1 focus:ring-gold';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
