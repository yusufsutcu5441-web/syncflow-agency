'use client';

import { Check, ChevronDown, Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from 'react';
import { useClientI18n } from '@/components/i18n/ClientI18n';
import { isDraftLocale, OPEN_LOCALES } from '@/i18n/launch';
import { LOCALE_LABELS, type AppLocale } from '@/i18n/routing';
import { stripLocale, withLocale } from '@/lib/i18n-paths';
import { MARKET_PARAM, parseMarket } from '@/lib/market';

/**
 * Header language pill. Disclosure pattern: a button that reveals a list of language buttons.
 *  - Each language is written in its own language (and carries lang="…") so anyone can find theirs.
 *  - Choosing one navigates to the same page and hash in the new language. The URL is the only place the choice lives:
 *    no cookie is written (CLAUDE.md, docs/adr/0002-launch-locales-and-market.md).
 *  - Fades in/out; arrow keys, Home/End, Escape and outside-click are supported; focus returns to the pill on close.
 *  - The switch is staged (docs/adr/0014-cinematic-layer.md): the page goes dark and its text shifts in slices (CSS, plus a glitch burst in
 *    the WebGL layer), the new language loads behind the dark, and it arrives out of it. prefers-reduced-motion gets a plain fade.
 */

/**
 * Changing the language remounts everything under [locale], including this component, so the staging lives at module level:
 * `outDone` is the dark phase, `navDone` is set by the NEW switcher when it mounts (the new language is on screen).
 */
type Staging = { outDone: boolean; navDone: boolean; reduce: boolean };
let staging: Staging | null = null;
let failSafe = 0;

type Phase = 'out' | 'hold' | 'in' | null;

/**
 * The veil is created here and appended to <body>, outside React's tree (like the WebGL canvas). React resets the attributes of
 * <html> when the language changes, so a phase kept on <html> vanished at the moment of the switch and the new page flashed
 * into view; the veil element and its attribute survive the remount. <html data-lang-switch> only drives the text glitch on
 * <main> and the footer (both are new elements after the switch anyway).
 */
function veil(): HTMLElement {
  let el = document.querySelector<HTMLElement>('.lang-veil');
  if (!el) {
    el = document.createElement('div');
    el.className = 'lang-veil';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

function setPhase(phase: Phase) {
  const el = veil();
  if (phase) el.dataset.phase = phase;
  else delete el.dataset.phase;
  const root = document.documentElement;
  if (phase === 'out' || phase === 'in') root.dataset.langSwitch = phase;
  else delete root.dataset.langSwitch;
}

function settle() {
  const s = staging;
  if (!s || !(s.outDone && s.navDone)) return;
  staging = null;
  window.clearTimeout(failSafe);
  setPhase('in');
  window.setTimeout(() => setPhase(null), s.reduce ? 320 : 660);
}

function beginStaging(): boolean {
  if (staging) return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s: Staging = { outDone: false, navDone: false, reduce };
  staging = s;
  setPhase('out');
  if (!reduce) window.dispatchEvent(new CustomEvent('cinema:glitch', { detail: { ms: 460 } }));
  window.setTimeout(() => {
    s.outDone = true;
    setPhase('hold');
    settle();
  }, reduce ? 200 : 360);
  // If the navigation never reports back (an error, a slow network), do not leave the visitor in the dark.
  failSafe = window.setTimeout(() => {
    s.outDone = true;
    s.navDone = true;
    settle();
  }, 5000);
  return true;
}

export function LanguageSwitcher() {
  const { locale, messages } = useClientI18n();
  const t = messages.Switcher;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
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

  // A switcher that MOUNTS while a switch is staged is the new language's switcher: the navigation has landed.
  useEffect(() => {
    veil();
    if (!staging) return;
    staging.navDone = true;
    settle();
  }, []);

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
    // The market (?m=) travels with the visitor to the other language; nothing else from the query string does.
    const market = parseMarket(new URLSearchParams(window.location.search).get(MARKET_PARAM));
    const target = `${withLocale(stripLocale(pathname), next)}${market ? `?${MARKET_PARAM}=${market}` : ''}${window.location.hash}`;
    if (!beginStaging()) return;
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
        title={current.native}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        <Globe size={15} strokeWidth={1.75} aria-hidden="true" />
        <span aria-hidden="true">{current.code}</span>
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div ref={menuRef} id={menuId} role="group" aria-label={t.label} className="lang-menu" data-open={open} inert={!open} onKeyDown={onMenuKeyDown}>
        {OPEN_LOCALES.map((code) => {
          const label = LOCALE_LABELS[code];
          const selected = code === locale;
          return (
            <button key={code} type="button" lang={label.hreflang} className="lang-item" aria-current={selected ? 'true' : undefined} onClick={() => choose(code)}>
              <span className="flex items-center gap-2.5">
                {/* The direction belongs to the name only: the row (name left, code right) reads the same in every item, Arabic included. */}
                <span dir={label.dir}>{label.native}</span>
                {selected ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : null}
              </span>
              <span className="code">
                {label.code}
                {isDraftLocale(code) ? ` · ${t.draft}` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
