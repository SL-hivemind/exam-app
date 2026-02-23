import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, Grid, Alert, CircularProgress,
    Container, Stack, Chip, Button, LinearProgress, Tooltip as MuiTooltip, useTheme, useMediaQuery
} from '@mui/material';
import {
    CheckCircle as CorrectIcon,
    Cancel as WrongIcon,
    EmojiEvents as TrophyIcon,
    AccessTime as TimeIcon,
    ArrowBack as BackIcon
} from '@mui/icons-material';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';

export default function StudentResultsPage() {
    const { examId } = useParams();
    const { authToken } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const isMdDown = useMediaQuery(theme.breakpoints.down('md'));

    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const totalQuestions = answers.length;
    const score = attempt.score || 0;
    const totalMarks = exam.total_marks || 0;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const rank = attempt.rank;
    const participants = attempt.participants;

    const correctCount = answers.filter((a) => a.is_correct).length;
    const incorrectCount = answers.filter((a) => !a.is_correct && a.answer).length;
    const skippedCount = answers.filter((a) => !a.answer).length;
    const attemptedCount = correctCount + incorrectCount;

    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const attemptRate = totalQuestions > 0 ? Math.round((attemptedCount / totalQuestions) * 100) : 0;
    const marksLost = Math.max(totalMarks - score, 0);

    const started = attempt.start_time ? new Date(attempt.start_time) : null;
    const submitted = attempt.submitted_time ? new Date(attempt.submitted_time) : null;
    const durationMins = started && submitted
        ? Math.max(Math.round((submitted.getTime() - started.getTime()) / 60000), 0)
        : null;

    const correctnessData = [
        { name: 'Correct', value: correctCount, color: '#2e7d32' },
        { name: 'Incorrect', value: incorrectCount, color: '#d32f2f' },
        { name: 'Skipped', value: skippedCount, color: '#ed6c02' },
    ];

    const subjectMap = {};
    const chapterMap = {};
    const hasSubjectOrChapter = answers.some((a) => (a.subject && String(a.subject).trim()) || (a.chapter && String(a.chapter).trim()));

    answers.forEach((a) => {
        const subjectKey = (a.subject || 'General').trim() || 'General';
        if (!subjectMap[subjectKey]) {
            subjectMap[subjectKey] = { subject: subjectKey, total: 0, earned: 0 };
        }
        subjectMap[subjectKey].total += Number(a.marks || 0);
        subjectMap[subjectKey].earned += Number(a.marks_awarded || 0);

        const chapterKey = (a.chapter || 'General').trim() || 'General';
        if (!chapterMap[chapterKey]) {
            chapterMap[chapterKey] = { chapter: chapterKey, total: 0, earned: 0 };
        }
        chapterMap[chapterKey].total += Number(a.marks || 0);
        chapterMap[chapterKey].earned += Number(a.marks_awarded || 0);
    });

    const subjectData = Object.values(subjectMap).map((s) => ({
        ...s,
        percentage: s.total > 0 ? Math.round((s.earned / s.total) * 100) : 0
    }));
    const chapterData = Object.values(chapterMap)
        .map((c) => ({
            ...c,
            percentage: c.total > 0 ? Math.round((c.earned / c.total) * 100) : 0
        }))
        .sort((a, b) => a.percentage - b.percentage);

    const hasSubjectBreakdown = hasSubjectOrChapter && subjectData.some((s) => s.subject !== 'General');
    const hasChapterBreakdown = hasSubjectOrChapter && chapterData.some((c) => c.chapter !== 'General');
    const subjectInsights = hasSubjectBreakdown
        ? [...subjectData]
            .filter((s) => s.subject !== 'General')
            .sort((a, b) => b.percentage - a.percentage)
        : [];
    const topSubject = subjectInsights[0];
    const weakSubject = subjectInsights[subjectInsights.length - 1];
    const weakChapters = chapterData.filter((c) => c.chapter !== 'General').slice(0, 2);

    const insights = [];
    if (accuracy >= 80) insights.push('Great accuracy. Keep this approach for similar exams.');
    else if (accuracy >= 60) insights.push('Accuracy is decent. Focus on reducing avoidable mistakes.');
    else insights.push('Accuracy is low for attempted questions. Revise concepts before the next test.');

    if (skippedCount > 0) insights.push(`You skipped ${skippedCount} question(s). Try time-boxing each question.`);
    if (marksLost > 0) insights.push(`You left ${marksLost} mark(s) on the table in this exam.`);
    if (attemptRate === 100) insights.push('Good attempt coverage. You tried all questions.');
    if (topSubject) insights.push(`Strongest subject: ${topSubject.subject} (${topSubject.percentage}%).`);
    if (weakSubject && weakSubject.subject !== topSubject?.subject) insights.push(`Needs improvement: ${weakSubject.subject} (${weakSubject.percentage}%).`);
    if (weakChapters.length > 0) insights.push(`Focus chapters: ${weakChapters.map((c) => `${c.chapter} (${c.percentage}%)`).join(', ')}.`);

    return (
        <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: { xs: 2, md: 4 } }}>
            <Container maxWidth="xl">
                <Button startIcon={<BackIcon />} onClick={() => navigate('/student')} sx={{ mb: 2 }}>
                    Back to Dashboard
                </Button>

                <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, mb: 3, bgcolor: '#fff', border: '1px solid #eee' }}>
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Typography variant="h4" fontWeight={800} color="primary.main">
                                {exam.title}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                                {exam.description || 'Exam Result'}
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <TimeIcon color="action" />
                                    <Typography variant="body2">
                                        Submitted: {submitted ? submitted.toLocaleString() : 'N/A'}
                                    </Typography>
                                </Box>
                                {rank && participants ? (
                                    <Chip
                                        color="primary"
                                        variant="outlined"
                                        label={`Rank: ${rank} / ${participants}`}
                                    />
                                ) : null}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    textAlign: 'center',
                                    bgcolor: percentage >= 70 ? '#e8f5e9' : percentage >= 40 ? '#fff3e0' : '#ffebee',
                                    border: '1px solid',
                                    borderColor: percentage >= 70 ? '#c8e6c9' : percentage >= 40 ? '#ffe0b2' : '#ffcdd2'
                                }}
                            >
                                <TrophyIcon sx={{ fontSize: 40, color: percentage >= 70 ? 'success.main' : 'warning.main', mb: 1 }} />
                                <Typography variant="h3" fontWeight={800}>
                                    {score} <span style={{ fontSize: '1.5rem', opacity: 0.6 }}>/ {totalMarks}</span>
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {percentage}% Score
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '5px solid #2e7d32' }}>
                            <Typography color="text.secondary" variant="subtitle2">Accuracy (Attempted)</Typography>
                            <Typography variant="h4" fontWeight={700} color="success.main">{accuracy}%</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '5px solid #0288d1' }}>
                            <Typography color="text.secondary" variant="subtitle2">Attempt Rate</Typography>
                            <Typography variant="h4" fontWeight={700} color="info.main">{attemptRate}%</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '5px solid #ed6c02' }}>
                            <Typography color="text.secondary" variant="subtitle2">Skipped</Typography>
                            <Typography variant="h4" fontWeight={700} color="warning.main">{skippedCount}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '5px solid #6d4c41' }}>
                            <Typography color="text.secondary" variant="subtitle2">Time Used</Typography>
                            <Typography variant="h4" fontWeight={700} color="text.primary">{durationMins !== null ? `${durationMins}m` : 'N/A'}</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Paper sx={{ p: 3, borderRadius: 2, mb: 4, border: '1px solid #eee' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Exam Insights</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This analysis is only for this exam attempt.
                    </Typography>
                    <Stack spacing={1.25}>
                        {insights.map((line, idx) => (
                            <Typography key={idx} variant="body2">- {line}</Typography>
                        ))}
                    </Stack>
                </Paper>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={(hasSubjectBreakdown || hasChapterBreakdown) ? 5 : 12}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                border: '1px solid #dfe5ef',
                                height: 360,
                                bgcolor: '#fff',
                                boxShadow: '0 8px 24px rgba(16,24,40,0.05)'
                            }}
                        >
                            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                                Performance Split
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Correct vs incorrect vs skipped distribution</Typography>
                            <ResponsiveContainer width="100%" height="84%">
                                <PieChart>
                                    <Pie
                                        data={correctnessData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={95}
                                        label
                                    >
                                        {correctnessData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    {!isMdDown && <Legend />}
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    {(hasSubjectBreakdown || hasChapterBreakdown) && (
                        <Grid item xs={12} md={7}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 3,
                                    border: '1px solid #dfe5ef',
                                    height: 360,
                                    bgcolor: '#fff',
                                    boxShadow: '0 8px 24px rgba(16,24,40,0.05)'
                                }}
                            >
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                                    {hasSubjectBreakdown ? 'Subject-wise Score %' : 'Chapter-wise Score %'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Performance by topic group</Typography>
                                <ResponsiveContainer width="100%" height="84%">
                                    <BarChart data={hasSubjectBreakdown ? subjectData : chapterData} margin={{ left: 10, right: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey={hasSubjectBreakdown ? 'subject' : 'chapter'} minTickGap={isMdDown ? 8 : 20} />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        {!isMdDown && <Legend />}
                                        <Bar dataKey="percentage" fill="#1976d2" name="Score %" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    )}
                </Grid>

                {!hasSubjectOrChapter && (
                    <Alert severity="info" sx={{ mb: 4 }}>
                        Subject/chapter metadata is not available for these questions, so showing normal exam analysis.
                    </Alert>
                )}

                {hasSubjectBreakdown && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            mb: 4,
                            border: '1px solid #dfe5ef',
                            boxShadow: '0 8px 24px rgba(16,24,40,0.05)'
                        }}
                    >
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                            Subject Insights
                        </Typography>
                        <Grid container spacing={2}>
                            {subjectInsights.map((s) => (
                                <Grid item xs={12} md={6} key={s.subject}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.7 }}>
                                            <Typography variant="body2" fontWeight={600}>{s.subject}</Typography>
                                            <Typography variant="body2" fontWeight={700}>{s.percentage}%</Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={s.percentage}
                                            sx={{ height: 8, borderRadius: 10 }}
                                            color={s.percentage >= 70 ? 'success' : s.percentage >= 50 ? 'warning' : 'error'}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {s.earned}/{s.total} marks
                                        </Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                )}

                {hasChapterBreakdown && (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            mb: 4,
                            border: '1px solid #dfe5ef',
                            boxShadow: '0 8px 24px rgba(16,24,40,0.05)'
                        }}
                    >
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                            Chapter-wise Score %
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chapterData.slice(0, 12)} layout="vertical" margin={{ left: 20, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis type="category" dataKey="chapter" width={isMdDown ? 120 : 170} interval={0} tick={{ fontSize: isMdDown ? 10 : 12 }} />
                                <Tooltip />
                                {!isMdDown && <Legend />}
                                <Bar dataKey="percentage" fill="#2e7d32" name="Score %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                )}

                <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Question Analysis</Typography>
                <Stack spacing={2}>
                    {answers.map((ans, idx) => (
                        <Paper key={idx} sx={{ p: 3, borderRadius: 2, border: '1px solid #eee' }}>
                            <Stack spacing={2}>
                                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'flex-start' }} spacing={1}>
                                    <Typography variant="subtitle1" fontWeight={600} sx={{ width: '100%' }}>
                                        Q{idx + 1}. {ans.text || 'Question text not available'}
                                    </Typography>
                                    <Chip
                                        label={ans.is_correct ? `+${ans.marks_awarded} Marks` : '0 Marks'}
                                        color={ans.is_correct ? 'success' : 'default'}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontWeight: 'bold', alignSelf: { xs: 'flex-start', sm: 'center' } }}
                                    />
                                </Stack>

                                {ans.image_path && (
                                    <Box sx={{ my: 1 }}>
                                        <img
                                            src={ans.image_path}
                                            alt="Question Diagram"
                                            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #ddd' }}
                                        />
                                    </Box>
                                )}

                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    {['A', 'B', 'C', 'D'].map((optKey) => {
                                        const optionKeyRaw = `option_${optKey.toLowerCase()}`;
                                        const optionText = ans[optionKeyRaw];

                                        const studentAnswer = (ans.answer || '').toUpperCase();
                                        const correctAnswer = (ans.correct_answer || '').toUpperCase();
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
                                                    pr: 5.5,
                                                    bgcolor: bgColor,
                                                    borderColor: borderColor,
                                                    borderWidth: borderThickness,
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    position: 'relative',
                                                    transition: 'all 0.2s ease',
                                                    minHeight: { xs: 72, sm: 62 }
                                                }}>
                                                    <Typography variant="body2" sx={{ color: textColor, fontWeight: (isSelected || isCorrectOption) ? 600 : 400, width: '100%', pr: 0.5 }}>
                                                        <span style={{ fontWeight: 800, marginRight: 8 }}>{optKey})</span>
                                                        {optionText || <span style={{ fontStyle: 'italic', color: '#999' }}>Empty Option</span>}
                                                    </Typography>

                                                    {isCorrectOption && (
                                                        <MuiTooltip title="Correct option">
                                                            <CorrectIcon color="success" sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} fontSize="small" />
                                                        </MuiTooltip>
                                                    )}
                                                    {isSelected && !isCorrectOption && (
                                                        <MuiTooltip title="Your selected (incorrect)">
                                                            <WrongIcon color="error" sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} fontSize="small" />
                                                        </MuiTooltip>
                                                    )}
                                                </Paper>
                                            </Grid>
                                        );
                                    })}
                                </Grid>

                                <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #eee', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                    <Typography variant="caption" sx={{ color: ans.answer ? 'text.secondary' : 'warning.main' }}>
                                        Your Answer: <b>{ans.answer ? ans.answer.toUpperCase() : 'Skipped'}</b>
                                    </Typography>
                                    <Typography variant="caption" color="primary.main">
                                        Correct Answer: <b>{ans.correct_answer ? ans.correct_answer.toUpperCase() : 'N/A'}</b>
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
