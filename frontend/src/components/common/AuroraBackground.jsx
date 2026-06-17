import React from 'react';
import { Box } from '@mui/material';

/**
 * Fixed, full-viewport animated aurora — three large blurred colour blooms
 * (blue / indigo / purple) drifting slowly behind all content. GPU-friendly
 * (transform/opacity only) and pointer-events: none so it never blocks the UI.
 *
 * Rendered once globally in App.jsx, behind everything (zIndex -1).
 */
const ORBS = [
  { color: 'rgba(47,107,255,0.50)', size: '46vw', top: '-10%', left: '-6%', anim: 'auroraDrift1 34s ease-in-out infinite' },
  { color: 'rgba(246,137,20,0.36)', size: '40vw', top: '-8%', right: '-8%', anim: 'auroraDrift2 40s ease-in-out infinite' },
  { color: 'rgba(91,108,255,0.42)', size: '50vw', bottom: '-24%', left: '30%', anim: 'auroraDrift3 38s ease-in-out infinite' },
];

export default function AuroraBackground() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        bgcolor: '#070b1d',
      }}
    >
      {ORBS.map((o, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: o.top, left: o.left, right: o.right, bottom: o.bottom,
            width: o.size, height: o.size,
            borderRadius: '50%',
            background: `radial-gradient(circle at 50% 50%, ${o.color}, transparent 65%)`,
            filter: 'blur(60px)',
            animation: o.anim,
            willChange: 'transform',
          }}
        />
      ))}
      {/* subtle grain/vignette to seat the glass */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(2,6,23,0.55) 100%)',
        }}
      />
    </Box>
  );
}
