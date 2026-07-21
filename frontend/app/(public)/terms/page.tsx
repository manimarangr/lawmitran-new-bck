import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/ui/Container';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export const metadata: Metadata = {
  title: 'Terms of Use | LawMitran',
  description:
    'Terms governing the use of LawMitran — an information platform for discovering Bar Council–verified advocates and legal documents in India.',
  alternates: { canonical: `${SITE_URL}/terms` },
};

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-8 text-lg font-bold text-navy">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-slate-600">{children}</p>;
}

export default function TermsPage() {
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-gold">Home</Link> /{' '}
          <span className="text-slate-500">Terms of Use</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-navy md:text-3xl">Terms of Use</h1>
        <p className="mt-1 text-xs text-slate-400">Last updated: 18 July 2026</p>

        <H>1. Who we are</H>
        <P>
          LawMitran (&ldquo;the Platform&rdquo;) is an information and discovery platform that helps
          users find Bar Council–verified advocates and purchase legal document templates in India.
          LawMitran is not a law firm, does not practise law, and does not provide legal advice.
          No advocate–client relationship is created by using the Platform.
        </P>

        <H>2. Acceptance of these terms</H>
        <P>
          By creating an account or using the Platform you agree to these Terms of Use and our{' '}
          <Link href="/privacy" className="font-semibold text-gold hover:underline">Privacy Policy</Link>.
          If you do not agree, please do not use the Platform.
        </P>

        <H>3. How the Platform works</H>
        <P>
          Clients may submit a legal requirement, which is shared with verified advocates matching
          the relevant practice area and location. The advocate contacts the client directly.
          LawMitran does not participate in, supervise, or guarantee any engagement between a client
          and an advocate, including fees, outcomes, or quality of service.
        </P>
        <P>
          Advocate listings are based on self-submitted information verified against Bar Council
          enrolment documents. Ratings and reviews reflect the opinions of users, not of LawMitran.
          In line with Bar Council of India rules, the Platform does not promote or advertise
          individual advocates; listings and rankings are neutral and criteria-based.
        </P>

        <H>4. Legal documents &amp; guides</H>
        <P>
          Document templates and legal guides are general-purpose informational material, not legal
          advice, and may not suit your specific facts. Laws, fees, and procedures change and vary
          by state. You are responsible for having documents reviewed by a qualified advocate before
          relying on them. Optional paid lawyer review, e-signature, and e-stamping services are
          facilitated through third parties and subject to their terms.
        </P>

        <H>5. Your account &amp; acceptable use</H>
        <P>
          You must provide accurate information, keep your credentials confidential, and be at least
          18 years old. You agree not to misuse the Platform — including posting false requirements,
          scraping data, impersonating others, uploading unlawful content, or attempting to
          circumvent security or payment systems. We may suspend accounts that violate these terms.
        </P>

        <H>6. Payments &amp; refunds</H>
        <P>
          Lawyer subscription fees and document purchase charges are stated before payment and are
          processed by third-party payment gateways. Except where required by law or expressly
          stated at the point of purchase, payments are non-refundable once the service or document
          has been delivered.
        </P>

        <H>7. Limitation of liability</H>
        <P>
          The Platform is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law,
          LawMitran is not liable for the acts or omissions of any advocate or user, for decisions
          taken in reliance on informational content, or for indirect or consequential loss. Our
          aggregate liability for any claim is limited to the amount you paid to LawMitran in the
          six months preceding the claim.
        </P>

        <H>8. Grievances &amp; governing law</H>
        <P>
          Complaints can be raised through the{' '}
          <Link href="/grievance" className="font-semibold text-gold hover:underline">grievance page</Link>.
          These terms are governed by the laws of India and subject to the jurisdiction of the
          courts at Chennai, Tamil Nadu.
        </P>

        <H>9. Changes</H>
        <P>
          We may update these terms from time to time. Continued use after an update constitutes
          acceptance. Material changes will be notified on the Platform.
        </P>
      </div>
    </Container>
  );
}
