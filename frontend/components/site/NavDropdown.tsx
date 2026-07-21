'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export interface NavDropdownItem {
  href: string;
  label: string;
  icon?: string;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  /** Extra link shown below the list, separated by a divider (e.g. "Browse all guides"). */
  footerLink?: { href: string; label: string };
  columns?: 1 | 2;
  align?: 'left' | 'right' | 'center';
  /** 'link' matches plain nav text; 'button' matches the gold Sign Up pill. */
  variant?: 'link' | 'button';
  /** Renders the mobile accordion row instead of the desktop hover/click dropdown. */
  mobile?: boolean;
  /** Called when an item is chosen — e.g. to close the mobile hamburger menu. */
  onNavigate?: () => void;
}

/**
 * A nav item with a submenu: hover *or* click/Enter/Space opens it on desktop,
 * Escape closes it and returns focus to the trigger. On mobile it renders as
 * a collapsible accordion row instead. One implementation shared by every
 * dropdown in the header (Legal Guides, Sign Up) so the open/close/keyboard
 * logic isn't duplicated per menu.
 */
export default function NavDropdown({
  label,
  items,
  footerLink,
  columns = 1,
  align = 'left',
  variant = 'link',
  mobile = false,
  onNavigate,
}: NavDropdownProps) {
  // Hover and click are tracked separately so a click while already
  // hover-open doesn't just toggle the panel straight back shut — that was
  // the bug: onMouseEnter opened it, then the very click a mouse user makes
  // next flipped it right back to closed before they could pick anything.
  const [hoverOpen, setHoverOpen] = useState(false);
  const [clickOpen, setClickOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const open = mobile ? mobileOpen : hoverOpen || clickOpen;
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mobile) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setHoverOpen(false);
        setClickOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [mobile]);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHoverOpen(true);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setHoverOpen(false);
      setClickOpen(false);
    }, 150);
  }
  function onTriggerClick() {
    setClickOpen((v) => !v);
  }
  function closeAll() {
    setHoverOpen(false);
    setClickOpen(false);
  }
  function onWrapKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      closeAll();
      triggerRef.current?.focus();
    }
  }

  const chevron = (
    <Icon
      name="chevron-down"
      aria-hidden="true"
      className={`text-sm transition-transform duration-200 ease-in-out ${open ? 'rotate-180' : ''}`}
    />
  );

  if (mobile) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[0.9375rem] font-semibold hover:bg-bg-soft ${
            open ? 'text-navy' : 'text-ink'
          }`}
        >
          {label}
          {chevron}
        </button>
        <ul
          className={`ml-3 overflow-hidden border-l border-line pl-2 transition-all duration-200 ease-in-out ${
            open ? 'max-h-[30rem] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                tabIndex={open ? undefined : -1}
                onClick={onNavigate}
                className="block rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-bg-soft hover:text-gold"
              >
                {it.label}
              </Link>
            </li>
          ))}
          {footerLink && (
            <li>
              <Link
                href={footerLink.href}
                tabIndex={open ? undefined : -1}
                onClick={onNavigate}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-gold hover:bg-bg-soft"
              >
                {footerLink.label}
              </Link>
            </li>
          )}
        </ul>
      </li>
    );
  }

  const triggerClass =
    variant === 'button'
      ? 'inline-flex items-center gap-1 rounded-[10px] bg-gold px-5 py-2.5 text-sm font-semibold text-navy transition hover:-translate-y-px hover:bg-[#b88a10]'
      : `flex items-center gap-1 text-[0.9375rem] font-semibold hover:text-gold ${
          open ? 'text-navy underline decoration-gold decoration-2 underline-offset-8' : 'text-ink'
        }`;

  const alignClass = align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';
  const widthClass = columns === 2 ? 'w-[35rem]' : 'w-52';

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onKeyDown={onWrapKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        aria-haspopup="true"
        aria-expanded={open}
        className={triggerClass}
      >
        {label}
        {chevron}
      </button>

      <div
        aria-hidden={!open}
        className={`absolute top-full z-50 ${alignClass} ${widthClass} pt-3 transition duration-200 ease-in-out ${
          open ? 'visible translate-y-0 opacity-100' : 'invisible pointer-events-none -translate-y-1 opacity-0'
        }`}
      >
        <div className="rounded-2xl border border-line bg-white p-2 shadow-xl">
          <div className={columns === 2 ? 'grid grid-cols-2 gap-1' : 'flex flex-col'}>
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                tabIndex={open ? undefined : -1}
                onClick={closeAll}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-bg-soft hover:text-gold"
              >
                {it.icon && <Icon name={it.icon} aria-hidden="true" className="text-gold" />}
                {it.label}
              </Link>
            ))}
          </div>
          {footerLink && (
            <div className="mt-1 border-t border-line pt-1 text-center">
              <Link
                href={footerLink.href}
                tabIndex={open ? undefined : -1}
                onClick={closeAll}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-gold hover:bg-bg-soft hover:underline"
              >
                {footerLink.label}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
