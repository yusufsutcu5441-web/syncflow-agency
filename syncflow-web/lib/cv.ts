/**
 * Helpers for `content-visibility: auto` (the `.cv` sections in app/globals.css, docs/adr/0021 §1).
 *
 * A section that is skipped is only a placeholder height until it has been drawn once, so a script that jumps to a section further down
 * the page must not trust the placeholders of the sections it passes: the target would land a few hundred pixels off, and the browser
 * would only learn the real heights on the way. `holdLayoutBefore(target)` makes the target's own section and every section before it
 * real for the length of the jump (`.cv[data-cv-prime]` is `content-visibility: visible`), flushes the layout so the caller can measure,
 * and returns the function that lets them be skipped again. Sections after the target are left alone: they cannot move it.
 *
 * Small and dependency free on purpose: the entry gate, the breakdown dialog and the enhancement chunk all import it.
 */
const ATTRIBUTE = 'data-cv-prime';
/** A jump that never reports its end (interrupted by the visitor, a tab put in the background) still lets go. */
const SAFETY_MS = 3200;

/** How many jumps currently hold each section; the attribute leaves with the last one. */
const holds = new Map<Element, number>();

export function holdLayoutBefore(target: Element, lifetimeMs = SAFETY_MS): () => void {
  const held: Element[] = [];
  for (const section of document.querySelectorAll('.cv')) {
    // 0: the target itself. FOLLOWING (4): the target comes after this section, or inside it. Anything else is below the target.
    const relation = section === target ? 0 : section.compareDocumentPosition(target);
    if (relation !== 0 && (relation & Node.DOCUMENT_POSITION_FOLLOWING) === 0) continue;
    const count = holds.get(section) ?? 0;
    holds.set(section, count + 1);
    if (count === 0) section.setAttribute(ATTRIBUTE, '');
    held.push(section);
  }
  // Flush now: the caller measures the target's position right after this returns, and the sections need a frame as "real" to be remembered.
  if (held.length > 0) void target.getBoundingClientRect();

  let released = false;
  const timer = window.setTimeout(release, lifetimeMs);
  function release() {
    if (released) return;
    released = true;
    window.clearTimeout(timer);
    for (const section of held) {
      const count = (holds.get(section) ?? 1) - 1;
      if (count > 0) holds.set(section, count);
      else {
        holds.delete(section);
        section.removeAttribute(ATTRIBUTE);
      }
    }
  }
  return release;
}

/**
 * Lets go once a native jump (the browser's own smooth scroll, Next's scroll to a hash) has come to rest: after the first scroll event,
 * the next `scrollend`; a timer covers a click that scrolls nowhere and browsers without the event.
 */
export function releaseAfterScroll(release: () => void, fallbackMs = 1800): void {
  let scrolled = false;
  const done = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('scrollend', onEnd);
    window.clearTimeout(timer);
    release();
  };
  const onScroll = () => {
    scrolled = true;
  };
  const onEnd = () => {
    if (scrolled) done();
  };
  const timer = window.setTimeout(done, fallbackMs);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scrollend', onEnd);
}
