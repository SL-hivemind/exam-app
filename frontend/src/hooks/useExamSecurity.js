import { useEffect, useRef, useState, useCallback } from 'react';
import {
  EVENT,
  DEFAULT_POLICY,
  HARD_EVENTS,
  severityOf,
} from '../utils/proctorEvents';
import {
  isFullscreen as checkFullscreen,
  isFullscreenSupported,
  isIOS,
  requestFullscreen,
  onFullscreenChange,
} from '../utils/fullscreen';

/**
 * Browser-level exam integrity monitoring.
 *
 * Emits structured events rather than firing callbacks with bare strings, so
 * the same stream can drive the on-screen warning, the violation counter, and
 * the server-side ledger without any of them re-deriving state.
 *
 * Recording and counting are separate. Every event is always recorded; only
 * some of them are counted. A camera permission prompt makes Chrome drop
 * fullscreen and steal focus, and charging that to the student cost two of
 * their three violations before they had answered a question. Suppression
 * windows exist for exactly that class of self-inflicted event.
 *
 * @param {object}   opts
 * @param {boolean}  opts.armed      listeners attach, and HARD events count
 * @param {object}   opts.policy     partial policy, merged over DEFAULT_POLICY
 * @param {function} opts.onEvent    called with each {type, severity, ts, seq, ...}
 * @param {string}   opts.seqKey     sessionStorage key so the sequence survives a refresh
 *
 * @returns {{
 *   violations: number, isFullscreen: boolean, fullscreenSupported: boolean,
 *   enterFullscreen: function, emit: function,
 *   suppress: function, disarm: function
 * }}
 */
