// Shared vocabulary for exam integrity events.
//
// Two rules govern everything here:
//
//   1. HARD signals are deterministic browser facts (the tab was hidden, the
//      document left fullscreen). They may drive automatic action.
//   2. SOFT signals are inferred or probabilistic (a face left a region, a
//      camera looked idle). They may ONLY raise a review flag.
//
// The split is deliberate and load-bearing: a false positive on a soft signal
// that auto-submits a child's exam is unrecoverable. Keep the two paths apart
// so no future config change can wire a soft signal to an auto-submit.

export const SEVERITY = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export const EVENT = {
  // ── Lifecycle ──
  EXAM_OPENED: 'exam_opened',
  EXAM_SUBMITTED: 'exam_submitted',

  // ── HARD: focus & visibility ──
  TAB_HIDDEN: 'tab_hidden',
  TAB_VISIBLE: 'tab_visible',
  WINDOW_BLUR: 'window_blur',
  WINDOW_FOCUS: 'window_focus',

  // ── HARD: fullscreen ──
  FULLSCREEN_ENTERED: 'fullscreen_entered',
  FULLSCREEN_EXITED: 'fullscreen_exited',
  FULLSCREEN_UNSUPPORTED: 'fullscreen_unsupported',

  // ── LOW: blocked interactions (deterrence telemetry, not misconduct) ──
  COPY_BLOCKED: 'copy_blocked',
  PASTE_BLOCKED: 'paste_blocked',
  CUT_BLOCKED: 'cut_blocked',
  CONTEXT_MENU_BLOCKED: 'context_menu_blocked',
  SHORTCUT_BLOCKED: 'shortcut_blocked',

  // ── Network ──
  NETWORK_OFFLINE: 'network_offline',
  NETWORK_ONLINE: 'network_online',

  // ── Camera (Phase 3) ──
  CAMERA_GRANTED: 'camera_granted',
  CAMERA_DENIED: 'camera_denied',
  CAMERA_LOST: 'camera_lost',
  CAMERA_RESTORED: 'camera_restored',
  CAMERA_UNAVAILABLE: 'camera_unavailable',

  // ── SOFT: face presence & attention (Phase 4) ──
  // Inferred, probabilistic, and therefore review-only. None of these appear
  // in HARD_EVENTS and none may ever end an exam.
  FACE_CALIBRATED: 'face_calibrated',
  FACE_RECALIBRATED: 'face_recalibrated',
  FACE_ABSENT: 'face_absent',
  FACE_OUT_OF_REGION: 'face_out_of_region',
  FACE_RETURNED: 'face_returned',
  FACE_MONITOR_UNAVAILABLE: 'face_monitor_unavailable',
};

// Events that may contribute to automatic enforcement. Everything not in this
// set is advisory only. Checked at the enforcement site, not at the emit site.
export const HARD_EVENTS = new Set([
  EVENT.TAB_HIDDEN,
  EVENT.WINDOW_BLUR,
  EVENT.FULLSCREEN_EXITED,
]);

