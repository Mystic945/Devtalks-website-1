/* ============================================================
   DEVTALKS — SPLIT HEADING
   ------------------------------------------------------------
   A heading whose words are already wrapped in the `.word > i`
   pairs the reveal animates: the outer span clips, the inner one
   travels up out of it.

   The original site split these by rewriting innerHTML after
   render. Doing it here instead means React owns the markup
   start to finish, so nothing can reconcile the spans away — and
   the words are in the HTML the crawler sees either way.

   The starting position lives in CSS (`.word > i` is translated
   down 100%), so there is no flash of unsplit text before the
   animation arrives, and no blank heading if it never does:
   under reduced motion the same stylesheet puts them back.
   ============================================================ */

import { Fragment, type ElementType, type ReactElement } from 'react';

interface Props {
  text: string;
  /** Which element to render. Defaults to an h2, which is what every
   *  section heading on the page is. */
  as?: ElementType;
  className?: string;
  id?: string;
}

export function SplitText({ text, as: Tag = 'h2', className, id }: Props): ReactElement {
  const words = text.trim().split(/\s+/);

  return (
    <Tag className={className} id={id} data-split>
      {words.map((word, i) => (
        <Fragment key={`${i}-${word}`}>
          {i > 0 && ' '}
          <span className="word">
            <i>{word}</i>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
