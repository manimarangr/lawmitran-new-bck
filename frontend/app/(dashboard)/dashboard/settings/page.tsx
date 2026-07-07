'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  changePassword,
  deleteAccount,
  getMe,
  requestMobileChange,
  uploadAvatar,
  verifyMobileChange,
} from '@/lib/api/users';
import { clearSession } from '@/lib/api/client';

function Notice({ ok, msg }: { ok: boolean; msg: string }) {
  if (!msg) return null;
  return (
    <p className={`mt-2 text-xs ${ok ? 'text-green-600' : 'text-rose-600'}`}>{msg}</p>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const meQ = useQuery({ queryKey: ['me'], queryFn: getMe });

  // password
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const pwM = useMutation({ mutationFn: () => changePassword(cur, nw) });

  // mobile change
  const [newMobile, setNewMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const sendM = useMutation({
    mutationFn: () => requestMobileChange(newMobile),
    onSuccess: () => setOtpSent(true),
  });
  const verifyM = useMutation({
    mutationFn: () => verifyMobileChange(otp),
    onSuccess: () => { setOtpSent(false); meQ.refetch(); },
  });

  // avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarM = useMutation({ mutationFn: (f: File) => uploadAvatar(f) });

  // delete
  const [confirm, setConfirm] = useState('');
  const delM = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => { clearSession(); router.replace('/login'); },
  });

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-extrabold text-[#0B192C]">Account settings</h1>

      {/* avatar */}
      <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-[#0B192C]">Profile picture</h2>
        <div className="flex items-center gap-5">
          <div
            className="h-20 w-20 rounded-2xl bg-[#0B192C] bg-cover bg-center"
            style={avatarPreview ? { backgroundImage: `url(${avatarPreview})` } : undefined}
          />
          <label className="cursor-pointer rounded-xl bg-[#0B192C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Upload photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setAvatarPreview(URL.createObjectURL(f));
                avatarM.mutate(f);
              }}
            />
          </label>
        </div>
        <Notice ok={avatarM.isSuccess} msg={avatarM.isSuccess ? 'Photo updated.' : avatarM.isError ? 'Upload failed.' : ''} />
      </section>

      {/* password */}
      <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-[#0B192C]">Change password</h2>
        <div className="space-y-3">
          <input type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none" />
          <input type="password" placeholder="New password (min 8)" value={nw} onChange={(e) => setNw(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none" />
          <button onClick={() => pwM.mutate()} disabled={pwM.isPending || nw.length < 8 || !cur} className="rounded-xl bg-[#0B192C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Update password</button>
          <Notice ok={pwM.isSuccess} msg={pwM.isSuccess ? 'Password updated. Sign in again on other devices.' : pwM.isError ? (pwM.error as Error).message : ''} />
        </div>
      </section>

      {/* mobile change */}
      <section className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-[#0B192C]">Change mobile number</h2>
        <p className="mb-4 text-xs text-slate-400">Current: <span className="font-semibold text-slate-600">+91 {meQ.data?.mobile ?? '…'}</span></p>
        {!otpSent ? (
          <div className="flex gap-2">
            <input type="tel" inputMode="numeric" maxLength={10} placeholder="New 10-digit number" value={newMobile} onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="flex-1 rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none" />
            <button onClick={() => sendM.mutate()} disabled={sendM.isPending || !/^[6-9]\d{9}$/.test(newMobile)} className="rounded-xl bg-[#C9A24B] px-4 py-2.5 text-sm font-bold text-[#0B192C] hover:bg-[#b58f3f] disabled:opacity-50">Send OTP</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Enter the 6-digit code sent to <span className="font-semibold">+91 {newMobile}</span>.</p>
            <div className="flex gap-2">
              <input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="flex-1 rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-[#C9A24B] focus:outline-none" />
              <button onClick={() => verifyM.mutate()} disabled={verifyM.isPending || otp.length !== 6} className="rounded-xl bg-[#0B192C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">Verify</button>
              <button onClick={() => setOtpSent(false)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            </div>
          </div>
        )}
        <Notice ok={verifyM.isSuccess} msg={verifyM.isSuccess ? 'Mobile number updated.' : (sendM.isError || verifyM.isError) ? ((sendM.error || verifyM.error) as Error).message : ''} />
      </section>

      {/* delete */}
      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-rose-600">Delete account</h2>
        <p className="mb-4 text-sm text-slate-500">This deactivates your account and signs you out everywhere. Type <b>DELETE</b> to confirm.</p>
        <div className="flex gap-2">
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className="flex-1 rounded-xl border border-gray-200 px-3.5 py-3 text-sm focus:border-rose-400 focus:outline-none" />
          <button onClick={() => delM.mutate()} disabled={confirm !== 'DELETE' || delM.isPending} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40">Delete forever</button>
        </div>
      </section>
    </main>
  );
}