export const SEVERITY_BY_EVENT = {
  [EVENT.EXAM_OPENED]: SEVERITY.INFO,
  [EVENT.EXAM_SUBMITTED]: SEVERITY.INFO,

  [EVENT.TAB_HIDDEN]: SEVERITY.HIGH,
  [EVENT.TAB_VISIBLE]: SEVERITY.INFO,
  [EVENT.WINDOW_BLUR]: SEVERITY.MEDIUM,
  [EVENT.WINDOW_FOCUS]: SEVERITY.INFO,

  [EVENT.FULLSCREEN_EXITED]: SEVERITY.MEDIUM,
  [EVENT.FULLSCREEN_ENTERED]: SEVERITY.INFO,
  [EVENT.FULLSCREEN_UNSUPPORTED]: SEVERITY.INFO,

  [EVENT.COPY_BLOCKED]: SEVERITY.LOW,
  [EVENT.PASTE_BLOCKED]: SEVERITY.LOW,
  [EVENT.CUT_BLOCKED]: SEVERITY.LOW,
  [EVENT.CONTEXT_MENU_BLOCKED]: SEVERITY.INFO,
  [EVENT.SHORTCUT_BLOCKED]: SEVERITY.LOW,

  [EVENT.NETWORK_OFFLINE]: SEVERITY.LOW,
  [EVENT.NETWORK_ONLINE]: SEVERITY.INFO,

  [EVENT.CAMERA_GRANTED]: SEVERITY.INFO,
  [EVENT.CAMERA_DENIED]: SEVERITY.MEDIUM,
  [EVENT.CAMERA_LOST]: SEVERITY.HIGH,
  [EVENT.CAMERA_RESTORED]: SEVERITY.INFO,
  [EVENT.CAMERA_UNAVAILABLE]: SEVERITY.MEDIUM,

  // Capped at MEDIUM on purpose. These are the events most likely to be
  // wrong, and severity drives what a teacher is asked to review — a
  // misfiring inference must not shout louder than a recorded tab switch.
  [EVENT.FACE_CALIBRATED]: SEVERITY.INFO,
  [EVENT.FACE_RECALIBRATED]: SEVERITY.LOW,
  [EVENT.FACE_ABSENT]: SEVERITY.MEDIUM,
  [EVENT.FACE_OUT_OF_REGION]: SEVERITY.LOW,
  [EVENT.FACE_RETURNED]: SEVERITY.INFO,
  [EVENT.FACE_MONITOR_UNAVAILABLE]: SEVERITY.INFO,
};

// Student-facing copy. Kept here so the exam UI never invents its own wording
// for something that also lands in an admin report.
export const EVENT_MESSAGE = {
  [EVENT.COPY_BLOCKED]: 'Copying is disabled during the exam.',
  [EVENT.PASTE_BLOCKED]: 'Pasting is disabled during the exam.',
  [EVENT.CUT_BLOCKED]: 'Cutting is disabled during the exam.',
  [EVENT.TAB_HIDDEN]: 'You left the exam tab. This has been recorded.',
  [EVENT.WINDOW_BLUR]: 'The exam window lost focus. This has been recorded.',
  [EVENT.FULLSCREEN_EXITED]: 'Fullscreen was exited. Please return to fullscreen.',
  [EVENT.NETWORK_OFFLINE]: 'Connection lost. Your answers are safe on this device.',
  [EVENT.NETWORK_ONLINE]: 'Connection restored.',
  [EVENT.CAMERA_LOST]: 'Camera stopped. Please reconnect it.',
  [EVENT.CAMERA_DENIED]: 'Camera access was denied. You may continue; this is recorded.',
  // Worded as a nudge, not an accusation. The signal is probabilistic and the
  // student may well have done nothing wrong.
  [EVENT.FACE_ABSENT]: 'We can no longer see you on camera.',
  [EVENT.FACE_OUT_OF_REGION]: 'Please face your screen.',
};

// The default policy — every capability independently switchable. Phase 1
// replaces this at runtime with the exam's resolved ProctorProfile; until then
// it reproduces the behaviour that shipped before this work.
export const DEFAULT_POLICY = {
  // Browser restrictions
  disableRightClick: true,
  disableCopy: true,
  disablePaste: true,
  disableShortcuts: true,
  warnOnUnload: true,

  // Focus & visibility
  detectTabSwitch: true,
  detectWindowBlur: true,
  // Grace before a blur counts. Clicking the OS clock or an accidental focus
  // flicker should not be a violation; genuinely switching away lasts longer.
  blurGraceMs: 1200,

  // Fullscreen
  requireFullscreen: true,
  // Fullscreen cannot be enforced where the browser has no API for it
  // (iOS Safari on non-video elements). Degrade instead of locking students out.
  fullscreenSoftFail: true,

  // Enforcement — HARD signals only
  maxViolations: 3,
  autoSubmitOnMaxViolations: true,
};

export function severityOf(type) {
  const s = SEVERITY_BY_EVENT[type];
  return s === undefined ? SEVERITY.INFO : s;
}
