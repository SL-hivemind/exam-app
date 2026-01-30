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
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Quiz as QuizIcon,
  Event as EventIcon,
  Timer as TimerIcon
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



  async function handleManualCreate() {
    if (!title.trim()) {
      setSnack({ open: true, severity: "warning", message: "Title is required" });
      return;
    }
    try {
      setBusy(true);
      const payload = {
        title: title.trim(),
        description,
        duration_minutes: parseInt(duration, 10) || 60,
        access_start: accessStart || null,
        access_end: accessEnd || null,
        school_id: schoolId || null,
      };

      const res = await api.post("/admin/exams", payload);
      setSnack({ open: true, severity: "success", message: "Exam created successfully" });
      closeCreate();
      fetchExams();

      const newExam = res.data.exam;
      if (newExam && newExam.id) {
        navigate(`${basePath}/exams/${newExam.id}`);
      }
    } catch (err) {
      console.error(err);
      setSnack({ open: true, severity: "error", message: "Failed to create exam" });
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

      {/* CREATE EXAM DIALOG */}
      <Dialog open={openCreate} onClose={closeCreate} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">Create New Exam</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField label="Exam Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth required />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Duration (minutes)" value={duration} onChange={(e) => setDuration(e.target.value)} type="number" fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description / Instructions" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} />
            </Grid>

            <Grid item xs={12}><Divider textAlign="left"><Typography variant="caption">Scheduling (Optional)</Typography></Divider></Grid>

            {/* --- NEW CALENDAR PICKERS --- */}
            <Grid item xs={6}>
              <TextField
                label="Access Start Time"
                type="datetime-local"
                value={accessStart}
                onChange={(e) => setAccessStart(e.target.value)}
                fullWidth
                inputProps={{
                  min: new Date().toISOString().slice(0, 16),
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Access End Time"
                type="datetime-local"
                value={accessEnd}
                onChange={(e) => setAccessEnd(e.target.value)}
                fullWidth
                inputProps={{
                  min: accessStart || new Date().toISOString().slice(0, 16),
                }}
              />
            </Grid>

            {/* ---------------------------- */}

            {!isSchoolAdmin && (
              <Grid item xs={12} md={6}>
                <TextField label="Assign School ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} fullWidth />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
          <Button onClick={closeCreate} disabled={busy} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={handleManualCreate} disabled={busy}>
            {busy ? <CircularProgress size={18} color="inherit" /> : "Create Exam"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}