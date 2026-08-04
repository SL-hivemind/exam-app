/**
 * Curated, exam-by-exam reference shown on the public course page.
 *
 * A course row in the DB only carries a title, price and target_tags — nothing
 * that tells a visitor what the exam actually IS. This fills that gap: the
 * conducting body, paper pattern, marking scheme and eligibility, keyed by the
 * course's exam-family tag (taxonomy.py) with a title fallback.
 *
 * Everything here is editorial content, not data — patterns change with each
 * notification cycle, which is why every guide renders with a "confirm against
 * the official notification" note.
 */

export const EXAM_GUIDES = {
  NEET: {
    fullName: 'National Eligibility cum Entrance Test (UG)',
    authority: 'National Testing Agency (NTA)',
    mode: 'Pen & paper (OMR)',
    frequency: 'Once a year',
    tagline: 'The single national entrance for MBBS, BDS, AYUSH and allied medical seats.',
    facts: [
      { label: 'Duration', value: '3 hours' },
      { label: 'Questions', value: '180' },
      { label: 'Total marks', value: '720' },
      { label: 'Marking', value: '+4 / −1' },
    ],
    pattern: [
      { section: 'Physics', questions: 45, marks: 180 },
      { section: 'Chemistry', questions: 45, marks: 180 },
      { section: 'Botany', questions: 45, marks: 180 },
      { section: 'Zoology', questions: 45, marks: 180 },
    ],
    eligibility: [
      'Passed 10+2 with Physics, Chemistry, Biology/Biotechnology and English',
      'Minimum 17 years of age as on 31 December of the admission year',
      'No upper age limit',
    ],
    official: 'https://neet.nta.nic.in',
  },

  JEE: {
    fullName: 'Joint Entrance Examination (Main & Advanced)',
    authority: 'NTA (Main) · IITs (Advanced)',
    mode: 'Computer-based test',
    frequency: 'Two sessions a year (Jan & Apr)',
    tagline: 'The gateway to the IITs, NITs, IIITs and every major engineering college in India.',
    facts: [
      { label: 'Duration', value: '3 hours' },
      { label: 'Questions', value: '75 (Paper 1)' },
      { label: 'Total marks', value: '300' },
      { label: 'Marking', value: '+4 / −1' },
    ],
    pattern: [
      { section: 'Physics', questions: 25, marks: 100 },
      { section: 'Chemistry', questions: 25, marks: 100 },
      { section: 'Mathematics', questions: 25, marks: 100 },
    ],
    eligibility: [
      'Passed 10+2 with Physics, Chemistry and Mathematics',
      'Top performers in Main qualify for JEE Advanced',
      'Age limits apply for Advanced — check the current notification',
    ],
    official: 'https://jeemain.nta.nic.in',
  },

  SSCCGL: {
    fullName: 'Combined Graduate Level Examination',
    authority: 'Staff Selection Commission (SSC)',
    mode: 'Computer-based test',
    frequency: 'Once a year',
    tagline: 'The main route into Group B and Group C posts across central government ministries.',
    facts: [
      { label: 'Tier-1 duration', value: '60 minutes' },
      { label: 'Questions', value: '100' },
      { label: 'Total marks', value: '200' },
      { label: 'Marking', value: '+2 / −0.50' },
    ],
    pattern: [
      { section: 'General Intelligence & Reasoning', questions: 25, marks: 50 },
      { section: 'General Awareness', questions: 25, marks: 50 },
      { section: 'Quantitative Aptitude', questions: 25, marks: 50 },
      { section: 'English Comprehension', questions: 25, marks: 50 },
    ],
    eligibility: [
      "Bachelor's degree from a recognised university",
      'Age limits vary by post — typically 18 to 32 years',
      'Tier-1 is qualifying; Tier-2 decides the final merit',
    ],
    official: 'https://ssc.gov.in',
  },

  RRB: {
    fullName: 'RRB NTPC — Non-Technical Popular Categories',
    authority: 'Railway Recruitment Boards (RRB)',
    mode: 'Computer-based test (CBT-1 → CBT-2)',
    frequency: 'As notified',
    tagline: 'Station Master, Goods Guard, Clerk, Junior Accounts Assistant and allied railway posts.',
    facts: [
      { label: 'CBT-1 duration', value: '90 minutes' },
      { label: 'Questions', value: '100' },
      { label: 'Total marks', value: '100' },
      { label: 'Marking', value: '+1 / −1⁄3' },
    ],
    pattern: [
      { section: 'Mathematics', questions: 30, marks: 30 },
      { section: 'General Intelligence & Reasoning', questions: 30, marks: 30 },
      { section: 'General Awareness', questions: 40, marks: 40 },
    ],
    eligibility: [
      'Class 12 pass for undergraduate-level posts',
      "Bachelor's degree for graduate-level posts",
      'Age limits vary by post and category',
    ],
    official: 'https://www.rrbapply.gov.in',
  },

  POLICE: {
    fullName: 'State Police Recruitment — Constable & Sub-Inspector',
    authority: 'State Police Recruitment Boards',
    mode: 'Written exam (OMR or CBT, varies by state)',
    frequency: 'As notified by each state',
    tagline: 'Written test, then physical and medical standards — this course targets the written stage.',
    facts: [
      { label: 'Typical duration', value: '90–180 minutes' },
      { label: 'Questions', value: '100–200' },
      { label: 'Core sections', value: '3' },
      { label: 'Stages', value: 'Written → PET/PMT → Medical' },
    ],
    pattern: [
      { section: 'Arithmetic / Numerical Ability', questions: '~1/3', marks: '—' },
      { section: 'General Intelligence & Reasoning', questions: '~1/3', marks: '—' },
      { section: 'General Knowledge & Current Affairs', questions: '~1/3', marks: '—' },
    ],
    eligibility: [
      'Class 12 pass for Constable; graduation for Sub-Inspector (varies by state)',
      'Physical standards (height, chest, endurance) apply and differ by state and gender',
      'Age limits and relaxations follow each state notification',
    ],
    note: 'Police recruitment is run state by state — question counts, marks and physical standards differ. Always confirm against your own state board\'s notification.',
  },

  BANKING: {
    fullName: 'IBPS & SBI — Probationary Officer / Clerk',
    authority: 'IBPS · State Bank of India',
    mode: 'Computer-based test (Prelims → Mains)',
    frequency: 'Once a year per bank cycle',
    tagline: 'A speed-driven Prelims with sectional timing, followed by a sectional Mains.',
    facts: [
      { label: 'Prelims duration', value: '60 minutes' },
      { label: 'Questions', value: '100' },
      { label: 'Total marks', value: '100' },
      { label: 'Marking', value: '+1 / −0.25' },
    ],
    pattern: [
      { section: 'English Language', questions: 30, marks: 30 },
      { section: 'Quantitative Aptitude', questions: 35, marks: 35 },
      { section: 'Reasoning Ability', questions: 35, marks: 35 },
    ],
    eligibility: [
      'Graduation in any discipline from a recognised university',
      'Typically 20 to 30 years for PO, 20 to 28 for Clerk',
      'Prelims is qualifying only — Mains and the interview decide the merit',
    ],
    note: 'Prelims runs with sectional timing — roughly 20 minutes per section, so pacing matters as much as accuracy.',
    official: 'https://www.ibps.in',
  },

  GATE: {
    fullName: 'Graduate Aptitude Test in Engineering',
    authority: 'IISc Bangalore & the IITs (host rotates yearly)',
    mode: 'Computer-based test',
    frequency: 'Once a year',
    tagline: 'M.Tech and MS admissions, PSU recruitment, and research fellowships.',
    facts: [
      { label: 'Duration', value: '3 hours' },
      { label: 'Questions', value: '65' },
      { label: 'Total marks', value: '100' },
      { label: 'Formats', value: 'MCQ · MSQ · NAT' },
    ],
    pattern: [
      { section: 'General Aptitude', questions: 10, marks: 15 },
      { section: 'Technical + Engineering Mathematics', questions: 55, marks: 85 },
    ],
    eligibility: [
      "Bachelor's degree in engineering, technology, science, or architecture",
      'Third-year students and above may apply',
      'Scores stay valid for three years',
    ],
    note: 'Negative marking applies to MCQs only — MSQ and NAT questions carry no penalty, so never leave those blank. The organising institute changes each year; check the current year\'s official GATE portal.',
  },
};

