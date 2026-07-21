import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export const metadata: Metadata = {
  title: 'FAQ — Payments, Subscriptions & How LawMitran Works',
  description:
    'Answers to common questions about LawMitran: payments and subscriptions for lawyers, finding a lawyer as a client, verification, legal documents, and privacy.',
  alternates: { canonical: `${SITE_URL}/faq` },
};

interface Faq {
  q: string;
  a: string;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  faqs: Faq[];
}

const CATEGORIES: Category[] = [
  {
    id: 'payments',
    title: 'Payments & Subscription',
    icon: 'tags',
    faqs: [
      {
        q: 'Is LawMitran free for clients?',
        a: 'Yes — completely. Searching lawyers, viewing profiles, and submitting your legal requirement costs nothing. You never pay LawMitran; you engage the lawyer directly and any professional fee is between you and them.',
      },
      {
        q: 'What do lawyers pay for?',
        a: 'Lawyers subscribe to receive client leads and reveal client contact details. There are two plans: Basic (verified profile, up to 25 leads a month, standard routing) and Premium (unlimited leads, priority routing, top search ranking, Premium badge).',
      },
      {
        q: 'Is there a free trial for lawyers?',
        a: 'Yes. Every newly verified lawyer gets a 30-day free trial with full access — you receive leads and can reveal client contacts without paying. After the trial you pick a plan to continue.',
      },
      {
        q: 'What subscription durations are available?',
        a: 'Plans are available for 30 days, 3 months, 6 months, and 1 year — longer terms are discounted. The exact prices are always shown on the Plans page before you pay, and durations may be updated from time to time.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Payments are processed securely by Razorpay, which supports UPI (Google Pay, PhonePe, Paytm), credit and debit cards, and net banking. LawMitran never sees or stores your card or UPI details.',
      },
      {
        q: 'Is GST charged on subscriptions?',
        a: 'Yes, 18% GST applies on the plan price. The total including GST is shown before checkout, and a GST invoice is emailed to you after payment.',
      },
      {
        q: 'Do you run discounts or offers?',
        a: 'Yes — seasonal offers (for example around Diwali, Pongal, Christmas, or Republic Day) are applied automatically at checkout while they run. When an offer is live you will see the discounted price with the original struck through on the Plans page; there are no coupon codes to type.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'You can cancel anytime from your dashboard (Subscription → Manage plan). Subscriptions are billed for a fixed period and do not auto-renew silently; cancelling stops the plan at the end of the paid period.',
      },
      {
        q: 'What happens when my subscription expires?',
        a: 'Your public profile stays visible in search, but you stop receiving new leads and cannot reveal client contact details until you subscribe again. Any leads already revealed remain accessible.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Refunds are governed by our Refund & Cancellation Policy. In short: duplicate or failed payments are refunded in full, and other cases are reviewed individually. Write to support@lawmitran.com with your payment reference and we will respond within 2 business days.',
      },
      {
        q: 'My payment failed but money was deducted. What do I do?',
        a: 'Failed payments are usually auto-reversed by your bank within 5–7 business days. If your subscription did not activate and the amount was not reversed in that window, email support@lawmitran.com with the Razorpay payment ID from your bank statement and we will trace it.',
      },
    ],
  },
  {
    id: 'clients',
    title: 'For Clients',
    icon: 'users',
    faqs: [
      {
        q: 'How do I find a lawyer on LawMitran?',
        a: 'Search by practice area and city, or browse the map. Every listed lawyer is Bar Council–verified. When you find a match, submit your requirement — the lawyer receives it as a lead and contacts you directly.',
      },
      {
        q: 'Does LawMitran schedule consultations?',
        a: 'No. LawMitran is a discovery platform, not a booking service. After you submit a requirement, the lawyer reaches out to you directly by phone or email, and you take it from there — timing, mode, and fees are between you and the lawyer.',
      },
      {
        q: 'How quickly will a lawyer contact me?',
        a: 'Most clients hear back within a few hours, and typically within 1–2 business days. If nobody has contacted you, you can withdraw the requirement and submit to another lawyer.',
      },
      {
        q: 'Are the fees shown on profiles final?',
        a: 'Fees shown are indicative. The lawyer confirms their actual fee when they contact you, based on the specifics of your matter. You are never obliged to proceed.',
      },
      {
        q: 'Can I rate a lawyer?',
        a: 'Yes — after a lawyer has contacted you about your requirement, you can rate and review the interaction. Ratings feed the scores you see on profiles and our annual awards, so honest feedback helps everyone.',
      },
      {
        q: 'What if a lawyer behaves unprofessionally?',
        a: 'Use the "Report" option on the requirement or profile. Reports go to our moderation team, are confidential, and can lead to suspension. Both sides can report — lawyers can also report spam or abusive enquiries.',
      },
    ],
  },
  {
    id: 'lawyers',
    title: 'For Lawyers',
    icon: 'briefcase',
    faqs: [
      {
        q: 'How do I join LawMitran as a lawyer?',
        a: 'Sign up with the "I am a lawyer" option, verify your mobile via OTP, then complete your profile: Bar Council enrollment number and state, experience, city, practice areas, and your Bar Council ID card. Our team reviews and approves it, usually within 1–2 business days.',
      },
      {
        q: 'How do leads work?',
        a: 'When a client in your city submits a requirement in one of your practice areas, it lands in your lead inbox. You reveal the client’s contact details (subscription or trial required) and reach out directly. Mark leads contacted or closed to keep your inbox organised.',
      },
      {
        q: 'What is the difference between Basic and Premium?',
        a: 'Basic keeps you listed and routes up to 25 leads a month. Premium adds unlimited leads, priority routing (you are matched first), top placement in search results, a Premium badge, and homepage featuring.',
      },
      {
        q: 'How are the lawyer awards decided?',
        a: 'Awards like Client’s Choice, Top Responder, and Rising Star are computed automatically each year from real data — client ratings and lead responsiveness. They cannot be bought or self-assigned, and the criteria are public.',
      },
      {
        q: 'Why am I not appearing in search?',
        a: 'Only lawyers with an APPROVED verification appear publicly. If your profile is pending, our team is still reviewing your Bar Council documents. If your subscription has expired you remain visible but stop receiving new leads.',
      },
      {
        q: 'Can I change my city or practice areas later?',
        a: 'Yes — edit your profile from the dashboard. Keeping practice areas accurate improves lead matching; adding languages and a fuller bio improves your search ranking.',
      },
    ],
  },
  {
    id: 'verification',
    title: 'Verification & Trust',
    icon: 'shield-halved',
    faqs: [
      {
        q: 'What does "Verified" mean on a profile?',
        a: 'The lawyer’s Bar Council ID card and identity were reviewed and approved by our team before the profile went live. Unverified lawyers never appear in search.',
      },
      {
        q: 'How long does verification take?',
        a: 'Usually 1–2 business days after you upload your Bar Council ID card — subscribed lawyers are reviewed first, typically within hours. You will be notified by email/WhatsApp when approved, or told exactly what to fix if rejected.',
      },
      {
        q: 'Is LawMitran a law firm?',
        a: 'No. LawMitran is an information and discovery platform. We do not provide legal advice, and listings are informational — not an endorsement or solicitation.',
      },
      {
        q: 'How is the platform kept spam-free?',
        a: 'Every account verifies a mobile number via OTP, lawyers go through document verification, both sides can report abuse, and our moderation team can suspend accounts.',
      },
    ],
  },
  {
    id: 'documents',
    title: 'Legal Documents',
    icon: 'folder-open',
    faqs: [
      {
        q: 'What are LawMitran legal documents?',
        a: 'Ready-to-use templates — affidavits, rental agreements, name-change documents, contracts, and more. Pick a document, fill a guided form, and download it; stamped copies can be couriered where applicable.',
      },
      {
        q: 'Are the documents legally valid?',
        a: 'Templates are drafted to standard formats. Validity depends on correct execution (stamp paper value, notarisation, signatures) which varies by state and document type — the guided flow tells you what each document needs. For high-stakes matters, have a lawyer review it.',
      },
      {
        q: 'Do documents require a subscription?',
        a: 'No subscription — documents are purchased individually. You only need a free account at the point of purchase.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    icon: 'lock',
    faqs: [
      {
        q: 'Who sees my phone number when I submit a requirement?',
        a: 'Only the lawyer you submitted the requirement to, and only when they actively reveal it (which requires an active subscription or trial on their side). Your number is never shown publicly.',
      },
      {
        q: 'Is my legal issue kept confidential?',
        a: 'Yes. Your requirement is visible only to the lawyer(s) it is routed to. Our staff access it only for support and moderation. We never sell your data.',
      },
      {
        q: 'How is my payment data handled?',
        a: 'All payments happen on Razorpay’s PCI-DSS-compliant checkout. LawMitran stores only the order reference and status — never card numbers, UPI handles, or bank credentials.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes — Settings → Delete account. This deactivates your account and signs you out everywhere. Records needed for legal/tax compliance (like invoices) are retained as required by law.',
      },
    ],
  },
];

export default function FaqPage() {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: CATEGORIES.flatMap((c) =>
      c.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    ),
  };

  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* hero */}
      <header className="hero-light py-12">
        <Container>
          <div className="mx-auto max-w-4xl">
            <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-400">
              <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-1">/</span> FAQ
            </nav>
            <h1 className="text-3xl font-extrabold tracking-tight text-navy">Frequently Asked Questions</h1>
            <p className="mt-2 text-sm text-slate-500">
              Payments, subscriptions, finding a lawyer, verification, documents, and privacy — answered.
            </p>
          </div>
        </Container>
      </header>

      <Container className="py-10">
        <div className="mx-auto max-w-4xl">
        {/* category quick links */}
        <nav aria-label="FAQ categories" className="mb-10 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-navy transition hover:border-gold"
            >
              <Icon name={c.icon} aria-hidden="true" className="mr-1.5 text-gold" />
              {c.title}
            </a>
          ))}
        </nav>

        {CATEGORIES.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-heading`} className="mb-12 scroll-mt-24">
            <h2 id={`${c.id}-heading`} className="mb-4 text-xl font-extrabold text-navy">
              <Icon name={c.icon} aria-hidden="true" className="mr-2 text-gold" />
              {c.title}
            </h2>
            <div className="space-y-2">
              {c.faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm open:border-gold/50"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-slate-800 marker:content-none">
                    {f.q}
                    <Icon
                      name="chevron-down"
                      aria-hidden="true"
                      className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* still stuck */}
        <section aria-label="Contact support" className="hero-gradient rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold">Still have a question?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            Send it through the <Link href="/contact" className="font-semibold text-gold hover:underline">contact form</Link>{' '}
            — our support team replies within 2 business days.
          </p>
          <a
            href="mailto:support@lawmitran.com"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 font-bold text-navy transition hover:bg-[#b58f3f]"
          >
            <Icon name="envelope" aria-hidden="true" /> support@lawmitran.com
          </a>
        </section>

        <p className="mt-8 text-[11px] leading-relaxed text-slate-400">
          LawMitran is an information platform, not a law firm, and does not provide legal advice.
          Answers above are general guidance about how the platform works, not legal or financial advice.
        </p>
        </div>
      </Container>
    </main>
  );
}
