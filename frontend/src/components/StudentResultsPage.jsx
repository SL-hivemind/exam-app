import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Alert, CircularProgress, 
  Container, Stack, Chip, Divider, LinearProgress, Button
} from '@mui/material';
import {
  CheckCircle as CorrectIcon,
  Cancel as WrongIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  ArrowBack as BackIcon,
  HelpOutline as UnknownIcon
} from '@mui/icons-material';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentResultsPage() {
  const { examId } = useParams();
  const { authToken } = useAuth();
  const navigate = useNavigate();
  
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [examId, authToken]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/student/exams/${examId}/result`, {
        headers: { auth_token: authToken },
      });
      setResults(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error" variant="filled">{error}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/student')} sx={{ mt: 2 }}>
            Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!results) return null;

  const { exam, attempt, answers } = results;
  const percentage = Math.round((attempt.score / exam.total_marks) * 100) || 0;
  
  // Calculate stats
  const correctCount = answers.filter(a => a.is_correct).length;
  const incorrectCount = answers.filter(a => !a.is_correct && a.answer).length; // Wrong but attempted
  const skippedCount = answers.filter(a => !a.answer).length;

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        
        {/* HEADER */}
        <Button startIcon={<BackIcon />} onClick={() => navigate('/student')} sx={{ mb: 2 }}>
            Back to Dashboard
        </Button>
        
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4, bgcolor: '#fff', border: '1px solid #eee' }}>
            <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={8}>
                    <Typography variant="h4" fontWeight={800} color="primary.main">
                        {exam.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                        {exam.description || "Exam Results Analysis"}
                    </Typography>
                    
                    <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <TimeIcon color="action" />
                            <Typography variant="body2">
                                Submitted: {new Date(attempt.submitted_time).toLocaleString()}
                            </Typography>
                        </Box>
                    </Stack>
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <Paper 
                        elevation={3} 
                        sx={{ 
                            p: 3, borderRadius: 3, textAlign: 'center', 
                            bgcolor: percentage >= 70 ? '#e8f5e9' : percentage >= 40 ? '#fff3e0' : '#ffebee',
                            border: '1px solid',
                            borderColor: percentage >= 70 ? '#c8e6c9' : percentage >= 40 ? '#ffe0b2' : '#ffcdd2'
                        }}
                    >
                        <TrophyIcon sx={{ fontSize: 40, color: percentage >= 70 ? 'success.main' : 'warning.main', mb: 1 }} />
                        <Typography variant="h3" fontWeight={800}>
                            {attempt.score} <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>/ {exam.total_marks}</span>
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {percentage}% Score
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Paper>

        {/* PERFORMANCE SUMMARY */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #2e7d32' }}>
                    <Typography color="text.secondary" variant="subtitle2">Correct Answers</Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">{correctCount}</Typography>
                </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #d32f2f' }}>
                    <Typography color="text.secondary" variant="subtitle2">Incorrect Answers</Typography>
                    <Typography variant="h4" fontWeight={700} color="error.main">{incorrectCount}</Typography>
                </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #ed6c02' }}>
                    <Typography color="text.secondary" variant="subtitle2">Skipped / Unanswered</Typography>
                    <Typography variant="h4" fontWeight={700} color="warning.main">{skippedCount}</Typography>
                </Paper>
            </Grid>
        </Grid>

        {/* DETAILED QUESTION LIST */}
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Question Analysis</Typography>
        <Stack spacing={2}>
            {answers.map((ans, idx) => (
                <Paper key={idx} sx={{ p: 3, borderRadius: 2, border: '1px solid #eee' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        
                        <Box flexGrow={1}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                Q{idx + 1}. {ans.text}
                            </Typography>
                            
                            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Your Answer</Typography>
                                    <Typography variant="body1" fontWeight={500} color={ans.is_correct ? 'success.main' : ans.answer ? 'error.main' : 'text.disabled'}>
                                        {ans.answer || 'Not Answered'}
                                    </Typography>
                                </Box>
                                
                                {/* Only show correct answer if you want to (Optional) */}
                                {!ans.is_correct && (
                                    <Box sx={{ borderLeft: '1px solid #ddd', pl: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Correct Answer</Typography>
                                        <Typography variant="body1" fontWeight={500}>
                                            -- {/* Backend might need to send this explicitly if not in 'ans' object */}
                                            {/* If you want to show it, ensure backend sends 'correct_answer' in the results API */}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Box>

                        <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                            <Chip 
                                icon={ans.is_correct ? <CorrectIcon /> : ans.answer ? <WrongIcon /> : <UnknownIcon />}
                                label={ans.is_correct ? "Correct" : ans.answer ? "Wrong" : "Skipped"}
                                color={ans.is_correct ? "success" : ans.answer ? "error" : "default"}
                                variant="outlined"
                                sx={{ mb: 1, fontWeight: 'bold' }}
                            />
                            <Typography variant="body2" fontWeight={600}>
                                {ans.marks_awarded} / {ans.marks} Marks
                            </Typography>
                        </Box>

                    </Stack>
                </Paper>
            ))}
        </Stack>

      </Container>
    </Box>
  );
}