import React, { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import ChartFrame, { ChartTooltip, ChartLegend, ChartEmpty } from './ChartFrame';
import { INK, FONT, SURFACE, SERIES, scoreColor } from './chartTheme';

/**
 * Bars for the per-point measure, a line for its trend, on ONE axis.
 *
 * Deliberately single-axis. A second y-scale is the most common way to make a
 * chart lie: the crossover point between the two series is then an artefact of
 * where the axes were pinned, and readers take it for a real event. If a second
 * measure genuinely has a different scale it belongs in its own chart, or
 * indexed to a shared base.
 *
 * @param {{label: string, value: number, trend?: number}[]} data
 */
export default function ComposedTrendChart({
  data = [],
  title,
  hint,
  barName = 'Score',
  lineName = 'Running average',
  height = 260,
  domain = [0, 100],
  average = null,          // draws a reference line when supplied
  colorByScore = false,
  formatValue = (v) => (v == null ? '—' : `${Math.round(v)}%`),
}) {
  // Running average, so the line says something the bars do not.
  const rows = useMemo(() => {
    let sum = 0;
    return data.map((d, i) => {
      sum += d.value ?? 0;
      return { ...d, trend: d.trend != null ? d.trend : sum / (i + 1) };
    });
  }, [data]);

  if (!rows.length) {
    return <ChartFrame title={title} hint={hint}><ChartEmpty /></ChartFrame>;
  }

  return (
    <ChartFrame title={title} hint={hint}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: INK.muted, fontSize: 11, fontFamily: FONT }}
            axisLine={{ stroke: INK.axis }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={domain}
            tick={{ fill: INK.muted, fontSize: 11, fontFamily: FONT }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip formatter={formatValue} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />

          {average != null && (
            <ReferenceLine
              y={average}
              stroke={INK.axis}
              strokeDasharray="4 4"
              label={{
                value: `avg ${Math.round(average)}%`,
                position: 'right',
                fill: INK.muted,
                fontSize: 10,
                fontFamily: FONT,
              }}
            />
          )}

          <Bar
            dataKey="value"
            name={barName}
            fill={SERIES[0]}
            // 4px rounded top, anchored to the baseline — the data end is
            // rounded, the zero end is not.
            radius={[4, 4, 0, 0]}
            maxBarSize={34}
            isAnimationActive
            animationDuration={520}
          >
            {colorByScore && rows.map((r) => (
              <Cell key={r.label} fill={scoreColor(r.value)} />
            ))}
          </Bar>

          <Line
            type="monotone"
            dataKey="trend"
            name={lineName}
            stroke={SERIES[1]}
            strokeWidth={2}
            dot={false}
            // A surface-coloured ring keeps the marker legible where the line
            // crosses a bar.
            activeDot={{ r: 5, fill: SERIES[1], stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={620}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <ChartLegend
        items={[
          { label: barName, color: colorByScore ? INK.secondary : SERIES[0] },
          { label: lineName, color: SERIES[1] },
        ]}
      />
    </ChartFrame>
  );
}

/** Area variant, for a pure time series where the shape matters more than
 *  the individual points. */
export function TrendAreaChart({
  data = [], title, hint, name = 'Score', height = 240, domain = [0, 100],
  formatValue = (v) => `${Math.round(v)}%`,
}) {
  if (!data.length) {
    return <ChartFrame title={title} hint={hint}><ChartEmpty /></ChartFrame>;
  }
  return (
    <ChartFrame title={title} hint={hint}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="slTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: INK.muted, fontSize: 11, fontFamily: FONT }}
            axisLine={{ stroke: INK.axis }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={domain}
            tick={{ fill: INK.muted, fontSize: 11, fontFamily: FONT }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip formatter={formatValue} />} />
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={SERIES[0]}
            strokeWidth={2}
            fill="url(#slTrendFill)"
            activeDot={{ r: 5, fill: SERIES[0], stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={620}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
