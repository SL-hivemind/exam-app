import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Paper, Typography, Button, Chip, CircularProgress, Alert, LinearProgress,
  useTheme, useMediaQuery,
} from "@mui/material";
import { GridLegacy as Grid } from "@mui/material";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";

/* Data-driven exam interface for primary (class 1-5) interactive formats:
   tap_select, count_tap, match_line, drag_drop_bucket.
   Students land here automatically (StudentExamQuestionsPage redirects when
   an exam contains primary-format questions) — there are no nav links. */

const LINE_COLORS = ["#f472b6", "#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#f87171"];

const optionValue = (o) => (typeof o === "object" && o !== null ? (o.value ?? o.label ?? o.emoji ?? o.text) : o);
const optionFace = (o) => (typeof o === "object" && o !== null ? (o.emoji ?? o.label ?? o.text ?? o.value) : o);

/* ---------- per-format question bodies ---------- */

function TapSelect({ content, value, onPick, isSmall }) {
  const options = content?.options || [];
  return (
    <Grid container spacing={isSmall ? 2 : 3} justifyContent="center">
      {options.map((o, i) => {
        const picked = value?.answer !== undefined && String(value.answer) === String(optionValue(o));
        return (
          <Grid item xs={6} sm={4} md={3} key={i}>
            <Box
              onClick={() => onPick({ answer: optionValue(o) })}
              sx={{
                minHeight: isSmall ? 96 : 130,
                fontSize: isSmall ? 44 : 64,
                display: "flex", alignItems: "center", justifyContent: "center",
                textAlign: "center", p: 1,
                bgcolor: picked ? "#bfdbfe" : "#fff",
                border: picked ? "4px solid #2563eb" : "4px solid transparent",
                borderRadius: 4, cursor: "pointer", userSelect: "none",
                transition: "transform .15s",
                "&:active": { transform: "scale(0.95)" },
                "@media (hover: hover)": { "&:hover": { transform: "scale(1.08)", bgcolor: picked ? "#bfdbfe" : "#ecfeff" } },
              }}
            >
              <span style={{ fontSize: String(optionFace(o)).length > 3 ? (isSmall ? 22 : 30) : undefined, fontWeight: 700 }}>
                {optionFace(o)}
              </span>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

function CountTap({ content, value, onPick, isSmall }) {
  return (
    <>
      <Typography sx={{ fontSize: isSmall ? 36 : 52, mb: 3, lineHeight: 1.4, wordBreak: "break-word" }}>
        {content?.display}
      </Typography>
      <Grid container spacing={isSmall ? 2 : 3} justifyContent="center">
        {(content?.options || []).map((n) => {
          const picked = value?.answer !== undefined && String(value.answer) === String(n);
          return (
            <Grid item key={String(n)}>
              <Box
                onClick={() => onPick({ answer: n })}
                sx={{
                  width: isSmall ? 76 : 100, height: isSmall ? 76 : 100, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isSmall ? 28 : 36, fontWeight: 900,
                  bgcolor: picked ? "#bfdbfe" : "#fff",
                  border: picked ? "4px solid #2563eb" : "4px solid transparent",
                  cursor: "pointer", userSelect: "none",
                  "&:active": { transform: "scale(0.95)" },
                  "@media (hover: hover)": { "&:hover": { transform: "scale(1.12)", bgcolor: picked ? "#bfdbfe" : "#fef3c7" } },
                }}
              >
                {n}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}

function MatchLine({ content, value, onChange, isSmall }) {
  const left = useMemo(() => content?.left || [], [content]);
  // Shuffle the right column — authored order pairs 1:1 with the left, so
  // showing it unshuffled would make every answer a straight line across.
  const right = useMemo(() => {
    const arr = [...(content?.right || [])];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [content]);
  const pairs = useMemo(() => value?.pairs || {}, [value]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [lines, setLines] = useState([]);
  const containerRef = useRef(null);
  const itemRefs = useRef({});

  const usedRights = new Set(Object.values(pairs));

  const recalcLines = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const cRect = cont.getBoundingClientRect();
    const next = [];
    left.forEach((l, i) => {
      const r = pairs[l];
      if (r === undefined) return;
      const le = itemRefs.current[`L:${l}`];
      const re = itemRefs.current[`R:${r}`];
      if (!le || !re) return;
      const lr = le.getBoundingClientRect();
      const rr = re.getBoundingClientRect();
      next.push({
        key: `${l}->${r}`,
        color: LINE_COLORS[i % LINE_COLORS.length],
        x1: lr.right - cRect.left, y1: lr.top + lr.height / 2 - cRect.top,
        x2: rr.left - cRect.left, y2: rr.top + rr.height / 2 - cRect.top,
      });
    });
    setLines(next);
  }, [left, pairs]);

  useEffect(() => {
    recalcLines();
    window.addEventListener("resize", recalcLines);
    return () => window.removeEventListener("resize", recalcLines);
  }, [recalcLines]);

  const tapLeft = (l) => {
    if (pairs[l] !== undefined) {
      const next = { ...pairs };
      delete next[l];
      onChange({ pairs: next });
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(selectedLeft === l ? null : l);
  };

  const tapRight = (r) => {
    if (!selectedLeft || usedRights.has(r)) return;
    onChange({ pairs: { ...pairs, [selectedLeft]: r } });
    setSelectedLeft(null);
  };

  const tileSx = (state) => ({
    p: isSmall ? 1.2 : 2, mb: isSmall ? 1.2 : 2, borderRadius: 3, textAlign: "center",
    cursor: "pointer", userSelect: "none", fontWeight: 800,
    fontSize: isSmall ? 26 : 40, minHeight: isSmall ? 56 : 72,
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "3px solid transparent",
    ...(state === "matched" && { bgcolor: "#bbf7d0" }),
    ...(state === "selected" && { bgcolor: "#fde68a", border: "3px solid #f59e0b" }),
    ...(state === "idle" && { bgcolor: "#fff" }),
    ...(state === "used" && { bgcolor: "#e2e8f0", opacity: 0.7, cursor: "default" }),
    "&:active": { transform: state === "used" ? "none" : "scale(0.97)" },
  });

  return (
    <Box ref={containerRef} sx={{ position: "relative" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
        {lines.map((ln) => (
          <line key={ln.key} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
            stroke={ln.color} strokeWidth={isSmall ? 4 : 6} strokeLinecap="round" />
        ))}
      </svg>
      <Grid container spacing={isSmall ? 4 : 8} justifyContent="center">
        <Grid item xs={5}>
          {left.map((l) => (
            <Box key={String(l)} ref={(el) => { itemRefs.current[`L:${l}`] = el; }}
              onClick={() => tapLeft(l)}
              sx={tileSx(pairs[l] !== undefined ? "matched" : selectedLeft === l ? "selected" : "idle")}>
              {l}
            </Box>
          ))}
        </Grid>
        <Grid item xs={5}>
          {right.map((r) => (
            <Box key={String(r)} ref={(el) => { itemRefs.current[`R:${r}`] = el; }}
              onClick={() => tapRight(r)}
              sx={{ ...tileSx(usedRights.has(r) ? "used" : "idle"), fontSize: isSmall ? 16 : 22 }}>
              {r}
            </Box>
          ))}
        </Grid>
      </Grid>
      <Typography variant="body2" sx={{ mt: 1, color: "#475569", textAlign: "center" }}>
        Tap a picture, then tap its match. Tap a green one to undo. 🎯
      </Typography>
    </Box>
  );
}

function DragDropBucket({ content, value, onChange, isSmall }) {
  const buckets = content?.buckets || [];
  const items = (content?.items || []).map((it) => (typeof it === "object" && it !== null ? it.label : it));
  const placements = useMemo(() => value?.placements || {}, [value]);
  const [selectedItem, setSelectedItem] = useState(null);
  const unplaced = items.filter((it) => placements[it] === undefined);

  const place = (item, bucket) => {
    onChange({ placements: { ...placements, [item]: bucket } });
    setSelectedItem(null);
  };
  const unplace = (item) => {
    const next = { ...placements };
    delete next[item];
    onChange({ placements: next });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "center", minHeight: 70, mb: 3 }}>
        {unplaced.map((it) => (
          <Box key={String(it)}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(it))}
            onClick={() => setSelectedItem(selectedItem === it ? null : it)}
            sx={{
              px: 2, py: 1, fontSize: isSmall ? 34 : 46, borderRadius: 3, cursor: "grab", userSelect: "none",
              bgcolor: selectedItem === it ? "#fde68a" : "#fff",
              border: selectedItem === it ? "3px solid #f59e0b" : "3px solid transparent",
              "&:active": { transform: "scale(0.95)" },
            }}>
            {it}
          </Box>
        ))}
        {unplaced.length === 0 && (
          <Typography sx={{ alignSelf: "center", color: "#16a34a", fontWeight: 700 }}>All sorted! ⭐</Typography>
        )}
      </Box>
      <Grid container spacing={2} justifyContent="center">
        {buckets.map((b) => (
          <Grid item xs={12} sm={6} md={buckets.length > 2 ? 4 : 5} key={String(b)}>
            <Box
              onClick={() => selectedItem && place(selectedItem, b)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const it = e.dataTransfer.getData("text/plain"); if (it) place(it, b); }}
              sx={{
                minHeight: isSmall ? 110 : 140, borderRadius: 4, p: 1.5,
                border: "3px dashed #94a3b8", bgcolor: "rgba(255,255,255,0.75)",
                display: "flex", flexDirection: "column", alignItems: "center",
                cursor: selectedItem ? "copy" : "default",
              }}>
              <Typography fontWeight={900} sx={{ mb: 1, fontSize: isSmall ? 16 : 20 }}>{b}</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
                {items.filter((it) => placements[it] === b).map((it) => (
                  <Box key={String(it)} onClick={(e) => { e.stopPropagation(); unplace(it); }}
                    sx={{ fontSize: isSmall ? 28 : 36, cursor: "pointer", bgcolor: "#bbf7d0", borderRadius: 2, px: 1 }}>
                    {it}
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography variant="body2" sx={{ mt: 1.5, color: "#475569", textAlign: "center" }}>
        Drag each picture into its box — or tap the picture, then tap the box. Tap inside a box to take it out. 🧺
      </Typography>
    </Box>
  );
}

/* ---------- main interface ---------- */

export default function PrimaryExamInterface() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const [phase, setPhase] = useState("loading"); // loading | exam | finish | done
  const [error, setError] = useState("");
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const submitRef = useRef(() => {});

  const headers = useMemo(() => ({ auth_token: authToken }), [authToken]);

  useEffect(() => {
    if (!authToken) { setError("You are not logged in."); setPhase("error"); return; }
    let cancelled = false;
    (async () => {
      try {
        const canStart = await api.get(`/student/exams/${examId}/can_start`, { headers });
        const { assigned, within_window, already_submitted } = canStart.data;
        if (already_submitted) { navigate(`/exam/${examId}/results`, { replace: true }); return; }
        if (!assigned || !within_window) { setError("This exam is not available right now."); setPhase("error"); return; }

        const startRes = await api.post(`/student/exams/${examId}/start`, {}, { headers });
        const qRes = await api.get(`/student/exams/${examId}/questions`, { headers });
        if (cancelled) return;

        setExam(canStart.data.exam);
        setQuestions(qRes.data.questions || []);

        // Resume auto-saved answers if the tab was closed mid-exam.
        const saved = startRes.data.saved_answers || {};
        const restored = {};
        Object.entries(saved).forEach(([qid, raw]) => {
          try { restored[qid] = typeof raw === "string" ? JSON.parse(raw) : raw; }
          catch { restored[qid] = raw; }
        });
        setAnswers(restored);

        const expiresStr = startRes.data.expires_at;
        const expiresAt = new Date(expiresStr?.endsWith("Z") ? expiresStr : `${expiresStr}Z`);
        let remaining = Math.floor((expiresAt - Date.now()) / 1000);
        if (isNaN(remaining)) remaining = (canStart.data.exam?.duration_minutes || 60) * 60;
        setTimeLeft(Math.max(0, remaining));
        setPhase("exam");
      } catch (err) {
        if (!cancelled) { setError(err.response?.data?.message || "Could not load the exam."); setPhase("error"); }
      }
    })();
    return () => { cancelled = true; clearInterval(timerRef.current); };
  }, [examId, authToken, headers, navigate]);

  const handleSubmit = useCallback(async (reason = "manual") => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const payload = {
        reason,
        answers: Object.entries(answers).map(([qid, ans]) => ({ question_id: Number(qid), answer: ans })),
      };
      const res = await api.post(`/student/exams/${examId}/submit`, payload, { headers });
      setScore(res.data.score);
      setPhase("done");
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg.includes("already submitted") || msg.includes("expired")) { setPhase("done"); }
      else { setError("Could not submit — please try again."); setSubmitting(false); }
    }
  }, [answers, examId, headers, submitting]);

  useEffect(() => { submitRef.current = handleSubmit; }, [handleSubmit]);

  useEffect(() => {
    if (phase !== "exam" && phase !== "finish") return undefined;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) { clearInterval(timerRef.current); submitRef.current("timeout"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const q = questions[index];
  const total = questions.length;

  const autosave = useCallback((qid, ans) => {
    api.post(`/student/exams/${examId}/autosave`, { answers: [{ question_id: Number(qid), answer: ans }] }, { headers })
      .catch(() => {});
  }, [examId, headers]);

  const setAnswer = useCallback((qid, ans) => {
    setAnswers((prev) => ({ ...prev, [qid]: ans }));
    autosave(qid, ans);
  }, [autosave]);

  const goNext = useCallback(() => {
    if (index >= total - 1) setPhase("finish");
    else setIndex((i) => i + 1);
  }, [index, total]);

  const pickAndAdvance = (ans) => {
    setAnswer(q.id, ans);
    setTimeout(goNext, 350);
  };

  const answerComplete = (() => {
    if (!q) return false;
    const a = answers[q.id];
    if (!a) return false;
    if (q.question_format === "match_line") {
      return Object.keys(a.pairs || {}).length === (q.content?.left || []).length;
    }
    if (q.question_format === "drag_drop_bucket") {
      return Object.keys(a.placements || {}).length === (q.content?.items || []).length;
    }
    return a.answer !== undefined;
  })();

  const answeredCount = questions.filter((qq) => {
    const a = answers[qq.id];
    if (!a) return false;
    if (qq.question_format === "match_line") return Object.keys(a.pairs || {}).length > 0;
    if (qq.question_format === "drag_drop_bucket") return Object.keys(a.placements || {}).length > 0;
    return a.answer !== undefined;
  }).length;

  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : null;
  const seconds = timeLeft !== null ? String(timeLeft % 60).padStart(2, "0") : null;

  return (
    <Box sx={{
      minHeight: "100vh",
      background: "linear-gradient(120deg,#f472b6,#60a5fa,#34d399)",
      backgroundSize: "300% 300%",
      animation: "bgMove 12s ease infinite",
      display: "flex", alignItems: "center", justifyContent: "center",
      px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 3 },
      "@keyframes bgMove": {
        "0%": { backgroundPosition: "0% 50%" },
        "50%": { backgroundPosition: "100% 50%" },
        "100%": { backgroundPosition: "0% 50%" },
      },
    }}>
      <Paper sx={{
        width: "100%", maxWidth: 940, p: { xs: 2, sm: 4, md: 5 },
        borderRadius: { xs: "20px", sm: "32px" },
        background: "linear-gradient(180deg,#fff7ed,#ecfeff)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
        textAlign: "center",
      }}>
        {phase === "loading" && <Box py={8}><CircularProgress /></Box>}

        {phase === "error" && (
          <Box py={4}>
            <Alert severity="warning" sx={{ mb: 3, textAlign: "left" }}>{error}</Alert>
            <Button variant="contained" onClick={() => navigate("/student")}>Back to Dashboard</Button>
          </Box>
        )}

        {(phase === "exam" || phase === "finish") && (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 1, flexWrap: "wrap" }}>
              <Typography fontWeight={800} sx={{ fontSize: { xs: 14, sm: 16 } }}>
                {exam?.title || "Fun Exam"} 🎈
              </Typography>
              {timeLeft !== null && (
                <Chip
                  label={`⏰ ${minutes}:${seconds}`}
                  color={timeLeft < 120 ? "error" : "default"}
                  sx={{ fontWeight: 800 }}
                />
              )}
            </Box>
            <LinearProgress
              variant="determinate"
              value={total ? (Math.min(index + (phase === "finish" ? 1 : 0), total) / total) * 100 : 0}
              sx={{ mb: 3, height: 10, borderRadius: 5, bgcolor: "rgba(0,0,0,0.08)" }}
            />
          </>
        )}

        {phase === "exam" && q && (
          <>
            <Typography fontWeight={700} mb={1} sx={{ color: "#475569" }}>
              Question {index + 1} of {total}
            </Typography>
            <Typography fontWeight={900} mb={isSmall ? 3 : 4} sx={{ fontSize: { xs: 22, sm: 30, md: 34 }, wordBreak: "break-word" }}>
              {q.text}
            </Typography>

            {q.image_path && (
              <Box component="img" src={q.image_path} alt=""
                sx={{ maxWidth: "100%", maxHeight: 220, borderRadius: 3, mb: 3 }} />
            )}

            {q.question_format === "tap_select" && (
              <TapSelect content={q.content} value={answers[q.id]} onPick={pickAndAdvance} isSmall={isSmall} />
            )}
            {q.question_format === "count_tap" && (
              <CountTap content={q.content} value={answers[q.id]} onPick={pickAndAdvance} isSmall={isSmall} />
            )}
            {q.question_format === "match_line" && (
              <MatchLine content={q.content} value={answers[q.id]} onChange={(a) => setAnswer(q.id, a)} isSmall={isSmall} />
            )}
            {q.question_format === "drag_drop_bucket" && (
              <DragDropBucket content={q.content} value={answers[q.id]} onChange={(a) => setAnswer(q.id, a)} isSmall={isSmall} />
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, gap: 2 }}>
              <Button
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                sx={{ borderRadius: 3, fontWeight: 700, minHeight: 48 }}
              >
                ⬅ Back
              </Button>
              <Button
                variant="contained"
                size="large"
                disabled={(q.question_format === "match_line" || q.question_format === "drag_drop_bucket") && !answerComplete}
                onClick={goNext}
                sx={{ borderRadius: 3, px: 4, fontWeight: 800, minHeight: 48 }}
              >
                {index === total - 1 ? "Finish ✨" : "Next ➡"}
              </Button>
            </Box>
          </>
        )}

        {phase === "finish" && (
          <Box py={2}>
            <Typography variant={isSmall ? "h5" : "h3"} fontWeight={900} mb={2}>
              All done? 🌟
            </Typography>
            <Typography mb={3} sx={{ fontSize: { xs: 15, sm: 18 } }}>
              You answered <strong>{answeredCount}</strong> of <strong>{total}</strong> questions.
              {answeredCount < total && " You can go back and finish the rest!"}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
              <Button size="large" onClick={() => { setPhase("exam"); setIndex(0); }} sx={{ borderRadius: 4, fontWeight: 700, minHeight: 52 }}>
                🔍 Check my answers
              </Button>
              <Button size="large" variant="contained" color="success" disabled={submitting}
                onClick={() => handleSubmit("manual")}
                sx={{ px: 5, borderRadius: 4, fontWeight: 900, minHeight: 52, fontSize: 18 }}>
                {submitting ? <CircularProgress size={22} color="inherit" /> : "🚀 Submit my exam!"}
              </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mt: 2, textAlign: "left" }}>{error}</Alert>}
          </Box>
        )}

        {phase === "done" && (
          <Box py={3}>
            <Typography variant={isSmall ? "h4" : "h3"} fontWeight={900} mb={2}>
              🎉 Great job! 🎉
            </Typography>
            {score !== null && (
              <Typography variant={isSmall ? "h5" : "h4"} mb={2}>
                ⭐ You scored {score} ⭐
              </Typography>
            )}
            <Typography sx={{ fontSize: { xs: 16, sm: 22 }, mb: 4 }}>
              🐶🍎⭐ You did amazing!
            </Typography>
            <Button size="large" variant="contained" sx={{ px: 6, borderRadius: 4, minHeight: 52 }}
              onClick={() => navigate("/student")}>
              🏠 Go Home
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
