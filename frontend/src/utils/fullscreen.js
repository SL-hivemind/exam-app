// Cross-browser fullscreen helpers.
//
// Two things bite here and both are handled below:
//
//   1. Safari (desktop and iPadOS) only exposes the webkit-prefixed API.
//   2. requestFullscreen() must be called from a user gesture. Firefox and
//      Safari reject a call made from inside a useEffect, silently. That is
//      why the exam has to enter fullscreen from a real click.

export function fullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

export function isFullscreen() {
  return fullscreenElement() !== null;
}

// iOS Safari implements fullscreen only on <video>. Calling it on a div does
// nothing and reports no error, so a "fullscreen required" policy would lock
// out every iPhone user. Detect and degrade rather than fail.
export function isFullscreenSupported() {
  const el = document.documentElement;
  return !!(
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen
  );
}

export function isIOS() {
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports itself as a Mac; the touch-point count gives it away.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

// MUST be called from a user-gesture handler (click/keydown), never an effect.
export async function requestFullscreen(target) {
  const el = target || document.documentElement;
  const fn =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (!fn) return false;
  try {
    await fn.call(el);
    return true;
  } catch {
    // Rejected (no gesture, or the user dismissed the prompt). The caller
    // decides whether that is fatal — for us it never is.
    return false;
  }
}

export async function exitFullscreen() {
  if (!isFullscreen()) return;
  const fn =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (!fn) return;
  try {
    await fn.call(document);
  } catch {
    /* already exited, or blocked — nothing to do */
  }
}

const CHANGE_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
];

export function onFullscreenChange(handler) {
  CHANGE_EVENTS.forEach((e) => document.addEventListener(e, handler));
  return () => CHANGE_EVENTS.forEach((e) => document.removeEventListener(e, handler));
}
