import React from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";

import { g } from "../games/gameTheme";
import { STATUS } from "./ExamStatus";

/**
 * The counters across the top of the student dashboard.
 *
 * These were computed in StudentDashboard and then never rendered — and had
 * they been rendered they would have been wrong, because they tallied the
 * current page of five rather than the student's whole record. The numbers
 * here come from /student/exams/summary, which counts every assignment.
 *
 * Tiles are buttons, not decoration: tapping one filters the list below. A
 * number a student cannot act on is just noise.
 */

const TILES = [
  { key: "active", label: "Open now", from: (s) => s.active_now + s.in_progress, tone: STATUS.active },
  { key: "upcoming", label: "Upcoming", from: (s) => s.upcoming, tone: STATUS.upcoming },
  { key: "results_pending", label: "Awaiting results", from: (s) => s.results_pending, tone: STATUS.results_pending },
  { key: "completed", label: "Completed", from: (s) => s.completed, tone: STATUS.completed },
];

export default function StatTiles({ summary, loading, active, onSelect }) {
  if (loading) {
    return (
      <Box
        sx={{
          display: "grid", gap: 1.5, mb: 3,
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)", lg: "repeat(5, 1fr)",
          },
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={92} sx={{ borderRadius: 3 }} />
        ))}
      </Box>
    );
  }

  if (!summary) return null;

  return (
    <Box
      role="group"
      aria-label="Filter exams by status"
      sx={{
        display: "grid", gap: 1.5, mb: 3,
        // Four filters plus the average readout: 2-up on a phone, the four
        // filters on one row on a tablet, all five on one row from lg.
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)", lg: "repeat(5, 1fr)",
        },
      }}
    >
      {TILES.map((tile) => {
        const value = tile.from(summary) || 0;
        const selected = active === tile.key;
        const empty = value === 0;
        return (
          <Box
            key={tile.key}
            component="button"
            type="button"
            disabled={empty}
            aria-pressed={selected}
            onClick={() => onSelect(selected ? "all" : tile.key)}
            sx={{
              textAlign: "left", font: "inherit", cursor: empty ? "default" : "pointer",
              p: { xs: 1.5, sm: 2 }, borderRadius: 3, minHeight: 92,
              bgcolor: selected ? tile.tone.tint : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected ? `${tile.tone.fg}77` : g.border}`,
              opacity: empty ? 0.45 : 1,
              transition: "transform .15s, border-color .15s, background-color .15s",
              "&:hover:not(:disabled)": {
                transform: "translateY(-2px)", borderColor: `${tile.tone.fg}88`,
              },
              "&:focus-visible": { outline: `2px solid ${tile.tone.fg}`, outlineOffset: 2 },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: "1.75rem", sm: "2rem" }, fontWeight: 800, lineHeight: 1,
                color: empty ? g.textMuted : tile.tone.fg,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </Typography>
            <Typography
              sx={{
                color: g.textSoft, fontSize: { xs: "0.75rem", sm: "0.8rem" },
                fontWeight: 700, mt: 0.75,
              }}
            >
              {tile.label}
            </Typography>
          </Box>
        );
      })}

      {/* Average is a readout, not a filter — it has nothing to filter to. */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 }, borderRadius: 3, minHeight: 92,
          bgcolor: "rgba(246,137,20,0.08)", border: `1px solid ${g.accent}44`,
          gridColumn: { xs: "span 2", sm: "span 4", lg: "auto" },
        }}
      >
        <Stack direction="row" alignItems="baseline" spacing={0.5}>
          <Typography
            sx={{
              fontSize: { xs: "1.75rem", sm: "2rem" }, fontWeight: 800, lineHeight: 1,
              color: summary.average_score == null ? g.textMuted : g.accent,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {summary.average_score == null ? "—" : summary.average_score}
          </Typography>
          {summary.average_score != null && (
            <Typography sx={{ color: g.accent, fontWeight: 700, fontSize: "0.9rem" }}>
              avg
            </Typography>
          )}
        </Stack>
        <Typography sx={{ color: g.textSoft, fontSize: { xs: "0.75rem", sm: "0.8rem" }, fontWeight: 700, mt: 0.75 }}>
          {summary.scored_count
            ? `across ${summary.scored_count} released result${summary.scored_count === 1 ? "" : "s"}`
            : "No results released yet"}
        </Typography>
      </Box>
    </Box>
  );
}