/** Match a course to its guide by exam-family tag, then by title. */
export function guideFor(course, tags = []) {
  const upper = (tags || []).map((t) => String(t).toUpperCase());
  for (const key of Object.keys(EXAM_GUIDES)) {
    if (upper.includes(key)) return EXAM_GUIDES[key];
  }
  const title = (course?.title || '').toUpperCase().replace(/[^A-Z]/g, '');
  for (const key of Object.keys(EXAM_GUIDES)) {
    if (title.includes(key)) return EXAM_GUIDES[key];
  }
  return null;
}

/** Course-page FAQ — same answers for every exam, so it lives here once. */
export const COURSE_FAQ = [
  {
    q: 'Is enrolling really free?',
    a: 'Yes. Creating an account and enrolling in a free course costs nothing, and free courses unlock the full question bank and mock tests for that exam. Paid courses let you enroll for free too — you just see the free content until you upgrade.',
  },
  {
    q: 'What if a course has no mock tests listed yet?',
    a: 'Mock tests are full-length papers we assemble and publish. Even before they appear, the question repository for that exam is already open to you — enroll and use Practice to work through it subject by subject or chapter by chapter.',
  },
  {
    q: 'How is my score calculated?',
    a: 'Exactly the way the real exam does it. Each question carries its own marks and negative marking, multiple-select and numeric-answer questions are graded on their own rules, and unattempted questions are never penalised.',
  },
  {
    q: 'Can I retake a test?',
    a: 'Free mock tests allow one attempt each so your score stays meaningful. Practice sessions are unlimited, and a premium subscription unlocks unlimited re-attempts on that course.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Everything runs in your browser on a phone, tablet or computer, and your answers save as you go — so a dropped connection mid-test does not cost you your progress.',
  },
];
