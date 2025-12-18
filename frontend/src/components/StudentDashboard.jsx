import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Alert, Chip, IconButton, Container, Toolbar,
  Stack, List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  Grid, Card, CardContent, CardActions, Divider, Tooltip, Zoom, CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  EventNote as EventNoteIcon,
  Info as InfoIcon,
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
  // --- FIX: Destructure 'user' here ---
  const { authToken, user } = useAuth(); 
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [startingExamId, setStartingExamId] = useState(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  useEffect(() => {
    fetchExams();
    const instructionsShown = localStorage.getItem('instructionsShown');
    if (!instructionsShown) {
      setIsInstructionsOpen(true);
      localStorage.setItem('instructionsShown', 'true');
    }
  }, [authToken]);

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
    return examObj.assigned && !examObj.attempted && isWithinAccessWindow(examObj.exam);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const fetchExams = async () => {
    try {
      const res = await api.get('/student/exams', { headers: { auth_token: authToken } });
      const fetchedExams = res.data.exams || [];

      const sortedExams = fetchedExams.sort((a, b) => {
        const aActive = isExamAvailable(a);
        const bActive = isExamAvailable(b);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return 0;
      });

      setExams(sortedExams);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch exams');
    }
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

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      
      <Toolbar /> 

      <Container maxWidth="lg" sx={{ py: 4 }}>
        
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, mb: 4, borderRadius: 3, 
            bgcolor: 'white', 
            border: '1px solid #e0e0e0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
          }}
        >
          <Box>
            <Box sx={{ color: 'primary.main', mb: 1 }}>
                <AnimatedText 
                    text={`Hello, ${user?.name || user?.username || 'Student'}!`} 
                    type="split" 
                    tag="h1"
                    className="MuiTypography-root MuiTypography-h4"
                    color="#1976d2"
                />
            </Box>
            <Typography variant="body1" color="text.secondary">
              View your schedule and take assessments.
            </Typography>
          </Box>

          <Stack direction="row" spacing={2}>
             <Button 
                startIcon={<InfoIcon />} 
                variant="outlined" 
                onClick={() => setIsInstructionsOpen(true)}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
             >
               Rules
             </Button>
             <Tooltip title="Refresh List" arrow>
                <IconButton onClick={fetchExams} color="primary" sx={{ border: '1px solid #e0e0e0' }}>
                  <RefreshIcon />
                </IconButton>
             </Tooltip>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <Grid container spacing={3}>
          
          <Grid item xs={12} md={8}>
            {exams.length === 0 && !error ? (
              <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 3, bgcolor: 'white', border: '1px solid #e0e0e0' }}>
                <AssignmentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No exams assigned yet.</Typography>
              </Paper>
            ) : (
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

                        <CardActions sx={{ p: 2, pt: 0, bgcolor: '#fafafa' }}>
                          {active ? (
                            <Button 
                              fullWidth 
                              variant="contained" 
                              color="primary"
                              size="large"
                              onClick={() => handleStartExam(exam.id)}
                              disabled={startingExamId === exam.id}
                              startIcon={startingExamId === exam.id ? <CircularProgress size={20} color="inherit"/> : <PlayArrowIcon />}
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
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, borderRadius: 3, 
                bgcolor: 'white', 
                border: '1px solid #e0e0e0',
                position: 'sticky', top: 90 
              }}
            >
              <Typography variant="h6" fontWeight={700} gutterBottom display="flex" alignItems="center">
                <EventNoteIcon sx={{ mr: 1, color: 'primary.main' }} /> 
                Upcoming
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List disablePadding>
                {upcomingAssessments.map((assessment, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={assessment} 
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} 
                    />
                  </ListItem>
                ))}
              </List>

              <Box mt={4} p={2} bgcolor="#e3f2fd" borderRadius={2}>
                <Typography variant="subtitle2" color="primary.main" gutterBottom fontWeight={700}>
                  Did you know?
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Exams are auto-submitted when the timer runs out when you are attempting. Ensure you save your answers frequently.
                </Typography>
              </Box>
            </Paper>
          </Grid>

        </Grid>
      </Container>

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
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setIsInstructionsOpen(false)} variant="contained" size="large" fullWidth>
            I Understand & Agree
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}