import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Alert, AlertTitle, CircularProgress, Paper, Typography, Button,
  Container, Stack, Divider, Chip,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VideocamIcon from '@mui/icons-material/Videocam';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import useFaceMonitor from '../hooks/useFaceMonitor';
import { requestFullscreen, isFullscreenSupported, isIOS } from '../utils/fullscreen';
import { probeCameraPermission, cameraApiUnavailable } from '../utils/camera';
import examSession from '../utils/examSession';
import { EVENT } from '../utils/proctorEvents';

/**
 * Pre-exam readiness gate.
 *
 * This page exists to own the user gestures, and to be the one place in the
 * flow where nothing is being monitored yet.
 *
 * The ordering it enforces is the whole point. Previously the exam page
 * attached every violation listener and then fired getUserMedia from an
 * effect: Chrome dropped fullscreen to render the permission bubble and stole
 * focus behind it, so clicking "Allow" cost the student two of their three
 * violations. Here the camera prompt resolves while still windowed and
 * unmonitored, and fullscreen happens afterwards on a separate click.
 *
 * Two clicks, not one, because `await getUserMedia()` blocks on human reading
 * time and transient user activation expires after ~5s — a requestFullscreen()
 * on the far side of that await is rejected, silently, which is the bug this
 * replaces.
 *
 * It also owns POST /start, so the exam clock begins after permission
 * negotiation rather than before it.
 */
