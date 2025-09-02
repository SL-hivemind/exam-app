import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Alert, CircularProgress } from '@mui/material';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentExamPage() {
  const { examId } = useParams();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExamDetails();

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Leaving or refreshing will submit your exam!';
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert('You left the exam tab. Timer will continue running. Return within allowed duration.');
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
        alert('This action is disabled during the exam!');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

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
      const canStartRes = await api.get(`/student/exams/${examId}/can_start`, { headers: { auth_token: authToken } });

      if (!canStartRes.data.assigned) {
        alert('You are not assigned to this exam');
        setLoading(false);
        return;
      }
      if (!canStartRes.data.within_window) {
        alert('Exam is not within the access window');
        setLoading(false);
        return;
      }
      if (canStartRes.data.already_submitted) {
        alert('You have already submitted this exam');
        setLoading(false);
        return;
      }

      const startRes = await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
      localStorage.setItem(`exam_${examId}_attempt_id`, startRes.data.attempt_id);

      // Redirect to questions page after starting exam
      navigate(`/exams/${examId}/questions`);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start exam');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}
