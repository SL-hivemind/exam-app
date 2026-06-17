import React from 'react';
import { Box, Typography } from '@mui/material';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';

/**
 * Friendly empty placeholder: icon + title + message + optional CTA.
 *
 * <EmptyState title="No exams yet" message="Create your first exam"
 *             action={<Button/>} />
 */
export default function EmptyState({ icon, title, message, action, dense = false, sx }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: dense ? 4 : 8,
        px: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 64, height: 64, borderRadius: '50%', mb: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'text.secondary', bgcolor: 'background.default',
          border: '1px solid', borderColor: 'divider',
          '& svg': { fontSize: 30 },
        }}
      >
        {icon || <InboxRoundedIcon />}
      </Box>
      {title && (
        <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {message && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mb: action ? 2.5 : 0 }}>
          {message}
        </Typography>
      )}
      {action}
    </Box>
  );
}
