import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Paper, Button, Alert, Chip, IconButton, Container, Toolbar,
  Stack, List, ListItem, ListItemIcon, ListItemText, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Card, CardContent, CardActions, Tooltip, Zoom, CircularProgress, Skeleton,
  TablePagination, TextField, InputAdornment,
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Info as InfoIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Timer as TimerIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Search as SearchIcon,
  FilterAltOff as FilterAltOffIcon,
  Extension as ExtensionIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import api, { studentApi } from '../utils/api';
import useAuth from '../hooks/useAuth';
import AnimatedText from './ui/AnimatedText';
import GamesHub from './games/GamesHub';
import StatTiles from './student/StatTiles';
import PriorityBanner from './student/PriorityBanner';
import { classify, formatRemaining, isStartable, msUntilClose } from './student/ExamStatus';
import { g } from './games/gameTheme';

const examInstructions = [
  "Attempt all questions within the allotted time. No negative marks.",
  "You must complete the exam within the specified duration.",
  "If the timer runs out, your exam will be automatically submitted if you stay on the exam page.",
  "If interrupted (e.g., tab close), log back in immediately to resume.",
  "Do not switch tabs. if switched more than 3 times exam submits automatically.",
  "Do not refresh the page during the exam dont try to change url.",
  "Ensure you click 'Submit' to finalize.",
  "No re-attempts are allowed.",
];

// Which classify() keys each stat tile is responsible for.
const FILTERS = {
  all: null,
  active: ['active', 'in_progress'],
  upcoming: ['upcoming'],
  results_pending: ['results_pending'],
  completed: ['completed'],
};

