import React, { useEffect, useState } from "react";
import {
  Box, Card, CardActionArea, Chip, CircularProgress, Paper, Stack, Typography,
} from "@mui/material";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import GridOnIcon from "@mui/icons-material/GridOn";
import HubIcon from "@mui/icons-material/Hub";
import AbcIcon from "@mui/icons-material/Abc";
import { useNavigate } from "react-router-dom";

import { gamesApi } from "../../utils/api";
import { g, STATUS_TONE } from "./gameTheme";

/**
 * The daily games panel on the student dashboard.
 *
 * Renders nothing at all when games are unavailable — out-of-band class,
 * school switched off, or globally disabled. A student in class 11 should not
 * see an explanation of a feature that is not for them, so the component
 * simply returns null rather than showing an empty state.
 */

const ICONS = {
  gridlock: <GridOnIcon />,
  weave: <HubIcon />,
  splice: <AbcIcon />,
};

const STATUS_ICON = {
  solved: <CheckCircleIcon sx={{ fontSize: 16 }} />,
  revealed: <VisibilityIcon sx={{ fontSize: 16 }} />,
  in_progress: <PlayArrowIcon sx={{ fontSize: 16 }} />,
  not_started: <PlayArrowIcon sx={{ fontSize: 16 }} />,
};

export default function GamesHub({ onAvailability }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    gamesApi.list()
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // The dashboard sizes its exam column from this. Without it, a panel that
  // renders nothing still occupies its grid cell and leaves a third of a
  // desktop screen blank.
  useEffect(() => {
    if (loading) return;
    onAvailability?.(Boolean(data?.enabled));
  }, [loading, data, onAvailability]);

  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${g.border}`, textAlign: "center" }}>
        <CircularProgress size={24} />
      </Paper>
    );
  }

  // Not for this student — say nothing rather than explain an absence.
  if (!data?.enabled) return null;

  const streak = data.streak?.current_streak || 0;
  const solvedToday = data.games.filter((game) => game.status === "solved").length;

  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${g.border}`, overflow: "hidden" }}>
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          background: "linear-gradient(135deg, rgba(246,137,20,0.20) 0%, rgba(246,137,20,0.04) 100%)",
          borderBottom: `1px solid ${g.border}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={800} sx={{ color: g.text }}>Daily Puzzles</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            icon={<LocalFireDepartmentIcon sx={{ color: `${streak > 0 ? g.accent : g.textMuted} !important` }} />}
            label={streak > 0 ? `${streak} day${streak === 1 ? "" : "s"}` : "No streak"}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.10)", color: g.text, fontWeight: 700, flexShrink: 0 }}
          />
        </Stack>
        <Typography variant="body2" sx={{ color: g.textSoft, mt: 0.5 }}>
          {solvedToday === data.games.length
            ? "All done today — come back tomorrow to keep your streak."
            : `${solvedToday} of ${data.games.length} solved today.`}
        </Typography>
      </Box>

      <Stack sx={{ p: 1.5 }} spacing={1.25}>
        {data.games.map((game) => {
          const tone = STATUS_TONE[game.status] || STATUS_TONE.not_started;
          return (
            <Card
              key={game.key}
              elevation={0}
              sx={{
                border: `1px solid ${g.border}`, borderRadius: 2.5, bgcolor: g.surface,
                transition: "transform .15s, border-color .15s",
                "&:hover": { transform: "translateY(-2px)", borderColor: "rgba(246,137,20,0.45)" },
              }}
            >
              <CardActionArea
                onClick={() => navigate(`/student/games/${game.key}`)}
                sx={{ p: 1.75 }}
                aria-label={`${game.title} — ${tone.label}`}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: tone.bg, color: tone.fg,
                    }}
                  >
                    {ICONS[game.key]}
                  </Box>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography fontWeight={700} noWrap sx={{ color: g.text }}>{game.title}</Typography>
                    <Typography variant="caption" sx={{ display: "block", lineHeight: 1.3, color: g.textSoft }}>
                      {game.tagline}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    icon={STATUS_ICON[game.status] || STATUS_ICON.not_started}
                    label={tone.label}
                    sx={{
                      bgcolor: tone.bg, color: tone.fg, fontWeight: 700, flexShrink: 0,
                      border: `1px solid ${tone.fg}40`,
                      "& .MuiChip-icon": { color: `${tone.fg} !important` },
                      "& .MuiChip-label": { color: "inherit", px: { xs: 0.75, sm: 1 } },
                    }}
                  />
                </Stack>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>
    </Paper>
  );
}
