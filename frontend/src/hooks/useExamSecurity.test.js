/**
 * Tests for the arming gate.
 *
 * This hook had no tests, and the entire bug class it now guards against lived
 * in it: a camera permission prompt makes Chrome drop fullscreen and steal
 * focus, which charged the student two of their three violations for clicking
 * "Allow". The guarantees below are what stop that recurring.
 */
import { act, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';

import useExamSecurity from './useExamSecurity';
import { EVENT } from '../utils/proctorEvents';

// jsdom has no Fullscreen API at all. Model just enough of it: a settable
// `document.fullscreenElement` and the four vendor change events, which is
// exactly the surface utils/fullscreen.js touches.
function setFullscreen(on) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => (on ? document.documentElement : null),
  });
}

function fireFullscreenChange(eventName = 'fullscreenchange') {
  document.dispatchEvent(new Event(eventName));
}

function setHidden(hidden) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  setFullscreen(false);
  setHidden(false);
  sessionStorage.clear();
  // The real API is absent in jsdom, so `isFullscreenSupported()` is false and
  // the fullscreen policy branch would be skipped. Give it something to find.
  document.documentElement.requestFullscreen = jest.fn(() => Promise.resolve());
});

afterEach(() => {
  jest.useRealTimers();
  delete document.documentElement.requestFullscreen;
});

function setup(props = {}) {
  const events = [];
  const utils = renderHook((p) => useExamSecurity(p), {
    initialProps: {
      armed: true,
      onEvent: (e) => events.push(e),
      seqKey: 'test-seq',
      ...props,
    },
  });
  return { ...utils, events };
}

/** Advance past the arming warmup so events start counting. */
function passWarmup() {
  act(() => { jest.advanceTimersByTime(2000); });
}

describe('arming warmup', () => {
  test('a fullscreen exit during warmup is recorded but not counted', () => {
    const { result, events } = setup();

    // Fullscreen drops immediately after arming — exactly what Chrome does
    // when it renders the camera permission bubble.
    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => fireFullscreenChange());

    const exit = events.find((e) => e.type === EVENT.FULLSCREEN_EXITED);
    expect(exit).toBeDefined();
    expect(exit.suppressed).toBe(true);
    expect(exit.suppressReason).toBe('warmup');
    expect(result.current.violations).toBe(0);
  });

  test('the same exit after warmup does count', () => {
    const { result, events } = setup();
    passWarmup();

    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => fireFullscreenChange());

    const exit = events.find((e) => e.type === EVENT.FULLSCREEN_EXITED);
    expect(exit.suppressed).toBeUndefined();
    expect(result.current.violations).toBe(1);
  });

  test('a tab switch during warmup is recorded but not counted', () => {
    const { result, events } = setup();

    setHidden(true);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });

    const hidden = events.find((e) => e.type === EVENT.TAB_HIDDEN);
    expect(hidden.suppressed).toBe(true);
    expect(result.current.violations).toBe(0);
  });
});

describe('suppression windows', () => {
  test('an event inside a window is flagged, not counted', () => {
    const { result, events } = setup();
    passWarmup();

    act(() => { result.current.suppress('camera_prompt', 20000); });

    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => fireFullscreenChange());

    const exit = events.find((e) => e.type === EVENT.FULLSCREEN_EXITED);
    expect(exit.suppressed).toBe(true);
    expect(exit.suppressReason).toBe('camera_prompt');
    expect(result.current.violations).toBe(0);
  });

  test('releasing the window restores counting', () => {
    const { result } = setup();
    passWarmup();

    let release;
    act(() => { release = result.current.suppress('camera_prompt', 20000); });
    act(() => { release(); });

    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => fireFullscreenChange());

    expect(result.current.violations).toBe(1);
  });

  test('a window expires on its own if the release never runs', () => {
    const { result } = setup();
    passWarmup();

    // The release is a backstop for a rejected promise or an unmounted
    // component — the window must not last for the rest of the exam.
    act(() => { result.current.suppress('camera_prompt', 5000); });
    act(() => { jest.advanceTimersByTime(6000); });

    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => fireFullscreenChange());

    expect(result.current.violations).toBe(1);
  });

  test('overlapping windows each hold the gate independently', () => {
    const { result } = setup();
    passWarmup();

    let releaseA;
    act(() => {
      releaseA = result.current.suppress('camera_prompt', 20000);
      result.current.suppress('submitting', 20000);
    });
    act(() => { releaseA(); });

    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => fireFullscreenChange());

    // The second window is still open.
    expect(result.current.violations).toBe(0);
  });
});

