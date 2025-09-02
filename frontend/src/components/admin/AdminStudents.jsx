import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Dialog, DialogActions, DialogContent,
  DialogTitle, Paper, Alert, Grid
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";

export default function AdminStudents() {
  const { authToken } = useAuth();
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [current, setCurrent] = useState({
    id: null,
    password: "",
    email: "",
    mobile_number: "",
    school_id: "", // <-- use school_id
    name: "",
    class_number: "",
    number: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchStudents();
    fetchSchools();
  }, [authToken]);

  const fetchStudents = async () => {
    try {
      const res = await api.get("/admin/students", {
        headers: { auth_token: authToken },
      });
      setStudents(res.data.students || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch students");
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await api.get("/admin/schools", {
        headers: { auth_token: authToken },
      });
      setSchools(res.data.schools || []);
    } catch (err) {
      console.error("Failed to fetch schools");
    }
  };

  const handleOpen = (student = {}) => {
    setCurrent({
      id: student.id || null,
      password: "",
      email: student.email || "",
      mobile_number: student.mobile_number || "",
      school_id: student.school_id || "", // <-- use school_id
      name: student.name || "",
      class_number: student.class_number || "",
      number: student.number || ""
    });
    setIsEdit(!!student.id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrent({
      id: null,
      password: "",
      email: "",
      mobile_number: "",
      school_id: "",
      name: "",
      class_number: "",
      number: ""
    });
  };

  const handleSave = async () => {
    try {
      // Required fields
      if (!current.name || !current.school_id || !current.number) {
        setError(" Name, School, and Roll Number are required");
        return;
      }

      // Map frontend fields to backend
      const data = {
        password: current.password || "",
        email: current.email || null,
        mobile_number: current.mobile_number || null,
        role: "student",
        name: current.name,
        school_id: current.school_id, // <-- use school_id
        class_number: current.class_number || null,
        number: current.number       // numeric roll number
      };

      if (isEdit) {
        await api.put(`/admin/students/${current.id}`, data, {
          headers: { auth_token: authToken },
        });
      } else {
        await api.post("/admin/students", data, {
          headers: { auth_token: authToken },
        });
      }

      fetchStudents();
      handleClose();
      setSuccess(isEdit ? "Student updated" : "Student added");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Failed to save student"
      );
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student?")) return;
    try {
      await api.delete(`/admin/students/${id}`, {
        headers: { auth_token: authToken },
      });
      fetchStudents();
      setSuccess("Student deleted");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete student");
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError("Please select a CSV file");
      return;
    }
    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await api.post("/admin/students/import", formData, {
        headers: { auth_token: authToken, "Content-Type": "multipart/form-data" },
      });
      setSuccess(res.data.message || "Students uploaded successfully");
      fetchStudents();
      setCsvFile(null);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || "CSV upload failed");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/admin/export_student_attempts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to export student attempts');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_attempts.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Exported student attempts successfully');
    } catch (error) {
      setError(error.message || 'Export failed');
    }
  };

  const filtered = students.filter((s) =>
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Manage Students</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box display="flex" justifyContent="space-between" mb={2}>
        <TextField
          label="Search Students"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: "300px" }}
        />
        <Box>
          <Button variant="outlined" component="label" sx={{ mr: 2 }}>
            <UploadFileIcon /> Upload CSV
            <input type="file" accept=".csv" hidden onChange={(e) => setCsvFile(e.target.files[0])} />
          </Button>
          <Button variant="contained" onClick={handleCsvUpload} disabled={!csvFile}>
            Submit CSV
          </Button>
          <Button variant="contained" sx={{ ml: 2 }} onClick={() => handleOpen()}>
            <AddIcon /> Add Student
          </Button>
          <Button variant="outlined" sx={{ ml: 2 }} onClick={handleExport}>
            Export Attempts to Excel
          </Button>
        </Box>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Roll</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell>{s.username || "N/A"}</TableCell> {/* Show username if present */}
                <TableCell>{s.name || "N/A"}</TableCell>
                <TableCell>{s.mobile_number || "N/A"}</TableCell>
                <TableCell>{s.school_name || "N/A"}</TableCell>
                <TableCell>{s.class_number || "N/A"}</TableCell>
                <TableCell>{s.number || "N/A"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(s)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(s.id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? "Edit Student" : "Add Student"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>

            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Name"
                required
                fullWidth
                margin="normal"
                value={current.name}
                onChange={(e) => setCurrent({ ...current, name: e.target.value })}
              />
            </Grid>
            {!isEdit && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Password"
                  required
                  type="password"
                  fullWidth
                  margin="normal"
                  value={current.password}
                  onChange={(e) => setCurrent({ ...current, password: e.target.value })}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                label="Mobile Number"
                fullWidth
                margin="normal"
                value={current.mobile_number}
                onChange={(e) => setCurrent({ ...current, mobile_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="School"
                required
                SelectProps={{ native: true }}
                fullWidth
                margin="normal"
                value={current.school_id}
                onChange={(e) => setCurrent({ ...current, school_id: e.target.value })} // <-- use id
              >
                <option value="">Select School</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField
                label="Class"
                fullWidth
                margin="normal"
                value={current.class_number}
                onChange={(e) => setCurrent({ ...current, class_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField
                label="Roll Number"
                required
                fullWidth
                margin="normal"
                value={current.number}
                onChange={(e) => setCurrent({ ...current, number: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}