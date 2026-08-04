/* eslint-disable no-restricted-globals */
/**
 * Face detection worker.
 *
 * Runs BlazeFace (short-range) off the main thread so a 40-200ms inference on
 * a budget Android does not stall the exam UI or the countdown. Only the
 * bounding box leaves this worker — no pixels, no frames, no image data is
 * returned to the page or sent anywhere.
 *
 * Assets are loaded from /mediapipe/ on our own origin rather than a Google
 * CDN: 300 students downloading ~3 MB each at 10:00 AM is already the worst
 * moment for a school's uplink, and an external host would also be a live
 * third-party dependency in the middle of an exam.
 */
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

let detector = null;

async function init() {
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
  detector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: '/mediapipe/models/blaze_face_short_range.tflite',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    minDetectionConfidence: 0.4,
  });
}

/** Reduce a detection list to the single largest face, normalised 0..1. */
function summarise(result, width, height) {
  const detections = result?.detections || [];
  if (!detections.length) return null;

  let best = null;
  let bestArea = 0;
  for (const d of detections) {
    const box = d.boundingBox;
    if (!box) continue;
    const area = (box.width * box.height) / (width * height);
    if (area > bestArea) {
      bestArea = area;
      best = { box, score: d.categories?.[0]?.score ?? 0 };
    }
  }
  if (!best) return null;

  return {
    cx: (best.box.originX + best.box.width / 2) / width,
    cy: (best.box.originY + best.box.height / 2) / height,
    area: bestArea,
    score: best.score,
    // More than one face in frame is worth knowing about on its own.
    faces: detections.length,
  };
}

self.onmessage = async (e) => {
  const { type, bitmap, id } = e.data || {};

  if (type === 'init') {
    try {
      await init();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err?.message || err) });
    }
    return;
  }

  if (type === 'detect') {
    if (!detector) {
      bitmap?.close?.();
      return;
    }
    try {
      const result = detector.detect(bitmap);
      self.postMessage({
        type: 'result',
        id,
        sample: summarise(result, bitmap.width, bitmap.height),
      });
    } catch (err) {
      self.postMessage({ type: 'result', id, sample: null });
    } finally {
      // Transferred bitmaps must be released explicitly or the worker leaks
      // one frame's memory every tick for the length of the exam.
      bitmap?.close?.();
    }
    return;
  }

  if (type === 'close') {
    detector?.close?.();
    detector = null;
    self.close();
  }
};
