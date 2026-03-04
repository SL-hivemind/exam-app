import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { repoApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

import {
    Box, Typography, Button, Paper, Stack, TextField, Grid,
    CircularProgress, Snackbar, Alert, Chip, IconButton,
    LinearProgress, Divider, Card, CardContent, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';

import {
    CloudUpload as UploadIcon,
    Save as SaveIcon,
    ArrowBack as BackIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    ImageOutlined as ImageIcon,
    PictureAsPdf as PdfIcon,
    AutoAwesome as AiIcon,
} from '@mui/icons-material';


// ─── STEP INDICATOR ────────────────────────────────────────────
const STEPS = ['Upload PDF', 'AI Extraction', 'Review & Edit', 'Save'];

function StepIndicator({ activeStep }) {
    return (
        <Stack direction="row" spacing={0} alignItems="center" sx={{ mb: 3 }}>
            {STEPS.map((label, idx) => (
                <React.Fragment key={label}>
                    <Stack alignItems="center" spacing={0.5}>
                        <Box
                            sx={{
                                width: 36, height: 36, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: idx <= activeStep ? '#1976d2' : '#e0e0e0',
                                color: idx <= activeStep ? '#fff' : '#999',
                                fontWeight: 700, fontSize: 14,
                                transition: 'all 0.3s',
                            }}
                        >
                            {idx < activeStep ? <CheckIcon sx={{ fontSize: 18 }} /> : idx + 1}
                        </Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: idx === activeStep ? 700 : 400,
                                color: idx <= activeStep ? '#1976d2' : '#999',
                            }}
                        >
                            {label}
                        </Typography>
                    </Stack>
                    {idx < STEPS.length - 1 && (
                        <Box
                            sx={{
                                flex: 1, height: 2, mx: 1,
                                bgcolor: idx < activeStep ? '#1976d2' : '#e0e0e0',
                                transition: 'all 0.3s',
                            }}
                        />
                    )}
                </React.Fragment>
            ))}
        </Stack>
    );
}


