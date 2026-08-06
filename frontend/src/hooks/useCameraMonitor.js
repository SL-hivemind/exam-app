import { useEffect, useRef, useState, useCallback } from 'react';
import { EVENT } from '../utils/proctorEvents';
import { acquireCameraStream, releaseStream } from '../utils/camera';

/**
 * Camera presence monitoring — no ML, no recording, no frames leave the device.
 *
 * This deliberately answers only the questions that can be answered cheaply
 * and certainly:
 *
 *   Is a camera available? Was permission granted? Did the track stop?
 *
 * It downloads no model and costs effectively no CPU, which is why it ships
 * before face detection: for most exams it delivers the bulk of the practical
 * value on its own.
 *
 * Two rules that are easy to get wrong and are handled here:
 *
 *   1. SOFT FAIL. A denied or missing camera records an event and lets the
 *      exam proceed. In any real cohort 10-20% of devices have a broken or
 *      blocked camera; a hard requirement locks those students out of an
 *      exam they are entitled to sit.
 *   2. MOBILE SUSPENDS TRACKS. Android Chrome and iOS Safari mute or end the
 *      camera track whenever the tab is backgrounded. Reporting that as a
 *      camera failure would double-flag every single tab switch, so camera
 *      transitions are ignored while the page is hidden.
 *
 * This hook does NOT acquire the camera on its own. It used to, from an
 * effect, which put the permission prompt on screen at the same instant every
 * violation listener went live — the prompt made Chrome drop fullscreen and
 * steal focus, and the student was charged for both. Acquisition now belongs
 * to the pre-flight gate, on a real click, before anything is armed. Pass the
 * resulting stream in as `initialStream`, or call `requestCamera()` from a
 * genuine user gesture (the in-exam retry button).
 */
export default function useCameraMonitor({ active, enabled, onEvent, initialStream } = {}) {
  // idle | requesting | active | denied | unavailable | lost
  const [status, setStatus] = useState('idle');
  // Held as state as well as a ref: consumers (face monitoring) need to react
  // when the stream arrives, and a ref mutation does not re-render.
  const [stream, setStream] = useState(null);

  const streamRef = useRef(null);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  const emit = useCallback((type, extra) => onEventRef.current?.(type, extra), []);

  // The gate owns the stream it acquired, so stopping it here would kill the
  // camera the exam is meant to be watching. Only a stream this hook obtained
  // itself, via the retry button, is ours to stop.
  const ownsStreamRef = useRef(false);

  const stop = useCallback(() => {
    if (ownsStreamRef.current) releaseStream(streamRef.current);
    ownsStreamRef.current = false;
    streamRef.current = null;
    setStream(null);
  }, []);

  const attachTrackHandlers = useCallback((stream) => {
    stream.getVideoTracks().forEach((track) => {
      // Physically unplugged, or the OS handed the device to another app.
      track.onended = () => {
        if (document.hidden) return;     // backgrounded tab, not a real loss
        setStatus('lost');
        emit(EVENT.CAMERA_LOST, { reason: 'track_ended' });
      };
      // Covered lens, OS privacy switch, or a background suspend.
      track.onmute = () => {
        if (document.hidden) return;
        setStatus('lost');
        emit(EVENT.CAMERA_LOST, { reason: 'track_muted' });
      };
      track.onunmute = () => {
        if (document.hidden) return;
        setStatus('active');
        emit(EVENT.CAMERA_RESTORED);
      };
    });
  }, [emit]);

  /** Take over a stream the pre-flight gate already acquired. */
  const adopt = useCallback((incoming) => {
    if (!incoming || streamRef.current === incoming) return;
    const track = incoming.getVideoTracks()[0];
    if (!track || track.readyState === 'ended') return;
    streamRef.current = incoming;
    ownsStreamRef.current = false;      // the gate owns it; do not stop it
    setStream(incoming);
    attachTrackHandlers(incoming);
    setStatus('active');
  }, [attachTrackHandlers]);

  /**
   * Ask for the camera. MUST be called from a real user gesture — this is the
   * in-exam retry button, not a startup path. The caller is expected to open a
   * suppression window around it, because the prompt itself drops fullscreen.
   */
  const requestCamera = useCallback(async () => {
    setStatus('requesting');
    const outcome = await acquireCameraStream();

    if (outcome.status === 'active') {
      streamRef.current = outcome.stream;
      ownsStreamRef.current = true;
      setStream(outcome.stream);
      attachTrackHandlers(outcome.stream);
      setStatus('active');
      emit(EVENT.CAMERA_GRANTED);
      return true;
    }

    // 'dismissed' is still a denial as far as monitoring is concerned; the
    // distinction only changes what the retry copy says.
    setStatus(outcome.status === 'dismissed' ? 'denied' : outcome.status);
    emit(outcome.event, { reason: outcome.reason });
    return false;
  }, [attachTrackHandlers, emit]);

  // Adopt whatever the gate handed over. No acquisition happens here — that
  // would put a permission prompt on screen with every listener already live.
  useEffect(() => {
    if (!active || !enabled || !initialStream) return;
    adopt(initialStream);
  }, [active, enabled, initialStream, adopt]);

  // Release the device the moment monitoring stops, so the camera light goes
  // out at submit rather than lingering until the tab closes.
  useEffect(() => {
    if (active && enabled) return;
    stop();
    if (status !== 'idle') setStatus('idle');
  }, [active, enabled, stop, status]);

  useEffect(() => stop, [stop]);

  // A camera vanishing from the device list is the other way loss shows up:
  // some platforms fire devicechange without ever ending the track.
  useEffect(() => {
    if (!active || !enabled || !navigator.mediaDevices?.addEventListener) return;

    const onDeviceChange = async () => {
      if (document.hidden || !streamRef.current) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some((d) => d.kind === 'videoinput');
        if (!hasCamera) {
          setStatus('lost');
          emit(EVENT.CAMERA_LOST, { reason: 'device_removed' });
        }
      } catch {
        /* enumeration blocked — nothing actionable */
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
  }, [active, enabled, emit]);

  // Coming back from a background suspend, the track can be live again
  // without ever firing unmute. Reconcile on becoming visible instead.
  useEffect(() => {
    if (!active || !enabled) return;

    const onVisible = () => {
      if (document.hidden || !streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      const healthy = track.readyState === 'live' && !track.muted;
      setStatus((prev) => {
        if (healthy && prev === 'lost') { emit(EVENT.CAMERA_RESTORED); return 'active'; }
        if (!healthy && prev === 'active') { emit(EVENT.CAMERA_LOST, { reason: 'suspended' }); return 'lost'; }
        return prev;
      });
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [active, enabled, emit]);

  return {
    status,
    stream,
    requestCamera,
    adopt,
    // Never blocks the exam — the caller uses this only to decide whether to
    // show a "retry camera" prompt, never to gate entry.
    needsAttention: enabled && (status === 'denied' || status === 'lost' || status === 'unavailable'),
  };
}
