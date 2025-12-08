import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import {
  Button, Checkbox, Box, Typography, IconButton, Paper, Stack, TextField,
  Grid, Chip, CircularProgress, Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GridOn as GridOnIcon, History as HistoryIcon
} from '@mui/icons-material';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function RepoQuestionsPage() {
  const { user } = useAuth();
  const query = useQuery();
  const navigate = useNavigate();
  const examId = query.get('examId');
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState('');

  const isAdmin = user?.role === 'admin';
  const isSubject = user?.role === 'subject_specialist';

  // Base Path Helper
  const getBasePath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'school_admin') return '/school';
    if (user?.role === 'subject_specialist') return '/specialist';
    return '';
  };
  const basePath = getBasePath();

  useEffect(() => {
    fetchRepo();
  }, []);

  useEffect(() => {
    if (!searchId) {
      setFilteredQuestions(questions);
    } else {
      const lowerSearch = searchId.toLowerCase();
      const filtered = questions.filter(q =>
        q.text.toLowerCase().includes(lowerSearch) ||
        String(q.id).includes(lowerSearch)
      );
      setFilteredQuestions(filtered);
    }
  }, [searchId, questions]);

  async function fetchRepo() {
    setLoading(true);
    try {
      const res = await api.get('/admin/repository/questions');
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await api.post('/admin/repository/questions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      fetchRepo();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const handlePick = async () => {
    if (!examId) return;
    const repoIds = Array.from(selected);
    if (repoIds.length === 0) return alert('Choose at least one question');
    try {
      await api.post(`/admin/exams/${examId}/questions/pick`, { repository_ids: repoIds });
      alert(`Added ${repoIds.length} questions`);
      navigate(`${basePath}/exams/${examId}`);
    } catch (err) {
      console.error(err);
      alert('Pick failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete repository question?')) return;
    try {
      await api.delete(`/admin/repository/questions/${id}`);
      setQuestions(qs => qs.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  const handleEditNavigate = (qid) => {
    if (isAdmin) navigate(`/admin/repository/questions/${qid}/edit`);
    else if (isSubject) navigate(`/specialist/repository/questions/${qid}/edit`);
    else navigate(`${basePath}/repository/questions/${qid}/edit`);
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>

      {/* HEADER */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            Question Repository
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Central bank of questions for all exams.
          </Typography>
        </Box>

        {(isAdmin || isSubject) && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              sx={{ bgcolor: 'white' }}
            >
              Upload CSV
              <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate(`${basePath}/repository/questions/new`)}
            >
              Add Question
            </Button>
            <Button
              variant="outlined"
              startIcon={<GridOnIcon />}
              onClick={() => navigate(`${basePath}/repository/bulk-edit`)}
            >
              Bulk Editor
            </Button>
            <Button
              variant="text"
              startIcon={<HistoryIcon />}
              onClick={() => navigate(isSubject ? '/specialist/activity-log' : '/admin/activity-log')}
            >
              Logs
            </Button>
          </Stack>
        )}
      </Stack>

      {/* FILTER BAR */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search questions by text or ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
            />
          </Grid>
          {examId && (
            <Grid item xs={12} md={6} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="secondary"
                onClick={handlePick}
                disabled={selected.size === 0}
              >
                Add Selected ({selected.size}) to Exam
              </Button>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* LOADING STATE */}
      {loading && (
        <Box display="flex" justifyContent="center" py={5}>
          <CircularProgress />
        </Box>
      )}

      {/* QUESTION LIST */}
      <Stack spacing={2}>
        {filteredQuestions.map(q => (
          <Paper
            key={q.id}
            elevation={1}
            sx={{
              p: 2,
              borderRadius: 2,
              borderLeft: '4px solid',
              borderColor: selected.has(q.id) ? 'secondary.main' : 'transparent',
              transition: '0.2s',
              '&:hover': { boxShadow: 3 }
            }}
          >
            <Box display="flex" alignItems="flex-start" gap={2}>
              {examId && (
                <Checkbox
                  checked={selected.has(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  color="secondary"
                />
              )}

              <Box flexGrow={1}>
                <Stack direction="row" spacing={1} mb={1}>
                  <Chip label={`ID: ${q.id}`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold' }} />
                  {q.subject && <Chip label={q.subject} size="small" variant="outlined" />}
                  {q.marks && <Chip label={`${q.marks} Marks`} size="small" variant="outlined" />}
                </Stack>

                <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                  {q.text}
                </Typography>

                <Grid container spacing={1}>
                  {['a', 'b', 'c', 'd'].map((opt) => (
                    q[`option_${opt}`] && (
                      <Grid item xs={12} sm={6} md={3} key={opt}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box component="span" sx={{ fontWeight: 'bold', mr: 1, textTransform: 'uppercase' }}>{opt}:</Box>
                          {q[`option_${opt}`]}
                        </Typography>
                      </Grid>
                    )
                  ))}
                </Grid>

                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'success.main', fontWeight: 'bold' }}>
                  Correct Answer: {q.correct_answer}
                </Typography>
              </Box>

              <Box display="flex" flexDirection="column">
                {(isAdmin || isSubject) && (
                  <IconButton size="small" onClick={() => handleEditNavigate(q.id)} color="primary">
                    <EditIcon />
                  </IconButton>
                )}
                {isAdmin && (
                  <IconButton size="small" color="error" onClick={() => handleDelete(q.id)}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Paper>
        ))}

        {!loading && filteredQuestions.length === 0 && (
          <Box textAlign="center" py={5}>
            <Typography color="text.secondary">No questions found.</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}