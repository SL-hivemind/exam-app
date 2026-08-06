import { useEffect, useRef, useState, useCallback } from 'react';
import { EVENT, SEVERITY } from '../utils/proctorEvents';
import {
  buildSafeRegion, createAttentionTracker, driftRegion, distanceChanged,
  detectDeviceType, CALIBRATION_FRAMES, MIN_CONFIDENCE,
} from '../utils/safeRegion';

// 2 fps. A 5-second absence threshold does not need 30 — and on a budget
// Android each inference costs 40-200ms, so this is the difference between
// ~10% CPU and a thermally throttled device with a flat battery.
const SAMPLE_INTERVAL_MS = 500;
const CALIBRATION_INTERVAL_MS = 120;
// Deliberately not raised. BlazeFace resizes to 128x128 internally, so
// keypoint precision is bounded by the model rather than by this canvas —
// a bigger frame costs a bigger resize and buys nothing. The answer to
// keypoint noise is temporal (the median filters below), not spatial.
const INFERENCE_WIDTH = 320;

// Rolling medians over the derived metrics. One noisy keypoint should not
// reach the tracker; a median is the cheapest filter that rejects a spike
// outright rather than averaging it in.
const POSE_FILTER_N = 3;      // ~1.5s lag against 4-5s thresholds
const SCALE_FILTER_N = 5;     // distance moves slowly; filter it harder

function pushCapped(list, value, cap) {
  list.push(value);
  if (list.length > cap) list.shift();
  return list;
}

