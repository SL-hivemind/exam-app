/**
 * Safe-region attention monitoring — the maths, with no DOM and no ML.
 *
 * The design replaces head-pose (pitch/roll/yaw) with a calibrated region of
 * normal head position. The reason is practical rather than theoretical:
 * "is the student looking down?" has no fixed answer when a laptop camera
 * looks up at them, a phone camera looks down, and a desktop camera sits off
 * to one side. "Has the student moved away from where they normally sit?"
 * is answerable on every device, and needs only a bounding box rather than a
 * 468-point mesh — a 230 KB model instead of a 3.7 MB one.
 *
 * Everything here is pure so it can be unit-tested without a camera.
 */

// Detection quality floor. Below this a box is treated as no-face rather than
// a moved face — a bad detection must not read as an absence.
export const MIN_CONFIDENCE = 0.5;
export const CALIBRATION_MIN_CONFIDENCE = 0.6;

// Calibration acceptance. A student must be present for most of the sample
// window, or we are calibrating against an empty chair.
export const CALIBRATION_FRAMES = 30;
export const CALIBRATION_MIN_HIT_RATE = 0.8;

// Plausible face size as a fraction of frame area. Rejects a face held far
// too close (a photo pressed to the lens) or far too distant to track.
export const MIN_FACE_AREA = 0.008;
export const MAX_FACE_AREA = 0.6;

/**
 * Per-device tolerances.
 *
 * Calibration already absorbs camera placement, so these only set how much
 * additional movement is normal for the form factor — and, on phones, the
 * fact that downward gaze IS the reading posture. Scoring vertical movement
 * on a handheld device would flag every student for holding their phone
 * naturally, which is why weightY is 0 there.
 */
export const DEVICE_PROFILES = {
  desktop: { floorX: 0.10, floorY: 0.09, weightX: 1, weightY: 1, k: 2.5 },
  laptop: { floorX: 0.12, floorY: 0.14, weightX: 1, weightY: 1, k: 2.5 },
  tablet: { floorX: 0.15, floorY: 0.18, weightX: 1, weightY: 0.5, k: 3.0 },
  // Handheld: the frame moves with the student, so the region has to be
  // generous in X and effectively unbounded in Y.
  mobile: { floorX: 0.22, floorY: 0.30, weightX: 1, weightY: 0, k: 3.5 },
};

export function detectDeviceType() {
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints > 1;
  const isPhone = /Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) ||
    (navigator.platform === 'MacIntel' && touch);

  if (isPhone) return 'mobile';
  if (isTablet) return 'tablet';
  // Battery presence is a weak laptop signal, but the two only differ in how
  // much downward movement is tolerated — a wrong guess is not costly.
  if (touch || /Macintosh|Mac OS X/.test(ua)) return 'laptop';
  return 'desktop';
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Interquartile range: robust to the occasional wild detection in a way that
// standard deviation is not.
export function iqr(values) {
  if (values.length < 4) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p) => {
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  };
  return q(0.75) - q(0.25);
}

/**
 * Turn a set of calibration samples into a safe region.
 *
 * Samples are {cx, cy, area, score} with cx/cy normalised to 0..1.
 * Returns null when the sample is not good enough to calibrate against —
 * the caller then keeps monitoring disabled rather than inventing a region.
 */
export function buildSafeRegion(samples, deviceType = detectDeviceType()) {
  const profile = DEVICE_PROFILES[deviceType] || DEVICE_PROFILES.laptop;

  const good = samples.filter(
    (s) => s && s.score >= CALIBRATION_MIN_CONFIDENCE &&
      s.area >= MIN_FACE_AREA && s.area <= MAX_FACE_AREA,
  );

  const hitRate = samples.length ? good.length / samples.length : 0;
  if (good.length < 8 || hitRate < CALIBRATION_MIN_HIT_RATE) {
    return { ok: false, reason: hitRate < CALIBRATION_MIN_HIT_RATE ? 'face_not_steady' : 'too_few_samples' };
  }

  const xs = good.map((s) => s.cx);
  const ys = good.map((s) => s.cy);
  const cx = median(xs);
  const cy = median(ys);

  // A student who sat very still would otherwise get a razor-thin region and
  // be flagged for breathing. The floor is what makes this usable.
  const radiusX = Math.max(profile.k * iqr(xs), profile.floorX);
  const radiusY = Math.max(profile.k * iqr(ys), profile.floorY);

  return {
    ok: true,
    deviceType,
    cx, cy, radiusX, radiusY,
    baseCy: cy,               // drift is measured against this
    area: median(good.map((s) => s.area)),
    weightX: profile.weightX,
    weightY: profile.weightY,
    samples: good.length,
  };
}

