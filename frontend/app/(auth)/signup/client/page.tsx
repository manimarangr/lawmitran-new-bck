import type { Metadata } from 'next';
import AuthShell from '@/components/auth/AuthShell';
import SignupAside, { type SignupBenefit } from '@/components/auth/SignupAside';
import SignupForm from '@/components/auth/SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up as a Client | LawMitran',
  description: 'Create a free LawMitran account to find verified lawyers, submit legal requirements, and track your requests.',
};

const BENEFITS: SignupBenefit[] = [
  { icon: 'user-check', text: 'Verified Lawyers' },
  { icon: 'file-invoice', text: 'Submit legal requirements for free' },
  { icon: 'tags', text: 'Compare advocates' },
  { icon: 'list-check', text: 'Track legal requests' },
  { icon: 'bookmark', text: 'Save favourite lawyers' },
  { icon: 'folder-open', text: 'Legal documents' },
  { icon: 'circle-question', text: 'Easy legal guides' },
  { icon: 'shield-halved', text: 'Secure & Confidential' },
];

function ClientIllustration() {
  return (
    <svg viewBox="0 0 360 260" role="img" aria-labelledby="client-illustration-title" className="h-auto w-full max-w-sm">
      <title id="client-illustration-title">Illustration of a client searching for a verified lawyer</title>
      <circle cx="180" cy="130" r="118" fill="#f5f7fb" />
      <circle cx="180" cy="130" r="118" fill="#e7d6a8" opacity="0.25" />

      {/* profile card */}
      <rect x="70" y="66" width="150" height="128" rx="14" fill="#ffffff" stroke="#e6e9f0" strokeWidth="2" />
      <circle cx="104" cy="104" r="16" fill="#0b192c" />
      <rect x="130" y="96" width="70" height="8" rx="4" fill="#0b192c" />
      <rect x="130" y="110" width="50" height="6" rx="3" fill="#e6e9f0" />
      <rect x="88" y="136" width="114" height="6" rx="3" fill="#e6e9f0" />
      <rect x="88" y="150" width="90" height="6" rx="3" fill="#e6e9f0" />
      <rect x="88" y="170" width="60" height="18" rx="9" fill="#d4a017" />

      {/* verified badge */}
      <circle cx="222" cy="80" r="20" fill="#d4a017" />
      <path d="m213 80 6 6 12-13" stroke="#0b192c" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* magnifying glass */}
      <circle cx="252" cy="168" r="30" fill="#ffffff" stroke="#0b192c" strokeWidth="6" />
      <line x1="273" y1="189" x2="296" y2="212" stroke="#0b192c" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export default function ClientSignupPage() {
  return (
    <AuthShell
      aside={
        <SignupAside
          title="Find the Right Lawyer, Without the Hassle"
          subtitle="Join thousands of users finding verified legal professionals across India."
          illustration={<ClientIllustration />}
          benefits={BENEFITS}
        />
      }
    >
      <SignupForm
        role="CLIENT"
        heading="Create your account"
        subheading="Find verified lawyers and track your legal requirements."
        submitLabel="Create Account"
      />
    </AuthShell>
  );
}
