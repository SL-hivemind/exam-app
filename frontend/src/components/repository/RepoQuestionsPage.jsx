import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import FilterSidebar from '../ui/FilterSidebar';

import {
  Button, Checkbox, Box, Typography, IconButton, Paper, Stack,
  Grid, Chip, CircularProgress, TablePagination,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Drawer, Divider
} from '@mui/material';

import {
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  GridOn as GridOnIcon,
  LibraryAdd as LibraryAddIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export default function RepoQuestionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const examId = query.get('examId');

  /* ---------------- ROLE FLAGS ---------------- */
  const isAdmin = user?.role === 'admin';
  const isSubject = user?.role === 'subject_specialist';
  const isSchoolAdmin = user?.role === 'school_admin';

  const canEditRepo = isAdmin || isSubject;
  const canAddRepo = isAdmin;
  const canBulkEdit = isAdmin || isSubject;
  const canPickExam = isAdmin || isSchoolAdmin;

  const basePath =
    isSchoolAdmin ? '/school' :
    isSubject ? '/specialist' :
    '/admin';

  /* ---------------- FILTER STATE (URL PERSISTED) ---------------- */
  const [filters, setFilters] = useState({
    search: query.get('search') || '',
    class_number: query.get('class_number') || '',
    subject: query.get('subject') || '',
    chapter: query.get('chapter') || '',
    topic: query.get('topic') || ''
  });

  useEffect(() => {
    const params = new URLSearchParams(filters);
    if (examId) params.set('examId', examId);
    navigate({ search: params.toString() }, { replace: true });
  }, [filters, examId, navigate]);

  /* ---------------- DATA STATE ---------------- */
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ---------------- SELECTION (EXAM ONLY) ---------------- */
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedMap, setSelectedMap] = useState({});
  const [reviewOpen, setReviewOpen] = useState(false);

  /* ---------------- ACTION STATE ---------------- */
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });

  /* ---------------- FETCH ---------------- */
  const fetchRepo = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page + 1,
        per_page: rowsPerPage,
        ...filters
      });
      const res = await api.get(`/admin/repository/questions?${params}`);
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

  /* ---------------- SELECTION LOGIC ---------------- */
  const pageIds = questions.map(q => q.id);
  const allSelectedOnPage =
    pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

  const toggleSelect = (q) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const mapCopy = { ...selectedMap };

      if (next.has(q.id)) {
        next.delete(q.id);
        delete mapCopy[q.id];
      } else {
        next.add(q.id);
        mapCopy[q.id] = q;
      }

      setSelectedMap(mapCopy);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const mapCopy = { ...selectedMap };

      if (allSelectedOnPage) {
        questions.forEach(q => {
          next.delete(q.id);
          delete mapCopy[q.id];
        });
      } else {
        questions.forEach(q => {
          next.add(q.id);
          mapCopy[q.id] = q;
        });
      }

      setSelectedMap(mapCopy);
      return next;
    });
  };

  /* ---------------- ADD TO EXAM ---------------- */
  const handleAddToExam = () => {
    if (selectedIds.size >= 50) setConfirmOpen(true);
    else confirmAdd();
  };

  const confirmAdd = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      await api.post(`/admin/exams/${examId}/questions/pick`, {
        repository_ids: Array.from(selectedIds)
      });
      setSnack({
        open: true,
        severity: 'success',
        message: `${selectedIds.size} questions added to exam`
      });
      setSelectedIds(new Set());
      setSelectedMap({});
    } catch {
      setSnack({
        open: true,
        severity: 'error',
        message: 'Failed to add questions to exam'
      });
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <FilterSidebar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters({ search: '', class_number: '', subject: '', chapter: '', topic: '' })}
      />

      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', bgcolor: '#f5f7fa' }}>
        <Stack direction="row" justifyContent="space-between" mb={3}>
          <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 1 }}>
              Back
            </Button>
            <Typography variant="h4" fontWeight={700}>Question Repository</Typography>
            <Typography variant="body2" color="text.secondary">
              Total Questions Found: {total}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            {canPickExam && examId && questions.length > 0 && (
              <Button variant="outlined" size="small" onClick={toggleSelectPage}>
                {allSelectedOnPage ? 'Unselect Page' : 'Select Page'}
              </Button>
            )}

            {canPickExam && examId && selectedIds.size > 0 && (
              <>
                <Button variant="outlined" onClick={() => setReviewOpen(true)}>
                  Review ({selectedIds.size})
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<LibraryAddIcon />}
                  disabled={busy}
                  onClick={handleAddToExam}
                >
                  Add to Exam
                </Button>
              </>
            )}

            {canAddRepo && (
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                Upload CSV <input type="file" hidden accept=".csv" />
              </Button>
            )}

            {canAddRepo && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(`${basePath}/repository/questions/new${location.search}`)}
              >
                Add Question
              </Button>
            )}

            {canBulkEdit && (
              <Button
                variant="outlined"
                startIcon={<GridOnIcon />}
                onClick={() =>
                  navigate(`${isSubject ? '/specialist' : '/admin'}/repository/bulk-edit${location.search}`)
                }
              >
                Bulk Editor
              </Button>
            )}
          </Stack>
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
        ) : (
          <Stack spacing={2}>
            {questions.map(q => (
              <Paper key={q.id} sx={{ p: 2, borderRadius: 2 }}>
                <Box display="flex" gap={2}>
                  {canPickExam && examId && (
                    <Checkbox
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelect(q)}
                      color="secondary"
                    />
                  )}

                  <Box flexGrow={1}>
                    <Stack direction="row" spacing={1} mb={1}>
                      <Chip label={`ID: ${q.custom_id}`} size="small" color="primary" variant="outlined" />
                      <Chip label={q.subject} size="small" />
                      <Chip label={`Class ${q.class_number}`} size="small" />
                    </Stack>
                    <Typography variant="subtitle1">{q.text}</Typography>
                    <Typography variant="caption" color="success.main" fontWeight="bold">
                      Ans: {q.correct_answer}
                    </Typography>
                  </Box>

                  {canEditRepo && (
                    <IconButton
                      color="primary"
                      onClick={() =>
                        navigate(`${basePath}/repository/questions/${q.id}/edit${location.search}`)
                      }
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        )}

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Box>

      {/* REVIEW DRAWER */}
      {canPickExam && (
        <Drawer anchor="right" open={reviewOpen} onClose={() => setReviewOpen(false)}>
          <Box sx={{ width: 480, p: 3 }}>
            <Stack direction="row" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={700}>Review Selected Questions</Typography>
              <IconButton onClick={() => setReviewOpen(false)}><CloseIcon /></IconButton>
            </Stack>

            <Stack spacing={2}>
              {Object.values(selectedMap).map((q, i) => (
                <Paper key={q.id} sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={600}>{i + 1}. {q.text}</Typography>
                    <IconButton color="error" onClick={() => toggleSelect(q)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>

                  <Grid container spacing={1} mt={1}>
                    {['option_a', 'option_b', 'option_c', 'option_d'].map(opt => (
                      <Grid item xs={6} key={opt}>
                        <Typography variant="body2">
                          {opt.slice(-1).toUpperCase()}) {q[opt]}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>

                  <Chip label={`Answer: ${q.correct_answer}`} size="small" color="success" sx={{ mt: 1 }} />
                </Paper>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Button fullWidth variant="contained" color="secondary" onClick={handleAddToExam}>
              Confirm & Add to Exam
            </Button>
          </Box>
        </Drawer>
      )}

      {/* CONFIRMATION */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Bulk Add</DialogTitle>
        <DialogContent>
          <Typography>
            You are about to add <strong>{selectedIds.size}</strong> questions to this exam.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={confirmAdd}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
