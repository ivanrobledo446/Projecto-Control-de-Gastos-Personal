'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type NavDropdownItem = { href: string; label: string };

export default function NavDropdown({
  label,
  pathname,
  basePath,
  items,
  widthClass = 'w-56',
}: {
  label: string;
  pathname: string;
  basePath: string;
  items: NavDropdownItem[];
  widthClass?: string;
}) {
  const isActive = pathname.startsWith(basePath);

  // Para mobile/tablet: toggle por click
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)} // mobile click
        className={[
          'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm uppercase tracking-wide',
          'border border-[var(--border)] transition',
          'hover:bg-white/5',
          isActive ? 'text-[var(--text)] bg-white/5' : 'text-[var(--muted)]',
        ].join(' ')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <span className="text-xs translate-y-[1px] text-[var(--muted)]">▾</span>
      </button>

      {/* Dropdown */}
      <div
        className={[
          'absolute left-0 top-full mt-2 rounded-md border border-[var(--border)]',
          'bg-[var(--bg)]',
          'shadow-none',
          widthClass,
          open
            ? 'opacity-100 visible translate-y-0'
            : 'opacity-0 invisible -translate-y-1',
          'transition-all duration-150',
          'z-50',
        ].join(' ')}
      >
        <div className="py-2">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={[
                  'block px-4 py-2 text-sm transition rounded-sm',
                  active
                    ? 'bg-white/5 text-[var(--text)] font-semibold'
                    : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]',
                ].join(' ')}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
