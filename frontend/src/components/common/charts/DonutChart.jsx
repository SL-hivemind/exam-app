import React, { useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ChartFrame, { ChartTooltip, ChartLegend, ChartEmpty } from './ChartFrame';
import { INK, FONT, SURFACE, OTHER, seriesColor } from './chartTheme';

/**
 * Donut with a live centre total.
 *
 * A bare pie makes people compare angles, which nobody does accurately. The
 * hole is what makes it work: the centre carries the number, and the ring is
 * only there for share-of-whole. Hovering a slice swaps the centre to that
 * slice, so the chart answers "how much of the total is this?" directly rather
 * than asking the reader to estimate it.
 *
 * Past six entities the tail folds into "Other" — a seventh generated hue
 * would not be separable for a colour-blind reader.
 *
 * @param {{label: string, value: number, color?: string}[]} data
 */
export default function DonutChart({
  data = [],
  title,
  hint,
  centerLabel = 'Total',
  formatValue = (v) => v?.toLocaleString?.() ?? v,
  maxSlices = 6,
  height = 240,
}) {
  const [hovered, setHovered] = useState(null);

  const slices = useMemo(() => {
    const sorted = [...data].filter((d) => d && d.value > 0).sort((a, b) => b.value - a.value);
    if (sorted.length <= maxSlices) {
      return sorted.map((d) => ({ ...d, color: d.color || seriesColor(d.label) }));
    }
    const head = sorted.slice(0, maxSlices - 1)
      .map((d) => ({ ...d, color: d.color || seriesColor(d.label) }));
    const rest = sorted.slice(maxSlices - 1);
    return [...head, {
      label: 'Other',
      value: rest.reduce((s, d) => s + d.value, 0),
      color: OTHER,
      count: rest.length,
    }];
  }, [data, maxSlices]);

  const total = useMemo(() => slices.reduce((s, d) => s + d.value, 0), [slices]);

  if (!slices.length) {
    return <ChartFrame title={title} hint={hint}><ChartEmpty /></ChartFrame>;
  }

  const focus = hovered != null ? slices[hovered] : null;
  const centreValue = focus ? focus.value : total;
  const centreText = focus ? focus.label : centerLabel;
  const share = focus && total ? Math.round((focus.value / total) * 100) : null;

  return (
    <ChartFrame title={title} hint={hint}>
      <Box sx={{ position: 'relative', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={<ChartTooltip formatter={(v) => `${formatValue(v)} (${Math.round((v / total) * 100)}%)`} />}
              cursor={false}
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              // 2px of surface between segments, so adjacent fills read as
              // separate marks rather than one continuous band.
              paddingAngle={2}
              stroke={SURFACE}
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive
              animationDuration={520}
              onMouseEnter={(_, i) => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {slices.map((d, i) => (
                <Cell
                  key={d.label}
                  fill={d.color}
                  opacity={hovered == null || hovered === i ? 1 : 0.35}
                  style={{ transition: 'opacity .15s ease', outline: 'none' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centre readout — the actual answer, in ink rather than the slice colour. */}
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <Typography sx={{
            fontFamily: FONT, fontWeight: 800, lineHeight: 1,
            fontSize: { xs: '1.5rem', md: '1.75rem' }, color: INK.primary,
          }}>
            {formatValue(centreValue)}
          </Typography>
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.72rem', color: INK.muted, mt: 0.5,
            maxWidth: '70%', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {centreText}{share != null ? ` · ${share}%` : ''}
          </Typography>
        </Box>
      </Box>

      <ChartLegend
        items={slices.map((d) => ({ label: d.label, color: d.color }))}
        hovered={hovered}
        onHover={setHovered}
      />
    </ChartFrame>
  );
}
