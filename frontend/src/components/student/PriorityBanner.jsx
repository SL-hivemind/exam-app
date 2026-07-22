import React from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TimerIcon from "@mui/icons-material/Timer";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";

import { g } from "../games/gameTheme";
import { formatRemaining } from "./ExamStatus";

/**
 * The one thing that needs doing right now, pulled out of the list.
 *
 * The exam a student most urgently needs is frequently not on the page they
 * are looking at — the list is paginated five at a time and ordered by
 * creation date, so a half-finished exam with a running clock can sit on page
 * three. This comes from the summary endpoint, which searches every
 * assignment, so it surfaces regardless of pagination.
 *
 * Renders nothing when there is nothing urgent. An always-present banner
 * saying "nothing to do" trains people to ignore the banner.
 */

export default function PriorityBanner({ summary, onStart, starting }) {
  if (!summary) return null;

  const resume = summary.resume;
  const next = summary.next_up;
  const exam = resume || next;
  if (!exam) return null;

  const isResume = Boolean(resume);
  const now = new Date();
  const end = exam.access_end ? new Date(exam.access_end) : null;
  const start = exam.access_start ? new Date(exam.access_start) : null;
  const notYetOpen = Boolean(start && now < start);

  const remaining = end ? formatRemaining(end.getTime() - now.getTime()) : null;
  const untilOpen = start ? formatRemaining(start.getTime() - now.getTime()) : null;

  const tone = isResume ? g.warning : notYetOpen ? g.info : g.success;
  const heading = isResume
    ? "You have an exam in progress"
    : notYetOpen
      ? "Next up"
      : "An exam is open now";

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 3,
        borderRadius: 3,
        border: `1px solid ${tone}55`,
        background: `linear-gradient(135deg, ${tone}1f 0%, rgba(255,255,255,0.02) 100%)`,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75, flexWrap: "wrap" }}>
          <Typography sx={{ color: tone, fontWeight: 800, fontSize: "0.78rem", letterSpacing: "0.06em" }}>
            {heading.toUpperCase()}
          </Typography>
          {remaining && !notYetOpen && (
            <Chip
              size="small"
              icon={<TimerIcon sx={{ fontSize: 14 }} />}
              label={`${remaining} left`}
              sx={{
                height: 22, fontWeight: 700, fontSize: "0.7rem",
                bgcolor: `${tone}22`, color: tone, border: `1px solid ${tone}44`,
                "& .MuiChip-icon": { color: `${tone} !important` },
                "& .MuiChip-label": { color: "inherit" },
              }}
            />
          )}
          {notYetOpen && untilOpen && (
            <Chip
              size="small"
              icon={<EventAvailableIcon sx={{ fontSize: 14 }} />}
              label={`opens in ${untilOpen}`}
              sx={{
                height: 22, fontWeight: 700, fontSize: "0.7rem",
                bgcolor: `${tone}22`, color: tone, border: `1px solid ${tone}44`,
                "& .MuiChip-icon": { color: `${tone} !important` },
                "& .MuiChip-label": { color: "inherit" },
              }}
            />
          )}
        </Stack>

        <Typography
          sx={{
            color: "#fff", fontWeight: 700, lineHeight: 1.3,
            fontSize: { xs: "1.05rem", sm: "1.2rem" },
          }}
        >
          {exam.title}
        </Typography>
        <Typography sx={{ color: g.textSoft, fontSize: "0.85rem", mt: 0.4 }}>
          {exam.duration_minutes} minutes · {exam.total_marks} marks
        </Typography>
      </Box>

      {!notYetOpen && (
        <Button
          variant="contained"
          size="large"
          onClick={() => onStart(exam.id)}
          disabled={Boolean(starting)}
          startIcon={<PlayArrowIcon />}
          sx={{
            flexShrink: 0, minHeight: 48, px: 3,
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {starting === exam.id ? "Opening…" : isResume ? "Resume exam" : "Start exam"}
        </Button>
      )}
    </Box>
  );
}