export default function StudentExamPage() {
  const { examId } = useParams();
  const { authToken, user } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [starting, setStarting] = useState(false);

  // Mirrors examSession so the UI re-renders; the session stays the source of
  // truth because the stream has to outlive this component.
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraReason, setCameraReason] = useState(null);
  const [asking, setAsking] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');

  const videoRef = useRef(null);

  const fullscreenAvailable = isFullscreenSupported() && !isIOS();
  const apiMissing = cameraApiUnavailable();
  const cameraRequired = policy?.cameraRequired === true;
  const cameraReady = cameraStatus === 'active';

  // Calibration happens HERE, not on the exam page.
  //
  // Two reasons, both of which were costing students marks. It used to run as
  // a blocking modal after the clock had already started, so 3.5s+ of the
  // exam went on it. And it ran with no self-view: "sit normally" is not an
  // instruction anyone can follow without a mirror, and a bad calibration is
  // upstream of every false flag for the rest of the paper.
  const face = useFaceMonitor({
    active: cameraReady,
    enabled: cameraReady && policy?.facePresence === true,
    stream: examSession.stream,
    policy,
    previewRef: videoRef,
    onEvent: (type, extra) => examSession.ledger.emit(type, { ...extra, stage: 'preflight' }),
  });

  useEffect(() => {
    if (face.region?.ok) examSession.region = face.region;
  }, [face.region]);

  const calibrating = cameraReady && policy?.facePresence === true &&
    (face.status === 'loading' || face.status === 'calibrating');
  const calibrated = face.status === 'monitoring';

  // Actionable, not just "that didn't work". A student told "hold still" when
  // the real problem is that they are sitting too far away cannot fix it.
  const CALIBRATION_HELP = {
    too_far: 'Move a little closer to the camera.',
    too_close: 'Move back slightly — you are very close to the camera.',
    off_centre: 'Move so your face is in the middle of the picture.',
    not_facing: 'Look straight at the screen, then try again.',
    face_not_steady: 'Sit still and look at the screen for a few seconds.',
    too_few_samples: 'We could not see your face clearly. Check the lighting.',
  };

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

        examSession.begin({ userId: user?.id, examId });
        setExam(res.data.exam);
        setPolicy(res.data.proctor_policy || null);
        setCameraStatus(examSession.cameraStatus);
        setPermissionState(await probeCameraPermission());
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || err.message || 'Failed to load exam');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [examId, authToken, navigate, user?.id]);

  // Show the student themselves. Local rendering only — the frame never leaves
  // the element, which is what keeps "nothing is recorded or uploaded" true.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !examSession.stream) return;
    el.srcObject = examSession.stream;
    el.play?.().catch(() => { /* autoplay policy; the preview is optional */ });
  }, [cameraStatus]);

  // Release the camera on the way out — unless we handed it to the exam.
  useEffect(() => () => {
    if (!examSession.handoff) examSession.release();
  }, []);

  const handleCamera = useCallback(async () => {
    setAsking(true);
    try {
      const outcome = await examSession.acquireCamera();
      setCameraStatus(outcome.status);
      setCameraReason(outcome.reason);
      setPermissionState(await probeCameraPermission());
    } finally {
      setAsking(false);
    }
  }, []);

  const handleSkipCamera = useCallback(() => {
    examSession.continueWithoutCamera();
    setCameraStatus(examSession.cameraStatus);
  }, []);

  /**
   * The terminal gesture.
   *
   * NOT async, deliberately. requestFullscreen() has to be invoked before any
   * await or the browser no longer considers this a user gesture and rejects
   * it without an error. Making this function async and awaiting first is
   * exactly the bug this page exists to fix.
   */
  const handleStartSync = useCallback(() => {
    examSession.handoff = true;

    let fsPromise = null;
    if (policy?.requireFullscreen !== false) {
      if (fullscreenAvailable) {
        fsPromise = requestFullscreen();
      } else {
        examSession.ledger.emit(EVENT.FULLSCREEN_UNSUPPORTED, {
          reason: isIOS() ? 'ios' : 'no_api',
        });
      }
    }

    setStarting(true);
    void finishStart(fsPromise);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy, fullscreenAvailable, examId, authToken, navigate]);

  const finishStart = async (fsPromise) => {
    if (fsPromise) {
      const entered = await fsPromise;
      examSession.fullscreenEntered = entered;
      if (!entered) {
        // A refusal is recorded as unsupported, never as an exit. Exits are
        // HARD and would charge a violation for something the browser did.
        examSession.ledger.emit(EVENT.FULLSCREEN_UNSUPPORTED, {
          reason: 'request_rejected',
        });
      }
    }

    try {
      const res = await api.post(
        `/student/exams/${examId}/start`,
        { preflight: examSession.preflightSummary() },
        { headers: { auth_token: authToken } },
      );
      examSession.attempt = {
        id: res.data.attempt_id,
        expiresAt: res.data.expires_at,
        savedAnswers: res.data.saved_answers || {},
      };
      // replace: so Back from the exam goes to the dashboard rather than
      // through this gate again, which would re-prompt for the camera.
      navigate(`/exams/${examId}/questions`, { replace: true });
    } catch (err) {
      examSession.handoff = false;
      setStarting(false);
      setError(err.response?.data?.message || 'Could not start the exam. Please try again.');
    }
  };

  const cameraCopy = () => {
    if (apiMissing) {
      return {
        severity: 'warning',
        title: 'Camera cannot be used on this address',
        body: window.isSecureContext
          ? 'This browser does not provide camera access.'
          : 'Cameras only work over a secure (https) connection. Open the exam from the https address and try again.',
        retry: false,
      };
    }
    if (cameraStatus === 'denied' && cameraReason === 'blocked') {
      return {
        severity: 'warning',
        title: 'Camera is blocked for this site',
        body: 'Click the camera icon in your browser’s address bar, allow access, then press Try again.',
        retry: true,
      };
    }
    if (cameraStatus === 'denied' || cameraReason === 'dismissed') {
      return {
        severity: 'info',
        title: 'You didn’t answer the camera prompt',
        body: 'Press Try again and choose Allow when your browser asks.',
        retry: true,
      };
    }
    if (cameraReason === 'NotFoundError') {
      return {
        severity: 'warning',
        title: 'No camera found on this device',
        body: 'You can still sit the exam. Your teacher will see that it ran without a camera.',
        retry: true,
      };
    }
    if (cameraReason === 'NotReadableError') {
      return {
        severity: 'warning',
        title: 'Another app is using the camera',
        body: 'Close Zoom, Teams or Meet, then press Try again.',
        retry: true,
      };
    }
    if (cameraStatus === 'unavailable') {
      return {
        severity: 'warning',
        title: 'Camera could not be started',
        body: 'You can still sit the exam. Your teacher will see that it ran without a camera.',
        retry: true,
      };
    }
    return null;
  };

  const problem = cameraCopy();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
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
                  'The timer starts when you press Start, and does not pause.',
                  policy?.detectTabSwitch === false
                    ? null
                    : 'Leaving the exam tab or window is recorded.',
                  policy?.requireFullscreen === false
                    ? null
                    : fullscreenAvailable
                      ? 'The exam opens in fullscreen. Leaving fullscreen is recorded.'
                      : 'Your browser does not support fullscreen — the exam will run in a normal window.',
                  // Say plainly what the camera does and does not do. This is
                  // the single most common student worry, and the honest
                  // answer is also the reassuring one.
                  cameraRequired
                    ? 'Your camera checks you are present. No video is recorded, stored or uploaded.'
                    : null,
                  'If your device or connection fails, log back in and continue where you left off.',
                ].filter(Boolean).map((line) => (
                  <Typography key={line} variant="body2" color="text.secondary" sx={{ pl: 3 }}>
                    • {line}
                  </Typography>
                ))}
              </Stack>

              {/* ── Step 1: camera, while still windowed and unmonitored ── */}
              {cameraRequired && (
                <Box sx={{ mb: 3 }}>
                  <Divider sx={{ mb: 2 }}>
                    <Chip
                      size="small"
                      icon={cameraReady ? <CheckCircleIcon /> : <VideocamIcon />}
                      color={cameraReady ? 'success' : 'default'}
                      label={cameraReady ? 'Camera ready' : 'Step 1 — camera'}
                    />
                  </Divider>

                  {cameraReady ? (
                    <>
                      <Box sx={{ position: 'relative', width: 240, height: 180, mx: 'auto' }}>
                        <Box
                          component="video"
                          ref={videoRef}
                          muted
                          playsInline
                          sx={{
                            width: 240, height: 180, borderRadius: 2, objectFit: 'cover',
                            // Mirrored: an un-mirrored self-view reads as wrong
                            // and makes people correct their position the
                            // wrong way round.
                            transform: 'scaleX(-1)',
                            border: '2px solid',
                            borderColor: calibrated ? 'success.main'
                              : face.calibrationError ? 'warning.main' : 'divider',
                          }}
                        />
                        {/* The framing guide. Without something to aim at,
                            "sit normally" produces whatever the student
                            happens to be doing, including leaning over their
                            notes. */}
                        {policy?.facePresence === true && (
                          <Box
                            component="svg"
                            viewBox="0 0 240 180"
                            sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                          >
                            <ellipse
                              cx="120" cy="88" rx="52" ry="66"
                              fill="none" strokeWidth="2.5" strokeDasharray="7 6"
                              stroke={calibrated ? '#22c55e' : 'rgba(255,255,255,0.55)'}
                            />
                          </Box>
                        )}
                      </Box>

                      {calibrating && (
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 1.5 }}>
                          <CircularProgress
                            size={18}
                            variant={face.calibrationProgress ? 'determinate' : 'indeterminate'}
                            value={Math.round(face.calibrationProgress * 100)}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Line your face up with the oval and look at the screen…
                          </Typography>
                        </Stack>
                      )}

                      {face.calibrationError && (
                        <Alert severity="info" sx={{ mt: 1.5, textAlign: 'left' }}>
                          {CALIBRATION_HELP[face.calibrationError] || 'Let’s try that again.'}
                          <Box sx={{ mt: 1 }}>
                            <Button size="small" variant="outlined" onClick={face.recalibrate}>
                              Try again
                            </Button>
                          </Box>
                        </Alert>
                      )}

                      {calibrated && (
                        <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                          Camera set up. Nothing is recorded or uploaded.
                        </Typography>
                      )}
                    </>
                  ) : problem ? (
                    <Alert severity={problem.severity} sx={{ textAlign: 'left' }}>
                      <AlertTitle>{problem.title}</AlertTitle>
                      {problem.body}
                      {problem.retry && (
                        <Box sx={{ mt: 1.5 }}>
                          <Button size="small" variant="outlined" onClick={handleCamera} disabled={asking}>
                            {asking ? 'Asking…' : 'Try again'}
                          </Button>
                        </Box>
                      )}
                    </Alert>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        size="large"
                        fullWidth
                        startIcon={<VideocamIcon />}
                        onClick={handleCamera}
                        disabled={asking || apiMissing}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        {asking ? 'Waiting for your answer…' : 'Turn on camera'}
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {permissionState === 'denied'
                          ? 'Your browser has this site blocked — you will need to unblock it first.'
                          : 'Your browser will ask for permission. Choose Allow.'}
                      </Typography>
                    </>
                  )}
                </Box>
              )}

              {/* ── Step 2: the terminal gesture ── */}
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<PlayArrowIcon />}
                onClick={handleStartSync}
                disabled={starting || (cameraRequired && cameraStatus === 'idle')}
                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2, py: 1.25 }}
              >
                {starting ? 'Opening…' : 'Start Exam'}
              </Button>

              {/* Warn and allow: a camera problem never blocks the exam. The
                  attempt is flagged so a teacher can see it ran unproctored. */}
              {cameraRequired && cameraStatus === 'idle' && (
                <Button
                  variant="text"
                  size="small"
                  onClick={handleSkipCamera}
                  sx={{ mt: 1.5, textTransform: 'none' }}
                >
                  Continue without camera
                </Button>
              )}

              {cameraRequired && !cameraReady && cameraStatus !== 'idle' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  This exam will be marked as taken without a camera.
                </Typography>
              )}

              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/student')}
                sx={{ mt: 1.5, textTransform: 'none', display: 'block', mx: 'auto' }}
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
