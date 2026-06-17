import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Alert, Chip, IconButton, Container, Toolbar,
  Stack, List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Grid, Card, CardContent, CardActions, Divider, Tooltip, Zoom, CircularProgress,
  TablePagination
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  EventNote as EventNoteIcon,
  Info as InfoIcon,
  Insights as InsightsIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Timer as TimerIcon,
  AccessTime as AccessTimeIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  PlayArrow as PlayArrowIcon,
  History as HistoryIcon,
  HourglassEmpty as PendingIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import AnimatedText from './ui/AnimatedText';

const upcomingAssessments = [
  "Monthly Tests (October 2025)",
];

const examInstructions = [
  "Attempt all questions within the allotted time. No negative marks.",
  "You must complete the exam within the specified duration.",
  "If the timer runs out, your exam will be automatically submitted if you stay on the exam page.",
  "If interrupted (e.g., tab close), log back in immediately to resume.",
  "Do not switch tabs. if switched more than 3 times exam submits automatically.",
  "Do not refresh the page during the exam dont try to change url.",
  "Ensure you click 'Submit' to finalize.",
  "No re-attempts are allowed."
];

export default function StudentDashboard() {
  const { authToken, user } = useAuth();
  const navigate = useNavigate();

  // --- DATA STATE ---
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [startingExamId, setStartingExamId] = useState(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // --- PAGINATION STATE ---
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [totalExams, setTotalExams] = useState(0);

  useEffect(() => {
    fetchExams();
    const instructionsShown = localStorage.getItem('instructionsShown');
    if (!instructionsShown) {
      setIsInstructionsOpen(true);
      localStorage.setItem('instructionsShown', 'true');
    }
    // eslint-disable-next-line
  }, [authToken, page, rowsPerPage]);

  // --- HELPERS ---
  const isWithinAccessWindow = (exam) => {
    const now = new Date();
    const accessStart = exam.access_start ? new Date(exam.access_start) : null;
    const accessEnd = exam.access_end ? new Date(exam.access_end) : null;
    if (accessStart && now < accessStart) return false;
    if (accessEnd && now > accessEnd) return false;
    return true;
  };

  const getExamStatus = (examObj) => {
    if (!examObj.assigned) return { label: 'Not Assigned', color: 'default', bg: '#e0e0e0', icon: <LockIcon /> };

    const exam = examObj.exam;
    const now = new Date();
    const accessStart = exam.access_start ? new Date(exam.access_start) : null;
    const accessEnd = exam.access_end ? new Date(exam.access_end) : null;

    // In-progress (started but not submitted)
    if (examObj.in_progress) {
      return { label: 'In Progress', color: 'warning', bg: '#ed6c02', icon: <PlayArrowIcon /> };
    }

    if (!examObj.attempted) {
      if (accessStart && now < accessStart) return { label: 'Upcoming', color: 'info', bg: '#0288d1', icon: <AccessTimeIcon /> };
      if (accessEnd && now > accessEnd) return { label: 'Missed', color: 'error', bg: '#d32f2f', icon: <LockIcon /> };
      return { label: 'Active', color: 'success', bg: '#2e7d32', icon: <PlayArrowIcon /> };
    }

    if (!exam.results_released) {
      return { label: 'Results Pending', color: 'warning', bg: '#ed6c02', icon: <PendingIcon /> };
    }

    return { label: 'Completed', color: 'success', bg: '#2e7d32', icon: <CheckCircleIcon /> };
  };

  const isExamAvailable = (examObj) => {
    if (!examObj || !examObj.exam) return false;
    // Available if assigned, not submitted, and within access window OR already in-progress
    return examObj.assigned && !examObj.attempted && (isWithinAccessWindow(examObj.exam) || examObj.in_progress);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      // Use query params for pagination
      const res = await api.get(`/student/exams?page=${page + 1}&per_page=${rowsPerPage}`, {
        headers: { auth_token: authToken }
      });

      const fetchedExams = res.data.exams || [];
      const totalCount = res.data.total || 0;

      // Optional: Sort the *current page* (Active first)
      // Note: Ideal sorting happens on backend, but this keeps UX consistent per page
      const sortedExams = fetchedExams.sort((a, b) => {
        const aActive = isExamAvailable(a);
        const bActive = isExamAvailable(b);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return 0;
      });

      setExams(sortedExams);
      setTotalExams(totalCount);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStartExam = async (examId) => {
    if (startingExamId) return;
    setStartingExamId(examId);
    try {
      const canStart = await api.get(`/student/exams/${examId}/can_start`, { headers: { auth_token: authToken } });

      if (!canStart.data.assigned) return alert('Exam not assigned.');
      if (!canStart.data.within_window) return alert('Exam is not accessible now.');
      if (canStart.data.already_submitted) return alert('Already submitted.');

      await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
      navigate(`/exams/${examId}/questions`);
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot start exam');
    } finally {
      setStartingExamId(null);
    }
  };

  const attemptedCount = exams.filter((e) => e.attempted).length;
  const releasedCount = exams.filter((e) => e.attempted && e.exam?.results_released).length;
  const pendingCount = exams.filter((e) => e.attempted && !e.exam?.results_released).length;
  const activeNowCount = exams.filter((e) => isExamAvailable(e)).length;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'transparent' }}>

      <Toolbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* DASHBOARD HEADER */}
        <Paper
          elevation={0}
          sx={{
            p: 4, mb: 4, borderRadius: '20px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#fff',
            boxShadow: '0 8px 32px rgba(15,23,42,0.15)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
          }}
        >
          <Box>
            <Box sx={{ mb: 1 }}>
              <AnimatedText
                text={`Hello, ${user?.username || 'Student'}!`}
                type="split"
                tag="h1"
                className="MuiTypography-root MuiTypography-h4"
                color="#fff"
              />
            </Box>
            <Typography variant="body1" sx={{ color: '#94a3b8' }}>
              View your schedule and take assessments.
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button
              startIcon={<TrendingUpIcon />}
              variant="contained"
              onClick={() => navigate("/student/analysis")}
              sx={{
                bgcolor: '#3b82f6',
                color: '#fff',
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#2563eb' }
              }}
            >
              Analysis
            </Button>
            <Button
              startIcon={<PersonIcon />}
              variant="outlined"
              onClick={() => navigate("/student/profile")}
              sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              Profile
            </Button>
            <Button
              startIcon={<InfoIcon />}
              variant="outlined"
              onClick={() => setIsInstructionsOpen(true)}
              sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '10px', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              Rules
            </Button>
            <Tooltip title="Refresh List" arrow>
              <IconButton onClick={fetchExams} sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <Grid container spacing={3}>

          {/* EXAM LIST COLUMN */}
          <Grid item xs={12} md={8}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
            ) : exams.length === 0 && !error ? (
              <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, bgcolor: 'white', border: '1px solid #e0e0e0' }}>
                <AssignmentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No exams assigned yet.</Typography>
              </Paper>
            ) : (
              <Stack spacing={3}>
                <Grid container spacing={3}>
                  {exams.map((examObj) => {
                    const exam = examObj.exam;
                    const status = getExamStatus(examObj);
                    const active = isExamAvailable(examObj);

                    return (
                      <Grid item xs={12} sm={6} key={exam.id}>
                        <Card
                          elevation={0}
                          sx={{
                            height: '100%',
                            display: 'flex', flexDirection: 'column',
                            borderRadius: 3,
                            border: '1px solid #e0e0e0',
                            overflow: 'hidden',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                          }}
                        >
                          <Box sx={{ bgcolor: status.bg, height: 6, width: '100%' }} />

                          <CardContent sx={{ flexGrow: 1, p: 3 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="start" mb={2}>
                              <Chip
                                icon={status.icon}
                                label={status.label}
                                color={status.color}
                                size="small"
                                sx={{ fontWeight: 'bold' }}
                              />
                              <Typography variant="caption" fontWeight={600} color="text.secondary">
                                ID: {exam.id}
                              </Typography>
                            </Stack>

                            <Typography variant="h6" fontWeight={700} gutterBottom lineHeight={1.2}>
                              {exam.title}
                            </Typography>

                            <Divider sx={{ my: 1.5 }} />

                            <Stack spacing={1}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AccessTimeIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  Start: <strong>{formatDateTime(exam.access_start)}</strong>
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <TimerIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  Duration: <strong>{exam.duration_minutes} mins</strong>
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <AssignmentIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  Total Marks: <strong>{exam.total_marks}</strong>
                                </Typography>
                              </Stack>
                            </Stack>
                          </CardContent>

                          <CardActions sx={{ p: 2, pt: 0, bgcolor: 'transparent' }}>
                            {examObj.in_progress ? (
                              <Button
                                fullWidth
                                variant="contained"
                                color="warning"
                                size="large"
                                onClick={() => handleStartExam(exam.id)}
                                disabled={startingExamId === exam.id}
                                startIcon={startingExamId === exam.id ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                              >
                                {startingExamId === exam.id ? 'Loading...' : 'Resume Exam'}
                              </Button>
                            ) : active ? (
                              <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                size="large"
                                onClick={() => handleStartExam(exam.id)}
                                disabled={startingExamId === exam.id}
                                startIcon={startingExamId === exam.id ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                              >
                                {startingExamId === exam.id ? 'Loading...' : 'Start Exam'}
                              </Button>
                            ) : examObj.assigned && exam.results_released ? (
                              <Button
                                fullWidth
                                variant="outlined"
                                color="success"
                                onClick={() => navigate(`/exam/${exam.id}/results`)}
                              >
                                View Results
                              </Button>
                            ) : (
                              <Button fullWidth variant="outlined" disabled>
                                {status.label}
                              </Button>
                            )}
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* PAGINATION */}
                <Paper sx={{ p: 1, display: 'flex', justifyContent: 'center', borderRadius: 2 }}>
                  <TablePagination
                    component="div"
                    count={totalExams}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[5, 10, 20]}
                    labelRowsPerPage="Exams per page:"
                  />
                </Paper>
              </Stack>
            )}
          </Grid>

        </Grid>
      </Container>

      {/* RULES DIALOG */}
      <Dialog
        open={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon /> Important Instructions
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText paragraph fontWeight="bold">
            Please review the rules before proceeding:
          </DialogContentText>
          <List dense>
            {examInstructions.map((text, index) => (
              <ListItem key={index} alignItems="flex-start" disableGutters>
                <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                  <CheckCircleIcon fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'transparent' }}>
          <Button onClick={() => setIsInstructionsOpen(false)} variant="contained" size="large" fullWidth>
            I Understand & Agree
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
