import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  GroupAdd as GroupAddIcon,
  Download as DownloadIcon,
  Quiz as QuizIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishIcon,
  RestartAlt as RestartIcon,
  Search as SearchIcon,
  WarningAmber as WarningIcon // Imported for the danger dialog
} from "@mui/icons-material";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import { PageHeader } from "../common";

export default function AdminExamDetail() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- TABS & STUDENTS LIST ---
  const [tabIndex, setTabIndex] = useState(0);
  const [studentList, setStudentList] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // --- SAFE RESET STATE ---
  const [resetDialog, setResetDialog] = useState({ open: false, studentId: null, studentUsername: '' });
  const [confirmText, setConfirmText] = useState("");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSchoolId, setAssignSchoolId] = useState("");
  const [assignClass, setAssignClass] = useState("");
  const [assignStudentId, setAssignStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editFields, setEditFields] = useState({
    title: "", description: "", duration_minutes: 60,
    access_start: "", access_end: "", results_released: false,
    school_id: "", total_marks: 0,
  });

  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const getBasePath = () => {
    if (user?.role === 'school_admin') return '/school';
    return '/admin';
  };
  const basePath = getBasePath();

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  useEffect(() => {
    if (tabIndex === 1) {
      fetchStudentAttempts();
    }
  }, [tabIndex]);

  useEffect(() => {
    if (user?.role === "school_admin" && schools.length > 0) {
      setAssignSchoolId(user.school_id);
    }
  }, [schools, user]);


  const fetchExamData = () => {
    if (!examId) return;
    setLoading(true);
    api.get(`/admin/exams/${examId}`)
      .then((res) => {
        setExam(res.data.exam);
        const e = res.data.exam || {};
        setEditFields({
          title: e.title || "",
          description: e.description || "",
          duration_minutes: e.duration_minutes || 60,
          access_start: e.access_start || "",
          access_end: e.access_end || "",
          results_released: !!e.results_released,
          school_id: e.school_id || "",
          total_marks: e.total_marks || 0,
        });
      })
      .catch((err) => setError(err.response?.data?.message || "failed to load exam"))
      .finally(() => setLoading(false));
  };

  const fetchStudentAttempts = async () => {
    setLoadingStudents(true);
    try {
      const res = await api.get(`/admin/exams/${examId}/attempts`);
      setStudentList(res.data.students || []);
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: "Failed to load student list" });
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function getSchools() {
      try {
        setLoadingSchools(true);
        const res = await api.get("/admin/schools");
        if (cancelled) return;
        setSchools(res.data.schools || []);
      } catch (e) {
        console.error("failed to fetch schools", e);
      } finally {
        if (!cancelled) setLoadingSchools(false);
      }
    }
    getSchools();
    return () => { cancelled = true; };
  }, []);

  // --- ACTUAL RESET API CALL ---
  const executeReset = async () => {
    try {
      await api.delete(`/admin/exams/${examId}/attempts/${resetDialog.studentId}`);
      setMsg({ type: 'success', text: `Attempt reset for ${resetDialog.studentUsername}` });
      fetchStudentAttempts();
      setResetDialog({ ...resetDialog, open: false }); // Close dialog
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || "Reset failed" });
    }
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleString() : "Not Scheduled";


  const handleToggleRelease = async () => {
    try {
      setBusy(true);
      const newStatus = !exam.results_released;
      await api.put(`/admin/exams/${examId}`, { results_released: newStatus });
      setExam(prev => ({ ...prev, results_released: newStatus }));
      setMsg({
        type: newStatus ? "success" : "info",
        text: newStatus ? "Results RELEASED to students." : "Results HIDDEN from students."
      });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to update status" });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadAttempts = async () => {
    try {
      setBusy(true);
      const resp = await api.get(`/admin/export_student_attempts`, {
        params: { exam_id: examId },
        responseType: "blob",
      });

      const contentType = resp.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        const text = await resp.data.text();
        let j;
        try { j = JSON.parse(text); } catch (e) { j = { message: text }; }
        setMsg({ type: "error", text: j.detail || j.message || "export failed" });
        return;
      }

      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", `exam_${examId}_attempts.xlsx`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMsg({ type: "error", text: "Export failed" });
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async () => {
    if (!assignStudentId && !assignSchoolId && !assignClass) {
      setMsg({ type: "warning", text: "please choose a school/class or enter a student id" });
      return;
    }
    try {
      setBusy(true);
      if (assignStudentId) {
        const res = await api.post(`/admin/exams/${examId}/assign`, { student_id: assignStudentId })
        setMsg({ type: "success", text: res.data.message || "student assigned" });
      } else {
        const payload = {
          school_id: assignSchoolId || undefined,
          class_number: assignClass || undefined,
          replace: false,
        };
        const res = await api.post(`/admin/exams/${examId}/assign`, payload);
        setMsg({ type: "success", text: res.data.message || "assignment completed" });
      }
      setAssignOpen(false);
    } catch (err) {
      setMsg({
        type: "error",
        text: err.response?.data?.message || err.response?.data?.detail || err.message || "assignment failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const openEditDialog = () => {
    if (exam) {
      setEditFields({
        title: exam.title || "",
        description: exam.description || "",
        duration_minutes: exam.duration_minutes || 60,
        access_start: exam.access_start || "",
        access_end: exam.access_end || "",
        results_released: !!exam.results_released,
        school_id: exam.school_id || "",
        total_marks: exam.total_marks || 0,
      });
    }
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const now = new Date().toISOString().slice(0, 16);

    // ❌ Hard validation: start in the past
    if (editFields.access_start && editFields.access_start < now) {
      setMsg({ type: "error", text: "Start time cannot be in the past" });
      return;
    }

    // ❌ Hard validation: end before start
    if (
      editFields.access_start &&
      editFields.access_end &&
      editFields.access_end < editFields.access_start
    ) {
      setMsg({ type: "error", text: "End time cannot be before start time" });
      return;
    }

    // ⚠️ Soft warning: duration longer than available window
    if (editFields.access_start && editFields.access_end) {
      const start = new Date(editFields.access_start);
      const end = new Date(editFields.access_end);
      const availableMinutes = (end - start) / 60000;

      if (availableMinutes < editFields.duration_minutes) {
        setMsg({
          type: "warning",
          text: `Exam window is only ${Math.floor(
            availableMinutes
          )} minutes, but duration is ${editFields.duration_minutes
            } minutes. Students may not finish the exam.`,
        });
        // ⚠️ do NOT return — allow save
      }
    }

    try {
      setEditBusy(true);

      const payload = {
        title: editFields.title,
        description: editFields.description,
        access_start: editFields.access_start || null,
        access_end: editFields.access_end || null,
        duration_minutes: parseInt(editFields.duration_minutes || 0, 10),
        total_marks: parseInt(editFields.total_marks || 0, 10),
        results_released: !!editFields.results_released,
      };

      await api.put(`/admin/exams/${examId}`, payload);

      fetchExamData();
      setMsg({ type: "success", text: "Exam updated successfully" });
      setEditOpen(false);
    } catch (err) {
      setMsg({
        type: "error",
        text: err.response?.data?.message || "Update failed",
      });
    } finally {
      setEditBusy(false);
    }
  };



  const setField = (k, v) => setEditFields((s) => ({ ...s, [k]: v }));

  const filteredStudents = studentList.filter(s =>
    (s.username || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.student_id || "").toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;
  if (!exam) return null;


    return (
    <Box>
      <PageHeader
        onBack={() => navigate(`${basePath}/exams`)}
        title="Exam Details"
        subtitle={exam?.title}
      />

      {msg && <Alert severity={msg.type} onClose={() => setMsg(null)} sx={{ mb: 3 }}>{msg.text}</Alert>}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} indicatorColor="primary" textColor="primary">
          <Tab label="Overview & Actions" />
          <Tab label="Student Progress & Re-attempt" />
        </Tabs>
      </Paper>

      {/* === TAB 0: OVERVIEW === */}
      {tabIndex === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#cfe0ff', wordBreak: 'break-word' }} gutterBottom>{exam.title}</Typography>
                  <Typography variant="body1" color="text.secondary" paragraph sx={{ wordBreak: 'break-word' }}>{exam.description}</Typography>
                </Box>
                <Chip
                  label={exam.results_released ? "Released" : "Draft/Hidden"}
                  color={exam.results_released ? "success" : "warning"}
                  variant={exam.results_released ? "filled" : "outlined"}
                />
              </Stack>
              <Divider sx={{ my: 3 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption">Duration</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{exam.duration_minutes} min</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption">Total Marks</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{exam.total_marks}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption">Assigned</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{exam.assigned_users?.length || 0}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Actions</Typography>
              <Stack spacing={2}>
                <Button variant="contained" color={exam.results_released ? "warning" : "success"} startIcon={exam.results_released ? <UnpublishIcon /> : <PublishIcon />} onClick={handleToggleRelease} fullWidth>
                  {exam.results_released ? "Unpublish Results" : "Release Results"}
                </Button>
                <Button variant="outlined" startIcon={<QuizIcon />} onClick={() => navigate(`${basePath}/exams/${examId}/questions`)} fullWidth>Manage Questions</Button>
                <Button variant="outlined" startIcon={<GroupAddIcon />} onClick={() => setAssignOpen(true)} fullWidth>Assign Students</Button>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditOpen(true)} fullWidth>Edit Details</Button>
                <Divider />
                <Button variant="contained" color="secondary" startIcon={<DownloadIcon />} onClick={handleDownloadAttempts} fullWidth>Download Excel</Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* === TAB 1: STUDENT PROGRESS === */}
      {tabIndex === 1 && (
        <Paper sx={{ p: { xs: 2, md: 3 }, overflowX: 'auto' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} mb={2}>
            <Typography variant="h6">Student Attempts</Typography>
            <TextField
              size="small"
              placeholder="Search student..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              InputProps={{ endAdornment: <SearchIcon color="action" /> }}
              fullWidth={isMobile}
            />
          </Stack>

          {filteredStudents.length > 0 && (
            <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              bgcolor: 'rgba(255,255,255,0.02)', 
              border: '1px solid rgba(255,255,255,0.05)' 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#6c7cff' }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>{filteredStudents.filter(s => s.status === 'Started').length}</strong> Taking Exam
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4ade80' }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>{filteredStudents.filter(s => s.status === 'Completed').length}</strong> Completed
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f2685c' }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>{filteredStudents.filter(s => s.submission_reason === 'tab_switch' || s.status === 'Discontinued').length}</strong> Flagged
                </Typography>
              </Box>
            </Stack>
          )}

          <Box>
            <style>{`
              @keyframes flagPulse {
                0%, 100% { box-shadow: 0 0 0 rgba(242,104,92,0); }
                50% { box-shadow: 0 0 12px rgba(242,104,92,0.5); }
              }
            `}</style>
            {loadingStudents ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
            ) : filteredStudents.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={3}>No students found.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 2 }}>
                {filteredStudents.map((s) => {
                  let borderColor = 'rgba(255,255,255,0.10)';
                  let bgcolor = 'rgba(255,255,255,0.02)';
                  let color = '#9aa3ba';
                  let animate = 'none';
                  
                  if (s.submission_reason === 'tab_switch' || s.status === 'Discontinued') {
                    borderColor = 'rgba(242, 104, 92, 0.4)'; // red for flagged
                    bgcolor = 'rgba(242, 104, 92, 0.14)';
                    color = '#f2685c';
                    animate = 'flagPulse 1.6s ease-in-out infinite';
                  } else if (s.status === 'Completed') {
                    borderColor = 'rgba(74, 222, 128, 0.3)'; // green
                    bgcolor = 'rgba(74, 222, 128, 0.08)';
                    color = '#4ade80';
                  } else if (s.status === 'Started') {
                    borderColor = 'rgba(108, 124, 255, 0.2)'; // blue/indigo
                    bgcolor = 'rgba(108, 124, 255, 0.08)';
                    color = '#6c7cff';
                  }

                  return (
                    <Box
                      key={s.user_id}
                      onClick={() => setSelectedStudent(s)}
                      sx={{
                        aspectRatio: '1',
                        borderRadius: 2,
                        border: `1px solid ${borderColor}`,
                        bgcolor,
                        color,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        animation: animate,
                        transition: 'transform 0.2s, border-color 0.2s',
                        '&:hover': {
                           transform: 'translateY(-3px)',
                           borderColor: color
                        }
                      }}
                    >
                      <Typography variant="h5" fontWeight={700} sx={{ fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                        {s.score !== null ? s.score : '-'}
                      </Typography>
                      <Typography variant="caption" sx={{ mt: 1, px: 1, textAlign: 'center', whiteSpace: 'nowrap', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.username}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>        </Paper>
      )}

      {/* --- DIALOGS --- */}

      {/* 1. ASSIGN DIALOG */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Students</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select School</InputLabel>
                <Select
                  value={assignSchoolId}
                  disabled={user?.role === "school_admin"}
                  onChange={(e) => setAssignSchoolId(e.target.value)}
                >
                  {user?.role === "school_admin" ? (
                    <MenuItem value={user.school_id}>
                      {schools.find(s => s.id === user.school_id)?.name || "Your School"}
                    </MenuItem>
                  ) : (
                    schools.map(s => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

            </Grid>
            <Grid item xs={12}>
                <FormControl fullWidth>
                    <InputLabel>Class (Optional)</InputLabel>
                    <Select
                        value={assignClass || ""}
                        label="Class (Optional)"
                        onChange={(e) => setAssignClass(e.target.value)}
                    >
                        <MenuItem value=""><em>All Classes</em></MenuItem>
                        <MenuItem value="1">1</MenuItem>
                        <MenuItem value="2">2</MenuItem>
                        <MenuItem value="3">3</MenuItem>
                        <MenuItem value="4">4</MenuItem>
                        <MenuItem value="5">5</MenuItem>
                        <MenuItem value="6">6</MenuItem>
                        <MenuItem value="7">7</MenuItem>
                        <MenuItem value="8">8</MenuItem>
                        <MenuItem value="9">9</MenuItem>
                        <MenuItem value="10">10</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12}><TextField label="Single Student ID (Optional)" value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setAssignOpen(false)}>Cancel</Button><Button onClick={handleAssign} variant="contained" disabled={busy}>Assign</Button></DialogActions>
      </Dialog>

      {/* 2. EDIT DIALOG */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Exam</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}><TextField label="Exam Title" value={editFields.title} onChange={(e) => setField('title', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12}><TextField label="Description" value={editFields.description} onChange={(e) => setField('description', e.target.value)} fullWidth multiline rows={3} /></Grid>
            <Grid item xs={6}>
              <TextField
                label="Access Start"
                type="datetime-local"
                value={editFields.access_start?.slice(0, 16) || ""}
                inputProps={{
                  min: new Date().toISOString().slice(0, 16), // ⛔ no past
                }}
                onChange={(e) => {
                  const value = e.target.value
                  setField("access_start", value)

                  // auto-fix end if end < start
                  if (editFields.access_end && editFields.access_end < value) {
                    setField("access_end", value)
                  }
                }}
                fullWidth
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                label="Access End"
                type="datetime-local"
                value={editFields.access_end?.slice(0, 16) || ""}
                inputProps={{
                  min: editFields.access_start
                    ? editFields.access_start.slice(0, 16)
                    : new Date().toISOString().slice(0, 16),
                }}
                onChange={(e) => setField("access_end", e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={6}><TextField label="Duration (min)" type="number" value={editFields.duration_minutes} onChange={(e) => setField('duration_minutes', e.target.value)} fullWidth /></Grid>
            <Grid item xs={6}><TextField label="Total Marks" type="number" value={editFields.total_marks} onChange={(e) => setField('total_marks', e.target.value)} fullWidth /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave} variant="contained" disabled={editBusy}>Save</Button></DialogActions>
      </Dialog>

      {/* 3. STUDENT DETAIL DIALOG */}
      <Dialog open={!!selectedStudent} onClose={() => setSelectedStudent(null)} maxWidth="xs" fullWidth>
        {selectedStudent && (
          <>
            <DialogTitle>Student Details</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Name</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedStudent.username}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Student ID</Typography>
                  <Typography variant="body1">{selectedStudent.student_id}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body1">
                    <Chip 
                      label={selectedStudent.status} 
                      size="small"
                      color={selectedStudent.status === 'Completed' ? 'success' : selectedStudent.status === 'Started' ? 'primary' : selectedStudent.status === 'Discontinued' ? 'error' : 'default'}
                    />
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Submission Reason</Typography>
                  <Typography variant="body1">{selectedStudent.submission_reason || '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Score</Typography>
                  <Typography variant="body1" fontWeight={600}>{selectedStudent.score !== null ? selectedStudent.score : '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Started At</Typography>
                  <Typography variant="body1">{selectedStudent.start_time ? new Date(selectedStudent.start_time).toLocaleString() : '-'}</Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Button onClick={() => setSelectedStudent(null)} color="inherit">Close</Button>
              {(selectedStudent.status === 'Completed' || selectedStudent.status === 'Started' || selectedStudent.status === 'Discontinued') && (
                <Button color="error" variant="outlined" startIcon={<RestartIcon />} onClick={() => {
                  const s = selectedStudent;
                  setSelectedStudent(null);
                  setResetDialog({ open: true, studentId: s.user_id, studentUsername: s.username });
                  setConfirmText("");
                }}>
                  Reset Attempt
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 4. SAFE RESET CONFIRMATION DIALOG */}
      <Dialog
        open={resetDialog.open}
        onClose={() => setResetDialog({ ...resetDialog, open: false })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon /> Confirm Reset
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" paragraph>
            You are about to delete the exam attempt for <strong>{resetDialog.studentUsername}</strong>.
          </Typography>

          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>Warning:</strong> This action cannot be undone. All answers and scores for this student will be permanently lost.
          </Alert>

          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Type <strong>{resetDialog.studentUsername}</strong> below to confirm.
          </Typography>

          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Type student username here"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            error={confirmText.length > 0 && confirmText !== resetDialog.studentUsername}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#fef2f2' }}>
          <Button onClick={() => setResetDialog({ ...resetDialog, open: false })} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={confirmText !== resetDialog.studentUsername}
            onClick={executeReset}
          >
            Delete & Reset
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
