/**
 * Safe-region attention monitoring — the maths, with no DOM and no ML.
 *
 * The design calibrates a region of normal head position rather than trying to
 * measure absolute head pose. "Is the student looking down?" has no fixed
 * answer when a laptop camera looks up at them, a phone camera looks down, and
 * a desktop camera sits off to one side. "Have they moved away from where they
 * normally sit?" is answerable on every device.
 *
 * WHAT CHANGED IN v2, AND WHY
 *
 * v1 measured everything as a fraction of the video FRAME. A head projects as
 * 1/Z, so the same real movement produces a smaller frame-fraction the further
 * away you sit — a student at 110 cm got roughly 3.4x more real head movement
 * before being flagged than one at 50 cm. Testing from across the room showed
 * exactly that: far too much room to look down. It got worse rather than
 * better with distance, because normalised jitter also shrinks, so the
 * measured IQR collapsed and the radius always pinned to the fixed floor.
 *
 * v2 measures in EYE-WIDTHS instead. Interocular distance scales as 1/Z just
 * like the movement does, so the ratio is distance-invariant. The same
 * insight gives real pose proxies: (nose - eye-midpoint) / interocular is
 * dimensionless, so it means the same thing at any distance.
 *
 * The detector was already computing the six keypoints this needs and the
 * worker was throwing them away. When they are absent — an older worker, or a
 * detection with no keypoints — everything falls back to the v1 frame-fraction
 * ellipse, which is a genuine degradation path rather than a failure.
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
// floorX/floorY are FRAME fractions, used only by the v1 fallback.
// floorRX/floorRY are EYE-WIDTHS and are what v2 actually scores against.
// An interocular distance is typically 0.10-0.14 of frame width at a normal
// sitting distance, so laptop's old floorX of 0.12 frame is about 1.0 IPD —
// the v2 numbers start from the same place and then stay there as the student
// moves, which is the entire point.
export const DEVICE_PROFILES = {
  desktop: {
    floorX: 0.10, floorY: 0.09, floorRX: 0.85, floorRY: 0.75,
    pitchFloor: 0.28, weightX: 1, weightY: 1, k: 2.5,
  },
  laptop: {
    floorX: 0.12, floorY: 0.14, floorRX: 1.00, floorRY: 1.15,
    pitchFloor: 0.28, weightX: 1, weightY: 1, k: 2.5,
  },
  tablet: {
    floorX: 0.15, floorY: 0.18, floorRX: 1.25, floorRY: 1.50,
    pitchFloor: 0.40, weightX: 1, weightY: 0.5, k: 3.0,
  },
  // Handheld: the frame moves with the student, so the region has to be
  // generous in X and effectively unbounded in Y. pitchFloor is null because
  // looking down IS the reading posture on a phone.
  mobile: {
    floorX: 0.22, floorY: 0.30, floorRX: 1.80, floorRY: 2.50,
    pitchFloor: null, weightX: 1, weightY: 0, k: 3.5,
  },
};

// Fallback scale when a detection has no keypoints: a BlazeFace short-range
// box is roughly 2.4 interocular distances tall on a frontal face.
export const IPD_PER_HEIGHT = 0.42;

// Framing gate, applied ONLY at calibration. Deliberately not applied to
// MIN_FACE_AREA, which stays where it is: raising the tracking floor would
// drop legitimately-distant students out of monitoring altogether, which is
// worse than monitoring them accurately. At a 320px inference width these
// correspond to roughly 100 cm and 35 cm on a typical laptop lens.
export const CALIB_IPD_MIN = 0.065;
export const CALIB_IPD_MAX = 0.22;
// The eye midpoint must sit in the middle 60% of the frame to calibrate.
export const CALIB_CENTRE_MARGIN = 0.2;
// Yaw at calibration. The real defence against a student calibrating while
// already turned toward their notes — v1 only had a comment about this.
export const CALIB_MAX_YAW = 0.20;
export const CALIB_MAX_PITCH_SPREAD = 0.25;
// A sustained change of seating distance. Recorded, but it must NEVER widen
// the tolerance — that was precisely the v1 exploit.
export const DISTANCE_NEAR_RATIO = 0.55;
export const DISTANCE_FAR_RATIO = 1.8;

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
 * Distance-invariant metrics from the six BlazeFace keypoints.
 *
 * Keypoint order, flat: right eye, left eye, nose tip, mouth centre, right
 * ear tragion, left ear tragion — x then y, each normalised 0..1.
 *
 * Returns null when the keypoints are missing or implausible, which sends the
 * caller down the v1 frame-fraction path. That null is load-bearing: if the
 * detector ever returned keypoints in PIXELS rather than normalised units,
 * every derived value would be wrong by a factor of the frame size and the
 * region would silently stop flagging anything. Better to fail to the older,
 * cruder measure than to a confidently wrong one.
 *
 * @returns {{ipd, ax, ay, roll, pitch, yaw}|null}
 *   pitch: nose below the eye line, in eye-widths. Higher = chin down.
 *   yaw:   nose lateral offset, in eye-widths. Signed.
 */
