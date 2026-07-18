import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/ui/Icon';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Discover',
    links: [
      { href: '/lawyers', label: 'Find Lawyers' },
      { href: '/lawyers', label: 'Map Search' },
      { href: '/legal-documents', label: 'Legal Documents' },
      { href: '/#practice', label: 'Practice Areas' },
      { href: '/lawyers/bengaluru', label: 'Cities' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/#how', label: 'How it Works' },
      { href: '/faq', label: 'FAQ' },
      { href: '#', label: 'About' },
      { href: '/contact', label: 'Contact Us' },
      { href: '#', label: 'Careers' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '#', label: 'Privacy Policy' },
      { href: '#', label: 'Terms of Use' },
      { href: '#', label: 'Refund Policy' },
      { href: '#', label: 'Disclaimer' },
      { href: '/grievance', label: 'Grievance Redressal' },
    ],
  },
  {
    title: 'For Lawyers',
    links: [
      { href: '/signup?role=lawyer', label: 'Join as a Lawyer' },
      { href: '/dashboard/plan', label: 'Plans & Pricing' },
      { href: '/login', label: 'Lawyer Login' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-navy pb-8 pt-16 text-sm text-slate-400">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 border-b border-slate-800 px-6 pb-12 md:grid-cols-12">
        <div className="space-y-4 md:col-span-4">
          <Link href="/" className="flex items-center" aria-label="LawMitran home">
            <Image src="/logo-light.svg" alt="LawMitran" width={150} height={36} className="h-9 w-auto" />
          </Link>
          <p className="text-xs leading-relaxed text-slate-400">
            Connecting you to verified legal solutions — lawyers, advice, and documents, all in one place.
          </p>
          <p className="text-xs text-slate-500">
            <Icon name="location-dot" aria-hidden="true" className="mr-1" /> Bengaluru, India
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:col-span-8">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-white">{col.title}</h4>
              <ul className="space-y-2.5 text-xs">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-gold">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 pt-7 text-xs sm:flex-row">
        <span className="text-slate-500">
          © 2026 LawMitran · <span className="font-semibold text-gold">Justice Made Accessible.</span>
        </span>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-slate-400">
          <a href="https://www.lawmitran.com" className="hover:text-gold">www.lawmitran.com</a>
          <a href="mailto:support@lawmitran.com" className="hover:text-gold">support@lawmitran.com</a>
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-6xl border-t border-slate-800/70 px-6 pt-5 text-center text-[11px] leading-relaxed text-slate-500">
        LawMitran is an information platform for discovering Bar Council–verified advocates and legal
        documents. It is not a law firm and does not provide legal advice; listings and rankings are
        informational and not an endorsement or solicitation. Fees shown are indicative.
      </p>
    </footer>
  );
}
