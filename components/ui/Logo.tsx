import { BRAND, type BrandPart } from '@/lib/brand-paths';
import { cn } from '@/lib/utils';

type LogoProps = {
  /** Which part of the B1/v2 pack: the horizontal lockup (default), the stacked lockup, the monogram, or the bare wordmark. */
  part?: BrandPart;
  /** Rendered height in px. Width follows the part's proportions; leave it out to size the logo with CSS. */
  height?: number;
  className?: string;
  /** Accessible name. Without it the logo is decorative: the link or heading around it names it. */
  title?: string;
};

/**
 * The SyncFlow logo (brand/README.md): B1 monogram and the custom-drawn SYNCFLOW wordmark, an inline SVG outline, no live font.
 * One colour, the current text colour, which is platin on every dark surface. Never a gradient, shadow or glow, and the
 * proportions never change. Minimum sizes: monogram 16 px (the "small" cut at 20 px and below), horizontal lockup 24 px
 * high, stacked lockup 48 px high. Clear space around it: 2u, where u is a quarter of the monogram's height.
 * The outlines come from scripts/build-brand.mjs, so this file never drifts from the brand pack.
 */
export function Logo({ part = 'lockupHorizontal', height, className, title }: LogoProps) {
  const { viewBox, w, h, d } = BRAND[part];
  const size = height ? { height, width: Math.round(((height * w) / h) * 100) / 100 } : {};

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="currentColor"
      focusable="false"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('logo', className)}
      {...size}
    >
      <path fillRule="evenodd" d={d} />
    </svg>
  );
}
