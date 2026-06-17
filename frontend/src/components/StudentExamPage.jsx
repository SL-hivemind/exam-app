import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Alert, CircularProgress, Paper, Typography, Button, Container, Stack 
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentExamPage() {
  const { examId } = useParams();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('checking'); // checking, ready, error

  useEffect(() => {
    // 1. Setup Security Listeners
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Leaving or refreshing will submit your exam!';
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert('WARNING: You left the exam tab. The timer is still running. Repeated violations may submit your exam.');
      }
    };
    
    const handleContextMenu = (e) => e.preventDefault();
    
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && ['t', 'n', 'w', 'r'].includes(e.key.toLowerCase())) ||
        e.key === 'F5' || e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // 2. Check Exam Status
    fetchExamDetails();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [examId]);

  const fetchExamDetails = async () => {
    setLoading(true);
    try {
      // Step A: Check if allowed
      const canStartRes = await api.get(`/student/exams/${examId}/can_start`, { headers: { auth_token: authToken } });

      if (!canStartRes.data.assigned) throw new Error('You are not assigned to this exam.');
      if (!canStartRes.data.within_window) throw new Error('Exam is not currently accessible.');
      if (canStartRes.data.already_submitted) throw new Error('You have already submitted this exam.');

      // Step B: Start the attempt (Server logs start time)
      const startRes = await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
      
      // Save attempt ID if needed for recovery
      localStorage.setItem(`exam_${examId}_attempt_id`, startRes.data.attempt_id);

      setStatus('ready');
      
      // Add a small delay for UX so user sees "Starting..." before redirect
      setTimeout(() => {
          navigate(`/exams/${examId}/questions`);
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to start exam');
      setStatus('error');
    } finally {
      // We keep loading true if successful to show the "Redirecting" state
      if(status === 'error') setLoading(false);
    }
  };

  return (
    <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'transparent', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
    }}>
      <Container maxWidth="sm">
        <Paper elevation={4} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            
            {loading || status === 'ready' ? (
                <>
                    <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        Preparing Exam Environment...
                    </Typography>
                    <Typography color="text.secondary">
                        Please wait while we load your questions securely.
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 3, textAlign: 'left' }}>
                        <Typography variant="subtitle2" fontWeight="bold">Do not refresh or close this window.</Typography>
                        Doing so may result in your exam being auto-submitted.
                    </Alert>
                </>
            ) : error ? (
                <>
                    <WarningAmberIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h5" fontWeight={700} color="error" gutterBottom>
                        Unable to Start Exam
                    </Typography>
                    <Alert severity="error" sx={{ my: 3 }}>
                        {error}
                    </Alert>
                    <Button variant="outlined" onClick={() => navigate('/student')}>
                        Return to Dashboard
                    </Button>
                </>
            ) : null}

        </Paper>
      </Container>
    </Box>
  );
}