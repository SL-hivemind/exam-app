import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Drawer, IconButton, useTheme, useMediaQuery, Chip, Fab, Tooltip, Snackbar
} from '@mui/material';
import {
  AccessTime as TimerIcon, Apps as AppsIcon, Close as CloseIcon, ArrowBack as ArrowBackIcon,
  CloudDone as CloudDoneIcon, CloudSync as CloudSyncIcon, CloudOff as CloudOffIcon,
  Fullscreen as FullscreenIcon, Videocam as VideocamIcon, VideocamOff as VideocamOffIcon
} from '@mui/icons-material';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import useExamSecurity from '../hooks/useExamSecurity';
import useCameraMonitor from '../hooks/useCameraMonitor';
import useFaceMonitor from '../hooks/useFaceMonitor';
import { EVENT, EVENT_MESSAGE } from '../utils/proctorEvents';
import MatrixFormatter from '../utils/MatrixFormatter';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// Hard-violation budget before the exam submits itself. Overridden by the
// exam's resolved proctoring policy once it arrives from the server.
const DEFAULT_MAX_VIOLATIONS = 3;

// Fallback flush interval for a student who is reading rather than clicking.
// Deliberately long: this is a backstop, not a heartbeat. A per-student poll
// under ~60s is what saturates the instance at 500 concurrent — the whole
// pipeline is built to keep events riding on autosave instead.
const PROCTOR_FLUSH_MS = 120000;

const DARK = {
  bg: 'rgba(7,11,26,0.98)',
  card: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.08)',
  cardHover: 'rgba(255,255,255,0.07)',
  headerBg: 'rgba(9,14,42,0.85)',
  text: '#eaf0ff',
  sub: '#a9b4dd',
  muted: '#6b7db3',
  blue: '#2563eb',
  blueLight: '#3b82f6',
  green: '#22c55e',
  orange: '#f59e0b',
  red: '#ef4444',
  sidebar: 'rgba(11,16,42,0.97)',
};

