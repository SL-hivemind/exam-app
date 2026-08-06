import React, { useState, useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import ChartFrame, { ChartTooltip, ChartLegend, ChartEmpty } from './ChartFrame';
import { INK, FONT, SURFACE, seriesColor } from './chartTheme';

/**
 * Shape-of-performance across subjects, with optional comparison series.
 *
 * The value of a radar is the silhouette — "strong in three, weak in one" is
 * legible at a glance in a way a bar chart of the same numbers is not. It is
 * also the one form where a second series earns its place: overlaying a class
 * average on a student, or last term on this one, turns the chart from a
 * description into a comparison.
 *
 * Capped at three overlays; more and the fills obscure each other whatever the
 * opacity. Below three axes a radar is meaningless, so it degrades to empty.
 *
 * @param {{axis: string, [seriesKey]: number}[]} data
 * @param {{key: string, label: string, color?: string}[]} series
 */
const MAX_SERIES = 3;

export default function SubjectRadarChart({
  data = [],
  series = [],
  title,
  hint,
  height = 260,
  domain = [0, 100],
  formatValue = (v) => (v == null ? '—' : `${Math.round(v)}%`),
}) {
  const [hovered, setHovered] = useState(null);

  const shown = useMemo(() => (
    series.slice(0, MAX_SERIES).map((s, i) => ({
      ...s,
      color: s.color || seriesColor(s.label || s.key, i),
    }))
  ), [series]);

  // Three axes is the floor — with two it is a line, with one a dot.
  if (data.length < 3 || !shown.length) {
    return (
      <ChartFrame title={title} hint={hint}>
        <ChartEmpty message={data.length ? 'Needs at least three subjects to compare' : 'No data yet'} />
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title={title} hint={hint}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke={INK.grid} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: INK.secondary, fontSize: 11, fontFamily: FONT }}
          />
          <PolarRadiusAxis
            domain={domain}
            tick={{ fill: INK.muted, fontSize: 9, fontFamily: FONT }}
            axisLine={false}
            tickCount={4}
          />
          <Tooltip content={<ChartTooltip formatter={formatValue} />} />
          {shown.map((s, i) => (
            <Radar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={s.color}
              // Low enough that two overlapping fills stay separable; the
              // stroke is what actually carries each shape.
              fillOpacity={hovered == null ? 0.18 : hovered === i ? 0.32 : 0.05}
              strokeOpacity={hovered == null || hovered === i ? 1 : 0.3}
              dot={{ r: 3, fill: s.color, stroke: SURFACE, strokeWidth: 1.5 }}
              isAnimationActive
              animationDuration={600}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>

      <ChartLegend
        items={shown.map((s) => ({ label: s.label, color: s.color }))}
        hovered={hovered}
        onHover={setHovered}
      />
    </ChartFrame>
  );
}