describe('fullscreen change handling', () => {
  test('Safari firing two vendor events for one transition emits once', () => {
    const { result, events } = setup();
    passWarmup();

    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => {
      // Safari dispatches both for a single transition.
      fireFullscreenChange('fullscreenchange');
      fireFullscreenChange('webkitfullscreenchange');
    });

    const exits = events.filter((e) => e.type === EVENT.FULLSCREEN_EXITED);
    expect(exits).toHaveLength(1);
    expect(result.current.violations).toBe(1);
  });

  test('StrictMode double-rendering does not double-count', () => {
    const events = [];
    renderHook((p) => useExamSecurity(p), {
      wrapper: StrictMode,
      initialProps: {
        armed: true,
        onEvent: (e) => events.push(e),
        seqKey: 'strict-seq',
      },
    });
    act(() => { jest.advanceTimersByTime(2000); });

    setFullscreen(true);
    act(() => fireFullscreenChange());
    setFullscreen(false);
    act(() => fireFullscreenChange());

    expect(events.filter((e) => e.type === EVENT.FULLSCREEN_EXITED)).toHaveLength(1);
  });

  test('exiting fullscreen to switch tabs is reported once, by the tab handler', () => {
    const { events } = setup();
    passWarmup();

    setFullscreen(true);
    act(() => fireFullscreenChange());

    // A tab switch hides the page and drops fullscreen together.
    setHidden(true);
    setFullscreen(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      fireFullscreenChange();
    });

    expect(events.filter((e) => e.type === EVENT.TAB_HIDDEN)).toHaveLength(1);
    expect(events.filter((e) => e.type === EVENT.FULLSCREEN_EXITED)).toHaveLength(0);
  });
});

describe('disarm', () => {
  test('stops counting synchronously, in the same tick', () => {
    const { result } = setup();
    passWarmup();

    act(() => {
      // No re-render between these two — this is the submit handler's tick.
      result.current.disarm();
      setFullscreen(true);
      fireFullscreenChange();
      setFullscreen(false);
      fireFullscreenChange();
    });

    expect(result.current.violations).toBe(0);
  });

  test('closes an open blur span rather than losing it', () => {
    const { result, events } = setup({ policy: { blurGraceMs: 100 } });
    passWarmup();

    act(() => { window.dispatchEvent(new Event('blur')); });
    act(() => { jest.advanceTimersByTime(200); });     // grace elapses, blur confirmed
    expect(events.some((e) => e.type === EVENT.WINDOW_BLUR)).toBe(true);

    act(() => { result.current.disarm(); });

    const focus = events.find((e) => e.type === EVENT.WINDOW_FOCUS);
    expect(focus).toBeDefined();
    expect(focus.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('closes an open away span rather than losing it', () => {
    const { result, events } = setup();
    passWarmup();

    setHidden(true);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { result.current.disarm(); });

    expect(events.some((e) => e.type === EVENT.TAB_VISIBLE)).toBe(true);
  });
});

describe('blur grace', () => {
  test('a flicker shorter than the grace is not reported at all', () => {
    const { result, events } = setup({ policy: { blurGraceMs: 1200 } });
    passWarmup();

    act(() => { window.dispatchEvent(new Event('blur')); });
    act(() => { jest.advanceTimersByTime(300); });
    act(() => { window.dispatchEvent(new Event('focus')); });
    act(() => { jest.advanceTimersByTime(2000); });

    expect(events.some((e) => e.type === EVENT.WINDOW_BLUR)).toBe(false);
    expect(result.current.violations).toBe(0);
  });

  test('the blur state survives a policy change mid-span', () => {
    // The state machine used to live in effect-local closures, so re-running
    // the effect dropped an open span on the floor.
    const { result, rerender, events } = setup({ policy: { blurGraceMs: 100 } });
    passWarmup();

    act(() => { window.dispatchEvent(new Event('blur')); });
    act(() => { jest.advanceTimersByTime(200); });

    rerender({
      armed: true,
      onEvent: (e) => events.push(e),
      seqKey: 'test-seq',
      policy: { blurGraceMs: 900 },
    });

    act(() => { window.dispatchEvent(new Event('focus')); });

    const focus = events.find((e) => e.type === EVENT.WINDOW_FOCUS);
    expect(focus).toBeDefined();
    expect(result.current.violations).toBe(1);
  });
});

describe('sequence numbers', () => {
  test('are monotonic and survive a remount', () => {
    const first = setup();
    passWarmup();
    act(() => { first.result.current.emit(EVENT.COPY_BLOCKED); });
    first.unmount();

    const second = setup();
    act(() => { second.result.current.emit(EVENT.PASTE_BLOCKED); });

    const seqs = [...first.events, ...second.events].map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });
});
