import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import GlassCard from './GlassCard';

/**
 * Glass metric tile: glowing gradient icon, big value, label + trend pill.
 * <StatCard icon={<PeopleIcon/>} value={1240} label="Students" color="blue" trend="+12%" />
 */
const COLORS = {
  blue: { grad: 'linear-gradient(135deg,#3b82f6,#60a5fa)', fg: '#93c5fd', glow: 'blue' },
  indigo: { grad: 'linear-gradient(135deg,#6366f1,#818cf8)', fg: '#a5b4fc', glow: 'indigo' },
  purple: { grad: 'linear-gradient(135deg,#f68914,#ffb054)', fg: '#ffce9e', glow: 'purple' },
  success: { grad: 'linear-gradient(135deg,#10b981,#34d399)', fg: '#6ee7b7', glow: 'success' },
  warning: { grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)', fg: '#fcd34d', glow: 'warning' },
  primary: { grad: 'linear-gradient(135deg,#6366f1,#818cf8)', fg: '#a5b4fc', glow: 'indigo' },
};

export default function StatCard({ icon, value, label, color = 'indigo', trend, trendUp = true, onClick, sx }) {
  const c = COLORS[color] || COLORS.indigo;
  return (
    <GlassCard interactive glow={c.glow} onClick={onClick} sx={{ p: 2.5, height: '100%', ...sx }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
        {icon && (
          <Box
            sx={{
              width: 46, height: 46, borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', background: c.grad,
              boxShadow: `0 8px 22px rgba(99,102,241,0.35)`,
            }}
          >
            {icon}
          </Box>
        )}
        {trend != null && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800, px: 1, py: 0.3, borderRadius: 1.5,
              color: trendUp ? 'success.main' : 'error.main',
              bgcolor: trendUp ? 'rgba(52,211,153,0.14)' : 'rgba(251,113,133,0.14)',
              border: '1px solid', borderColor: trendUp ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)',
            }}
          >
            {trend}
          </Typography>
        )}
      </Stack>
      <Typography sx={{ fontWeight: 800, fontSize: '1.8rem', color: 'text.primary', lineHeight: 1.05 }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.5 }}>
        {label}
      </Typography>
    </GlassCard>
  );
}
