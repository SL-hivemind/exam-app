import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Grid, Alert, CircularProgress,
    Container, Stack, Chip, Button
} from '@mui/material';
import {
    CheckCircle as CorrectIcon, // Fixed Name
    Cancel as WrongIcon,        // Fixed Name
    EmojiEvents as TrophyIcon,
    AccessTime as TimeIcon,
    ArrowBack as BackIcon
} from '@mui/icons-material';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function StudentResultsPage() {
    const { examId } = useParams();
    const { authToken } = useAuth();
    const navigate = useNavigate();

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
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8 }}>
                <Alert severity="error" variant="filled">{error}</Alert>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/student')} sx={{ mt: 2 }}>
                    Back to Dashboard
                </Button>
            </Container>
        );
    }

    if (!results) return null;

    const { exam, attempt, answers } = results;
    const percentage = Math.round((attempt.score / exam.total_marks) * 100) || 0;

    // Calculate stats
    const correctCount = answers.filter(a => a.is_correct).length;
    const incorrectCount = answers.filter(a => !a.is_correct && a.answer).length;
    const skippedCount = answers.filter(a => !a.answer).length;

    return (
        <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
            <Container maxWidth="lg">

                {/* HEADER */}
                <Button startIcon={<BackIcon />} onClick={() => navigate('/student')} sx={{ mb: 2 }}>
                    Back to Dashboard
                </Button>

                <Paper elevation={0} sx={{ p: 4, borderRadius: 3, mb: 4, bgcolor: '#fff', border: '1px solid #eee' }}>
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Typography variant="h4" fontWeight={800} color="primary.main">
                                {exam.title}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                                {exam.description || "Exam Results Analysis"}
                            </Typography>
                            <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TimeIcon color="action" />
                                    <Typography variant="body2">
                                        Submitted: {new Date(attempt.submitted_time).toLocaleString()}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper
                                elevation={3}
                                sx={{
                                    p: 3, borderRadius: 3, textAlign: 'center',
                                    bgcolor: percentage >= 70 ? '#e8f5e9' : percentage >= 40 ? '#fff3e0' : '#ffebee',
                                    border: '1px solid',
                                    borderColor: percentage >= 70 ? '#c8e6c9' : percentage >= 40 ? '#ffe0b2' : '#ffcdd2'
                                }}
                            >
                                <TrophyIcon sx={{ fontSize: 40, color: percentage >= 70 ? 'success.main' : 'warning.main', mb: 1 }} />
                                <Typography variant="h3" fontWeight={800}>
                                    {attempt.score} <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>/ {exam.total_marks}</span>
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {percentage}% Score
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                {/* PERFORMANCE SUMMARY */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #2e7d32' }}>
                            <Typography color="text.secondary" variant="subtitle2">Correct Answers</Typography>
                            <Typography variant="h4" fontWeight={700} color="success.main">{correctCount}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #d32f2f' }}>
                            <Typography color="text.secondary" variant="subtitle2">Incorrect Answers</Typography>
                            <Typography variant="h4" fontWeight={700} color="error.main">{incorrectCount}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper sx={{ p: 3, borderRadius: 2, borderLeft: '5px solid #ed6c02' }}>
                            <Typography color="text.secondary" variant="subtitle2">Skipped / Unanswered</Typography>
                            <Typography variant="h4" fontWeight={700} color="warning.main">{skippedCount}</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* DETAILED QUESTION LIST */}
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Question Analysis</Typography>
                <Stack spacing={2}>
                    {answers.map((ans, idx) => (
                        <Paper key={idx} sx={{ p: 3, borderRadius: 2, border: '1px solid #eee' }}>
                            <Stack spacing={2}>

                                {/* Question Header */}
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Typography variant="subtitle1" fontWeight={600} sx={{ width: '85%' }}>
                                        Q{idx + 1}. {ans.text || "Question text not available"}
                                    </Typography>
                                    <Chip
                                        label={ans.is_correct ? `+${ans.marks_awarded} Marks` : "0 Marks"}
                                        color={ans.is_correct ? "success" : "default"}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </Stack>

                                {/* Image (Optional) */}
                                {ans.image_path && (
                                    <Box sx={{ my: 1 }}>
                                        <img
                                            src={ans.image_path}
                                            alt="Question Diagram"
                                            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #ddd' }}
                                        />
                                    </Box>
                                )}

                                {/* --- DEBUG SECTION: FORCE DISPLAY OPTIONS --- */} 
                                {/* I placed this BEFORE the fancy grid so you can see raw data first */}
                                {/* <Box sx={{ mt: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px dashed #999' }}>
                                    <Typography variant="caption" fontWeight="bold" color="textSecondary">DEBUG / RAW DATA VIEW:</Typography>
                                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                        <Grid item xs={6}><Typography variant="body2">A) {ans.option_a || "Missing"}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2">B) {ans.option_b || "Missing"}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2">C) {ans.option_c || "Missing"}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="body2">D) {ans.option_d || "Missing"}</Typography></Grid>
                                    </Grid>
                                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #ddd' }}>
                                        <Typography variant="body2" color="error">
                                            Correct Answer: <b>{ans.correct_answer || "Not Set"}</b>
                                        </Typography>
                                    </Box>
                                </Box> */}
                                {/* --- END DEBUG SECTION ---


                                {/* Standard Options Grid (This uses the icons) */}
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    {['A', 'B', 'C', 'D'].map((optKey) => {
                                        const optionKeyRaw = `option_${optKey.toLowerCase()}`;
                                        const optionText = ans[optionKeyRaw];

                                        const studentAnswer = (ans.answer || "").toUpperCase();
                                        const correctAnswer = (ans.correct_answer || "").toUpperCase();
                                        const currentOption = optKey.toUpperCase();

                                        const isSelected = studentAnswer === currentOption;
                                        const isCorrectOption = correctAnswer === currentOption;

                                        let bgColor = '#fff';
                                        let borderColor = '#e0e0e0';
                                        let textColor = 'text.primary';

                                        if (isCorrectOption) {
                                            bgColor = '#edf7ed';
                                            borderColor = '#2e7d32';
                                            textColor = '#1b5e20';
                                        } else if (isSelected && !isCorrectOption) {
                                            bgColor = '#fdeded';
                                            borderColor = '#d32f2f';
                                            textColor = '#c62828';
                                        }

                                        const borderThickness = (isSelected || isCorrectOption) ? 2 : 1;

                                        return (
                                            <Grid item xs={12} sm={6} key={optKey}>
                                                <Paper variant="outlined" sx={{
                                                    p: 1.5,
                                                    bgcolor: bgColor,
                                                    borderColor: borderColor,
                                                    borderWidth: borderThickness,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    position: 'relative',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <Typography variant="body2" sx={{ color: textColor, fontWeight: (isSelected || isCorrectOption) ? 600 : 400, width: '90%' }}>
                                                        <span style={{ fontWeight: 800, marginRight: 8 }}>{optKey})</span>
                                                        {optionText || <span style={{ fontStyle: 'italic', color: '#999' }}>Empty Option</span>}
                                                    </Typography>

                                                    {/* FIXED ICONS USAGE HERE */}
                                                    {isCorrectOption && (
                                                        <CorrectIcon color="success" sx={{ position: 'absolute', right: 10 }} fontSize="small" />
                                                    )}
                                                    {isSelected && !isCorrectOption && (
                                                        <WrongIcon color="error" sx={{ position: 'absolute', right: 10 }} fontSize="small" />
                                                    )}
                                                </Paper>
                                            </Grid>
                                        );
                                    })}
                                </Grid>

                                {/* Footer Text / Summary */}
                                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #eee', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Typography variant="caption" sx={{ color: ans.answer ? 'text.secondary' : 'warning.main' }}>
                                        Your Answer: <b>{ans.answer ? ans.answer.toUpperCase() : "Skipped"}</b>
                                    </Typography>
                                    <Typography variant="caption" color="primary.main">
                                        Correct Answer: <b>{ans.correct_answer ? ans.correct_answer.toUpperCase() : "N/A"}</b>
                                    </Typography>
                                </Box>

                            </Stack>
                        </Paper>
                    ))}
                </Stack>

            </Container>
        </Box>
    );
}