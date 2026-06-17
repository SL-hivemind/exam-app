import React from 'react';
import { Box, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GlassCard from './GlassCard';

/**
 * Glass action tile with a glowing gradient icon, title + description, a 3D tilt
 * on hover and an arrow that slides in. Generalizes the "Quick Prep Hub" cards.
 */
const GRADIENTS = {
  blue: { grad: 'linear-gradient(135deg,#3b82f6,#60a5fa)', glow: 'blue' },
  indigo: { grad: 'linear-gradient(135deg,#6366f1,#818cf8)', glow: 'indigo' },
  purple: { grad: 'linear-gradient(135deg,#f68914,#ffb054)', glow: 'purple' },
  success: { grad: 'linear-gradient(135deg,#10b981,#34d399)', glow: 'success' },
  warning: { grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)', glow: 'warning' },
  primary: { grad: 'linear-gradient(135deg,#6366f1,#818cf8)', glow: 'indigo' },
};

export default function ActionCard({ icon, title, description, color = 'indigo', onClick, sx }) {
  const c = GRADIENTS[color] || GRADIENTS.indigo;
  return (
    <GlassCard
      interactive
      tilt
      sheen
      glow={c.glow}
      onClick={onClick}
      sx={{
        p: 2.75, height: '100%',
        '&:hover .action-arrow': { opacity: 1, transform: 'translateX(0)' },
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 52, height: 52, borderRadius: 3, mb: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', background: c.grad,
          boxShadow: '0 10px 26px rgba(99,102,241,0.40)',
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, fontSize: '1.02rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
        {description}
      </Typography>
      <ArrowForwardIcon
        className="action-arrow"
        sx={{
          position: 'absolute', top: 22, right: 22, fontSize: 18,
          color: 'primary.light', opacity: 0, transform: 'translateX(-8px)',
          transition: 'all 0.25s ease',
        }}
      />
    </GlassCard>
  );
}
