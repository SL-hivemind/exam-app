import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentExamQuestionsPage() {
  const { examId } = useParams();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // pagination state for questions
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 3;

  useEffect(() => {
    fetchExamDetails();

    return () => {
      clearInterval(timerRef.current);
    };
  }, [examId]);

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

  const handleMcqAnswerChange = (mcqId, answer) => {
    setMcqAnswers(prev => ({ ...prev, [mcqId]: answer }));
  };

  const handleSubmitMcqAnswers = async () => {
    if (submitted) return;
    setLoading(true);
    try {
      const answers = Object.entries(mcqAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer
      }));

      await api.post(`/student/exams/${examId}/submit`, { answers }, { headers: { auth_token: authToken } });
      setSubmitted(true);
      setShowResults(true);
      clearInterval(timerRef.current);
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

            {!submitted && timeLeft > 0 && (
              <Alert severity="info" sx={{ mb: 2, backgroundColor: 'rgba(23, 118, 209, 0.9)', color: 'white', fontWeight: 'bold' }}>
                Time Remaining: {formatTime(timeLeft)}
              </Alert>
            )}

            {currentQuestions.map((mcq, idx) => (
              <Paper key={mcq.id} sx={{ p: 3, mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
                <Typography variant="h6">Question {indexOfFirstQ + idx + 1}</Typography>
                <Typography sx={{ my: 1 }}>{mcq.text}</Typography>

                {mcq.image_path && (
                  <Box sx={{ my: 2 }}>
                    {/* --- CRITICAL FIX: Use the direct S3 URL --- */}
                    <img
                      src={mcq.image_path}
                      alt="Question"
                      loading="lazy"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: '8px' }}
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
                      disabled={loading}
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
                <Button variant="contained" onClick={handleSubmitMcqAnswers} disabled={loading}>
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
