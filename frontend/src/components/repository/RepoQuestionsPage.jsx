import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import {
  Button, Checkbox, Box, Typography, IconButton, Paper, Stack, TextField,
  Grid, Chip, CircularProgress, MenuItem, InputAdornment, TablePagination
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Search as SearchIcon,
  GridOn as GridOnIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function RepoQuestionsPage() {
  const { user } = useAuth();
  const query = useQuery();
  const navigate = useNavigate();
  const examId = query.get('examId');

  // --- DATA STATE ---
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Sync state with URL on initial load
  const [page, setPage] = useState(parseInt(query.get('page') || '0', 10));
  const [rowsPerPage, setRowsPerPage] = useState(parseInt(query.get('per_page') || '10', 10));
  const [filters, setFilters] = useState({
    search: query.get('search') || '',
    class_number: query.get('class_number') || '',
    subject: query.get('subject') || ''
  });

  const [selected, setSelected] = useState(new Set());

  const isAdmin = user?.role === 'admin';
  const isSubject = user?.role === 'subject_specialist';

  const getBasePath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'school_admin') return '/school';
    if (user?.role === 'subject_specialist') return '/specialist';
    return '';
  };
  const basePath = getBasePath();

  // Updated URL Helper
  const updateURL = useCallback((newFilters, newPage, newRows) => {
    const params = new URLSearchParams();
    if (examId) params.set('examId', examId);
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.class_number) params.set('class_number', newFilters.class_number);
    if (newFilters.subject) params.set('subject', newFilters.subject);
    params.set('page', newPage);
    params.set('per_page', newRows);
    navigate({ search: params.toString() }, { replace: true });
  }, [navigate, examId]);

  const fetchRepo = useCallback(async () => {
    // Optimization: Don't fetch if the user hasn't selected required filters yet
    if (!filters.class_number && !filters.subject && !filters.search) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page + 1,
        per_page: rowsPerPage,
        search: filters.search,
        class_number: filters.class_number,
        subject: filters.subject
      });

      const res = await api.get(`/admin/repository/questions?${params.toString()}`);
      setQuestions(res.data.questions || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    fetchRepo();
  }, [fetchRepo]);

  // --- HANDLERS ---
  const handleRowsPerPageChange = (event) => {
    const nextRows = parseInt(event.target.value, 10);
    setRowsPerPage(nextRows);
    setPage(0);
    updateURL(filters, 0, nextRows);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    setPage(0);
    updateURL(nextFilters, 0, rowsPerPage);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    updateURL(filters, newPage, rowsPerPage);
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
    try {
      await api.post(`/admin/exams/${examId}/questions/pick`, { repository_ids: repoIds });
      alert(`Added ${repoIds.length} questions`);
      navigate(`${basePath}/exams/${examId}`);
    } catch (err) {
      alert('Pick failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete repository question?')) return;
    try {
      await api.delete(`/admin/repository/questions/${id}`);
      fetchRepo();
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      {/* HEADER */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Question Repository</Typography>
          <Typography variant="body2" color="text.secondary">Central bank for all exams.</Typography>
        </Box>
        {(isAdmin || isSubject) && (
          <Stack direction="row" spacing={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`${basePath}/repository/questions/new`)}>
              Add Question
            </Button>
          </Stack>
        )}
      </Stack>

      {/* FILTER BAR */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth size="small" name="search" placeholder="Search..."
              value={filters.search} onChange={handleFilterChange}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="Class" name="class_number" value={filters.class_number} onChange={handleFilterChange}>
              <MenuItem value="">Select Class</MenuItem>
              {['6', '7', '8', '9', '10'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField select fullWidth size="small" label="Subject" name="subject" value={filters.subject} onChange={handleFilterChange}>
              <MenuItem value="">Select Subject</MenuItem>
              {['Math', 'Science', 'English', 'UPSC'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4} display="flex" justifyContent="flex-end" gap={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRepo}>Refresh</Button>
            {examId && (
              <Button variant="contained" color="secondary" onClick={handlePick} disabled={selected.size === 0}>
                Add Selected ({selected.size})
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* CONDITIONAL CONTENT */}
      {(!filters.class_number && !filters.subject && !filters.search) ? (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: '#fffde7', border: '1px dashed #fbc02d' }}>
          <GridOnIcon sx={{ fontSize: 40, color: '#fbc02d', mb: 2 }} />
          <Typography variant="h6">Please use filters to search questions</Typography>
          <Typography variant="body2" color="text.secondary">Choose a Class, Subject, or type a search term to begin.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
          ) : (
            <>
              {questions.map(q => (
                <Paper key={q.id} elevation={1} sx={{ p: 2, borderRadius: 2, borderLeft: selected.has(q.id) ? '4px solid #9c27b0' : '4px solid transparent' }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    {examId && <Checkbox checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} color="secondary" />}
                    <Box flexGrow={1}>
                      <Stack direction="row" spacing={1} mb={1}>
                        <Chip label={`ID: ${q.id}`} size="small" color="primary" variant="outlined" />
                        <Chip label={q.subject} size="small" variant="outlined" />
                        <Chip label={`Class ${q.class_number}`} size="small" variant="outlined" />
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={500}>{q.text}</Typography>
                      <Grid container spacing={1} sx={{ mt: 1 }}>
                        {['a', 'b', 'c', 'd'].map(opt => (
                          <Grid item xs={6} md={3} key={opt}>
                            <Typography variant="body2"><strong>{opt.toUpperCase()}:</strong> {q[`option_${opt}`]}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                      <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', mt: 1, display: 'block' }}>
                        Correct: {q.correct_answer}
                      </Typography>
                    </Box>
                    <Stack>
                      <IconButton size="small" onClick={() => navigate(`${basePath}/repository/questions/${q.id}/edit`)} color="primary"><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(q.id)}><DeleteIcon /></IconButton>
                    </Stack>
                  </Box>
                </Paper>
              ))}
              {questions.length === 0 && <Typography textAlign="center" py={5}>No questions found.</Typography>}
            </>
          )}
        </Stack>
      )}

      {/* PAGINATION */}
      <TablePagination
        component={Paper} sx={{ mt: 3 }}
        count={total} page={page} onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage} onRowsPerPageChange={handleRowsPerPageChange}
      />
    </Box>
  );
}