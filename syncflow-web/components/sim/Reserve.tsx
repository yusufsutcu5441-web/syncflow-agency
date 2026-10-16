import type { ReactNode } from 'react';

/**
 * One live piece of text that keeps the room of the tallest of its alternatives (docs/adr/0021 §4). The alternatives sit in the SAME grid
 * cell as the live text, invisible and out of the accessibility tree (`visibility: hidden`), so the box is as tall as the longest of them
 * at the current width and in the current language. Nothing below it moves when the text changes, which it does while the visitor is
 * looking at it (the status line of a simulator, the readout of a step). The live text is the child.
 *
 * Give the child a `key` that is its text (docs/adr/0021 §4): a new element has no "before" for the browser to compare, while a text node
 * whose content changes does, and in a right-to-left page Chrome counts the growing text (its start edge is on the right and moves as the
 * text gets longer) as a layout shift. `live` makes the wrapper, which persists, the polite live region, so the swap is still announced.
 * Plain markup, no state: the server draws it, and the browser chunk re-renders it.
 */
export function Reserve({
  ghosts,
  className,
  as: Tag = 'div',
  live = false,
  children,
}: {
  ghosts: readonly string[];
  className?: string;
  as?: 'div' | 'dd' | 'span';
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <Tag className={className ? `reserve ${className}` : 'reserve'} role={live ? 'status' : undefined} aria-live={live ? 'polite' : undefined}>
      {children}
      {ghosts.map((text, index) => (
        <span key={index} className="reserve-ghost" aria-hidden="true">
          {text}
        </span>
      ))}
    </Tag>
  );
}
