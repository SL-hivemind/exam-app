import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Toolbar, Alert, CircularProgress,
  Drawer, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, useMediaQuery, useTheme, Fab,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TimerIcon from '@mui/icons-material/Timer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { portalApi } from '../../utils/api';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PortalExamInterface() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [content, setContent] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
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

  // Load content and start attempt
  useEffect(() => {
    const init = async () => {
      try {
        // Start exam
        const startRes = await portalApi.startExam(contentId);
        const attemptData = startRes.data.attempt;
        setAttempt(attemptData);
        setTotalQuestions(startRes.data.total_questions || 0);
        setDurationMinutes(startRes.data.duration_minutes || 60);

        if (attemptData.submitted_at) {
          setSubmitted(true);
          setResult(attemptData);
        }

        // Fetch PDF blob
        const pdfRes = await portalApi.getContentFile(contentId);
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
        setPdfUrl(URL.createObjectURL(blob));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load exam');
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

    const startMs = new Date(attempt.start_time).getTime();
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
    setAnswers(prev => ({ ...prev, [qNum]: option }));
  }, []);

  const handleSubmit = async () => {
    if (!attempt || submitted) return;
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const res = await portalApi.submitExam(attempt.id, answers);
      setResult(res.data.attempt);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const options = ['A', 'B', 'C', 'D'];

  // ── BUBBLE SHEET COMPONENT ──
  const BubbleSheet = ({ inDrawer = false }) => (
    <Box sx={{
      p: 2, height: '100%', display: 'flex', flexDirection: 'column',
      bgcolor: inDrawer ? '#fff' : '#f8fafc',
    }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 2, pb: 2, borderBottom: '1px solid #e2e8f0',
      }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
          Answer Sheet
        </Typography>
        <Chip icon={<TimerIcon sx={{ fontSize: 16 }} />}
          label={formatTime(timeLeft)}
          size="small"
          sx={{
            fontFamily: ff, fontWeight: 700,
            bgcolor: timeLeft !== null && timeLeft < 300 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
            color: timeLeft !== null && timeLeft < 300 ? '#ef4444' : '#2563eb',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>

      {/* Progress */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#64748b', mb: 0.5 }}>
          Answered {answeredCount} of {totalQuestions}
        </Typography>
        <Box sx={{
          height: 6, borderRadius: 3, bgcolor: '#e2e8f0', overflow: 'hidden',
        }}>
          <Box sx={{
            height: '100%', borderRadius: 3,
            width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
            background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
            transition: 'width 0.3s ease',
          }} />
        </Box>
      </Box>

      {/* Bubble Grid */}
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => (
          <Box key={qNum} sx={{
            display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
            p: 1, borderRadius: '10px',
            bgcolor: answers[qNum] ? 'rgba(59,130,246,0.04)' : 'transparent',
            border: '1px solid',
            borderColor: answers[qNum] ? 'rgba(59,130,246,0.15)' : 'transparent',
          }}>
            <Typography sx={{
              fontFamily: ff, fontWeight: 700, fontSize: '0.82rem',
              color: '#64748b', minWidth: 32, textAlign: 'right',
            }}>
              Q{qNum}
            </Typography>
            {options.map(opt => (
              <Box
                key={opt}
                onClick={() => handleAnswer(String(qNum), opt)}
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontFamily: ff, fontWeight: 700, fontSize: '0.82rem',
                  transition: 'all 0.2s ease',
                  bgcolor: answers[String(qNum)] === opt ? '#2563eb' : '#fff',
                  color: answers[String(qNum)] === opt ? '#fff' : '#334155',
                  border: '2px solid',
                  borderColor: answers[String(qNum)] === opt ? '#2563eb' : '#d1d5db',
                  boxShadow: answers[String(qNum)] === opt ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                  '&:hover': {
                    borderColor: '#2563eb',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {opt}
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      {/* Submit */}
      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button fullWidth onClick={() => setConfirmOpen(true)} disabled={submitting}
          variant="contained" sx={{
            fontFamily: ff, fontWeight: 700, textTransform: 'none',
            borderRadius: '12px', py: 1.5,
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
            '&:hover': { boxShadow: '0 8px 24px rgba(22,163,74,0.4)' },
          }}>
          {submitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Submit Exam'}
        </Button>
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
  if (submitted && result) {
    return (
      <Box sx={{
        minHeight: '100vh', bgcolor: '#f8fafc', fontFamily: ff,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <Toolbar />
        <Box sx={{
          maxWidth: 480, width: '100%', mt: { xs: 3, md: 8 }, px: 2, textAlign: 'center',
        }}>
          <Box sx={{
            bgcolor: '#fff', borderRadius: '20px', p: 5,
            border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.06)',
          }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
            <Typography sx={{ fontFamily: ff, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', mb: 1 }}>
              Exam Submitted!
            </Typography>
            {result.score !== null && result.score !== undefined ? (
              <Box sx={{
                display: 'inline-flex', alignItems: 'baseline', gap: 0.5,
                bgcolor: 'rgba(34,197,94,0.08)', borderRadius: '16px', px: 4, py: 2, mt: 2, mb: 3,
              }}>
                <Typography sx={{ fontFamily: ff, fontSize: '2.5rem', fontWeight: 800, color: '#16a34a' }}>
                  {result.score}
                </Typography>
                <Typography sx={{ fontFamily: ff, fontSize: '1rem', color: '#64748b' }}>
                  / {result.total_questions}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontFamily: ff, color: '#64748b', mt: 2, mb: 3 }}>
                Your answers have been recorded.
              </Typography>
            )}
            <Button onClick={() => navigate('/portal/dashboard')} sx={{
              fontFamily: ff, fontWeight: 700, textTransform: 'none',
              borderRadius: '12px', px: 4, py: 1.5,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#fff', boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
              '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)' },
            }}>
              Go to Dashboard
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── MAIN EXAM INTERFACE ──
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: ff, bgcolor: '#f8fafc' }}>
      {/* Top Bar */}
      <Box sx={{
        height: 56, bgcolor: '#0f172a', display: 'flex', alignItems: 'center',
        px: 2, justifyContent: 'space-between', flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: '#94a3b8' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#fff', fontSize: '0.9rem' }} noWrap>
            {content?.title || 'Exam'}
          </Typography>
        </Box>
        <Chip icon={<TimerIcon sx={{ fontSize: 16 }} />}
          label={formatTime(timeLeft)} size="small"
          sx={{
            fontFamily: ff, fontWeight: 700, fontSize: '0.85rem',
            bgcolor: timeLeft !== null && timeLeft < 300 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
            color: timeLeft !== null && timeLeft < 300 ? '#fca5a5' : '#93c5fd',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 0 }}>{error}</Alert>}

      {/* Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* PDF Viewer */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0`}
              title="Exam PDF"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography sx={{ color: '#94a3b8' }}>PDF not available</Typography>
            </Box>
          )}
        </Box>

        {/* Desktop: Side Panel */}
        {!isMobile && (
          <Box sx={{
            width: 340, borderLeft: '1px solid #e2e8f0', bgcolor: '#f8fafc',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <BubbleSheet />
          </Box>
        )}
      </Box>

      {/* Mobile: Floating Action Button + Drawer */}
      {isMobile && (
        <>
          <Fab
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: 'fixed', bottom: 24, right: 24,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#fff', zIndex: 1200,
              boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
              '&:hover': { boxShadow: '0 12px 32px rgba(59,130,246,0.5)' },
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <AssignmentIcon />
              {answeredCount > 0 && (
                <Box sx={{
                  position: 'absolute', top: -8, right: -8,
                  width: 20, height: 20, borderRadius: '50%',
                  bgcolor: '#22c55e', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800,
                }}>
                  {answeredCount}
                </Box>
              )}
            </Box>
          </Fab>

          <Drawer
            anchor="bottom"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
                maxHeight: '80vh',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1.5 }}>
              <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#0f172a' }}>Answer Sheet</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
            </Box>
            <BubbleSheet inDrawer />
          </Drawer>
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>Submit Exam?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: ff, color: '#64748b' }}>
            You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
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
