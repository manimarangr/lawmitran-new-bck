import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { API_BASE } from '@/lib/api/base';

export const metadata: Metadata = {
  title: 'Grievance Redressal | LawMitran',
  description:
    'Grievance officer contact and redressal process for the LawMitran platform, as required under the Information Technology Rules, 2021.',
};

export const revalidate = 3600;

async function getOfficer(): Promise<{ name: string | null; email: string }> {
  try {
    const res = await fetch(`${API_BASE}/contact/grievance`, {
      next: { revalidate: 3600 },
      // Build-time safety: a black-holed API must not stall prerendering.
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) return (await res.json()) as { name: string | null; email: string };
  } catch {
    /* backend down — fall through to defaults */
  }
  return { name: null, email: 'support@lawmitran.com' };
}

export default async function GrievancePage() {
  const officer = await getOfficer();
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-extrabold text-navy">Grievance Redressal</h1>
      <p className="mt-2 text-sm text-slate-500">
        Published in compliance with the Information Technology (Intermediary Guidelines and
        Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023.
      </p>

      <section className="mt-8 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-navy">Grievance Officer</h2>
        <div className="mt-3 space-y-1.5 text-sm text-slate-600">
          <p>
            <Icon name="user" aria-hidden="true" className="mr-2 text-gold" />
            {officer.name ?? 'Grievance Officer, LawMitran'}
          </p>
          <p>
            <Icon name="envelope" aria-hidden="true" className="mr-2 text-gold" />
            <a href={`mailto:${officer.email}`} className="font-semibold text-navy hover:text-gold">{officer.email}</a>
          </p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Complaints are acknowledged within <b>24 hours</b> and resolved within <b>15 days</b> of
          receipt. Please include your registered email/mobile and a description of the issue.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm text-sm leading-relaxed text-slate-600">
        <h2 className="mb-3 text-lg font-bold text-navy">What you can raise</h2>
        <p>
          Content or listings that violate the law or our terms, misuse of your personal data
          (including access, correction, and erasure requests under the DPDP Act), billing
          disputes, and complaints about conduct on the platform. For general help, the{' '}
          <Link href="/contact" className="font-semibold text-gold hover:underline">contact form</Link>{' '}
          is the fastest route — grievances raised there are tracked with the same timelines.
        </p>
      </section>
    </div>
  );
}
