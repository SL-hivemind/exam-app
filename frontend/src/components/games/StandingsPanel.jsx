import React from "react";
import { Box, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import SchoolIcon from "@mui/icons-material/School";
import PublicIcon from "@mui/icons-material/Public";

import { g, bandColour } from "./gameTheme";

/**
 * Anonymous standings: percentile bands only, never a name or an ordered list.
 *
 * A scope reports nothing until enough students have solved it. That floor is
 * a privacy requirement, not a UX preference — in a class where three students
 * played, "top 33%" identifies a specific child by elimination. When a scope is
 * withheld the panel says so plainly rather than showing an empty row, so it
 * reads as "not yet" instead of "broken".
 */

const SCOPES = [
  { key: "class", label: "Your class", icon: <GroupsIcon fontSize="small" /> },
  { key: "school", label: "Your school", icon: <SchoolIcon fontSize="small" /> },
  { key: "overall", label: "All schools", icon: <PublicIcon fontSize="small" /> },
];

const scopeName = (scope) =>
  scope === "class" ? "your class" : scope === "school" ? "your school" : "all schools";

export default function StandingsPanel({ standings, gameTitle }) {
  if (!standings) return null;
  const { scopes, headline, privacy_floor: floor } = standings;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: `1px solid ${g.border}` }}>
      <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ color: g.text }}>
        Where you stand
      </Typography>

      {headline ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800} sx={{ color: bandColour(headline.band_label) }}>
            {headline.band_label}
          </Typography>
          <Typography variant="body2" sx={{ color: g.textSoft }}>
            of everyone in {scopeName(headline.scope)} who solved today&apos;s {gameTitle}.
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ mb: 2, color: g.textSoft }}>
          Not enough players yet today. Standings appear once at least {floor} students
          have solved it — that way no one can be identified from their rank.
        </Typography>
      )}

      <Stack spacing={1.75}>
        {SCOPES.map(({ key, label, icon }) => {
          const scope = scopes?.[key];
          if (!scope) return null;
          const colour = bandColour(scope.band_label);
          return (
            <Box key={key}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Box sx={{ color: g.textMuted, display: "flex" }}>{icon}</Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: g.text }}>{label}</Typography>
                {scope.available ? (
                  <Chip
                    size="small"
                    label={scope.band_label}
                    sx={{
                      ml: "auto", fontWeight: 800, flexShrink: 0,
                      color: colour, bgcolor: `${colour}22`, border: `1px solid ${colour}55`,
                      "& .MuiChip-label": { color: "inherit" },
                    }}
                  />
                ) : (
                  <Typography variant="caption" sx={{ ml: "auto", color: g.textMuted }}>
                    needs {floor} solvers
                  </Typography>
                )}
              </Stack>

              <LinearProgress
                variant="determinate"
                value={scope.solve_rate}
                aria-label={`${label} solve rate`}
                sx={{
                  height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.08)",
                  "& .MuiLinearProgress-bar": { bgcolor: colour, borderRadius: 3 },
                }}
              />
              <Typography variant="caption" sx={{ color: g.textSoft }}>
                {scope.solve_rate}% of {scope.players} {scope.players === 1 ? "player" : "players"} solved it
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}
