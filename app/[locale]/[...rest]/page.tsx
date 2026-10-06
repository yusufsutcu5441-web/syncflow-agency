import { notFound } from 'next/navigation';

/** Any URL below a locale that has no page lands here, so the localized not-found page (with header and footer) renders. */
export default function CatchAll() {
  notFound();
}
