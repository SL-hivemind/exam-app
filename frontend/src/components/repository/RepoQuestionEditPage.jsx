import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Paper, Typography, TextField, Button, Stack, Alert,
  Grid, CircularProgress, Divider, Snackbar, Card, CardMedia,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function RepoQuestionEditPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isNewMode = id === 'new' || location.pathname.endsWith('/new');
  const isAdmin = user?.role === 'admin';
  const isSubject = user?.role === 'subject_specialist';

  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [errors, setErrors] = useState({});
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });

  const basePath =
    user?.role === 'admin' ? '/admin' :
      user?.role === 'school_admin' ? '/school' :
        user?.role === 'subject_specialist' ? '/specialist' : '';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isNewMode) {
          setQ({
            text: '',
            subject: isSubject ? user.specialist_subject || '' : '',
            class_number: '',
            chapter: '',
            topic: '',
            difficulty: 'Medium',
            marks: 1,
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_answer: '',
            image_path: ''
          });
        } else {
          const res = await api.get(`/admin/repository/questions/${id}`);
          setQ(res.data.question || res.data);
        }
      } catch {
        setSnack({ open: true, severity: 'error', message: 'Could not load question' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNewMode, isSubject, user]);

  const validate = () => {
    const e = {};
    if (!q.text?.trim()) e.text = 'Question text is required';
    // if (!q.chapter) e.chapter = 'Chapter is required';
    if (!q.correct_answer) e.correct_answer = 'Select correct answer';
    if (!q.marks || q.marks < 1) e.marks = 'Marks must be at least 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingImg(true);
    try {
      const res = await api.post('/admin/upload/image', formData);
      setQ(prev => ({ ...prev, image_path: res.data.url }));
      setSnack({ open: true, severity: 'success', message: 'Image uploaded' });
    } catch {
      setSnack({ open: true, severity: 'error', message: 'Image upload failed' });
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = { ...q, marks: Number(q.marks) };

      if (isNewMode) {
        await api.post('/admin/repository/questions', payload);
        setSnack({ open: true, severity: 'success', message: 'Question created' });
        navigate(`${basePath}/repository/questions`);
      } else {
        await api.put(`/admin/repository/questions/${id}`, payload);
        setSnack({ open: true, severity: 'success', message: 'Changes saved' });
      }
    } catch {
      setSnack({ open: true, severity: 'error', message: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this question permanently?')) return;
    await api.delete(`/admin/repository/questions/${id}`);
    navigate(`${basePath}/repository/questions`);
  };

  if (loading) return <Box p={5} textAlign="center"><CircularProgress /></Box>;
  if (!q) return <Alert severity="error">Question not found</Alert>;

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
        <Typography variant="h5" fontWeight={700}>
          {isNewMode ? 'Create Repository Question' : 'Edit Repository Question'}
        </Typography>
      </Stack>

      <Paper sx={{ p: 4, maxWidth: 900, mx: 'auto', borderRadius: 2 }}>
        <Stack spacing={4}>

          {/* CONTEXT */}
          <Box>
            <Typography variant="overline" fontWeight={700} color="text.secondary">
              Question Context
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Class"
                  value={q.class_number || ''}
                  fullWidth
                  disabled={!isNewMode}              // 🔒 edit mode locked
                  onChange={(e) =>
                    isNewMode && setQ({ ...q, class_number: e.target.value })
                  }
                />

                <TextField
                  label="Subject"
                  value={q.subject || ''}
                  fullWidth
                  disabled={!isNewMode || isSubject} // 🔒 edit mode locked
                  onChange={(e) =>
                    isNewMode && setQ({ ...q, subject: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Chapter"
                  value={q.chapter}
                  onChange={(e) => setQ({ ...q, chapter: e.target.value })}
                  fullWidth
                  error={!!errors.chapter}
                  helperText={errors.chapter}
                />
              </Grid>
            </Grid>
          </Box>

          {/* IMAGE */}
          <Box>
            <Button component="label" startIcon={<CloudUploadIcon />} disabled={uploadingImg}>
              Upload Question Image
              <input hidden type="file" accept="image/*" onChange={handleImageUpload} />
            </Button>
            {q.image_path && (
              <Card sx={{ mt: 2, maxWidth: 400 }}>
                <CardMedia component="img" image={q.image_path} sx={{ objectFit: 'contain' }} />
              </Card>
            )}
          </Box>

          {/* QUESTION */}
          <Box>
            <Typography variant="overline" fontWeight={700} color="text.secondary">
              Question
            </Typography>
            <TextField
              multiline
              rows={4}
              fullWidth
              value={q.text}
              onChange={(e) => setQ({ ...q, text: e.target.value })}
              error={!!errors.text}
              helperText={errors.text}
            />
          </Box>

          {/* OPTIONS */}
          <Grid container spacing={2}>
            {['a', 'b', 'c', 'd'].map(opt => (
              <Grid item xs={6} key={opt}>
                <TextField
                  label={`Option ${opt.toUpperCase()}`}
                  fullWidth
                  value={q[`option_${opt}`]}
                  onChange={(e) => setQ({ ...q, [`option_${opt}`]: e.target.value })}
                />
              </Grid>
            ))}
          </Grid>

          {/* ANSWER */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth error={!!errors.correct_answer}>
                <InputLabel>Correct Answer</InputLabel>
                <Select
                  value={q.correct_answer}
                  label="Correct Answer"
                  onChange={(e) => setQ({ ...q, correct_answer: e.target.value })}
                >
                  <MenuItem value="A">Option A</MenuItem>
                  <MenuItem value="B">Option B</MenuItem>
                  <MenuItem value="C">Option C</MenuItem>
                  <MenuItem value="D">Option D</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Marks"
                type="number"
                fullWidth
                value={q.marks}
                onChange={(e) => setQ({ ...q, marks: e.target.value })}
                error={!!errors.marks}
                helperText={errors.marks}
              />
            </Grid>
          </Grid>

          {/* ACTIONS */}
          <Stack direction="row" justifyContent="space-between">
            {isAdmin && !isNewMode && (
              <Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>

        </Stack>
      </Paper>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
