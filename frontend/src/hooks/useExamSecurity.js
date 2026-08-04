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
 * (from Phase 2) the server-side ledger without any of them re-deriving state.
 *
 * @param {object}   opts
 * @param {boolean}  opts.active     monitoring runs only while true
 * @param {object}   opts.policy     partial policy, merged over DEFAULT_POLICY
 * @param {function} opts.onEvent    called with each {type, severity, ts, seq, ...}
 * @param {string}   opts.seqKey     localStorage key so the sequence survives a refresh
 *
 * @returns {{
 *   violations: number, isFullscreen: boolean, fullscreenSupported: boolean,
 *   enterFullscreen: function, emit: function
 * }}
 */
export default function useExamSecurity({ active, policy: policyOverrides, onEvent, seqKey } = {}) {
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

  // Monotonic per-attempt sequence. Persisted so a refresh cannot silently
  // restart it at 0 — the server uses gaps in this number as its own signal.
  const seqRef = useRef(0);
  useEffect(() => {
    if (!seqKey) return;
    const stored = parseInt(sessionStorage.getItem(seqKey) || '0', 10);
    if (!Number.isNaN(stored)) seqRef.current = stored;
  }, [seqKey]);

  const emit = useCallback((type, extra = {}) => {
    const seq = ++seqRef.current;
    if (seqKey) {
      try { sessionStorage.setItem(seqKey, String(seq)); } catch { /* private mode */ }
    }
    const event = {
      type,
      severity: severityOf(type),
      ts: Date.now(),
      seq,
      ...extra,
    };
    // Only deterministic browser facts move the violation counter. Soft
    // signals (Phase 4 face detection) are review flags and must never land
    // here — see the HARD/SOFT split in utils/proctorEvents.js.
    if (HARD_EVENTS.has(type)) {
      setViolations((v) => v + 1);
    }
    onEventRef.current?.(event);
    return event;
  }, [seqKey]);

  const enterFullscreen = useCallback(async () => {
    if (!fullscreenSupported) {
      emit(EVENT.FULLSCREEN_UNSUPPORTED, { reason: isIOS() ? 'ios' : 'no_api' });
      return false;
    }
    return requestFullscreen();
  }, [emit, fullscreenSupported]);

  // ── Focus / visibility state machine ───────────────────────────────────
  useEffect(() => {
    if (!active) return;

    // A real tab switch fires blur AND visibilitychange together. Tracking
    // which span is already open keeps that from counting twice.
    let awayStart = null;      // set while the tab is hidden
    let blurTimer = null;      // grace timer for a plain window blur
    let blurStart = null;      // set once a blur has been *confirmed*

    const handleVisibilityChange = () => {
      const p = policyRef.current;
      if (!p.detectTabSwitch) return;

      if (document.hidden) {
        // Hidden supersedes blur: cancel any pending grace timer so the same
        // switch cannot be reported as both a blur and a tab switch.
        if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
        awayStart = Date.now();
        emit(EVENT.TAB_HIDDEN);
      } else if (awayStart !== null) {
        emit(EVENT.TAB_VISIBLE, { durationMs: Date.now() - awayStart });
        awayStart = null;
      }
    };

    const handleBlur = () => {
      const p = policyRef.current;
      if (!p.detectWindowBlur) return;
      // If the page is already hidden this blur belongs to a tab switch that
      // visibilitychange is handling.
      if (document.hidden || blurTimer || blurStart !== null) return;

      // Grace period: an accidental focus flicker is not misconduct. Only a
      // blur that persists gets reported.
      blurTimer = setTimeout(() => {
        blurTimer = null;
        if (document.hidden) return;   // became a tab switch after all
        blurStart = Date.now();
        emit(EVENT.WINDOW_BLUR);
      }, p.blurGraceMs);
    };

    const handleFocus = () => {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
      if (blurStart !== null) {
        emit(EVENT.WINDOW_FOCUS, { durationMs: Date.now() - blurStart });
        blurStart = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [active, emit]);

  // ── Fullscreen tracking ────────────────────────────────────────────────
  // The previous implementation requested fullscreen and then never looked
  // again, so pressing Esc silently ended enforcement.
  useEffect(() => {
    if (!active) return;

    const handler = () => {
      const now = checkFullscreen();
      setIsFullscreen((was) => {
        if (was === now) return was;
        if (!policyRef.current.requireFullscreen) return now;
        // Exiting fullscreen to switch tabs also hides the page; let the
        // visibility handler own that one rather than double-reporting.
        if (!now && !document.hidden) emit(EVENT.FULLSCREEN_EXITED);
        else if (now) emit(EVENT.FULLSCREEN_ENTERED);
        return now;
      });
    };

    return onFullscreenChange(handler);
  }, [active, emit]);

  // ── Blocked interactions ───────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;

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
  }, [active, emit]);

  // ── Network ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const goOffline = () => emit(EVENT.NETWORK_OFFLINE);
    const goOnline = () => emit(EVENT.NETWORK_ONLINE);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [active, emit]);

  return { violations, isFullscreen, fullscreenSupported, enterFullscreen, emit };
}
