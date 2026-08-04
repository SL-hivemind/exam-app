import React from 'react';
import { Box } from '@mui/material';

/**
 * Official SL master logo (from SL-Logo Master.svg, served from /public).
 * Rounded-tile mark used in the navbar beside the "SL EXAMS" wordmark.
 */
export default function SLLogo({ sx = {} }) {
  return (
    <Box
      component="img"
      src="/Sl-metalic-png.png"
      alt="SL Exams logo"
      sx={{
        display: 'inline-block',
        objectFit: 'contain',
        ...sx,
      }}
    />
  );
}
