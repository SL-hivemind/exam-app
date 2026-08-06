// Camera acquisition, in one place.
//
// Both the pre-flight gate and the in-exam monitor need to ask for a camera
// and interpret the same handful of DOMException names. The classification
// below is the difference between telling a student "your camera is blocked,
// here is how to unblock it" and "something went wrong" — worth getting right
// once rather than twice.

import { EVENT } from './proctorEvents';

// Modest on purpose: this only needs to know a camera is producing frames.
// Low resolution keeps the cost down on cheap Androids, and BlazeFace resizes
// to 128x128 internally anyway, so a bigger frame buys no accuracy.
export const CAMERA_CONSTRAINTS = {
  video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 10 } },
  audio: false,
};

/**
 * What the browser already knows, before we prompt.
 *
 * Lets the gate say "Chrome will ask you next" versus "camera is blocked for
 * this site" instead of guessing. Unsupported in Safari, and Firefox throws on
 * `name: 'camera'` rather than returning anything, so treat every failure as
 * "we don't know" — never as a denial.
 *
 * @returns {Promise<'granted'|'denied'|'prompt'|'unknown'>}
 */
export async function probeCameraPermission() {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const result = await navigator.permissions.query({ name: 'camera' });
    return result?.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * True when getUserMedia cannot possibly work here, so the UI should not
 * offer a retry button. The common cause is a plain-HTTP LAN address:
 * getUserMedia requires a secure context.
 */
export function cameraApiUnavailable() {
  return !navigator.mediaDevices?.getUserMedia;
}

/**
 * Ask for the camera and classify the outcome.
 *
 * Never throws. Every failure mode is a described outcome, because the caller
 * always has to keep going — a camera problem must not stop a student sitting
 * an exam they are entitled to sit.
 *
 * @returns {Promise<{status: string, stream: MediaStream|null,
 *                    event: string, reason: string|null}>}
 *   status is one of: active | denied | dismissed | unavailable
 */
export async function acquireCameraStream() {
  if (cameraApiUnavailable()) {
    return {
      status: 'unavailable',
      stream: null,
      event: EVENT.CAMERA_UNAVAILABLE,
      reason: window.isSecureContext ? 'no_api' : 'insecure_context',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    return { status: 'active', stream, event: EVENT.CAMERA_GRANTED, reason: null };
  } catch (err) {
    const name = err?.name || 'Error';

    if (name === 'NotAllowedError' || name === 'SecurityError') {
      // Blocked and dismissed both surface as NotAllowedError, but they need
      // different copy: one needs site settings, the other just needs the
      // student to answer the prompt this time. The permission state after
      // the fact is what tells them apart.
      const state = await probeCameraPermission();
      const dismissed = state === 'prompt';
      return {
        status: dismissed ? 'dismissed' : 'denied',
        stream: null,
        event: EVENT.CAMERA_DENIED,
        reason: dismissed ? 'dismissed' : 'blocked',
      };
    }

    // NotFoundError (no camera), NotReadableError (another app holds it),
    // OverconstrainedError. None of these are the student's fault.
    return {
      status: 'unavailable',
      stream: null,
      event: EVENT.CAMERA_UNAVAILABLE,
      reason: name,
    };
  }
}

/** Stop every track and detach the handlers, so the camera light goes out. */
export function releaseStream(stream) {
  stream?.getTracks().forEach((track) => {
    track.onended = null;
    track.onmute = null;
    track.onunmute = null;
    track.stop();
  });
}
