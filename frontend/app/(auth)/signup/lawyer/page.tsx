import type { Metadata } from 'next';
import Icon from '@/components/ui/Icon';
import AuthShell from '@/components/auth/AuthShell';
import SignupAside, { type SignupBenefit } from '@/components/auth/SignupAside';
import SignupForm from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up as a Lawyer | LawMitran',
  description: 'Join LawMitran as a Bar Council–verified advocate — receive client leads, build your profile, and grow your practice.',
};

const BENEFITS: SignupBenefit[] = [
  { icon: 'inbox', text: 'Receive verified client leads' },
  { icon: 'id-badge', text: 'Professional profile' },
  { icon: 'magnifying-glass', text: 'Practice area visibility' },
  { icon: 'location-dot', text: 'City listing' },
  { icon: 'gauge-high', text: 'Lead dashboard' },
  { icon: 'clock-rotate-left', text: 'Case reminder system' },
  { icon: 'shield-halved', text: 'Verification badge' },
  { icon: 'crown', text: 'Subscription plans' },
];

const PLANS: { name: string; blurb: string; feats: string[]; featured?: boolean }[] = [
  {
    name: 'Starter',
    blurb: 'Get listed & get discovered',
    feats: ['Verified public profile', 'Limited monthly leads', 'Standard lead routing'],
  },
  {
    name: 'Professional',
    blurb: 'Grow your practice faster',
    featured: true,
    feats: ['Everything in Starter', 'More client leads/month', 'Priority lead routing', 'Professional badge'],
  },
  {
    name: 'Premium',
    blurb: 'Maximum visibility & volume',
    feats: ['Everything in Professional', 'Unlimited client leads', 'Top search ranking', 'Premium badge & homepage'],
  },
];

function LawyerIllustration() {
  return (
    <svg viewBox="0 0 360 260" role="img" aria-labelledby="lawyer-illustration-title" className="h-auto w-full max-w-sm">
      <title id="lawyer-illustration-title">Illustration of a lawyer&apos;s practice growing with verified leads</title>
      <circle cx="180" cy="130" r="118" fill="#f5f7fb" />
      <circle cx="180" cy="130" r="118" fill="#e7d6a8" opacity="0.25" />

      {/* briefcase */}
      <rect x="96" y="120" width="120" height="80" rx="12" fill="#0b192c" />
      <rect x="132" y="100" width="48" height="26" rx="8" fill="none" stroke="#0b192c" strokeWidth="6" />
      <rect x="96" y="152" width="120" height="16" fill="#1e3e62" />
      <circle cx="156" cy="160" r="7" fill="#d4a017" />

      {/* gavel */}
      <g transform="translate(214 66) rotate(35)">
        <rect x="0" y="0" width="46" height="16" rx="4" fill="#d4a017" />
        <rect x="34" y="-8" width="16" height="46" rx="4" fill="#d4a017" />
      </g>

      {/* verification badge */}
      <circle cx="260" cy="176" r="26" fill="#d4a017" />
      <path d="m249 176 7 7 15-16" stroke="#0b192c" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* lead cards trailing in */}
      <rect x="60" y="70" width="30" height="20" rx="4" fill="#ffffff" stroke="#e6e9f0" strokeWidth="2" />
      <rect x="50" y="96" width="30" height="20" rx="4" fill="#ffffff" stroke="#e6e9f0" strokeWidth="2" />
    </svg>
  );
}

function PlanCards() {
  return (
    <div className="mt-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Plans built to grow with you</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-2xl bg-white p-5 shadow-sm ${
              p.featured ? 'border-2 border-gold shadow-md' : 'border border-line'
            }`}
          >
            {p.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-3 py-1 text-[10px] font-bold text-navy shadow">
                Most Popular
              </span>
            )}
            <h3 className="text-sm font-bold text-navy">{p.name}</h3>
            <p className="mt-1 text-[11px] text-slate-500">{p.blurb}</p>
            <ul className="mt-3 flex-1 space-y-1.5 text-[11px] text-slate-600">
              {p.feats.map((f) => (
                <li key={f} className="flex gap-1.5">
                  <span className="text-gold">
                    <Icon name="check" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        Pick your plan and see live pricing from your dashboard after your Bar Council verification is approved.
      </p>
    </div>
  );
}

export default function LawyerSignupPage() {
  return (
    <AuthShell
      aside={
        <SignupAside
          title="Grow Your Legal Practice"
          subtitle="Join India's growing legal marketplace."
          illustration={<LawyerIllustration />}
          benefits={BENEFITS}
        >
          <PlanCards />
        </SignupAside>
      }
    >
      <SignupForm
        role="LAWYER"
        heading="Create your lawyer account"
        subheading="Get discovered by clients looking for legal help."
        submitLabel="Create Lawyer Account"
      />
    </AuthShell>
  );
}
