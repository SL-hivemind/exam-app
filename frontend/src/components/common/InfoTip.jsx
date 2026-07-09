import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

/**
 * Tiny guidance helpers used across dashboards so buttons/metrics explain
 * themselves to school admins and students.
 *
 * <InfoTip text="What percentile means…" />           — hoverable ⓘ icon
 * <HelpCaption>Download a sample file…</HelpCaption>  — small text under a control
 */
export default function InfoTip({ text, size = 16, sx }) {
  return (
    <Tooltip title={text} arrow enterTouchDelay={0} leaveTouchDelay={4000}>
      <InfoOutlinedIcon
        sx={{
          fontSize: size,
          color: '#7e8abb',
          cursor: 'help',
          verticalAlign: 'middle',
          '&:hover': { color: '#ffb054' },
          ...sx,
        }}
      />
    </Tooltip>
  );
}

export function HelpCaption({ children, sx }) {
  return (
    <Typography
      variant="caption"
      sx={{ display: 'block', color: '#7e8abb', lineHeight: 1.5, mt: 0.5, ...sx }}
    >
      {children}
    </Typography>
  );
}

/** Wrap any element with a tooltip — for buttons that need explaining. */
export function WithHint({ hint, children }) {
  return (
    <Tooltip title={hint} arrow enterTouchDelay={0} leaveTouchDelay={4000}>
      <Box component="span" sx={{ display: 'inline-flex' }}>{children}</Box>
    </Tooltip>
  );
}
