/**
 * Site-wide constants. Everything here is public by nature (it ends up in the HTML anyway).
 * Secrets never belong in this file: see lib/server/ and .env.example.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://syncflow.agency').replace(/\/+$/, '');

/**
 * The public mailbox: the target of every mail link on the site and the direct-contact line (lib/contact.ts builds the links), and the default
 * recipient of an SMTP-delivered briefing. It comes from NEXT_PUBLIC_CONTACT_EMAIL (inlined at build time) and is written nowhere in the code.
 * Unset or malformed, it is an empty string: the mail links are then left out of the page (nothing is invented), and the build says so (next.config.mjs).
 */
const ADDRESS = /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]+$/;
const configuredEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? '';
export const CONTACT_EMAIL = ADDRESS.test(configuredEmail) ? configuredEmail : '';

/**
 * Social and chat addresses. None were supplied yet, so the footer shows none: set the NEXT_PUBLIC_* variables
 * (.env.example) and the links appear, nothing is invented.
 */
export const SOCIAL = {
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL?.trim() || undefined,
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || undefined,
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim() || undefined,
} as const;

/** When the legal texts (privacy notice, legal notice) were last edited. An edit date, never a claim that the text has been reviewed by a lawyer. */
export const LEGAL_UPDATED = '2026-10-22';

/** Section anchors used by the header, footer and sticky bar. */
export const SECTION_IDS = {
  architecture: 'architecture',
  showcase: 'showcase',
  studio: 'studio',
  briefing: 'briefing',
} as const;
