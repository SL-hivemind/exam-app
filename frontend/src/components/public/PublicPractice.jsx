import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Grid, Stack, Button, Chip, MenuItem, TextField,
  LinearProgress, CircularProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BoltIcon from '@mui/icons-material/Bolt';
import ScienceIcon from '@mui/icons-material/Science';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReplayIcon from '@mui/icons-material/Replay';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { publicApi } from '../../utils/api';
import { GlassCard } from '../common';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const ORDER = ['easy', 'medium', 'hard'];
const DIFF_META = {
  easy: { label: 'Easy', color: '#34d399', bg: 'rgba(52,211,153,0.16)' },
  medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251,191,36,0.16)' },
  hard: { label: 'Hard', color: '#fb7185', bg: 'rgba(251,113,133,0.16)' },
};
const LETTERS = ['A', 'B', 'C', 'D'];

export default function PublicPractice() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [stage, setStage] = useState('setup'); // setup | run | result
  const [meta, setMeta] = useState({ subjects: [], chapters_by_subject: {}, total_questions: 0 });
  const [form, setForm] = useState({
    scope: 'mixed', subject: '', chapter: '', count: 15,
    mode: params.get('mode') === 'adaptive' || !params.get('mode') ? 'adaptive' : params.get('mode'),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // session
  const [attemptId, setAttemptId] = useState(null);
  const [pool, setPool] = useState({ easy: [], medium: [], hard: [] });
  const [used, setUsed] = useState(() => new Set());
  const [asked, setAsked] = useState([]);       // [{ ...q, userAns, isCorrect }]
  const [answers, setAnswers] = useState({});    // { qid: 'A' }
  const [current, setCurrent] = useState(null);  // { q, bucket }
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [curDiff, setCurDiff] = useState('easy');
  const [result, setResult] = useState(null);

  useEffect(() => {
    publicApi.practiceMeta()
      .then(r => setMeta(r.data || {}))
      .catch(() => setMeta({ subjects: [], chapters_by_subject: {}, total_questions: 0 }));
  }, []);

  // Apply ?mode presets coming from the dashboard prep-hub
  useEffect(() => {
    const m = params.get('mode');
    if (m === 'challenge') {
      startSession(true, 'challenge');
    } else if (m === 'pyq') {
      startSession(true, 'pyq', params.get('year'));
    } else if (m === 'subject') {
      setForm(f => ({ ...f, scope: 'subject', mode: 'adaptive' }));
    } else if (m === 'chapter') {
      setForm(f => ({ ...f, scope: 'chapter', mode: 'adaptive' }));
    } else if (m === 'mock') {
      setForm(f => ({ ...f, scope: 'mixed', mode: 'random', count: 30 }));
    }
  }, [params]);

  const pickNext = useCallback((poolRef, usedRef, targetDiff) => {
    const ti = ORDER.indexOf(targetDiff);
    const fallback = [...ORDER].sort((a, b) => Math.abs(ORDER.indexOf(a) - ti) - Math.abs(ORDER.indexOf(b) - ti));
    for (const b of fallback) {
      const q = (poolRef[b] || []).find(x => !usedRef.has(x.id));
      if (q) return { q, bucket: b };
    }
    return null;
  }, []);

  const startSession = async (auto = false, autoMode = null, autoYear = null) => {
    setError(''); setLoading(true);
    try {
      const modeToUse = autoMode || form.mode;
      let p, r;
      
      if (modeToUse === 'challenge') {
        r = await publicApi.challengeStart();
        if (r.data.already_completed) {
          setError('You already completed today\'s challenge! Great job.');
          setLoading(false); return;
        }
        setAttemptId(r.data.challenge_id);
        const qs = r.data.questions || [];
        p = { easy: qs, medium: [], hard: [] };
        setForm(f => ({ ...f, count: qs.length, mode: 'random' }));
      } else {
        const payload = {
          count: Number(form.count),
          subject: form.scope === 'mixed' ? '' : form.subject,
          chapter: form.scope === 'chapter' ? form.chapter : '',
        };
        if (modeToUse === 'pyq') {
           payload.pyq_year = autoYear || params.get('year');
           payload.course_tags = params.get('course_tags') || '';
        }
        r = await publicApi.practiceAdaptiveStart(payload);
        p = r.data.pool || { easy: [], medium: [], hard: [] };
        setAttemptId(r.data.attempt_id);
      }
      
      const startDiff = modeToUse === 'adaptive' ? 'easy'
        : modeToUse === 'random' || modeToUse === 'challenge' || modeToUse === 'pyq' ? ORDER[Math.floor(Math.random() * 3)]
        : modeToUse;
        
      const freshUsed = new Set();
      const first = pickNext(p, freshUsed, startDiff);
      if (!first) { setError('No questions available for this selection.'); setLoading(false); return; }
      
      setPool(p); setUsed(freshUsed); setAsked([]); setAnswers({}); setScore(0);
      setCurrent(first); setCurDiff(first.bucket); setSelected(null); setRevealed(false);
      setStage('run');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start practice.');
    } finally { setLoading(false); }
  };

  const handleSelect = (letter) => {
    if (revealed || !current) return;
    const q = current.q;
    const isCorrect = letter === (q.correct_answer || '').toUpperCase();
    setSelected(letter); setRevealed(true);
    if (isCorrect) setScore(s => s + 1);
    setAnswers(a => ({ ...a, [q.id]: letter }));
    setAsked(list => [...list, { ...q, userAns: letter, isCorrect, bucketDiff: current.bucket }]);
  };

  const nextDifficulty = (correct) => {
    if (form.mode === 'random' || params.get('mode') === 'challenge' || params.get('mode') === 'pyq') return ORDER[Math.floor(Math.random() * 3)];
    if (form.mode !== 'adaptive') return form.mode; // fixed
    const i = ORDER.indexOf(curDiff);
    return correct ? ORDER[Math.min(i + 1, 2)] : ORDER[Math.max(i - 1, 0)];
  };

  const handleNext = async () => {
    if (!current) return;
    const correct = selected === (current.q.correct_answer || '').toUpperCase();
    const newUsed = new Set(used); newUsed.add(current.q.id);
    setUsed(newUsed);

    const nd = nextDifficulty(correct);
    const reachedCount = asked.length >= Number(form.count);
    const next = reachedCount ? null : pickNext(pool, newUsed, nd);

    if (!next) { finish(newUsed); return; }
    setCurrent(next); setCurDiff(next.bucket); setSelected(null); setRevealed(false);
  };

  const finish = async (finalUsed) => {
    setLoading(true);
    const askedIds = asked.map(a => a.id);
    try {
      if (params.get('mode') === 'challenge') {
        await publicApi.challengeSubmit(attemptId, { answers, score });
      } else {
        await publicApi.practiceAdaptiveSubmit(attemptId, { asked_ids: askedIds, answers });
      }
    } catch { /* non-blocking — still show local result */ }
    setResult({ score, total: asked.length, asked });
    setStage('result');
    setLoading(false);
  };

  /* ─────────────── SETUP ─────────────── */
  const renderSetup = () => {
    const chapters = form.subject ? (meta.chapters_by_subject?.[form.subject] || []) : [];
    const scopeOptions = [
      { k: 'mixed', label: 'Mixed', icon: <ShuffleIcon />, desc: 'All subjects & chapters' },
      { k: 'subject', label: 'Subject-wise', icon: <ScienceIcon />, desc: 'Focus on one subject' },
      { k: 'chapter', label: 'Chapter-wise', icon: <AutoStoriesIcon />, desc: 'Drill a single chapter' },
    ];
    const modes = [
      { k: 'adaptive', label: 'Adaptive', hint: 'Difficulty adjusts as you go' },
      { k: 'easy', label: 'Easy', hint: '' },
      { k: 'medium', label: 'Medium', hint: '' },
      { k: 'hard', label: 'Hard', hint: '' },
      { k: 'random', label: 'Random', hint: 'Mixed difficulty' },
    ];
    return (
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <IconButton onClick={() => navigate('/public/dashboard')} sx={{ color: '#aab4dd', border: '1px solid rgba(255,255,255,0.12)' }}><ArrowBackIcon /></IconButton>
          <Box>
            <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.6rem', color: '#f5f8ff' }}>Build a practice test</Typography>
            <Typography sx={{ fontFamily: ff, color: '#aeb9e0', fontSize: '0.9rem' }}>Pick your scope, length and difficulty mode.</Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Scope */}
        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#cdd6f4', mb: 1.5 }}>1 · What do you want to practice?</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {scopeOptions.map(o => (
            <Grid item xs={12} sm={4} key={o.k}>
              <GlassCard interactive glow="blue" onClick={() => setForm(f => ({ ...f, scope: o.k }))}
                sx={{ p: 2.25, border: form.scope === o.k ? '1px solid rgba(246,137,20,0.55)' : undefined, background: form.scope === o.k ? 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(246,137,20,0.14))' : undefined }}>
                <Box sx={{ width: 42, height: 42, borderRadius: '12px', mb: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'linear-gradient(135deg,#2f6bff,#f68914)' }}>{o.icon}</Box>
                <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#f5f8ff' }}>{o.label}</Typography>
                <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#a9b4dd' }}>{o.desc}</Typography>
              </GlassCard>
            </Grid>
          ))}
        </Grid>

        {/* Subject / chapter selectors */}
        {form.scope !== 'mixed' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Subject" value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value, chapter: '' }))}>
                <MenuItem value="">Select subject…</MenuItem>
                {(meta.subjects || []).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            {form.scope === 'chapter' && (
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Chapter" value={form.chapter} disabled={!form.subject}
                  onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))}>
                  <MenuItem value="">All chapters</MenuItem>
                  {chapters.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
            )}
          </Grid>
        )}

        {/* Count */}
        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#cdd6f4', mb: 1.5 }}>2 · How many questions?</Typography>
        <Stack direction="row" spacing={1.25} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
          {[10, 15, 20, 30].map(n => (
            <Chip key={n} label={n} clickable onClick={() => setForm(f => ({ ...f, count: n }))}
              sx={{ fontFamily: ff, fontWeight: 700, px: 1.5, py: 2.2, borderRadius: '10px',
                background: form.count === n ? 'linear-gradient(135deg,#2f6bff,#f68914)' : 'rgba(255,255,255,0.05)',
                color: form.count === n ? '#fff' : '#aeb9e0', border: form.count === n ? 'none' : '1px solid rgba(255,255,255,0.12)' }} />
          ))}
        </Stack>

        {/* Difficulty mode */}
        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#cdd6f4', mb: 1.5 }}>3 · Difficulty mode</Typography>
        <Stack direction="row" spacing={1.25} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          {modes.map(m => (
            <Chip key={m.k} label={m.label} clickable onClick={() => setForm(f => ({ ...f, mode: m.k }))}
              icon={m.k === 'adaptive' ? <BoltIcon sx={{ fontSize: 16 }} /> : undefined}
              sx={{ fontFamily: ff, fontWeight: 700, px: 1.5, py: 2.2, borderRadius: '10px',
                background: form.mode === m.k ? 'linear-gradient(135deg,#2f6bff,#f68914)' : 'rgba(255,255,255,0.05)',
                color: form.mode === m.k ? '#fff' : '#aeb9e0', border: form.mode === m.k ? 'none' : '1px solid rgba(255,255,255,0.12)',
                '& .MuiChip-icon': { color: form.mode === m.k ? '#fff' : '#ffb054' } }} />
          ))}
        </Stack>
        {form.mode === 'adaptive' && (
          <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#9fc1ff', mb: 3 }}>
            ⚡ Starts easy. Get it right → it gets harder. Miss one → it eases back. Find your level automatically.
          </Typography>
        )}

        <Button variant="gradient" size="large" fullWidth onClick={startSession}
          disabled={loading || (form.scope !== 'mixed' && !form.subject)}
          sx={{ height: 52, fontSize: '1.05rem', mt: 1 }}>
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Start practice'}
        </Button>
      </Container>
    );
  };

  /* ─────────────── RUN ─────────────── */
  const renderRun = () => {
    const q = current?.q;
    if (!q) return null;
    const opts = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
    const correct = (q.correct_answer || '').toUpperCase();
    const dm = DIFF_META[current.bucket] || DIFF_META.medium;
    const progress = (asked.length / Number(form.count)) * 100;

    return (
      <Container maxWidth="md" sx={{ py: { xs: 2.5, md: 4 } }}>
        {/* Top bar */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Chip label={`Q ${asked.length + 1} / ${form.count}`} sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(47,107,255,0.16)', color: '#9fc1ff' }} />
            <Chip label={dm.label} sx={{ fontFamily: ff, fontWeight: 700, bgcolor: dm.bg, color: dm.color }} />
          </Stack>
          <Chip icon={<CheckCircleIcon sx={{ fontSize: 16 }} />} label={`${score} correct`} sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(52,211,153,0.14)', color: '#6ee7b7', '& .MuiChip-icon': { color: '#34d399' } }} />
        </Stack>
        <LinearProgress variant="determinate" value={progress}
          sx={{ height: 8, borderRadius: 4, mb: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#2f6bff,#f68914)', borderRadius: 4 } }} />

        <AnimatePresence mode="wait">
          <Box key={q.id} component={motion.div} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            <GlassCard sx={{ mb: 2.5 }}>
              {q.subject && <Chip label={q.chapter ? `${q.subject} · ${q.chapter}` : q.subject} size="small" sx={{ mb: 1.5, fontFamily: ff, bgcolor: 'rgba(255,255,255,0.06)', color: '#a9b4dd' }} />}
              <Typography sx={{ fontFamily: ff, fontSize: '1.1rem', fontWeight: 600, color: '#f5f8ff', lineHeight: 1.55 }}>{q.text}</Typography>
              {q.image_path && <Box component="img" src={q.image_path} alt="" sx={{ mt: 2, maxWidth: '100%', borderRadius: 2 }} />}
            </GlassCard>

            <Stack spacing={1.5}>
              {LETTERS.map(letter => {
                if (!opts[letter]) return null;
                const isSel = selected === letter;
                const isCorrectOpt = revealed && letter === correct;
                const isWrongSel = revealed && isSel && letter !== correct;
                let border = 'rgba(255,255,255,0.12)', bg = 'rgba(255,255,255,0.04)', clr = '#dbe3ff';
                if (isCorrectOpt) { border = '#34d399'; bg = 'rgba(52,211,153,0.14)'; clr = '#d1fae5'; }
                else if (isWrongSel) { border = '#fb7185'; bg = 'rgba(251,113,133,0.14)'; clr = '#ffe4e6'; }
                else if (isSel) { border = '#2f6bff'; bg = 'rgba(47,107,255,0.14)'; }
                return (
                  <Box key={letter} onClick={() => handleSelect(letter)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.75, borderRadius: '14px', cursor: revealed ? 'default' : 'pointer',
                      border: `2px solid ${border}`, bgcolor: bg, transition: 'all 0.18s',
                      '&:hover': revealed ? {} : { borderColor: 'rgba(246,137,20,0.5)', bgcolor: 'rgba(246,137,20,0.06)' } }}>
                    <Box sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff, fontWeight: 800, fontSize: '0.85rem',
                      bgcolor: isCorrectOpt ? '#34d399' : isWrongSel ? '#fb7185' : 'rgba(255,255,255,0.08)', color: (isCorrectOpt || isWrongSel) ? '#0b1020' : '#aeb9e0' }}>{letter}</Box>
                    <Typography sx={{ fontFamily: ff, color: clr, flex: 1, fontWeight: 500 }}>{opts[letter]}</Typography>
                    {isCorrectOpt && <CheckCircleIcon sx={{ color: '#34d399' }} />}
                    {isWrongSel && <CancelIcon sx={{ color: '#fb7185' }} />}
                  </Box>
                );
              })}
            </Stack>

            {revealed && (
              <Box component={motion.div} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                sx={{ mt: 2.5, p: 2, borderRadius: '14px', bgcolor: selected === correct ? 'rgba(52,211,153,0.10)' : 'rgba(251,113,133,0.10)', border: `1px solid ${selected === correct ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.3)'}` }}>
                <Typography sx={{ fontFamily: ff, fontWeight: 800, color: selected === correct ? '#6ee7b7' : '#fda4af', mb: q.explanation ? 0.75 : 0 }}>
                  {selected === correct ? 'Correct! 🎉' : `Not quite — the answer is ${correct}.`}
                </Typography>
                {q.explanation && <Typography sx={{ fontFamily: ff, fontSize: '0.86rem', color: '#cdd6f4', lineHeight: 1.6 }}>{q.explanation}</Typography>}
              </Box>
            )}

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button variant="gradient" size="large" disabled={!revealed || loading} onClick={handleNext} sx={{ px: 4, height: 48 }}>
                {asked.length >= Number(form.count) ? 'Finish' : 'Next question'}
              </Button>
            </Stack>
          </Box>
        </AnimatePresence>
      </Container>
    );
  };

  /* ─────────────── RESULT ─────────────── */
  const renderResult = () => {
    const total = result?.total || 0;
    const pct = total ? Math.round((result.score / total) * 100) : 0;
    const good = pct >= 60;
    return (
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <GlassCard glow={good ? 'success' : 'orange'} sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ width: 76, height: 76, mx: 'auto', mb: 2, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: good ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg,#f68914,#ff7a00)' }}>
            <TrendingUpIcon sx={{ fontSize: 38 }} />
          </Box>
          <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '2.2rem', color: '#f5f8ff' }}>{result.score}/{total}</Typography>
          <Typography sx={{ fontFamily: ff, color: '#aeb9e0', mb: 2 }}>{pct}% accuracy · {good ? 'Great work!' : 'Keep practicing!'}</Typography>
          <Stack direction="row" spacing={1.5} justifyContent="center">
            <Button variant="gradient" startIcon={<ReplayIcon />} onClick={() => { setStage('setup'); setResult(null); }}>Practice again</Button>
            <Button variant="outlined" onClick={() => navigate('/public/dashboard')}>Back to dashboard</Button>
          </Stack>
        </GlassCard>

        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#f5f8ff', mb: 1.5 }}>Review</Typography>
        <Stack spacing={1.5}>
          {(result.asked || []).map((a, i) => {
            const opts = { A: a.option_a, B: a.option_b, C: a.option_c, D: a.option_d };
            const correct = (a.correct_answer || '').toUpperCase();
            return (
              <GlassCard key={i} sx={{ p: 2.25 }}>
                <Stack direction="row" spacing={1.25} sx={{ mb: 1 }}>
                  {a.isCorrect ? <CheckCircleIcon sx={{ color: '#34d399' }} /> : <CancelIcon sx={{ color: '#fb7185' }} />}
                  <Typography sx={{ fontFamily: ff, fontWeight: 600, color: '#f5f8ff', flex: 1 }}>{i + 1}. {a.text}</Typography>
                  <Chip size="small" label={DIFF_META[a.bucketDiff]?.label || 'Medium'} sx={{ fontFamily: ff, bgcolor: DIFF_META[a.bucketDiff]?.bg, color: DIFF_META[a.bucketDiff]?.color }} />
                </Stack>
                <Typography sx={{ fontFamily: ff, fontSize: '0.84rem', color: '#aeb9e0', ml: 4.5 }}>
                  Your answer: <b style={{ color: a.isCorrect ? '#6ee7b7' : '#fda4af' }}>{a.userAns}. {opts[a.userAns] || '—'}</b>
                  {!a.isCorrect && <> · Correct: <b style={{ color: '#6ee7b7' }}>{correct}. {opts[correct]}</b></>}
                </Typography>
                {a.explanation && <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#9aa6d4', ml: 4.5, mt: 0.5 }}>{a.explanation}</Typography>}
              </GlassCard>
            );
          })}
        </Stack>
      </Container>
    );
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 50px)', fontFamily: ff }}>
      {stage === 'setup' && renderSetup()}
      {stage === 'run' && renderRun()}
      {stage === 'result' && renderResult()}
    </Box>
  );
}
