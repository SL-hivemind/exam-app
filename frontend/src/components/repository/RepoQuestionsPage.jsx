import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  
  // --- PERSISTENT STATE (Synced with URL) ---
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

  // URL Sync Helper
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
    // Only fetch if a filter is active to keep RDS performance high
    if (!filters.class_number && !filters.subject && !filters.search) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page + 1,
        per_page: rowsPerPage,
        search: filters.search,
        class_number: filters.class_number === 'All' ? '' : filters.class_number,
        subject: filters.subject === 'All' ? '' : filters.subject
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
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    updateURL(filters, newPage, rowsPerPage);
  };

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

  const handleEditNavigate = (qid) => {
    if (isAdmin) navigate(`/admin/repository/questions/${qid}/edit`);
    else if (isSubject) navigate(`/specialist/repository/questions/${qid}/edit`);
    else navigate(`${basePath}/repository/questions/${qid}/edit`);
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      {/* RESTORED HEADER WITH BULK UPLOAD & EDITOR */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Question Repository</Typography>
          <Typography variant="body2" color="text.secondary">Central bank of questions for all exams.</Typography>
        </Box>

        {(isAdmin || isSubject) && (
          <Stack direction="row" spacing={2}>
            {/* RESTORED CSV UPLOAD */}
            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} sx={{ bgcolor: 'white' }}>
              Upload CSV
              <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
            </Button>

            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`${basePath}/repository/questions/new`)}>
              Add Question
            </Button>

            {/* RESTORED BULK EDITOR */}
            <Button variant="outlined" startIcon={<GridOnIcon />} onClick={() => navigate(`${basePath}/repository/bulk-edit`)}>
              Bulk Editor
            </Button>

            {/* RESTORED LOGS */}
            <Button variant="text" startIcon={<HistoryIcon />} onClick={() => navigate(isSubject ? '/specialist/activity-log' : '/admin/activity-log')}>
              Logs
            </Button>
          </Stack>
        )}
      </Stack>

      {/* FILTER BAR */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth size="small" name="search" placeholder="Search text, options or ID..."
              value={filters.search} onChange={handleFilterChange}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action"/></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
             <TextField select fullWidth size="small" label="Class" name="class_number" value={filters.class_number} onChange={handleFilterChange}>
                <MenuItem value="">All</MenuItem>
                {['6','7','8','9','10'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
             </TextField>
          </Grid>
          <Grid item xs={6} md={2}>
             <TextField select fullWidth size="small" label="Subject" name="subject" value={filters.subject} onChange={handleFilterChange}>
                <MenuItem value="">All</MenuItem>
                {['Math','Science','upsc','English'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
             </TextField>
          </Grid>
          <Grid item xs={12} md={4} display="flex" justifyContent="flex-end" gap={1}>
             <Button variant="outlined" startIcon={<RefreshIcon/>} onClick={fetchRepo}>Refresh</Button>
             {examId && (
              <Button variant="contained" color="secondary" onClick={handlePick} disabled={selected.size === 0}>
                Add Selected ({selected.size})
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* CONDITIONAL RENDERING: LOADING OR EMPTY STATE */}
      {(!filters.class_number && !filters.subject && !filters.search) ? (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: '#fffde7', border: '1px dashed #fbc02d' }}>
          <GridOnIcon sx={{ fontSize: 40, color: '#fbc02d', mb: 2 }} />
          <Typography variant="h6">Please select a Class and Subject</Typography>
          <Typography variant="body2" color="text.secondary">Choose filters above to view repository questions.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {loading ? (
            <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
          ) : (
            <>
              {questions.map(q => (
                <Paper key={q.id} elevation={1} sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid', borderColor: selected.has(q.id) ? 'secondary.main' : 'transparent', transition: '0.2s', '&:hover': { boxShadow: 3 } }}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    {examId && <Checkbox checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} color="secondary" />}
                    <Box flexGrow={1}>
                      <Stack direction="row" spacing={1} mb={1}>
                        <Chip label={`ID: ${q.id}`} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold' }} />
                        {q.subject && <Chip label={q.subject} size="small" variant="outlined" />}
                        {q.class_number && <Chip label={`Class ${q.class_number}`} size="small" variant="outlined" />}
                        {q.marks && <Chip label={`${q.marks} Marks`} size="small" variant="outlined" />}
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={500}>{q.text}</Typography>
                      <Grid container spacing={1}>
                        {['a', 'b', 'c', 'd'].map((opt) => q[`option_${opt}`] && (
                          <Grid item xs={12} sm={6} md={3} key={opt}>
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box component="span" sx={{ fontWeight: 'bold', mr: 1, textTransform: 'uppercase' }}>{opt}:</Box>
                              {q[`option_${opt}`]}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'success.main', fontWeight: 'bold' }}>Correct: {q.correct_answer}</Typography>
                    </Box>
                    <Box display="flex" flexDirection="column">
                      {(isAdmin || isSubject) && (
                        <IconButton size="small" onClick={() => handleEditNavigate(q.id)} color="primary"><EditIcon /></IconButton>
                      )}
                      {isAdmin && (
                        <IconButton size="small" color="error" onClick={() => handleDelete(q.id)}><DeleteIcon /></IconButton>
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
              {questions.length === 0 && (
                <Box textAlign="center" py={5}><Typography color="text.secondary">No questions found.</Typography></Box>
              )}
            </>
          )}
        </Stack>
      )}

      {/* PAGINATION */}
      <Paper sx={{ mt: 3, p: 1, display: 'flex', justifyContent: 'center' }}>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      </Paper>
    </Box>
  );
}