export function deriveMetrics(sample) {
  const kp = sample?.kp;
  if (!Array.isArray(kp) || kp.length < 6) return null;

  for (let i = 0; i < 6; i += 1) {
    const v = kp[i];
    // Slightly outside the frame is normal at the edges; a pixel value is not.
    if (!Number.isFinite(v) || v < -0.5 || v > 1.5) return null;
  }

  const [reX, reY, leX, leY, nX, nY] = kp;
  const ipd = Math.hypot(leX - reX, leY - reY);
  if (!(ipd > 1e-4)) return null;

  const ax = (reX + leX) / 2;
  const ay = (reY + leY) / 2;
  const roll = Math.atan2(leY - reY, leX - reX);

  // De-roll before measuring, so a tilted head does not leak into pitch.
  const cos = Math.cos(-roll);
  const sin = Math.sin(-roll);
  const dx = nX - ax;
  const dy = nY - ay;

  return {
    ipd, ax, ay, roll,
    pitch: (dx * sin + dy * cos) / ipd,
    yaw: (dx * cos - dy * sin) / ipd,
  };
}

/** Scale reference in eye-widths, from keypoints or from the box height. */
function scaleOf(sample, metrics) {
  if (metrics) return metrics.ipd;
  if (Number.isFinite(sample?.h) && sample.h > 0) return sample.h * IPD_PER_HEIGHT;
  return null;
}

/**
 * Turn a set of calibration samples into a safe region.
 *
 * Samples are {cx, cy, area, score} with cx/cy normalised to 0..1, plus the
 * optional v2 fields {w, h, roll, kp}.
 *
 * Returns {ok: false, reason} when the sample is not good enough to calibrate
 * against — the caller then keeps monitoring disabled rather than inventing a
 * region. The reasons are specific so the student can be told what to fix.
 */
