import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, Alert, RadioGroup,
  FormControlLabel, Radio, CircularProgress, Container, Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Drawer, IconButton, useTheme, useMediaQuery, Divider, Fab
} from '@mui/material';
import { AccessTime as TimerIcon, Apps as AppsIcon, Close as CloseIcon } from '@mui/icons-material';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import useExamSecurity from '../hooks/useExamSecurity'; 

export default function StudentExamQuestionsPage() {
  const { examId } = useParams();
  const { authToken, user } = useAuth();
  const navigate = useNavigate();

  // --- STATE ---
  const [exam, setExam] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  // Pagination & Navigation
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 3;
  const [visitedPages, setVisitedPages] = useState(new Set([1]));
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    setVisitedPages(prev => new Set(prev).add(currentPage));
  }, [currentPage]);

  // Refs for stable callbacks
  const timerRef = useRef(null);
  const handleSubmitRef = useRef();

  // Memoized key for local storage
  const storageKey = useMemo(() => `examAnswers-${user?.id}-${examId}`, [user?.id, examId]);

  // --- 1. SECURITY HOOK ---
  useExamSecurity(!loading && !submitted, (type) => {
      if (type === 'tab_switch') {
          setViolations(prev => {
              const next = prev + 1;
              if (next >= 3) {
                  alert("WARNING: Too many tab switches. Your exam is being auto-submitted.");
                  handleSubmitRef.current('tab_switch');
              }
              return next;
          });
      }
  });

  // --- 2. FULLSCREEN REQUEST ---
  useEffect(() => {
      const enterFullScreen = async () => {
          try {
              if (document.documentElement.requestFullscreen) {
                  await document.documentElement.requestFullscreen();
              }
          } catch(e) {
              // Fullscreen might be blocked by browser settings, ignore error
          }
      };
      if (!loading && !submitted) enterFullScreen();
  }, [loading, submitted]);


  // --- 3. SUBMIT LOGIC ---
  const handleSubmitMcqAnswers = useCallback(async (reason = 'manual') => {
    if (submitted) return;

    setSubmitLoading(true);
    setError('');
    
    try {
      const answers = Object.entries(mcqAnswers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer
      }));

      await api.post(`/student/exams/${examId}/submit`, { answers, reason }, { 
        headers: { auth_token: authToken } 
      });
      
      clearInterval(timerRef.current);
      localStorage.removeItem(storageKey);
      setSubmitted(true);
      
      if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});

      navigate(`/exam/${examId}/results`, { replace: true });

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
      setSubmitLoading(false);
    }
  }, [examId, authToken, storageKey, mcqAnswers, submitted, navigate]);

  // Keep ref updated for timer/beacon
  useEffect(() => {
    handleSubmitRef.current = handleSubmitMcqAnswers;
  }, [handleSubmitMcqAnswers]);


  // --- 4. BEACON REMOVED ---
  // sendBeacon cannot send auth headers, so it always fails.
  // Auto-save + Lazy Finalization already covers tab-close scenarios.


  // --- 5. INITIALIZATION & TIMER ---
  useEffect(() => {
    if (!authToken) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }

    const fetchExamDetails = async () => {
      setLoading(true);
      try {
        // Step A: Validate Access
        const canStartRes = await api.get(`/student/exams/${examId}/can_start`, { headers: { auth_token: authToken } });
        const { assigned, within_window, already_submitted } = canStartRes.data;

        if (!assigned || (!within_window && !already_submitted)) {
           setError("Exam is not currently available.");
           setLoading(false);
           return;
        }
        if (already_submitted) {
           navigate(`/exam/${examId}/results`); 
           return;
        }
        
        // Step B: Fetch Questions
        const questionsRes = await api.get(`/student/exams/${examId}/questions`, { headers: { auth_token: authToken } });
        setExam({ ...canStartRes.data.exam, questions: questionsRes.data.questions });

        // Step C: Restore Local Answers
        const savedAnswersStr = localStorage.getItem(storageKey);
        let mergedAnswers = savedAnswersStr ? JSON.parse(savedAnswersStr) : {};

        // Step D: Start/Resume Attempt
        const attemptRes = await api.post(`/student/exams/${examId}/start`, {}, { headers: { auth_token: authToken } });
        
        // Merge answers from server (if resuming on different device)
        if (attemptRes.data.saved_answers) {
           mergedAnswers = { ...attemptRes.data.saved_answers, ...mergedAnswers };
        }
        
        if (Object.keys(mergedAnswers).length > 0) {
           setMcqAnswers(mergedAnswers);
        }

        const expiresAt = new Date(attemptRes.data.expires_at);
        const now = new Date();
        let remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
        
        if (isNaN(remainingSeconds)) remainingSeconds = (canStartRes.data.exam.duration_minutes || 60) * 60;

        setTimeLeft(remainingSeconds);

        if (remainingSeconds <= 0) {
           handleSubmitRef.current('timeout');
           return;
        }

        // Start Timer
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleSubmitRef.current('timeout'); // Time's up!
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load exam');
      } finally {
        setLoading(false);
      }
    };

    fetchExamDetails();
    return () => clearInterval(timerRef.current);
  }, [examId, authToken, storageKey, navigate]);


  // --- 6. AUTO-SAVE ANSWERS (sends only the changed answer) ---
  const lastSavedRef = useRef({});
  useEffect(() => {
    if (submitted) return;
    const saveTimer = setTimeout(async () => {
      if (Object.keys(mcqAnswers).length > 0) {
        // 1. Save full state locally for instant page-reload recovery
        localStorage.setItem(storageKey, JSON.stringify(mcqAnswers));
        
        // 2. Find only the answers that changed since last save
        const changedAnswers = Object.entries(mcqAnswers).filter(
            ([qId, ans]) => lastSavedRef.current[qId] !== ans
        );
        
        if (changedAnswers.length > 0) {
            try {
                const payload = changedAnswers.map(([qId, ans]) => ({
                    question_id: parseInt(qId),
                    answer: ans
                }));
                await api.post(`/student/exams/${examId}/autosave`, { answers: payload }, { 
                    headers: { auth_token: authToken } 
                });
                // Update the ref so we don't re-send these
                lastSavedRef.current = { ...mcqAnswers };
            } catch (err) {
                console.error("Autosave to backend failed silently:", err);
            }
        }
      }
    }, 500);
    return () => clearTimeout(saveTimer);
  }, [mcqAnswers, storageKey, submitted, examId, authToken]);


  const handleMcqAnswerChange = (mcqId, answer) => {
    if (submitted) return;
    setMcqAnswers(prev => ({ ...prev, [mcqId]: answer }));
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  
  if (loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;

  if (error) {
      return (
          <Container maxWidth="sm" sx={{ mt: 5 }}>
              <Alert severity="error">{error}</Alert>
              <Button onClick={() => navigate('/student')} sx={{ mt: 2 }}>Back to Dashboard</Button>
          </Container>
      );
  }

  const indexOfLastQ = currentPage * questionsPerPage;
  const indexOfFirstQ = indexOfLastQ - questionsPerPage;
  const currentQuestions = exam?.questions?.slice(indexOfFirstQ, indexOfLastQ) || [];
  const totalPages = Math.ceil((exam?.questions?.length || 0) / questionsPerPage);
  const totalQuestions = exam?.questions?.length || 0;
  const answeredCount = Object.keys(mcqAnswers).length;

  const renderQuestionPalette = () => {
    return (
        <Box sx={{ p: { xs: 2, md: 0 }, height: '100%' }}>
            <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: 100, maxHeight: { md: '80vh' }, overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">Question Navigator</Typography>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" flexWrap="wrap" gap={1}>
                    {exam?.questions?.map((q, idx) => {
                        const qPage = Math.ceil((idx + 1) / questionsPerPage);
                        const isAttempted = mcqAnswers[q.id] !== undefined;
                        const isLeft = visitedPages.has(qPage) && !isAttempted;
                        
                        let bgColor = '#e0e0e0';
                        let color = '#000';
                        if (isAttempted) {
                            bgColor = '#4caf50';
                            color = '#fff';
                        } else if (isLeft) {
                            bgColor = '#ff9800';
                            color = '#fff';
                        }

                        const isCurrent = currentPage === qPage;

                        return (
                            <Button
                                key={q.id}
                                variant="contained"
                                onClick={() => {
                                    setCurrentPage(qPage);
                                    if (isMobile) setMobileOpen(false);
                                }}
                                sx={{
                                    minWidth: 40,
                                    width: 40,
                                    height: 40,
                                    m: 0,
                                    p: 0,
                                    borderRadius: 1,
                                    bgcolor: bgColor,
                                    color: color,
                                    boxShadow: isCurrent ? `0 0 0 2px ${theme.palette.primary.main}` : 'none',
                                    '&:hover': {
                                        bgcolor: isAttempted ? '#388e3c' : isLeft ? '#f57c00' : '#bdbdbd',
                                    }
                                }}
                            >
                                {idx + 1}
                            </Button>
                        );
                    })}
                </Box>
                
                <Box mt={3} display="flex" flexDirection={{ xs: 'column', md: 'row' }} flexWrap="wrap" gap={1}>
                <Box display="flex" alignItems="center" gap={1} width={{ xs: '100%', md: '30%' }}><Box width={16} height={16} borderRadius={1} bgcolor="#4caf50" flexShrink={0} /><Typography variant="body2" noWrap>Attempted</Typography></Box>
                <Box display="flex" alignItems="center" gap={1} width={{ xs: '100%', md: '30%' }}><Box width={16} height={16} borderRadius={1} bgcolor="#ff9800" flexShrink={0} /><Typography variant="body2" noWrap>Visited</Typography></Box>
                <Box display="flex" alignItems="center" gap={1} width={{ xs: '100%', md: '30%' }}><Box width={16} height={16} borderRadius={1} bgcolor="#e0e0e0" flexShrink={0} /><Typography variant="body2" noWrap>Not Visited</Typography></Box>
                </Box>
            </Paper>
        </Box>
    );
  };

  return (
    <Box 
        sx={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: '#f5f5f5', zIndex: 1200, overflow: 'auto',
            userSelect: 'none' 
        }}
        onContextMenu={(e) => e.preventDefault()}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        
        {/* HEADER BAR */}
        <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 10, zIndex: 100 }}>
            <Box display="flex" alignItems="center" gap={1}>
                <Box>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{exam.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Attempted: {answeredCount}/{totalQuestions}
                    </Typography>
                </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 2 }}>
                {violations > 0 && <Alert severity="warning" sx={{ py: 0, display: { xs: 'none', sm: 'flex' } }}>Warnings: {violations}</Alert>}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: timeLeft < 300 ? '#ffebee' : '#e3f2fd', px: { xs: 1, sm: 2 }, py: 1, borderRadius: 2 }}>
                    <TimerIcon color={timeLeft < 300 ? "error" : "primary"} fontSize={isMobile ? "small" : "medium"} />
                    <Typography variant="h6" fontWeight={700} color={timeLeft < 300 ? "error" : "primary"} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        {formatTime(timeLeft)}
                    </Typography>
                </Box>
                
                <Button 
                    variant="contained" 
                    color="success" 
                    onClick={() => setConfirmOpen(true)}
                    disabled={submitLoading}
                    size={isMobile ? "small" : "medium"}
                >
                    {submitLoading ? "Wait..." : "Finish"}
                </Button>
            </Box>
        </Paper>

        {isMobile && (
            <Fab 
                color="primary" 
                onClick={() => setMobileOpen(true)}
                sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1100 }}
            >
                <AppsIcon />
            </Fab>
        )}

        <Grid container spacing={3}>
            {/* MAIN QUESTIONS AREA */}
            <Grid item xs={12} md={8} lg={9}>
                {currentQuestions.map((q, idx) => (
                    <Paper key={q.id} elevation={1} sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Question {indexOfFirstQ + idx + 1} <span style={{fontSize:'0.8em', fontWeight:'normal', color:'#666'}}>({q.marks} Marks)</span>
                        </Typography>
                        
                        {q.image_path && (
                            <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                                <img src={q.image_path} alt="Question" style={{ maxHeight: 300, maxWidth: '100%', borderRadius: 4 }} />
                            </Box>
                        )}

                        <Typography variant="body1" sx={{ mb: 2 }}>{q.text}</Typography>

                        <RadioGroup 
                            value={mcqAnswers[q.id] || ''} 
                            onChange={(e) => handleMcqAnswerChange(q.id, e.target.value)}
                        >
                            {['a','b','c','d'].map((opt) => (
                                q[`option_${opt}`] && (
                                    <FormControlLabel 
                                        key={opt}
                                        value={opt.toUpperCase()} 
                                        control={<Radio />} 
                                        label={
                                            <Typography variant="body2">
                                                <Box component="span" fontWeight="bold" mr={1}>{opt.toUpperCase()})</Box> 
                                                {q[`option_${opt}`]}
                                            </Typography>
                                        } 
                                        sx={{ mb: 1, p: 1, borderRadius: 1, '&:hover': { bgcolor: '#f5f5f5' } }}
                                    />
                                )
                            ))}
                        </RadioGroup>
                    </Paper>
                ))}

                {/* PAGINATION */}
                {totalPages > 1 && (
                    <Box display="flex" justifyContent="center" gap={2} mt={4}>
                        <Button variant="outlined" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                            Previous
                        </Button>
                        <Typography sx={{ alignSelf: 'center' }}>Page {currentPage} of {totalPages}</Typography>
                        <Button variant="outlined" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                            Next
                        </Button>
                    </Box>
                )}
            </Grid>

            {/* DESKTOP SIDEBAR */}
            {!isMobile && (
                <Grid item xs={12} md={4} lg={3}>
                    {renderQuestionPalette()}
                </Grid>
            )}
        </Grid>

        {/* MOBILE DRAWER */}
        <Drawer
            anchor="right"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{ '& .MuiDrawer-paper': { width: { xs: 280, sm: 320 }, zIndex: 1300 } }}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h6">Questions</Typography>
                <IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </Box>
            {renderQuestionPalette()}
        </Drawer>

        {/* SUBMIT DIALOG */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
             <DialogTitle>Submit Exam?</DialogTitle>
             <DialogContent>
                 You have answered {answeredCount} out of {totalQuestions} questions. 
                 Are you sure you want to submit? You cannot change your answers after this.
             </DialogContent>
             <DialogActions>
                 <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                 <Button onClick={() => { setConfirmOpen(false); handleSubmitMcqAnswers('manual'); }} variant="contained" color="success">
                     Yes, Submit
                 </Button>
             </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}