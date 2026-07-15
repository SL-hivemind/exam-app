import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Button, TextField, Chip, Stack, IconButton, Divider,
  MenuItem, Select, FormControl, InputLabel, Alert, Snackbar, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import { GridLegacy as Grid } from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon, ArrowBack as ArrowBackIcon,
  TouchApp as TapIcon, Numbers as CountIcon, Timeline as MatchIcon, Inventory2 as BucketIcon,
} from "@mui/icons-material";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import { PageHeader } from "../common";

/* Admin builder for primary (class 1-5) interactive questions.
   Hidden feature: reached by URL only — /admin/exams/:examId/primary-questions
   (or /school/...) — no nav links while the feature is dark-launched. */

const FORMATS = [
  { value: "tap_select", label: "Tap to pick", icon: <TapIcon /> },
  { value: "count_tap", label: "Count & tap", icon: <CountIcon /> },
  { value: "match_line", label: "Match pairs", icon: <MatchIcon /> },
  { value: "drag_drop_bucket", label: "Sort into boxes", icon: <BucketIcon /> },
];

const FORMAT_LABEL = Object.fromEntries(FORMATS.map((f) => [f.value, f.label]));

const emptyBuilders = {
  tap_select: { options: [{ face: "", value: "" }, { face: "", value: "" }], answerIndex: -1 },
  count_tap: { display: "", options: ["", "", ""], answer: "" },
  match_line: { pairs: [{ left: "", right: "" }, { left: "", right: "" }] },
  drag_drop_bucket: { buckets: ["", ""], items: [{ label: "", bucket: "" }] },
};