/**
 * Is this detection inside the safe region?
 *
 * Uses a normalised elliptical distance so a corner excursion is not treated
 * as more acceptable than a straight-up one.
 */
export function isInsideRegion(region, sample) {
  if (!region?.ok || !sample) return true;   // never flag without a baseline
  const dx = ((sample.cx - region.cx) / region.radiusX) * (region.weightX ?? 1);
  const dy = ((sample.cy - region.cy) / region.radiusY) * (region.weightY ?? 1);
  return (dx * dx + dy * dy) <= 1;
}

// How far the region may wander from its calibrated centre, as a fraction of
// frame height per hour. Without this cap a patient student could walk the
// safe region down onto their notes one small slouch at a time.
export const MAX_DRIFT_PER_HOUR = 0.15;
const DRIFT_ALPHA = 0.01;

/**
 * Nudge the region toward where the student is actually sitting.
 *
 * Only applied while they are demonstrably settled and inside the region —
 * drifting toward an out-of-region position is precisely the attack this
 * guards against. Returns a new region; never mutates.
 */
export function driftRegion(region, sample, elapsedMs) {
  if (!region?.ok || !sample) return region;

  const budget = MAX_DRIFT_PER_HOUR * (elapsedMs / 3600000);
  const nextCy = region.cy + (sample.cy - region.cy) * DRIFT_ALPHA;
  const nextCx = region.cx + (sample.cx - region.cx) * DRIFT_ALPHA;

  const clamp = (next, base) => {
    const delta = next - base;
    if (Math.abs(delta) <= budget) return next;
    return base + Math.sign(delta) * budget;
  };

  return {
    ...region,
    cx: clamp(nextCx, region.baseCx ?? region.cx),
    cy: clamp(nextCy, region.baseCy),
    baseCx: region.baseCx ?? region.cx,
  };
}

/**
 * Debounced presence/attention state machine.
 *
 * Transitions only — one row per state change, never one per sample. A 60
 * minute attempt sampled at 1 Hz would otherwise write 3,600 events on its
 * own; the whole event pipeline is sized on the assumption that this
 * function is the thing writing to it.
 */
export function createAttentionTracker({
  absenceMs = 5000,       // face gone this long before it counts
  awayMs = 4000,          // outside the region this long before it counts
  recoverMs = 1500,       // steady this long before we call it recovered
} = {}) {
  let state = 'unknown';      // unknown | present | absent | away
  let pendingSince = null;
  let pendingState = null;
  let stateSince = Date.now();

  return {
    get state() { return state; },

    /**
     * Feed one detection. Returns a transition {from, to, durationMs} or null.
     */
    update(sample, region, now = Date.now()) {
      let observed;
      if (!sample) observed = 'absent';
      else if (!isInsideRegion(region, sample)) observed = 'away';
      else observed = 'present';

      if (observed === state) {
        pendingSince = null;
        pendingState = null;
        return null;
      }

      // A different reading has to persist before it becomes a transition.
      // Without this, one dropped frame while a student scratches their nose
      // becomes a permanent mark on their record.
      if (observed !== pendingState) {
        pendingState = observed;
        pendingSince = now;
        return null;
      }

      const threshold =
        observed === 'absent' ? absenceMs :
        observed === 'away' ? awayMs : recoverMs;

      if (now - pendingSince < threshold) return null;

      const from = state;
      const durationMs = now - stateSince;
      state = observed;
      stateSince = now;
      pendingSince = null;
      pendingState = null;
      return { from, to: state, durationMs };
    },
  };
}
