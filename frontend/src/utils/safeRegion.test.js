import {
  buildSafeRegion, isInsideRegion, driftRegion, createAttentionTracker,
  median, iqr, DEVICE_PROFILES, MAX_DRIFT_PER_HOUR, CALIBRATION_FRAMES,
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
  test('follows a student who settles into a new position', () => {
    const region = buildSafeRegion(steadySamples(), 'laptop');
    let drifted = region;
    for (let i = 0; i < 50; i++) {
      drifted = driftRegion(drifted, sample(0.5, 0.56), 60000);
    }
    expect(drifted.cy).toBeGreaterThan(region.cy);
  });

  test('cannot be walked onto the notes in a student\'s lap', () => {
    // The attack: hold a position slightly low, repeatedly, for an hour and
    // hope the safe region follows you all the way down.
    const region = buildSafeRegion(steadySamples(), 'laptop');
    let drifted = region;
    for (let i = 0; i < 2000; i++) {
      drifted = driftRegion(drifted, sample(0.5, 1.0), 1800);   // 1hr total
    }
    expect(Math.abs(drifted.cy - region.baseCy)).toBeLessThanOrEqual(MAX_DRIFT_PER_HOUR + 1e-9);
  });

  test('does not mutate the region it is given', () => {
    const region = buildSafeRegion(steadySamples(), 'laptop');
    const before = region.cy;
    driftRegion(region, sample(0.5, 0.9), 60000);
    expect(region.cy).toBe(before);
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
