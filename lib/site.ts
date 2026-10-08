/**
 * Site-wide constants. Everything here is public by nature (it ends up in the HTML anyway).
 * Secrets never belong in this file: see lib/server/ and .env.example.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://syncflow.agency').replace(/\/+$/, '');

/** The mailbox that receives every briefing (through the signed webhook, n8n and Gmail) and the direct-contact line. */
export const CONTACT_EMAIL = 'contact@syncflow.agency';

/**
 * Social and chat addresses. None were supplied yet, so the footer shows none: set the NEXT_PUBLIC_* variables
 * (.env.example) and the links appear, nothing is invented.
 */
export const SOCIAL = {
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL?.trim() || undefined,
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || undefined,
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim() || undefined,
} as const;

/** Section anchors used by the header, footer and sticky bar. */
export const SECTION_IDS = {
  architecture: 'architecture',
  showcase: 'showcase',
  briefing: 'briefing',
} as const;
