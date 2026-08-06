// State that has to survive the hop from the pre-flight gate to the exam.
//
// A module singleton rather than React context or a layout route. A
// MediaStream is a device handle, not render state: every consumer wants it
// from a ref (the frame pump, the track-health handlers), so pushing it
// through render would only add churn. SPA navigation keeps the JS realm
// alive, so the singleton survives the route change for free.
//
// The hazard of a singleton is a camera left running. Four things close that:
// the gate releases on unmount unless it handed off, the exam page releases on
// unmount and at submit, `begin()` releases anything belonging to a different
// exam, and a pagehide listener releases on navigation away.

import { EVENT, severityOf } from './proctorEvents';
import { acquireCameraStream, releaseStream } from './camera';

/**
 * The event ledger, shared between the gate and the exam page.
 *
 * The gate emits camera events before the attempt exists, so they cannot be
 * POSTed yet — they sit here until the exam page's first autosave. Sequence
 * numbers come from the same sessionStorage key useExamSecurity uses, so the
 * two halves produce one gapless stream. The server treats a gap as a signal
 * in its own right; two independent counters would manufacture one.
 */
function createLedger() {
  let seqKey = null;
  let buffer = [];

  const readSeq = () => {
    if (!seqKey) return 0;
    const stored = parseInt(sessionStorage.getItem(seqKey) || '0', 10);
    return Number.isNaN(stored) ? 0 : stored;
  };

  return {
    configure(key) { seqKey = key; },

    emit(type, extra = {}) {
      const seq = readSeq() + 1;
      if (seqKey) {
        try { sessionStorage.setItem(seqKey, String(seq)); } catch { /* private mode */ }
      }
      const event = { type, severity: severityOf(type), ts: Date.now(), seq, ...extra };
      buffer.push(event);
      return event;
    },

    /** Hand the buffered events to whoever is about to POST them. */
    take() {
      const taken = buffer;
      buffer = [];
      return taken;
    },

    /** A failed flush returns them here, ahead of anything newer. */
    giveBack(events) {
      if (events?.length) buffer = [...events, ...buffer];
    },

    get size() { return buffer.length; },

    reset() { buffer = []; },
  };
}

let pageHideBound = false;

export const examSession = {
  key: null,

  stream: null,
  cameraStatus: 'idle',       // idle | active | denied | dismissed | unavailable
  cameraReason: null,
  unproctoredReason: null,

  // The calibrated safe region, built on the gate where the student can see
  // themselves, and carried into the exam so it does not have to be rebuilt
  // against the exam clock.
  region: null,

  // { id, expiresAt, savedAnswers } from POST /start, so the exam page does
  // not repeat the request — one fewer round trip at cohort-start peak.
  attempt: null,

  fullscreenEntered: false,
  handoff: false,

  ledger: createLedger(),

  /** Start (or resume) a session for this student and exam. */
  begin({ userId, examId }) {
    const key = `${userId}:${examId}`;
    if (this.key === key) return;
    // A different exam: whatever the previous one held is not ours to keep.
    this.release();
    this.key = key;
    this.cameraStatus = 'idle';
    this.cameraReason = null;
    this.unproctoredReason = null;
    this.region = null;
    this.attempt = null;
    this.fullscreenEntered = false;
    this.handoff = false;
    this.ledger.reset();
    this.ledger.configure(`examSeq-${userId}-${examId}`);

    if (!pageHideBound && typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => examSession.release());
      pageHideBound = true;
    }
  },

  matches({ userId, examId }) {
    return this.key === `${userId}:${examId}`;
  },

  /**
   * Ask for the camera from a real click, while still windowed.
   *
   * Order matters and is the whole point of the gate: the permission prompt
   * resolves before anything goes fullscreen, so Chrome never has to drop out
   * of fullscreen to show it.
   */
  async acquireCamera() {
    const outcome = await acquireCameraStream();

    this.stream = outcome.stream;
    this.cameraStatus = outcome.status;
    this.cameraReason = outcome.reason;
    this.unproctoredReason = outcome.status === 'active'
      ? null
      : `camera_${outcome.status}`;

    this.ledger.emit(outcome.event, {
      ...(outcome.reason && { reason: outcome.reason }),
      stage: 'preflight',
    });

    return outcome;
  },

  /** Give up on the camera and sit the exam unproctored. */
  continueWithoutCamera() {
    if (this.cameraStatus === 'idle') {
      this.cameraStatus = 'unavailable';
      this.cameraReason = 'skipped';
      this.unproctoredReason = 'camera_skipped';
      this.ledger.emit(EVENT.CAMERA_UNAVAILABLE, {
        reason: 'skipped_by_student', stage: 'preflight',
      });
    }
  },

  /** What the browser could actually offer. Persisted by POST /start. */
  preflightSummary() {
    return {
      camera: this.cameraStatus,
      fullscreen: this.fullscreenEntered,
      faceCalibrated: !!this.region?.ok,
      proctored: this.cameraStatus === 'active',
      unproctoredReason: this.unproctoredReason,
    };
  },

  release() {
    releaseStream(this.stream);
    this.stream = null;
    if (this.cameraStatus === 'active') this.cameraStatus = 'idle';
  },

  /** Full teardown — the exam is over and nothing here should outlive it. */
  end() {
    this.release();
    this.key = null;
    this.attempt = null;
    this.region = null;
    this.handoff = false;
  },
};

export default examSession;
