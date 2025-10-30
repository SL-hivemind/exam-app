import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Button, Alert, Chip, IconButton, Container, Stack, List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventNoteIcon from '@mui/icons-material/EventNote';
import InfoIcon from '@mui/icons-material/Info'; // Import icon for instructions
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';


const upcomingAssessments = [
  "Monthly Tests (October 2025)",
];

// --- NEW: Instructions List ---
const examInstructions = [
  "Attempt all questions within the allotted time. There are no negative marks.",
  "You must complete the exam within the specified duration.",
  "If the timer runs out, your exam will be automatically submitted.",
  "If the exam is interrupted (e.g., tab close, browser crash), log back in immediately to resume.",
  "The exam timer does not stop for any reason (logout, tab close, network issues, etc.).",
  "Do not switch tabs during the exam. Ensure you click the 'Submit' button to finalize your attempt.",
  "No re-attempts are allowed for any exam."
];


export default function StudentDashboard() {
  const { authToken } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [startingExamId, setStartingExamId] = useState(null);

  // --- NEW: State for Instructions Modal ---
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const examsPerPage = 5;

  useEffect(() => {
    fetchExams();
  }, [authToken]);

  // --- NEW: useEffect to open instructions on load ---
  useEffect(() => {
    // Open the instructions modal once when the component mounts
    setIsInstructionsOpen(true);
  }, []); // Empty dependency array ensures this runs only once on mount


  // --- MODIFICATION 1: Helper functions moved ABOVE fetchExams ---

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

  // --- MODIFICATION 2: New helper to check if exam is "Available" ---
  const isExamAvailable = (examObj) => {
    if (!examObj || !examObj.exam) return false;
    // An exam is available if it's assigned, not attempted, and within the window
    return examObj.assigned && !examObj.attempted && isWithinAccessWindow(examObj.exam);
  };


  const fetchExams = async () => {
    try {
      const res = await api.get('/student/exams', {
        headers: { auth_token: authToken },
      });
      const fetchedExams = res.data.exams || [];

      // --- MODIFICATION 3: Sort exams to put "Available" (active) ones first ---
      const sortedExams = fetchedExams.sort((a, b) => {
        const isAAvailable = isExamAvailable(a);
        const isBAvailable = isExamAvailable(b);

        if (isAAvailable && !isBAvailable) return -1; // a (available) comes before b (not available)
        if (!isAAvailable && isBAvailable) return 1;  // b (available) comes before a (not available)
        
        // If both are same status (both available or both not), keep original order (or sort by ID)
        // For example, to sort by ID as a secondary factor:
        // return a.exam.id - b.exam.id;
        return 0; // Maintain original relative order for exams of the same status
      });
      // --- END MODIFICATION ---

      setExams(sortedExams); // Set the newly sorted list
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch exams');
    }
  };

  // --- NEW: Handler to close the instructions modal ---
  const handleCloseInstructions = () => {
    setIsInstructionsOpen(false);
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

  // Pagination logic
  const indexOfLastExam = currentPage * examsPerPage;
  const indexOfFirstExam = indexOfLastExam - examsPerPage;
  const currentExams = exams.slice(indexOfFirstExam, indexOfLastExam);
  const totalPages = Math.ceil(exams.length / examsPerPage);

  return (
    <Box sx={{
      width: '100%',
      minHeight: 'calc(100vh - 140px)',
      backgroundImage: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      py: 4,
    }}>
      <Container maxWidth="lg">
        {/* --- NEW: Instructions Dialog Component --- */}
        <Dialog
          open={isInstructionsOpen}
          onClose={handleCloseInstructions}
          aria-labelledby="instructions-dialog-title"
        >
          <DialogTitle id="instructions-dialog-title">
            Important Exam Instructions
          </DialogTitle>
          <DialogContent>
            <DialogContentText component="div" sx={{ mb: 2 }}>
              Please read the following rules carefully before starting any exam:
            </DialogContentText>
            <List dense>
              {examInstructions.map((text, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: '40px' }}>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={text} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseInstructions} variant="contained" autoFocus>
              I Understand
            </Button>
          </DialogActions>
        </Dialog>


        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: 'white', textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}
          >
            Student Dashboard
          </Typography>
          <IconButton onClick={fetchExams} title="Refresh" sx={{ backgroundColor: 'rgba(255,255,255,0.2)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' } }}>
            <RefreshIcon sx={{ color: 'white' }} />
          </IconButton>
        </Box>

        {/* --- DESKTOP VIEW: The Table (Visible on medium screens and up) --- */}
        <Paper sx={{
          display: { xs: 'none', md: 'block' }, // Hide on small screens, show on medium+
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          overflow: 'hidden'
        }}>
          <Box sx={{ overflowX: 'auto' }}>
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
          </Box>
        </Paper>

        {/* --- MOBILE VIEW: Card List (Visible on small screens) --- */}
        <Stack spacing={2} sx={{ display: { xs: 'flex', md: 'none' } }}>
          {currentExams.map((examObj) => {
            const exam = examObj.exam;
            const status = getExamStatus(examObj);
            return (
              <Paper key={exam.id} sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                <Typography variant="h6" fontWeight="bold">{exam.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{exam.description || 'No description'}</Typography>
                <Chip label={status.label} color={status.color} size="small" sx={{ mb: 2 }} />

                <Typography variant="body2"><strong>Duration:</strong> {exam.duration_minutes} mins</Typography>
                <Typography variant="body2"><strong>Marks:</strong> {exam.total_marks}</Typography>
                <Typography variant="body2"><strong>Opens:</strong> {exam.access_start ? new Date(exam.access_start).toLocaleString() : 'N/A'}</Typography>
                <Typography variant="body2"><strong>Closes:</strong> {exam.access_end ? new Date(exam.access_end).toLocaleString() : 'N/A'}</Typography>

                <Box sx={{ mt: 2, textAlign: 'right' }}>
                  {examObj.assigned && !examObj.attempted && isWithinAccessWindow(exam) && (
                    <Button
                      variant="contained"
                      onClick={() => handleStartExam(exam.id)}
                      disabled={startingExamId === exam.id}
                    >
                      {startingExamId === exam.id ? 'Starting...' : 'Start Exam'}
                    </Button>
                  )}
                  {examObj.assigned && exam.results_released && (
                    <Button variant="outlined" color="success" onClick={() => handleViewResults(exam.id)}>
                      View Results
                    </Button>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Stack>

        {/* --- Pagination Controls (Visible for both views) --- */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1.5, mt: 2, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 2 }}>
            <Button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} sx={{ color: 'white' }}>Previous</Button>
            <Typography sx={{ color: 'white', alignSelf: 'center', mx: 2 }}>
              Page {currentPage} of {totalPages}
            </Typography>
            <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} sx={{ color: 'white' }}>Next</Button>
          </Box>
        )}

        {/* --- NEW: Upcoming Assessments Section ---*/}
        <Paper sx={{ p: 3, mt: 3, mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>Upcoming Assessments</Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>Term 2</Typography>
          <List dense>
            {upcomingAssessments.map((assessment, index) => (
              <ListItem key={index} disablePadding>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <EventNoteIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={assessment} />
              </ListItem>
            ))}
          </List>
        </Paper>


        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {exams.length === 0 && !error && (
          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="h6">No exams have been assigned to you yet.</Typography>
            <Typography color="text.secondary">Please check back later or contact your administrator.</Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
}