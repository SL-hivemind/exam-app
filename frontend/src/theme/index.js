// src/theme/index.js
// ─────────────────────────────────────────────────────────────
// "Midnight Royal + Amber" — dark glassmorphic design system.
// Deep navy base, brand BLUE (#024392 family) + brand ORANGE (#f68914, from
// the SL logo). Professional study-site typography (Plus Jakarta Sans).
// Re-tint by editing `tokens`.
// ─────────────────────────────────────────────────────────────
import { createTheme } from '@mui/material/styles';

const FONT_FAMILY =
  "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const tokens = {
  font: FONT_FAMILY,

  // Brand accents (from logo: blue #024392, orange #f68914)
  blue: '#3b82f6',
  royal: '#2f6bff',
  indigo: '#5b6cff',
  orange: '#f68914',
  orangeLight: '#ffb054',
  accent: '#f68914',
  accentGradient: 'linear-gradient(135deg, #2f6bff 0%, #f68914 100%)',
  blueGradient: 'linear-gradient(135deg, #2f6bff 0%, #1d4ed8 100%)',
  orangeGradient: 'linear-gradient(135deg, #f68914 0%, #ff7a00 100%)',

  // Base surfaces (deep navy)
  bg0: '#070b1d',
  bg1: '#0b1130',
  bg2: '#0f1740',

  // Glass
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassBorderStrong: 'rgba(246,137,20,0.35)',

  // Text (brighter for contrast / highlight)
  text: '#f5f8ff',
  textSoft: '#b4c0e4',
  textMuted: '#7e8abb',

  // Semantic
  success: '#34d399',
  warning: '#fbbf24',
  error: '#fb7185',
  info: '#38bdf8',

  // Glows
  glowCard: '0 12px 44px rgba(2,6,23,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
  glowBlue: '0 8px 28px rgba(47,107,255,0.40)',
  glowOrange: '0 8px 28px rgba(246,137,20,0.42)',
  glowAccent: '0 10px 30px rgba(246,137,20,0.40)',
  radius: 16,
};