// ─── QUESTION CARD (EDITABLE) ──────────────────────────────────
function QuestionCard({ q, index, onUpdate, onDelete, onImageUpload }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ ...q });
    const needsImage = (q.text || '').includes('[IMAGE_REQUIRED]');
    const fileRef = useRef(null);

    const handleSave = () => {
        onUpdate(index, draft);
        setEditing(false);
    };

    const handleCancel = () => {
        setDraft({ ...q });
        setEditing(false);
    };

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onImageUpload(index, file);
    };

    return (
        <Card
            variant="outlined"
            sx={{
                borderRadius: 2,
                borderColor: needsImage && !q.image_url ? '#ff9800' : '#e0e0e0',
                borderWidth: needsImage && !q.image_url ? 2 : 1,
                transition: 'all 0.2s',
                '&:hover': { boxShadow: 2 },
            }}
        >
            <CardContent sx={{ pb: '12px !important' }}>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={`Q${q.question_number || index + 1}`}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 700 }}
                        />
                        {q.marks && (
                            <Chip label={`${q.marks} mark${q.marks > 1 ? 's' : ''}`} size="small" variant="outlined" />
                        )}
                        {q.source_page && (
                            <Chip label={`Page ${q.source_page}`} size="small" variant="outlined" color="info" />
                        )}
                        {needsImage && !q.image_url && (
                            <Chip
                                icon={<ImageIcon />}
                                label="Image Required"
                                size="small"
                                color="warning"
                                variant="filled"
                            />
                        )}
                        {q.image_url && (
                            <Chip
                                icon={<ImageIcon />}
                                label="Image Attached"
                                size="small"
                                color="success"
                                variant="filled"
                            />
                        )}
                    </Stack>

                    <Stack direction="row" spacing={0.5}>
                        {!editing ? (
                            <Tooltip title="Edit question">
                                <IconButton size="small" onClick={() => setEditing(true)}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <>
                                <Tooltip title="Save changes">
                                    <IconButton size="small" color="primary" onClick={handleSave}>
                                        <CheckIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel edit">
                                    <IconButton size="small" onClick={handleCancel}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        <Tooltip title="Remove question">
                            <IconButton size="small" color="error" onClick={() => onDelete(index)}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>

                {/* Question Text */}
                {editing ? (
                    <TextField
                        fullWidth multiline rows={2} size="small"
                        label="Question Text"
                        value={draft.text || ''}
                        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                        sx={{ mb: 1.5 }}
                    />
                ) : (
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                        {(q.text || '').replace('[IMAGE_REQUIRED]', '')}
                    </Typography>
                )}

                {/* Options */}
                <Grid container spacing={1}>
                    {['option_a', 'option_b', 'option_c', 'option_d'].map((key, i) => (
                        <Grid item xs={6} key={key}>
                            {editing ? (
                                <TextField
                                    fullWidth size="small"
                                    label={`Option ${String.fromCharCode(65 + i)}`}
                                    value={draft[key] || ''}
                                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                                />
                            ) : (
                                <Typography variant="body2" sx={{ pl: 1 }}>
                                    <strong>{String.fromCharCode(65 + i)})</strong> {q[key]}
                                </Typography>
                            )}
                        </Grid>
                    ))}
                </Grid>

                {/* Correct Answer */}
                <Stack direction="row" spacing={2} alignItems="center" mt={1.5}>
                    {editing ? (
                        <TextField
                            size="small"
                            label="Correct Answer"
                            value={draft.correct_answer || ''}
                            onChange={(e) => setDraft({ ...draft, correct_answer: e.target.value.toUpperCase() })}
                            sx={{ width: 140 }}
                        />
                    ) : (
                        q.correct_answer && (
                            <Chip label={`Answer: ${q.correct_answer}`} size="small" color="success" />
                        )
                    )}

                    {editing ? (
                        <TextField
                            size="small" type="number"
                            label="Marks"
                            value={draft.marks || 1}
                            onChange={(e) => setDraft({ ...draft, marks: parseInt(e.target.value) || 1 })}
                            sx={{ width: 100 }}
                        />
                    ) : null}
                </Stack>

                {/* Image Upload Area */}
                {needsImage && (
                    <Box
                        sx={{
                            mt: 2, p: 2, border: '2px dashed',
                            borderColor: q.image_url ? '#4caf50' : '#ff9800',
                            borderRadius: 2, textAlign: 'center',
                            bgcolor: q.image_url ? '#e8f5e9' : '#fff3e0',
                            cursor: 'pointer',
                        }}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        {q.image_url ? (
                            <Stack alignItems="center" spacing={1}>
                                <img
                                    src={q.image_url}
                                    alt="Question diagram"
                                    style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 8 }}
                                />
                                <Typography variant="caption" color="success.main">
                                    ✓ Image attached — click to replace
                                </Typography>
                            </Stack>
                        ) : (
                            <Stack alignItems="center" spacing={0.5}>
                                <ImageIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                                <Typography variant="body2" fontWeight={600} color="#ff9800">
                                    AI detected a diagram/table here
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Use Windows Snipping Tool to screenshot the diagram from your PDF, then click here to upload it
                                </Typography>
                            </Stack>
                        )}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}


