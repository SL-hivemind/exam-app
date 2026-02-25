import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Chip,
  InputAdornment,
  Zoom,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Quiz as QuizIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon,
  InfoOutlined as InfoIcon,
  TimerOutlined as TimerIcon
} from "@mui/icons-material";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";


export default function AdminExams() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // create dialog
  const [openCreate, setOpenCreate] = useState(false);

  // common create fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  // Dates stored as datetime-local strings (YYYY-MM-DDTHH:mm)
  const [accessStart, setAccessStart] = useState("");
  const [accessEnd, setAccessEnd] = useState("");

  const [schoolId, setSchoolId] = useState("");
  const [errors, setErrors] = useState({});


  // ui
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  const getBasePath = () => {
    if (user?.role === 'school_admin') return '/school';
    return '/admin';
  };
  const basePath = getBasePath();
  const isSchoolAdmin = user?.role === 'school_admin';

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredExams(exams);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredExams(exams.filter(e => e.title.toLowerCase().includes(lower)));
    }
  }, [searchTerm, exams]);

  async function fetchExams() {
    try {
      setLoadingExams(true);
      const res = await api.get("/admin/exams");
      setExams(res.data.exams || []);
    } catch (e) {
      console.error("fetchExams:", e);
      setSnack({ open: true, severity: "error", message: "failed to load exams" });
    } finally {
      setLoadingExams(false);
    }
  }

  function openCreateDialog() {
    setTitle("");
    setDescription("");
    setDuration(60);
    setAccessStart(null);
    setAccessEnd(null);
    setSchoolId("");
    setOpenCreate(true);
  }

  function closeCreate() {
    setOpenCreate(false);
  }

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    try {
      return format(new Date(isoString), "MMM d, yyyy HH:mm");
    } catch {
      return isoString;
    }
  };

  const validateExamForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = "Exam title is required";
    }

    if (!duration || duration < 1) {
      newErrors.duration = "Duration must be at least 1 minute";
    }

    if (accessStart && accessEnd) {
      if (new Date(accessEnd) <= new Date(accessStart)) {
        newErrors.accessEnd = "End time must be after start time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  async function handleManualCreate() {
    if (!validateExamForm()) return;

    try {
      setBusy(true);
      const payload = {
        title: title.trim(),
        description,
        duration_minutes: Number(duration),
        access_start: accessStart || null,
        access_end: accessEnd || null,
      };

      const res = await api.post("/admin/exams", payload);

      setSnack({
        open: true,
        severity: "success",
        message: "Exam created successfully",
      });

      closeCreate();
      fetchExams();

      if (res.data?.exam?.id) {
        navigate(`${basePath}/exams/${res.data.exam.id}`);
      }
    } catch (err) {
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to create exam",
      });
    } finally {
      setBusy(false);
    }
  }




  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa' }}>

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Exam Management</Typography>
          <Typography variant="body2" color="text.secondary">Create and manage assessments.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ px: 3, py: 1, borderRadius: 2 }}>
          Create New Exam
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search exams by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
          }}
        />
      </Paper>

      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell><strong>Title & Description</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell><strong>Schedule</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingExams ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress sx={{ my: 2 }} /></TableCell></TableRow>
            ) : filteredExams.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>No exams found.</TableCell></TableRow>
            ) : (
              filteredExams.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                      {e.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 300 }}>
                      {e.description || "No description provided"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TimerIcon fontSize="small" color="action" />
                      <Typography variant="body2">{e.duration_minutes} min</Typography>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventIcon fontSize="inherit" color="success" /> Start: {formatDate(e.access_start)}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventIcon fontSize="inherit" color="error" /> End: &nbsp;{formatDate(e.access_end)}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={e.results_released ? "Released" : "Draft"}
                      color={e.results_released ? "success" : "default"}
                      size="small"
                      variant={e.results_released ? "filled" : "outlined"}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => navigate(`${basePath}/exams/${e.id}`)}
                      >
                        View
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<QuizIcon />}
                        onClick={() => navigate(`${basePath}/exams/${e.id}/questions`)}
                        color="secondary"
                      >
                        Questions
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={openCreate}
        onClose={closeCreate}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: '8px', // Professional standard
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }
        }}
      >
        <DialogTitle sx={{ px: 4, pt: 3, pb: 2 }}>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em">
            Create Exam
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fill in the details below to initialize a new assessment.
          </Typography>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ px: 4, py: 3 }}>
          <Stack spacing={4}>

            {/* SECTION: GENERAL INFO */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
                <Box sx={{ width: 3, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
                  General Details
                </Typography>
              </Stack>

              <Grid container spacing={2.5}>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Exam Title"
                    fullWidth
                    variant="outlined"
                    placeholder="Internal Exam Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Duration"
                    type="number"
                    fullWidth
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">min</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Additional instructions for students..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* SECTION: SCHEDULING */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
                <Box sx={{ width: 3, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
                <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
                  Exam Schedule
                </Typography>
              </Stack>

              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Start Date & Time"
                    type="datetime-local"
                    fullWidth
                    value={accessStart || ""}
                    onChange={(e) => setAccessStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="End Date & Time"
                    type="datetime-local"
                    fullWidth
                    value={accessEnd || ""}
                    onChange={(e) => setAccessEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.accessEnd}
                    helperText={errors.accessEnd}
                  />
                </Grid>
              </Grid>
            </Box>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 4, py: 3, borderTop: '1px solid #f0f0f0' }}>
          <Button
            onClick={closeCreate}
            sx={{ color: 'text.secondary', fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={handleManualCreate}
            disabled={busy}
            sx={{
              px: 4,
              borderRadius: '6px',
              fontWeight: 600,
              textTransform: 'none'
            }}
          >
            {busy ? <CircularProgress size={20} color="inherit" /> : "Save Exam"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}