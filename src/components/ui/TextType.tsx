/* ============================================================
   TEXT TYPE  (adapted from React Bits)
   ------------------------------------------------------------
   Text that types itself in, optionally cycling through several
   strings.

   WHAT WAS CHANGED FROM THE UPSTREAM COMPONENT, AND WHY

   1. THE CURSOR BLINKS IN CSS, NOT IN GSAP.
      Upstream starts a `repeat: -1` GSAP tween per instance to
      blink the caret. That is one never-ending tween on the
      global ticker for every typed line on the page — and this
      site has one in most sections plus one per schedule row.
      A two-keyframe CSS animation does the same job on the
      compositor and costs the main thread nothing.

   2. IT CAN BE HELD UNTIL SOMETHING ELSE FINISHES.
      `start` gates the whole machine, so a line can wait for the
      heading above it to finish resolving rather than racing it.
      See the schedule, where each row's detail types only once
      its title has fully revealed.

   3. IT DOES NOT REFLOW THE PAGE WHILE IT TYPES.
      The finished string is rendered underneath at zero opacity
      so the element is always its final size. Without that, every
      character typed on a line that wraps changes the height of
      the page, which moves every ScrollTrigger below it.

   4. REDUCED MOTION PRINTS THE TEXT.
      No timers, no caret, no re-renders.
   ============================================================ */

import React, {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/dom';
import './TextType.css';

export interface TextTypeProps extends React.HTMLAttributes<HTMLElement> {
  text: string | string[];
  as?: React.ElementType;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  className?: string;
  showCursor?: boolean;
  hideCursorWhileTyping?: boolean;
  cursorCharacter?: string | React.ReactNode;
  cursorClassName?: string;
  cursorBlinkDuration?: number;
  textColors?: string[];
  variableSpeed?: { min: number; max: number };
  onSentenceComplete?: (sentence: string, index: number) => void;
  startOnVisible?: boolean;
  reverseMode?: boolean;
  /** Hold the machine until this turns true. Combined with `startOnVisible`,
   *  both conditions must be met. */
  start?: boolean;
  /** Hide the caret once there is nothing left to type. Right for a line of
   *  content, wrong for a looping strapline. */
  hideCursorWhenDone?: boolean;
}

export const TextType: React.FC<TextTypeProps> = ({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = '|',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  start = true,
  hideCursorWhenDone = false,
  ...props
}) => {
  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);

  /* Decided once, at mount: a visitor does not change this mid-session, and
     re-reading it per render would re-run the machine. */
  const [reduced] = useState(prefersReducedMotion);

  const [displayedText, setDisplayedText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const [done, setDone] = useState(false);

  const containerRef = useRef<HTMLElement>(null);

  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);

  const currentColor = textColors.length
    ? textColors[currentTextIndex % textColors.length]
    : 'inherit';

  /* ---- wait until it is on screen ---- */
  useEffect(() => {
    if (!startOnVisible || reduced) return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsVisible(true);
          io.disconnect(); // it only ever needs to fire once
        }
      },
      { threshold: 0.15 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [startOnVisible, reduced]);

  /* ---- the machine ---- */
  const running = isVisible && start && !reduced;

  useEffect(() => {
    if (!running) return;

    const currentText = textArray[currentTextIndex] ?? '';
    const processed = reverseMode ? [...currentText].reverse().join('') : currentText;

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const step = () => {
      if (isDeleting) {
        if (displayedText === '') {
          if (!loop && currentTextIndex === textArray.length - 1) {
            setIsDeleting(false);
            return;
          }
          onSentenceComplete?.(textArray[currentTextIndex], currentTextIndex);
          timeout = setTimeout(() => {
            setIsDeleting(false);
            setCurrentCharIndex(0);
            setCurrentTextIndex((prev) => (prev + 1) % textArray.length);
          }, pauseDuration);
        } else {
          timeout = setTimeout(
            () => setDisplayedText((prev) => prev.slice(0, -1)),
            deletingSpeed
          );
        }
        return;
      }

      if (currentCharIndex < processed.length) {
        timeout = setTimeout(
          () => {
            setDisplayedText((prev) => prev + processed[currentCharIndex]);
            setCurrentCharIndex((prev) => prev + 1);
          },
          variableSpeed ? getRandomSpeed() : typingSpeed
        );
        return;
      }

      // Nothing left to type.
      if (!loop && currentTextIndex === textArray.length - 1) {
        setDone(true);
        return;
      }
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    };

    if (currentCharIndex === 0 && !isDeleting && displayedText === '') {
      timeout = setTimeout(step, initialDelay);
    } else {
      step();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [
    running,
    currentCharIndex,
    displayedText,
    isDeleting,
    currentTextIndex,
    textArray,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    initialDelay,
    loop,
    reverseMode,
    variableSpeed,
    getRandomSpeed,
    onSentenceComplete
  ]);

  const fullText = textArray[currentTextIndex] ?? '';
  const shouldHideCursor =
    (hideCursorWhileTyping && (currentCharIndex < fullText.length || isDeleting)) ||
    (hideCursorWhenDone && done);

  /* Reduced motion: the finished text, and nothing else. */
  if (reduced) {
    return createElement(
      Component,
      { ref: containerRef, className: cn('text-type', className), ...props },
      <span className="text-type__content" style={{ color: currentColor }}>
        {textArray[0] ?? ''}
      </span>
    );
  }

  return createElement(
    Component,
    { ref: containerRef, className: cn('text-type', className), ...props },
    /* The finished string, laid out but invisible, so the element never
       changes size as the visible copy is typed over it. Without this every
       keystroke on a wrapping line reflows the page and moves every
       ScrollTrigger below it. */
    <span className="text-type__sizer" aria-hidden="true">
      {textArray.reduce((a, b) => (b.length > a.length ? b : a), '')}
    </span>,
    /* Content and caret travel together in one overlay, so the caret stays
       next to the last character typed instead of being positioned. */
    <span className="text-type__line" key="line">
      <span className="text-type__content" style={{ color: currentColor }}>
        {displayedText}
      </span>
      {showCursor && (
        <span
          className={cn(
            'text-type__cursor',
            cursorClassName,
            shouldHideCursor && 'text-type__cursor--hidden'
          )}
          style={{ animationDuration: `${cursorBlinkDuration * 2}s` }}
          aria-hidden="true"
        >
          {cursorCharacter}
        </span>
      )}
    </span>
  );
};

export default TextType;