const glassSurface = {
  backgroundColor: tokens.glass,
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${tokens.glassBorder}`,
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: tokens.royal, light: '#6f9bff', dark: '#1d4ed8', contrastText: '#ffffff' },
    secondary: { main: tokens.orange, light: tokens.orangeLight, dark: '#d9740b', contrastText: '#1a1206' },
    info: { main: tokens.info },
    success: { main: tokens.success },
    warning: { main: tokens.warning },
    error: { main: tokens.error },
    background: { default: tokens.bg0, paper: tokens.bg1 },
    text: { primary: tokens.text, secondary: tokens.textSoft },
    divider: 'rgba(255,255,255,0.09)',
    neutral: { glass: tokens.glass, border: tokens.glassBorder, muted: tokens.textMuted, ink: tokens.bg0 },
  },

  shape: { borderRadius: tokens.radius },

  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontWeight: 800, letterSpacing: '-0.025em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { color: tokens.text },
    body2: { color: tokens.textSoft },
    button: { fontWeight: 700, textTransform: 'none', letterSpacing: 0 },
    overline: { fontWeight: 700, letterSpacing: '0.12em' },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: '100vh',
          color: tokens.text,
          backgroundColor: tokens.bg0,
          backgroundImage: [
            'radial-gradient(1100px 760px at 6% -8%, rgba(47,107,255,0.22), transparent 60%)',
            'radial-gradient(1000px 720px at 100% -4%, rgba(246,137,20,0.16), transparent 55%)',
            'radial-gradient(1200px 900px at 50% 120%, rgba(91,108,255,0.18), transparent 60%)',
          ].join(','),
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
        },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(126,138,187,0.30)', borderRadius: 10,
          border: '2px solid transparent', backgroundClip: 'padding-box',
        },
        '*::-webkit-scrollbar-thumb:hover': { background: 'rgba(246,137,20,0.40)' },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { ...glassSurface, backgroundImage: 'none', color: tokens.text },
        outlined: { border: `1px solid ${tokens.glassBorder}` },
        elevation1: { ...glassSurface, boxShadow: tokens.glowCard },
        elevation8: { ...glassSurface, boxShadow: tokens.glowCard },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { ...glassSurface, borderRadius: 18, boxShadow: tokens.glowCard, color: tokens.text },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 700, paddingInline: 18, paddingBlock: 8 },
        containedPrimary: {
          background: tokens.blueGradient,
          boxShadow: tokens.glowBlue,
          '&:hover': { background: tokens.blueGradient, boxShadow: '0 10px 32px rgba(47,107,255,0.55)' },
          transition: 'all 0.2s ease',
        },
        containedSecondary: {
          background: tokens.orangeGradient,
          boxShadow: tokens.glowOrange,
          color: '#1a1206',
          '&:hover': { background: tokens.orangeGradient, boxShadow: '0 10px 32px rgba(246,137,20,0.6)' },
        },
        outlined: {
          borderColor: tokens.glassBorder,
          color: tokens.text,
          backgroundColor: 'rgba(255,255,255,0.02)',
          '&:hover': { borderColor: 'rgba(246,137,20,0.55)', backgroundColor: 'rgba(246,137,20,0.08)' },
        },
        text: { color: tokens.textSoft, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)', color: tokens.text } },
      },
      variants: [
        {
          props: { variant: 'gradient' },
          style: {
            color: '#fff',
            background: tokens.accentGradient,
            boxShadow: tokens.glowAccent,
            '&:hover': { boxShadow: '0 12px 34px rgba(246,137,20,0.55)' },
            transition: 'all 0.2s ease',
          },
        },
      ],
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9, fontWeight: 600,
          backgroundColor: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.09)', color: tokens.text,
        },
        outlined: { backgroundColor: 'transparent' },
      },
    },

    MuiTextField: { defaultProps: { size: 'small' } },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.04)',
          color: tokens.text,
          '& fieldset': { borderColor: tokens.glassBorder },
          '&:hover fieldset': { borderColor: 'rgba(246,137,20,0.45)' },
          '&.Mui-focused fieldset': { borderColor: tokens.orange, boxShadow: '0 0 0 4px rgba(246,137,20,0.16)' },
        },
        input: { '&::placeholder': { color: tokens.textMuted, opacity: 1 } },
      },
    },

    MuiInputLabel: { styleOverrides: { root: { color: tokens.textSoft } } },
    MuiFormLabel: { styleOverrides: { root: { color: tokens.textSoft } } },

    MuiAppBar: { defaultProps: { elevation: 0, color: 'transparent' } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: 'transparent', borderRight: 'none', backgroundImage: 'none' } } },

    MuiDialog: {
      styleOverrides: {
        paper: {
          ...glassSurface,
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderRadius: 20, boxShadow: '0 30px 80px rgba(2,6,23,0.7)',
          backgroundColor: 'rgba(13,19,52,0.85)',
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(255,255,255,0.07)', color: tokens.text },
        head: {
          backgroundColor: 'transparent', fontWeight: 700, color: tokens.textMuted,
          fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em',
        },
      },
    },

    MuiTableRow: { styleOverrides: { root: { '&:hover': { backgroundColor: 'rgba(246,137,20,0.05)' } } } },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(11,17,48,0.94)', border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(8px)', fontSize: '0.72rem', fontWeight: 500, borderRadius: 8,
        },
      },
    },

    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, color: tokens.textSoft, '&.Mui-selected': { color: tokens.text } } } },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: tokens.orange, height: 3, borderRadius: 3 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.09)' } } },
    MuiListItemIcon: { styleOverrides: { root: { color: 'inherit' } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' } } },
    MuiLinearProgress: { styleOverrides: { root: { backgroundColor: 'rgba(255,255,255,0.08)' } } },
  },
});

export default theme;
