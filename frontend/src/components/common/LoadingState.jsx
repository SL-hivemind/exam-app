import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Centered loading indicator with an optional message.
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
      <CircularProgress size={36} thickness={4} />
      {message && (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
