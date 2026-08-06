import React, { useState, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import ChartFrame, { ChartLegend, ChartEmpty } from './ChartFrame';
import { INK, FONT, seriesColor, scoreColor, scoreBand } from './chartTheme';

/**
 * Concentric progress rings — one ring per metric, each against its own target.
 *
 * This is the form for "how far through each of these are we", which a bar
 * chart answers less well because a bar has no natural notion of a ceiling.
 * Each ring carries its own track, so an empty ring still shows the distance
 * left to cover rather than simply being absent.
 *
 * Deliberately capped at five rings: past that the inner radii get too small
 * to compare and the thing becomes decoration.
 *
 * @param {{label: string, value: number, maxValue?: number, color?: string}[]} data
 */
const MAX_RINGS = 5;

export default function RingChart({
  data = [],
  title,
  hint,
  centerLabel = 'Average',
  height = 250,
  byScore = false,      // colour each ring by its own band rather than identity
  formatValue = (v) => `${Math.round(v)}%`,
}) {
  const [hovered, setHovered] = useState(null);

  const rings = useMemo(() => (
    data
      .filter(Boolean)
      .slice(0, MAX_RINGS)
      .map((d, i) => {
        const max = d.maxValue || 100;
        const pct = max ? Math.max(0, Math.min(100, (d.value / max) * 100)) : 0;
        return {
          ...d,
          pct,
          fill: d.color || (byScore ? scoreColor(pct) : seriesColor(d.label, i)),
        };
      })
      // Recharts stacks the first entry on the outermost ring; longest bar
      // outside reads better than an arbitrary order.
      .sort((a, b) => b.pct - a.pct)
  ), [data, byScore]);

  if (!rings.length) {
    return <ChartFrame title={title} hint={hint}><ChartEmpty /></ChartFrame>;
  }

  const average = rings.reduce((s, r) => s + r.pct, 0) / rings.length;
  const focus = hovered != null ? rings[hovered] : null;
  const centreValue = focus ? focus.pct : average;
  const centreText = focus ? focus.label : centerLabel;

  return (
    <ChartFrame title={title} hint={hint}>
      <Box sx={{ position: 'relative', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={rings}
            innerRadius="38%"
            outerRadius="98%"
            startAngle={90}
            endAngle={-270}
            barSize={12}
          >
            {/* Fixes the sweep to 0-100 so a ring's length means the same
                thing on every chart, rather than being normalised to
                whichever metric happens to be largest. */}
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="pct"
              angleAxisId={0}
              background={{ fill: INK.track }}
              cornerRadius={6}
              isAnimationActive
              animationDuration={620}
              onMouseEnter={(_, i) => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <Typography sx={{
            fontFamily: FONT, fontWeight: 800, lineHeight: 1,
            fontSize: '1.5rem', color: INK.primary,
          }}>
            {formatValue(centreValue)}
          </Typography>
          <Typography sx={{
            fontFamily: FONT, fontSize: '0.7rem', color: INK.muted, mt: 0.4,
            maxWidth: '64%', textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {centreText}
          </Typography>
          {focus && (
            <Typography sx={{ fontFamily: FONT, fontSize: '0.68rem', color: INK.secondary, mt: 0.2 }}>
              {scoreBand(focus.pct)}
            </Typography>
          )}
        </Box>
      </Box>

      <ChartLegend
        items={rings.map((r) => ({
          label: r.label,
          color: r.fill,
          value: formatValue(r.pct),
        }))}
        hovered={hovered}
        onHover={setHovered}
      />
    </ChartFrame>
  );
}
