import { useEffect, useState } from 'react';
import { publicApi } from '../utils/api';

/**
 * Subject-scoped chapter/topic options for the public question bank.
 *
 * The repository holds ~2,600 distinct topics across five subjects and the names
 * collide — 'Density' is a topic under Botany, Chemistry and Physics — so the
 * server only returns chapters and topics once a subject is supplied. This hook
 * refetches whenever the subject changes and reports `requiresSubject` so the
 * caller can explain an empty list instead of looking broken.
 *
 * Debounced because two of the three call sites are freeSolo Autocompletes bound
 * to their input value, which would otherwise fire a request per keystroke.
 */
export default function usePublicRepoMeta(subject, { enabled = true, delay = 350 } = {}) {
  const [meta, setMeta] = useState({
    subjects: [], chapters: [], topics: [], requires_subject: true,
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      publicApi.adminRepoMeta(subject ? { subject } : undefined)
        .then((r) => { if (!cancelled) setMeta(r.data); })
        .catch(() => { /* dropdown options are non-critical */ });
    }, delay);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [subject, enabled, delay]);

  return {
    ...meta,
    requiresSubject: meta.requires_subject === true,
    subjectHint: meta.requires_subject === true ? 'Select a subject first' : ' ',
  };
}
