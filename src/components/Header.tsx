'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import NavDropdown from '@/components/NavDropdown';

function MobileSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)] py-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 text-sm text-[var(--text)] font-semibold uppercase tracking-wide"
      >
        <span>{title}</span>
        <span className="text-xs text-[var(--muted)]">{open ? '▴' : '▾'}</span>
      </button>
      {open ? <div className="pb-3 pl-2">{children}</div> : null}
    </div>
  );
}

function MobileLink({
  href,
  label,
  onClick,
  active,
}: {
  href: string;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'block rounded-md px-3 py-2 text-sm transition',
        active
          ? 'bg-white/5 font-semibold text-[var(--text)]'
          : 'text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="mx-auto max-w-3xl px-6 py-3 flex items-center text-[var(--text)]">
        <Link
          href="/"
          className="flex items-center shrink-0 opacity-90 hover:opacity-100 transition"
        >
          <Image
            src="/favicon.ico"
            alt="Logo"
            width={50}
            height={50}
            className="rounded"
            priority
          />
        </Link>

        <div className="hidden sm:block mx-6 h-6 w-px bg-[var(--border)]" />

        {/* Desktop */}
        <nav className="hidden sm:flex items-center gap-10 ml-10">
          <NavDropdown
            label="Transacciones"
            pathname={pathname}
            basePath="/transactions"
            items={[
              { href: '/transactions/expenses', label: 'Añadir gastos' },
              { href: '/transactions/income', label: 'Añadir ingresos' },
            ]}
            widthClass="w-56"
          />

          <NavDropdown
            label="Categorías"
            pathname={pathname}
            basePath="/categories"
            items={[
              { href: '/categories/expenses', label: 'Categorías de gastos' },
              { href: '/categories/income', label: 'Categorías de ingresos' },
            ]}
            widthClass="w-64"
          />
        </nav>

        <div className="hidden sm:block col-start-3" />

        {/* Mobile */}
        <button
          type="button"
          className="sm:hidden ml-auto inline-flex items-center justify-center rounded-md text-[var(--text)] px-3 py-2 text-2xl leading-none"
          aria-label="Abrir menú"
          onClick={() => setMobileOpen(true)}
        >
          ☰
        </button>
      </div>

      {mobileOpen ? (
        <div className="sm:hidden fixed inset-0 z-50">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
          />

          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-[var(--bg)] border-l border-[var(--border)] shadow-none p-4">
            <div className="flex items-center justify-between pb-2">
              <div className="text-lg font-bold uppercase tracking-wider text-[var(--text)]">
                Menú
              </div>
              <button
                type="button"
                className="rounded-md px-3 py-2 text-2xl leading-none text-[var(--text)] hover:bg-white/5 border border-[var(--border)]"
                onClick={closeMobile}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-2">
              <MobileSection
                title="Transacciones"
                open={txOpen}
                onToggle={() => setTxOpen((v) => !v)}
              >
                <MobileLink
                  href="/transactions/expenses"
                  label="Añadir gastos"
                  active={pathname === '/transactions/expenses'}
                  onClick={closeMobile}
                />
                <MobileLink
                  href="/transactions/income"
                  label="Añadir ingresos"
                  active={pathname === '/transactions/income'}
                  onClick={closeMobile}
                />
              </MobileSection>

              <MobileSection
                title="Categorías"
                open={catOpen}
                onToggle={() => setCatOpen((v) => !v)}
              >
                <MobileLink
                  href="/categories/expenses"
                  label="Categorías de gastos"
                  active={pathname === '/categories/expenses'}
                  onClick={closeMobile}
                />
                <MobileLink
                  href="/categories/income"
                  label="Categorías de ingresos"
                  active={pathname === '/categories/income'}
                  onClick={closeMobile}
                />
              </MobileSection>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}