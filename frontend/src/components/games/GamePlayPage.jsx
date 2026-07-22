import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Paper, Stack, Toolbar, Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LightbulbIcon from "@mui/icons-material/LightbulbOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TimerIcon from "@mui/icons-material/Timer";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { useNavigate, useParams } from "react-router-dom";

import { gamesApi } from "../../utils/api";
import GridlockBoard from "./GridlockBoard";
import WeaveBoard from "./WeaveBoard";
import SpliceBoard from "./SpliceBoard";
import StandingsPanel from "./StandingsPanel";
import { g } from "./gameTheme";
import { isComplete, solutionState, stateSignature } from "./gameRules";

const BOARDS = { gridlock: GridlockBoard, weave: WeaveBoard, splice: SpliceBoard };

const formatClock = (ms) => {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function GamePlayPage() {
  const { key } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [boardState, setBoardState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);       // 'solved' | 'revealed'
  const [detail, setDetail] = useState(null);
  const [hintNote, setHintNote] = useState("");
  const [standings, setStandings] = useState(null);
  const [confirmReveal, setConfirmReveal] = useState(false);

  // The clock is display only. `elapsed_ms` on the server is derived from
  // started_at, so nothing here can influence a rank.
  const [baseMs, setBaseMs] = useState(0);
  const [, setTick] = useState(0);
  const mountedAt = useRef(Date.now());
  const saveTimer = useRef(null);

  // Board arrangements already sent for checking. Auto-submit fires once per
  // distinct completed board, so a student who fills the grid wrongly, changes
  // one digit and refills it gets a second check — but typing inside an
  // already-checked arrangement does not spam the endpoint.
  const checked = useRef(new Set());

  const Board = BOARDS[key];

  const loadStandings = useCallback(async () => {
    try {
      setStandings((await gamesApi.standings(key)).data);
    } catch {
      /* standings are supplementary — never block the results screen */
    }
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await gamesApi.start(key);
        if (cancelled) return;
        setData(res.data);
        setBoardState(res.data.state || null);
        setBaseMs(res.data.elapsed_ms_so_far || 0);
        mountedAt.current = Date.now();
        if (res.data.play?.solved) setOutcome("solved");
        else if (res.data.play?.revealed) setOutcome("revealed");
        if (res.data.play?.completed_at) loadStandings();
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "Could not load this game.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [key, loadStandings]);

  useEffect(() => {
    if (outcome || loading) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [outcome, loading]);

  // Debounced autosave so a reload or a dropped connection does not cost the
  // student their board.
  const handleBoardChange = (next) => {
    setBoardState(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      gamesApi.saveState(key, next).catch(() => {});
    }, 900);
  };

  const elapsed = outcome
    ? (data?.play?.elapsed_ms ?? baseMs)
    : baseMs + (Date.now() - mountedAt.current);

  const runAction = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const submit = useCallback(async () => {
    const res = await gamesApi.submit(key, boardState || {});
    setDetail(res.data.detail);
    if (res.data.solved) {
      setOutcome("solved");
      setData((d) => ({ ...d, play: res.data.play, streak: res.data.streak }));
      loadStandings();
    }
  }, [key, boardState, loadStandings]);

  const handleSubmit = () => runAction(submit);

  // Auto-submit: the board decides it is finished and checks itself. The
  // student never has to find a button — filling the last cell is the action.
  useEffect(() => {
    if (loading || busy || outcome || !data?.puzzle) return;
    if (!isComplete(key, data.puzzle, boardState)) return;

    const signature = stateSignature(key, data.puzzle, boardState);
    if (checked.current.has(signature)) return;
    checked.current.add(signature);

    runAction(submit);
    // `runAction`/`submit` are recreated each render; the signature guard is
    // what actually keeps this from re-firing, so they stay out of the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardState, data, key, loading, busy, outcome]);

  const handleHint = () => runAction(async () => {
    const res = await gamesApi.hint(key, boardState || {});
    const { hint, hints_left: left, penalty_seconds: penalty } = res.data;

    // Apply the revealed piece straight onto the board.
    if (hint.kind === "cell") {
      const grid = (boardState?.grid || data.puzzle.grid).map((row) => row.slice());
      grid[hint.row][hint.col] = hint.value;
      setBoardState({ ...(boardState || {}), grid });
      setHintNote(`Revealed row ${hint.row + 1}, column ${hint.col + 1}.`);
    } else if (hint.kind === "tile") {
      const rotations = (boardState?.rotations || data.puzzle.tiles.map(() => 0)).slice();
      rotations[hint.index] = hint.rotation;
      setBoardState({ ...(boardState || {}), rotations });
      setHintNote("One tile has been turned the right way.");
    } else {
      setHintNote(`A ${hint.length}-letter ${hint.category} word starts with "${hint.starts_with}".`);
    }
    setData((d) => ({ ...d, play: { ...d.play, hints_used: (d.play.hints_used || 0) + 1 } }));
    setHintNote((note) => `${note} ${left} hint${left === 1 ? "" : "s"} left · +${penalty}s to your time.`);
  });

  const handleReveal = () => runAction(async () => {
    setConfirmReveal(false);
    const res = await gamesApi.reveal(key);
    setOutcome("revealed");
    setData((d) => ({ ...d, play: res.data.play, solution: res.data.solution }));
    // Show the answer on the board itself rather than as raw text.
    setBoardState(solutionState(key, data.puzzle, res.data.solution));
    loadStandings();
  });

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Toolbar />
        <Alert severity="info" sx={{ borderRadius: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/student")} sx={{ mt: 2 }}>
          Back to dashboard
        </Button>
      </Container>
    );
  }

  const hintsUsed = data?.play?.hints_used || 0;
  const hintsLeft = (data?.max_hints || 0) - hintsUsed;
  const finished = Boolean(outcome);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Toolbar />
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/student")} sx={{ textTransform: "none" }}>
            Dashboard
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            icon={<TimerIcon />}
            label={formatClock(elapsed)}
            sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
          />
          {hintsUsed > 0 && (
            <Chip size="small" label={`${hintsUsed} hint${hintsUsed === 1 ? "" : "s"}`} sx={{ fontWeight: 600, flexShrink: 0 }} />
          )}
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 3 }, borderRadius: 3, border: `1px solid ${g.border}`, mb: 2 }}>
          <Typography variant="h5" fontWeight={800} sx={{ color: g.text, fontSize: { xs: "1.35rem", sm: "1.5rem" } }}>
            {data.game.title}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: g.textSoft }}>
            {data.game.tagline}
          </Typography>

          <Box aria-live="polite">
            {error && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            {outcome === "solved" && (
              <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                Solved in {formatClock(data.play?.elapsed_ms)}
                {hintsUsed > 0 && ` with ${hintsUsed} hint${hintsUsed === 1 ? "" : "s"}`}.
                {data.streak?.current_streak > 0 && (
                  <> Streak: <b>{data.streak.current_streak} day{data.streak.current_streak === 1 ? "" : "s"}</b>.</>
                )}
              </Alert>
            )}
            {outcome === "revealed" && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                Here&apos;s the answer. This one won&apos;t appear in today&apos;s standings, but your
                streak is safe — come back tomorrow.
              </Alert>
            )}
            {!finished && detail && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                Not quite yet — change something and it will check itself again.
              </Alert>
            )}
            {hintNote && !finished && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{hintNote}</Alert>
            )}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", overflowX: "auto", py: 1 }}>
            <Board
              payload={data.puzzle}
              state={boardState}
              onChange={handleBoardChange}
              disabled={finished || busy}
            />
          </Box>

          {!finished && (
            <>
              <Typography
                variant="caption"
                sx={{ display: "block", textAlign: "center", mt: 2, color: g.textMuted }}
              >
                {busy ? "Checking your answer…" : "Fill the board and it checks itself — no need to submit."}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
                <Button
                  fullWidth variant="outlined" onClick={handleHint} disabled={busy || hintsLeft <= 0}
                  startIcon={<LightbulbIcon />} sx={{ minHeight: 44 }}
                >
                  {hintsLeft > 0 ? `Hint (${hintsLeft} left)` : "No hints left"}
                </Button>
                <Button
                  fullWidth variant="text" onClick={handleSubmit} disabled={busy}
                  startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                  sx={{ minHeight: 44 }}
                >
                  Check now
                </Button>
                <Button
                  fullWidth variant="text" color="inherit" onClick={() => setConfirmReveal(true)}
                  disabled={busy} startIcon={<VisibilityIcon />} sx={{ minHeight: 44 }}
                >
                  Reveal
                </Button>
              </Stack>
            </>
          )}

          {finished && (
            <Button
              fullWidth variant="contained" size="large" sx={{ mt: 3, minHeight: 48 }}
              startIcon={<LocalFireDepartmentIcon />}
              onClick={() => navigate("/student")}
            >
              Back to dashboard
            </Button>
          )}
        </Paper>

        {finished && <StandingsPanel standings={standings} gameTitle={data.game.title} />}
      </Container>

      <Dialog open={confirmReveal} onClose={() => setConfirmReveal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Show the answer?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You&apos;ll see the full solution, and today&apos;s {data.game.title} won&apos;t be
            ranked. Your streak still counts.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmReveal(false)}>Keep trying</Button>
          <Button variant="contained" onClick={handleReveal}>Show answer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
