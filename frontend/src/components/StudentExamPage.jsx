import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Alert, CircularProgress, Paper, Typography, Button, Container, Stack, Divider
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import { requestFullscreen, isFullscreenSupported, isIOS } from '../utils/fullscreen';

/**
 * Pre-exam readiness gate.
 *
 * This page exists to own the user gesture. Fullscreen can only be requested
 * from a real click — Firefox and Safari reject a call made from an effect —
 * so the exam is entered from a button here rather than auto-started.
 *
 * It deliberately does NOT call /start. The questions page already does, and
 * doing it twice cost every student an extra request at the exact moment a
 * whole cohort starts at once.
 */
export default function StudentExamPage() {
  const { examId } = useParams();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [starting, setStarting] = useState(false);

  const fullscreenAvailable = isFullscreenSupported() && !isIOS();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await api.get(`/student/exams/${examId}/can_start`, {
          headers: { auth_token: authToken },
        });
        if (cancelled) return;

        const { assigned, within_window, already_submitted } = res.data;
        if (!assigned) throw new Error('You are not assigned to this exam.');
        if (already_submitted) {
          navigate(`/exam/${examId}/results`, { replace: true });
          return;
        }
        if (!within_window) throw new Error('This exam is not currently open.');

        setExam(res.data.exam);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || err.message || 'Failed to load exam');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [examId, authToken, navigate]);

  // Must stay a direct click handler — moving this into an effect is exactly
  // the bug that made fullscreen silently fail outside Chrome.
  const handleStart = useCallback(async () => {
    setStarting(true);
    if (fullscreenAvailable) {
      // A refusal is not fatal. The exam runs either way and the absence is
      // recorded; locking a student out over a browser quirk is worse than
      // the integrity gap it would close.
      await requestFullscreen();
    }
    navigate(`/exams/${examId}/questions`);
  }, [examId, navigate, fullscreenAvailable]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={4} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>

          {loading ? (
            <>
              <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Checking your exam…
              </Typography>
            </>
          ) : error ? (
            <>
              <WarningAmberIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h5" fontWeight={700} color="error" gutterBottom>
                Unable to Start Exam
              </Typography>
              <Alert severity="error" sx={{ my: 3 }}>{error}</Alert>
              <Button variant="outlined" onClick={() => navigate('/student')}>
                Return to Dashboard
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h5" fontWeight={800} gutterBottom>
                {exam?.title}
              </Typography>

              {exam?.duration_minutes && (
                <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 3, color: 'text.secondary' }}>
                  <AccessTimeIcon fontSize="small" />
                  <Typography variant="body2">
                    {exam.duration_minutes} minutes
                  </Typography>
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.25} sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <InfoOutlinedIcon fontSize="small" /> Before you begin
                </Typography>
                {[
                  'Every answer is saved automatically as you pick it.',
                  'The timer keeps running if you leave — it does not pause.',
                  'Leaving the exam tab or window is recorded.',
                  fullscreenAvailable
                    ? 'The exam opens in fullscreen. Leaving fullscreen is recorded.'
                    : 'Your browser does not support fullscreen — the exam will run in a normal window.',
                  'If your device or connection fails, log back in and continue where you left off.',
                ].map((line) => (
                  <Typography key={line} variant="body2" color="text.secondary" sx={{ pl: 3 }}>
                    • {line}
                  </Typography>
                ))}
              </Stack>

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<PlayArrowIcon />}
                onClick={handleStart}
                disabled={starting}
                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, py: 1.25 }}
              >
                {starting ? 'Opening…' : 'Start Exam'}
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/student')}
                sx={{ mt: 1.5, textTransform: 'none' }}
              >
                Not now — back to dashboard
              </Button>
            </>
          )}

        </Paper>
      </Container>
    </Box>
  );
}
