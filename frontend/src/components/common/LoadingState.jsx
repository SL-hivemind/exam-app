import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Centered loading indicator with the SL Exams branded logo.
 * Pass `fullHeight` to vertically center within the viewport.
 */
export default function LoadingState({ message = 'Loading…', fullHeight = false, sx }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 6,
        minHeight: fullHeight ? '60vh' : 'auto',
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          animation: 'slLogoPulse 1.6s ease-in-out infinite',
          '@keyframes slLogoPulse': {
            '0%, 100%': {
              transform: 'scale(1)',
              filter: 'drop-shadow(0 0 6px rgba(56,149,248,.25))',
            },
            '50%': {
              transform: 'scale(1.06)',
              filter:
                'drop-shadow(0 0 16px rgba(56,149,248,.45)) drop-shadow(0 0 24px rgba(246,137,20,.2))',
            },
          },
        }}
      >
        <img
          src="/Sl-metalic-png.png"
          alt=""
          width={72}
          height={72}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </Box>
      {message && (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
