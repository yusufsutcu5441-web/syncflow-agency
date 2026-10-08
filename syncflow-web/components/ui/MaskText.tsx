import { Children, cloneElement, Fragment, isValidElement, type CSSProperties, type ReactNode } from 'react';

/**
 * Splits text into words, each inside its own mask, for the masked entrance (docs/adr/0004-motion-and-smooth-scroll.md).
 *
 *   <span class="mw"><span class="mi" style="--i:3">word</span></span>
 *
 * .mw is the mask (a clip-path on the word's box), .mi is the word that slides up through it (globals.css). --i is the
 * word's position in the text, which becomes its stagger. The split happens on the server, so the HTML already has the
 * final text in reading order, it is fully visible without JavaScript, and nothing shifts when the page hydrates.
 * Elements inside the text keep their markup: only the text inside them is split. Words are separated by one plain
 * space, so wrapping, selection and screen readers behave as for ordinary text. Letters are deliberately not split: it
 * would break kerning, and in Arabic the joined letters.
 */
export function MaskText({ children }: { children: ReactNode }) {
  return <>{split(children, { next: 0 })}</>;
}

/**
 * Whole lines, each in its own mask, 80 ms apart (the Blueprint's hero headline). A line is a block, so it keeps its
 * own row at every width and the headline stays two rows where the language allows it.
 */
export function MaskLines({ lines }: { lines: ReactNode[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <span key={index} className="mw mw-block">
          <span className="mi mi-block" style={{ '--i': index } as CSSProperties}>
            {line}
          </span>
        </span>
      ))}
    </>
  );
}

type Counter = { next: number };

function split(node: ReactNode, counter: Counter): ReactNode {
  if (typeof node === 'string' || typeof node === 'number') return splitText(String(node), counter);

  if (Array.isArray(node)) {
    return Children.toArray(node).map((child, index) => <Fragment key={index}>{split(child, counter)}</Fragment>);
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    const inner = node.props.children;
    return inner === undefined ? node : cloneElement(node, undefined, split(inner, counter));
  }

  return node;
}

function splitText(text: string, counter: Counter): ReactNode {
  return text.split(/([ \t\r\n]+)/).map((part, index) => {
    if (part === '') return null;
    // A newline in a message is a deliberate line break (a heading of two sentences breaks between them).
    if (/^[ \t\r\n]+$/.test(part)) return part.includes('\n') ? <br key={index} /> : ' ';
    const order = counter.next++;
    return (
      <span key={index} className="mw">
        <span className="mi" style={{ '--i': order } as CSSProperties}>
          {part}
        </span>
      </span>
    );
  });
}
