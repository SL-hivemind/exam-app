import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Quiz as QuizIcon,
  Event as EventIcon,
  TimerOutlined as TimerIcon,
  CheckCircleOutline as ReleasedIcon,
  DraftsOutlined as DraftIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";

export default function AdminExams() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [accessStart, setAccessStart] = useState("");
  const [accessEnd, setAccessEnd] = useState("");
  const [errors, setErrors] = useState({});

  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  const basePath = user?.role === "school_admin" ? "/school" : "/admin";

  useEffect(() => {
    fetchExams();
  }, []);

  const filteredExams = useMemo(() => {
    if (!searchTerm) return exams;
    const term = searchTerm.toLowerCase();
    return exams.filter(
      (exam) =>
        (exam.title || "").toLowerCase().includes(term) ||
        (exam.description || "").toLowerCase().includes(term)
    );
  }, [exams, searchTerm]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = exams.length;
    const released = exams.filter((e) => e.results_released).length;
    const drafts = total - released;
    const active = exams.filter((e) => {
      if (!e.access_start || !e.access_end) return false;
      const start = new Date(e.access_start);
      const end = new Date(e.access_end);
      return start <= now && now <= end;
    }).length;
    return { total, released, drafts, active };
  }, [exams]);

  async function fetchExams() {
    try {
      setLoadingExams(true);
      const res = await api.get("/admin/exams");
      setExams(res.data.exams || []);
    } catch (e) {
      setSnack({ open: true, severity: "error", message: "Failed to load exams" });
    } finally {
      setLoadingExams(false);
    }
  }

  function openCreateDialog() {
    setTitle("");
    setDescription("");
    setDuration(60);
    setAccessStart("");
    setAccessEnd("");
    setErrors({});
    setOpenCreate(true);
  }

  const formatDate = (isoString) => {
    if (!isoString) return "Not scheduled";
    try {
      return format(new Date(isoString), "MMM d, yyyy HH:mm");
    } catch {
      return isoString;
    }
  };

  const validateExamForm = () => {
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = "Exam title is required";
    if (!duration || Number(duration) < 1) nextErrors.duration = "Duration must be at least 1 minute";
    if (accessStart && accessEnd && new Date(accessEnd) <= new Date(accessStart)) {
      nextErrors.accessEnd = "End time must be after start time";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  async function handleManualCreate() {
    if (!validateExamForm()) return;

    try {
      setBusy(true);
      const payload = {
        title: title.trim(),
        description: description || "",
        duration_minutes: Number(duration),
        access_start: accessStart || null,
        access_end: accessEnd || null,
      };

      const res = await api.post("/admin/exams", payload);
      setSnack({ open: true, severity: "success", message: "Exam created successfully" });
      setOpenCreate(false);
      await fetchExams();

      if (res.data?.exam?.id) {
        navigate(`${basePath}/exams/${res.data.exam.id}`);
      }
    } catch (err) {
      setSnack({ open: true, severity: "error", message: err.response?.data?.message || "Failed to create exam" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f3f7fc", p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary.main">
            Exam Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create, organize and maintain exams from one place.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={fetchExams}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Create Exam
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: "1px solid #d9e2f0" }}>
            <Typography variant="caption" color="text.secondary">Total Exams</Typography>
            <Typography variant="h5" fontWeight={700}>{stats.total}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: "1px solid #d9e2f0" }}>
            <Typography variant="caption" color="text.secondary">Released</Typography>
            <Typography variant="h5" fontWeight={700} color="success.main">{stats.released}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: "1px solid #d9e2f0" }}>
            <Typography variant="caption" color="text.secondary">Drafts</Typography>
            <Typography variant="h5" fontWeight={700} color="warning.main">{stats.drafts}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: "1px solid #d9e2f0" }}>
            <Typography variant="caption" color="text.secondary">Active Now</Typography>
            <Typography variant="h5" fontWeight={700} color="info.main">{stats.active}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2.5, border: "1px solid #d9e2f0" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search exam title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {loadingExams ? (
        <Box sx={{ py: 7, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : filteredExams.length === 0 ? (
        <Alert severity="info">No exams found for the current filter.</Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredExams.map((exam) => (
            <Grid key={exam.id} item xs={12} md={6} xl={4}>
              <Card sx={{ height: "100%", borderRadius: 2.5, border: "1px solid #d9e2f0", boxShadow: "none" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Chip
                      icon={exam.results_released ? <ReleasedIcon /> : <DraftIcon />}
                      label={exam.results_released ? "Released" : "Draft"}
                      color={exam.results_released ? "success" : "default"}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">ID: {exam.id}</Typography>
                  </Stack>

                  <Typography variant="h6" fontWeight={700} sx={{ mb: 0.75 }}>
                    {exam.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>
                    {exam.description || "No description provided"}
                  </Typography>

                  <Stack spacing={0.8} sx={{ mt: 2 }}>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <TimerIcon fontSize="inherit" /> {exam.duration_minutes} mins
                    </Typography>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <EventIcon fontSize="inherit" /> Start: {formatDate(exam.access_start)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <EventIcon fontSize="inherit" /> End: {formatDate(exam.access_end)}
                    </Typography>
                  </Stack>
                </CardContent>
                <Divider />
                <CardActions sx={{ p: 1.5, justifyContent: "space-between" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`${basePath}/exams/${exam.id}`)}
                  >
                    Details
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<QuizIcon />}
                    onClick={() => navigate(`${basePath}/exams/${exam.id}/questions`)}
                  >
                    Questions
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>Create Exam</Typography>
          <Typography variant="body2" color="text.secondary">Configure exam basics and scheduling.</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                label="Exam Title"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Duration (min)"
                type="number"
                fullWidth
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                error={!!errors.duration}
                helperText={errors.duration}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleManualCreate} disabled={busy}>
            {busy ? <CircularProgress size={18} color="inherit" /> : "Create Exam"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
