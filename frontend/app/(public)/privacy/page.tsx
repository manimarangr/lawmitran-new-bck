import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/ui/Container';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export const metadata: Metadata = {
  title: 'Privacy Policy | LawMitran',
  description:
    'How LawMitran collects, uses, stores, and protects your personal data, and the choices you have — aligned with the DPDP Act, 2023.',
  alternates: { canonical: `${SITE_URL}/privacy` },
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 text-lg font-bold text-navy">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-slate-600">{children}</p>;
}

export default function PrivacyPage() {
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-gold">Home</Link> /{' '}
          <span className="text-slate-500">Privacy Policy</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-navy md:text-3xl">Privacy Policy</h1>
        <p className="mt-1 text-xs text-slate-400">Last updated: 18 July 2026</p>

        <H>1. What we collect</H>
        <P>
          Account data (name, email, mobile number, password hash); profile data for advocates
          (Bar Council enrolment number and state, practice details, office locations, uploaded
          certificate and photo); requirement details you submit to reach a lawyer; documents you
          generate or purchase; payment references from our payment gateway (we do not store card
          numbers); and technical data such as device, log, and usage information.
        </P>

        <H>2. Why we use it</H>
        <P>
          To operate the Platform: verifying advocates, routing your requirement to matching
          lawyers, generating documents, processing payments, sending service notifications (SMS,
          email, WhatsApp where opted in), preventing fraud and abuse, and improving the service.
          We process personal data on the basis of your consent and, where applicable, legitimate
          uses recognised under the Digital Personal Data Protection Act, 2023.
        </P>

        <H>3. What we share</H>
        <P>
          When you submit a requirement, its contents and your name are shared with matched,
          verified advocates; your contact details are revealed to an advocate only per the
          Platform&rsquo;s lead flow. We use service providers for hosting, storage, payments, SMS and
          email delivery, bound by contractual safeguards. We do not sell personal data. We may
          disclose data where required by law or to enforce our terms.
        </P>

        <H>4. Storage &amp; security</H>
        <P>
          Data is stored on servers located in India. Verification documents (Bar Council
          certificates, ID cards) are stored in private storage accessible only through
          authenticated, role-restricted endpoints. Passwords are hashed; refresh tokens are stored
          only as hashes; access is role-based. No system is perfectly secure — please use a strong,
          unique password.
        </P>

        <H>5. Your rights &amp; choices</H>
        <P>
          You can access and correct your data from your dashboard, withdraw marketing consent at
          any time, and delete your account from Settings (deactivation with retention only as
          required for legal and audit purposes). For any privacy request or complaint, contact our
          Grievance Officer via the{' '}
          <Link href="/grievance" className="font-semibold text-gold hover:underline">grievance page</Link>{' '}
          or email <a href="mailto:support@lawmitran.com" className="font-semibold text-gold hover:underline">support@lawmitran.com</a>.
          We respond within the timelines prescribed under applicable law.
        </P>

        <H>6. Cookies &amp; sessions</H>
        <P>
          We use strictly necessary storage (such as authentication tokens) to keep you signed in
          and remember preferences. We do not use third-party advertising cookies.
        </P>

        <H>7. Children</H>
        <P>The Platform is intended for users aged 18 and above.</P>

        <H>8. Changes</H>
        <P>
          We may update this policy from time to time; material changes will be notified on the
          Platform. Continued use after an update constitutes acceptance.
        </P>
      </div>
    </Container>
  );
}
