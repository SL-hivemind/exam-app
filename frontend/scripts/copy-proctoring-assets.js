/**
 * Copies the MediaPipe WASM runtime out of node_modules into public/mediapipe/wasm.
 *
 * Why this exists rather than committing the files or pulling a CDN:
 *
 *  - The WASM is ~19 MB across both variants. That does not belong in git.
 *  - It already ships inside @mediapipe/tasks-vision, so copying it needs no
 *    network at build time — the build cannot fail because a CDN is down.
 *  - Serving it from our own origin matters at exam time: 300 students each
 *    fetching ~3 MB at 10:00 AM is already the worst moment for a school's
 *    uplink, and a third-party host would be a live dependency mid-exam.
 *
 * The face model (~224 KB) IS committed, because it is small and the exact
 * version is part of how calibration behaves.
 *
 * Both WASM variants are copied on purpose: FilesetResolver picks the non-SIMD
 * build on older Android devices, which this product cannot afford to drop.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const DEST = path.join(__dirname, '..', 'public', 'mediapipe', 'wasm');

function main() {
  if (!fs.existsSync(SRC)) {
    // Not fatal: only exams with face monitoring enabled need this, and a
    // missing runtime degrades to camera-presence-only rather than breaking
    // the build for everyone else.
    console.warn('[proctoring] @mediapipe/tasks-vision not installed — skipping WASM copy.');
    return;
  }

  fs.mkdirSync(DEST, { recursive: true });

  let copied = 0;
  for (const file of fs.readdirSync(SRC)) {
    const from = path.join(SRC, file);
    const to = path.join(DEST, file);
    if (!fs.statSync(from).isFile()) continue;
    // Skip if already present and the same size — keeps rebuilds fast.
    if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) continue;
    fs.copyFileSync(from, to);
    copied += 1;
  }

  console.log(`[proctoring] MediaPipe WASM ready in public/mediapipe/wasm (${copied} file(s) copied).`);
}

main();
