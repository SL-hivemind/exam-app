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

  // Add a new state for submit loading
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleSubmitMcqAnswers = React.useCallback(async (forceSubmit = false) => {
    if (submitted) return; 

    setSubmitLoading(true); // Use separate loading state for submit
    setError('');  
    
    try {
      const answers = Object.entries(mcqAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer
      }));

      await api.post(`/student/exams/${examId}/submit`, { answers }, { 
        headers: { auth_token: authToken } 
      });
      
      // Clear timer and storage
      clearInterval(timerRef.current);
      localStorage.removeItem(storageKey);
      
      // Update states
      setSubmitted(true);
      setShowResults(true);

    } catch (err) {  
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitLoading(false); // Always reset submit loading
    }
  }, [examId, authToken, storageKey, mcqAnswers, submitted, timerRef]);


  useEffect(() => {
    const fetchExamDetails = async () => {
      setLoading(true); // <-- Set to true at the start
      try {
        // 1. Get the exam status first
        const canStartRes = await api.get(`/student/exams/${examId}/can_start`, { headers: { auth_token: authToken } });
        const { assigned, within_window, already_submitted } = canStartRes.data;

        // --- Check for assignment ---
        if (!assigned) {
          setError("You are not assigned to this exam.");
          return; // Exit, 'finally' will set loading to false
        }

        // 2. Check for time window FIRST.
        if (!within_window && !already_submitted) {
          setError("This exam is not currently available. Please check the access times.");
          return; // Exit, 'finally' will set loading to false
        }
        
        // 3. Check for submission SECOND.
        if (already_submitted) {
          setError("You have already submitted this exam.");
          setExam(canStartRes.data.exam);  
          setSubmitted(true);
          return; // Exit, 'finally' will set loading to false
        }
        
        // 4. If all checks pass, THEN fetch questions and start the exam
        const questionsRes = await api.get(`/student/exams/${examId}/questions`, { headers: { auth_token: authToken } });
        setExam({ ...canStartRes.data.exam, questions: questionsRes.data.questions, results_released: canStartRes.data.exam?.results_released });

        // 5. Now it's safe to start the attempt
        const attemptRes = await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
        localStorage.setItem(`exam_${examId}_attempt_id`, attemptRes.data.attempt_id);

        // --- Load saved answers from local storage ---
        const savedAnswers = localStorage.getItem(storageKey);
        if (savedAnswers) {
          setMcqAnswers(JSON.parse(savedAnswers));
        }
        // --- End of loading code ---

        const expiresAt = new Date(attemptRes.data.expires_at);
        const now = new Date();
        const remainingMs = expiresAt - now;
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        setTimeLeft(remainingSeconds);

        if (remainingSeconds <= 0) {
          setTimeLeft(0);
          handleSubmitMcqAnswers(true); // Force submit if time is already 0
          return; // Exit, 'finally' will set loading to false
        }

        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleSubmitMcqAnswers(true); // Force submit
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch exam details');
        setExam(null);
      } finally {
        // --- THIS IS THE FIX ---
        // This block runs *no matter what* (success, error, or return)
        // This guarantees the loading state is turned off.
        setLoading(false);
      }
    };

    fetchExamDetails();

    return () => {
      clearInterval(timerRef.current);
    };
  }, [examId, authToken, storageKey, handleSubmitMcqAnswers]); 

  
  // Replace the existing localStorage useEffect with this debounced version
  useEffect(() => {
    // Don't save if submitted
    if (submitted) return;

    // Debounce the save operation
    const saveTimer = setTimeout(() => {
      if (Object.keys(mcqAnswers).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(mcqAnswers));
      }
    }, 500); // Wait 500ms after last change before saving

    return () => clearTimeout(saveTimer);
  }, [mcqAnswers, storageKey, submitted]);
  


  const handleMcqAnswerChange = (mcqId, answer) => {
    // Don't allow changes if already submitted
    if (submitted) return;
    
    setMcqAnswers(prev => ({ ...prev, [mcqId]: answer }));
  };

  
  // handleSubmitMcqAnswers is now defined above using useCallback


  const fetchResults = async () => {
    try {
      const res = await api.get(`/student/exams/${examId}/result`, { headers: { auth_token: authToken } });
      setResults(res.data);
      setShowResults(true); // Open the dialog once results are fetched
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch results');
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Helper variables
  const totalQuestions = exam?.questions?.length || 0;
  const answeredQuestions = Object.keys(mcqAnswers).length;
  const allQuestionsAnswered = answeredQuestions === totalQuestions; // Still useful for the timer bar color

  // Pagination logic for questions
  const indexOfLastQ = currentPage * questionsPerPage;
  const indexOfFirstQ = indexOfLastQ - questionsPerPage;
  const currentQuestions = exam?.questions?.slice(indexOfFirstQ, indexOfLastQ) || [];
  const totalPages = Math.ceil((exam?.questions?.length || 0) / questionsPerPage);

  // This is the initial full-page loader
  if (loading && !exam) { 
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // This block shows all errors ("Not assigned", "Not available", etc.)
  if (!exam && !loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
          <Typography variant="h5" gutterBottom>Error</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <Button 
            variant="contained" 
            onClick={() => navigate('/dashboard/student')} 
            sx={{ mt: 2 }}
            startIcon={<ArrowBackIcon />}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  // This handles the "already submitted" case
  if (submitted) {
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
            <Paper sx={{ p: 3, mt: 3, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
              <Typography variant="h5" gutterBottom>Submission Complete</Typography>
              <Typography>
                {
                 error && error.includes("submitted") ? error : 'Your answers have been submitted successfully.'
                }
              </Typography>
              <Typography>
                {exam.results_released ? ' Results are available.' : ' Results will be available once released.'}
              </Typography>
              {exam.results_released && (
                <Button onClick={fetchResults} variant="contained" sx={{ mt: 2 }}>View Results</Button>
              )}
               <Button 
                variant="outlined" 
                onClick={() => navigate('/dashboard/student')} 
                sx={{ mt: 2, ml: 2 }}
              >
                Back to Dashboard
              </Button>
            </Paper>

            <Dialog open={showResults && results} onClose={() => setShowResults(false)} fullWidth maxWidth="sm">
              <DialogTitle>Exam Results - {results?.exam?.title}</DialogTitle>
              <DialogContent>
                {results && (
                  <Box>
                    <Typography variant="h6">Score: {results.attempt.score}/{results.exam.total_marks}</Typography>
                    <Typography>Submitted at: {new Date(results.attempt.submitted_time).toLocaleString()}</Typography>
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowResults(false)}>Close</Button>
              </DialogActions>
            </Dialog>
        </Container>
      </Box>
    )
  }

  // This is the main exam-taking page
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

            {error && !error.includes("submitted") && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!submitted && (
              <Paper
                elevation={4}
                sx={{
                  position: 'sticky',
                  top: '64px', 
                  zIndex: 1301, 
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
              <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                <Button variant="contained" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Prev</Button>
                <Typography>Page {currentPage} of {totalPages}</Typography>
                <Button variant="contained" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Next</Button>
              </Paper>
            )}

            {!submitted && (
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleSubmitMcqAnswers(false)} 
                  disabled={submitLoading || submitted} // Use submitLoading instead of loading
                  sx={{ minWidth: '200px' }}
                >
                  {submitLoading ? <CircularProgress size={24} /> : 'Submit Answers'}
                </Button>
              </Box>
            )}

            {/* Removed the "Please answer all questions" alert */}
          </>
        )}
      </Container>
    </Box>
  );
}