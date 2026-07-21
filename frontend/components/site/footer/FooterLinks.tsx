import Link from 'next/link';

export interface FooterLink {
  href: string;
  label: string;
}

export default function FooterLinks({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-2.5">
      {links.map((l) => (
        <li key={l.label}>
          <Link href={l.href} className="text-sm text-slate-400 transition-colors hover:text-gold">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
