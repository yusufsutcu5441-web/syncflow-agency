/**
 * The architectural R&D specimens (docs/adr/0032-rd-specimens.md): the studio's own engineering, written up with its method, its figures and its
 * limits. They are NOT client work and describe no client. Specimen 01 is this site (a zero-trust, cookie-less briefing pipeline held to
 * measured budgets); specimen 02 is the reference fail-safe event queue of the enterprise layer (docs/architecture/fail-safe-queue.md).
 *
 * They reuse the page of an architectural breakdown (components/sections/BreakdownView.tsx) with the four parts renamed for the subject:
 * constraint and tolerance, architecture, verification, measured result and limits. Plain module with types only, shared by the loader, the
 * page, the sitemap and the home page's entry cards.
 */
export const SPECIMEN_SLUGS = ['studio-site', 'fail-safe-queue'] as const;
export type SpecimenSlug = (typeof SPECIMEN_SLUGS)[number];

export const isSpecimenSlug = (value: string): value is SpecimenSlug => (SPECIMEN_SLUGS as readonly string[]).includes(value);

/** The address of a specimen page, before the locale prefix is added. */
export const specimenPath = (slug: SpecimenSlug): string => `/specimens/${slug}`;

/** The key of a specimen inside the "Specimen" namespace of the messages. */
export const SPECIMEN_KEY = { 'studio-site': 'studioSite', 'fail-safe-queue': 'failSafeQueue' } as const satisfies Record<SpecimenSlug, string>;

/** "Specimen 01", "Specimen 02": the order in which they are numbered everywhere. */
export const SPECIMEN_NUMBER = { 'studio-site': '01', 'fail-safe-queue': '02' } as const satisfies Record<SpecimenSlug, string>;