// ─── MAIN COMPONENT ────────────────────────────────────────────
export default function PdfExtractionReview() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const isSchoolAdmin = user?.role === 'school_admin';
    const isSubject = user?.role === 'subject_specialist';
    const basePath = isSchoolAdmin ? '/school' : isSubject ? '/specialist' : '/admin';

    // States
    const [step, setStep] = useState(0); // 0=upload, 1=extracting, 2=review, 3=saving
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [metadata, setMetadata] = useState({ subject: '', class_number: '', chapter: '' });
    const [progress, setProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    const fileInputRef = useRef(null);

    // ─── HANDLE PDF UPLOAD ─────────────────────────────────────
    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setSnack({ open: true, severity: 'error', message: 'Please select a PDF file' });
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setSnack({ open: true, severity: 'error', message: 'File too large (max 20MB)' });
            return;
        }

        setPdfFile(file);
        setPdfUrl(URL.createObjectURL(file));
        setStep(1);
        setProgress(10);

        try {
            const res = await repoApi.extractPdf(file, (e) => {
                if (e.total) setProgress(Math.min(90, Math.round((e.loaded / e.total) * 50) + 10));
            });

            setProgress(100);
            const data = res.data;
            setQuestions(data.questions || []);
            setMetadata(data.metadata || {});
            setStep(2);

            setSnack({
                open: true,
                severity: 'success',
                message: data.message || `Extracted ${(data.questions || []).length} questions`,
            });
        } catch (err) {
            setStep(0);
            setPdfFile(null);
            setPdfUrl(null);
            setSnack({
                open: true,
                severity: 'error',
                message: err.response?.data?.message || err.response?.data?.detail || 'PDF extraction failed. Check your API key.',
            });
        }
    }, []);

    // ─── QUESTION CRUD ──────────────────────────────────────────
    const updateQuestion = (index, updated) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updated } : q));
    };

    const deleteQuestion = (index) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleImageUpload = async (index, file) => {
        try {
            const res = await repoApi.uploadQuestionImage(file);
            updateQuestion(index, { image_url: res.data.url });
            setSnack({ open: true, severity: 'success', message: 'Image uploaded successfully' });
        } catch {
            setSnack({ open: true, severity: 'error', message: 'Image upload failed' });
        }
    };

    // ─── BULK SAVE ──────────────────────────────────────────────
    const handleSaveAll = async () => {
        if (!metadata.subject) {
            setSnack({ open: true, severity: 'warning', message: 'Please enter a Subject before saving' });
            return;
        }

        const pendingImages = questions.filter(
            q => (q.text || '').includes('[IMAGE_REQUIRED]') && !q.image_url
        );
        if (pendingImages.length > 0) {
            setSnack({
                open: true, severity: 'warning',
                message: `${pendingImages.length} question(s) still need images. Upload them or remove the questions.`,
            });
            return;
        }

        setStep(3);
        setSaving(true);

        try {
            const res = await repoApi.bulkSaveAi({
                metadata,
                questions: questions.map(q => ({
                    text: q.text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    correct_answer: q.correct_answer,
                    marks: q.marks || 1,
                    image_url: q.image_url || null,
                })),
            });

            setSnack({
                open: true, severity: 'success',
                message: res.data.message || `Saved ${res.data.inserted} questions!`,
            });

            // Navigate back to repository after short delay
            setTimeout(() => navigate(`${basePath}/repository/questions`), 1500);
        } catch (err) {
            setStep(2);
            setSnack({
                open: true, severity: 'error',
                message: err.response?.data?.message || 'Failed to save questions',
            });
        } finally {
            setSaving(false);
        }
    };

    // ─── DISCARD AND START OVER ─────────────────────────────────
    const handleDiscard = () => {
        setConfirmDiscard(false);
        setStep(0);
        setPdfFile(null);
        setPdfUrl(null);
        setQuestions([]);
        setMetadata({ subject: '', class_number: '', chapter: '' });
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── RENDER ─────────────────────────────────────────────────
    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', minHeight: '80vh' }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Button startIcon={<BackIcon />} onClick={() => navigate(-1)}>
                    Back to Repository
                </Button>
                {step === 2 && questions.length > 0 && (
                    <Button
                        color="error"
                        variant="outlined"
                        size="small"
                        onClick={() => setConfirmDiscard(true)}
                    >
                        Discard & Start Over
                    </Button>
                )}
            </Stack>

            <Typography variant="h4" fontWeight={700} gutterBottom>
                <AiIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#1976d2' }} />
                Import Questions from PDF
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
                Upload a PDF question paper. Our AI will extract the questions, and you can review and edit them before saving.
            </Typography>

            <StepIndicator activeStep={step} />

            {/* ─── STEP 0: UPLOAD ───────────────────────────────────── */}
            {step === 0 && (
                <Paper
                    sx={{
                        p: 6, textAlign: 'center', borderRadius: 3,
                        border: '2px dashed #1976d2',
                        bgcolor: '#f5f8ff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: '#e3ecff', borderColor: '#1565c0' },
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={handleFileSelect}
                    />
                    <PdfIcon sx={{ fontSize: 64, color: '#1976d2', mb: 2 }} />
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        Drag & Drop or Click to Upload PDF
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Supports any MCQ question paper PDF • Max 20MB • Math equations will be auto-detected
                    </Typography>
                </Paper>
            )}

            {/* ─── STEP 1: EXTRACTING ───────────────────────────────── */}
            {step === 1 && (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                    <AiIcon sx={{ fontSize: 64, color: '#1976d2', mb: 2, animation: 'pulse 1.5s infinite' }} />
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        AI is analyzing your PDF...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Extracting questions, options, and mathematical expressions. This may take 15-60 seconds.
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 8, borderRadius: 4, maxWidth: 400, mx: 'auto' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {progress}% — {progress < 50 ? 'Uploading PDF...' : 'Processing with AI...'}
                    </Typography>
                </Paper>
            )}

            {/* ─── STEP 2: REVIEW ───────────────────────────────────── */}
            {step === 2 && (
                <>
                    {/* Metadata Editor Bar */}
                    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Paper Metadata (auto-detected, you can edit)
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth size="small"
                                    label="Subject *"
                                    value={metadata.subject || ''}
                                    onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
                                    error={!metadata.subject}
                                    helperText={!metadata.subject ? 'Required' : ''}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth size="small"
                                    label="Class / Grade"
                                    value={metadata.class_number || ''}
                                    onChange={(e) => setMetadata({ ...metadata, class_number: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth size="small"
                                    label="Chapter"
                                    value={metadata.chapter || ''}
                                    onChange={(e) => setMetadata({ ...metadata, chapter: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Split View */}
                    <Grid container spacing={3}>
                        {/* LEFT: PDF Preview */}
                        <Grid item xs={12} md={5}>
                            <Paper sx={{ borderRadius: 2, overflow: 'hidden', position: 'sticky', top: 80 }}>
                                <Box sx={{
                                    p: 1.5, bgcolor: '#1976d2', color: '#fff',
                                    display: 'flex', alignItems: 'center', gap: 1,
                                }}>
                                    <PdfIcon />
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Original PDF — {pdfFile?.name}
                                    </Typography>
                                </Box>
                                {pdfUrl && (
                                    <Box sx={{ height: 'calc(100vh - 340px)', overflow: 'auto' }}>
                                        <embed
                                            src={pdfUrl}
                                            type="application/pdf"
                                            width="100%"
                                            height="100%"
                                            style={{ minHeight: 600 }}
                                        />
                                    </Box>
                                )}
                            </Paper>
                        </Grid>

                        {/* RIGHT: Extracted Questions */}
                        <Grid item xs={12} md={7}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight={700}>
                                    <AiIcon sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 20 }} />
                                    Extracted Questions ({questions.length})
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSaveAll}
                                    disabled={saving || questions.length === 0}
                                    sx={{ borderRadius: 2 }}
                                >
                                    {saving ? 'Saving...' : `Save All (${questions.length})`}
                                </Button>
                            </Stack>

                            {questions.length === 0 ? (
                                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                                    <Typography color="text.secondary">
                                        No questions were extracted. The PDF may not contain recognizable MCQ questions.
                                    </Typography>
                                </Paper>
                            ) : (
                                <Stack spacing={2}>
                                    {questions.map((q, idx) => (
                                        <QuestionCard
                                            key={idx}
                                            q={q}
                                            index={idx}
                                            onUpdate={updateQuestion}
                                            onDelete={deleteQuestion}
                                            onImageUpload={handleImageUpload}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Grid>
                    </Grid>
                </>
            )}

            {/* ─── STEP 3: SAVING ──────────────────────────────────── */}
            {step === 3 && (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                    <CircularProgress size={48} sx={{ mb: 2 }} />
                    <Typography variant="h5" fontWeight={600}>
                        Saving questions to your repository...
                    </Typography>
                </Paper>
            )}

            {/* Discard Confirmation Dialog */}
            <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
                <DialogTitle>Discard all changes?</DialogTitle>
                <DialogContent>
                    <Typography>
                        This will remove all {questions.length} extracted questions. You'll need to upload the PDF again.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDiscard(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDiscard}>Discard</Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={5000}
                onClose={() => setSnack({ ...snack, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
                    {snack.message}
                </Alert>
            </Snackbar>

            {/* Pulse animation */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
        </Box>
    );
}
