import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Alert, CircularProgress
} from '@mui/material';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentResultsPage() {
  const { examId } = useParams();
  const { authToken } = useAuth();
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

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!results) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No results available.</Alert>
      </Box>
    );
  }

  const { exam, attempt, answers } = results;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Exam Results</Typography>
      <Typography variant="h5">{exam.title}</Typography>
      <Typography variant="subtitle1">{exam.description}</Typography>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6">Summary</Typography>
        <Typography>Score: {attempt.score} / {exam.total_marks}</Typography>
        <Typography>Start Time: {new Date(attempt.start_time).toLocaleString()}</Typography>
        <Typography>Submitted Time: {new Date(attempt.submitted_time).toLocaleString()}</Typography>
      </Paper>

      <Paper sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>Detailed Answers</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Question</TableCell>
              <TableCell>Your Answer</TableCell>
              <TableCell>Correct</TableCell>
              <TableCell>Marks Awarded</TableCell>
              <TableCell>Total Marks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {answers.map((ans, idx) => (
              <TableRow key={idx}>
                <TableCell>{ans.text}</TableCell>
                <TableCell>{ans.answer || 'Not Answered'}</TableCell>
                <TableCell>{ans.is_correct ? 'Yes' : 'No'}</TableCell>
                <TableCell>{ans.marks_awarded}</TableCell>
                <TableCell>{ans.marks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
