import type { FlagCode } from '@/i18n/routing';

/**
 * Micro flags, drawn as inline SVG (docs/adr/0020-case-study-layer.md §8). Not emoji: Windows ships no flag glyphs, so a flag emoji
 * shows up there as two letters ("US", "TR"), including on the owner's own machine. These are the same on every system, take no request,
 * and live in the palette: a muted tone per colour, platin where a flag is white, obsidian-graphite where it is black, a hairline ring
 * so a dark stripe never melts into the page. Decorative (the language or the market is always named in text beside it).
 * They are simplified at 20 x 14 px: a coat of arms or a crest would only be noise at that size.
 */

const RED = '#b0353f';
const PLATIN = '#dcdce0';
const GRAPHITE = '#202024';
const GOLD = '#d6aa3c';

/** A regular five-pointed star as a polygon: outer radius r, pointing at `rotate` degrees (0 = straight up). */
function star(cx: number, cy: number, r: number, rotate = 0): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.382;
    const angle = ((rotate + i * 36 - 90) * Math.PI) / 180;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

const ART: Record<FlagCode, React.ReactNode> = {
  us: (
    <>
      <rect width="20" height="14" fill={PLATIN} />
      {[0, 4, 8, 12].map((y) => (
        <rect key={y} y={y} width="20" height="2" fill="#a83a46" />
      ))}
      <rect width="9" height="8" fill="#2e4373" />
      {[0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => <circle key={`${row}-${col}`} cx={1.6 + col * 2} cy={1.5 + row * 2.4} r="0.42" fill={PLATIN} />))}
    </>
  ),
  tr: (
    <>
      <rect width="20" height="14" fill={RED} />
      <circle cx="7.3" cy="7" r="3.5" fill={PLATIN} />
      <circle cx="8.4" cy="7" r="2.8" fill={RED} />
      <polygon points={star(11.4, 7, 1.9, -90)} fill={PLATIN} />
    </>
  ),
  ae: (
    <>
      <rect width="20" height="14" fill={PLATIN} />
      <rect x="5" width="15" height="4.67" fill="#1f7a4d" />
      <rect x="5" y="9.33" width="15" height="4.67" fill={GRAPHITE} />
      <rect width="5" height="14" fill={RED} />
    </>
  ),
  de: (
    <>
      <rect width="20" height="14" fill={GRAPHITE} />
      <rect y="4.67" width="20" height="4.67" fill="#b42b34" />
      <rect y="9.33" width="20" height="4.67" fill={GOLD} />
    </>
  ),
  fr: (
    <>
      <rect width="20" height="14" fill={PLATIN} />
      <rect width="6.67" height="14" fill="#2f4c9a" />
      <rect x="13.33" width="6.67" height="14" fill="#b8323e" />
    </>
  ),
  es: (
    <>
      <rect width="20" height="14" fill="#a93a44" />
      <rect y="3.5" width="20" height="7" fill={GOLD} />
      <rect x="4.2" y="4.7" width="2.6" height="4.6" rx="0.7" fill="#8b3a3a" />
    </>
  ),
  cn: (
    <>
      <rect width="20" height="14" fill="#b43030" />
      <polygon points={star(4.2, 4.3, 2.5)} fill="#e6c246" />
      <polygon points={star(8.5, 1.8, 0.85, 30)} fill="#e6c246" />
      <polygon points={star(9.9, 3.7, 0.85, 10)} fill="#e6c246" />
      <polygon points={star(9.9, 5.9, 0.85, -10)} fill="#e6c246" />
      <polygon points={star(8.5, 7.7, 0.85, -30)} fill="#e6c246" />
    </>
  ),
  jp: (
    <>
      <rect width="20" height="14" fill={PLATIN} />
      <circle cx="10" cy="7" r="3.6" fill={RED} />
    </>
  ),
};

export function Flag({ code, className }: { code: FlagCode; className?: string }) {
  return (
    <svg className={className ? `flag ${className}` : 'flag'} viewBox="0 0 20 14" width="20" height="14" aria-hidden="true" focusable="false" data-flag={code}>
      {ART[code]}
    </svg>
  );
}
