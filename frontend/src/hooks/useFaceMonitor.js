import { useEffect, useRef, useState, useCallback } from 'react';
import { EVENT, SEVERITY } from '../utils/proctorEvents';
import {
  buildSafeRegion, createAttentionTracker, driftRegion,
  detectDeviceType, CALIBRATION_FRAMES, MIN_CONFIDENCE,
} from '../utils/safeRegion';

// 2 fps. A 5-second absence threshold does not need 30 — and on a budget
// Android each inference costs 40-200ms, so this is the difference between
// ~10% CPU and a thermally throttled device with a flat battery.
const SAMPLE_INTERVAL_MS = 500;
const CALIBRATION_INTERVAL_MS = 120;
const INFERENCE_WIDTH = 320;

/**
 * Face presence and attention monitoring.
 *
 * Emits SOFT signals only. Every event raised here is a review flag; none of
 * it can auto-submit an exam. That separation is enforced structurally — the
 * event types below are absent from HARD_EVENTS, and the server keeps its own
 * copy of that list — because a false positive on a probabilistic signal that
 * ends a child's exam is unrecoverable, and false positives are certain at
 * scale.
 *
 * Nothing is recorded. Frames go to a worker, a bounding box comes back, the
 * frame is discarded. No image data reaches the network or the React tree.
 */
