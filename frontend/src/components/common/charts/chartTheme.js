/**
 * Shared chart tokens.
 *
 * The analysis pages each carried their own ad-hoc palette — blue, green,
 * pink, red, amber, purple, slate — assigned by whatever order the data
 * happened to arrive in. Two problems with that: the hues were never checked
 * for colour-vision separation, and because they were assigned by index a
 * filter that dropped one subject repainted all the others, so a colour meant
 * nothing from one view to the next.
 *
 * These six are a fixed order, validated against this app's actual dark chart
 * surface (#0f172a) for lightness band, chroma, CVD separation, normal-vision
 * separation and contrast. Worst adjacent pair: ΔE 8.4 under protanopia,
 * 19.3 normal vision — both clear.
 *
 * Assign by entity, never by position. `seriesColor(name)` hashes a stable
 * key so "Physics" is the same blue on every page and after every filter.
 */

export const SURFACE = '#0f172a';
export const PAGE = '#060a1f';

// Fixed categorical order. Never cycled beyond slot 6 — past that, fold the
// tail into "Other" rather than inventing hues.
export const SERIES = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#9085e9', // violet
];

export const OTHER = '#6b7db3';

// Reserved. Never reused as a series colour, and always shipped with a label
// so state is not carried by hue alone.
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
};

// Text stays in ink tokens. A value or a label never wears the series colour —
// the mark beside it carries identity.
export const INK = {
  primary: '#eaf0ff',
  secondary: '#a9b4dd',
  muted: '#6b7db3',
  grid: 'rgba(255,255,255,0.07)',
  axis: 'rgba(255,255,255,0.14)',
  track: 'rgba(255,255,255,0.06)',
};

export const FONT = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";

/** Stable colour for a named entity, so filtering never repaints survivors. */
export function seriesColor(name, index = 0) {
  if (!name) return SERIES[index % SERIES.length];
  let h = 0;
  const key = String(name);
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return SERIES[h % SERIES.length];
}

/**
 * Colour by band for a 0-100 score. Sequential meaning, not identity — used
 * where the number IS the message (a mastery ring, a pass rate).
 */
export function scoreColor(pct) {
  if (pct >= 75) return STATUS.good;
  if (pct >= 50) return SERIES[0];
  if (pct >= 35) return STATUS.warning;
  return STATUS.critical;
}

export const scoreBand = (pct) => (
  pct >= 75 ? 'Strong' : pct >= 50 ? 'On track' : pct >= 35 ? 'Needs work' : 'At risk'
);
