import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead,
  TableRow, Tooltip, Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CasinoIcon from "@mui/icons-material/Casino";
import VisibilityIcon from "@mui/icons-material/Visibility";

import { gamesApi } from "../../utils/api";
import { g } from "../games/gameTheme";

/**
 * Games health panel.
 *
 * There is deliberately no authoring surface here: puzzles generate themselves
 * from a date seed, so the only things an admin ever needs are visibility into
 * participation, an escape hatch when a puzzle generates badly, and the
 * per-school switch.
 */

const today = () => new Date().toISOString().slice(0, 10);

export default function GamesAdminPanel() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData((await gamesApi.overview(date)).data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load games overview.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const toggleSchool = async (school) => {
    try {
      await gamesApi.toggleSchool(school.id, !school.games_enabled);
      setNotice(`Games ${school.games_enabled ? "disabled" : "enabled"} for ${school.name}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not change that school.");
    }
  };

  const openPreview = async (gameKey, band) => {
    try {
      const res = await gamesApi.preview(gameKey, { band, date });
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not build a preview.");
    }
  };

  const reroll = async (gameKey, band, force) => {
    setError("");
    setNotice("");
    try {
      const res = await gamesApi.reroll(gameKey, { band, date, force, attempt: Date.now() % 1000 });
      setNotice(
        `Rerolled ${gameKey} (${band}).` +
        (res.data.cleared_plays ? ` ${res.data.cleared_plays} play(s) were cleared.` : "")
      );
      load();
    } catch (err) {
      const body = err.response?.data;
      if (body?.code === "ALREADY_PLAYED") {
        // Surfaced as a choice rather than a silent failure: rerolling under a
        // live cohort is legitimate when a puzzle is broken, but it discards
        // work and must be deliberate.
        if (window.confirm(`${body.message}\n\nReroll anyway and clear those plays?`)) {
          reroll(gameKey, band, true);
          return;
        }
        setNotice("Reroll cancelled.");
      } else {
        setError(body?.message || "Could not reroll.");
      }
    }
  };

  if (loading && !data) {
    return <Box sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>Daily Puzzles</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box
          component="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || today())}
          sx={{
            p: 1, borderRadius: 1.5, fontFamily: "inherit", fontSize: 14, minHeight: 40,
            border: `1px solid ${g.borderStrong}`, bgcolor: "rgba(255,255,255,0.06)",
            color: g.text, colorScheme: "dark",
          }}
        />
        <Button startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: "none" }}>Refresh</Button>
      </Stack>

      {!data?.globally_enabled && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          Games are switched off globally (<code>GAMES_ENABLED=0</code>). No student can see them,
          whatever the per-school settings say.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${g.border}`, mb: 3, overflowX: "auto" }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ p: 2, pb: 1 }}>
          Participation on {date}
        </Typography>
        <Divider />
        {data?.games?.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><b>Game</b></TableCell>
                <TableCell><b>Band</b></TableCell>
                <TableCell align="right"><b>Players</b></TableCell>
                <TableCell align="right"><b>Solved</b></TableCell>
                <TableCell align="right"><b>Solve rate</b></TableCell>
                <TableCell align="right"><b>Avg time</b></TableCell>
                <TableCell align="right"><b>Avg hints</b></TableCell>
                <TableCell align="right"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.games.map((row) => (
                <TableRow key={`${row.game_key}-${row.band}`} hover>
                  <TableCell sx={{ textTransform: "capitalize", fontWeight: 600 }}>{row.game_key}</TableCell>
                  <TableCell>{row.band}</TableCell>
                  <TableCell align="right">{row.players}</TableCell>
                  <TableCell align="right">{row.solved}</TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={`${row.solve_rate}%`}
                      sx={{
                        fontWeight: 700,
                        bgcolor: row.solve_rate >= 50 ? g.successTint : row.players ? g.warningTint : "rgba(255,255,255,0.07)",
                        color: row.solve_rate >= 50 ? g.success : row.players ? g.warning : g.textSoft,
                        "& .MuiChip-label": { color: "inherit" },
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">{row.avg_seconds != null ? `${row.avg_seconds}s` : "—"}</TableCell>
                  <TableCell align="right">{row.avg_hints}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Preview the puzzle and its solution">
                      <Button size="small" startIcon={<VisibilityIcon />} sx={{ textTransform: "none" }}
                              onClick={() => openPreview(row.game_key, row.band)}>
                        View
                      </Button>
                    </Tooltip>
                    <Tooltip title="Replace this puzzle with a freshly generated one">
                      <Button size="small" color="warning" startIcon={<CasinoIcon />} sx={{ textTransform: "none" }}
                              onClick={() => reroll(row.game_key, row.band, false)}>
                        Reroll
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No puzzles generated for {date} yet. Puzzles are created the moment the first
              student opens a game that day — nothing needs to be scheduled or uploaded.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              {(data?.catalog || []).map((game) => (
                <Button key={game.key} size="small" variant="outlined" startIcon={<VisibilityIcon />}
                        sx={{ textTransform: "none" }}
                        onClick={() => openPreview(game.key, "8-10")}>
                  Preview {game.title}
                </Button>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {Boolean(data?.by_class?.length) && (
        <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${g.border}`, mb: 3, p: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>By class</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {data.by_class.map((row) => (
              <Chip
                key={row.class_number}
                label={`Class ${row.class_number}: ${row.solved}/${row.players} solved`}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${g.border}`, p: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>Schools</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Turn games off for a school during exam season without affecting anything else.
        </Typography>
        <Stack divider={<Divider />}>
          {(data?.schools || []).map((school) => (
            <Stack key={school.id} direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
              <Typography sx={{ flexGrow: 1 }}>{school.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {school.games_enabled ? "On" : "Off"}
              </Typography>
              <Switch checked={Boolean(school.games_enabled)} onChange={() => toggleSchool(school)} />
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textTransform: "capitalize" }}>
          {preview?.game_key} · {preview?.band} · {preview?.date}
        </DialogTitle>
        <DialogContent dividers>
          {!preview?.persisted && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Generated for preview only — not saved. Students will get exactly this puzzle
              when the first of them opens it that day.
            </Alert>
          )}
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Puzzle</Typography>
          <Box component="pre" sx={{ fontSize: 12, bgcolor: g.surfaceSunken, color: g.text, border: `1px solid ${g.border}`, p: 1.5, borderRadius: 2, overflowX: "auto" }}>
            {JSON.stringify(preview?.puzzle, null, 2)}
          </Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ mt: 2 }}>Solution</Typography>
          <Box component="pre" sx={{ fontSize: 12, bgcolor: g.dangerTint, color: g.text, border: `1px solid ${g.danger}44`, p: 1.5, borderRadius: 2, overflowX: "auto" }}>
            {JSON.stringify(preview?.solution, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
