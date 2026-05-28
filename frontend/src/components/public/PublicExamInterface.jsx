import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Toolbar, Alert, CircularProgress,
  Drawer, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, useMediaQuery, useTheme, Fab, Tooltip, Radio,
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { publicApi } from '../../utils/api';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PublicExamInterface() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [content, setContent] = useState(location.state?.content || null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timeLeft, setTimeLeft] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabWarning, setTabWarning] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [cbtQuestions, setCbtQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(1);

  // Load content and start attempt
  useEffect(() => {
    const init = async () => {
      try {
        const isCbt = content?.content_type === 'cbt_exam';
        const isExamType = content?.content_type === 'pdf_exam' || isCbt;

        if (isExamType || !content) {
          try {
            const startRes = await publicApi.startExam(contentId);
            const attemptData = startRes.data.attempt;
            setAttempt(attemptData);
            setTotalQuestions(startRes.data.total_questions || 0);
            setDurationMinutes(startRes.data.duration_minutes || 60);

            if (startRes.data.already_submitted || attemptData.submitted_at) {
              setSubmitted(true);
              setResult(attemptData);
            }
          } catch (examErr) {
            if (examErr.response?.status === 404 && content?.content_type === 'pdf_material') {
              // Just study material
            } else {
              throw examErr;
            }
          }
        }

        // For CBT exams: load native questions instead of PDF
        if (isCbt || content?.content_type === 'cbt_exam') {
          try {
            const qRes = await publicApi.getQuestions(contentId);
            setCbtQuestions(qRes.data.questions || []);
            if (!totalQuestions && qRes.data.total) setTotalQuestions(qRes.data.total);
          } catch { /* questions may not exist yet */ }
        } else {
          // Fetch PDF blob for pdf_exam or pdf_material
          try {
            const pdfRes = await publicApi.getContentFile(contentId);
            const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
          } catch { /* PDF may not be available */ }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to open content');
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [contentId]);

  // Timer
  useEffect(() => {
    if (!attempt || submitted || !attempt.start_time) return;

    // Append 'Z' to indicate UTC time if missing, to avoid incorrect local timezone parsing
    const startTimeStr = attempt.start_time.endsWith('Z') ? attempt.start_time : `${attempt.start_time}Z`;
    const startMs = new Date(startTimeStr).getTime();
    const endMs = startMs + durationMinutes * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endMs - now) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) handleSubmit();
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attempt, submitted, durationMinutes]);

  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = useCallback((qNum, option) => {
    if (reviewMode) return;
    setAnswers(prev => ({ ...prev, [qNum]: option }));
  }, [reviewMode]);

  const toggleMark = useCallback((qNum) => {
    if (reviewMode) return;
    setMarked(prev => ({ ...prev, [qNum]: !prev[qNum] }));
  }, [reviewMode]);

  // Fullscreen
  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const exitFullscreen = () => {
    document.exitFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Tab-switch detection
  useEffect(() => {
    if (!attempt || submitted || reviewMode) return;
    const handler = () => {
      if (document.hidden) {
        setTabWarning(p => p + 1);
        setError('⚠️ Warning: Tab switch detected! Stay on this tab during the exam.');
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [attempt, submitted, reviewMode]);

  // Review mode loader
  const loadReview = async (attemptId) => {
    try {
      const res = await publicApi.reviewExam(attemptId);
      setReviewData(res.data);
      setAnswers(res.data.user_answers || {});
      setTotalQuestions(res.data.total_questions || 0);
      // For CBT exams, load questions with answers for explanation display
      if (content?.content_type === 'cbt_exam') {
        try {
          const qRes = await publicApi.getQuestions(contentId);
          // Merge correct answers + explanations from review data
          const questions = (qRes.data.questions || []).map(q => ({
            ...q,
            correct_option: res.data.answer_key?.[String(q.order_index)],
            explanation: q.explanation || null,
          }));
          setCbtQuestions(questions);
        } catch { /* fallback */ }
      }
      setCurrentQ(1);
      setReviewMode(true);
    } catch { setError('Could not load review data'); }
  };

  const handleSubmit = async () => {
    if (!attempt || submitted) return;
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const res = await publicApi.submitExam(attempt.id, answers);
      setResult(res.data.attempt);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(marked).filter(Boolean).length;
  const options = ['A', 'B', 'C', 'D'];

  // Color logic for nav grid
  const getQStatus = (qNum) => {
    const q = String(qNum);
    if (reviewMode && reviewData) {
      const userAns = reviewData.user_answers?.[q];
      const correctAns = reviewData.answer_key?.[q];
      if (!userAns) return 'unanswered';
      return userAns.toUpperCase() === (correctAns || '').toUpperCase() ? 'correct' : 'wrong';
    }
    if (marked[q]) return 'marked';
    if (answers[q]) return 'answered';
    return 'unanswered';
  };
  const statusColors = {
    answered: { bg: '#22c55e', color: '#fff' },
    marked: { bg: '#eab308', color: '#fff' },
    unanswered: { bg: '#e2e8f0', color: '#64748b' },
    correct: { bg: '#22c55e', color: '#fff' },
    wrong: { bg: '#ef4444', color: '#fff' },
  };

  // ── BUBBLE SHEET RENDERER ──
  const renderBubbleSheet = (inDrawer = false) => (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: inDrawer ? '#fff' : '#f8fafc' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, pb: 1.5, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
          {reviewMode ? '📋 Review Mode' : 'Answer Sheet'}
        </Typography>
        {!reviewMode && (
          <Chip icon={<TimerIcon sx={{ fontSize: 16 }} />} label={formatTime(timeLeft)} size="small"
            sx={{ fontFamily: ff, fontWeight: 700, bgcolor: timeLeft !== null && timeLeft < 300 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: timeLeft !== null && timeLeft < 300 ? '#ef4444' : '#2563eb', '& .MuiChip-icon': { color: 'inherit' } }} />
        )}
      </Box>
      <Box sx={{ mb: 1.5, flexShrink: 0 }}>
        <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#64748b', mb: 0.5 }}>
          {reviewMode ? `Score: ${reviewData?.attempt?.score ?? '?'} / ${totalQuestions}` : `Answered ${answeredCount} of ${totalQuestions}`}{markedCount > 0 && !reviewMode ? ` · ${markedCount} marked` : ''}
        </Typography>
        <Box sx={{ height: 6, borderRadius: 3, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', borderRadius: 3, width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`, background: reviewMode ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #2563eb, #3b82f6)', transition: 'width 0.3s ease' }} />
        </Box>
      </Box>
      {/* Navigation Grid */}
      <Box sx={{ mb: 1.5, flexShrink: 0 }}>
        <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>Question Map</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => {
            const sc = statusColors[getQStatus(qNum)];
            const isCbt = content?.content_type === 'cbt_exam';
            return (<Box key={qNum} onClick={() => { if (isCbt) setCurrentQ(qNum); }} sx={{ width: 30, height: 30, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: sc.bg, color: sc.color, fontSize: '0.7rem', fontWeight: 700, fontFamily: ff, cursor: isCbt ? 'pointer' : 'default', outline: isCbt && currentQ === qNum ? '2px solid #2563eb' : 'none', transition: 'all 0.15s' }}>{qNum}</Box>);
          })}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
          {(reviewMode
            ? [{ label: 'Correct', bg: '#22c55e' }, { label: 'Wrong', bg: '#ef4444' }, { label: 'Skipped', bg: '#e2e8f0' }]
            : [{ label: 'Answered', bg: '#22c55e' }, { label: 'Marked', bg: '#eab308' }, { label: 'Unanswered', bg: '#e2e8f0' }]
          ).map(l => (
            <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: l.bg }} />
              <Typography sx={{ fontFamily: ff, fontSize: '0.65rem', color: '#64748b' }}>{l.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {/* Bubble Grid */}
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, minHeight: 0, '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '10px' } }}>
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => {
          const qStr = String(qNum);
          const correctAns = reviewMode ? reviewData?.answer_key?.[qStr] : null;
          const rowBg = reviewMode ? (answers[qStr] ? (answers[qStr]?.toUpperCase() === correctAns?.toUpperCase() ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)') : 'transparent') : (marked[qStr] ? 'rgba(234,179,8,0.06)' : answers[qStr] ? 'rgba(59,130,246,0.04)' : 'transparent');
          const rowBorder = reviewMode ? (answers[qStr] ? (answers[qStr]?.toUpperCase() === correctAns?.toUpperCase() ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)') : 'transparent') : (marked[qStr] ? 'rgba(234,179,8,0.2)' : answers[qStr] ? 'rgba(59,130,246,0.15)' : 'transparent');
          return (
            <Box key={qNum} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, borderRadius: '10px', bgcolor: rowBg, border: '1px solid', borderColor: rowBorder }}>
              <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.82rem', color: '#64748b', minWidth: 32, textAlign: 'right' }}>Q{qNum}</Typography>
              {options.map(opt => {
                const isSelected = answers[qStr] === opt;
                const isCorrect = reviewMode && correctAns?.toUpperCase() === opt;
                const isWrong = reviewMode && isSelected && !isCorrect;
                let bg = '#fff', clr = '#334155', border = '#d1d5db', shadow = 'none';
                if (reviewMode) {
                  if (isCorrect) { bg = '#22c55e'; clr = '#fff'; border = '#22c55e'; shadow = '0 2px 8px rgba(34,197,94,0.3)'; }
                  else if (isWrong) { bg = '#ef4444'; clr = '#fff'; border = '#ef4444'; shadow = '0 2px 8px rgba(239,68,68,0.3)'; }
                } else if (isSelected) { bg = '#2563eb'; clr = '#fff'; border = '#2563eb'; shadow = '0 2px 8px rgba(37,99,235,0.3)'; }
                return (
                  <Box key={opt} onClick={(e) => { e.preventDefault(); handleAnswer(qStr, opt); }} role="button" tabIndex={0}
                    sx={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: reviewMode ? 'default' : 'pointer', fontFamily: ff, fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.15s ease', userSelect: 'none', bgcolor: bg, color: clr, border: '2px solid', borderColor: border, boxShadow: shadow, ...(!reviewMode && { '&:hover': { borderColor: '#2563eb', transform: 'scale(1.1)' } }) }}>
                    {opt}
                  </Box>
                );
              })}
              {!reviewMode && (
                <Tooltip title={marked[qStr] ? 'Unmark' : 'Mark for Review'} arrow>
                  <IconButton size="small" onClick={() => toggleMark(qStr)} sx={{ ml: 'auto', color: marked[qStr] ? '#eab308' : '#cbd5e1' }}>
                    {marked[qStr] ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
              {reviewMode && correctAns && !answers[qStr] && (
                <Typography sx={{ ml: 'auto', fontFamily: ff, fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>Ans: {correctAns}</Typography>
              )}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
        {reviewMode ? (
          <Button fullWidth onClick={() => navigate('/public/dashboard')} variant="contained"
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px', py: 1.5, background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
            Back to Dashboard
          </Button>
        ) : (
          <Button fullWidth onClick={() => setConfirmOpen(true)} disabled={submitting} variant="contained"
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px', py: 1.5, background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 4px 14px rgba(22,163,74,0.3)', '&:hover': { boxShadow: '0 8px 24px rgba(22,163,74,0.4)' } }}>
            {submitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Submit Exam'}
          </Button>
        )}
      </Box>
    </Box>
  );

  // ── LOADING STATE ──
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ── SUBMITTED / RESULT STATE ──
  if (submitted && result && !reviewMode) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', fontFamily: ff, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Toolbar />
        <Box sx={{ maxWidth: 480, width: '100%', mt: { xs: 3, md: 8 }, px: 2, textAlign: 'center' }}>
          <Box sx={{ bgcolor: '#fff', borderRadius: '20px', p: 5, border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.06)' }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
            <Typography sx={{ fontFamily: ff, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', mb: 1 }}>Exam Submitted!</Typography>
            {result.score !== null && result.score !== undefined ? (
              <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5, bgcolor: 'rgba(34,197,94,0.08)', borderRadius: '16px', px: 4, py: 2, mt: 2, mb: 3 }}>
                <Typography sx={{ fontFamily: ff, fontSize: '2.5rem', fontWeight: 800, color: '#16a34a' }}>{result.score}</Typography>
                <Typography sx={{ fontFamily: ff, fontSize: '1rem', color: '#64748b' }}>/ {result.total_questions}</Typography>
              </Box>
            ) : (
              <Typography sx={{ fontFamily: ff, color: '#64748b', mt: 2, mb: 3 }}>Your answers have been recorded.</Typography>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button onClick={() => loadReview(result.id)} startIcon={<VisibilityIcon />}
                sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px', px: 4, py: 1.5, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
                Review Answers
              </Button>
              <Button onClick={() => navigate('/public/dashboard')}
                sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '12px', px: 4, py: 1, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}>
                Go to Dashboard
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── MAIN EXAM INTERFACE ──
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: ff, bgcolor: '#f8fafc' }}>
      {/* Top Bar */}
      <Box sx={{ height: 56, bgcolor: '#0f172a', display: 'flex', alignItems: 'center', px: 2, justifyContent: 'space-between', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#94a3b8' }}><ArrowBackIcon /></IconButton>
          <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#fff', fontSize: '0.9rem' }} noWrap>
            {reviewMode ? '📋 Review: ' : ''}{content?.title || 'Course Content'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {tabWarning > 0 && !reviewMode && (
            <Chip label={`⚠ ${tabWarning} tab switches`} size="small" sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.72rem' }} />
          )}
          {content?.content_type === 'pdf_exam' && !reviewMode && (
            <Chip icon={<TimerIcon sx={{ fontSize: 16 }} />} label={formatTime(timeLeft)} size="small"
              sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.85rem', bgcolor: timeLeft !== null && timeLeft < 300 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: timeLeft !== null && timeLeft < 300 ? '#fca5a5' : '#93c5fd', '& .MuiChip-icon': { color: 'inherit' } }} />
          )}
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Go Fullscreen'} arrow>
            <IconButton onClick={isFullscreen ? exitFullscreen : enterFullscreen} sx={{ color: '#94a3b8' }}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 0 }}>{error}</Alert>}

      {/* Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Main Content: CBT Question Cards OR PDF Viewer */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {content?.content_type === 'cbt_exam' && cbtQuestions.length > 0 ? (
            /* ── Native CBT Question Card ── */
            (() => {
              const qData = cbtQuestions.find(q => q.order_index === currentQ) || cbtQuestions[currentQ - 1];
              if (!qData) return <Box sx={{ p: 4 }}><Typography>No questions loaded.</Typography></Box>;
              const opts = typeof qData.options_json === 'string' ? JSON.parse(qData.options_json) : qData.options_json;
              const qNum = String(qData.order_index || currentQ);
              const userAns = answers[qNum];
              const correctAns = reviewMode && reviewData ? reviewData.answer_key?.[qNum] : null;
              return (
                <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 4 }, pt: { xs: 2, md: 3 } }}>
                  {/* Question number & mark */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Chip label={`Question ${currentQ} of ${totalQuestions || cbtQuestions.length}`}
                      sx={{ fontFamily: ff, fontWeight: 700, bgcolor: '#f1f5f9', color: '#334155' }} />
                    {!reviewMode && (
                      <Tooltip title={marked[qNum] ? 'Unmark' : 'Mark for Review'}>
                        <IconButton onClick={() => toggleMark(qNum)}>
                          {marked[qNum] ? <BookmarkIcon sx={{ color: '#eab308' }} /> : <BookmarkBorderIcon sx={{ color: '#94a3b8' }} />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  {/* Question text */}
                  <Typography sx={{ fontFamily: ff, fontSize: { xs: '1rem', md: '1.15rem' }, fontWeight: 700, color: '#0f172a', mb: 3, lineHeight: 1.6 }}>
                    {qData.question_text}
                  </Typography>
                  {/* Options */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {['A', 'B', 'C', 'D'].map(letter => {
                      const isSelected = userAns === letter;
                      const isCorrect = correctAns === letter;
                      const isWrong = reviewMode && isSelected && !isCorrect;
                      let borderColor = '#e2e8f0';
                      let bgColor = '#fff';
                      if (reviewMode) {
                        if (isCorrect) { borderColor = '#16a34a'; bgColor = 'rgba(34,197,94,0.06)'; }
                        else if (isWrong) { borderColor = '#ef4444'; bgColor = 'rgba(239,68,68,0.06)'; }
                      } else if (isSelected) {
                        borderColor = '#2563eb'; bgColor = 'rgba(37,99,235,0.06)';
                      }
                      return (
                        <Box key={letter} onClick={() => !reviewMode && handleAnswer(qNum, letter)}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, md: 2 },
                            borderRadius: '14px', border: `2px solid ${borderColor}`, bgcolor: bgColor,
                            cursor: reviewMode ? 'default' : 'pointer', transition: 'all 0.2s',
                            '&:hover': reviewMode ? {} : { borderColor: '#93c5fd', bgcolor: 'rgba(37,99,235,0.03)' },
                          }}>
                          <Radio checked={isSelected} disabled={reviewMode}
                            sx={{ p: 0, color: isSelected ? '#2563eb' : '#cbd5e1', '&.Mui-checked': { color: reviewMode ? (isWrong ? '#ef4444' : '#16a34a') : '#2563eb' } }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                            <Chip label={letter} size="small"
                              sx={{ fontFamily: ff, fontWeight: 800, width: 30, height: 28,
                                bgcolor: isSelected ? (reviewMode ? (isWrong ? '#fef2f2' : '#f0fdf4') : '#eff6ff') : '#f8fafc',
                                color: isSelected ? (reviewMode ? (isWrong ? '#ef4444' : '#16a34a') : '#2563eb') : '#64748b',
                                border: 'none' }} />
                            <Typography sx={{ fontFamily: ff, fontSize: { xs: '0.9rem', md: '0.95rem' }, color: '#334155', fontWeight: isSelected ? 600 : 400 }}>
                              {opts[letter] || ''}
                            </Typography>
                          </Box>
                          {reviewMode && isCorrect && <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 22 }} />}
                        </Box>
                      );
                    })}
                  </Box>
                  {/* Explanation in review mode */}
                  {reviewMode && qData.explanation && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
                        Explanation: {qData.explanation}
                      </Typography>
                    </Box>
                  )}
                  {/* Navigation buttons */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, gap: 2 }}>
                    <Button disabled={currentQ <= 1} onClick={() => setCurrentQ(p => Math.max(1, p - 1))}
                      startIcon={<NavigateBeforeIcon />} variant="outlined"
                      sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '12px', flex: 1 }}>
                      Previous
                    </Button>
                    {currentQ < (totalQuestions || cbtQuestions.length) ? (
                      <Button onClick={() => setCurrentQ(p => p + 1)}
                        endIcon={<NavigateNextIcon />} variant="contained"
                        sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '12px', flex: 1,
                          background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
                        Next
                      </Button>
                    ) : !reviewMode ? (
                      <Button onClick={() => setConfirmOpen(true)} variant="contained" color="success"
                        sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px', flex: 1 }}>
                        Submit Exam
                      </Button>
                    ) : null}
                  </Box>
                </Box>
              );
            })()
          ) : pdfUrl ? (
            <iframe src={`${pdfUrl}#toolbar=0`} title="Exam PDF"
              style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography sx={{ color: '#94a3b8' }}>Content not available</Typography>
            </Box>
          )}
        </Box>

        {/* Desktop: Side Panel */}
        {!isMobile && (content?.content_type === 'pdf_exam' || content?.content_type === 'cbt_exam') && (
          <Box sx={{
            width: 340, borderLeft: '1px solid #e2e8f0', bgcolor: '#f8fafc',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {renderBubbleSheet()}
          </Box>
        )}
      </Box>

      {/* Mobile: Floating Action Button + Drawer */}
      {isMobile && (content?.content_type === 'pdf_exam' || content?.content_type === 'cbt_exam') && (
        <>
          <Fab onClick={() => setDrawerOpen(true)}
            sx={{ position: 'fixed', bottom: 24, right: 24, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', zIndex: 1200, boxShadow: '0 8px 24px rgba(59,130,246,0.4)' }}>
            <Box sx={{ position: 'relative' }}>
              <AssignmentIcon />
              {answeredCount > 0 && (
                <Box sx={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', bgcolor: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>
                  {answeredCount}
                </Box>
              )}
            </Box>
          </Fab>
          <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)}
            PaperProps={{ sx: { borderTopLeftRadius: '20px', borderTopRightRadius: '20px', maxHeight: '80vh' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1.5 }}>
              <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#0f172a' }}>Answer Sheet</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
            </Box>
            {renderBubbleSheet(true)}
          </Drawer>
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>Submit Exam?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: ff, color: '#64748b' }}>
            You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
            {markedCount > 0 && <> (<strong>{markedCount}</strong> marked for review.)</>}
            {answeredCount < totalQuestions && ' Unanswered questions will be marked as unattempted.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="success"
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}>
            Confirm Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
