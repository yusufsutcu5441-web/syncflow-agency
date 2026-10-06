'use client';

import { Check, ChevronDown, Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';
import { LOCALE_LABELS, routing, type AppLocale } from '@/i18n/routing';
import { persistLocale, stripLocale, withLocale } from '@/lib/i18n-paths';

/**
 * Header language pill. Disclosure pattern: a button that reveals a list of language buttons.
 *  - Each language is written in its own language (and carries lang="…") so anyone can find theirs.
 *  - Choosing one navigates to the same page and hash in the new language and stores the choice in the NEXT_LOCALE
 *    cookie (the same cookie the proxy reads), so the next visit opens in that language.
 *  - Fades in/out; arrow keys, Home/End, Escape and outside-click are supported; focus returns to the pill on close.
 *  - While the new language loads, <html data-switching> dims the page slightly (globals.css).
 */
export function LanguageSwitcher() {
  const { locale, messages } = useClientI18n();
  const t = messages.Switcher;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    document.documentElement.dataset.switching = String(pending);
    return () => {
      delete document.documentElement.dataset.switching;
    };
  }, [pending]);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);

  const openMenu = (focus: 'current' | 'first' | 'last' = 'current') => {
    setOpen(true);
    // The menu is inert while closed, so focus can only move once React has re-rendered it as open.
    requestAnimationFrame(() => {
      const list = items();
      const target = focus === 'first' ? list[0] : focus === 'last' ? list[list.length - 1] : list.find((el) => el.getAttribute('aria-current') === 'true');
      (target ?? list[0])?.focus();
    });
  };

  const choose = (next: AppLocale) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (next === locale) return;
    persistLocale(next);
    const target = `${withLocale(stripLocale(pathname), next)}${window.location.hash}`;
    startTransition(() => {
      router.replace(target, { scroll: false });
    });
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu('last');
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      event.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(list.length - 1);
  };

  const current = LOCALE_LABELS[locale];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="lang-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        // WCAG 2.5.3 "Label in Name": the accessible name starts with the visible text (EN).
        aria-label={`${current.code}, ${t.label}: ${current.native}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <Globe size={15} strokeWidth={1.75} aria-hidden="true" />
        <span aria-hidden="true">{current.code}</span>
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div ref={menuRef} id={menuId} role="group" aria-label={t.label} className="lang-menu" data-open={open} inert={!open} onKeyDown={onMenuKeyDown}>
        {routing.locales.map((code) => {
          const label = LOCALE_LABELS[code];
          const selected = code === locale;
          return (
            <button key={code} type="button" lang={label.hreflang} className="lang-item" aria-current={selected ? 'true' : undefined} onClick={() => choose(code)}>
              <span className="flex items-center gap-2.5">
                {label.native}
                {selected ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : null}
              </span>
              <span className="code" aria-hidden="true">
                {label.code}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
