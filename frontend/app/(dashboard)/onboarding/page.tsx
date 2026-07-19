'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createLawyerProfile,
  fetchCourts,
  fetchLocalities,
  fetchLanguages,
  getMyProfile,
  updateMyProfile,
  updateOffice,
  updateProfilePhoto,
  type LocalityRef,
} from '@/lib/api/lawyers';
import { getPracticeAreas } from '@/lib/api/seo';
import CityInput from '@/components/ui/CityInput';
import OfficeMapPicker, { type OfficePoint } from '@/components/ui/OfficeMapPicker';
import Icon from '@/components/ui/Icon';

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];
const FALLBACK_AREAS = ['Family', 'Criminal', 'Property', 'Civil', 'Corporate', 'Consumer', 'Employment', 'Tax', 'Intellectual Property', 'Immigration'];
const MIN_AREAS = 2;
const MAX_AREAS = 5;
const FALLBACK_COURTS = [
  'District & Sessions Court',
  'Family Court',
  'Consumer Forum (DCDRC/SCDRC/NCDRC)',
  'Karnataka High Court',
  'Madras High Court',
  'Bombay High Court',
  'Delhi High Court',
  'Supreme Court of India',
];
const BIO_MIN = 50;
const BIO_MAX = 1000;

const inputClass = 'w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-gold focus:outline-none';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500';

