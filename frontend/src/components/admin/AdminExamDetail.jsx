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

  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch,
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
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
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
  WarningAmber as WarningIcon, // Imported for the danger dialog
  Groups as GroupsIcon,
  PlayCircleOutline as InProgressIcon,
  TaskAlt as CompletedIcon,
  HourglassBottom as OverdueIcon,
  Flag as FlagIcon,
  VideocamOff as UnproctoredIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import { LinearProgress, Drawer, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import { PageHeader, StatCard, StatusChip, DataTableShell } from "../common";
import { labelOf, HARD_EVENTS } from "../../utils/proctorEvents";
import ProctoringSettings from "./ProctoringSettings";

// Live integrity refresh. Long enough that a hall full of admins costs the
// server almost nothing, short enough that an invigilator sees a problem
// while it is still happening.
const LIVE_POLL_MS = 10000;

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
  const [liveData, setLiveData] = useState(null);
  const [livePolicy, setLivePolicy] = useState(null);
  // Per-student event timeline, loaded on demand. There was no way to see this
  // at all before — an admin could see that a student had three violations but
  // not what they were, when, or how long they lasted.
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

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
    include_in_analysis: true,
    school_id: "",
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
          include_in_analysis: e.include_in_analysis !== false,
          school_id: e.school_id || "",
          proctor_profile_id: e.proctor_profile_id ?? null,
          proctor_overrides: e.proctor_overrides || {},
        });
      })
      .catch((err) => setError(err.response?.data?.message || "failed to load exam"))
      .finally(() => setLoading(false));

    // The exam record carries the profile and the override diff, but not the
    // two layered together. This endpoint returns what will actually be
    // enforced, which is the thing worth showing on the overview.
    api.get(`/admin/exams/${examId}/proctor-policy`)
      .then((res) => setLivePolicy(res.data.policy))
      .catch(() => setLivePolicy(null));
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

  // Live integrity poll. 10s is chosen against the server's real budget:
  // one admin costs ~0.1 req/s here, and the endpoint answers in a fixed
  // three queries whatever the cohort size. Only runs while the Students tab
  // is actually on screen — a background tab polling for nothing is exactly
  // the sort of ambient load this design exists to avoid.
  useEffect(() => {
    if (tabIndex !== 1) return;

    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await api.get(`/admin/exams/${examId}/live`);
        if (!cancelled) setLiveData(res.data);
      } catch {
        /* transient — the next tick retries */
      }
    };

    poll();
    const id = setInterval(poll, LIVE_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [examId, tabIndex]);

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

  const handleToggleAnalysis = async () => {
    try {
      setBusy(true);
      const newStatus = exam.include_in_analysis === false;
      await api.put(`/admin/exams/${examId}`, { include_in_analysis: newStatus });
      setExam(prev => ({ ...prev, include_in_analysis: newStatus }));
      setMsg({
        type: newStatus ? "success" : "info",
        text: newStatus
          ? "This exam now COUNTS in overall analysis."
          : "This exam is now EXCLUDED from overall analysis. Results still show to students."
      });
    } catch (err) {
      setMsg({ type: "error", text: "Failed to update analysis setting" });
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
        include_in_analysis: exam.include_in_analysis !== false,
        school_id: exam.school_id || "",
        proctor_profile_id: exam.proctor_profile_id ?? null,
        proctor_overrides: exam.proctor_overrides || {},
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
        results_released: !!editFields.results_released,
        include_in_analysis: !!editFields.include_in_analysis,
        proctor_profile_id: editFields.proctor_profile_id ?? null,
        proctor_overrides: editFields.proctor_overrides || {},
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

  const liveByUser = {};
  (liveData?.students || []).forEach((s) => { liveByUser[s.user_id] = s; });

  // Previously a student only ever appeared flagged AFTER an auto-submit had
  // already happened, which is too late to act on. Recorded violations now
  // surface while the exam is still running.
  const isFlagged = (s) =>
    (liveByUser[s.user_id]?.hard_violations || 0) > 0 ||
    s.submission_reason === 'tab_switch' ||
    s.status === 'Discontinued';

  // /live knows about Overdue — started, past their window, never submitted —
  // and the attempts list does not. Those students used to render as an
  // ordinary blue "Started", which is exactly the case an invigilator needs
  // to act on.
  const statusOf = (s) => liveByUser[s.user_id]?.status || s.status;

  const STATUS_KEY = {
    Completed: 'completed',
    'In Progress': 'in_progress',
    Started: 'in_progress',
    Overdue: 'expired',
    Discontinued: 'error',
    'Not Started': 'default',
  };

  const summary = liveData?.summary;
  const totalMarks = exam?.total_marks || 0;

  const openTimeline = async (student) => {
    setSelectedStudent(student);
    setTimeline(null);
    setTimelineLoading(true);
    try {
      const res = await api.get(`/admin/exams/${examId}/attempts/${student.user_id}/events`);
      setTimeline(res.data);
    } catch (err) {
      // A student who never started has no attempt and therefore no timeline.
      setTimeline({ events: [], error: err.response?.data?.message || 'No activity recorded.' });
    } finally {
      setTimelineLoading(false);
    }
  };

  const fmtTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
    return isNaN(d) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fmtAgo = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
    if (isNaN(d)) return '—';
    const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  };

  const fmtDuration = (ms) => {
    if (!ms && ms !== 0) return null;
    const secs = Math.round(ms / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  /** The per-type breakdown behind a violation count, in severity order. */
  const breakdownOf = (s) => {
    const counts = liveByUser[s.user_id]?.event_counts || {};
    return Object.entries(counts)
      .sort((a, b) => (HARD_EVENTS.has(b[0]) ? 1 : 0) - (HARD_EVENTS.has(a[0]) ? 1 : 0))
      .map(([type, n]) => ({ type, n, hard: HARD_EVENTS.has(type) }));
  };

  const SEVERITY_DOT = ['#6b7db3', '#93c5fd', '#fcd34d', '#fda4af'];

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
                <Stack spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0 }}>
                  <Chip
                    label={exam.results_released ? "Released" : "Draft/Hidden"}
                    color={exam.results_released ? "success" : "warning"}
                    variant={exam.results_released ? "filled" : "outlined"}
                  />
                  {exam.include_in_analysis === false && (
                    <Tooltip title="Scores from this exam are excluded from student and school analytics" arrow>
                      <Chip label="Not in analysis" color="warning" size="small" variant="outlined" />
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
              <Divider sx={{ my: 3 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption">Duration</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{exam.duration_minutes} min</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption">Total Marks</Typography>
                  <Tooltip title="Auto-calculated from the sum of all question marks" arrow>
                    <Typography variant="subtitle1" fontWeight={600}>{exam.total_marks} <Chip label="Auto" size="small" sx={{ ml: 0.5, fontSize: '0.65rem', height: 18 }} /></Typography>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption">Assigned</Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{exam.assigned_users?.length || 0}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Monitoring</Typography>
                  {/* What is actually enforced, without opening a dialog — the
                      question an invigilator asks first on exam day. */}
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    <Chip
                      size="small"
                      label={exam.proctor_profile_label || 'Platform defaults'}
                      color={exam.proctor_profile_label ? 'primary' : 'default'}
                      variant={exam.proctor_profile_label ? 'filled' : 'outlined'}
                    />
                    {livePolicy?.requireFullscreen && (
                      <Chip size="small" variant="outlined" label="Fullscreen" />
                    )}
                    {livePolicy?.detectTabSwitch && (
                      <Chip size="small" variant="outlined" label="Tab detection" />
                    )}
                    {livePolicy?.cameraRequired && (
                      <Chip size="small" variant="outlined" color="info" label="Camera" />
                    )}
                    {livePolicy?.facePresence && (
                      <Chip size="small" variant="outlined" color="info" label="Face presence" />
                    )}
                    {livePolicy?.autoSubmitOnMaxViolations === false && (
                      <Tooltip title="Violations are recorded for review but will never end a student's exam automatically." arrow>
                        <Chip size="small" variant="outlined" color="warning" label="No auto-submit" />
                      </Tooltip>
                    )}
                    {Object.keys(exam.proctor_overrides || {}).length > 0 && (
                      <Chip size="small" color="secondary" variant="outlined"
                        label={`${Object.keys(exam.proctor_overrides).length} customised`} />
                    )}
                  </Stack>
                  {/* The numbers behind the switches. "Auto-submit is on" is
                      only half an answer — after how many, and with how much
                      grace, is what decides whether a policy is reasonable. */}
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {livePolicy?.autoSubmitOnMaxViolations !== false && (
                      <Typography variant="caption" color="text.secondary">
                        Auto-submits after <strong>{livePolicy?.maxViolations ?? 3}</strong> violations
                      </Typography>
                    )}
                    {livePolicy?.detectWindowBlur && (
                      <Typography variant="caption" color="text.secondary">
                        <strong>{((livePolicy?.blurGraceMs ?? 1200) / 1000).toFixed(1)}s</strong> focus grace
                      </Typography>
                    )}
                    {livePolicy?.requireFullscreen && livePolicy?.fullscreenSoftFail && (
                      <Typography variant="caption" color="text.secondary">
                        Degrades where fullscreen is unsupported
                      </Typography>
                    )}
                  </Stack>
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
                {/* openEditDialog re-seeds the form from the exam as currently
                    loaded. The button previously opened the dialog without it,
                    relying on the seed done at page load — which left the form
                    stale after any change made elsewhere on the page. */}
                <Button variant="outlined" startIcon={<EditIcon />} onClick={openEditDialog} fullWidth>Edit Details</Button>
                <Divider />
                <Box sx={{ px: 1.5, py: 1, borderRadius: 2, border: '1px solid rgba(255,255,255,0.10)' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={exam.include_in_analysis !== false}
                        onChange={handleToggleAnalysis}
                        disabled={busy}
                        color="primary"
                      />
                    }
                    label="Count in overall analysis"
                    sx={{ mr: 0 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block">
                    {exam.include_in_analysis !== false
                      ? "Scores affect student & school analytics."
                      : "Excluded from analytics — results still visible to students."}
                  </Typography>
                </Box>
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

          {/* The server already computes all of this — assigned, started,
              in progress, completed, overdue, flagged — and it was being
              thrown away in favour of a weaker three-way count derived on the
              client, which had no idea what "overdue" was. */}
          {summary && (
            <Box sx={{
              display: 'grid', gap: 1.5, mb: 3,
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            }}>
              <StatCard icon={<GroupsIcon />} value={summary.assigned} label="Assigned" />
              <StatCard icon={<InProgressIcon />} value={summary.in_progress} label="In progress" color="primary" />
              <StatCard icon={<CompletedIcon />} value={summary.completed} label="Completed" color="success" />
              <StatCard icon={<OverdueIcon />} value={summary.overdue} label="Overdue" color="warning" />
              <StatCard icon={<FlagIcon />} value={summary.flagged} label="Flagged" color="warning" />
              <StatCard icon={<UnproctoredIcon />} value={summary.unproctored ?? 0} label="No camera" />
            </Box>
          )}

          {liveData?.server_time && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Live figures refreshed {fmtAgo(liveData.server_time)} · updates every 10s
            </Typography>
          )}

          {/* Was a grid of 110px squares showing a bare score and a truncated
              name — two facts per student, with everything else a click away.
              The /live payload already carried the violation breakdown, the
              last-activity time and the overdue state; none of it was shown. */}
          <style>{`
            @keyframes flagPulse {
              0%, 100% { box-shadow: 0 0 0 rgba(251,113,133,0); }
              50% { box-shadow: 0 0 12px rgba(251,113,133,0.45); }
            }
          `}</style>

          <DataTableShell
            loading={loadingStudents}
            emptyTitle="No students found"
            emptyMessage={studentSearch ? 'Nothing matches that search.' : 'Nobody is assigned to this exam yet.'}
            rows={filteredStudents}
            columns={[
              { key: 'student', label: 'Student' },
              { key: 'status', label: 'Status' },
              { key: 'score', label: 'Score', width: 160 },
              { key: 'started', label: 'Started', width: 110 },
              { key: 'integrity', label: 'Integrity' },
              { key: 'seen', label: 'Last activity', width: 120 },
              { key: 'actions', label: '', align: 'right', width: 120 },
            ]}
            renderRow={(s) => {
              const live = liveByUser[s.user_id] || {};
              const flagged = isFlagged(s);
              return (
                <TableRow
                  key={s.user_id}
                  hover
                  sx={flagged ? { animation: 'flagPulse 1.6s ease-in-out infinite' } : undefined}
                >
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#cfe0ff' }}>
                      {s.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.student_id || '—'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                      <StatusChip status={STATUS_KEY[statusOf(s)] || 'default'} label={statusOf(s)} />
                      {live.proctored === false && (
                        <Tooltip title={`Taken without a camera (${live.unproctored_reason || 'unknown'})`}>
                          <span><StatusChip status="warning" label="No camera" /></span>
                        </Tooltip>
                      )}
                      {s.submission_reason === 'tab_switch' && (
                        <StatusChip status="error" label="Auto-submitted" />
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell>
                    {s.score === null || s.score === undefined ? (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    ) : (
                      <>
                        <Typography variant="body2" fontWeight={700}>
                          {s.score}{totalMarks ? ` / ${totalMarks}` : ''}
                          {totalMarks ? (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                              {Math.round((s.score / totalMarks) * 100)}%
                            </Typography>
                          ) : null}
                        </Typography>
                        {totalMarks > 0 && (
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (s.score / totalMarks) * 100)}
                            sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          />
                        )}
                      </>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{fmtTime(s.start_time)}</Typography>
                  </TableCell>

                  <TableCell>
                    {/* The "why", inline. A count on its own tells a teacher
                        that something happened but not what, and the answer
                        was already on the wire. */}
                    {breakdownOf(s).length === 0 ? (
                      <Typography variant="caption" color="text.secondary">Clean</Typography>
                    ) : (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {breakdownOf(s).map(({ type, n, hard }) => (
                          <Chip
                            key={type}
                            size="small"
                            label={`${labelOf(type)} ×${n}`}
                            sx={{
                              height: 22,
                              fontSize: '0.68rem',
                              color: hard ? '#fda4af' : '#fcd34d',
                              bgcolor: hard ? 'rgba(251,113,133,0.12)' : 'rgba(251,191,36,0.10)',
                              border: '1px solid',
                              borderColor: hard ? 'rgba(251,113,133,0.28)' : 'rgba(251,191,36,0.24)',
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {fmtAgo(live.last_event_at)}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<TimelineIcon />}
                      onClick={() => openTimeline(s)}
                      sx={{ textTransform: 'none' }}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }}
            renderMobileCard={(s) => {
              const live = liveByUser[s.user_id] || {};
              return (
                <Card key={s.user_id} sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#cfe0ff' }} noWrap>
                          {s.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.student_id || '—'} · started {fmtTime(s.start_time)}
                        </Typography>
                      </Box>
                      <StatusChip status={STATUS_KEY[statusOf(s)] || 'default'} label={statusOf(s)} />
                    </Stack>

                    {s.score !== null && s.score !== undefined && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {s.score}{totalMarks ? ` / ${totalMarks}` : ''}
                        </Typography>
                        {totalMarks > 0 && (
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (s.score / totalMarks) * 100)}
                            sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          />
                        )}
                      </Box>
                    )}

                    {breakdownOf(s).length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                        {breakdownOf(s).map(({ type, n, hard }) => (
                          <Chip
                            key={type}
                            size="small"
                            label={`${labelOf(type)} ×${n}`}
                            sx={{
                              height: 22, fontSize: '0.68rem',
                              color: hard ? '#fda4af' : '#fcd34d',
                              bgcolor: hard ? 'rgba(251,113,133,0.12)' : 'rgba(251,191,36,0.10)',
                            }}
                          />
                        ))}
                      </Stack>
                    )}

                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {live.last_event_at ? `Active ${fmtAgo(live.last_event_at)}` : ''}
                      </Typography>
                      <Button size="small" variant="outlined" startIcon={<TimelineIcon />}
                        onClick={() => openTimeline(s)} sx={{ textTransform: 'none' }}>
                        Details
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            }}
          />
        </Paper>
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
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <MenuItem key={n} value={String(n)}>{n}</MenuItem>
                  ))}
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
            <Grid item xs={6}><TextField label="Total Marks" type="number" value={exam?.total_marks || 0} fullWidth disabled helperText="Auto-calculated from questions" /></Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!editFields.include_in_analysis}
                    onChange={(e) => setField('include_in_analysis', e.target.checked)}
                    color="primary"
                  />
                }
                label="Count this exam in overall analysis"
              />
            </Grid>

            {/* Monitoring policy. Same component the create dialog uses, so the
                two can never drift apart. Without this, an exam created before
                proctoring existed could never be given a profile at all. */}
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <ProctoringSettings
                profileId={editFields.proctor_profile_id}
                overrides={editFields.proctor_overrides}
                onProfileChange={(v) => setField('proctor_profile_id', v)}
                onOverridesChange={(v) => setField('proctor_overrides', v)}
                disabled={editBusy}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave} variant="contained" disabled={editBusy}>Save</Button></DialogActions>
      </Dialog>

      {/* 3. STUDENT TIMELINE DRAWER
          Replaces a dialog that restated six fields already visible in the
          row. What was missing — and what a reviewer actually needs to decide
          whether a flag is real — is the sequence: what happened, when, and
          for how long. */}
      <Drawer
        anchor="right"
        open={!!selectedStudent}
        onClose={() => { setSelectedStudent(null); setTimeline(null); }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: 0 } }}
      >
        {selectedStudent && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start"
              sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#cfe0ff' }} noWrap>
                  {selectedStudent.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedStudent.student_id || '—'}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => { setSelectedStudent(null); setTimeline(null); }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <StatusChip status={STATUS_KEY[statusOf(selectedStudent)] || 'default'} label={statusOf(selectedStudent)} />
                {timeline?.attempt?.proctored === false && (
                  <StatusChip status="warning" label={`No camera — ${timeline.attempt.unproctored_reason || 'unknown'}`} />
                )}
                {selectedStudent.submission_reason && selectedStudent.submission_reason !== 'manual' && (
                  <StatusChip status="info" label={`Ended: ${selectedStudent.submission_reason}`} />
                )}
              </Stack>

              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Score</Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {selectedStudent.score !== null && selectedStudent.score !== undefined
                      ? `${selectedStudent.score}${totalMarks ? ` / ${totalMarks}` : ''}`
                      : '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Started</Typography>
                  <Typography variant="body1">
                    {selectedStudent.start_time ? new Date(selectedStudent.start_time).toLocaleString() : '—'}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
              <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
                Activity
              </Typography>

              {timelineLoading && (
                <Box display="flex" justifyContent="center" py={4}><CircularProgress size={24} /></Box>
              )}

              {!timelineLoading && timeline?.events?.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {timeline.error || 'Nothing recorded for this attempt.'}
                </Typography>
              )}

              {!timelineLoading && timeline?.events?.length > 0 && (
                <Stack spacing={0} sx={{ mt: 1.5 }}>
                  {timeline.events.map((e) => (
                    <Stack key={e.seq} direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1 }}>
                      <Typography variant="caption" color="text.secondary"
                        sx={{ minWidth: 52, pt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtTime(e.received_at)}
                      </Typography>
                      <Box sx={{
                        width: 9, height: 9, borderRadius: '50%', mt: 0.7, flexShrink: 0,
                        bgcolor: SEVERITY_DOT[e.severity] || SEVERITY_DOT[0],
                        opacity: e.suppressed ? 0.35 : 1,
                      }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ opacity: e.suppressed ? 0.55 : 1 }}>
                          {labelOf(e.type)}
                          {e.duration_ms != null && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                              {fmtDuration(e.duration_ms)}
                            </Typography>
                          )}
                        </Typography>
                        {e.meta?.reason && (
                          <Typography variant="caption" color="text.secondary">
                            {String(e.meta.reason).replace(/_/g, ' ')}
                          </Typography>
                        )}
                        {/* Shown, dimmed, and explained. Hiding these would
                            leave a gap in the sequence that looks like data
                            loss; presenting them as violations would be a lie. */}
                        {e.suppressed && (
                          <Typography variant="caption" sx={{ display: 'block', color: '#6b7db3' }}>
                            not counted — {String(e.suppressReason || e.meta?.suppressReason || 'setup').replace(/_/g, ' ')}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {['Completed', 'Started', 'In Progress', 'Overdue', 'Discontinued'].includes(statusOf(selectedStudent)) && (
                <Button fullWidth color="error" variant="outlined" startIcon={<RestartIcon />} onClick={() => {
                  const s = selectedStudent;
                  setSelectedStudent(null);
                  setTimeline(null);
                  setResetDialog({ open: true, studentId: s.user_id, studentUsername: s.username });
                  setConfirmText("");
                }}>
                  Reset Attempt
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

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
