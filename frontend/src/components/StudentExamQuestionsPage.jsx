import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import { InlineMath, BlockMath } from 'react-katex';

export default function StudentExamQuestionsPage() {
  const { examId } = useParams();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 3;

  useEffect(() => {
    validateExamAccess();
    return () => clearInterval(timerRef.current);
  }, [examId]);

  const validateExamAccess = async () => {
    setLoading(true);
    try {
      const canStartRes = await api.get(`/student/exams/${examId}/can_start`, {
        headers: { auth_token: authToken },
      });

      setExam(canStartRes.data.exam);

      if (!canStartRes.data.can_start) {
        setError(canStartRes.data.message || 'Exam is not available.');
      }

      const saved = localStorage.getItem(`exam_${examId}_answers`);
      if (saved) setMcqAnswers(JSON.parse(saved));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load exam.');
    }
    setLoading(false);
  };

  const handleStartExam = async () => {
    try {
      const startRes = await api.post(
        `/student/exams/${examId}/start`,
        {},
        { headers: { auth_token: authToken } }
      );

      setStarted(true);
      setExam(prev => ({ ...prev, questions: startRes.data.questions }));

      if (startRes.data.expires_at) {
        const expiresAt = new Date(startRes.data.expires_at);
        const now = new Date();
        const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(remainingSeconds);

        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              autoSubmitDueToTimeout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start exam.');
    }
  };

  const autoSubmitDueToTimeout = async () => {
    await handleSubmit(true);
    navigate('/dashboard', { state: { autoSubmitted: true } });
  };

  const handleSubmit = async (auto = false) => {
    if (submitted) return;
    setLoading(true);
    try {
      const answers = Object.entries(mcqAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer
      }));

      await api.post(
        `/student/exams/${examId}/submit`,
        { answers },
        { headers: { auth_token: authToken } }
      );

      setSubmitted(true);
      clearInterval(timerRef.current);
      localStorage.removeItem(`exam_${examId}_answers`);

      if (!auto) navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    }
    setLoading(false);
  };

  const handleMcqAnswerChange = (mcqId, answer) => {
    const updated = { ...mcqAnswers, [mcqId]: answer };
    setMcqAnswers(updated);
    localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(updated));
  };

  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const indexOfLastQ = currentPage * questionsPerPage;
  const indexOfFirstQ = indexOfLastQ - questionsPerPage;
  const currentQuestions = exam?.questions?.slice(indexOfFirstQ, indexOfLastQ) || [];

  const handlePageChange = (next) => {
    setCurrentPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <Box p={3}><CircularProgress /></Box>;

  if (error) return <Box p={3}><Alert severity="error">{error}</Alert></Box>;

  if (!started)
    return (
      <Box p={3}>
        <Button onClick={() => navigate('/dashboard')}>
          <ArrowBackIcon sx={{ mr: 1 }} /> Back
        </Button>

        <Typography variant="h4" sx={{ mt: 2 }}>{exam?.title}</Typography>
        <Typography variant="subtitle1">{exam?.description}</Typography>
        <Typography sx={{ mt: 1 }}>Questions: {exam?.total_questions}</Typography>
        <Typography>Duration: {exam?.duration_minutes} minutes</Typography>

        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6">Instructions:</Typography>
          <Typography>• Do not refresh</Typography>
          <Typography>• Do not switch tabs</Typography>
          <Typography>• Submit before timer ends</Typography>
        </Paper>

        <Button variant="contained" sx={{ mt: 3 }} onClick={handleStartExam}>
          Start Exam
        </Button>
      </Box>
    );

  return (
    <Box p={3}>
      {timeLeft > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>Time Remaining: {formatTime(timeLeft)}</Alert>
      )}

      {currentQuestions.map((mcq, idx) => (
        <Paper key={mcq.id} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6">Q{indexOfFirstQ + idx + 1}</Typography>
          <BlockMath math={mcq.text} />

          <RadioGroup
            value={mcqAnswers[mcq.id] || ''}
            onChange={e => handleMcqAnswerChange(mcq.id, e.target.value)}
          >
            {['A','B','C','D'].map(opt => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={<Radio />}
                label={<InlineMath math={mcq[`option_${opt.toLowerCase()}`]} />}
              />
            ))}
          </RadioGroup>
        </Paper>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Prev</Button>
        <Button disabled={indexOfLastQ >= exam.questions.length} onClick={() => handlePageChange(currentPage + 1)}>Next</Button>
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button variant="contained" onClick={() => handleSubmit(false)}>
          Submit Exam
        </Button>
      </Box>
    </Box>
  );
}
