// src/utils/csvTemplates.js
// ─────────────────────────────────────────────────────────────
// Client-side CSV template generator. Headers mirror EXACTLY what
// the backend importers expect (backend/utils/files.py):
//   - students      → import_students_csv    (required: username, school_code)
//   - examQuestions → import_questions_csv   (per-exam question upload)
//   - repoQuestions → import_repository_csv  (shared question repository)
// Generated in the browser — no server round-trip.
// ─────────────────────────────────────────────────────────────

const TEMPLATES = {
  students: {
    filename: 'students_upload_format.csv',
    headers: ['username', 'school_code', 'class_number', 'email', 'password', 'student_id'],
    // username + school_code are REQUIRED. Blank password/student_id → auto-generated.
    rows: [
      ['ravi_kumar', 'SCH01', '10', 'ravi@example.com', 'Pass@1234', ''],
      ['priya_s', 'SCH01', '9', '', '', ''],
    ],
  },
  examQuestions: {
    filename: 'exam_questions_upload_format.csv',
    headers: ['text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'marks', 'image_filename'],
    // correct_answer must be A/B/C/D. marks defaults to 1. image_filename optional.
    rows: [
      ['What is 2 + 2?', '3', '4', '5', '6', 'B', '1', ''],
      ['Which planet is known as the Red Planet?', 'Venus', 'Jupiter', 'Mars', 'Saturn', 'C', '2', ''],
    ],
  },
  repoQuestions: {
    filename: 'repository_questions_upload_format.csv',
    headers: ['text', 'class', 'subject', 'chapter', 'topic', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'marks', 'image'],
    // text + subject REQUIRED. class+subject+chapter drive the auto question ID. Duplicates auto-skipped.
    rows: [
      ['What is the SI unit of force?', '9', 'Physics', 'Laws of Motion', 'Force', 'Joule', 'Newton', 'Watt', 'Pascal', 'B', '1', ''],
      ['Photosynthesis occurs in which organelle?', '10', 'Biology', 'Life Processes', 'Nutrition', 'Mitochondria', 'Nucleus', 'Chloroplast', 'Ribosome', 'C', '1', ''],
    ],
  },
};

/** Escape a CSV cell per RFC 4180. */
const esc = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Build and download a CSV template for the given kind:
 * 'students' | 'examQuestions' | 'repoQuestions'
 */
export default function downloadCsvTemplate(kind) {
  const t = TEMPLATES[kind];
  if (!t) return;
  const lines = [
    t.headers.join(','),
    ...t.rows.map((r) => r.map(esc).join(',')),
  ];
  // ﻿ BOM so Excel opens it as UTF-8 (backend readers use utf-8-sig, so the BOM is stripped on import).
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = t.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
