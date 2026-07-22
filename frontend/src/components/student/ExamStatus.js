/**
 * One source of truth for what state an exam assignment is in.
 *
 * This used to live inside StudentDashboard as a closure returning MUI palette
 * names plus a hard-coded `bg` hex. Two problems with that: the hexes were
 * chosen for a light background (#2e7d32 green, #e0e0e0 grey) and are close to
 * unreadable on this app's dark theme, and the filter bar now needs the same
 * classification the cards use — duplicating it would guarantee the two drift.
 *
 * Every tone here is checked against the dark glass surface, not white.
 */
import { g } from '../games/gameTheme';

export const STATUS = {
  in_progress: {
    key: 'in_progress',
    label: 'In Progress',
    fg: g.warning,
    tint: g.warningTint,
    help: 'You already started this exam — resume it before the timer runs out.',
  },
  active: {
    key: 'active',
    label: 'Active',
    fg: g.success,
    tint: g.successTint,
    help: 'This exam is open now. Start it before the window closes.',
  },
  upcoming: {
    key: 'upcoming',
    label: 'Upcoming',
    fg: g.info,
    tint: g.infoTint,
    help: 'This exam has not opened yet — the Start button activates at the start time shown.',
  },
  missed: {
    key: 'missed',
    label: 'Missed',
    fg: g.danger,
    tint: g.dangerTint,
    help: 'The window closed before you started. Talk to your teacher if you need another chance.',
  },
  results_pending: {
    key: 'results_pending',
    label: 'Results Pending',
    fg: g.warning,
    tint: g.warningTint,
    help: 'You finished this exam. Your score appears once your school releases the results.',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    fg: g.success,
    tint: g.successTint,
    help: 'You completed this exam — open View Results to see your score and answers.',
  },
  not_assigned: {
    key: 'not_assigned',
    label: 'Not Assigned',
    fg: g.textMuted,
    tint: 'rgba(255,255,255,0.07)',
    help: 'This exam is not assigned to you.',
  },
};

/**
 * Classify one assignment. Order matters: an exam being *in progress* beats
 * every other consideration, because that is the one with a running clock.
 */
export function classify(examObj, now = new Date()) {
  if (!examObj?.assigned) return STATUS.not_assigned;

  const exam = examObj.exam || {};
  const start = exam.access_start ? new Date(exam.access_start) : null;
  const end = exam.access_end ? new Date(exam.access_end) : null;

  if (examObj.in_progress) return STATUS.in_progress;

  if (!examObj.attempted) {
    if (start && now < start) return STATUS.upcoming;
    if (end && now > end) return STATUS.missed;
    return STATUS.active;
  }

  return exam.results_released ? STATUS.completed : STATUS.results_pending;
}

/** Can the student open this exam right now? */
export function isStartable(examObj, now = new Date()) {
  const state = classify(examObj, now);
  return state.key === 'active' || state.key === 'in_progress';
}

/** Milliseconds until an exam closes, or null when it has no end time. */
export function msUntilClose(examObj, now = new Date()) {
  const end = examObj?.exam?.access_end ? new Date(examObj.exam.access_end) : null;
  if (!end) return null;
  return end.getTime() - now.getTime();
}

/** "2d 4h", "3h 12m", "8m" — coarse on purpose; a live second-counter here
 *  would re-render the whole list every second for no real benefit. */
export function formatRemaining(ms) {
  if (ms == null || ms <= 0) return null;
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
