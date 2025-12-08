import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Typography,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Chip,
  InputAdornment,
  Divider,
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem
} from "@mui/material";
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Visibility as ViewIcon, 
  Quiz as QuizIcon, 
  Event as EventIcon,
  Timer as TimerIcon
} from "@mui/icons-material";
import { formatISO, format, parseISO } from "date-fns"; // Added parseISO
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

// --- NEW IMPORTS FOR CALENDAR ---
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

export default function AdminExams() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [createTab, setCreateTab] = useState(0); 

  // common create fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  
  // Dates stored as Date objects locally for the picker, converted to string for API
  const [accessStart, setAccessStart] = useState(null);
  const [accessEnd, setAccessEnd] = useState(null);
  
  const [schoolId, setSchoolId] = useState("");

  // repository flow state
  const [repoClass, setRepoClass] = useState("");
  const [repoSubject, setRepoSubject] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [repoQuestions, setRepoQuestions] = useState([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState(new Set());
  const [repoPage, setRepoPage] = useState(1);

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
    setCreateTab(0);
    setTitle("");
    setDescription("");
    setDuration(60);
    setAccessStart(null);
    setAccessEnd(null);
    setSchoolId(""); 
    setSelectedRepoIds(new Set());
    setRepoQuestions([]);
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
        // Convert Date objects to ISO Strings for backend
        access_start: accessStart ? accessStart.toISOString() : null,
        access_end: accessEnd ? accessEnd.toISOString() : null,
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

  async function fetchRepoQuestions(page = 1) {
    try {
      setRepoLoading(true);
      const params = {
        class_number: repoClass || undefined,
        subject: repoSubject || undefined,
        search: repoSearch || undefined,
        page,
      };
      const res = await api.get("/admin/repository/questions", { params });
      const qs = res.data.questions || [];
      setRepoQuestions(qs);
      setRepoPage(page);
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", message: "Failed to fetch repository questions" });
    } finally {
      setRepoLoading(false);
    }
  }

  function toggleSelectRepo(qid) {
    setSelectedRepoIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(qid)) copy.delete(qid);
      else copy.add(qid);
      return copy;
    });
  }

  async function handleCreateFromRepo() {
    if (!title.trim()) {
      setSnack({ open: true, severity: "warning", message: "Title is required" });
      return;
    }
    if (selectedRepoIds.size === 0) {
      setSnack({ open: true, severity: "warning", message: "Select at least one question" });
      return;
    }
    try {
      setBusy(true);
      const payload = {
        title: title.trim(),
        description,
        duration_minutes: parseInt(duration, 10) || 60,
        access_start: accessStart ? accessStart.toISOString() : null,
        access_end: accessEnd ? accessEnd.toISOString() : null,
        school_id: schoolId || null,
      };
      const createRes = await api.post("/admin/exams", payload);
      const newExam = createRes.data.exam;
      
      if (!newExam || !newExam.id) throw new Error("Creation failed");

      const repoIdsArray = Array.from(selectedRepoIds);
      await api.post(`/admin/exams/${newExam.id}/questions/pick`, { repository_ids: repoIdsArray });

      setSnack({ open: true, severity: "success", message: "Exam created with selected questions" });
      closeCreate();
      fetchExams();
      navigate(`${basePath}/exams/${newExam.id}`);
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
      <Dialog open={openCreate} onClose={closeCreate} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 2, minHeight: '80vh' } }}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <Typography variant="h6">Create New Exam</Typography>
        </DialogTitle>
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2 }}>
              <Tabs value={createTab} onChange={(ev, v) => setCreateTab(v)} textColor="primary" indicatorColor="primary">
                <Tab label="1. Basic Details" />
                <Tab label="2. Add Questions (Repository)" disabled={createTab === 0} />
              </Tabs>
            </Box>

            <Box sx={{ p: 4 }}>
              {/* TAB 0: MANUAL DETAILS */}
              <Box display={createTab === 0 ? "block" : "none"}>
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
                      <Grid item xs={12} md={6}>
                          <DateTimePicker
                              label="Access Start Time"
                              value={accessStart}
                              onChange={(newValue) => setAccessStart(newValue)}
                              slotProps={{ textField: { fullWidth: true } }}
                          />
                      </Grid>
                      <Grid item xs={12} md={6}>
                          <DateTimePicker
                              label="Access End Time"
                              value={accessEnd}
                              onChange={(newValue) => setAccessEnd(newValue)}
                              slotProps={{ textField: { fullWidth: true } }}
                          />
                      </Grid>
                      {/* ---------------------------- */}
                      
                      {!isSchoolAdmin && (
                          <Grid item xs={12} md={6}>
                              <TextField label="Assign School ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} fullWidth />
                          </Grid>
                      )}
                  </Grid>
                  
                  <Box mt={4} display="flex" justifyContent="flex-end">
                      <Button variant="contained" onClick={() => setCreateTab(1)} endIcon={<QuizIcon />}>
                          Next: Select Questions
                      </Button>
                  </Box>
              </Box>

              {/* TAB 1: REPOSITORY */}
              <Box display={createTab === 1 ? "block" : "none"}>
                  <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa', border: '1px solid #eee' }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                          <TextField size="small" label="Class" value={repoClass} onChange={(e) => setRepoClass(e.target.value)} />
                          <TextField size="small" label="Subject" value={repoSubject} onChange={(e) => setRepoSubject(e.target.value)} />
                          <TextField size="small" label="Search Question..." value={repoSearch} onChange={(e) => setRepoSearch(e.target.value)} fullWidth InputProps={{ endAdornment: <IconButton size="small" onClick={() => fetchRepoQuestions(1)}><SearchIcon /></IconButton> }} />
                          <Button variant="outlined" onClick={() => fetchRepoQuestions(1)}>Filter</Button>
                      </Stack>
                  </Paper>

                  <Paper variant="outlined" sx={{ height: 400, overflow: 'auto' }}>
                      {repoLoading ? (
                          <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
                      ) : (
                          <Table size="small" stickyHeader>
                              <TableHead>
                                  <TableRow>
                                      <TableCell padding="checkbox"></TableCell>
                                      <TableCell>Question</TableCell>
                                      <TableCell width={100}>Sub/Class</TableCell>
                                      <TableCell width={80}>Marks</TableCell>
                                  </TableRow>
                              </TableHead>
                              <TableBody>
                                  {repoQuestions.map((q) => (
                                      <TableRow key={q.id} hover selected={selectedRepoIds.has(q.id)}>
                                          <TableCell padding="checkbox">
                                              <Checkbox checked={selectedRepoIds.has(q.id)} onChange={() => toggleSelectRepo(q.id)} />
                                          </TableCell>
                                          <TableCell>
                                              <Typography variant="body2" noWrap sx={{ maxWidth: 500 }}>{q.text}</Typography>
                                          </TableCell>
                                          <TableCell>
                                              <Typography variant="caption" display="block">{q.subject}</Typography>
                                              <Chip label={q.class_number} size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
                                          </TableCell>
                                          <TableCell>{q.marks}</TableCell>
                                      </TableRow>
                                  ))}
                                  {repoQuestions.length === 0 && <TableRow><TableCell colSpan={4} align="center">No questions found. Try filtering.</TableCell></TableRow>}
                              </TableBody>
                          </Table>
                      )}
                  </Paper>
                  
                  <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" color="primary">{selectedRepoIds.size} questions selected</Typography>
                      <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={() => fetchRepoQuestions(Math.max(1, repoPage - 1))} disabled={repoPage <= 1}>Prev</Button>
                          <Button size="small" onClick={() => fetchRepoQuestions(repoPage + 1)}>Next</Button>
                      </Stack>
                  </Box>
              </Box>
            </Box>
          </DialogContent>
        </LocalizationProvider>

        <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
          <Button onClick={closeCreate} disabled={busy} color="inherit">Cancel</Button>
          
          {createTab === 0 ? (
             <Button variant="outlined" onClick={handleManualCreate} disabled={busy}>
               {busy ? "Creating..." : "Create Empty Exam"}
             </Button>
          ) : (
             <Button variant="contained" onClick={handleCreateFromRepo} disabled={busy}>
               {busy ? <CircularProgress size={18} color="inherit" /> : `Create Exam with ${selectedRepoIds.size} Questions`}
             </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({...s, open:false}))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s)=>({...s, open:false}))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}