export default function StudentExamQuestionsPage() {
  const { examId } = useParams();
  const { authToken, user } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [notice, setNotice] = useState(null);   // transient, non-blocking
  const [policy, setPolicy] = useState(null);   // resolved server-side
  const [cameraPromptDismissed, setCameraPromptDismissed] = useState(false);
  const [faceSkipped, setFaceSkipped] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 1;
  const [visitedPages, setVisitedPages] = useState(new Set([1]));
  const [mobileOpen, setMobileOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    setVisitedPages(prev => new Set(prev).add(currentPage));
  }, [currentPage]);

  const timerRef = useRef(null);
  const handleSubmitRef = useRef();
  const storageKey = useMemo(() => `examAnswers-${user?.id}-${examId}`, [user?.id, examId]);

  // Events accumulate here and ride out on the next autosave request rather
  // than each one costing a round trip. At 300 concurrent students a
  // per-event POST is what saturates the instance — see the load analysis.
  const pendingEventsRef = useRef([]);

  const handleProctorEvent = useCallback((event) => {
    pendingEventsRef.current.push(event);
    const message = EVENT_MESSAGE[event.type];
    if (message) setNotice({ message, severity: event.severity });
  }, []);

  const {
    violations, isFullscreen, fullscreenSupported, enterFullscreen, emit,
  } = useExamSecurity({
    armed: !loading && !submitted,
    policy,
    onEvent: handleProctorEvent,
    seqKey: `examSeq-${user?.id}-${examId}`,
  });

  // Camera events share the security hook's sequence counter so the server
  // sees one ordered stream per attempt rather than two interleaved ones.
  const camera = useCameraMonitor({
    active: !loading && !submitted,
    enabled: policy?.cameraRequired === true,
    onEvent: emit,
  });

  // Face monitoring is gated on BOTH the policy and a live camera. The ~3 MB
  // of model and WASM is only ever fetched for exams that actually asked for
  // it — a classroom or practice exam never pays that cost.
  const face = useFaceMonitor({
    active: !loading && !submitted,
    enabled: policy?.cameraRequired === true &&
             policy?.facePresence === true &&
             camera.status === 'active' &&
             !faceSkipped,
    stream: camera.stream,
    onEvent: emit,
  });

  // Skipping is recorded rather than prevented. A student who cannot get
  // calibration to work must still be able to sit the exam; the teacher sees
  // that monitoring was not running and can weigh it themselves.
  useEffect(() => {
    if (faceSkipped) emit(EVENT.FACE_MONITOR_UNAVAILABLE, { reason: 'skipped_by_student' });
  }, [faceSkipped, emit]);

  const maxViolations = policy?.maxViolations ?? DEFAULT_MAX_VIOLATIONS;

  // Auto-submit on repeated HARD violations only. The hook counts nothing
  // else — soft/inferred signals can never reach this counter by design.
  useEffect(() => {
    if (loading || submitted) return;
    if (policy && policy.autoSubmitOnMaxViolations === false) return;
    if (violations >= maxViolations) handleSubmitRef.current?.('tab_switch');
  }, [violations, loading, submitted, policy, maxViolations]);

  // Fullscreen is entered from the Start button on the previous page (a real
  // user gesture). Firefox and Safari reject a request made from an effect,
  // which is why the old call here silently did nothing in those browsers.
  // All we do here is notice if the student leaves it, and offer a way back.
  const needsFullscreen =
    !loading && !submitted && fullscreenSupported && !isFullscreen &&
    policy?.requireFullscreen !== false;

  const handleSubmitMcqAnswers = useCallback(async (reason = 'manual') => {
    if (submitted) return;
    setSubmitLoading(true);
    setError('');
    try {
      const answers = Object.entries(mcqAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId), answer
      }));
      // Final flush. The violation that triggered an auto-submit is usually
      // in this batch, and the server checks the claim against these rows.
      await api.post(`/student/exams/${examId}/submit`,
        { answers, reason, events: pendingEventsRef.current.splice(0) },
        { headers: { auth_token: authToken } });
      clearInterval(timerRef.current);
      localStorage.removeItem(storageKey);
      setSubmitted(true);
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      navigate(`/exam/${examId}/results`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
      setSubmitLoading(false);
    }
  }, [examId, authToken, storageKey, mcqAnswers, submitted, navigate]);

  useEffect(() => { handleSubmitRef.current = handleSubmitMcqAnswers; }, [handleSubmitMcqAnswers]);

  useEffect(() => {
    if (!authToken) { setError("You are not logged in."); setLoading(false); return; }
    const fetchExamDetails = async () => {
      setLoading(true);
      try {
        const canStartRes = await api.get(`/student/exams/${examId}/can_start`, { headers: { auth_token: authToken } });
        const { assigned, within_window, already_submitted } = canStartRes.data;
        if (!assigned || (!within_window && !already_submitted)) { setError("Exam is not currently available."); setLoading(false); return; }
        if (already_submitted) { navigate(`/exam/${examId}/results`); return; }
        if (canStartRes.data.proctor_policy) setPolicy(canStartRes.data.proctor_policy);

        const questionsRes = await api.get(`/student/exams/${examId}/questions`, { headers: { auth_token: authToken } });
        setExam({ ...canStartRes.data.exam, questions: questionsRes.data.questions });

        const savedAnswersStr = localStorage.getItem(storageKey);
        let mergedAnswers = savedAnswersStr ? JSON.parse(savedAnswersStr) : {};

        const attemptRes = await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
        if (attemptRes.data.saved_answers) mergedAnswers = { ...attemptRes.data.saved_answers, ...mergedAnswers };
        if (Object.keys(mergedAnswers).length > 0) setMcqAnswers(mergedAnswers);

        // Fix: ensure UTC parsing of expires_at
        const expiresAtStr = attemptRes.data.expires_at;
        const expiresAt = new Date(expiresAtStr?.endsWith('Z') ? expiresAtStr : `${expiresAtStr}Z`);
        let remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        if (isNaN(remainingSeconds)) remainingSeconds = (canStartRes.data.exam.duration_minutes || 60) * 60;

        setTimeLeft(remainingSeconds);
        if (remainingSeconds <= 0) { handleSubmitRef.current('timeout'); return; }

        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) { clearInterval(timerRef.current); handleSubmitRef.current('timeout'); return 0; }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    fetchExamDetails();
    return () => clearInterval(timerRef.current);
  }, [examId, authToken, storageKey, navigate]);

  // Detach the buffered events for sending. Kept separate from the request
  // so a failed flush can hand them straight back — an event must survive a
  // dropped connection, otherwise a student on flaky school wifi looks
  // cleaner than one on a good line.
  const takeEvents = useCallback(() => pendingEventsRef.current.splice(0), []);
  const returnEvents = useCallback((events) => {
    if (events?.length) pendingEventsRef.current.unshift(...events);
  }, []);

  const lastSavedRef = useRef({});
  const lastFlushRef = useRef(Date.now());

  useEffect(() => {
    if (submitted) return;
    const saveTimer = setTimeout(async () => {
      if (Object.keys(mcqAnswers).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(mcqAnswers));
        const changedAnswers = Object.entries(mcqAnswers).filter(([qId, ans]) => lastSavedRef.current[qId] !== ans);
        if (changedAnswers.length > 0) {
          const events = takeEvents();
          try {
            setSaveStatus('saving');
            await api.post(`/student/exams/${examId}/autosave`, {
              answers: changedAnswers.map(([qId, ans]) => ({ question_id: parseInt(qId), answer: ans })),
              // Integrity events ride along on a request the student was
              // making anyway. This is what keeps monitoring off the
              // request budget at 300+ concurrent students.
              events,
            }, { headers: { auth_token: authToken } });
            lastSavedRef.current = { ...mcqAnswers };
            lastFlushRef.current = Date.now();
            setSaveStatus('saved');
          } catch (err) {
            console.error("Autosave failed:", err);
            returnEvents(events);
            setSaveStatus('error'); // answers are still kept on this device and sent again on submit
          }
        }
      }
    }, 500);
    return () => clearTimeout(saveTimer);
  }, [mcqAnswers, storageKey, submitted, examId, authToken, takeEvents, returnEvents]);

  // Fallback flush. Only fires for a student who is reading rather than
  // answering — anyone actively clicking has already flushed via autosave.
  useEffect(() => {
    if (loading || submitted) return;
    const id = setInterval(async () => {
      if (!pendingEventsRef.current.length) return;
      if (Date.now() - lastFlushRef.current < PROCTOR_FLUSH_MS) return;
      const events = takeEvents();
      try {
        await api.post(`/student/exams/${examId}/events`, { events },
          { headers: { auth_token: authToken } });
        lastFlushRef.current = Date.now();
      } catch {
        returnEvents(events);
      }
    }, PROCTOR_FLUSH_MS);
    return () => clearInterval(id);
  }, [loading, submitted, examId, authToken, takeEvents, returnEvents]);

  // Last gasp. The page is going away and a normal request would be killed
  // mid-flight; sendBeacon is the only thing the browser guarantees to
  // deliver here. It cannot set custom headers, so the token goes in the body.
  useEffect(() => {
    if (loading || submitted) return;
    const flushOnHide = () => {
      const events = pendingEventsRef.current;
      if (!events.length || !navigator.sendBeacon) return;
      const url = `${api.defaults.baseURL}/student/exams/${examId}/events`;
      const blob = new Blob(
        [JSON.stringify({ events, auth_token: authToken })],
        { type: 'application/json' },
      );
      if (navigator.sendBeacon(url, blob)) pendingEventsRef.current = [];
    };
    window.addEventListener('pagehide', flushOnHide);
    return () => {
      window.removeEventListener('pagehide', flushOnHide);
      flushOnHide();
    };
  }, [loading, submitted, examId, authToken]);

  const handleMcqAnswerChange = (mcqId, answer) => {
    if (submitted) return;
    setMcqAnswers(prev => ({ ...prev, [mcqId]: answer }));
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  if (loading) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: DARK.bg }}>
      <CircularProgress sx={{ color: DARK.blue }} />
    </Box>
  );

  if (error) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: DARK.bg, p: 3 }}>
      <Box sx={{ maxWidth: 480, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button onClick={() => navigate('/student')} sx={{ color: DARK.blueLight }}>Back to Dashboard</Button>
      </Box>
    </Box>
  );

  const totalQuestions = exam?.questions?.length || 0;
  const answeredCount = Object.keys(mcqAnswers).length;
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);
  const indexOfFirstQ = (currentPage - 1) * questionsPerPage;
  const currentQuestions = exam?.questions?.slice(indexOfFirstQ, indexOfFirstQ + questionsPerPage) || [];

  const renderSidebar = () => (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: DARK.sidebar, backdropFilter: 'blur(14px)', borderLeft: `1px solid ${DARK.cardBorder}` }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: `1px solid ${DARK.cardBorder}` }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: DARK.text }}>Question Navigator</Typography>
        <Chip label={`${answeredCount}/${totalQuestions}`} size="small"
          sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(34,197,94,0.12)', color: DARK.green, fontSize: '0.72rem' }} />
      </Box>
      {/* Progress bar */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Box sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', borderRadius: 3, width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`, background: 'linear-gradient(90deg, #2563eb, #22c55e)', transition: 'width 0.3s ease' }} />
        </Box>
      </Box>
      {/* Question grid */}
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 10 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {exam?.questions?.map((q, idx) => {
            const qPage = Math.ceil((idx + 1) / questionsPerPage);
            const isAttempted = mcqAnswers[q.id] !== undefined;
            const isVisited = visitedPages.has(qPage) && !isAttempted;
            const isCurrent = currentPage === qPage;
            let bg = 'rgba(255,255,255,0.07)', clr = DARK.sub;
            if (isAttempted) { bg = DARK.green; clr = '#fff'; }
            else if (isVisited) { bg = DARK.orange; clr = '#fff'; }
            return (
              <Box key={q.id} onClick={() => { setCurrentPage(qPage); if (isMobile) setMobileOpen(false); }}
                sx={{
                  width: 36, height: 36, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: bg, color: clr, fontFamily: ff, fontWeight: 700, fontSize: '0.78rem',
                  cursor: 'pointer', outline: isCurrent ? `2px solid ${DARK.blue}` : 'none', outlineOffset: 2,
                  transition: 'all 0.15s', '&:hover': { opacity: 0.85, transform: 'scale(1.08)' }
                }}>
                {idx + 1}
              </Box>
            );
          })}
        </Box>
      </Box>
      {/* Legend */}
      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${DARK.cardBorder}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[{ color: DARK.green, label: 'Attempted' }, { color: DARK.orange, label: 'Visited (Not Answered)' }, { color: 'rgba(255,255,255,0.07)', label: 'Not Visited', border: DARK.cardBorder }].map(l => (
          <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '4px', bgcolor: l.color, border: l.border ? `1px solid ${l.border}` : 'none', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', color: DARK.sub }}>{l.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );

  const isLow = timeLeft < 300;

  return (
    <Box
      sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: DARK.bg, zIndex: 1200, overflow: 'auto', userSelect: 'none', fontFamily: ff }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── HEADER BAR ── */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 200, height: 60,
        bgcolor: DARK.headerBg, backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${DARK.cardBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 2, md: 3 },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/student')} sx={{ color: DARK.sub, '&:hover': { color: DARK.text } }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography sx={{ fontFamily: ff, fontWeight: 800, color: DARK.text, fontSize: { xs: '0.9rem', sm: '1.05rem' }, lineHeight: 1.2 }} noWrap>
              {exam?.title}
            </Typography>
            <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', color: DARK.muted }}>
              Answered {answeredCount} of {totalQuestions}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          {violations > 0 && (
            <Tooltip arrow title={
              policy?.autoSubmitOnMaxViolations === false
                ? 'Leaving this tab or window is recorded for your teacher to review.'
                : `Leaving this tab or window is recorded. After ${maxViolations} warnings the exam submits automatically — stay on this page.`
            }>
              <Chip label={`⚠ ${violations} warning${violations > 1 ? 's' : ''}`} size="small"
                sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '0.72rem', display: { xs: 'none', sm: 'flex' } }} />
            </Tooltip>
          )}
          {/* Camera status. Shown only when the policy asks for a camera —
              and never as a blocker: a student whose camera failed still
              takes the exam, the absence is simply on the record. */}
          {policy?.cameraRequired && camera.status !== 'idle' && (
            <Tooltip arrow title={
              camera.status === 'active'
                ? 'Your camera is on. Nothing is recorded or uploaded — only whether it stays connected.'
                : 'Your camera is not available. You can continue the exam; this is recorded for your teacher.'
            }>
              <Chip
                size="small"
                icon={camera.status === 'active'
                  ? <VideocamIcon sx={{ fontSize: 15 }} />
                  : <VideocamOffIcon sx={{ fontSize: 15 }} />}
                label={
                  camera.status !== 'active' ? 'No camera'
                    : face.status === 'monitoring' && face.attention === 'absent' ? 'Not visible'
                    : face.status === 'monitoring' ? 'Monitoring'
                    : 'Camera on'
                }
                sx={{
                  fontFamily: ff, fontWeight: 700, fontSize: '0.72rem',
                  display: { xs: 'none', sm: 'flex' },
                  bgcolor: camera.status === 'active' && face.attention !== 'absent'
                    ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.15)',
                  color: camera.status === 'active' && face.attention !== 'absent'
                    ? '#86efac' : '#fcd34d',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            </Tooltip>
          )}

          {/* Auto-save indicator — reassures students their answers are safe */}
          {saveStatus !== 'idle' && (
            <Tooltip arrow title={
              saveStatus === 'error'
                ? "Couldn't reach the server just now — your answers are still stored on this device and will be sent when you submit. Keep going."
                : 'Every answer you pick is saved to the server automatically. If your device or internet fails, log back in and continue — nothing is lost.'
            }>
              <Chip
                size="small"
                icon={saveStatus === 'saving' ? <CloudSyncIcon sx={{ fontSize: 15 }} /> : saveStatus === 'error' ? <CloudOffIcon sx={{ fontSize: 15 }} /> : <CloudDoneIcon sx={{ fontSize: 15 }} />}
                label={saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Saved on device' : 'Saved'}
                sx={{
                  fontFamily: ff, fontWeight: 700, fontSize: '0.72rem',
                  bgcolor: saveStatus === 'error' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.12)',
                  color: saveStatus === 'error' ? '#fcd34d' : '#86efac',
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            </Tooltip>
          )}
          {/* Timer */}
          <Tooltip arrow title="Time remaining. When it reaches zero the exam submits itself with all your saved answers — no need to rush the button.">
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            bgcolor: isLow ? 'rgba(239,68,68,0.12)' : 'rgba(37,99,235,0.12)',
            border: `1px solid ${isLow ? 'rgba(239,68,68,0.3)' : 'rgba(37,99,235,0.3)'}`,
            px: { xs: 1.5, sm: 2 }, py: 0.75, borderRadius: 2.5,
          }}>
            <TimerIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: isLow ? DARK.red : DARK.blueLight }} />
            <Typography sx={{
              fontFamily: ff, fontWeight: 800, fontSize: { xs: '0.95rem', sm: '1.1rem' },
              color: isLow ? DARK.red : DARK.blueLight, minWidth: { xs: 52, sm: 62 }, textAlign: 'center',
              animation: isLow ? 'pulse 1s ease-in-out infinite' : 'none',
              '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } }
            }}>
              {formatTime(timeLeft)}
            </Typography>
          </Box>
          </Tooltip>

          <Button
            variant="contained" onClick={() => setConfirmOpen(true)} disabled={submitLoading}
            size={isMobile ? "small" : "medium"}
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: 2.5, px: { xs: 2, sm: 3 }, background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 4px 14px rgba(22,163,74,0.3)', '&:hover': { boxShadow: '0 6px 20px rgba(22,163,74,0.4)' } }}
          >
            {submitLoading ? 'Wait...' : 'Submit'}
          </Button>
        </Box>
      </Box>

      {/* ── BODY ── */}
      <Box sx={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
        {/* Questions area */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 10 } }}>
          <Box sx={{ maxWidth: 760, mx: 'auto' }}>
            {currentQuestions.map((q, idx) => {
              const qNum = indexOfFirstQ + idx + 1;
              const selected = mcqAnswers[q.id];
              return (
                <Box key={q.id} sx={{ mb: 3 }}>
                  {/* Question card */}
                  <Box sx={{ bgcolor: DARK.card, border: `1px solid ${DARK.cardBorder}`, borderRadius: 3, p: { xs: 2.5, sm: 3.5 } }}>
                    {/* Q number + subject */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                      <Chip label={`Question ${qNum} of ${totalQuestions}`}
                        sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(37,99,235,0.12)', color: '#93c5fd', fontSize: '0.75rem' }} />
                      {q.marks && (
                        <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: DARK.muted }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</Typography>
                      )}
                    </Box>

                    {q.image_path && (
                      <Box sx={{ my: 2.5, display: 'flex', justifyContent: 'center' }}>
                        <img src={q.image_path} alt="Question" style={{ maxHeight: 280, maxWidth: '100%', borderRadius: 10 }} />
                      </Box>
                    )}

                    <Typography sx={{ fontFamily: ff, fontSize: { xs: '1rem', md: '1.08rem' }, color: DARK.text, mb: 3, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                      <MatrixFormatter text={q.text} />
                    </Typography>

                    {/* Options */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      {['a', 'b', 'c', 'd'].map((opt) => {
                        if (!q[`option_${opt}`]) return null;
                        const val = opt.toUpperCase();
                        const isSelected = selected === val;
                        return (
                          <Box key={opt} onClick={() => handleMcqAnswerChange(q.id, val)}
                            sx={{
                              display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 },
                              borderRadius: 2.5, cursor: 'pointer', transition: 'all 0.2s',
                              border: `2px solid ${isSelected ? DARK.blue : DARK.cardBorder}`,
                              bgcolor: isSelected ? 'rgba(37,99,235,0.08)' : DARK.cardHover,
                              '&:hover': { borderColor: isSelected ? DARK.blue : 'rgba(37,99,235,0.35)', bgcolor: 'rgba(37,99,235,0.04)' }
                            }}>
                            <Box sx={{
                              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, fontFamily: ff, fontWeight: 800, fontSize: '0.8rem',
                              bgcolor: isSelected ? DARK.blue : 'rgba(255,255,255,0.07)',
                              color: isSelected ? '#fff' : DARK.sub,
                              transition: 'all 0.2s'
                            }}>{val}</Box>
                            <Typography sx={{ fontFamily: ff, fontSize: '0.95rem', color: isSelected ? DARK.text : DARK.sub, fontWeight: isSelected ? 600 : 400, flex: 1, whiteSpace: 'pre-wrap' }}>
                              <MatrixFormatter text={q[`option_${opt}`]} />
                            </Typography>
                            {isSelected && (
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DARK.blue, flexShrink: 0 }} />
                            )}
                          </Box>
                        );
                      })}
                    </Box>

                    {/* ACTION BUTTONS */}
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
                      <Button 
                        variant="outlined"
                        onClick={() => {
                           setMcqAnswers(prev => { const next = {...prev}; delete next[q.id]; return next; });
                        }}
                        sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 2, color: DARK.sub, borderColor: DARK.cardBorder, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: DARK.blueLight } }}
                      >
                        Clear Response
                      </Button>
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {/* Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2, mb: 6 }}>
              <Button
                variant="outlined" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: 2.5, flex: 1, borderColor: DARK.cardBorder, color: DARK.sub, '&:not(:disabled):hover': { borderColor: DARK.blueLight, color: DARK.text } }}
              >Previous</Button>
              <Typography sx={{ alignSelf: 'center', fontFamily: ff, fontSize: '0.8rem', color: DARK.muted, whiteSpace: 'nowrap' }}>
                {currentPage} / {totalPages}
              </Typography>
              <Button
                variant="contained" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: 2.5, flex: 1, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)', '&:disabled': { bgcolor: 'rgba(255,255,255,0.08)', color: DARK.muted } }}
              >Next Question</Button>
            </Box>
          </Box>
        </Box>

        {/* Desktop sidebar */}
        {!isMobile && (
          <Box sx={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            {renderSidebar()}
          </Box>
        )}
      </Box>

      {/* Mobile FAB */}
      {isMobile && (
        <Fab color="primary" onClick={() => setMobileOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 8px 24px rgba(37,99,235,0.4)' }}>
          <Box sx={{ position: 'relative' }}>
            <AppsIcon />
            {answeredCount > 0 && (
              <Box sx={{ position: 'absolute', top: -8, right: -8, width: 18, height: 18, borderRadius: '50%', bgcolor: DARK.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>
                {answeredCount}
              </Box>
            )}
          </Box>
        </Fab>
      )}

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: { xs: 280, sm: 320 }, bgcolor: DARK.sidebar, border: 'none' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: `1px solid ${DARK.cardBorder}` }}>
          <Typography sx={{ fontFamily: ff, fontWeight: 700, color: DARK.text }}>Questions</Typography>
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: DARK.sub }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderSidebar()}</Box>
      </Drawer>

      {/* Submit Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { bgcolor: '#0f1629', border: `1px solid ${DARK.cardBorder}`, borderRadius: 4, p: 1, minWidth: 320 } }}>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 800, color: DARK.text }}>Submit Exam?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: ff, color: DARK.sub }}>
            You have answered <strong style={{ color: DARK.text }}>{answeredCount}</strong> out of <strong style={{ color: DARK.text }}>{totalQuestions}</strong> questions.
            {answeredCount < totalQuestions && <><br /><span style={{ color: DARK.orange }}>⚠ {totalQuestions - answeredCount} questions unanswered — they will score zero.</span> <span style={{ color: DARK.muted }}>Use the question grid on the right to jump to them.</span></>}
          </Typography>
          <Typography sx={{ fontFamily: ff, color: DARK.muted, fontSize: '0.78rem', mt: 1.5 }}>
            Once submitted you cannot reopen the exam. Your answers are already auto-saved, so nothing is lost either way.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', color: DARK.sub, borderRadius: 2 }}>Cancel</Button>
          <Button onClick={() => { setConfirmOpen(false); handleSubmitMcqAnswers('manual'); }} variant="contained"
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 3, background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
            Yes, Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Fullscreen re-entry ──
          Esc always exits fullscreen and no page can prevent it. Rather than
          fight the browser, we detect the exit, record it, and offer one
          click back — which is a real user gesture, so it actually works. */}
      {needsFullscreen && (
        <Box sx={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1400, display: 'flex', alignItems: 'center', gap: 2,
          bgcolor: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.35)',
          backdropFilter: 'blur(12px)', borderRadius: 3, px: 2.5, py: 1.5,
          maxWidth: 'calc(100vw - 32px)',
        }}>
          <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600 }}>
            Fullscreen was exited — this is recorded.
          </Typography>
          <Button
            size="small" variant="contained" startIcon={<FullscreenIcon />}
            onClick={enterFullscreen}
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: 2, bgcolor: DARK.red, '&:hover': { bgcolor: '#dc2626' }, flexShrink: 0 }}
          >
            Return
          </Button>
        </Box>
      )}

      {/* Calibration. Deliberately explicit rather than silent: the student
          is told what is being measured and can redo it, which is both fairer
          and the only way a bad calibration (slouched, off-centre, camera
          half-covered) gets corrected before it causes false flags. */}
      {(face.status === 'loading' || face.status === 'calibrating') && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1500,
          bgcolor: 'rgba(7,11,26,0.94)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
        }}>
          <Box sx={{ maxWidth: 420, textAlign: 'center' }}>
            <CircularProgress
              variant={face.status === 'calibrating' ? 'determinate' : 'indeterminate'}
              value={Math.round(face.calibrationProgress * 100)}
              size={72} thickness={4} sx={{ color: DARK.blueLight, mb: 3 }}
            />
            <Typography sx={{ fontFamily: ff, fontWeight: 800, color: DARK.text, fontSize: '1.15rem', mb: 1 }}>
              {face.status === 'loading' ? 'Preparing camera check…' : 'Sit normally and look at your screen'}
            </Typography>
            <Typography sx={{ fontFamily: ff, color: DARK.sub, fontSize: '0.88rem', lineHeight: 1.6 }}>
              {face.status === 'loading'
                ? 'This runs entirely on your device. It only takes a moment.'
                : 'We are learning your normal position so that small movements are ignored later. Nothing is recorded or uploaded.'}
            </Typography>

            {face.calibrationError && (
              <Alert severity="warning" sx={{ mt: 3, textAlign: 'left' }}>
                {face.calibrationError === 'face_not_steady'
                  ? "We couldn't see your face clearly enough. Check your lighting and that the camera is not covered, then try again."
                  : 'Not enough was captured. Please try again.'}
                <Button size="small" onClick={face.recalibrate} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
                  Try again
                </Button>
              </Alert>
            )}

            {/* Never a trap: monitoring is optional, the exam is not. */}
            <Button
              size="small" onClick={() => setFaceSkipped(true)}
              sx={{ mt: 3, textTransform: 'none', color: DARK.muted, fontFamily: ff }}
            >
              Skip and continue to the exam
            </Button>
          </Box>
        </Box>
      )}

      {/* Camera retry. Safari requires a user gesture for getUserMedia, so
          the automatic attempt can fail on a technicality — this button is a
          real click and usually succeeds where the auto-attempt did not.
          Dismissible, and never blocks the exam. */}
      {camera.needsAttention && !cameraPromptDismissed && !needsFullscreen && (
        <Box sx={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1400, display: 'flex', alignItems: 'center', gap: 1.5,
          bgcolor: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.35)',
          backdropFilter: 'blur(12px)', borderRadius: 3, px: 2.5, py: 1.5,
          maxWidth: 'calc(100vw - 32px)', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#fcd34d', fontWeight: 600 }}>
            {camera.status === 'denied'
              ? 'Camera access was blocked.'
              : 'Your camera is unavailable.'} You can keep going — this is recorded.
          </Typography>
          <Button
            size="small" variant="contained" startIcon={<VideocamIcon />}
            onClick={camera.requestCamera}
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: 2, bgcolor: DARK.orange, color: '#111', '&:hover': { bgcolor: '#d97706' } }}
          >
            Retry
          </Button>
          <Button
            size="small" onClick={() => setCameraPromptDismissed(true)}
            sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', color: DARK.sub, minWidth: 0 }}
          >
            Dismiss
          </Button>
        </Box>
      )}

      {/* Transient notices. Replaces the alert() calls, which blocked the
          event loop — freezing the countdown and needing a click to clear. */}
      <Snackbar
        open={!!notice}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 7 }}
      >
        <Alert
          severity={notice?.severity >= 2 ? 'warning' : 'info'}
          variant="filled"
          onClose={() => setNotice(null)}
          sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.82rem' }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}