import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import FilterSidebar from '../ui/FilterSidebar';
import AutoGenerateExamDialog from './AutoGenerateExamDialog';
import MatrixFormatter from '../../utils/MatrixFormatter';

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
  const [autoGenOpen, setAutoGenOpen] = useState(false);

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


  const handleRepoCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setBusy(true);

      const res = await api.post(
        "/admin/repository/questions/import",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const inserted = Number(res.data?.inserted ?? 0);
      const skipped = Number(res.data?.skipped ?? 0);
      const successMessage =
        Number.isFinite(inserted) && Number.isFinite(skipped)
          ? `Imported ${inserted} questions, skipped ${skipped} duplicates`
          : (res.data?.message || "Import completed successfully");

      setSnack({
        open: true,
        severity: "success",
        message: successMessage
      });

      fetchRepo(); // refresh list

    } catch (err) {
      setSnack({
        open: true,
        severity: "error",
        message:
          err.response?.data?.message ||
          err.response?.data?.detail ||
          "Import failed"
      });
    } finally {
      setBusy(false);
      e.target.value = ""; // 🔑 REQUIRED to allow re-uploading same file
    }
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
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <FilterSidebar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters({ search: '', class_number: '', subject: '', chapter: '', topic: '' })}
      />

      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', bgcolor: 'transparent' }}>
        <Stack spacing={2} mb={3}>
          <Box>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 1 }}>
              Back
            </Button>
            <Typography variant="h4" fontWeight={700}>Question Repository</Typography>
            <Typography variant="body2" color="text.secondary">
              Total Questions Found: {total}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {canPickExam && examId && questions.length > 0 && (
              <Button variant="outlined" size="small" onClick={toggleSelectPage}>
                {allSelectedOnPage ? 'Unselect Page' : 'Select Page'}
              </Button>
            )}

            {canPickExam && examId && selectedIds.size > 0 && (
              <>
                <Button variant="outlined" size="small" onClick={() => setReviewOpen(true)}>
                  Review ({selectedIds.size})
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<LibraryAddIcon />}
                  disabled={busy}
                  onClick={handleAddToExam}
                >
                  Add to Exam
                </Button>
              </>
            )}

            {canAddRepo && (
              <Button
                variant="outlined"
                component="label"
                size="small"
                startIcon={<CloudUploadIcon />}
                disabled={busy}
              >
                {busy ? "Uploading..." : "Upload CSV"}
                <input
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={handleRepoCsvUpload}
                />
              </Button>

            )}

            {canAddRepo && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => navigate(`${basePath}/repository/questions/new${location.search}`)}
              >
                Add Question
              </Button>
            )}

            {canPickExam && !examId && (
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => setAutoGenOpen(true)}
              >
                Auto-Generate Exam
              </Button>
            )}

            {canBulkEdit && (
              <Button
                variant="outlined"
                size="small"
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

                  <Box flexGrow={1} sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={`ID: ${q.custom_id}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {q.subject && <Chip label={q.subject} size="small" />}
                      {q.class_number && (
                        <Chip label={`Class ${q.class_number}`} size="small" />
                      )}
                    </Stack>

                    {/* Question text */}
                    <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      <MatrixFormatter text={q.text} />
                    </Typography>

                    {/* Question image */}
                    {q.image_path && (
                      <Box sx={{ my: 1.5 }}>
                        <img
                          src={q.image_path}
                          alt="Question"
                          style={{
                            maxHeight: 200,
                            maxWidth: '100%',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.08)',
                            objectFit: 'contain'
                          }}
                        />
                      </Box>
                    )}

                    {/* Options */}
                    <Grid container spacing={1} mt={1}>
                      {q.option_a && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>A) <MatrixFormatter text={q.option_a} /></Typography>
                        </Grid>
                      )}
                      {q.option_b && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>B) <MatrixFormatter text={q.option_b} /></Typography>
                        </Grid>
                      )}
                      {q.option_c && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>C) <MatrixFormatter text={q.option_c} /></Typography>
                        </Grid>
                      )}
                      {q.option_d && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>D) <MatrixFormatter text={q.option_d} /></Typography>
                        </Grid>
                      )}
                    </Grid>

                    {/* Answer */}
                    <Typography
                      variant="caption"
                      color="success.main"
                      fontWeight="bold"
                      sx={{ mt: 1, display: 'block' }}
                    >
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
                    <Typography fontWeight={600} sx={{ whiteSpace: 'pre-wrap' }}>{i + 1}. <MatrixFormatter text={q.text} /></Typography>
                    <IconButton color="error" onClick={() => toggleSelect(q)}>
                      <DeleteIcon />
                    </IconButton>
                  </Stack>

                  <Grid container spacing={1} mt={1}>
                    {['option_a', 'option_b', 'option_c', 'option_d'].map(opt => (
                      <Grid item xs={12} sm={6} key={opt}>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {opt.slice(-1).toUpperCase()}) <MatrixFormatter text={q[opt]} />
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

      <AutoGenerateExamDialog
        open={autoGenOpen}
        onClose={() => setAutoGenOpen(false)}
        initialFilters={filters}
        onSuccess={(data) => {
          setAutoGenOpen(false);
          setSnack({ open: true, severity: 'success', message: data.message });
          // optionally navigate to the created exam
          // if (data.exam_type === 'quick') navigate('/quick-exams');
          // else navigate('/admin/exams');
        }}
      />
    </Box>
  );
}