export default function PrimaryQuestionBuilder() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === "school_admin" ? "/school" : "/admin";

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState(null);

  const [format, setFormat] = useState("tap_select");
  const [text, setText] = useState("");
  const [marks, setMarks] = useState(1);
  const [builder, setBuilder] = useState(JSON.parse(JSON.stringify(emptyBuilders)));

  const b = builder[format];
  const setB = (updates) => setBuilder((prev) => ({ ...prev, [format]: { ...prev[format], ...updates } }));

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [examRes, qRes] = await Promise.all([
        api.get(`/admin/exams/${examId}`),
        api.get(`/admin/exams/${examId}/questions`),
      ]);
      setExam(examRes.data.exam);
      setQuestions(qRes.data.questions || []);
    } catch {
      setSnack({ severity: "error", message: "Failed to load exam" });
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const buildContent = () => {
    if (format === "tap_select") {
      const options = b.options
        .filter((o) => (o.face || "").trim() !== "")
        .map((o) => ({ emoji: o.face.trim(), value: (o.value || o.face).trim() }));
      if (options.length < 2) return { error: "Add at least 2 options" };
      if (b.answerIndex < 0 || !b.options[b.answerIndex] || !(b.options[b.answerIndex].face || "").trim()) {
        return { error: "Tap one option to mark it as the correct answer" };
      }
      const correct = b.options[b.answerIndex];
      return { content: { options, answer: (correct.value || correct.face).trim() } };
    }
    if (format === "count_tap") {
      const options = b.options.map((o) => String(o).trim()).filter((o) => o !== "").map(Number);
      if (!(b.display || "").trim()) return { error: "Add the objects to count (e.g. 🐶 🐶 🐶)" };
      if (options.length < 2 || options.some(isNaN)) return { error: "Add at least 2 number choices" };
      const ans = Number(b.answer);
      if (isNaN(ans) || !options.includes(ans)) return { error: "Correct answer must be one of the choices" };
      return { content: { display: b.display.trim(), options, answer: ans } };
    }
    if (format === "match_line") {
      const rows = b.pairs.filter((p) => (p.left || "").trim() && (p.right || "").trim());
      if (rows.length < 2) return { error: "Add at least 2 complete pairs" };
      const pairs = {};
      rows.forEach((p) => { pairs[p.left.trim()] = p.right.trim(); });
      if (Object.keys(pairs).length !== rows.length) return { error: "Left items must be unique" };
      return {
        content: {
          left: rows.map((p) => p.left.trim()),
          right: rows.map((p) => p.right.trim()),
          pairs,
        },
      };
    }
    if (format === "drag_drop_bucket") {
      const buckets = b.buckets.map((x) => (x || "").trim()).filter(Boolean);
      const items = b.items.filter((it) => (it.label || "").trim() && (it.bucket || "").trim());
      if (buckets.length < 2) return { error: "Add at least 2 boxes" };
      if (items.length < 2) return { error: "Add at least 2 items (each assigned to a box)" };
      if (items.some((it) => !buckets.includes(it.bucket))) return { error: "Every item needs a valid box" };
      return {
        content: {
          buckets,
          items: items.map((it) => ({ label: it.label.trim(), bucket: it.bucket })),
        },
      };
    }
    return { error: "Unknown format" };
  };

  const handleAdd = async () => {
    if (!text.trim()) { setSnack({ severity: "warning", message: "Question text is required" }); return; }
    const built = buildContent();
    if (built.error) { setSnack({ severity: "warning", message: built.error }); return; }
    try {
      setBusy(true);
      await api.post(`/admin/exams/${examId}/questions`, {
        text: text.trim(),
        marks: Number(marks) || 1,
        question_format: format,
        content_json: built.content,
      });
      setSnack({ severity: "success", message: "Question added 🎉" });
      setText("");
      setBuilder((prev) => ({ ...prev, [format]: JSON.parse(JSON.stringify(emptyBuilders[format])) }));
      fetchAll();
    } catch (err) {
      setSnack({ severity: "error", message: err.response?.data?.message || "Failed to add question" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (qid) => {
    try {
      await api.delete(`/admin/exams/${examId}/questions/${qid}`);
      setSnack({ severity: "success", message: "Question deleted" });
      fetchAll();
    } catch (err) {
      setSnack({ severity: "error", message: err.response?.data?.message || "Delete failed" });
    }
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        onBack={() => navigate(`${basePath}/exams/${examId}`)}
        title="Primary Question Builder"
        subtitle={exam ? `${exam.title} — interactive questions for classes 1-5` : ""}
      />

      <Grid container spacing={3}>
        {/* ---- BUILDER ---- */}
        <Grid item xs={12} lg={7}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
            <Typography variant="h6" fontWeight={700} mb={2}>New question</Typography>

            <ToggleButtonGroup
              value={format}
              exclusive
              onChange={(e, v) => v && setFormat(v)}
              sx={{ mb: 3, flexWrap: "wrap" }}
            >
              {FORMATS.map((f) => (
                <ToggleButton key={f.value} value={f.value} sx={{ px: 2, gap: 1, textTransform: "none" }}>
                  {f.icon} {f.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Stack spacing={2.5}>
              <TextField
                label="Question / instruction for the child"
                placeholder='e.g. "Tap the RED fruit" or "Match the animal with its sound"'
                value={text}
                onChange={(e) => setText(e.target.value)}
                fullWidth
              />

              {format === "tap_select" && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Options — emoji, a word, or both. Click ✅ to mark the correct one.
                  </Typography>
                  {b.options.map((o, i) => (
                    <Stack direction="row" spacing={1} alignItems="center" mb={1} key={i}>
                      <TextField size="small" label={`Option ${i + 1} (shown to child)`} value={o.face}
                        onChange={(e) => { const options = [...b.options]; options[i] = { ...options[i], face: e.target.value }; setB({ options }); }}
                        sx={{ flex: 1 }} />
                      <TextField size="small" label="Answer value (optional)" value={o.value}
                        onChange={(e) => { const options = [...b.options]; options[i] = { ...options[i], value: e.target.value }; setB({ options }); }}
                        sx={{ flex: 1 }} />
                      <Button
                        variant={b.answerIndex === i ? "contained" : "outlined"}
                        color="success" size="small"
                        onClick={() => setB({ answerIndex: i })}
                        sx={{ minWidth: 44 }}
                      >
                        ✅
                      </Button>
                      <IconButton size="small" disabled={b.options.length <= 2}
                        onClick={() => setB({ options: b.options.filter((_, x) => x !== i), answerIndex: b.answerIndex === i ? -1 : b.answerIndex > i ? b.answerIndex - 1 : b.answerIndex })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setB({ options: [...b.options, { face: "", value: "" }] })}>
                    Add option
                  </Button>
                </Box>
              )}

              {format === "count_tap" && (
                <Box>
                  <TextField
                    label="Objects to count (emojis)" placeholder="🐶 🐶 🐶"
                    value={b.display} onChange={(e) => setB({ display: e.target.value })}
                    fullWidth sx={{ mb: 2 }}
                  />
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>Number choices</Typography>
                  <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                    {b.options.map((o, i) => (
                      <TextField key={i} size="small" type="number" value={o} sx={{ width: 90 }}
                        onChange={(e) => { const options = [...b.options]; options[i] = e.target.value; setB({ options }); }} />
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setB({ options: [...b.options, ""] })}>Add</Button>
                  </Stack>
                  <TextField label="Correct number" type="number" size="small" value={b.answer}
                    onChange={(e) => setB({ answer: e.target.value })} />
                </Box>
              )}

              {format === "match_line" && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Pairs — the child draws a line from left to right. (Right side is shown shuffled.)
                  </Typography>
                  {b.pairs.map((p, i) => (
                    <Stack direction="row" spacing={1} alignItems="center" mb={1} key={i}>
                      <TextField size="small" label="Left (e.g. 🐶)" value={p.left}
                        onChange={(e) => { const pairs = [...b.pairs]; pairs[i] = { ...pairs[i], left: e.target.value }; setB({ pairs }); }}
                        sx={{ flex: 1 }} />
                      <Typography>↔</Typography>
                      <TextField size="small" label="Right (e.g. BARK)" value={p.right}
                        onChange={(e) => { const pairs = [...b.pairs]; pairs[i] = { ...pairs[i], right: e.target.value }; setB({ pairs }); }}
                        sx={{ flex: 1 }} />
                      <IconButton size="small" disabled={b.pairs.length <= 2}
                        onClick={() => setB({ pairs: b.pairs.filter((_, x) => x !== i) })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setB({ pairs: [...b.pairs, { left: "", right: "" }] })}>
                    Add pair
                  </Button>
                </Box>
              )}

              {format === "drag_drop_bucket" && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>Boxes (categories)</Typography>
                  <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                    {b.buckets.map((bk, i) => (
                      <TextField key={i} size="small" label={`Box ${i + 1}`} value={bk} sx={{ width: 150 }}
                        onChange={(e) => {
                          const old = b.buckets[i];
                          const buckets = [...b.buckets]; buckets[i] = e.target.value;
                          // keep item assignments in sync when a box is renamed
                          const items = b.items.map((it) => (it.bucket === old ? { ...it, bucket: e.target.value } : it));
                          setB({ buckets, items });
                        }} />
                    ))}
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setB({ buckets: [...b.buckets, ""] })}>Add box</Button>
                  </Stack>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>Items — assign each to its correct box</Typography>
                  {b.items.map((it, i) => (
                    <Stack direction="row" spacing={1} alignItems="center" mb={1} key={i}>
                      <TextField size="small" label="Item (e.g. 🐘)" value={it.label}
                        onChange={(e) => { const items = [...b.items]; items[i] = { ...items[i], label: e.target.value }; setB({ items }); }}
                        sx={{ flex: 1 }} />
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Correct box</InputLabel>
                        <Select label="Correct box" value={it.bucket}
                          onChange={(e) => { const items = [...b.items]; items[i] = { ...items[i], bucket: e.target.value }; setB({ items }); }}>
                          {b.buckets.filter((x) => (x || "").trim()).map((bk) => (
                            <MenuItem key={bk} value={bk}>{bk}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton size="small" disabled={b.items.length <= 1}
                        onClick={() => setB({ items: b.items.filter((_, x) => x !== i) })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setB({ items: [...b.items, { label: "", bucket: "" }] })}>
                    Add item
                  </Button>
                </Box>
              )}

              <Divider />
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField label="Marks" type="number" size="small" value={marks}
                  onChange={(e) => setMarks(e.target.value)} sx={{ width: 100 }}
                  inputProps={{ min: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Match & sort questions give partial marks per correct pair/item.
                </Typography>
                <Box flex={1} />
                <Button variant="contained" size="large" startIcon={<AddIcon />} disabled={busy} onClick={handleAdd}>
                  {busy ? <CircularProgress size={20} color="inherit" /> : "Add question"}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        {/* ---- EXISTING QUESTIONS ---- */}
        <Grid item xs={12} lg={5}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid rgba(255,255,255,0.08)" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>Questions in this exam</Typography>
              <Chip label={`Total marks: ${exam?.total_marks ?? 0}`} size="small" />
            </Stack>
            {questions.length === 0 ? (
              <Typography color="text.secondary" py={3} textAlign="center">No questions yet.</Typography>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Question</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Marks</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {questions.map((qq) => (
                      <TableRow key={qq.id} hover>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" noWrap title={qq.text}>{qq.text}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={FORMAT_LABEL[qq.question_format] || "MCQ"}
                            color={FORMAT_LABEL[qq.question_format] ? "secondary" : "default"}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{qq.marks}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleDelete(qq.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>
              Students assigned to this exam are routed to the kid-friendly interface automatically
              when it contains interactive questions.
            </Alert>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