function Chips({
  options,
  selected,
  onToggle,
  max,
  label,
  hint,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  max?: number;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label} <span className="text-rose-500">*</span>
        {hint && <span className="ml-1 font-medium normal-case text-slate-400">({hint})</span>}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          const full = !on && !!max && selected.length >= max;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              disabled={full}
              onClick={() => onToggle(o)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                on ? 'border-navy bg-navy text-white' : 'border-gray-200 text-slate-600 hover:border-gold disabled:opacity-40'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LawyerOnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ['my-lawyer-profile'], queryFn: getMyProfile });
  const existing = meQ.data ?? null;
  const editing = !!existing;
  const primaryOffice = existing?.offices?.find((o) => o.isPrimary) ?? existing?.offices?.[0];
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  // identity
  const [fullName, setFullName] = useState('');
  const [barNo, setBarNo] = useState('');
  const [state, setState] = useState('');
  const [exp, setExp] = useState('');
  const [cert, setCert] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  // practice
  const [city, setCity] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [courtSel, setCourtSel] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  // office
  const [officeLabel, setOfficeLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [point, setPoint] = useState<OfficePoint | null>(null);
  const [locality, setLocality] = useState('');
  const [localities, setLocalities] = useState<LocalityRef[]>([]);
  const [error, setError] = useState('');

  const areasQ = useQuery({ queryKey: ['practice-areas'], queryFn: getPracticeAreas, staleTime: 300_000 });
  const courtsQ = useQuery({ queryKey: ['courts'], queryFn: fetchCourts, staleTime: 300_000 });
  const langsQ = useQuery({ queryKey: ['languages'], queryFn: fetchLanguages, staleTime: 300_000 });

  const areaOptions = areasQ.data?.map((a) => a.name) ?? FALLBACK_AREAS;
  const courtOptions = courtsQ.data?.length ? courtsQ.data.map((c) => c.name) : FALLBACK_COURTS;
  const langOptions = langsQ.data?.map((l) => l.name) ?? ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu'];

  // Metro-only locality options for the chosen practice city.
  useEffect(() => {
    let alive = true;
    if (city.trim().length < 3) {
      setLocalities([]);
      return;
    }
    const t = setTimeout(() => {
      fetchLocalities(city.trim()).then((list) => {
        if (alive) {
          setLocalities(list);
          if (!list.some((l) => l.id === locality)) setLocality('');
        }
      });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(existing?.profileImageUrl ?? '');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, existing]);

  // Edit mode: populate the form from the saved profile once.
  useEffect(() => {
    if (!existing || loaded) return;
    setLoaded(true);
    setFullName(existing.fullName);
    setBarNo(existing.barCouncilNumber ?? '');
    setState(existing.barCouncilState);
    setExp(String(existing.experienceYears));
    setCity(existing.city?.name ?? '');
    setAreas(existing.practiceAreas.map((a) => a.practiceArea.name));
    setLangs(existing.languages.map((l) => l.language.name));
    setCourtSel(existing.courts.map((c) => c.court.name));
    setBio(existing.bio ?? '');
    const office = existing.offices?.find((o) => o.isPrimary) ?? existing.offices?.[0];
    if (office) {
      setOfficeLabel(office.label ?? '');
      setAddressLine(office.addressLine ?? '');
      setPincode(office.pincode ?? '');
      setLandmark(office.landmark ?? '');
      setLocality(office.locality?.id ?? '');
      if (office.latitude != null && office.longitude != null) {
        setPoint({ lat: office.latitude, lng: office.longitude });
      }
    }
  }, [existing, loaded]);

  // Edit mode: photo replaces immediately (create mode uploads with the form).
  const photoM = useMutation({
    mutationFn: (file: File) => updateProfilePhoto(file),
    onSuccess: () => {
      setNotice('Photo updated.');
      qc.invalidateQueries({ queryKey: ['my-lawyer-profile'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const m = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateMyProfile({
          fullName,
          barCouncilNumber: barNo,
          barCouncilState: state,
          experienceYears: Number(exp),
          bio: bio.trim(),
          practiceAreas: areas,
          languages: langs,
          courts: courtSel,
        });
        if (primaryOffice) {
          await updateOffice(primaryOffice.id, {
            label: officeLabel.trim() || undefined,
            addressLine: addressLine.trim() || undefined,
            pincode: pincode.trim() || undefined,
            landmark: landmark.trim() || undefined,
            localityId: locality || undefined,
            latitude: point?.lat,
            longitude: point?.lng,
          });
        }
        return null;
      }
      return createLawyerProfile({
        fullName,
        barCouncilNumber: barNo,
        barCouncilState: state,
        experienceYears: Number(exp),
        city,
        practiceAreas: areas,
        certificate: cert as File,
        photo: photo as File,
        bio: bio.trim(),
        languages: langs,
        courts: courtSel,
        addressLine: addressLine.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim() || undefined,
        localityId: locality || undefined,
        officeLabel: officeLabel.trim() || undefined,
        latitude: point!.lat,
        longitude: point!.lng,
      });
    },
    onSuccess: () => {
      if (editing) {
        setNotice('Profile updated.');
        qc.invalidateQueries({ queryKey: ['my-lawyer-profile'] });
      } else {
        // Straight to plans: subscribing while pending puts you in the priority review queue.
        router.push('/dashboard/plan');
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, max?: number) => (v: string) =>
    setter((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : !max || prev.length < max ? [...prev, v] : prev,
    );

  function submit() {
    setError('');
    setNotice('');
    if (!fullName || !barNo || !state || !exp) return setError('Please fill your name, enrollment number, state, and experience.');
    if (!editing) {
      if (!photo) return setError('Upload your profile photo.');
      if (!photo.type.startsWith('image/')) return setError('Profile photo must be an image (JPG/PNG/WebP).');
      if (!cert) return setError('Upload your Bar Council ID card.');
      if (!city) return setError('Choose your primary city from the suggestions.');
    }
    if (areas.length < MIN_AREAS) return setError(`Pick at least ${MIN_AREAS} areas of practice.`);
    if (courtSel.length === 0) return setError('Pick at least one court you practise in.');
    if (langs.length === 0) return setError('Pick at least one language.');
    if (bio.trim().length < BIO_MIN) return setError(`Write a short bio of at least ${BIO_MIN} characters.`);
    if (addressLine.trim().length < 5) return setError('Enter your office address.');
    if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) return setError('Enter a valid 6-digit PIN code.');
    if (!editing && !point) return setError('Set your office location on the map (search, use my location, or drag the pin).');
    m.mutate();
  }

  const bioLen = bio.trim().length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-extrabold text-navy">{editing ? 'My profile' : 'Complete your lawyer profile'}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {editing
          ? 'Update your practice details — changes to your name or enrollment may trigger a fresh review.'
          : "Submit your Bar Council details, photo, and practice info for verification. You'll go live once approved."}
      </p>

      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      {notice && !error && <p role="status" className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

      {/* ===== identity & verification ===== */}
      <div className="mt-6 space-y-4 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-navy">Identity & verification</h2>

        <div className="flex items-start gap-4">
          {/* profile photo */}
          <label className="group relative block h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 hover:border-gold">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Profile photo preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                <Icon name="camera" aria-hidden="true" className="text-xl" />
                <span className="mt-1 text-[10px] font-semibold">Photo *</span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              aria-label={editing ? 'Replace profile photo' : 'Upload profile photo (required)'}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 2 * 1024 * 1024) {
                  setError('Photo is too large — maximum size is 2 MB.');
                  e.target.value = '';
                  return;
                }
                if (editing) {
                  if (f) { setError(''); photoM.mutate(f); }
                  e.target.value = '';
                } else {
                  setError('');
                  setPhoto(f);
                }
              }}
            />
          </label>
          <div className="flex-1">
            <label htmlFor="ob-fullName" className={labelClass}>Full name (as per Bar Council) <span className="text-rose-500">*</span></label>
            <input id="ob-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Adv. Full Name" />
            <p className="mt-1.5 text-[11px] text-slate-400">
              {editing
                ? photoM.isPending ? 'Uploading photo…' : 'Click the photo to replace it — saved immediately.'
                : 'A clear headshot builds client trust — JPG/PNG, max 5MB.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ob-barNo" className={labelClass}>Enrollment No. <span className="text-rose-500">*</span></label>
            <input id="ob-barNo" value={barNo} onChange={(e) => setBarNo(e.target.value)} className={inputClass} placeholder="KAR/1234/2010" />
          </div>
          <div>
            <label htmlFor="ob-state" className={labelClass}>Bar Council State <span className="text-rose-500">*</span></label>
            <select id="ob-state" value={state} onChange={(e) => setState(e.target.value)} className={`${inputClass} bg-white`}>
              <option value="">Select</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ob-exp" className={labelClass}>Experience (yrs) <span className="text-rose-500">*</span></label>
            <input id="ob-exp" type="number" min={0} max={60} value={exp} onChange={(e) => setExp(e.target.value)} className={inputClass} placeholder="12" />
          </div>
          <div>
            <label className={labelClass}>Bar Council ID card <span className="text-rose-500">*</span></label>
            {editing ? (
              <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-center text-xs font-semibold text-green-700">
                <Icon name="circle-check" aria-hidden="true" className="mr-1" /> Uploaded — replaceable if rejected
              </p>
            ) : (
              <label className="block cursor-pointer truncate rounded-xl border-2 border-dashed border-gray-200 px-3 py-3 text-center text-xs text-slate-500 hover:border-gold">
                {cert ? cert.name : 'Upload (PDF/JPG/PNG)'}
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setCert(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ===== practice & work ===== */}
      <div className="mt-5 space-y-5 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-navy">Practice & work</h2>

        <Chips label="Areas of practice" hint={`pick ${MIN_AREAS}–${MAX_AREAS}`} options={areaOptions} selected={areas} onToggle={toggle(setAreas, MAX_AREAS)} max={MAX_AREAS} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ob-city" className={labelClass}>Primary city <span className="text-rose-500">*</span></label>
            <CityInput
              id="ob-city"
              value={city}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value)}
              placeholder="Start typing — e.g. Bengaluru"
              disabled={editing}
              className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
            />
            {editing && (
              <p className="mt-1.5 text-[11px] text-slate-400">
                City & offices are managed in{' '}
                <Link href="/dashboard/locations" className="font-semibold text-gold hover:underline">Locations &amp; service areas</Link>.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ob-office-label" className={labelClass}>Office label <span className="font-medium normal-case text-slate-400">(optional)</span></label>
            <input id="ob-office-label" value={officeLabel} onChange={(e) => setOfficeLabel(e.target.value)} className={inputClass} placeholder="Main office / HC chamber" />
          </div>
        </div>

        <Chips label="Courts you practise in" hint="pick all that apply" options={courtOptions} selected={courtSel} onToggle={toggle(setCourtSel)} />

        <Chips label="Languages" hint="pick all you consult in" options={langOptions} selected={langs} onToggle={toggle(setLangs)} />

        <div>
          <label htmlFor="ob-bio" className={labelClass}>
            Short bio <span className="text-rose-500">*</span>{' '}
            <span aria-live="polite" className={`float-right font-medium normal-case ${bioLen < BIO_MIN ? 'text-amber-600' : 'text-green-600'}`}>
              {bioLen}/{BIO_MAX}{bioLen < BIO_MIN ? ` — at least ${BIO_MIN}` : ''}
            </span>
          </label>
          <textarea
            id="ob-bio"
            rows={4}
            maxLength={BIO_MAX}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Describe your practice and approach — clients read this first…"
          />
        </div>
      </div>

      {/* ===== office location ===== */}
      <div className="mt-5 space-y-4 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-navy">Office address</h2>

        <div>
          <label htmlFor="ob-address" className={labelClass}>Address line <span className="text-rose-500">*</span></label>
          <input id="ob-address" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className={inputClass} placeholder="12, MG Road, 2nd floor" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ob-pincode" className={labelClass}>PIN code <span className="text-rose-500">*</span></label>
            <input id="ob-pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} className={inputClass} placeholder="560001" />
          </div>
          <div>
            <label htmlFor="ob-landmark" className={labelClass}>Landmark <span className="font-medium normal-case text-slate-400">(optional)</span></label>
            <input id="ob-landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} className={inputClass} placeholder="Opp. Metro station" />
          </div>
        </div>

        {localities.length > 0 && (
          <div>
            <label htmlFor="ob-locality" className={labelClass}>
              Locality <span className="font-medium normal-case text-slate-400">(optional — helps nearby clients find you)</span>
            </label>
            <select
              id="ob-locality"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className={inputClass}
            >
              <option value="">— select locality —</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        <OfficeMapPicker value={point} onChange={setPoint} searchHint={city || undefined} />
      </div>

      <button onClick={submit} disabled={m.isPending} className="mt-6 w-full rounded-xl bg-gold py-3 text-sm font-bold text-navy hover:bg-[#b58f3f] disabled:opacity-60">
        {m.isPending ? 'Saving…' : editing ? 'Save changes' : 'Submit for verification'}
      </button>
      {!editing && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          <Icon name="shield-halved" aria-hidden="true" className="mr-1 text-gold" />
          Our team verifies your ID card against the enrollment number before your profile goes live.
        </p>
      )}
    </div>
  );
}
