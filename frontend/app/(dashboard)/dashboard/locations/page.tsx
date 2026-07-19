'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  addOffice,
  deleteOffice,
  fetchLocalities,
  getMyLocations,
  setServiceAreas,
  updateOffice,
  uploadOfficePhotos,
  type LocalityRef,
  type OfficeItem,
} from '@/lib/api/lawyers';
import CityInput from '@/components/ui/CityInput';
import Icon from '@/components/ui/Icon';

export default function LocationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-locations'], queryFn: getMyLocations });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // office form
  const [officeCity, setOfficeCity] = useState('');
  const [officeLabel, setOfficeLabel] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [officePincode, setOfficePincode] = useState('');
  const [officeLandmark, setOfficeLandmark] = useState('');
  const [officeLocality, setOfficeLocality] = useState('');
  const [localities, setLocalities] = useState<LocalityRef[]>([]);

  // service-area form
  const [areaCity, setAreaCity] = useState('');

  // Metro-only: locality dropdown appears when the typed city has localities.
  useEffect(() => {
    let alive = true;
    setOfficeLocality('');
    if (officeCity.trim().length < 3) {
      setLocalities([]);
      return;
    }
    const t = setTimeout(() => {
      fetchLocalities(officeCity.trim()).then((list) => {
        if (alive) setLocalities(list);
      });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [officeCity]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-locations'] });
  const clearMsgs = () => { setError(''); setNotice(''); };

  const addOfficeM = useMutation({
    mutationFn: () =>
      addOffice({
        city: officeCity,
        label: officeLabel || undefined,
        addressLine: officeAddress || undefined,
        pincode: officePincode || undefined,
        landmark: officeLandmark || undefined,
        localityId: officeLocality || undefined,
      }),
    onSuccess: () => {
      setOfficeCity(''); setOfficeLabel(''); setOfficeAddress('');
      setOfficePincode(''); setOfficeLandmark(''); setOfficeLocality('');
      setNotice('Office added.');
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const primaryM = useMutation({
    mutationFn: (o: OfficeItem) => updateOffice(o.id, { isPrimary: true }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const removeOfficeM = useMutation({
    mutationFn: (id: string) => deleteOffice(id),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const photosM = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => uploadOfficePhotos(id, files),
    onSuccess: () => { setNotice('Office photos updated.'); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const areasM = useMutation({
    mutationFn: (cities: string[]) => setServiceAreas(cities),
    onSuccess: () => { setAreaCity(''); setNotice('Service areas updated.'); invalidate(); },
    onError: (e: Error) => setError(e.message),
  });

  const areas = q.data?.serviceAreas ?? [];
  const cap = q.data?.maxServiceAreas ?? null;
  const atCap = cap !== null && areas.length >= cap;

  function addArea() {
    clearMsgs();
    const name = areaCity.trim();
    if (!name) return;
    if (areas.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setError('That city is already in your service areas');
      return;
    }
    areasM.mutate([...areas.map((a) => a.name), name]);
  }

  function removeArea(name: string) {
    clearMsgs();
    if (areas.length <= 1) {
      setError('Keep at least one service area — clients need to find you somewhere');
      return;
    }
    areasM.mutate(areas.filter((a) => a.name !== name).map((a) => a.name));
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-extrabold text-navy">Locations &amp; service areas</h1>
      <p className="mt-1 text-sm text-slate-500">
        Offices are where you sit; service areas are where you take clients from. You appear in
        search for every active service area.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
      {notice && !error && (
        <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>
      )}
      {q.isLoading && <p role="status" className="mt-4 text-sm text-slate-400">Loading…</p>}

      {/* ---- Service areas ---- */}
      <section aria-labelledby="areas-heading" className="mt-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 id="areas-heading" className="text-base font-bold text-navy">Service areas</h2>
          <span className={`text-xs font-bold ${atCap ? 'text-amber-600' : 'text-slate-400'}`}>
            {areas.length}{cap !== null ? ` / ${cap}` : ''} used
          </span>
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Cities where you receive leads. {cap !== null && (
            <>Your plan allows {cap}. <Link href="/dashboard/plan" className="font-semibold text-gold hover:underline">Upgrade for more.</Link></>
          )}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {areas.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-bg-soft px-3 py-1.5 text-sm font-semibold text-navy">
              <Icon name="location-dot" aria-hidden="true" className="text-gold" />
              {a.name}
              <button
                onClick={() => removeArea(a.name)}
                aria-label={`Remove ${a.name}`}
                className="ml-0.5 text-slate-400 hover:text-rose-500"
              >
                ✕
              </button>
            </span>
          ))}
          {areas.length === 0 && !q.isLoading && (
            <span className="text-sm text-slate-400">No service areas yet — add your first city below.</span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="area-city" className="sr-only">Add a service area city</label>
            <CityInput
              id="area-city"
              value={areaCity}
              onChange={(e) => setAreaCity(e.target.value)}
              placeholder={atCap ? 'Plan limit reached' : 'Add a city, e.g. Mysuru'}
              disabled={atCap}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none disabled:bg-slate-50"
            />
          </div>
          <button
            onClick={addArea}
            disabled={areasM.isPending || atCap || !areaCity.trim()}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Icon name="plus" aria-hidden="true" className="mr-1 text-xs" /> Add
          </button>
        </div>
      </section>

      {/* ---- Offices ---- */}
      <section aria-labelledby="offices-heading" className="mt-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 id="offices-heading" className="mb-1 text-base font-bold text-navy">Office locations</h2>
        <p className="mb-4 text-xs text-slate-400">
          Shown on your profile; the primary office sets your map pin and profile city.
        </p>

        <div className="space-y-3">
          {(q.data?.offices ?? []).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {o.label || 'Office'} · {o.city.name}
                  {o.isPrimary && (
                    <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">Primary</span>
                  )}
                </p>
                {(o.addressLine || o.pincode || o.landmark) && (
                  <p className="text-xs text-slate-400">
                    {[o.addressLine, o.landmark, o.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
                {(o.photoUrls?.length ?? 0) > 0 && (
                  <div className="mt-2 flex gap-2">
                    {o.photoUrls!.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt={`${o.label || 'Office'} photo`} className="h-12 w-12 rounded-lg object-cover ring-1 ring-gray-200" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <label className="cursor-pointer text-navy hover:text-gold">
                  {photosM.isPending && photosM.variables?.id === o.id ? 'Uploading…' : 'Photos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    aria-label={`Upload photos for ${o.label || 'office'} (max 3)`}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []).slice(0, 3);
                      if (files.some((f) => f.size > 2 * 1024 * 1024)) {
                        setError('Each office photo must be 2 MB or smaller.');
                        e.target.value = '';
                        return;
                      }
                      if (files.length) { clearMsgs(); photosM.mutate({ id: o.id, files }); }
                      e.target.value = '';
                    }}
                  />
                </label>
                {!o.isPrimary && (
                  <>
                    <button onClick={() => { clearMsgs(); primaryM.mutate(o); }} className="text-navy hover:text-gold">
                      Make primary
                    </button>
                    <button onClick={() => { clearMsgs(); removeOfficeM.mutate(o.id); }} className="text-rose-500 hover:underline">
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2">
          <div>
            <label htmlFor="office-city" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">City</label>
            <CityInput
              id="office-city"
              value={officeCity}
              onChange={(e) => setOfficeCity(e.target.value)}
              placeholder="e.g. Bengaluru"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          {localities.length > 0 && (
            <div>
              <label htmlFor="office-locality" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                Locality <span className="font-medium normal-case text-slate-400">(helps clients nearby find you)</span>
              </label>
              <select
                id="office-locality"
                value={officeLocality}
                onChange={(e) => setOfficeLocality(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
              >
                <option value="">— select locality —</option>
                {localities.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="office-label" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Label <span className="font-medium normal-case text-slate-400">(optional)</span>
            </label>
            <input
              id="office-label"
              value={officeLabel}
              onChange={(e) => setOfficeLabel(e.target.value)}
              placeholder="e.g. High Court chamber"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="office-address" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Address <span className="font-medium normal-case text-slate-400">(optional)</span>
            </label>
            <input
              id="office-address"
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              placeholder="Street, area"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="office-pincode" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              PIN code <span className="font-medium normal-case text-slate-400">(optional)</span>
            </label>
            <input
              id="office-pincode"
              inputMode="numeric"
              maxLength={6}
              value={officePincode}
              onChange={(e) => setOfficePincode(e.target.value.replace(/\D/g, ''))}
              placeholder="560001"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="office-landmark" className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Landmark <span className="font-medium normal-case text-slate-400">(optional)</span>
            </label>
            <input
              id="office-landmark"
              value={officeLandmark}
              onChange={(e) => setOfficeLandmark(e.target.value)}
              placeholder="Opp. Metro station"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
            />
          </div>
          <button
            onClick={() => { clearMsgs(); addOfficeM.mutate(); }}
            disabled={addOfficeM.isPending || !officeCity.trim()}
            className="rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 sm:col-span-2"
          >
            {addOfficeM.isPending ? 'Adding…' : 'Add office'}
          </button>
        </div>
      </section>
    </div>
  );
}
