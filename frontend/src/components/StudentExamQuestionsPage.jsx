import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Container
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentExamQuestionsPage() {
  const { examId } = useParams();
  const { authToken, user } = useAuth(); // Get user object
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Start with loading true
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // pagination state for questions
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 3;

  // Create a unique key for local storage
  const storageKey = `examAnswers-${user?.id}-${examId}`;

  useEffect(() => {
    // Moved fetchExamDetails inside useEffect to be callable
    const fetchExamDetails = async () => {
      setLoading(true);
      try {
        // Get exam details from can_start first
        const canStartRes = await api.get(`/student/exams/${examId}/can_start`, { headers: { auth_token: authToken } });

        // Fetch questions
        const questionsRes = await api.get(`/student/exams/${examId}/questions`, { headers: { auth_token: authToken } });

        setExam({ ...canStartRes.data.exam, questions: questionsRes.data.questions, results_released: canStartRes.data.exam?.results_released });

        // Get or start attempt to set timer
        const attemptRes = await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
        localStorage.setItem(`exam_${examId}_attempt_id`, attemptRes.data.attempt_id);

        // --- NEW: Load saved answers from local storage ---
        const savedAnswers = localStorage.getItem(storageKey);
        if (savedAnswers) {
          setMcqAnswers(JSON.parse(savedAnswers));
        }
        // --- End of new code ---

        const expiresAt = new Date(attemptRes.data.expires_at);
        const now = new Date();
        const remainingMs = expiresAt - now;
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        setTimeLeft(remainingSeconds);

        if (remainingSeconds <= 0) {
          // Time has already expired, set timeLeft to 0 and don't start timer
          setTimeLeft(0);
          setLoading(false);
          return;
        }

        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleSubmitMcqAnswers();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch exam questions');
        setExam(null);
      }
      setLoading(false);
    };

    fetchExamDetails();

    return () => {
      clearInterval(timerRef.current);
    };
  }, [examId, authToken, storageKey]); // Added authToken and storageKey

  // --- NEW: useEffect to save answers to local storage on change ---
  useEffect(() => {
    // Don't save an empty object on initial load
    if (Object.keys(mcqAnswers).length > 0 && !submitted) {
      localStorage.setItem(storageKey, JSON.stringify(mcqAnswers));
    }
  }, [mcqAnswers, storageKey, submitted]);
  // --- End of new code ---


  const handleMcqAnswerChange = (mcqId, answer) => {
    setMcqAnswers(prev => ({ ...prev, [mcqId]: answer }));
  };

  const handleSubmitMcqAnswers = async () => {
    if (submitted) return;

    // --- NEW: Check if all questions are answered ---
    const totalQuestions = exam?.questions?.length || 0;
    const answeredQuestions = Object.keys(mcqAnswers).length;

    if (answeredQuestions < totalQuestions) {
      setError("Please attempt all questions before submitting.");
      return; // Stop the submission
    }
    // --- End of new check ---

    setLoading(true);
    setError(''); // Clear any previous errors
    try {
      const answers = Object.entries(mcqAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer
      }));

      await api.post(`/student/exams/${examId}/submit`, { answers }, { headers: { auth_token: authToken } });
      setSubmitted(true);
      setShowResults(true);
      clearInterval(timerRef.current);

      // --- NEW: Clear local storage on successful submission ---
      localStorage.removeItem(storageKey);

    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    }
    setLoading(false);
  };

  const fetchResults = async () => {
    try {
      const res = await api.get(`/student/exams/${examId}/result`, { headers: { auth_token: authToken } });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch results');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Helper variables for validation
  const totalQuestions = exam?.questions?.length || 0;
  const answeredQuestions = Object.keys(mcqAnswers).length;
  const allQuestionsAnswered = answeredQuestions === totalQuestions;

  // Pagination logic for questions
  const indexOfLastQ = currentPage * questionsPerPage;
  const indexOfFirstQ = indexOfLastQ - questionsPerPage;
  const currentQuestions = exam?.questions?.slice(indexOfFirstQ, indexOfLastQ) || [];
  const totalPages = Math.ceil((exam?.questions?.length || 0) / questionsPerPage);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!exam && !loading) {
    return (
      <Box sx={{ p: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}
      </Box>
    );
  }

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
      <Container maxWidth="md">
        {exam && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <IconButton onClick={() => navigate('/dashboard/student')} sx={{ mr: 2, backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <ArrowBackIcon sx={{ color: 'white' }} />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: 'white', textShadow: '1px 1px 3px #000' }}>{exam.title}</Typography>
                <Typography variant="subtitle1" sx={{ color: 'white', textShadow: '1px 1px 2px #000' }}>{exam.description}</Typography>
              </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* --- VISIBLE STICKY TIMER (MODIFIED) --- */}
            {!submitted && (
              <Paper
                elevation={4}
                sx={{
                  position: 'sticky',
                  top: '64px', // Sticks to the top of the scrolling container
                  zIndex: 1100, // Stays on top of other content
                  mb: 2,
                }}
              >
                <Alert
                  severity={allQuestionsAnswered ? "success" : (timeLeft < 300 ? "warning" : "info")}
                  sx={{
                    backgroundColor: allQuestionsAnswered ? 'rgba(46, 125, 50, 0.9)' : (timeLeft < 300 ? 'rgba(255, 165, 0, 0.9)' : 'rgba(23, 118, 209, 0.9)'),
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }}
                  icon={false}
                >
                  {timeLeft > 0 ? `Time Remaining: ${formatTime(timeLeft)}` : "Time's up! Submitting..."} | Attempted: {answeredQuestions} of {totalQuestions}
                </Alert>
              </Paper>
            )}
            {/* --- END OF TIMER --- */}

            {currentQuestions.map((mcq, idx) => (
              <Paper key={mcq.id} sx={{ p: 3, mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                <Typography variant="h6">Question {indexOfFirstQ + idx + 1}</Typography>
                <Typography sx={{ my: 1 }}>{mcq.text}</Typography>

                {mcq.image_path && (
                  <Box sx={{ my: 2 }}>
                    <img
                      src={mcq.image_path}
                      alt="Question"
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxWidth: '600px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        display: 'block',
                      }}
                    />
                  </Box>
                )}

                <RadioGroup value={mcqAnswers[mcq.id] || ''} onChange={e => handleMcqAnswerChange(mcq.id, e.target.value)}>
                  <FormControlLabel value="A" control={<Radio disabled={submitted} />} label={`A: ${mcq.option_a}`} />
                  <FormControlLabel value="B" control={<Radio disabled={submitted} />} label={`B: ${mcq.option_b}`} />
                  <FormControlLabel value="C" control={<Radio disabled={submitted} />} label={`C: ${mcq.option_c}`} />
                  <FormControlLabel value="D" control={<Radio disabled={submitted} />} label={`D: ${mcq.option_d}`} />
                </RadioGroup>
              </Paper>
            ))}

            {exam.questions?.length > questionsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2, alignItems: 'center' }}>
                <Button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</Button>
                <Typography>Page {currentPage} of {totalPages}</Typography>
                <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
                {!submitted && (
                  <>
                    <Button
                      variant="contained"
                      onClick={handleSubmitMcqAnswers}
                      disabled={loading || !allQuestionsAnswered} // Modified
                      sx={{ ml: 3 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Submit Answers'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/dashboard')}
                      sx={{ ml: 2 }}
                    >
                      Back to Dashboard
                    </Button>
                  </>
                )}
              </Box>
            )}

            {(!exam.questions?.length || exam.questions?.length <= questionsPerPage) && !submitted && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                <Button 
                  variant="contained" 
                  onClick={handleSubmitMcqAnswers} 
                  disabled={loading || !allQuestionsAnswered} // Modified
                >
                  {loading ? <CircularProgress size={24} /> : 'Submit Answers'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </Box>
            )}

            {submitted && (
              <Paper sx={{ p: 3, mt: 3 }}>
                <Typography>Submission Complete</Typography>
                <Typography>
                  Your answers have been submitted successfully.
                  {exam.results_released ? ' Results are available.' : ' Results will be available once released.'}
                </Typography>
                {exam.results_released && (
                  <Button onClick={fetchResults} variant="contained" sx={{ mt: 2 }}>View Results</Button>
                )}
              </Paper>
            )}

            <Dialog open={showResults && results} onClose={() => setShowResults(false)} fullWidth maxWidth="sm">
              <DialogTitle>Exam Results</DialogTitle>
              <DialogContent>
                {results && (
                  <Box>
                    <Typography>Score: {results.attempt.score}/{results.exam.total_marks}</Typography>
                    <Typography>Submitted at: {results.attempt.submitted_time}</Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowResults(false)}>Close</Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Container>
    </Box>
  );
}