import React from 'react';
import { Box } from '@mui/material';

/**
 * The SL bolt mark, beside the "SL EXAMS" wordmark in the navbar.
 *
 * Points at logo-mark.png, not the raw Sl-metalic-png.png. That source is a
 * 1674x940 landscape image in which the bolt occupies 41% of the width and
 * carries its own baked-in "SL EXAMS" text — so objectFit:contain fitted the
 * empty width, the mark rendered at well under half the box it was given, and
 * the wordmark appeared twice. logo-mark.png is the same bolt, square and
 * cropped to 91% of the frame, with the text removed.
 */
export default function SLLogo({ sx = {} }) {
  return (
    <Box
      component="img"
      src="/logo-mark.png"
      alt="SL Exams logo"
      sx={{
        display: 'inline-block',
        objectFit: 'contain',
        ...sx,
      }}
    />
  );
}
