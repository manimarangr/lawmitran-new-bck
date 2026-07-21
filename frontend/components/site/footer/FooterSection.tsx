'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import FooterLinks, { type FooterLink } from './FooterLinks';

/**
 * One footer column. Desktop/tablet: static heading, list always visible.
 * Mobile: collapsible accordion row (tap the heading to expand).
 */
export default function FooterSection({ title, links }: { title: string; links: FooterLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 py-4 md:border-none md:py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left md:hidden"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-white">{title}</span>
        <Icon
          name="chevron-down"
          aria-hidden="true"
          className={`text-sm text-slate-400 transition-transform duration-200 ease-in-out ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <h4 className="hidden text-xs font-bold uppercase tracking-wider text-white md:mb-5 md:block">
        {title}
      </h4>
      <div className={`${open ? 'mt-4 block' : 'hidden'} md:mt-0 md:block`}>
        <FooterLinks links={links} />
      </div>
    </div>
  );
}
