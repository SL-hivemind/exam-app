import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Alert, Grid, MenuItem, Select, FormControl, InputLabel,
  Stack, InputAdornment, Chip, CircularProgress, TablePagination
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClassIcon from "@mui/icons-material/Class";
import VisibilityIcon from "@mui/icons-material/Visibility";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";

export default function AdminStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- FILTERS & PAGINATION ---
  const [search, setSearch] = useState("");
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // --- DIALOG STATE ---
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [current, setCurrent] = useState({
    id: null, password: "", email: "", mobile_number: "",
    school_id: "", name: "", class_number: "", number: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attemptsOpen, setAttemptsOpen] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsData, setAttemptsData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedClass, setDebouncedClass] = useState("");

  const isSuperAdmin = user?.role === 'admin';

  // Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedClass(classFilter);
      setPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [search, classFilter]);

  // --- FETCH DATA ---
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append('page', page + 1);
      params.append('per_page', rowsPerPage);

      if (debouncedSearch) params.append('search', debouncedSearch);

      // If Super Admin, use the dropdown value. 
      // If School Admin, backend handles it automatically.
      if (isSuperAdmin && selectedSchoolFilter) {
        params.append('school_id', selectedSchoolFilter);
      }

      if (debouncedClass) params.append('class_number', debouncedClass);

      const res = await api.get(`/admin/students?${params.toString()}`);

      setStudents(res.data.students || []);
      setTotalItems(res.data.total_items || 0);

    } catch (err) {
      console.error(err);
      setError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, selectedSchoolFilter, debouncedClass, isSuperAdmin]);

  const fetchSchools = async () => {
    try {
      const res = await api.get("/admin/schools");
      setSchools(res.data.schools || []);
    } catch (err) {
      console.error("Failed to fetch schools");
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSchools();
    }
  }, [isSuperAdmin]);

  // --- SORTING LOGIC ---
  const sortedStudents = [...students].sort((a, b) => {
    const idA = a.student_id || "";
    const idB = b.student_id || "";
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // --- HANDLERS ---
  const handleOpen = (student = {}) => {
    setCurrent({
      id: student.id || null,
      password: "",
      email: student.email || "",
      mobile_number: student.mobile_number || "",
      // FIX: If School Admin, Auto-fill their school ID (backend will validate)
      school_id: student.school_id || (isSuperAdmin ? "" : user.school_id) || "",
      name: student.name || "",
      class_number: student.class_number || "",
      number: student.number || ""
    });
    setIsEdit(!!student.id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError("");
  };

  const handleSave = async () => {
    // FIX: If School Admin, use their ID if current.school_id is empty
    const finalSchoolId = isSuperAdmin ? current.school_id : (user.school_id || current.school_id);

    if (!current.name || !finalSchoolId) {
      setError("Name and School are required");
      return;
    }

    try {
      const data = {
        name: current.name,
        school_id: finalSchoolId,
        class_number: current.class_number || null,
        email: current.email || null,
        mobile_number: current.mobile_number || null,
        ...(current.password ? { password: current.password } : {}),
        ...(current.number ? { number: current.number } : {})
      };


      if (isEdit) {
        await api.put(`/admin/students/${current.id}`, data);
        setSuccess("Student updated successfully");
      } else {
        await api.post("/admin/students", data);
        setSuccess("Student created successfully");
      }
      fetchStudents();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await api.delete(`/admin/students/${id}`);
      fetchStudents();
      setSuccess("Student deleted");
    } catch (err) {
      setError("Failed to delete student");
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setLoading(true);
      const res = await api.post("/admin/students/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(res.data.message || "Import successful");
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAttempts = async (student) => {
    setSelectedStudent(student);
    setAttemptsOpen(true);
    setAttemptsLoading(true);
    setAttemptsData(null);
    try {
      const res = await api.get(`/admin/students/${student.id}/attempts`);
      setAttemptsData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch attempts");
    } finally {
      setAttemptsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>

      {/* HEADER */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Students</Typography>
          <Typography variant="body2" color="text.secondary">Manage student accounts and enrollments.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
            Import CSV
            <input type="file" accept=".csv" hidden onChange={handleCsvUpload} />
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Student
          </Button>
        </Stack>
      </Stack>

      {/* ALERTS */}
      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess("")} sx={{ mb: 3 }}>{success}</Alert>}

      {/* FILTERS */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <Grid container spacing={2} alignItems="center">

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search Name / Username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
              }}
            />
          </Grid>

          {/* Show School Filter ONLY to Super Admin */}
          {isSuperAdmin && (
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by School</InputLabel>
                <Select
                  value={selectedSchoolFilter}
                  label="Filter by School"
                  onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                  startAdornment={<InputAdornment position="start"><FilterListIcon fontSize="small" /></InputAdornment>}
                >
                  <MenuItem value=""><em>All Schools</em></MenuItem>
                  {schools.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Filter by Class"
              placeholder="e.g. 10"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><ClassIcon fontSize="small" color="action" /></InputAdornment>
              }}
            />
          </Grid>

        </Grid>
      </Paper>

      {/* TABLE */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell><strong>Student Info</strong></TableCell>
              <TableCell><strong>Contact</strong></TableCell>
              <TableCell><strong>School & Class</strong></TableCell>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress sx={{ my: 2 }} /></TableCell></TableRow>
            ) : sortedStudents.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No students found matching filters.</TableCell></TableRow>
            ) : (
              sortedStudents.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={600}>{s.name}</Typography>
                    <Chip label={s.student_id || "No ID"} size="small" sx={{ mt: 0.5, bgcolor: '#e3f2fd', fontWeight: 'bold', color: '#1565c0' }} />
                  </TableCell>
                  <TableCell>{s.mobile_number || "—"}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Chip label={s.school_name || "N/A"} size="small" variant="outlined" />
                      {s.class_number && <Chip label={`Class ${s.class_number}`} size="small" color="secondary" variant="outlined" />}
                    </Stack>
                  </TableCell>
                  <TableCell>{s.username}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleViewAttempts(s)} color="info" title="View Attempts">
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleOpen(s)} color="primary"><EditIcon /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(s.id)} color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      <Dialog
        open={attemptsOpen}
        onClose={() => setAttemptsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Student Attempts: {selectedStudent?.name || ""}
        </DialogTitle>
        <DialogContent dividers>
          {attemptsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !attemptsData ? (
            <Typography variant="body2" color="text.secondary">No data available.</Typography>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`Attempts: ${attemptsData.summary?.attempted_exams ?? 0}`} color="primary" />
                <Chip label={`Avg %: ${attemptsData.summary?.average_percentage ?? 0}`} variant="outlined" />
                <Chip label={`Best %: ${attemptsData.summary?.best_percentage ?? 0}`} variant="outlined" />
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Exam</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Percent</TableCell>
                    <TableCell>Percentile</TableCell>
                    <TableCell>Rank</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(attemptsData.attempts || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No attempts found.</TableCell>
                    </TableRow>
                  ) : (
                    (attemptsData.attempts || []).map((a) => (
                      <TableRow key={a.attempt_id}>
                        <TableCell>{a.exam_title}</TableCell>
                        <TableCell>{a.submitted_time ? new Date(a.submitted_time).toLocaleString() : "-"}</TableCell>
                        <TableCell>{`${a.score ?? 0} / ${a.total_marks ?? 0}`}</TableCell>
                        <TableCell>{a.percentage ?? 0}%</TableCell>
                        <TableCell>{a.percentile ?? 0}</TableCell>
                        <TableCell>{a.rank && a.participants ? `${a.rank}/${a.participants}` : "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttemptsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG FORM */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? "Edit Student" : "Register Student"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>

            <TextField
              label="Full Name"
              fullWidth
              value={current.name}
              onChange={(e) => setCurrent({ ...current, name: e.target.value })}
            />

            {!isEdit && (
              <TextField
                label="Password "
                type="password"
                fullWidth
                value={current.password}
                onChange={(e) =>
                  setCurrent({ ...current, password: e.target.value })
                }
                helperText="Leave blank to auto-generate a secure password"
              />
            )}


            {/* FIX: Only show School Dropdown if Super Admin. 
                If School Admin, we auto-assign their school ID in handleSave. 
            */}
            {isSuperAdmin && (
              <FormControl fullWidth>
                <InputLabel>School</InputLabel>
                <Select
                  native
                  label="School"
                  value={current.school_id}
                  onChange={(e) => setCurrent({ ...current, school_id: e.target.value })}
                >
                  <option value="">Select School</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </Select>
              </FormControl>
            )}

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={current.class_number || ""}
                    label="Class"
                    onChange={(e) => setCurrent({ ...current, class_number: e.target.value })}
                  >
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
            </Grid>

            <TextField
              label="Mobile Number (Optional)"
              fullWidth
              value={current.mobile_number}
              onChange={(e) => setCurrent({ ...current, mobile_number: e.target.value })}
            />

            <TextField
              label="Email (Optional)"
              fullWidth
              value={current.email}
              onChange={(e) => setCurrent({ ...current, email: e.target.value })}
            />

          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