export function buildSafeRegion(samples, deviceType = detectDeviceType(), options = {}) {
  const profile = DEVICE_PROFILES[deviceType] || DEVICE_PROFILES.laptop;

  const good = samples.filter(
    (s) => s && s.score >= CALIBRATION_MIN_CONFIDENCE &&
      s.area >= MIN_FACE_AREA && s.area <= MAX_FACE_AREA,
  );

  const hitRate = samples.length ? good.length / samples.length : 0;
  if (good.length < 8 || hitRate < CALIBRATION_MIN_HIT_RATE) {
    // Say what is actually wrong. A student who is simply too far away was
    // being told to hold still, which they cannot act on — the size filter
    // rejects their frames before the distance gate below ever runs.
    const detected = samples.filter((s) => s && s.score >= CALIBRATION_MIN_CONFIDENCE);
    const tooSmall = detected.filter((s) => s.area < MIN_FACE_AREA).length;
    const tooBig = detected.filter((s) => s.area > MAX_FACE_AREA).length;
    let reason = hitRate < CALIBRATION_MIN_HIT_RATE ? 'face_not_steady' : 'too_few_samples';
    if (tooSmall > detected.length / 2) reason = 'too_far';
    else if (tooBig > detected.length / 2) reason = 'too_close';
    return { ok: false, reason };
  }

  const xs = good.map((s) => s.cx);
  const ys = good.map((s) => s.cy);
  const cx = median(xs);
  const cy = median(ys);

  // A student who sat very still would otherwise get a razor-thin region and
  // be flagged for breathing. The floor is what makes this usable.
  const radiusX = Math.max(profile.k * iqr(xs), profile.floorX);
  const radiusY = Math.max(profile.k * iqr(ys), profile.floorY);

  const region = {
    ok: true,
    version: 1,
    deviceType,
    cx, cy, radiusX, radiusY,
    baseCx: cx,
    baseCy: cy,               // drift is measured against this
    area: median(good.map((s) => s.area)),
    weightX: profile.weightX,
    weightY: profile.weightY,
    samples: good.length,
    hitRate,
    calibratedAt: Date.now(),
  };

  // ── v2: eye-anchored, distance-invariant ──
  const metrics = good.map(deriveMetrics).filter(Boolean);
  if (metrics.length < 8) return region;      // no keypoints; v1 is all we get

  const ipds = metrics.map((m) => m.ipd);
  const pitches = metrics.map((m) => m.pitch);
  const yaws = metrics.map((m) => m.yaw);
  const ipd = median(ipds);
  const pitch0 = median(pitches);
  const yaw0 = median(yaws);

  // Framing gate. A student who calibrates from across the room gets a region
  // that is technically valid and practically useless, and there is no way to
  // recover it later — so refuse now, while we can still ask them to move.
  if (ipd < CALIB_IPD_MIN) return { ok: false, reason: 'too_far' };
  if (ipd > CALIB_IPD_MAX) return { ok: false, reason: 'too_close' };

  const ax = median(metrics.map((m) => m.ax));
  const ay = median(metrics.map((m) => m.ay));
  const edge = CALIB_CENTRE_MARGIN;
  if (ax < edge || ax > 1 - edge || ay < edge || ay > 1 - edge) {
    return { ok: false, reason: 'off_centre' };
  }

  // Neutral pose, or the baseline bakes in the posture we are trying to catch.
  if (Math.abs(yaw0) > CALIB_MAX_YAW) return { ok: false, reason: 'not_facing' };
  if (iqr(pitches) > CALIB_MAX_PITCH_SPREAD) return { ok: false, reason: 'face_not_steady' };

  // The pitch term ships OFF. Its thresholds are derived from geometry rather
  // than measured on real hardware with real camera angles, and a tolerance
  // that is wrong in the tight direction flags honest students. Positional
  // scoring is already distance-invariant on its own, which is the actual bug
  // being fixed here; pitch is the upgrade, and it waits for evidence.
  //
  //   null | undefined -> off        'auto' -> derive from calibration
  //   number           -> use it
  const wanted = options.pitchTolerance;
  const pitchTolAuto = profile.pitchFloor === null
    ? null
    : Math.max(3.0 * iqr(pitches), profile.pitchFloor);
  const pitchTol =
    wanted === 'auto' ? pitchTolAuto
      : (typeof wanted === 'number' && wanted > 0) ? wanted
        : null;

  return {
    ...region,
    version: 2,
    anchor: 'eyes',
    ipd,
    ax0: ax, ay0: ay,
    baseAx: ax, baseAy: ay,
    // Tolerances in EYE-WIDTHS, so they mean the same thing at any distance.
    rX: Math.max(profile.k * iqr(metrics.map((m) => m.ax)) / ipd, profile.floorRX),
    rY: Math.max(profile.k * iqr(metrics.map((m) => m.ay)) / ipd, profile.floorRY),
    pitch0, pitchTol, pitchTolAuto, basePitch: pitch0,
    yaw0, yawTol: Math.max(3.0 * iqr(yaws), 0.30),
    roll0: median(metrics.map((m) => m.roll)),
  };
}

