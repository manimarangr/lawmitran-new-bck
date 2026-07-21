import Link from 'next/link';

const BOTTOM_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/sitemap.xml', label: 'Sitemap' },
];

export default function FooterBottom() {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row">
      <p>
        © {new Date().getFullYear()} LawMitran ·{' '}
        <span className="font-semibold text-gold">Justice Made Accessible.</span> All rights
        reserved.
      </p>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
        {BOTTOM_LINKS.map((l) => (
          <Link key={l.label} href={l.href} className="transition-colors hover:text-gold">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
