import {
  buildSafeRegion, isInsideRegion, evaluateSample, deriveMetrics,
  distanceChanged, driftRegion, createAttentionTracker,
  median, iqr, DEVICE_PROFILES, MAX_DRIFT_PER_HOUR, MAX_DRIFT_TOTAL,
  CALIBRATION_FRAMES,
} from './safeRegion';

const sample = (cx, cy, over = {}) => ({ cx, cy, area: 0.05, score: 0.9, ...over });

// A steady student: same spot, tiny natural jitter.
const steadySamples = (n = CALIBRATION_FRAMES, cx = 0.5, cy = 0.5) =>
  Array.from({ length: n }, (_, i) =>
    sample(cx + (i % 3 - 1) * 0.002, cy + (i % 5 - 2) * 0.002));

describe('statistics helpers', () => {
  test('median handles odd and even lengths', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  test('iqr ignores outliers that would wreck a standard deviation', () => {
    const tight = iqr([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.99]);
    expect(tight).toBeLessThan(0.1);
  });
});

describe('buildSafeRegion', () => {
  test('builds a region from a steady sample', () => {
    const region = buildSafeRegion(steadySamples(), 'laptop');
    expect(region.ok).toBe(true);
    expect(region.cx).toBeCloseTo(0.5, 2);
    expect(region.cy).toBeCloseTo(0.5, 2);
  });

  test('applies the floor so a very still student does not get a razor-thin region', () => {
    // Zero variance: without a floor the radius would be 0 and the student
    // would be flagged for breathing.
    const region = buildSafeRegion(
      Array.from({ length: CALIBRATION_FRAMES }, () => sample(0.5, 0.5)), 'laptop');
    expect(region.radiusX).toBe(DEVICE_PROFILES.laptop.floorX);
    expect(region.radiusY).toBe(DEVICE_PROFILES.laptop.floorY);
  });

  test('rejects calibration when the face is rarely detected', () => {
    // Only 5 usable frames out of 30 — an empty chair, or a covered lens.
    const region = buildSafeRegion(
      [...steadySamples(5), ...Array.from({ length: 25 }, () => sample(0.5, 0.5, { score: 0.1 }))],
      'laptop');
    expect(region.ok).toBe(false);
  });

  test('rejects a face pressed to the lens', () => {
    const region = buildSafeRegion(
      Array.from({ length: CALIBRATION_FRAMES }, () => sample(0.5, 0.5, { area: 0.95 })),
      'laptop');
    expect(region.ok).toBe(false);
  });

  test('mobile gets a far more generous region than desktop', () => {
    const onPhone = buildSafeRegion(steadySamples(), 'mobile');
    const onDesktop = buildSafeRegion(steadySamples(), 'desktop');
    expect(onPhone.radiusX).toBeGreaterThan(onDesktop.radiusX);
    expect(onPhone.radiusY).toBeGreaterThan(onDesktop.radiusY);
  });
});

describe('isInsideRegion', () => {
  const region = buildSafeRegion(steadySamples(), 'laptop');

  test('small movements are ignored', () => {
    expect(isInsideRegion(region, sample(0.52, 0.53))).toBe(true);
  });

  test('a large excursion is outside', () => {
    expect(isInsideRegion(region, sample(0.95, 0.5))).toBe(false);
  });

  test('corner excursions are not treated as more acceptable than straight ones', () => {
    // Both axes at 80% of their radius: inside a rectangle, outside an ellipse.
    const r = buildSafeRegion(steadySamples(), 'laptop');
    const corner = sample(r.cx + r.radiusX * 0.8, r.cy + r.radiusY * 0.8);
    expect(isInsideRegion(r, corner)).toBe(false);
  });

  test('never flags when there is no calibrated baseline', () => {
    expect(isInsideRegion(null, sample(0.99, 0.99))).toBe(true);
    expect(isInsideRegion({ ok: false }, sample(0.99, 0.99))).toBe(true);
  });

  test('on a phone, looking down is not a violation', () => {
    // Downward gaze IS the reading posture on a handheld device.
    const phone = buildSafeRegion(steadySamples(), 'mobile');
    expect(isInsideRegion(phone, sample(phone.cx, 0.99))).toBe(true);
  });
});

describe('driftRegion', () => {
  // Takes wall-clock now, not a per-step elapsed. The old signature compared a
  // cumulative deviation against a per-STEP budget, so at the real 500ms
  // cadence the allowance worked out to 2e-5 and drift did nothing whatsoever
  // in production. These tests passed only because they fed it minute-long
  // steps that never occur.
  test('follows a student who settles into a new position', () => {
    const region = buildSafeRegion(steadySamples(), 'laptop');
    let drifted = region;
    for (let i = 1; i <= 50; i++) {
      drifted = driftRegion(drifted, sample(0.5, 0.56), region.calibratedAt + i * 60000);
    }
    expect(drifted.cy).toBeGreaterThan(region.cy);
  });

  test('cannot be walked onto the notes in a student\'s lap', () => {
    // The attack: hold a position slightly low, repeatedly, for an hour and
    // hope the safe region follows you all the way down.
    const region = buildSafeRegion(steadySamples(), 'laptop');
    let drifted = region;
    for (let i = 1; i <= 2000; i++) {
      drifted = driftRegion(drifted, sample(0.5, 1.0), region.calibratedAt + i * 1800);
    }
    expect(Math.abs(drifted.cy - region.baseCy)).toBeLessThanOrEqual(MAX_DRIFT_PER_HOUR + 1e-9);
  });

  test('a long exam cannot buy proportionally more drift', () => {
    // Without a total cap a three-hour paper would allow 0.45 of frame
    // height, which reopens the attack the per-hour rate exists to close.
    const region = buildSafeRegion(steadySamples(), 'laptop');
    let drifted = region;
    for (let i = 1; i <= 6000; i++) {
      drifted = driftRegion(drifted, sample(0.5, 1.0), region.calibratedAt + i * 1800);
    }
    expect(Math.abs(drifted.cy - region.baseCy)).toBeLessThanOrEqual(MAX_DRIFT_TOTAL + 1e-9);
  });

  test('does not mutate the region it is given', () => {
    const region = buildSafeRegion(steadySamples(), 'laptop');
    const before = region.cy;
    driftRegion(region, sample(0.5, 0.9), region.calibratedAt + 60000);
    expect(region.cy).toBe(before);
  });
});

// ── v2: distance invariance ────────────────────────────────────────────────
//
// The bug these cover: v1 measured everything as a fraction of the FRAME, but
// a head projects as 1/Z, so a student sitting further away got proportionally
// more real head movement before being flagged — about 3.4x across the
// accepted range. Sitting across the room bought a great deal of room to look
// down. v2 measures in eye-widths, which scale with distance the same way the
// movement does.

/**
 * A synthetic detection with keypoints.
 * `ipd` is the scale (and therefore the proxy for distance): smaller = further
 * away. `pitch`/`yaw` are in eye-widths, matching what deriveMetrics returns.
 */
const kpSample = (ax, ay, { ipd = 0.12, pitch = 0.65, yaw = 0, roll = 0, ...over } = {}) => {
  const half = ipd / 2;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const px = yaw * ipd;
  const py = pitch * ipd;
  const h = ipd / 0.42;                 // IPD_PER_HEIGHT
  return {
    cx: ax,
    cy: ay + h * 0.15,                  // box centre sits below the eye line
    w: h * 0.7,
    h,
    area: h * h * 0.7,
    score: 0.9,
    faces: 1,
    kp: [
      ax - half * cos, ay - half * sin,           // right eye
      ax + half * cos, ay + half * sin,           // left eye
      ax + (px * cos - py * sin), ay + (px * sin + py * cos),   // nose
      ax, ay + py * 1.6,                          // mouth (unused)
      ax - ipd, ay,                               // right ear (unused)
      ax + ipd, ay,                               // left ear (unused)
    ],
    ...over,
  };
};

const steadyKp = (opts = {}, n = CALIBRATION_FRAMES) =>
  Array.from({ length: n }, (_, i) =>
    kpSample(0.5 + (i % 3 - 1) * 0.002, 0.5 + (i % 5 - 2) * 0.002, opts));

describe('deriveMetrics', () => {
  test('recovers the pose it was built from', () => {
    const m = deriveMetrics(kpSample(0.5, 0.5, { ipd: 0.12, pitch: 0.7, yaw: -0.2 }));
    expect(m.ipd).toBeCloseTo(0.12, 6);
    expect(m.pitch).toBeCloseTo(0.7, 6);
    expect(m.yaw).toBeCloseTo(-0.2, 6);
    expect(m.ax).toBeCloseTo(0.5, 6);
  });

  test('pitch is identical near and far — the whole point of v2', () => {
    // Same head pose, one student close to the camera and one across the room.
    const near = deriveMetrics(kpSample(0.5, 0.5, { ipd: 0.18, pitch: 0.7 }));
    const far = deriveMetrics(kpSample(0.5, 0.5, { ipd: 0.06, pitch: 0.7 }));
    expect(Math.abs(near.pitch - far.pitch)).toBeLessThan(1e-9);
    expect(Math.abs(near.yaw - far.yaw)).toBeLessThan(1e-9);
    // ...and the scale itself still differs, so the two really are different
    // distances rather than an accidentally identical pair of samples.
    expect(near.ipd).toBeGreaterThan(far.ipd * 2);
  });

  test('head tilt does not leak into pitch', () => {
    const upright = deriveMetrics(kpSample(0.5, 0.5, { pitch: 0.65, roll: 0 }));
    const tilted = deriveMetrics(kpSample(0.5, 0.5, { pitch: 0.65, roll: 0.35 }));
    expect(tilted.pitch).toBeCloseTo(upright.pitch, 6);
  });

  test('falls back to null rather than trusting implausible keypoints', () => {
    // If the detector ever returned PIXELS instead of normalised units, every
    // derived value would be wrong by a factor of the frame size and the
    // region would silently stop flagging. Fail to v1 instead.
    expect(deriveMetrics({ kp: [160, 120, 200, 120, 180, 150] })).toBeNull();
    expect(deriveMetrics({ kp: null })).toBeNull();
    expect(deriveMetrics({})).toBeNull();
  });
});

describe('distance-invariant scoring', () => {
  const region = buildSafeRegion(steadyKp({ ipd: 0.12 }), 'laptop');

  test('calibrates a v2 region when keypoints are present', () => {
    expect(region.ok).toBe(true);
    expect(region.version).toBe(2);
    expect(region.ipd).toBeCloseTo(0.12, 3);
  });

  test('the same real movement flags at any seating distance', () => {
    // 1.4 eye-widths of lateral movement — comfortably outside laptop's
    // floorRX of 1.0 — expressed at three different distances.
    const shift = (ipd) => kpSample(0.5 + 1.4 * ipd, 0.5, { ipd });
    expect(isInsideRegion(region, shift(0.18))).toBe(false);   // close
    expect(isInsideRegion(region, shift(0.12))).toBe(false);   // calibrated
    expect(isInsideRegion(region, shift(0.06))).toBe(false);   // far away
  });

  test('and a small real movement is tolerated at any distance', () => {
    const nudge = (ipd) => kpSample(0.5 + 0.3 * ipd, 0.5, { ipd });
    expect(isInsideRegion(region, nudge(0.18))).toBe(true);
    expect(isInsideRegion(region, nudge(0.12))).toBe(true);
    expect(isInsideRegion(region, nudge(0.06))).toBe(true);
  });

  test('sitting further away does not buy extra room — the v1 exploit', () => {
    // In frame units this excursion is small, because a distant head is
    // small. In eye-widths it is a long way. v1 scored the former.
    const far = kpSample(0.5 + 0.09, 0.5, { ipd: 0.06 });      // 1.5 eye-widths
    expect(Math.abs(far.kp[0] + far.kp[2]) / 2 - 0.5).toBeLessThan(0.12);
    expect(isInsideRegion(region, far)).toBe(false);
  });

  test('moving away is reported, not rewarded', () => {
    expect(distanceChanged(region, kpSample(0.5, 0.5, { ipd: 0.03 }))).toBe('further');
    expect(distanceChanged(region, kpSample(0.5, 0.5, { ipd: 0.30 }))).toBe('closer');
    expect(distanceChanged(region, kpSample(0.5, 0.5, { ipd: 0.12 }))).toBeNull();
  });
});

describe('pitch scoring', () => {
  // Off by default: the thresholds are geometric rather than measured, and a
  // tolerance that is wrong in the tight direction flags honest students.
  test('is disabled unless the exam policy asks for it', () => {
    const region = buildSafeRegion(steadyKp(), 'laptop');
    expect(region.pitchTol).toBeNull();
    const chinDown = kpSample(0.5, 0.5, { pitch: 1.3 });
    expect(isInsideRegion(region, chinDown)).toBe(true);
  });

  test('catches a chin drop equally near and far once enabled', () => {
    const region = buildSafeRegion(steadyKp({ ipd: 0.12 }), 'laptop', { pitchTolerance: 'auto' });
    expect(region.pitchTol).toBeGreaterThan(0);

    // A chin drop of +0.35 eye-widths, at two very different distances.
    const near = kpSample(0.5, 0.5, { ipd: 0.18, pitch: 1.0 });
    const far = kpSample(0.5, 0.5, { ipd: 0.06, pitch: 1.0 });
    expect(evaluateSample(region, near).reasons).toContain('pitch_down');
    expect(evaluateSample(region, far).reasons).toContain('pitch_down');
  });

  test('chin up gets more room than chin down', () => {
    const region = buildSafeRegion(steadyKp(), 'laptop', { pitchTolerance: 0.3 });
    expect(isInsideRegion(region, kpSample(0.5, 0.5, { pitch: 0.65 + 0.4 }))).toBe(false);
    expect(isInsideRegion(region, kpSample(0.5, 0.5, { pitch: 0.65 - 0.4 }))).toBe(true);
  });

  test('on a phone, looking down is still not a violation', () => {
    const phone = buildSafeRegion(steadyKp(), 'mobile', { pitchTolerance: 'auto' });
    expect(isInsideRegion(phone, kpSample(0.5, 0.5, { pitch: 1.5 }))).toBe(true);
  });
});

describe('calibration framing gate', () => {
  test('refuses a student sitting too far away, with a usable reason', () => {
    // Accepting this produces a region that is technically valid and
    // practically useless, and nothing downstream can recover it.
    const region = buildSafeRegion(steadyKp({ ipd: 0.04 }), 'laptop');
    expect(region).toMatchObject({ ok: false, reason: 'too_far' });
  });

  test('refuses a face pressed to the lens', () => {
    expect(buildSafeRegion(steadyKp({ ipd: 0.30 }), 'laptop'))
      .toMatchObject({ ok: false, reason: 'too_close' });
  });

  test('refuses a student calibrating while already turned away', () => {
    // The attack v1 only had a comment about: calibrate while looking at your
    // notes and the notes become the safe position for the whole exam.
    expect(buildSafeRegion(steadyKp({ yaw: 0.5 }), 'laptop'))
      .toMatchObject({ ok: false, reason: 'not_facing' });
  });

  test('refuses a face off to the edge of the frame', () => {
    const offCentre = Array.from({ length: CALIBRATION_FRAMES }, () => kpSample(0.06, 0.5));
    expect(buildSafeRegion(offCentre, 'laptop'))
      .toMatchObject({ ok: false, reason: 'off_centre' });
  });

  test('the monitoring floor is NOT raised to match', () => {
    // Raising MIN_FACE_AREA would drop legitimately-distant students out of
    // monitoring entirely, which is worse than monitoring them accurately.
    const region = buildSafeRegion(steadyKp({ ipd: 0.12 }), 'laptop');
    const veryFar = kpSample(0.5, 0.5, { ipd: 0.04 });
    expect(evaluateSample(region, veryFar).inside).toBe(true);
  });
});

describe('v1 fallback', () => {
  test('a detector with no keypoints still gets frame-fraction scoring', () => {
    const region = buildSafeRegion(steadySamples(), 'laptop');
    expect(region.version).toBe(1);
    expect(isInsideRegion(region, sample(0.5, 0.5))).toBe(true);
    expect(isInsideRegion(region, sample(0.95, 0.5))).toBe(false);
  });

  test('a v2 region still scores a keypoint-less sample', () => {
    const region = buildSafeRegion(steadyKp(), 'laptop');
    expect(isInsideRegion(region, sample(0.5, 0.5))).toBe(true);
  });
});

describe('createAttentionTracker', () => {
  const region = buildSafeRegion(steadySamples(), 'laptop');
  const inside = sample(0.5, 0.5);

  test('emits nothing while the student is simply present', () => {
    const t = createAttentionTracker();
    let now = 1000;
    // First transition into 'present' is itself a change from 'unknown'.
    t.update(inside, region, now);
    now += 2000;
    t.update(inside, region, now);

    const emissions = [];
    for (let i = 0; i < 100; i++) {
      now += 500;
      const e = t.update(inside, region, now);
      if (e) emissions.push(e);
    }
    // Transitions, not samples — 100 steady frames must produce zero rows.
    expect(emissions).toHaveLength(0);
  });

  test('a brief blip does not become a violation', () => {
    const t = createAttentionTracker({ absenceMs: 5000 });
    let now = 1000;
    t.update(inside, region, now); now += 2000;
    t.update(inside, region, now);

    // Face missing for one sample, then back.
    now += 500;
    expect(t.update(null, region, now)).toBeNull();
    now += 500;
    expect(t.update(inside, region, now)).toBeNull();
    expect(t.state).toBe('present');
  });

  test('a sustained absence does transition', () => {
    const t = createAttentionTracker({ absenceMs: 5000 });
    let now = 1000;
    t.update(inside, region, now); now += 2000;
    t.update(inside, region, now);

    let transition = null;
    for (let i = 0; i < 20 && !transition; i++) {
      now += 500;
      transition = t.update(null, region, now);
    }
    expect(transition).toMatchObject({ to: 'absent' });
  });

  test('leaving the safe region transitions to away, and returning recovers', () => {
    const t = createAttentionTracker({ awayMs: 4000, recoverMs: 1500 });
    let now = 1000;
    t.update(inside, region, now); now += 2000;
    t.update(inside, region, now);

    const outside = sample(0.98, 0.5);
    let away = null;
    for (let i = 0; i < 20 && !away; i++) { now += 500; away = t.update(outside, region, now); }
    expect(away).toMatchObject({ to: 'away' });

    let back = null;
    for (let i = 0; i < 20 && !back; i++) { now += 500; back = t.update(inside, region, now); }
    expect(back).toMatchObject({ to: 'present' });
    expect(back.durationMs).toBeGreaterThan(0);
  });
});