/**
 * Score one detection against the region.
 *
 * Uses a normalised elliptical distance so a corner excursion is not treated
 * as more acceptable than a straight-up one, and — when keypoints are
 * available — measures that ellipse in eye-widths rather than frame
 * fractions, which is what makes the result independent of how far away the
 * student is sitting.
 *
 * @returns {{inside: boolean, reasons: string[], distanceRatio: number|null}}
 */
export function evaluateSample(region, sample) {
  if (!region?.ok || !sample) {
    // Never flag without a baseline. An uncalibrated region means we do not
    // know what normal looks like, not that everything is abnormal.
    return { inside: true, reasons: [], distanceRatio: null };
  }

  const metrics = deriveMetrics(sample);

  // ── v1 fallback: no keypoints, or a region calibrated without them ──
  if (!metrics || region.version !== 2) {
    const dx = ((sample.cx - region.cx) / region.radiusX) * (region.weightX ?? 1);
    const dy = ((sample.cy - region.cy) / region.radiusY) * (region.weightY ?? 1);
    const inside = (dx * dx + dy * dy) <= 1;
    return { inside, reasons: inside ? [] : ['position'], distanceRatio: null };
  }

  const u = scaleOf(sample, metrics);
  const reasons = [];

  // Displacement in eye-widths, then against a tolerance in eye-widths. Both
  // numerator and denominator scale as 1/Z, so the ratio does not.
  const dx = ((metrics.ax - region.ax0) / u / region.rX) * (region.weightX ?? 1);
  const dy = ((metrics.ay - region.ay0) / u / region.rY) * (region.weightY ?? 1);
  if ((dx * dx + dy * dy) > 1) reasons.push('position');

  // weightY 0 (a phone) disables the vertical term AND the pitch term: looking
  // down at a handheld device is how it is read, not evidence of anything.
  if (region.pitchTol !== null && (region.weightY ?? 1) > 0) {
    const dPitch = metrics.pitch - region.pitch0;
    // One-sided. Chin down is the posture worth catching; chin up is rarely
    // anything but stretching, so it gets more room.
    if (dPitch > region.pitchTol) reasons.push('pitch_down');
    else if (dPitch < -region.pitchTol * 1.6) reasons.push('pitch_up');
  }

  if (Math.abs(metrics.yaw - region.yaw0) > region.yawTol) reasons.push('yaw');

  return {
    inside: reasons.length === 0,
    reasons,
    distanceRatio: region.ipd ? u / region.ipd : null,
  };
}

/** Is this detection inside the safe region? */
export function isInsideRegion(region, sample) {
  return evaluateSample(region, sample).inside;
}

/**
 * Has the student materially changed how far away they are sitting?
 *
 * Reported, never acted on by widening anything. Moving back used to buy real
 * slack for free; now it just gets recorded.
 */
export function distanceChanged(region, sample) {
  if (region?.version !== 2) return null;
  const u = scaleOf(sample, deriveMetrics(sample));
  if (!u || !region.ipd) return null;
  const ratio = u / region.ipd;
  if (ratio < DISTANCE_NEAR_RATIO) return 'further';
  if (ratio > DISTANCE_FAR_RATIO) return 'closer';
  return null;
}

// How far the region may wander from its calibrated centre, as a fraction of
// frame height per hour. Without this cap a patient student could walk the
// safe region down onto their notes one small slouch at a time.
export const MAX_DRIFT_PER_HOUR = 0.15;
// A hard ceiling regardless of how long the exam runs. Without it a three-hour
// paper would allow 0.45 of frame height, which reopens the very attack the
// per-hour rate exists to close.
export const MAX_DRIFT_TOTAL = 0.20;
// Pitch is a tighter signal and deserves a tighter allowance — enough for a
// student genuinely settling lower in their chair, not enough to relocate.
export const MAX_PITCH_DRIFT_TOTAL = 0.10;
const DRIFT_ALPHA = 0.01;

