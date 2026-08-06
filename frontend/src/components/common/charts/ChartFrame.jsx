import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { INK, FONT } from './chartTheme';

/**
 * Shared chrome for every chart: title, optional hint, a legend row, and the
 * empty state. Having one of these is what keeps four charts on two pages from
 * drifting into four different looks.
 */
export function ChartTooltip({ active, payload, label, formatter, labelSuffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: 'rgba(9,14,42,0.96)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 2,
        px: 1.5,
        py: 1,
        boxShadow: '0 10px 30px rgba(2,6,23,0.6)',
        pointerEvents: 'none',
      }}
    >
      {label != null && (
        <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: INK.secondary, mb: 0.5 }}>
          {label}{labelSuffix}
        </Typography>
      )}
      <Stack spacing={0.4}>
        {payload.map((p) => (
          <Stack key={p.dataKey ?? p.name} direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 9, height: 9, borderRadius: '2px', bgcolor: p.color || p.fill, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', color: INK.secondary }}>
              {p.name}
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: '0.78rem', fontWeight: 700, color: INK.primary, ml: 'auto' }}>
              {formatter ? formatter(p.value, p) : p.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

/** Legend. Present whenever there are two or more series — identity is never
 *  carried by colour alone. */
export function ChartLegend({ items, onHover, hovered }) {
  if (!items?.length || items.length < 2) return null;
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={1.5}
      sx={{ mt: 1.5, rowGap: 0.75 }}
    >
      {items.map((it, i) => (
        <Stack
          key={it.label}
          direction="row"
          alignItems="center"
          spacing={0.75}
          onMouseEnter={() => onHover?.(i)}
          onMouseLeave={() => onHover?.(null)}
          sx={{
            cursor: onHover ? 'pointer' : 'default',
            opacity: hovered == null || hovered === i ? 1 : 0.42,
            transition: 'opacity .15s ease',
          }}
        >
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: it.color, flexShrink: 0 }} />
          <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: INK.secondary, whiteSpace: 'nowrap' }}>
            {it.label}
            {it.value != null && (
              <Box component="span" sx={{ color: INK.primary, fontWeight: 700, ml: 0.5 }}>
                {it.value}
              </Box>
            )}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function ChartEmpty({ message = 'No data yet' }) {
  return (
    <Box sx={{
      height: '100%', minHeight: 160, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{ fontFamily: FONT, fontSize: '0.85rem', color: INK.muted }}>
        {message}
      </Typography>
    </Box>
  );
}

export default function ChartFrame({ title, hint, action, children, sx }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', ...sx }}>
      {(title || action) && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Box>
            {title && (
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: '0.95rem', color: INK.primary }}>
                {title}
              </Typography>
            )}
            {hint && (
              <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', color: INK.muted }}>
                {hint}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
    </Box>
  );
}
