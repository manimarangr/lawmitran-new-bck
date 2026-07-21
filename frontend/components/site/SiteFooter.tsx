import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/ui/Icon';
import Container from '@/components/ui/Container';
import FooterSection from './footer/FooterSection';
import SocialLinks from './footer/SocialLinks';
import FooterBottom from './footer/FooterBottom';
import type { FooterLink } from './footer/FooterLinks';

const FIND_LAWYERS: FooterLink[] = [
  { href: '/lawyers', label: 'Search Lawyers' },
  { href: '/#practice', label: 'Browse by Practice Area' },
  { href: '/lawyers/bengaluru', label: 'Browse by City' },
];

const LEGAL_DOCUMENTS: FooterLink[] = [
  { href: '/legal-documents/residential-rental-agreement', label: 'Rental Agreement' },
  { href: '/legal-documents/non-disclosure-agreement', label: 'Non-Disclosure Agreement' },
  { href: '/legal-documents/cheque-bounce-notice-138', label: 'Cheque Bounce Notice' },
  { href: '/legal-documents', label: 'View All Documents' },
];

const LEGAL_GUIDES: FooterLink[] = [
  { href: '/legal-guides/category/property-real-estate', label: 'Property Law' },
  { href: '/legal-guides/category/family-law', label: 'Family Law' },
  { href: '/legal-guides/category/criminal-law', label: 'Criminal Law' },
  { href: '/legal-guides/category/consumer-rights', label: 'Consumer Rights' },
  { href: '/legal-guides/category/employment', label: 'Employment Law' },
  { href: '/legal-guides/all', label: 'View All Guides' },
];

const FOR_LAWYERS: FooterLink[] = [
  { href: '/signup/lawyer', label: 'Join as a Lawyer' },
  { href: '/dashboard/plan', label: 'Pricing & Subscription Plans' },
  { href: '/dashboard/lawyer', label: 'Lawyer Dashboard' },
  { href: '/login', label: 'Lawyer Login' },
];

const COMPANY: FooterLink[] = [
  { href: '/#how', label: 'How It Works' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/faq', label: 'FAQ' },
];

const LEGAL: FooterLink[] = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Use' },
  { href: '/grievance', label: 'Grievance Redressal' },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#0f172a] pb-8 pt-14 text-slate-400 print:hidden">
      <Container>
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 lg:grid-cols-12">
          {/* brand column */}
          <div className="space-y-4 lg:col-span-3">
            <Link href="/" className="flex items-center" aria-label="LawMitran home">
              <Image src="/logo-light.svg" alt="LawMitran" width={150} height={36} className="h-9 w-auto" />
            </Link>
            <p className="text-sm font-semibold text-white">
              India&apos;s trusted legal marketplace connecting people with verified lawyers.
            </p>
            <p className="text-sm leading-relaxed text-slate-400">
              Find verified advocates, legal documents, and easy-to-understand legal guides
              across India.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Icon name="location-dot" aria-hidden="true" className="text-gold" />
                Bengaluru, India
              </li>
              <li className="flex items-center gap-2">
                <Icon name="envelope" aria-hidden="true" className="text-gold" />
                <a href="mailto:support@lawmitran.com" className="hover:text-gold">support@lawmitran.com</a>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="up-right-from-square" aria-hidden="true" className="text-gold" />
                <a href="https://www.lawmitran.com" className="hover:text-gold">www.lawmitran.com</a>
              </li>
            </ul>
          </div>

          {/* nav sections — 1 col mobile (accordion), 3 col tablet, 6 col desktop */}
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-3 lg:col-span-9 lg:grid-cols-6">
            <FooterSection title="Find Lawyers" links={FIND_LAWYERS} />
            <FooterSection title="Legal Documents" links={LEGAL_DOCUMENTS} />
            <FooterSection title="Legal Guides" links={LEGAL_GUIDES} />
            <FooterSection title="For Lawyers" links={FOR_LAWYERS} />
            <FooterSection title="Company" links={COMPANY} />
            <FooterSection title="Legal" links={LEGAL} />
          </div>
        </div>

        {/* social + download app */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-8 sm:flex-row sm:items-center">
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Follow Us</h4>
            <SocialLinks />
          </div>
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white sm:text-right">
              Download App <span className="font-medium normal-case text-slate-500">(Coming Soon)</span>
            </h4>
            <div className="flex gap-3">
              {['App Store', 'Google Play'].map((label) => (
                <span
                  key={label}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  <Icon name="download" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="py-6 text-[11px] leading-relaxed text-slate-500">
          LawMitran is a legal marketplace that connects users with verified advocates. LawMitran
          is not a law firm and does not provide legal advice. Lawyer listings are informational
          and do not constitute endorsements. Users should independently verify the suitability of
          legal professionals.
        </p>

        <FooterBottom />
      </Container>
    </footer>
  );
}
