import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Button, Alert, Chip, IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentDashboard() {
  const { authToken } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [startingExamId, setStartingExamId] = useState(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const examsPerPage = 5;

  useEffect(() => {
    fetchExams();
  }, [authToken]);

  const fetchExams = async () => {
    try {
      const res = await api.get('/student/exams', {
        headers: { auth_token: authToken },
      });
      setExams(res.data.exams || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch exams');
    }
  };

  const handleStartExam = async (examId) => {
    if (startingExamId) return; // Prevent multiple clicks
    setStartingExamId(examId);
    try {
      const canStart = await api.get(`/student/exams/${examId}/can_start`, {
        headers: { auth_token: authToken },
      });

      if (!canStart.data.assigned) {
        alert('Exam not assigned.');
        setStartingExamId(null);
        return;
      }
      if (!canStart.data.within_window) {
        alert('Exam is not accessible now.');
        setStartingExamId(null);
        return;
      }
      if (canStart.data.already_submitted) {
        alert('Already submitted.');
        setStartingExamId(null);
        return;
      }

      await api.post(`/student/exams/${examId}/start`, {}, {
        headers: { auth_token: authToken },
      });

      navigate(`/exams/${examId}/questions`);
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot start exam');
    } finally {
      setStartingExamId(null);
    }
  };

  const handleViewResults = (examId) => {
    navigate(`/exam/${examId}/results`);
  };

  const isWithinAccessWindow = (exam) => {
    const now = new Date();
    const accessStart = exam.access_start ? new Date(exam.access_start) : null;
    const accessEnd = exam.access_end ? new Date(exam.access_end) : null;
    if (accessStart && now < accessStart) return false;
    if (accessEnd && now > accessEnd) return false;
    return true;
  };

  const getExamStatus = (examObj) => {
    if (!examObj.assigned) return { label: 'Not Assigned', color: 'default' };
    const exam = examObj.exam;
    const now = new Date();
    const accessStart = exam.access_start ? new Date(exam.access_start) : null;
    const accessEnd = exam.access_end ? new Date(exam.access_end) : null;

    if (!examObj.attempted) {
      if (accessStart && now < accessStart) return { label: 'Not Yet Available', color: 'default' };
      if (accessEnd && now > accessEnd) return { label: 'Expired', color: 'error' };
      return { label: 'Available', color: 'primary' };
    }
    return exam.results_released ? { label: 'Submitted', color: 'success' } : { label: 'Submitted (Pending)', color: 'warning' };
  };

  // Pagination logic
  const indexOfLastExam = currentPage * examsPerPage;
  const indexOfFirstExam = indexOfLastExam - examsPerPage;
  const currentExams = exams.slice(indexOfFirstExam, indexOfLastExam);
  const totalPages = Math.ceil(exams.length / examsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Student Dashboard</Typography>
        <IconButton onClick={fetchExams} color="primary" title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {exams.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>No exams assigned yet. Contact admin.</Alert>
      )}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Access Start</TableCell>
              <TableCell>Access End</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Total Marks</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentExams.map((examObj) => {
              const exam = examObj.exam;
              const status = getExamStatus(examObj);
              return (
                <TableRow key={exam.id}>
                  <TableCell>{exam.title}</TableCell>
                  <TableCell>{exam.description || 'N/A'}</TableCell>
                  <TableCell>{exam.access_start ? new Date(exam.access_start).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{exam.access_end ? new Date(exam.access_end).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{exam.duration_minutes} mins</TableCell>
                  <TableCell>{exam.total_marks}</TableCell>
                  <TableCell>
                    <Chip label={status.label} color={status.color} size="small" />
                  </TableCell>
                  <TableCell>
                    {examObj.assigned && !examObj.attempted && isWithinAccessWindow(exam) && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleStartExam(exam.id)}
                        disabled={startingExamId === exam.id}
                      >
                        {startingExamId === exam.id ? 'Starting...' : 'Start Exam'}
                      </Button>
                    )}
                    {examObj.assigned && exam.results_released && (
                      <Button size="small" variant="outlined" onClick={() => handleViewResults(exam.id)}>View Results</Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* Pagination Controls */}
      {exams.length > examsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</Button>
          <Typography>Page {currentPage} of {totalPages}</Typography>
          <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
        </Box>
      )}
    </Box>
  );
}
