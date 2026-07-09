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
      src="/sl-logo-master.svg"
      alt="SL Exams logo"
      sx={{
        display: 'inline-block',
        borderRadius: '22%',
        objectFit: 'cover',
        ...sx,
      }}
    />
  );
}
