import React from 'react';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { motion } from 'framer-motion';

/**
 * Page header: optional back button, glass icon tile, gradient title + subtitle,
 * and an actions slot. Reveals on mount.
 */
export default function PageHeader({ title, subtitle, actions, icon, onBack, sx }) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      sx={{ mb: 3.5, ...sx }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
      >
        <Stack direction="row" alignItems="center" spacing={1.75} sx={{ minWidth: 0 }}>
          {onBack && (
            <IconButton
              onClick={onBack}
              size="small"
              sx={{
                color: 'text.secondary',
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: 'rgba(148,163,255,0.14)', color: 'text.primary' },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          {icon && (
            <Box
              sx={{
                width: 46, height: 46, borderRadius: 3, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', background: 'linear-gradient(135deg,#6366f1,#f68914)',
                boxShadow: '0 8px 22px rgba(99,102,241,0.40)',
              }}
            >
              {icon}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800, lineHeight: 1.15,
                background: 'linear-gradient(120deg,#ffffff,#c7d2fe 70%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              noWrap
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {actions && (
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
