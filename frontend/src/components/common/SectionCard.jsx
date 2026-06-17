import React from 'react';
import { Box, Card, Divider, Stack, Typography } from '@mui/material';

/**
 * Titled, bordered container for grouping content. Optional header actions.
 *
 * <SectionCard title="Recent Results" subtitle="Last 30 days" actions={<Button/>}>
 *   ...content...
 * </SectionCard>
 */
export default function SectionCard({
  title,
  subtitle,
  actions,
  icon,
  children,
  noPadding = false,
  sx,
}) {
  return (
    <Card sx={{ overflow: 'hidden', ...sx }}>
      {(title || actions) && (
        <>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ px: 2.5, py: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
              {icon && <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>}
              <Box sx={{ minWidth: 0 }}>
                {title && (
                  <Typography sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Stack>
            {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
          </Stack>
          <Divider />
        </>
      )}
      <Box sx={{ p: noPadding ? 0 : 2.5 }}>{children}</Box>
    </Card>
  );
}
