import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardActionArea, Chip, CircularProgress,
  Paper, Stack, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import TimerIcon from "@mui/icons-material/Timer";
import GridOnIcon from "@mui/icons-material/GridOn";
import HubIcon from "@mui/icons-material/Hub";
import AbcIcon from "@mui/icons-material/Abc";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";

import { gamesApi } from "../../utils/api";
import GridlockBoard from "./GridlockBoard";
import WeaveBoard from "./WeaveBoard";
import SpliceBoard from "./SpliceBoard";
import { g } from "./gameTheme";
import { gradeLocally, isComplete, solutionState, stateSignature } from "./gameRules";

/**
 * The guest puzzle segment on the public Thinklets page.
 *
 * Everything happens in this component: `/public/games` hands over the puzzle
 * *and* its solution, so grading is local and nothing is written anywhere —
 * no account, no play row, no streak, no history. Reloading the page starts
 * the visitor over, and that is the intended behaviour, not a gap.
 *
 * The guest puzzles are generated from a different salt than the student set
 * (see routes/game_routes.py), so shipping the solution here can never leak
 * the answer to the puzzle a class is being ranked on that day.
 *
 * Boards are shared with the signed-in experience rather than reimplemented,
 * which is what keeps the two from drifting apart.
 */

const BOARDS = { gridlock: GridlockBoard, weave: WeaveBoard, splice: SpliceBoard };

const ICONS = {
  gridlock: <GridOnIcon />,
  weave: <HubIcon />,
  splice: <AbcIcon />,
};