function medianOf(list) {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

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
export default function useFaceMonitor({
  active, enabled, stream, onEvent, policy, previewRef, initialRegion,
} = {}) {
  // idle | loading | calibrating | monitoring | failed | unsupported
  const [status, setStatus] = useState('idle');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationError, setCalibrationError] = useState(null);
  const [attention, setAttention] = useState('unknown');
  // Exposed so the readiness gate can hand the calibrated baseline to the
  // exam page rather than having it rebuilt against the exam clock.
  const [region, setRegion] = useState(initialRegion || null);

  const workerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const regionRef = useRef(null);
  const trackerRef = useRef(null);
  const calibrationRef = useRef([]);
  const lastDriftRef = useRef(Date.now());
  const inFlightRef = useRef(false);
  const modeRef = useRef('idle');       // idle | calibrating | monitoring
  const filtersRef = useRef({ pitch: [], yaw: [], ipd: [] });
  const multipleRef = useRef({ since: null, active: false });
  const distanceRef = useRef(null);

  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  // Tracker timings come from the exam's policy. They were constants inside
  // the tracker, so a supervised lab and a student at home got the same
  // thresholds whether or not that made sense for either.
  const policyRef = useRef(policy);
  useEffect(() => { policyRef.current = policy; });

  const trackerOptions = useCallback(() => {
    const p = policyRef.current || {};
    return {
      absenceMs: p.faceAbsenceMs ?? undefined,
      awayMs: p.faceAwayMs ?? undefined,
      recoverMs: p.faceRecoverMs ?? undefined,
    };
  }, []);
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
        // Already calibrated on the readiness gate, where the student could
        // see themselves. Re-running it here would spend 3.5s of the exam
        // clock rebuilding a baseline we already have — and would do it
        // without a mirror, which is how bad calibrations happen.
        if (initialRegion?.ok) {
          regionRef.current = initialRegion;
          trackerRef.current = createAttentionTracker(trackerOptions());
          lastDriftRef.current = Date.now();
          modeRef.current = 'monitoring';
          setStatus('monitoring');
          return;
        }
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
  /**
   * Median-filter the keypoints before anything scores against them.
   *
   * A keypoint carries roughly 1-2 pixels of noise out of a 128px model input,
   * which against an interocular distance of ~0.10 frame is 8-16% — material
   * next to a pitch tolerance of 0.28. Filtering costs about 1.5s of lag,
   * against thresholds of 4-5s.
   */
  const smooth = useCallback((sample) => {
    if (!sample?.kp || sample.kp.length < 6) return sample;
    const f = filtersRef.current;
    const [reX, reY, leX, leY, nX, nY] = sample.kp;

    const ipd = Math.hypot(leX - reX, leY - reY);
    if (!(ipd > 1e-4)) return sample;

    // Filter the derived, scale-free quantities rather than raw coordinates:
    // smoothing x/y directly would also smooth away genuine head movement.
    const ax = (reX + leX) / 2;
    const ay = (reY + leY) / 2;
    const roll = Math.atan2(leY - reY, leX - reX);
    const cos = Math.cos(-roll);
    const sin = Math.sin(-roll);
    const dx = nX - ax;
    const dy = nY - ay;

    const smoothPitch = medianOf(pushCapped(f.pitch, (dx * sin + dy * cos) / ipd, POSE_FILTER_N));
    const smoothYaw = medianOf(pushCapped(f.yaw, (dx * cos - dy * sin) / ipd, POSE_FILTER_N));
    const smoothIpd = medianOf(pushCapped(f.ipd, ipd, SCALE_FILTER_N));

    // Rebuild a nose position consistent with the filtered pose, so the rest
    // of the pipeline keeps working on plain keypoints.
    const px = smoothYaw * smoothIpd;
    const py = smoothPitch * smoothIpd;
    const back = Math.cos(roll);
    const forth = Math.sin(roll);
    const kp = [...sample.kp];
    kp[4] = ax + (px * back - py * forth);
    kp[5] = ay + (px * forth + py * back);

    return { ...sample, kp };
  }, []);

  const handleSample = useCallback((raw) => {
    const sample = smooth(raw);
    const usable = sample && sample.score >= MIN_CONFIDENCE ? sample : null;

    if (modeRef.current === 'calibrating') {
      calibrationRef.current.push(usable);
      setCalibrationProgress(calibrationRef.current.length / CALIBRATION_FRAMES);

      if (calibrationRef.current.length >= CALIBRATION_FRAMES) {
        const region = buildSafeRegion(
          calibrationRef.current.filter(Boolean),
          undefined,
          { pitchTolerance: policyRef.current?.facePitchTolerance },
        );
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
        setRegion(region);
        trackerRef.current = createAttentionTracker(trackerOptions());
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
      const { to, from, durationMs, reasons } = transition;

      if (to === 'absent') emit(EVENT.FACE_ABSENT);
      else if (to === 'away') {
        // The reason is the whole difference between a reviewable flag and an
        // unfalsifiable one: "looked down" and "turned away" are not the same
        // observation, and until now neither was recorded.
        emit(EVENT.FACE_OUT_OF_REGION, {
          ...(reasons?.length && { reason: reasons.join('+') }),
        });
      } else if (to === 'present' && from !== 'unknown') {
        emit(EVENT.FACE_RETURNED, { durationMs, from });
      }
    }

    // ── More than one face ──
    // Already on the wire and previously discarded. Debounced like everything
    // else: someone walking past a doorway is not a second candidate.
    const multipleMs = policyRef.current?.faceMultipleMs ?? 3000;
    const many = (sample?.faces || 0) > 1;
    const m = multipleRef.current;
    if (many) {
      if (m.since === null) m.since = now;
      if (!m.active && now - m.since >= multipleMs) {
        m.active = true;
        emit(EVENT.FACE_MULTIPLE, { faces: sample.faces });
      }
    } else {
      m.since = null;
      m.active = false;
    }

    // ── Seating distance ──
    // Recorded, never acted on. Moving back used to buy real slack for free,
    // because tolerances were a fraction of the frame; now it is just a fact
    // a reviewer can see.
    if (usable) {
      const moved = distanceChanged(regionRef.current, usable);
      if (moved && moved !== distanceRef.current) {
        distanceRef.current = moved;
        emit(EVENT.FACE_DISTANCE_CHANGED, { reason: moved });
      } else if (!moved) {
        distanceRef.current = null;
      }
    }

    // Slow drift, only while settled and inside the region. Drifting toward
    // an out-of-region position would let a student walk the safe area onto
    // their lap over the course of an exam.
    if (usable && trackerRef.current?.state === 'present') {
      if (now - lastDriftRef.current > SAMPLE_INTERVAL_MS) {
        regionRef.current = driftRegion(regionRef.current, usable, now);
        lastDriftRef.current = now;
      }
    }
  }, [emit, smooth]);

  // ── Frame pump ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !enabled || !stream) return;
    if (status !== 'calibrating' && status !== 'monitoring') return;

    // A detached <video> is the only reliable way to pull frames from a
    // MediaStream across browsers. It is never attached to the document.
    //
    // Unless the caller supplied one. The readiness gate shows the student
    // themselves while calibrating, because "sit normally" with no mirror is
    // an instruction nobody can follow — and a bad calibration is upstream of
    // every false flag for the rest of the exam. Still nothing recorded: an
    // element rendering a local stream sends nothing anywhere.
    if (previewRef?.current) {
      videoRef.current = previewRef.current;
    } else if (!videoRef.current) {
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
  }, [active, enabled, stream, status, previewRef]);

  // Release the detached video when monitoring stops.
  useEffect(() => {
    if (active && enabled) return;
    if (videoRef.current) {
      // Only detach a stream from an element we created. A caller-supplied
      // preview belongs to the caller.
      if (!previewRef?.current) videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    canvasRef.current = null;
    filtersRef.current = { pitch: [], yaw: [], ipd: [] };
    multipleRef.current = { since: null, active: false };
    distanceRef.current = null;
    regionRef.current = null;
    trackerRef.current = null;
    modeRef.current = 'idle';
    setStatus('idle');
    setAttention('unknown');
    setCalibrationProgress(0);
  }, [active, enabled, previewRef]);

  const recalibrate = useCallback(() => {
    if (!workerRef.current) return;
    calibrationRef.current = [];
    filtersRef.current = { pitch: [], yaw: [], ipd: [] };
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
    region,
    calibrationProgress: Math.min(1, calibrationProgress),
    calibrationError,
    recalibrate,
    deviceType: regionRef.current?.deviceType || detectDeviceType(),
  };
}
