import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Paper, Typography, TextField, Button, Stack, Alert, 
  Grid, CircularProgress, Divider, Snackbar, Card, CardMedia, FormControl,InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Delete as DeleteIcon, 
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function RepoQuestionEditPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false); // Loading state for image
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });

  const isAdmin = user?.role === 'admin';
  const isSubject = user?.role === 'subject_specialist';
  
  const isNewMode = id === 'new' || location.pathname.endsWith('/new');

  const getBasePath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'school_admin') return '/school';
    if (user?.role === 'subject_specialist') return '/specialist';
    return '';
  };
  const basePath = getBasePath();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isNewMode) {
          setQ({ 
              text: '', 
              subject: isSubject ? (user.specialist_subject || '') : '', 
              class_number: '', 
              chapter: '',      // <--- NEW
              topic: '',        // <--- NEW
              difficulty: 'Medium', // <--- NEW
              marks: 1, 
              option_a: '', option_b: '', option_c: '', option_d: '', 
              correct_answer: '',
              image_path: '' // Initialize image_path
          });
        } else if (id) {
          const res = await api.get(`/admin/repository/questions/${id}`);
          setQ(res.data.question || res.data);
        }
      } catch (err) {
        console.error(err);
        setSnack({ open: true, severity: 'error', message: "Could not load question." });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNewMode, isSubject, user]);

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingImg(true);
    try {
      const res = await api.post('/admin/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Set the URL returned by backend to the question state
      setQ(prev => ({ ...prev, image_path: res.data.url }));
      setSnack({ open: true, severity: 'success', message: "Image attached successfully" });
    } catch (err) {
      console.error(err);
      setSnack({ open: true, severity: 'error', message: "Image upload failed" });
    } finally {
      setUploadingImg(false);
    }
  };
  // --------------------------

  const handleSave = async () => {
    if (!q.text || !q.correct_answer) {
        setSnack({ open: true, severity: 'warning', message: "Question text and Correct Answer are required." });
        return;
    }

    try {
      setSaving(true);
      const payload = { ...q, marks: Number(q.marks || 1) };
      
      if (isNewMode) {
        await api.post('/admin/repository/questions', payload);
        setSnack({ open: true, severity: 'success', message: 'Question created successfully' });
        setTimeout(() => navigate(`${basePath}/repository/questions`), 1000);
      } else {
        await api.put(`/admin/repository/questions/${id}`, payload);
        setSnack({ open: true, severity: 'success', message: 'Changes saved successfully' });
        setSaving(false);
      }
    } catch (err) {
      console.error(err);
      setSnack({ open: true, severity: 'error', message: err.response?.data?.message || 'Save failed' });
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/admin/repository/questions/${id}`);
      navigate(`${basePath}/repository/questions`);
    } catch (err) {
      console.error(err);
      setSnack({ open: true, severity: 'error', message: 'Delete failed' });
    }
  };

  if (loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (!q) return <Box p={5}><Alert severity="error">Question not found.</Alert></Box>;

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
            Back
        </Button>
        <Typography variant="h5" fontWeight={700} color="text.primary">
            {isNewMode ? 'Create Question' : `Edit Question #${id}`}
        </Typography>
      </Stack>

      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, border: '1px solid #e0e0e0', maxWidth: 900, mx: 'auto' }}>
        
        <Grid container spacing={3}>
            
            <Grid item xs={12} md={6}>
                <TextField 
                    label="Subject" 
                    value={q.subject || ''} 
                    onChange={(e) => setQ({ ...q, subject: e.target.value })} 
                    fullWidth
                    disabled={isSubject} 
                    helperText={isSubject ? "Fixed to your assigned subject." : ""}
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField 
                    label="Class / Grade" 
                    value={q.class_number || ''} 
                    onChange={(e) => setQ({ ...q, class_number: e.target.value })} 
                    fullWidth
                />
            </Grid>
            <Grid item xs={12} md={4}>
                <TextField label="Chapter" value={q.chapter || ''} onChange={(e) => setQ({ ...q, chapter: e.target.value })} fullWidth placeholder="e.g. Algebra" />
            </Grid>
            <Grid item xs={12} md={4}>
                <TextField label="Topic" value={q.topic || ''} onChange={(e) => setQ({ ...q, topic: e.target.value })} fullWidth placeholder="e.g. Linear Equations" />
            </Grid>
            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <InputLabel>Difficulty</InputLabel>
                    <Select value={q.difficulty || 'Medium'} label="Difficulty" onChange={(e) => setQ({ ...q, difficulty: e.target.value })}>
                        <MenuItem value="Easy">Easy</MenuItem>
                        <MenuItem value="Medium">Medium</MenuItem>
                        <MenuItem value="Hard">Hard</MenuItem>
                        <MenuItem value="Olympiad">Olympiad</MenuItem>
                    </Select>
                </FormControl>
            </Grid>

            {/* --- IMAGE UPLOAD UI --- */}
            <Grid item xs={12}>
                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                   <Button
                      variant="outlined"
                      component="label"
                      startIcon={uploadingImg ? <CircularProgress size={20}/> : <CloudUploadIcon />}
                      disabled={uploadingImg}
                   >
                      {q.image_path ? "Change Image" : "Upload Question Image"}
                      <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                   </Button>

                   {q.image_path && (
                       <Button color="error" onClick={() => setQ({...q, image_path: ''})}>
                           Remove Image
                       </Button>
                   )}
                </Stack>

                {q.image_path && (
                    <Card sx={{ maxWidth: 400, border: '1px solid #eee' }}>
                        <CardMedia component="img" image={q.image_path} alt="Question Preview" height="200" sx={{ objectFit: 'contain', bgcolor: '#fafafa' }} />
                    </Card>
                )}
            </Grid>
            {/* ----------------------- */}

            <Grid item xs={12}>
                <TextField 
                    label="Question Text" 
                    multiline 
                    rows={4} 
                    value={q.text || ''} 
                    onChange={(e) => setQ({ ...q, text: e.target.value })} 
                    fullWidth
                    required
                />
            </Grid>

            <Grid item xs={12}>
                <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">OPTIONS</Typography></Divider>
            </Grid>

            <Grid item xs={12} md={6}><TextField label="Option A" value={q.option_a || ''} onChange={(e) => setQ({ ...q, option_a: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Option B" value={q.option_b || ''} onChange={(e) => setQ({ ...q, option_b: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Option C" value={q.option_c || ''} onChange={(e) => setQ({ ...q, option_c: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} md={6}><TextField label="Option D" value={q.option_d || ''} onChange={(e) => setQ({ ...q, option_d: e.target.value })} fullWidth /></Grid>

            <Grid item xs={12}>
                <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">ANSWER KEY</Typography></Divider>
            </Grid>

            <Grid item xs={12} md={6}>
                <TextField 
                    label="Correct Answer" 
                    value={q.correct_answer || ''} 
                    onChange={(e) => setQ({ ...q, correct_answer: e.target.value })} 
                    fullWidth
                    required
                    helperText="Enter option letter (A, B, C, D) or exact text."
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField label="Marks" type="number" value={q.marks || 1} onChange={(e) => setQ({ ...q, marks: e.target.value })} fullWidth />
            </Grid>

            <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                <Box>
                    {isAdmin && !isNewMode && (
                        <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
                            Delete Question
                        </Button>
                    )}
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        startIcon={saving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />} 
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {isNewMode ? 'Create Question' : 'Save Changes'}
                    </Button>
                </Stack>
            </Grid>

        </Grid>
      </Paper>

      <Snackbar 
        open={snack.open} 
        autoHideDuration={4000} 
        onClose={() => setSnack((s) => ({...s, open: false}))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({...s, open: false}))}>
            {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}