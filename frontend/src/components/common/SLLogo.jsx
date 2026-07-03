import React from 'react';
import { Box } from '@mui/material';

export default function SLLogo({ sx = {} }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...sx }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <text x="35" y="85" fontFamily="'Times New Roman', Times, serif" fontSize="90" fill="#f5a623">L</text>
        <text x="15" y="72" fontFamily="'Times New Roman', Times, serif" fontSize="95" fill="#2f6bff">S</text>
      </svg>
    </Box>
  );
}
