import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Chip, Stack, Accordion, AccordionSummary,
  AccordionDetails, Button, CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import api from '../../utils/api';
import { BOARD_LABELS } from '../ui/FilterSidebar';

/**
 * "The same chapter, in the other board."
 *
 * The two syllabi cover a lot of the same ground under different names and at
 * different granularity — NCERT's single 'Conic Sections' is five separate AP
 * chapters. This surfaces those equivalents so a school that has run out of
 * questions in its own board can pull from the other one.
 *
 * Selecting a chapter only changes what the caller is filtering by. Questions
 * are never moved or copied between boards: picking one into an exam goes
 * through the normal repo-pick flow, which copies it into the exam and links
 * back via repo_question_id, leaving the repository row on its original board.
 */
export default function RelatedChaptersPanel({ board, chapter, subject, onSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!board || !chapter) { setData(null); return; }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ board, chapter });
    if (subject) params.set('subject', subject);

    api.get(`/api/metadata/related-chapters?${params}`)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch((err) => {
        console.error('Failed to load related chapters', err);
        if (!cancelled) setData(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [board, chapter, subject]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Checking other boards…
        </Typography>
      </Box>
    );
  }

  if (!data?.related?.length) return null;

  const otherBoard = data.related[0].board;

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, '&:before': { display: 'none' } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SwapHorizIcon fontSize="small" sx={{ color: '#ffb054' }} />
          <Typography variant="body2">
            Also available in {BOARD_LABELS[otherBoard] || otherBoard}
          </Typography>
          <Chip size="small" label={`${data.total_questions} questions`} />
        </Stack>
      </AccordionSummary>

      <AccordionDetails>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          These cover the same material as “{chapter}”. Adding one copies it into
          your exam — the question stays filed under its own board.
        </Typography>

        <Stack spacing={1}>
          {data.related.map((c) => (
            <Box
              key={`${c.board}-${c.chapter}`}
              sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 1, px: 1.5, py: 1, borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.04)',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>{c.chapter}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Class {c.class_number}{c.paper_code ? ` · Paper ${c.paper_code}` : ''}
                  {' · '}{c.question_count} question{c.question_count === 1 ? '' : 's'}
                </Typography>
              </Box>
              <Button
                size="small"
                disabled={!c.question_count}
                onClick={() => onSelect?.(c)}
              >
                Browse
              </Button>
            </Box>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