export default function StudentDashboard() {
  const { authToken, user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [startingExamId, setStartingExamId] = useState(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [totalExams, setTotalExams] = useState(0);

  // The games panel is optional (classes 6-10, and only where the school has
  // it switched on). Without knowing whether it rendered, the exam column
  // would keep its 8/12 width and leave a third of a desktop screen blank.
  const [hasGames, setHasGames] = useState(false);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/student/exams?page=${page + 1}&per_page=${rowsPerPage}`, {
        headers: { auth_token: authToken },
      });
      setExams(res.data.exams || []);
      setTotalExams(res.data.total || 0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  }, [authToken, page, rowsPerPage]);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary((await studentApi.summary()).data);
    } catch {
      // The list still works without it; the tiles and banner just stay away
      // rather than showing numbers we cannot stand behind.
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (!localStorage.getItem('instructionsShown')) {
      setIsInstructionsOpen(true);
      localStorage.setItem('instructionsShown', 'true');
    }
  }, []);

  const refreshAll = () => { fetchExams(); fetchSummary(); };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Not set';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleStartExam = async (examId) => {
    if (startingExamId) return;
    setStartingExamId(examId);
    try {
      const canStart = await api.get(`/student/exams/${examId}/can_start`, {
        headers: { auth_token: authToken },
      });

      // These were window.alert() calls, which block the page and look like a
      // browser error rather than a message from the app.
      if (!canStart.data.assigned) return setNotice('That exam is not assigned to you.');
      if (!canStart.data.within_window) return setNotice('That exam is not open right now.');
      if (canStart.data.already_submitted) return setNotice('You have already submitted this exam.');

      await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
      navigate(`/exams/${examId}/questions`);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not open that exam.');
    } finally {
      setStartingExamId(null);
    }
  };

  // Filtering and sorting apply to the current page only — the server paginates
  // and the ordering it uses is by creation date. Anything claiming to describe
  // the whole set comes from `summary` instead.
  const visibleExams = useMemo(() => {
    const wanted = FILTERS[filter];
    const term = search.trim().toLowerCase();

    return exams
      .filter((e) => {
        if (wanted && !wanted.includes(classify(e).key)) return false;
        if (term && !String(e.exam?.title || '').toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => Number(isStartable(b)) - Number(isStartable(a)));
  }, [exams, filter, search]);

  const filtering = filter !== 'all' || search.trim() !== '';

  return (
    <Box sx={{ width: '100%', minHeight: '100vh' }}>
      <Toolbar />

      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3, lg: 5 } }}>
        {/* ── HEADER ── */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 4 }, mb: 3, borderRadius: 5,
            background: 'linear-gradient(135deg, rgba(246,137,20,0.16) 0%, rgba(15,23,42,0.4) 60%)',
            border: `1px solid ${g.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <AnimatedText
              text={`Hello, ${user?.username || 'Student'}!`}
              type="split"
              tag="h1"
              className="MuiTypography-root MuiTypography-h4"
              color="#fff"
            />
            <Typography variant="body1" sx={{ color: g.textSoft, mt: 1 }}>
              {summary?.in_progress
                ? 'You left an exam unfinished — pick it up below.'
                : summary?.active_now
                  ? 'You have an exam open right now.'
                  : 'View your schedule and take assessments.'}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1.5}
            sx={{ flexWrap: 'wrap', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}
          >
            <Button
              startIcon={<TrendingUpIcon />}
              variant="contained"
              onClick={() => navigate('/student/analysis')}
              sx={{ minHeight: 44, flex: { xs: '1 1 45%', sm: '0 0 auto' } }}
            >
              Analysis
            </Button>
            <Button
              startIcon={<PersonIcon />}
              variant="outlined"
              onClick={() => navigate('/student/profile')}
              sx={{ minHeight: 44, flex: { xs: '1 1 45%', sm: '0 0 auto' } }}
            >
              Profile
            </Button>
            <Button
              startIcon={<InfoIcon />}
              variant="outlined"
              onClick={() => setIsInstructionsOpen(true)}
              sx={{ minHeight: 44, flex: { xs: '1 1 45%', sm: '0 0 auto' } }}
            >
              Rules
            </Button>
            {hasGames && (
              <Button
                startIcon={<ExtensionIcon />}
                variant="outlined"
                onClick={() => document.getElementById('games-panel')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                sx={{ minHeight: 44, flex: { xs: '1 1 45%', sm: '0 0 auto' } }}
              >
                Puzzles
              </Button>
            )}
            <Tooltip title="Refresh" arrow>
              <IconButton
                onClick={refreshAll}
                aria-label="Refresh exams"
                sx={{
                  color: g.text, border: `1px solid ${g.border}`, borderRadius: 2.5,
                  minHeight: 44, minWidth: 44,
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {/* ── AT A GLANCE (whole record, not this page) ── */}
        <StatTiles
          summary={summary}
          loading={summaryLoading}
          active={filter}
          onSelect={setFilter}
        />

        {/* ── WHAT NEEDS DOING NOW ── */}
        <PriorityBanner
          summary={summary}
          onStart={handleStartExam}
          starting={startingExamId}
        />

        <Grid container spacing={3}>
          <Grid item xs={12} md={hasGames ? 8 : 12} lg={hasGames ? 9 : 12}>
            {/* ── SEARCH ── */}
            {(exams.length > 0 || filtering) && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
                sx={{ mb: 2.5 }}
              >
                <TextField
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search this page by title"
                  size="small"
                  fullWidth
                  sx={{ maxWidth: { sm: 420 } }}
                  inputProps={{ 'aria-label': 'Search exams by title' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: g.textMuted, fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
                {filtering && (
                  <Button
                    onClick={() => { setFilter('all'); setSearch(''); }}
                    startIcon={<FilterAltOffIcon />}
                    sx={{ minHeight: 44, flexShrink: 0 }}
                  >
                    Clear filters
                  </Button>
                )}
              </Stack>
            )}

            {loading ? (
              <Grid container spacing={2.5}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Grid item xs={12} sm={6} lg={4} xl={hasGames ? 4 : 3} key={i}>
                    <Skeleton variant="rounded" height={230} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))}
              </Grid>
            ) : exams.length === 0 ? (
              <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                <AssignmentIcon sx={{ fontSize: 60, color: g.textMuted, mb: 2 }} />
                <Typography variant="h6" sx={{ color: g.text }}>No exams assigned yet.</Typography>
                <Typography variant="body2" sx={{ color: g.textSoft, mt: 1, maxWidth: 420, mx: 'auto' }}>
                  Exams appear here when your school assigns one — check back later or ask your
                  teacher. When one shows <b>Active</b>, start it before its end time.
                </Typography>
              </Paper>
            ) : visibleExams.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <Typography sx={{ color: g.text, fontWeight: 700, mb: 1 }}>
                  Nothing on this page matches
                </Typography>
                <Typography variant="body2" sx={{ color: g.textSoft, mb: 2 }}>
                  Filters apply to the {exams.length} exam{exams.length === 1 ? '' : 's'} on this
                  page. Try another page, or clear the filters.
                </Typography>
                <Button variant="outlined" onClick={() => { setFilter('all'); setSearch(''); }}>
                  Clear filters
                </Button>
              </Paper>
            ) : (
              <Stack spacing={2.5}>
                <Grid container spacing={2.5}>
                  {visibleExams.map((examObj) => {
                    const exam = examObj.exam;
                    const state = classify(examObj);
                    const startable = isStartable(examObj);
                    const closing = formatRemaining(msUntilClose(examObj));
                    const busy = startingExamId === exam.id;

                    return (
                      <Grid item xs={12} sm={6} lg={4} xl={hasGames ? 4 : 3} key={exam.id}>
                        <Card
                          elevation={0}
                          sx={{
                            height: '100%', display: 'flex', flexDirection: 'column',
                            borderRadius: 3, overflow: 'hidden',
                            border: `1px solid ${startable ? `${state.fg}66` : g.border}`,
                            bgcolor: g.surface,
                            transition: 'transform .18s, border-color .18s',
                            '&:hover': { transform: 'translateY(-4px)', borderColor: `${state.fg}99` },
                          }}
                        >
                          <Box sx={{ bgcolor: state.fg, height: 4, width: '100%' }} />

                          <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" mb={1.5} spacing={1}>
                              <Tooltip arrow title={state.help}>
                                <Chip
                                  label={state.label}
                                  size="small"
                                  sx={{
                                    fontWeight: 700, cursor: 'help', flexShrink: 0,
                                    bgcolor: state.tint, color: state.fg,
                                    border: `1px solid ${state.fg}55`,
                                    '& .MuiChip-label': { color: 'inherit' },
                                  }}
                                />
                              </Tooltip>
                              {closing && startable && (
                                <Chip
                                  size="small"
                                  icon={<TimerIcon sx={{ fontSize: 13 }} />}
                                  label={closing}
                                  sx={{
                                    height: 22, fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                                    bgcolor: 'rgba(255,255,255,0.07)', color: g.textSoft,
                                    '& .MuiChip-icon': { color: `${g.textSoft} !important` },
                                  }}
                                />
                              )}
                            </Stack>

                            <Typography
                              variant="h6"
                              fontWeight={700}
                              lineHeight={1.25}
                              sx={{ color: g.text, mb: 1.5, fontSize: '1.05rem' }}
                            >
                              {exam.title}
                            </Typography>

                            {/* Score gets top billing once it exists — it is the
                                thing a student opens the dashboard to see. */}
                            {examObj.score != null && exam.results_released && (
                              <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mb: 1.5 }}>
                                <Typography sx={{ color: g.success, fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>
                                  {examObj.score}
                                </Typography>
                                <Typography sx={{ color: g.textSoft, fontWeight: 700 }}>
                                  / {exam.total_marks}
                                </Typography>
                              </Stack>
                            )}

                            <Stack spacing={0.75}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AccessTimeIcon sx={{ fontSize: 16, color: g.textMuted }} />
                                <Typography variant="body2" sx={{ color: g.textSoft }}>
                                  {formatDateTime(exam.access_start)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <TimerIcon sx={{ fontSize: 16, color: g.textMuted }} />
                                <Typography variant="body2" sx={{ color: g.textSoft }}>
                                  {exam.duration_minutes} mins · {exam.total_marks} marks
                                </Typography>
                              </Stack>
                            </Stack>
                          </CardContent>

                          <CardActions sx={{ p: 2, pt: 0 }}>
                            {startable ? (
                              <Button
                                fullWidth
                                variant="contained"
                                color={state.key === 'in_progress' ? 'warning' : 'primary'}
                                onClick={() => handleStartExam(exam.id)}
                                disabled={busy}
                                startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                                sx={{ minHeight: 44 }}
                              >
                                {busy ? 'Opening…' : state.key === 'in_progress' ? 'Resume Exam' : 'Start Exam'}
                              </Button>
                            ) : state.key === 'completed' ? (
                              <Button
                                fullWidth
                                variant="outlined"
                                color="success"
                                onClick={() => navigate(`/exam/${exam.id}/results`)}
                                sx={{ minHeight: 44 }}
                              >
                                View Results
                              </Button>
                            ) : (
                              <Button fullWidth variant="outlined" disabled sx={{ minHeight: 44 }}>
                                {state.label}
                              </Button>
                            )}
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>

                {totalExams > rowsPerPage && (
                  <Paper sx={{ borderRadius: 2, overflowX: 'auto' }}>
                    <TablePagination
                      component="div"
                      count={totalExams}
                      page={page}
                      onPageChange={(e, p) => setPage(p)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[6, 12, 24]}
                      labelRowsPerPage="Per page:"
                    />
                  </Paper>
                )}
              </Stack>
            )}
          </Grid>

          {/* Daily puzzles. Renders nothing outside classes 6-10 or where a
              school has games off — hence hasGames driving the column width. */}
          <Grid item xs={12} md={4} lg={3} id="games-panel" sx={{ display: hasGames ? 'block' : 'none', scrollMarginTop: 88 }}>
            <GamesHub onAvailability={setHasGames} />
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={5000}
        onClose={() => setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setNotice('')} sx={{ borderRadius: 2 }}>
          {notice}
        </Alert>
      </Snackbar>

      <Dialog
        open={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" /> Important Instructions
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontWeight: 700, mb: 1 }}>
            Please review the rules before proceeding:
          </DialogContentText>
          <List dense>
            {examInstructions.map((text, index) => (
              <ListItem key={index} alignItems="flex-start" disableGutters>
                <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                  <CheckCircleIcon fontSize="small" sx={{ color: g.success }} />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setIsInstructionsOpen(false)}
            variant="contained"
            size="large"
            fullWidth
            sx={{ minHeight: 48 }}
          >
            I Understand &amp; Agree
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
