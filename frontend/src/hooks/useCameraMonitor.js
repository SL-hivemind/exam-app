import { useEffect, useRef, useState, useCallback } from 'react';
import { EVENT } from '../utils/proctorEvents';

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
 */
export default function useCameraMonitor({ active, enabled, onEvent } = {}) {
  // idle | requesting | active | denied | unavailable | lost
  const [status, setStatus] = useState('idle');

  const streamRef = useRef(null);
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  const emit = useCallback((type, extra) => onEventRef.current?.(type, extra), []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.onmute = null;
      t.onunmute = null;
      t.stop();
    });
    streamRef.current = null;
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

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // Also the case on an insecure origin — getUserMedia requires HTTPS
      // (or localhost), so a plain-HTTP LAN address lands here.
      setStatus('unavailable');
      emit(EVENT.CAMERA_UNAVAILABLE, {
        reason: window.isSecureContext ? 'no_api' : 'insecure_context',
      });
      return false;
    }

    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Modest constraints: this only needs to know a camera is producing
        // frames, and low resolution keeps the cost down on cheap Androids.
        video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 10 } },
        audio: false,
      });
      streamRef.current = stream;
      attachTrackHandlers(stream);
      setStatus('active');
      emit(EVENT.CAMERA_GRANTED);
      return true;
    } catch (err) {
      const name = err?.name || 'Error';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied');
        emit(EVENT.CAMERA_DENIED, { reason: name });
      } else {
        // NotFoundError (no camera), NotReadableError (in use by another
        // app), OverconstrainedError. None of these are the student's fault.
        setStatus('unavailable');
        emit(EVENT.CAMERA_UNAVAILABLE, { reason: name });
      }
      return false;
    }
  }, [attachTrackHandlers, emit]);

  // Initial acquisition. Safari wants a user gesture for getUserMedia; when
  // this attempt is rejected the UI surfaces a button that calls
  // requestCamera() from a real click, which Safari does accept.
  useEffect(() => {
    if (!active || !enabled) return;
    if (status !== 'idle') return;
    requestCamera();
  }, [active, enabled, status, requestCamera]);

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
    stream: streamRef.current,
    requestCamera,
    // Never blocks the exam — the caller uses this only to decide whether to
    // show a "retry camera" prompt, never to gate entry.
    needsAttention: enabled && (status === 'denied' || status === 'lost' || status === 'unavailable'),
  };
}
