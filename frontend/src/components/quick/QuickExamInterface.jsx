import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Alert, CircularProgress,
  IconButton, Tooltip, Radio, Dialog, DialogTitle, DialogContent, DialogActions,
  useMediaQuery, useTheme,
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { quickApi } from '../../utils/api';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function QuickExamInterface() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const participantName = location.state?.name || 'Anonymous';
  const examMeta = location.state?.exam || {};

  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(1);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [startTime] = useState(Date.now());

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(marked).filter(Boolean).length;
  const durationMin = examMeta.duration_minutes || 30;

  // Load questions
  useEffect(() => {
    const load = async () => {
      try {
        const res = await quickApi.getQuestions(code);
        setQuestions(res.data.questions || []);
        setTimeLeft((res.data.duration_minutes || durationMin) * 60);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load exam');
      } finally { setLoading(false); }
    };
    load();
  }, [code]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = useCallback((qNum, option) => {
    setAnswers(prev => ({ ...prev, [qNum]: option }));
  }, []);

  const toggleMark = useCallback((qNum) => {
    setMarked(prev => ({ ...prev, [qNum]: !prev[qNum] }));
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const res = await quickApi.submit(code, { name: participantName, answers });
      navigate(`/quick/${code}/results`, { state: { result: res.data.result, questions } });
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'transparent' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && questions.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'transparent', p: 3 }}>
        <Alert severity="error" sx={{ fontFamily: ff, borderRadius: '14px', maxWidth: 450 }}>{error}</Alert>
      </Box>
    );
  }

  const qData = questions.find(q => q.order_index === currentQ) || questions[currentQ - 1];
  const opts = qData ? (typeof qData.options_json === 'string' ? JSON.parse(qData.options_json) : qData.options_json) : {};
  const qNum = String(qData?.order_index || currentQ);
  const userAns = answers[qNum];

  // Question status for nav grid
  const getQColor = (num) => {
    const n = String(num);
    if (marked[n]) return { bg: '#eab308', color: '#fff' };
    if (answers[n]) return { bg: '#22c55e', color: '#fff' };
    return { bg: 'rgba(255,255,255,0.12)', color: '#a9b4dd' };
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <Box sx={{
        px: { xs: 2, md: 3 }, py: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1,
      }}>
        <Box>
          <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' }, color: '#eaf0ff' }}>
            {examMeta.title || 'Quick Exam'}
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#a9b4dd' }}>
            {participantName} · Code: {code}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip icon={<TimerIcon sx={{ fontSize: 16 }} />} label={formatTime(timeLeft)} size="small"
            sx={{ fontFamily: ff, fontWeight: 700,
              bgcolor: timeLeft !== null && timeLeft < 300 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
              color: timeLeft !== null && timeLeft < 300 ? '#ef4444' : '#2563eb',
              '& .MuiChip-icon': { color: 'inherit' } }} />
          <Button variant="contained" size="small" onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)', fontSize: '0.8rem' }}>
            Submit
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 0 }}>{error}</Alert>}

      {/* Main Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Question Card */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {qData ? (
            <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 4 }, pt: { xs: 2, md: 3 } }}>
              {/* Question Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Chip label={`Question ${currentQ} of ${totalQuestions}`}
                  sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.06)', color: '#c7d2fe' }} />
                <Tooltip title={marked[qNum] ? 'Unmark' : 'Mark for Review'}>
                  <IconButton onClick={() => toggleMark(qNum)}>
                    {marked[qNum] ? <BookmarkIcon sx={{ color: '#eab308' }} /> : <BookmarkBorderIcon sx={{ color: '#aeb9e0' }} />}
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Question Text */}
              <Typography sx={{ fontFamily: ff, fontSize: { xs: '1rem', md: '1.15rem' }, fontWeight: 700, color: '#eaf0ff', mb: 3, lineHeight: 1.6 }}>
                {qData.question_text}
              </Typography>

              {/* Options */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {['A', 'B', 'C', 'D'].map(letter => {
                  const isSelected = userAns === letter;
                  return (
                    <Box key={letter} onClick={() => handleAnswer(qNum, letter)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 2, p: { xs: 1.5, md: 2 },
                        borderRadius: '14px',
                        border: `2px solid ${isSelected ? '#2563eb' : 'rgba(255,255,255,0.12)'}`,
                        bgcolor: isSelected ? 'rgba(37,99,235,0.06)' : '#fff',
                        cursor: 'pointer', transition: 'all 0.2s',
                        '&:hover': { borderColor: '#93c5fd', bgcolor: 'rgba(37,99,235,0.03)' },
                      }}>
                      <Radio checked={isSelected}
                        sx={{ p: 0, color: isSelected ? '#2563eb' : '#cbd5e1', '&.Mui-checked': { color: '#cfe0ff' } }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                        <Chip label={letter} size="small"
                          sx={{ fontFamily: ff, fontWeight: 800, width: 30, height: 28,
                            bgcolor: isSelected ? 'transparent' : '#f8fafc',
                            color: isSelected ? '#2563eb' : '#64748b',
                            border: 'none' }} />
                        <Typography sx={{ fontFamily: ff, fontSize: { xs: '0.9rem', md: '0.95rem' }, color: '#c7d2fe', fontWeight: isSelected ? 600 : 400 }}>
                          {opts[letter] || ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, gap: 2 }}>
                <Button disabled={currentQ <= 1} onClick={() => setCurrentQ(p => Math.max(1, p - 1))}
                  startIcon={<NavigateBeforeIcon />} variant="outlined"
                  sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '12px', flex: 1 }}>
                  Previous
                </Button>
                {currentQ < totalQuestions ? (
                  <Button onClick={() => setCurrentQ(p => p + 1)}
                    endIcon={<NavigateNextIcon />} variant="contained"
                    sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '12px', flex: 1,
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmOpen(true)} variant="contained" color="success"
                    sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px', flex: 1 }}>
                    Submit Exam
                  </Button>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography sx={{ color: '#aeb9e0' }}>No questions loaded</Typography>
            </Box>
          )}
        </Box>

        {/* Desktop: Side Panel */}
        {!isMobile && (
          <Box sx={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.12)', bgcolor: 'rgba(255,255,255,0.05)', overflow: 'auto', p: 2 }}>
            <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.9rem', color: '#eaf0ff', mb: 1 }}>
              Question Map
            </Typography>
            <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#a9b4dd', mb: 1.5 }}>
              {answeredCount}/{totalQuestions} answered{markedCount > 0 ? ` · ${markedCount} marked` : ''}
            </Typography>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.12)', overflow: 'hidden', mb: 2 }}>
              <Box sx={{ height: '100%', borderRadius: 3, width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #2563eb, #3b82f6)', transition: 'width 0.3s ease' }} />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
              {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(num => {
                const sc = getQColor(num);
                return (
                  <Box key={num} onClick={() => setCurrentQ(num)}
                    sx={{ width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: 700, fontFamily: ff,
                      cursor: 'pointer', outline: currentQ === num ? '2px solid #2563eb' : 'none', transition: 'all 0.15s' }}>
                    {num}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap' }}>
              {[{ label: 'Answered', bg: '#22c55e' }, { label: 'Marked', bg: '#eab308' }, { label: 'Unanswered', bg: 'rgba(255,255,255,0.12)' }].map(l => (
                <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: l.bg }} />
                  <Typography sx={{ fontFamily: ff, fontSize: '0.65rem', color: '#aeb9e0' }}>{l.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>Submit Exam?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: ff, color: '#a9b4dd' }}>
            You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
            {markedCount > 0 && <> (<strong>{markedCount}</strong> marked for review.)</>}
            {answeredCount < totalQuestions && ' Unanswered questions will be marked as unattempted.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="success" disabled={submitting}
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}>
            {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Confirm Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
