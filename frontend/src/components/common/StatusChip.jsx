import React from 'react';
import { Chip } from '@mui/material';

/**
 * Semantic status chip — glassy translucent pill tuned for dark surfaces.
 */
const STYLES = {
  success: { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)', bd: 'rgba(52,211,153,0.30)' },
  active: { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)', bd: 'rgba(52,211,153,0.30)' },
  published: { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)', bd: 'rgba(52,211,153,0.30)' },
  approved: { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)', bd: 'rgba(52,211,153,0.30)' },
  completed: { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)', bd: 'rgba(52,211,153,0.30)' },
  live: { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)', bd: 'rgba(52,211,153,0.30)' },
  free: { fg: '#6ee7b7', bg: 'rgba(52,211,153,0.14)', bd: 'rgba(52,211,153,0.30)' },

  pending: { fg: '#fcd34d', bg: 'rgba(251,191,36,0.14)', bd: 'rgba(251,191,36,0.30)' },
  warning: { fg: '#fcd34d', bg: 'rgba(251,191,36,0.14)', bd: 'rgba(251,191,36,0.30)' },
  draft: { fg: '#fcd34d', bg: 'rgba(251,191,36,0.14)', bd: 'rgba(251,191,36,0.30)' },
  in_progress: { fg: '#fcd34d', bg: 'rgba(251,191,36,0.14)', bd: 'rgba(251,191,36,0.30)' },

  error: { fg: '#fda4af', bg: 'rgba(251,113,133,0.14)', bd: 'rgba(251,113,133,0.30)' },
  rejected: { fg: '#fda4af', bg: 'rgba(251,113,133,0.14)', bd: 'rgba(251,113,133,0.30)' },
  expired: { fg: '#fda4af', bg: 'rgba(251,113,133,0.14)', bd: 'rgba(251,113,133,0.30)' },
  inactive: { fg: '#fda4af', bg: 'rgba(251,113,133,0.14)', bd: 'rgba(251,113,133,0.30)' },

  info: { fg: '#93c5fd', bg: 'rgba(59,130,246,0.16)', bd: 'rgba(59,130,246,0.30)' },
  premium: { fg: '#ffce9e', bg: 'rgba(168,85,247,0.16)', bd: 'rgba(168,85,247,0.30)' },

  default: { fg: '#a5b4fc', bg: 'rgba(148,163,255,0.12)', bd: 'rgba(148,163,255,0.22)' },
};

const prettify = (s) =>
  String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function StatusChip({ status, label, size = 'small', icon, sx }) {
  const key = String(status || 'default').toLowerCase();
  const s = STYLES[key] || STYLES.default;
  return (
    <Chip
      size={size}
      icon={icon}
      label={label || prettify(status)}
      sx={{
        color: s.fg,
        bgcolor: s.bg,
        fontWeight: 700,
        border: `1px solid ${s.bd}`,
        '& .MuiChip-icon': { color: s.fg },
        ...sx,
      }}
    />
  );
}