const formatClock = (ms) => {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function PublicGamesSection() {
  const navigate = useNavigate();

  const [games, setGames] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState(null);

  // Per-game play state, all client side and all disposable.
  const [boards, setBoards] = useState({});     // key -> board state
  const [results, setResults] = useState({});   // key -> 'solved' | 'revealed' | 'wrong'
  const [times, setTimes] = useState({});       // key -> final ms
  const startedAt = useRef({});
  const [, setTick] = useState(0);

  // Arrangements already graded, per game. A completed Gridlock stays
  // *complete* while a wrong digit is corrected, so "has it changed since the
  // last verdict" is the only workable re-check trigger — a sticky wrong flag
  // would latch and the board would never grade itself again.
  const checked = useRef({});

  useEffect(() => {
    let cancelled = false;
    gamesApi.publicList()
      .then((res) => { if (!cancelled) setGames(res.data?.enabled ? res.data.games : []); })
      .catch(() => { if (!cancelled) setGames([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const active = games?.find((game) => game.key === activeKey) || null;
  const outcome = activeKey ? results[activeKey] : null;
  const finished = outcome === "solved" || outcome === "revealed";

  // Tick the visible clock only while a puzzle is actually open and unfinished.
  useEffect(() => {
    if (!activeKey || finished) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeKey, finished]);

  const open = (key) => {
    setActiveKey(key);
    if (!startedAt.current[key]) startedAt.current[key] = Date.now();
  };

  const handleChange = useCallback((next) => {
    if (!activeKey) return;
    setBoards((prev) => ({ ...prev, [activeKey]: next }));
  }, [activeKey]);

  // Auto-check: the board grades itself the moment it is complete. No submit
  // button, matching the signed-in flow.
  useEffect(() => {
    if (!active || finished) return;
    const state = boards[active.key];
    if (!isComplete(active.key, active.puzzle, state)) return;

    const signature = stateSignature(active.key, active.puzzle, state);
    const seen = checked.current[active.key] || new Set();
    checked.current[active.key] = seen;
    if (seen.has(signature)) return;
    seen.add(signature);

    if (gradeLocally(active.key, active.puzzle, active.solution, state)) {
      setTimes((prev) => ({
        ...prev,
        [active.key]: Date.now() - (startedAt.current[active.key] || Date.now()),
      }));
      setResults((prev) => ({ ...prev, [active.key]: "solved" }));
    } else {
      setResults((prev) => ({ ...prev, [active.key]: "wrong" }));
    }
  }, [active, boards, finished]);

  const reveal = () => {
    if (!active) return;
    setBoards((prev) => ({
      ...prev,
      [active.key]: solutionState(active.key, active.puzzle, active.solution),
    }));
    setResults((prev) => ({ ...prev, [active.key]: "revealed" }));
  };

  const reset = () => {
    if (!active) return;
    setBoards((prev) => ({ ...prev, [active.key]: null }));
    setResults((prev) => ({ ...prev, [active.key]: null }));
    setTimes((prev) => ({ ...prev, [active.key]: null }));
    checked.current[active.key] = new Set();
    startedAt.current[active.key] = Date.now();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  // Games switched off, or the endpoint is unreachable — the marketing page
  // simply carries on without this segment.
  if (!games?.length) return null;

  const Board = active ? BOARDS[active.key] : null;
  const elapsed = active && !finished
    ? Date.now() - (startedAt.current[active.key] || Date.now())
    : times[activeKey] || 0;

  return (
    <Box component="section" sx={{ mt: { xs: 8, md: 12 } }} aria-labelledby="daily-puzzles-heading">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "flex-end" }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography
            id="daily-puzzles-heading"
            variant="h4"
            fontWeight={800}
            sx={{
              color: "#fff", fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em", fontSize: { xs: "1.75rem", md: "2.125rem" },
            }}
          >
            Daily Puzzles
          </Typography>
          <Typography sx={{ color: g.textSoft, mt: 1, maxWidth: 620 }}>
            Three fresh puzzles every day — numbers, shapes and words. Play them right
            here, no account needed. Students get the same set inside their dashboard,
            with streaks and anonymous class standings.
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label="No sign-up needed"
          sx={{
            bgcolor: g.accentTint, color: g.accent, fontWeight: 700,
            border: `1px solid ${g.accent}55`, flexShrink: 0,
          }}
        />
      </Stack>

      {/* Game picker */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
          mb: active ? 3 : 0,
        }}
      >
        {games.map((game) => {
          const state = results[game.key];
          const isActive = game.key === activeKey;
          return (
            <Card
              key={game.key}
              elevation={0}
              sx={{
                bgcolor: isActive ? g.accentTint : "rgba(30, 41, 59, 0.6)",
                border: `1px solid ${isActive ? g.accent : "rgba(255,255,255,0.10)"}`,
                borderRadius: 3,
                transition: "transform .15s, border-color .15s",
                "&:hover": { transform: "translateY(-3px)", borderColor: g.accent },
              }}
            >
              <CardActionArea
                onClick={() => open(game.key)}
                sx={{ p: 2.25, height: "100%", alignItems: "flex-start" }}
                aria-expanded={isActive}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <Box
                    sx={{
                      width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: state === "solved" ? g.successTint : g.accentTint,
                      color: state === "solved" ? g.success : g.accent,
                    }}
                  >
                    {state === "solved" ? <CheckCircleIcon /> : ICONS[game.key]}
                  </Box>
                  <Typography fontWeight={800} sx={{ color: "#fff" }}>{game.title}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: g.textSoft, lineHeight: 1.5 }}>
                  {game.tagline}
                </Typography>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      {/* Board */}
      {active && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.75, sm: 3 },
            borderRadius: 3,
            bgcolor: "rgba(30, 41, 59, 0.6)",
            border: `1px solid ${g.border}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: "#fff" }}>{active.title}</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              icon={<TimerIcon />}
              size="small"
              label={formatClock(elapsed)}
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
            />
          </Stack>

          <Box aria-live="polite">
            {outcome === "solved" && (
              <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                Solved in {formatClock(times[active.key])}. Nothing was saved — this one was
                just for fun.
              </Alert>
            )}
            {outcome === "revealed" && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                Here&apos;s the answer. Try another one, or start over.
              </Alert>
            )}
            {outcome === "wrong" && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                The board is full but not right yet — change something and it will check itself again.
              </Alert>
            )}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", overflowX: "auto", py: 1 }}>
            <Board
              payload={active.puzzle}
              state={boards[active.key]}
              onChange={handleChange}
              disabled={finished}
            />
          </Box>

          <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 2, color: g.textMuted }}>
            {finished ? "Nothing here is saved." : "Fill the board and it checks itself — there is no submit button."}
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
            <Button
              fullWidth variant="outlined" onClick={reset}
              startIcon={<RestartAltIcon />} sx={{ minHeight: 44 }}
            >
              Start over
            </Button>
            {!finished && (
              <Button
                fullWidth variant="text" color="inherit" onClick={reveal}
                startIcon={<VisibilityIcon />} sx={{ minHeight: 44 }}
              >
                Show the answer
              </Button>
            )}
            <Button
              fullWidth variant="contained" onClick={() => navigate("/login")}
              endIcon={<ArrowForwardIcon />} sx={{ minHeight: 44 }}
            >
              Play with streaks
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
