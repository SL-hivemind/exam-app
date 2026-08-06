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

/**
 * Reduce a detection list to the single largest face, normalised 0..1.
 *
 * NOTE ON UNITS, because they differ and getting it wrong is silent:
 * `boundingBox` comes back in PIXELS and has to be divided by the frame size,
 * but `keypoints` are already NormalizedKeypoint in 0..1 and must NOT be.
 * Dividing them twice would leave every derived pose value wrong by a factor
 * of the frame size, and the safe region would simply stop flagging anything.
 */
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
      best = {
        box,
        score: d.categories?.[0]?.score ?? 0,
        keypoints: d.keypoints || [],
      };
    }
  }
  if (!best) return null;

  // BlazeFace short-range emits six: right eye, left eye, nose tip, mouth
  // centre, right ear tragion, left ear tragion. Flattened, because a plain
  // number array structured-clones far more cheaply than six objects at 2 Hz.
  //
  // These were previously computed by the model and discarded here. They are
  // what makes attention scoring independent of how far away the student
  // sits: an interocular distance shrinks with distance exactly as head
  // movement does, so measuring one against the other cancels the distance.
  let kp = null;
  if (best.keypoints.length >= 3) {
    kp = [];
    for (const point of best.keypoints) kp.push(point.x, point.y);
  }

  return {
    cx: (best.box.originX + best.box.width / 2) / width,
    cy: (best.box.originY + best.box.height / 2) / height,
    w: best.box.width / width,
    h: best.box.height / height,
    area: bestArea,
    score: best.score,
    // More than one face in frame is worth knowing about on its own.
    faces: detections.length,
    kp,
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