export default function useFaceMonitor({ active, enabled, stream, onEvent } = {}) {
  // idle | loading | calibrating | monitoring | failed | unsupported
  const [status, setStatus] = useState('idle');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationError, setCalibrationError] = useState(null);
  const [attention, setAttention] = useState('unknown');

  const workerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const regionRef = useRef(null);
  const trackerRef = useRef(null);
  const calibrationRef = useRef([]);
  const lastDriftRef = useRef(Date.now());
  const inFlightRef = useRef(false);
  const modeRef = useRef('idle');       // idle | calibrating | monitoring

  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });
  const emit = useCallback((type, extra) => onEventRef.current?.(type, extra), []);

  // ── Worker lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !enabled) return;

    let worker;
    try {
      worker = new Worker(
        new URL('../workers/faceMonitor.worker.js', import.meta.url),
        { type: 'module' },
      );
    } catch {
      // No module-worker support. Rather than run a heavy model on the main
      // thread and risk stalling the countdown on a low-end device, face
      // monitoring simply stays off — camera presence still works.
      setStatus('unsupported');
      emit(EVENT.FACE_MONITOR_UNAVAILABLE, { reason: 'worker_unsupported' });
      return;
    }

    workerRef.current = worker;
    setStatus('loading');

    worker.onmessage = (e) => {
      const { type, sample, error } = e.data || {};

      if (type === 'ready') {
        modeRef.current = 'calibrating';
        calibrationRef.current = [];
        setStatus('calibrating');
        return;
      }

      if (type === 'error') {
        setStatus('failed');
        emit(EVENT.FACE_MONITOR_UNAVAILABLE, { reason: error || 'init_failed' });
        return;
      }

      if (type === 'result') {
        inFlightRef.current = false;
        handleSample(sample);
      }
    };

    worker.onerror = () => {
      setStatus('failed');
      emit(EVENT.FACE_MONITOR_UNAVAILABLE, { reason: 'worker_error' });
    };

    worker.postMessage({ type: 'init' });

    return () => {
      try { worker.postMessage({ type: 'close' }); } catch { /* already gone */ }
      worker.terminate();
      workerRef.current = null;
      modeRef.current = 'idle';
      inFlightRef.current = false;
    };
    // handleSample is stable via refs; re-running this would restart the model
    // download mid-exam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, enabled, emit]);

  // ── Sample handling ────────────────────────────────────────────────────
  const handleSample = useCallback((sample) => {
    const usable = sample && sample.score >= MIN_CONFIDENCE ? sample : null;

    if (modeRef.current === 'calibrating') {
      calibrationRef.current.push(usable);
      setCalibrationProgress(calibrationRef.current.length / CALIBRATION_FRAMES);

      if (calibrationRef.current.length >= CALIBRATION_FRAMES) {
        const region = buildSafeRegion(calibrationRef.current.filter(Boolean));
        if (!region.ok) {
          // Calibration is also an attack surface: a student who calibrates
          // while already looking at notes makes the notes the safe position.
          // Rejecting a poor sample and asking again is the guard.
          modeRef.current = 'idle';
          setCalibrationError(region.reason);
          setStatus('calibrating');
          calibrationRef.current = [];
          setCalibrationProgress(0);
          return;
        }
        regionRef.current = region;
        trackerRef.current = createAttentionTracker();
        lastDriftRef.current = Date.now();
        modeRef.current = 'monitoring';
        setCalibrationError(null);
        setStatus('monitoring');
        emit(EVENT.FACE_CALIBRATED, {
          deviceType: region.deviceType, samples: region.samples,
        });
      }
      return;
    }

    if (modeRef.current !== 'monitoring') return;

    const now = Date.now();
    const transition = trackerRef.current?.update(usable, regionRef.current, now);

    if (transition) {
      setAttention(transition.to);
      const { to, from, durationMs } = transition;

      if (to === 'absent') emit(EVENT.FACE_ABSENT);
      else if (to === 'away') emit(EVENT.FACE_OUT_OF_REGION);
      else if (to === 'present' && from !== 'unknown') {
        emit(EVENT.FACE_RETURNED, { durationMs, from });
      }
    }

    // Slow drift, only while settled and inside the region. Drifting toward
    // an out-of-region position would let a student walk the safe area onto
    // their lap over the course of an exam.
    if (usable && trackerRef.current?.state === 'present') {
      const elapsed = now - lastDriftRef.current;
      if (elapsed > SAMPLE_INTERVAL_MS) {
        regionRef.current = driftRegion(regionRef.current, usable, elapsed);
        lastDriftRef.current = now;
      }
    }
  }, [emit]);

  // ── Frame pump ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !enabled || !stream) return;
    if (status !== 'calibrating' && status !== 'monitoring') return;

    // A detached <video> is the only reliable way to pull frames from a
    // MediaStream across browsers. It is never attached to the document.
    if (!videoRef.current) {
      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      videoRef.current = video;
    }
    const video = videoRef.current;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => { /* autoplay of a muted stream is permitted */ });
    }

    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || inFlightRef.current) return;
      if (document.hidden) return;      // mobile suspends the track anyway
      if (!video.videoWidth) return;

      // Downscale before inference. Full-resolution frames cost several times
      // the CPU for no additional accuracy at this task.
      const scale = INFERENCE_WIDTH / video.videoWidth;
      canvas.width = INFERENCE_WIDTH;
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const bitmap = await createImageBitmap(canvas);
        inFlightRef.current = true;
        // Transferred, not copied — and closed inside the worker.
        workerRef.current?.postMessage({ type: 'detect', bitmap }, [bitmap]);
      } catch {
        inFlightRef.current = false;
      }
    };

    const interval = status === 'calibrating' ? CALIBRATION_INTERVAL_MS : SAMPLE_INTERVAL_MS;
    const id = setInterval(tick, interval);
    return () => { cancelled = true; clearInterval(id); };
  }, [active, enabled, stream, status]);

  // Release the detached video when monitoring stops.
  useEffect(() => {
    if (active && enabled) return;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    canvasRef.current = null;
    regionRef.current = null;
    trackerRef.current = null;
    modeRef.current = 'idle';
    setStatus('idle');
    setAttention('unknown');
    setCalibrationProgress(0);
  }, [active, enabled]);

  const recalibrate = useCallback(() => {
    if (!workerRef.current) return;
    calibrationRef.current = [];
    setCalibrationProgress(0);
    setCalibrationError(null);
    // Recalibration is itself auditable — a student who repeatedly recalibrates
    // is doing something worth a second look.
    emit(EVENT.FACE_RECALIBRATED);
    modeRef.current = 'calibrating';
    setStatus('calibrating');
  }, [emit]);

  return {
    status,
    attention,
    calibrationProgress: Math.min(1, calibrationProgress),
    calibrationError,
    recalibrate,
    deviceType: regionRef.current?.deviceType || detectDeviceType(),
  };
}
