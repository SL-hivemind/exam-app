import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Container,
  Grid, Drawer, IconButton, useTheme, useMediaQuery, Divider, Fab,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { AccessTime as TimerIcon, Apps as AppsIcon, Close as CloseIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { publicApi } from '../../utils/api';
import MatrixFormatter from '../../utils/MatrixFormatter';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PublicMockInterface() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const courseTags = params.get('course_tags') || '';
  const isJee = courseTags.toUpperCase().includes('JEE');
  const isNeet = courseTags.toUpperCase().includes('NEET');
  
  // Base timer on Mock type (180 mins = 10800s for NEET/JEE, otherwise 60 mins)
  const defaultDuration = (isJee || isNeet) ? 10800 : 3600;

  // --- STATE ---
  const [examId, setExamId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(defaultDuration);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  
  // Pagination & Navigation
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 1;
  const [visitedPages, setVisitedPages] = useState(new Set([1]));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [reviewMarked, setReviewMarked] = useState(new Set());
  const [mockTitle, setMockTitle] = useState('Mock Test');
  
  useEffect(() => {
    setVisitedPages(prev => new Set(prev).add(currentPage));
  }, [currentPage]);

  const timerRef = useRef(null);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const startMock = async () => {
      setLoading(true);
      try {
        const res = await publicApi.practiceStart({
          mode: 'mock',
          course_tags: courseTags,
          count: isNeet ? 180 : (isJee ? 90 : 30)
        });
        
        setExamId(res.data.attempt_id);
        setQuestions(res.data.questions || []);
        // Duration + title are data-driven per exam (backend mock blueprint),
        // falling back to the client default for older responses.
        if (res.data.duration_minutes) setTimeLeft(res.data.duration_minutes * 60);
        if (res.data.title) setMockTitle(res.data.title);

        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleTimeout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to generate mock test.');
      } finally {
        setLoading(false);
      }
    };
    startMock();
    return () => clearInterval(timerRef.current);
  }, [courseTags, isJee, isNeet]);

  const handleTimeout = () => {
      setConfirmOpen(false);
      handleSubmitMcqAnswers();
  };

  const handleSubmitMcqAnswers = async () => {
    if (submitted) return;
    setSubmitLoading(true);
    setError('');
    
    try {
      const res = await publicApi.practiceSubmit(examId, mcqAnswers);
      clearInterval(timerRef.current);
      setSubmitted(true);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleMcqAnswerChange = (mcqId, answer) => {
    if (submitted) return;
    setMcqAnswers(prev => ({ ...prev, [mcqId]: answer }));
  };

  // Multi-select (MSQ) toggles a letter within a sorted comma list, e.g. 'A,C'.
  const toggleMsqAnswer = (mcqId, letter) => {
    if (submitted) return;
    setMcqAnswers(prev => {
      const set = new Set((prev[mcqId] || '').split(',').map(s => s.trim()).filter(Boolean));
      if (set.has(letter)) set.delete(letter); else set.add(letter);
      const joined = [...set].sort().join(',');
      const next = { ...prev };
      if (joined) next[mcqId] = joined; else delete next[mcqId];
      return next;
    });
  };

  const handleOptionClick = (q, val) => {
    if (q.question_format === 'msq') toggleMsqAnswer(q.id, val);
    else handleMcqAnswerChange(q.id, val);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
  };

  if (loading) return <Box p={5} display="flex" justifyContent="center" height="100vh" alignItems="center"><CircularProgress /></Box>;
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/public/dashboard')} sx={{ mt: 2 }} variant="contained">Back to Dashboard</Button>
      </Container>
    );
  }

  // --- RESULT VIEW ---
  if (submitted && result) {
    const pct = Math.round((result.score / result.total) * 100) || 0;
    return (
      <Container maxWidth="md" sx={{ py: 5, fontFamily: ff }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 4, background: 'linear-gradient(135deg, rgba(47,107,255,0.05), rgba(246,137,20,0.05))', border: '1px solid rgba(0,0,0,0.08)', mb: 4 }}>
          <Typography variant="h3" fontWeight={800} gutterBottom sx={{ color: '#2f6bff' }}>{result.score} / {result.total}</Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>Mock Test Completed ({pct}%)</Typography>
          <Button variant="contained" onClick={() => navigate('/public/dashboard')} sx={{ mt: 2, borderRadius: 2, px: 4 }}>Back to Dashboard</Button>
        </Paper>
        <Typography variant="h5" fontWeight={700} mb={3}>Review Answers</Typography>
        <Box display="flex" flexDirection="column" gap={3}>
          {(result.results || []).map((r, i) => (
            <Paper key={i} elevation={1} sx={{ p: 3, borderRadius: 3, borderLeft: `6px solid ${r.is_correct ? '#34d399' : '#fb7185'}` }}>
              <Typography fontWeight={600} mb={1}>Q{i+1}. <MatrixFormatter text={r.text} /></Typography>
              <Typography variant="body2" color="text.secondary" mb={0.5}>Your Answer: <strong style={{ color: r.is_correct ? '#10b981' : '#f43f5e' }}>{r.user_answer || 'Skipped'}</strong></Typography>
              {!r.is_correct && <Typography variant="body2" color="text.secondary">Correct Answer: <strong style={{ color: '#10b981' }}>{r.correct_answer}</strong></Typography>}
              {r.explanation && <Typography variant="body2" mt={1} p={1.5} bgcolor="rgba(0,0,0,0.03)" borderRadius={2}>{r.explanation}</Typography>}
            </Paper>
          ))}
        </Box>
      </Container>
    );
  }

  // --- EXAM VIEW ---
  const indexOfLastQ = currentPage * questionsPerPage;
  const indexOfFirstQ = indexOfLastQ - questionsPerPage;
  const currentQuestions = questions.slice(indexOfFirstQ, indexOfLastQ);
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const answeredCount = Object.keys(mcqAnswers).length;

  const renderQuestionPalette = () => {
    // Build subject groups preserving order of first appearance
    const subjectOrder = [];
    const subjectGroups = {};
    questions.forEach((q, idx) => {
      let subj = q.subject ? q.subject.trim() : 'General';
      if (subj.toLowerCase().includes('math')) {
        subj = 'Mathematics';
      }
      if (!subjectGroups[subj]) { subjectGroups[subj] = []; subjectOrder.push(subj); }
      subjectGroups[subj].push({ q, idx });
    });
    const hasSubjects = subjectOrder.length > 1;

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(11,16,42,0.97)', backdropFilter: 'blur(14px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#eaf0ff' }}>Question Navigator</Typography>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.12)', color: '#22c55e', fontFamily: ff, fontWeight: 700, fontSize: '0.72rem' }}>{answeredCount}/{questions.length}</Box>
          </Box>
          {/* Progress bar */}
          <Box sx={{ height: 4, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', borderRadius: 3, width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #2563eb, #22c55e)', transition: 'width 0.3s ease' }} />
          </Box>
        </Box>

        {/* Subject filter tabs */}
        {hasSubjects && (
          <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
            <Box
              onClick={() => setActiveSubject(null)}
              sx={{ px: 1.4, py: 0.5, borderRadius: '20px', cursor: 'pointer', fontFamily: ff, fontWeight: 700, fontSize: '0.7rem', transition: 'all 0.15s',
                bgcolor: activeSubject === null ? '#2563eb' : 'rgba(255,255,255,0.07)',
                color: activeSubject === null ? '#fff' : '#a9b4dd',
                '&:hover': { bgcolor: activeSubject === null ? '#1d4ed8' : 'rgba(255,255,255,0.12)' }
              }}>
              All
            </Box>
            {subjectOrder.map(subj => {
              const grp = subjectGroups[subj];
              const done = grp.filter(({ q }) => mcqAnswers[q.id] !== undefined).length;
              const isActive = activeSubject === subj;
              return (
                <Box key={subj} onClick={() => setActiveSubject(isActive ? null : subj)}
                  sx={{ px: 1.4, py: 0.5, borderRadius: '20px', cursor: 'pointer', fontFamily: ff, fontWeight: 700, fontSize: '0.7rem', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 0.6,
                    bgcolor: isActive ? '#2563eb' : 'rgba(255,255,255,0.07)',
                    color: isActive ? '#fff' : '#a9b4dd',
                    '&:hover': { bgcolor: isActive ? '#1d4ed8' : 'rgba(255,255,255,0.12)' }
                  }}>
                  {subj.length > 8 ? subj.slice(0, 7) + '\u2026' : subj}
                  <Box sx={{ px: 0.8, py: 0.1, borderRadius: '10px', bgcolor: done > 0 ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.12)', color: done > 0 ? '#22c55e' : '#6b7db3', fontSize: '0.62rem', fontWeight: 800 }}>
                    {done}/{grp.length}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Question grid grouped by subject */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 10 } }}>
          {(activeSubject ? [activeSubject] : subjectOrder).map(subj => (
            <Box key={subj} sx={{ mb: 2.5 }}>
              {hasSubjects && (
                <Typography sx={{ fontFamily: ff, fontSize: '0.68rem', fontWeight: 700, color: '#6b7db3', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                  {subj}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {subjectGroups[subj].map(({ q, idx }) => {
                  const qPage = Math.ceil((idx + 1) / questionsPerPage);
                  const isAttempted = mcqAnswers[q.id] !== undefined;
                  const isVisited = visitedPages.has(qPage) && !isAttempted;
                  const isCurrent = currentPage === qPage;
                  const isReview = reviewMarked.has(q.id);
                  let bg = 'rgba(255,255,255,0.07)', clr = '#a9b4dd';
                  if (isAttempted) { bg = '#22c55e'; clr = '#fff'; }
                  else if (isVisited) { bg = '#f59e0b'; clr = '#fff'; }
                  if (isReview) { bg = '#9333ea'; clr = '#fff'; }
                  return (
                    <Box key={q.id} onClick={() => { setCurrentPage(qPage); if (isMobile) setMobileOpen(false); }}
                      sx={{ width: 36, height: 36, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bg, color: clr, fontFamily: ff, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', outline: isCurrent ? '2px solid #2563eb' : 'none', outlineOffset: 2, transition: 'all 0.15s', '&:hover': { opacity: 0.85, transform: 'scale(1.08)' } }}>
                      {idx + 1}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Legend */}
        <Box sx={{ px: 2, pb: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 0.9, flexShrink: 0 }}>
          {[{ color: '#22c55e', label: 'Attempted' }, { color: '#f59e0b', label: 'Visited (Not Answered)' }, { color: '#9333ea', label: 'Marked for Review' }, { color: 'rgba(255,255,255,0.07)', label: 'Not Visited', border: '1px solid rgba(255,255,255,0.12)' }].map(l => (
            <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: l.color, border: l.border || 'none', flexShrink: 0 }} />
              <Typography sx={{ fontFamily: ff, fontSize: '0.7rem', color: '#a9b4dd' }}>{l.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(7,11,26,0.98)', fontFamily: ff, pb: 10 }}>
      {/* HEADER BAR */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, borderRadius: 0, bgcolor: 'rgba(9,14,42,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/public/dashboard')}><ArrowBackIcon /></IconButton>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontFamily: ff, color: '#eaf0ff' }}>{mockTitle}</Typography>
            <Typography variant="caption" fontFamily={ff} sx={{ color: '#a9b4dd' }}>
              Attempted: {answeredCount} / {questions.length}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: timeLeft < 300 ? 'rgba(239,68,68,0.12)' : 'rgba(37,99,235,0.12)', border: `1px solid ${timeLeft < 300 ? 'rgba(239,68,68,0.3)' : 'rgba(37,99,235,0.3)'}`, px: { xs: 1.5, sm: 2 }, py: 1, borderRadius: 3 }}>
            <TimerIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: timeLeft < 300 ? '#ef4444' : '#3b82f6' }} />
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontFamily: ff, minWidth: '70px', textAlign: 'center', color: timeLeft < 300 ? '#ef4444' : '#3b82f6' }}>
              {formatTime(timeLeft)}
            </Typography>
          </Box>
          
          <Button 
            variant="contained" 
            color="success" 
            onClick={() => setConfirmOpen(true)}
            disabled={submitLoading}
            size={isMobile ? "small" : "medium"}
            sx={{ borderRadius: 3, px: 3, fontFamily: ff, fontWeight: 700 }}
          >
            {submitLoading ? "Wait..." : "Submit"}
          </Button>
        </Box>
      </Paper>

      {isMobile && (
        <Fab color="primary" onClick={() => setMobileOpen(true)} sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1100 }}>
          <AppsIcon />
        </Fab>
      )}

      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'flex-start' }}>
          {/* MAIN QUESTIONS AREA */}
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            {currentQuestions.map((q, idx) => (
              <Box key={q.id} sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, p: { xs: 2.5, sm: 3.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                  <Box sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: 'rgba(37,99,235,0.12)', color: '#93c5fd', fontFamily: ff, fontWeight: 700, fontSize: '0.75rem' }}>
                    Question {indexOfFirstQ + idx + 1} of {questions.length}
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#6b7db3' }}>{q.subject || 'General'}</Typography>
                    {(q.question_format === 'msq' || q.question_format === 'nat' || q.negative_marks > 0) && (
                      <Typography sx={{ fontFamily: ff, fontSize: '0.68rem', color: '#93c5fd', mt: 0.3 }}>
                        {q.question_format === 'msq' && 'Multiple correct • '}
                        {q.question_format === 'nat' && 'Numerical • '}
                        +{q.marks || 1}{q.negative_marks > 0 ? ` / -${q.negative_marks}` : ''}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {q.image_path && (
                  <Box sx={{ my: 2.5, display: 'flex' }}>
                    <img src={q.image_path} alt="Question" style={{ maxHeight: 280, maxWidth: '100%', borderRadius: 10 }} />
                  </Box>
                )}

                <Typography sx={{ mb: 3.5, whiteSpace: 'pre-wrap', fontSize: { xs: '1rem', md: '1.08rem' }, lineHeight: 1.7, fontFamily: ff, color: '#eaf0ff', fontWeight: 500 }}>
                  <MatrixFormatter text={q.text} />
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {q.question_format === 'nat' ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      value={mcqAnswers[q.id] || ''}
                      onChange={(e) => handleMcqAnswerChange(q.id, e.target.value)}
                      placeholder="Type your numerical answer"
                      style={{ width: '100%', maxWidth: 340, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.12)', color: '#eaf0ff', fontFamily: ff, fontSize: '1rem', outline: 'none' }}
                    />
                  ) : (
                    ['a','b','c','d','e'].map((opt) => {
                      if (!q[`option_${opt}`]) return null;
                      const val = opt.toUpperCase();
                      const isMsq = q.question_format === 'msq';
                      const selected = (mcqAnswers[q.id] || '').split(',').map(s => s.trim());
                      const isSelected = isMsq ? selected.includes(val) : mcqAnswers[q.id] === val;
                      return (
                        <Box key={opt} onClick={() => handleOptionClick(q, val)}
                          sx={{ display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, cursor: 'pointer', transition: 'all 0.2s', border: `2px solid ${isSelected ? '#2563eb' : 'rgba(255,255,255,0.08)'}`, bgcolor: isSelected ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.03)', '&:hover': { borderColor: isSelected ? '#2563eb' : 'rgba(37,99,235,0.35)' } }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: isMsq ? '8px' : '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: ff, fontWeight: 800, fontSize: '0.8rem', bgcolor: isSelected ? '#2563eb' : 'rgba(255,255,255,0.07)', color: isSelected ? '#fff' : '#a9b4dd', transition: 'all 0.2s' }}>{val}</Box>
                          <Typography sx={{ fontFamily: ff, fontSize: '0.95rem', color: isSelected ? '#eaf0ff' : '#a9b4dd', fontWeight: isSelected ? 600 : 400, flex: 1, whiteSpace: 'pre-wrap' }}>
                            <MatrixFormatter text={q[`option_${opt}`]} />
                          </Typography>
                          {isSelected && <Box sx={{ width: 10, height: 10, borderRadius: isMsq ? '3px' : '50%', bgcolor: '#2563eb', flexShrink: 0 }} />}
                        </Box>
                      );
                    })
                  )}
                </Box>
                
                {/* ACTION BUTTONS (CLEAR & REVIEW) */}
                <Box sx={{ display: 'flex', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
                  <Button 
                    variant="outlined"
                    onClick={() => {
                       setMcqAnswers(prev => { const next = {...prev}; delete next[q.id]; return next; });
                    }}
                    sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 2, color: '#a9b4dd', borderColor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: '#a9b4dd' } }}
                  >
                    Clear Response
                  </Button>
                  <Button 
                    variant="outlined"
                    onClick={() => {
                       setReviewMarked(prev => {
                          const next = new Set(prev);
                          if (next.has(q.id)) next.delete(q.id);
                          else next.add(q.id);
                          return next;
                       });
                    }}
                    sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', borderRadius: 2, 
                          color: reviewMarked.has(q.id) ? '#d8b4fe' : '#a9b4dd', 
                          borderColor: reviewMarked.has(q.id) ? '#9333ea' : 'rgba(255,255,255,0.15)', 
                          bgcolor: reviewMarked.has(q.id) ? 'rgba(147,51,234,0.1)' : 'transparent',
                          '&:hover': { bgcolor: reviewMarked.has(q.id) ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.05)', borderColor: reviewMarked.has(q.id) ? '#a855f7' : '#a9b4dd' } 
                    }}
                  >
                    {reviewMarked.has(q.id) ? 'Unmark Review' : 'Mark for Review'}
                  </Button>
                </Box>
              </Box>
            ))}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2, mb: 6 }}>
                <Button variant="outlined" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} sx={{ borderRadius: 2.5, px: 3, fontFamily: ff, fontWeight: 700, flex: 1, borderColor: 'rgba(255,255,255,0.12)', color: '#a9b4dd', '&:not(:disabled):hover': { borderColor: '#3b82f6', color: '#eaf0ff' } }}>
                  Previous
                </Button>
                <Typography sx={{ alignSelf: 'center', fontFamily: ff, fontSize: '0.8rem', color: '#6b7db3', whiteSpace: 'nowrap' }}>{currentPage} / {totalPages}</Typography>
                <Button variant="contained" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} sx={{ borderRadius: 2.5, px: 4, fontFamily: ff, fontWeight: 700, flex: 1, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
                  Next Question
                </Button>
              </Box>
            )}
          </Box>

          {/* DESKTOP SIDEBAR */}
          {!isMobile && (
            <Box sx={{ width: { md: 300, lg: 320 }, flexShrink: 0, alignSelf: 'stretch' }}>
              {renderQuestionPalette()}
            </Box>
          )}
        </Box>
      </Container>

      {/* MOBILE DRAWER */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: { xs: 280, sm: 320 }, bgcolor: 'rgba(11,16,42,0.97)', border: 'none' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#eaf0ff' }}>Questions</Typography>
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#a9b4dd' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderQuestionPalette()}</Box>
      </Drawer>

      {/* SUBMIT DIALOG */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 1, bgcolor: '#0f1629', border: '1px solid rgba(255,255,255,0.08)', minWidth: 320 } }}>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 800, color: '#eaf0ff' }}>Submit Mock Test?</DialogTitle>
        <DialogContent sx={{ fontFamily: ff }}>
          <Typography sx={{ fontFamily: ff, color: '#a9b4dd' }}>You have answered <strong style={{ color: '#eaf0ff' }}>{answeredCount}</strong> out of <strong style={{ color: '#eaf0ff' }}>{questions.length}</strong> questions.{answeredCount < questions.length && <><br /><span style={{ color: '#f59e0b' }}>⚠ {questions.length - answeredCount} unanswered.</span></>}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', color: '#a9b4dd', borderRadius: 2 }}>Cancel</Button>
          <Button onClick={() => { setConfirmOpen(false); handleSubmitMcqAnswers(); }} variant="contained" sx={{ borderRadius: 2, px: 3, fontFamily: ff, fontWeight: 700, textTransform: 'none', background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>
            Yes, Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