export default function useExamSecurity({ armed, policy: policyOverrides, onEvent, seqKey } = {}) {
  const policy = { ...DEFAULT_POLICY, ...(policyOverrides || {}) };

  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(checkFullscreen);

  // Fullscreen support is a property of the browser, not of this render.
  const fullscreenSupported = useRef(isFullscreenSupported() && !isIOS()).current;

  // Callbacks and policy live in refs so that changing them never tears down
  // and re-registers the listeners — re-registering mid-exam loses the
  // in-flight state machine (an open blur grace timer, an unclosed away span).
  const onEventRef = useRef(onEvent);
  const policyRef = useRef(policy);
  useEffect(() => { onEventRef.current = onEvent; });
  useEffect(() => { policyRef.current = policy; });

  // ── The counting gate ──────────────────────────────────────────────────
  //
  // Refs, not state: a suppression window has to take effect in the same tick
  // it is opened. `suppress()` is called immediately before the thing it is
  // protecting against (a getUserMedia call, a submit), and a queued state
  // update would land after the event it was meant to cover.
  const gateRef = useRef({ armed: false, armedAt: 0, holds: new Map(), nextId: 1 });

  useEffect(() => {
    const gate = gateRef.current;
    if (armed && !gate.armed) {
      gate.armed = true;
      gate.armedAt = Date.now();
    } else if (!armed) {
      gate.armed = false;
      gate.holds.clear();
    }
  }, [armed]);

  const gateState = useCallback((now) => {
    const gate = gateRef.current;
    if (!gate.armed) return { counts: false, reason: 'disarmed' };
    for (const hold of gate.holds.values()) {
      if (hold.until > now) return { counts: false, reason: hold.reason };
    }
    const warmupMs = policyRef.current.armWarmupMs ?? 1500;
    if (now - gate.armedAt < warmupMs) return { counts: false, reason: 'warmup' };
    return { counts: true, reason: null };
  }, []);

  /**
   * Open a window during which HARD events are recorded but not counted.
   * Returns an idempotent release; the `ms` cap is a backstop for a release
   * that never runs (a rejected promise, an unmounted component).
   */
  const suppress = useCallback((reason, ms = 8000) => {
    const gate = gateRef.current;
    const id = gate.nextId++;
    gate.holds.set(id, { reason, until: Date.now() + ms });
    return () => { gate.holds.delete(id); };
  }, []);

  // Monotonic per-attempt sequence. Persisted so a refresh cannot silently
  // restart it at 0 — the server uses gaps in this number as its own signal.
  const seqRef = useRef(0);
  useEffect(() => {
    if (!seqKey) return;
    const stored = parseInt(sessionStorage.getItem(seqKey) || '0', 10);
    if (!Number.isNaN(stored)) seqRef.current = stored;
  }, [seqKey]);

  // The focus/visibility state machine. In a ref rather than effect-local
  // closures: any re-run of that effect used to drop an open away-span on the
  // floor, so a tab switch in progress when the policy changed was never
  // closed and its duration was lost.
  const focusRef = useRef({ awayStart: null, blurTimer: null, blurStart: null });

  // Repeat suppression. Safari fires both `fullscreenchange` and
  // `webkitfullscreenchange` for one transition, and onFullscreenChange
  // registers the handler on every vendor name.
  const lastEmitRef = useRef(new Map());

  const emit = useCallback((type, extra = {}) => {
    const now = Date.now();

    const dedupMs = policyRef.current.dedupMs ?? 250;
    const previous = lastEmitRef.current.get(type);
    if (previous !== undefined && now - previous < dedupMs) return null;
    lastEmitRef.current.set(type, now);

    const seq = ++seqRef.current;
    if (seqKey) {
      try { sessionStorage.setItem(seqKey, String(seq)); } catch { /* private mode */ }
    }

    const gate = gateState(now);
    const isHard = HARD_EVENTS.has(type);
    const gated = isHard && !gate.counts;

    const event = {
      type,
      severity: severityOf(type),
      ts: now,
      seq,
      ...extra,
      // Recorded either way. The flag is what stops the server counting it
      // toward an auto-submit — both sides have to agree, or an honest
      // auto-submit fails its own evidence check.
      ...(gated && { suppressed: true, suppressReason: gate.reason }),
    };

    // Only deterministic browser facts move the violation counter. Soft
    // signals (face detection) are review flags and must never land here —
    // see the HARD/SOFT split in utils/proctorEvents.js.
    if (isHard && gate.counts) {
      setViolations((v) => v + 1);
    }
    onEventRef.current?.(event);
    return event;
  }, [seqKey, gateState]);

  /**
   * Stop counting, synchronously, and close any open span.
   *
   * Must be the first statement of the submit handler. `setSubmitted(true)` is
   * async state, so a fullscreen event fired in the same tick would still see
   * the exam as running and charge a violation on the way out.
   */
  const disarm = useCallback(() => {
    gateRef.current.armed = false;
    const focus = focusRef.current;
    if (focus.blurTimer) { clearTimeout(focus.blurTimer); focus.blurTimer = null; }
    if (focus.blurStart !== null) {
      emit(EVENT.WINDOW_FOCUS, { durationMs: Date.now() - focus.blurStart });
      focus.blurStart = null;
    }
    if (focus.awayStart !== null) {
      emit(EVENT.TAB_VISIBLE, { durationMs: Date.now() - focus.awayStart });
      focus.awayStart = null;
    }
  }, [emit]);

  const enterFullscreen = useCallback(async () => {
    if (!fullscreenSupported) {
      emit(EVENT.FULLSCREEN_UNSUPPORTED, { reason: isIOS() ? 'ios' : 'no_api' });
      return false;
    }
    // Re-entering fires an exit→enter pair on some browsers. The student is
    // doing what we asked them to; do not charge them for the transition.
    const release = suppress('fullscreen_reentry', 3000);
    try {
      return await requestFullscreen();
    } finally {
      setTimeout(release, 1000);
    }
  }, [emit, suppress, fullscreenSupported]);

  // ── Focus / visibility state machine ───────────────────────────────────
  useEffect(() => {
    if (!armed) return;

    // A real tab switch fires blur AND visibilitychange together. Tracking
    // which span is already open keeps that from counting twice.
    const focus = focusRef.current;

    const handleVisibilityChange = () => {
      const p = policyRef.current;
      if (!p.detectTabSwitch) return;

      if (document.hidden) {
        // Hidden supersedes blur: cancel any pending grace timer so the same
        // switch cannot be reported as both a blur and a tab switch.
        if (focus.blurTimer) { clearTimeout(focus.blurTimer); focus.blurTimer = null; }
        focus.awayStart = Date.now();
        emit(EVENT.TAB_HIDDEN);
      } else if (focus.awayStart !== null) {
        emit(EVENT.TAB_VISIBLE, { durationMs: Date.now() - focus.awayStart });
        focus.awayStart = null;
      }
    };

    const handleBlur = () => {
      const p = policyRef.current;
      if (!p.detectWindowBlur) return;
      // If the page is already hidden this blur belongs to a tab switch that
      // visibilitychange is handling.
      if (document.hidden || focus.blurTimer || focus.blurStart !== null) return;

      // Grace period: an accidental focus flicker is not misconduct. Only a
      // blur that persists gets reported.
      focus.blurTimer = setTimeout(() => {
        focus.blurTimer = null;
        if (document.hidden) return;   // became a tab switch after all
        focus.blurStart = Date.now();
        emit(EVENT.WINDOW_BLUR);
      }, p.blurGraceMs);
    };

    const handleFocus = () => {
      if (focus.blurTimer) { clearTimeout(focus.blurTimer); focus.blurTimer = null; }
      if (focus.blurStart !== null) {
        emit(EVENT.WINDOW_FOCUS, { durationMs: Date.now() - focus.blurStart });
        focus.blurStart = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (focus.blurTimer) { clearTimeout(focus.blurTimer); focus.blurTimer = null; }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [armed, emit]);

  // ── Fullscreen tracking ────────────────────────────────────────────────
  // The previous implementation requested fullscreen and then never looked
  // again, so pressing Esc silently ended enforcement.
  const fsRef = useRef(checkFullscreen());
  useEffect(() => {
    if (!armed) return;

    const handler = () => {
      const now = checkFullscreen();
      // Assigned synchronously, before any emit. The guard used to live inside
      // a setState updater, which React may invoke twice in StrictMode and
      // which does not run at all until the update is processed — so two
      // vendor events for one transition both got through.
      if (fsRef.current === now) return;
      fsRef.current = now;
      setIsFullscreen(now);

      if (!policyRef.current.requireFullscreen) return;
      // Exiting fullscreen to switch tabs also hides the page; let the
      // visibility handler own that one rather than double-reporting.
      if (!now && !document.hidden) emit(EVENT.FULLSCREEN_EXITED);
      else if (now) emit(EVENT.FULLSCREEN_ENTERED);
    };

    return onFullscreenChange(handler);
  }, [armed, emit]);

  // ── Blocked interactions ───────────────────────────────────────────────
  useEffect(() => {
    if (!armed) return;

    const handleContextMenu = (e) => {
      if (!policyRef.current.disableRightClick) return;
      e.preventDefault();
      emit(EVENT.CONTEXT_MENU_BLOCKED);
    };

    const handleClipboard = (e) => {
      const p = policyRef.current;
      const map = {
        copy: [p.disableCopy, EVENT.COPY_BLOCKED],
        cut: [p.disableCopy, EVENT.CUT_BLOCKED],
        paste: [p.disablePaste, EVENT.PASTE_BLOCKED],
      };
      const [enabled, type] = map[e.type] || [];
      if (!enabled) return;
      e.preventDefault();
      // Previously an alert() here — which blocks the event loop, freezes the
      // countdown paint, and needs a click to clear. The page renders a
      // transient notice from this event instead.
      emit(type);
    };

    const handleKeyDown = (e) => {
      if (!policyRef.current.disableShortcuts) return;
      const k = (e.key || '').toLowerCase();
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
        (e.ctrlKey && ['c', 'v', 'x', 'u', 's', 'p', 'a', 'r'].includes(k)) ||
        (e.metaKey && ['c', 'v', 'x', 's', 'p', 'a', 'r'].includes(k)) ||
        e.key === 'F5';

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        emit(EVENT.SHORTCUT_BLOCKED, { key: e.key });
      }
      // Note: Alt+Tab, Cmd+Tab and the Windows key are handled by the OS and
      // never reach the page. The old code claimed to block Alt+Tab; it could
      // not. Those switches surface through the visibility handler instead.
    };

    const handleBeforeUnload = (e) => {
      if (!policyRef.current.warnOnUnload) return;
      e.preventDefault();
      e.returnValue = '';   // custom text is ignored by every modern browser
      return '';
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('paste', handleClipboard);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('paste', handleClipboard);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [armed, emit]);

  // ── Network ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!armed) return;
    const goOffline = () => emit(EVENT.NETWORK_OFFLINE);
    const goOnline = () => emit(EVENT.NETWORK_ONLINE);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [armed, emit]);

  return {
    violations, isFullscreen, fullscreenSupported,
    enterFullscreen, emit, suppress, disarm,
  };
}
