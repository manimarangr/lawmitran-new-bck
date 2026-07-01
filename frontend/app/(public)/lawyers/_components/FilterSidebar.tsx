'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLawyerSearchStore } from '@/stores/lawyerSearchStore';
import type { SearchFilters } from '@/types/lawyer';

const schema = z.object({
  city: z.string().optional(),
  practiceArea: z.string().optional(),
  language: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  ratingMin: z.string().optional(),
  experienceMin: z.string().optional(),
  experienceMax: z.string().optional(),
  sort: z.enum(['rating', 'experience', 'createdAt']).optional(),
});
type FormValues = z.infer<typeof schema>;

const PRACTICE_AREAS = [
  'Family Law', 'Criminal Law', 'Civil Law', 'Corporate Law',
  'Property Law', 'Labour Law', 'Tax Law', 'Intellectual Property',
];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'];

export function FilterSidebar() {
  const { filters, setFilters, resetFilters } = useLawyerSearchStore();

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: filters as FormValues,
  });

  function onSubmit(data: FormValues) {
    const clean: SearchFilters = {};
    if (data.city) clean.city = data.city;
    if (data.practiceArea) clean.practiceArea = data.practiceArea;
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

  return (
    <aside className="w-72 shrink-0 border-r border-zinc-200 bg-white overflow-y-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Filters</h2>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Reset all
          </button>
        </div>

        <Field label="City">
          <input
            {...register('city')}
            placeholder="e.g. Chennai"
            className={inputCls}
          />
        </Field>

        <Field label="Practice Area">
          <select {...register('practiceArea')} className={inputCls}>
            <option value="">All areas</option>
            {PRACTICE_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>

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
              className={`${inputCls} w-1/2`}
            />
            <input
              {...register('experienceMax')}
              type="number"
              min={0}
              placeholder="Max"
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
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Apply filters
        </button>
      </form>
    </aside>
  );
}

const inputCls =
  'w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}