/**
 * Nudge the region toward where the student is actually sitting.
 *
 * Only applied while they are demonstrably settled and inside the region —
 * drifting toward an out-of-region position is precisely the attack this
 * guards against. Returns a new region; never mutates.
 *
 * Takes wall-clock `nowMs`, not a per-step elapsed. The budget is cumulative
 * and was previously compared against a per-step allowance: at a real 500 ms
 * cadence that worked out to 2e-5, so adaptive drift did nothing at all in
 * production. The tests passed only because they fed it minute-long steps.
 */
export function driftRegion(region, sample, nowMs = Date.now()) {
  if (!region?.ok || !sample) return region;

  const since = region.calibratedAt ?? nowMs;
  const elapsedHours = Math.max(0, (nowMs - since) / 3600000);
  const budget = Math.min(MAX_DRIFT_TOTAL, MAX_DRIFT_PER_HOUR * elapsedHours);

  const clamp = (next, base, cap = budget) => {
    const delta = next - base;
    if (Math.abs(delta) <= cap) return next;
    return base + Math.sign(delta) * cap;
  };
  const ease = (from, to) => from + (to - from) * DRIFT_ALPHA;

  const drifted = {
    ...region,
    cx: clamp(ease(region.cx, sample.cx), region.baseCx ?? region.cx),
    cy: clamp(ease(region.cy, sample.cy), region.baseCy),
    baseCx: region.baseCx ?? region.cx,
  };

  if (region.version !== 2) return drifted;

  const metrics = deriveMetrics(sample);
  if (!metrics) return drifted;

  return {
    ...drifted,
    ax0: clamp(ease(region.ax0, metrics.ax), region.baseAx),
    ay0: clamp(ease(region.ay0, metrics.ay), region.baseAy),
    pitch0: clamp(ease(region.pitch0, metrics.pitch), region.basePitch, MAX_PITCH_DRIFT_TOTAL),
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
  let stateSince = Date.now();
  let lastUpdate = null;
  let lastReasons = [];

  // Leaky accumulator rather than a run of consecutive frames.
  //
  // At 2 fps a 4-second threshold needs eight frames in a row, and the old
  // implementation reset the clock on a single contrary reading — so a blink,
  // or one dropped inference, restarted the count from zero and `away`
  // systematically under-fired. Here a contrary frame costs half its duration
  // instead of everything.
  const DECAY = 0.5;
  // Cap on one step, so a paused frame pump (backgrounded tab, a slow device
  // dropping inferences) cannot bank several seconds of evidence at once.
  const MAX_STEP_MS = 2000;

  const scores = { present: 0, absent: 0, away: 0 };

  const thresholdFor = (s) =>
    (s === 'absent' ? absenceMs : s === 'away' ? awayMs : recoverMs);

  return {
    get state() { return state; },
    /** Why the last sample was scored `away`, for the event payload. */
    get reasons() { return lastReasons; },

    /**
     * Feed one detection. Returns a transition {from, to, durationMs, reasons}
     * or null.
     */
    update(sample, region, now = Date.now()) {
      const dt = lastUpdate === null ? 0 : Math.min(MAX_STEP_MS, Math.max(0, now - lastUpdate));
      lastUpdate = now;

      let observed;
      if (!sample) {
        observed = 'absent';
        lastReasons = [];
      } else {
        const verdict = evaluateSample(region, sample);
        observed = verdict.inside ? 'present' : 'away';
        lastReasons = verdict.reasons;
      }

      scores[observed] += dt;
      Object.keys(scores).forEach((s) => {
        if (s !== observed) scores[s] = Math.max(0, scores[s] - dt * DECAY);
      });

      if (observed === state) {
        scores[observed] = 0;
        return null;
      }

      if (scores[observed] < thresholdFor(observed)) return null;

      const from = state;
      const durationMs = now - stateSince;
      const reasons = lastReasons;
      state = observed;
      stateSince = now;
      scores.present = 0;
      scores.absent = 0;
      scores.away = 0;
      return { from, to: state, durationMs, reasons };
    },
  };
}
