/**
 * Surface and status colours for the games UI.
 *
 * The games were first built against a light slate palette (#f8fafc panels,
 * #0f172a text) and dropped into an app whose theme is dark glassmorphic
 * (`src/theme/index.js`). The result was near-invisible: MUI painted white
 * theme text onto the components' own white backgrounds. Everything here is
 * chosen to sit on the dark navy base, so no games component hard-codes a
 * light surface any more.
 *
 * Contrast targets: body text >= 4.5:1 and large/bold labels >= 3:1 against
 * the surface they sit on.
 */

export const g = {
  // Panels, stacked from the page background upwards.
  surface: 'rgba(255,255,255,0.045)',
  surfaceRaised: 'rgba(255,255,255,0.07)',
  surfaceSunken: 'rgba(9,14,38,0.55)',
  border: 'rgba(255,255,255,0.12)',
  borderStrong: 'rgba(255,255,255,0.22)',

  // Text.
  text: '#f5f8ff',
  textSoft: '#b4c0e4',
  textMuted: '#8d99c9',

  // Brand + semantic accents, each with a tint that reads on dark.
  accent: '#f68914',
  accentTint: 'rgba(246,137,20,0.16)',
  success: '#4ade80',
  successTint: 'rgba(74,222,128,0.16)',
  warning: '#fbbf24',
  warningTint: 'rgba(251,191,36,0.16)',
  danger: '#fb7185',
  dangerTint: 'rgba(251,113,133,0.16)',
  info: '#60a5fa',
  infoTint: 'rgba(96,165,250,0.16)',
};

/** Status pill styling for the three play states plus "not started". */
export const STATUS_TONE = {
  solved: { label: 'Solved', fg: g.success, bg: g.successTint },
  revealed: { label: 'Revealed', fg: g.textSoft, bg: 'rgba(255,255,255,0.10)' },
  in_progress: { label: 'Resume', fg: g.warning, bg: g.warningTint },
  not_started: { label: 'Play', fg: g.accent, bg: g.accentTint },
};

/** Percentile band colours, all lightened for a dark background. */
export const bandColour = (label) => {
  if (label === 'Top 1%') return g.accent;
  if (label === 'Top 5%') return '#c084fc';
  if (label === 'Top 10%') return g.info;
  if (label === 'Top 25%') return '#2dd4bf';
  if (label === 'Top 50%') return g.success;
  return g.textSoft;
};

/**
 * A square that shrinks to fit the viewport.
 *
 * Fixed pixel cells overflowed a 360px phone once a 6x6 Gridlock grid plus its
 * row-target column was laid out. `columns` counts every column in the row,
 * targets included, and `gutter` is the horizontal chrome outside the board.
 */
export const fluidCell = (columns, max, gutter = 96) =>
  `min(${max}px, calc((100vw - ${gutter}px) / ${columns}))`;

/** Minimum comfortable touch target — WCAG 2.5.8 asks for 24px, we use 44. */
export const TOUCH = 44;
