import React, { useState } from "react";
import { Box, Button, Chip, Collapse, Paper, Stack, Typography } from "@mui/material";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { g } from "../games/gameTheme";
import { RIDDLES } from "../../data/thinklets";

/**
 * Think Riddles — one riddle at a time, with a hint before the answer.
 *
 * The original version on the Home page showed a single hard-coded riddle and
 * one "Show Answer" button. The hint step in between is the whole point of the
 * redesign: revealing the answer immediately ends the thinking, and a student
 * who is stuck will always take the shortcut on offer. A hint keeps them in
 * the problem.
 *
 * State resets on navigation so moving to the next riddle never lands on an
 * already-spoiled card.
 */

const LEVEL_HUE = {
  Easy: g.success,
  Classic: g.accent,
  Medium: g.warning,
  Hard: g.danger,
};

export default function RiddleSection() {
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [solved, setSolved] = useState(() => new Set());

  const riddle = RIDDLES[index];
  const hue = LEVEL_HUE[riddle.level] || g.accent;

  const go = (delta) => {
    setIndex((i) => (i + delta + RIDDLES.length) % RIDDLES.length);
    setShowHint(false);
    setShowAnswer(false);
  };

  const reveal = () => {
    setShowAnswer(true);
    setSolved((prev) => new Set(prev).add(riddle.id));
  };

  return (
    <Box component="section" id="riddles" sx={{ scrollMarginTop: 88 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <LightbulbOutlinedIcon sx={{ color: g.accent, fontSize: 30 }} />
        <Typography
          variant="h4"
          component="h2"
          sx={{
            color: "#fff", fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-0.02em", fontSize: { xs: "1.6rem", md: "2.125rem" },
          }}
        >
          Think Riddles
        </Typography>
      </Stack>
      <Typography sx={{ color: g.textSoft, mb: 3, maxWidth: 620 }}>
        Take a hint before you take the answer — that is where the thinking happens.
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 4,
          bgcolor: "rgba(30, 41, 59, 0.6)",
          border: `1px solid ${g.border}`,
          maxWidth: 760,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
          <Chip
            size="small"
            label={riddle.level}
            sx={{
              bgcolor: `${hue}22`, color: hue, border: `1px solid ${hue}55`,
              fontWeight: 700, "& .MuiChip-label": { color: "inherit" },
            }}
          />
          {solved.has(riddle.id) && (
            <CheckCircleIcon sx={{ fontSize: 18, color: g.success }} aria-label="Answer seen" />
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" sx={{ color: g.textMuted, fontWeight: 700 }}>
            {index + 1} / {RIDDLES.length}
          </Typography>
        </Stack>

        <Typography
          sx={{
            color: "#fff", fontWeight: 500, lineHeight: 1.65, mb: 3,
            fontSize: { xs: "1.05rem", sm: "1.2rem" },
          }}
        >
          {riddle.question}
        </Typography>

        <Box aria-live="polite">
          {/* unmountOnExit is not cosmetic: Collapse keeps its children
              mounted by default, which would leave the answer sitting in the
              DOM for a screen reader to announce and for find-in-page to
              turn up — spoiling the riddle before it is asked for. */}
          <Collapse key={`hint-${riddle.id}`} in={showHint && !showAnswer} unmountOnExit>
            <Box
              sx={{
                mb: 2.5, p: 2, borderRadius: 2.5,
                bgcolor: g.warningTint, border: `1px solid ${g.warning}44`,
              }}
            >
              <Typography sx={{ color: g.warning, fontWeight: 700, fontSize: "0.82rem", mb: 0.5 }}>
                HINT
              </Typography>
              <Typography sx={{ color: g.text, fontSize: "0.95rem" }}>{riddle.hint}</Typography>
            </Box>
          </Collapse>

          {/* Keyed on the riddle: without it, advancing re-uses this Collapse
              and its exit animation renders the NEXT riddle's answer for the
              length of the transition — a spoiler flash on every tap. */}
          <Collapse key={`answer-${riddle.id}`} in={showAnswer} unmountOnExit>
            <Box
              sx={{
                mb: 2.5, p: 2.5, borderRadius: 2.5,
                bgcolor: g.successTint, border: `1px solid ${g.success}44`,
              }}
            >
              <Typography sx={{ color: g.success, fontWeight: 800, fontSize: "1.15rem", mb: 0.75 }}>
                {riddle.answer}
              </Typography>
              <Typography sx={{ color: g.text, fontSize: "0.95rem", lineHeight: 1.6 }}>
                {riddle.why}
              </Typography>
            </Box>
          </Collapse>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {!showAnswer && (
            <>
              <Button
                fullWidth
                variant={showHint ? "text" : "outlined"}
                onClick={() => setShowHint(true)}
                disabled={showHint}
                sx={{ minHeight: 44 }}
              >
                {showHint ? "Hint shown" : "Give me a hint"}
              </Button>
              <Button fullWidth variant="contained" onClick={reveal} sx={{ minHeight: 44 }}>
                Show the answer
              </Button>
            </>
          )}
          {showAnswer && (
            <Button
              fullWidth
              variant="contained"
              onClick={() => go(1)}
              endIcon={<ArrowForwardIosIcon sx={{ fontSize: 14 }} />}
              sx={{ minHeight: 44 }}
            >
              Next riddle
            </Button>
          )}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2.5 }}>
          <Button
            size="small"
            onClick={() => go(-1)}
            startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 12 }} />}
            sx={{ color: g.textSoft, minHeight: 40 }}
          >
            Previous
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          {!showAnswer && (
            <Button
              size="small"
              onClick={() => go(1)}
              endIcon={<ArrowForwardIosIcon sx={{ fontSize: 12 }} />}
              sx={{ color: g.textSoft, minHeight: 40 }}
            >
              Skip
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
