import type { AppLocale } from '@/i18n/routing';

/**
 * Blueprint section 4, "One sentence, seven languages": the same sentence in each language (written once here, in its own
 * language, as in the Blueprint's table; the surrounding page text is translated through messages/). The globe is a
 * static line drawing computed from the cities' coordinates with an orthographic projection: no WebGL, no library.
 */
export const REACH_SENTENCES: Record<AppLocale, string> = {
  tr: 'Markanız, hak ettiği her dilde.',
  en: 'Your brand, in every language it deserves.',
  de: 'Ihre Marke, in jeder Sprache, die sie verdient.',
  fr: 'Votre marque, dans chaque langue qu’elle mérite.',
  es: 'Su marca, en cada idioma que merece.',
  ar: 'علامتكم التجارية، بكل لغة تستحقها.',
  ja: 'あなたのブランドを、ふさわしいすべての言語で。',
};

/** `label` places the city's name beside its point so the western European cluster does not overprint itself (dx, dy in px; end = text ends at the point). */
export const CITIES = [
  { id: 'istanbul', lat: 41.01, lon: 28.98, label: { dx: 8, dy: 3, anchor: 'start' } },
  { id: 'london', lat: 51.51, lon: -0.13, label: { dx: -8, dy: -4, anchor: 'end' } },
  { id: 'berlin', lat: 52.52, lon: 13.4, label: { dx: 8, dy: -5, anchor: 'start' } },
  { id: 'paris', lat: 48.86, lon: 2.35, label: { dx: -8, dy: 12, anchor: 'end' } },
  { id: 'madrid', lat: 40.42, lon: -3.7, label: { dx: -8, dy: 3, anchor: 'end' } },
  { id: 'dubai', lat: 25.2, lon: 55.27, label: { dx: 8, dy: 3, anchor: 'start' } },
  { id: 'tokyo', lat: 35.68, lon: 139.69, label: { dx: -8, dy: 3, anchor: 'end' } },
] as const;

export type CityId = (typeof CITIES)[number]['id'];

const SIZE = 440;
const CENTER = SIZE / 2;
const RADIUS = 200;
/** The point on the globe that faces the viewer: chosen so that London and Tokyo are both on the visible side. */
const VIEW = { lat: 28, lon: 40 };
const RAD = Math.PI / 180;

function project(lat: number, lon: number) {
  const phi = lat * RAD;
  const lambda = (lon - VIEW.lon) * RAD;
  const phi0 = VIEW.lat * RAD;
  const cosc = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  const x = RADIUS * Math.cos(phi) * Math.sin(lambda);
  const y = RADIUS * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda));
  return { x: CENTER + x, y: CENTER - y, visible: cosc >= 0 };
}

/** Polylines of points in order; the line is cut wherever it goes round the back of the globe. */
function line(points: Array<{ lat: number; lon: number }>): string[] {
  const paths: string[] = [];
  let current = '';
  for (const { lat, lon } of points) {
    const p = project(lat, lon);
    if (!p.visible) {
      if (current) paths.push(current);
      current = '';
      continue;
    }
    current += `${current ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  if (current) paths.push(current);
  return paths;
}

export function buildGlobe() {
  const graticule: string[] = [];
  for (let lon = -180; lon < 180; lon += 20) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 3) points.push({ lat, lon });
    graticule.push(...line(points));
  }
  for (let lat = -80; lat <= 80; lat += 20) {
    const points = [];
    for (let lon = -180; lon <= 180; lon += 3) points.push({ lat, lon });
    graticule.push(...line(points));
  }
  const cities = CITIES.map((city, index) => ({ ...city, ...project(city.lat, city.lon), index }));
  return { size: SIZE, center: CENTER, radius: RADIUS, d: graticule.join(''), cities };
}
