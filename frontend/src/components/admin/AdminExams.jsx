import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Alert,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  ListItemText,
  Chip,
  FormControlLabel,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function AdminExams() {
  const { authToken } = useAuth();
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentExam, setCurrentExam] = useState({
    id: null,
    title: '',
    description: '',
    access_start: '',
    access_end: '',
    duration_minutes: '',
    total_marks: '',
    school_id: ''
  });
  const [isEdit, setIsEdit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schools, setSchools] = useState([]);
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '',
    marks: 1,
    image_path: ''
  });
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [openAssignmentDialog, setOpenAssignmentDialog] = useState(false);
  const [assignmentFilters, setAssignmentFilters] = useState({
    assign_all: false,
    school_id: '',
    class: '',
    roll_number: '',
    student_ids: ''
  });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetchExams();
    fetchSchools();
  }, [authToken]);

  const fetchExams = async () => {
    try {
      const res = await api.get('/admin/exams');
      setExams(res.data.exams || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch exams');
      console.error('Error fetching exams:', err);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await api.get('/admin/schools');
      setSchools(res.data.schools || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const handleOpenDialog = (exam = { id: null, title: '', description: '', access_start: '', access_end: '', duration_minutes: '', total_marks: '', school_id: '' }) => {
    setCurrentExam({
      id: exam.id,
      title: exam.title || '',
      description: exam.description || '',
      access_start: exam.access_start || '',
      access_end: exam.access_end || '',
      duration_minutes: exam.duration_minutes || '',
      total_marks: exam.total_marks || '',
      school_id: exam.school_id || ''
    });
    setIsEdit(!!exam.id);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentExam({
      id: null,
      title: '',
      description: '',
      access_start: '',
      access_end: '',
      duration_minutes: '',
      total_marks: '',
      school_id: ''
    });
  };

  const handleChange = (e) => {
    setCurrentExam({ ...currentExam, [e.target.name]: e.target.value });
  };

  const handleSaveExam = async () => {
    try {
      const url = currentExam.id ? `/admin/exams/${currentExam.id}` : '/admin/exams';
      const method = currentExam.id ? 'put' : 'post';

      const data = {
        title: currentExam.title,
        description: currentExam.description,
        access_start: currentExam.access_start || null,
        access_end: currentExam.access_end || null,
        duration_minutes: parseInt(currentExam.duration_minutes) || 60,
        total_marks: parseInt(currentExam.total_marks) || 0,
        school_id: parseInt(currentExam.school_id) || null
      };

      await api[method](url, data);

      fetchExams();
      handleCloseDialog();
      setError('');
      setSuccess('Exam saved successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save exam');
      console.error('Error saving exam:', err);
    }
  };

  const handleDeleteExam = async (id) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        await api.delete(`/admin/exams/${id}`);
        fetchExams();
        setError('');
        setSuccess('Exam deleted successfully');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete exam');
        console.error('Error deleting exam:', err);
      }
    }
  };

  const handleToggleResults = async (id, currentResults) => {
    try {
      await api.put(`/admin/exams/${id}`, { results_released: !currentResults });
      fetchExams();
      setError('');
      setSuccess('Results release toggled successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle results release');
      console.error('Error toggling results release:', err);
    }
  };

  const handleOpenQuestionDialog = (examId) => {
    setSelectedExamId(examId);
    setOpenQuestionDialog(true);
  };

  const handleCloseQuestionDialog = () => {
    setOpenQuestionDialog(false);
    setCurrentQuestion({
      text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      marks: 1,
      image_path: ''
    });
  };

  const handleQuestionChange = (e) => {
    setCurrentQuestion({ ...currentQuestion, [e.target.name]: e.target.value });
  };

  const handleSaveQuestion = async () => {
    try {
      await api.post(`/admin/exams/${selectedExamId}/questions`, currentQuestion);
      handleCloseQuestionDialog();
      setError('');
      setSuccess('Question added successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add question');
      console.error('Error adding question:', err);
    }
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await api.post(`/admin/exams/${selectedExamId}/questions`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        handleCloseQuestionDialog();
        setError('');
        setSuccess('CSV uploaded successfully');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to upload CSV');
        console.error('Error uploading CSV:', err);
      }
    }
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleUploadImage = async () => {
    if (!imageFile) return;
    const formData = new FormData();
    formData.append('file', imageFile);
    try {
      const res = await api.post('/admin/upload_image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCurrentQuestion({ ...currentQuestion, image_path: res.data.path });
      setImageFile(null);
      setError('');
      setSuccess('Image uploaded successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
      console.error('Error uploading image:', err);
    }
  };

  const handleOpenAssignmentDialog = (examId) => {
    setSelectedExamId(examId);
    setOpenAssignmentDialog(true);
  };

  const handleCloseAssignmentDialog = () => {
    setOpenAssignmentDialog(false);
    setAssignmentFilters({
      assign_all: false,
      school_id: '',
      class: '',
      roll_number: '',
      student_ids: ''
    });
  };

  const handleAssignmentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAssignmentFilters({
      ...assignmentFilters,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveAssignment = async () => {
    try {
      const data = { ...assignmentFilters };
      if (data.assign_all) {
        data.assign_all = true;
      } else if (data.student_ids.length > 0) {
        data.student_ids = data.student_ids.split(',').map(id => id.trim());
      }
      await api.post(`/admin/exams/${selectedExamId}/assign`, data);
      handleCloseAssignmentDialog();
      setError('');
      setSuccess('Students assigned successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign students');
      console.error('Error assigning students:', err);
    }
  };

  // Export exam results handler
  const handleExportExamResults = async (examId) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/admin/export_student_attempts?exam_id=${examId}`, {
        method: 'GET',
        headers: {
          'Authorization': `auth_token ${authToken}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to export exam results');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${examId}_attempts.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Exported exam results successfully');
    } catch (error) {
      setError(error.message || 'Export failed');
    }
  };

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Manage Exams</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {exams.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>No exams found. Add a new exam to get started.</Alert>
      )}
      <Box display="flex" justifyContent="space-between" mb={2}>
        <TextField
          label="Search Exams"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: '300px' }}
        />
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          <AddIcon /> Add Exam
        </Button>
      </Box>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Access Start</TableCell>
              <TableCell>Access End</TableCell>
              <TableCell>Duration (min)</TableCell>
              <TableCell>Total Marks</TableCell>
              <TableCell>School</TableCell>
              <TableCell>Results Released</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredExams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell>{exam.id}</TableCell>
                <TableCell>{exam.title}</TableCell>
                <TableCell>{exam.description || 'N/A'}</TableCell>
                <TableCell>{exam.access_start || 'N/A'}</TableCell>
                <TableCell>{exam.access_end || 'N/A'}</TableCell>
                <TableCell>{exam.duration_minutes || 'N/A'}</TableCell>
                <TableCell>{exam.total_marks || 'N/A'}</TableCell>
                <TableCell>{exam.school_name || 'N/A'}</TableCell>
                <TableCell>
                  <Switch
                    checked={exam.results_released}
                    onChange={() => handleToggleResults(exam.id, exam.results_released)}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(exam)} title="Edit Exam">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteExam(exam.id)} title="Delete Exam">
                    <DeleteIcon />
                  </IconButton>
                  <IconButton onClick={() => handleOpenQuestionDialog(exam.id)} title="Manage Questions">
                    <AddIcon />
                  </IconButton>
                <IconButton onClick={() => handleOpenAssignmentDialog(exam.id)} title="Assign Students">
                  <UploadIcon />
                </IconButton>
                <IconButton onClick={() => handleExportExamResults(exam.id)} title="Export Exam Results">
                  <DownloadIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEdit ? 'Edit Exam' : 'Add Exam'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            name="title"
            fullWidth
            margin="normal"
            value={currentExam.title}
            onChange={handleChange}
            required
          />
          <TextField
            label="Description"
            name="description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={currentExam.description}
            onChange={handleChange}
          />
          <DateTimePicker
            label="Access Start (Your Local Time)"
            value={currentExam.access_start ? new Date(currentExam.access_start) : null}
            onChange={(newValue) => {
              setCurrentExam({ ...currentExam, access_start: newValue ? newValue.toISOString() : '' });
            }}
            minDateTime={new Date()}
            sx={{ width: '100%', mt: 2 }}
          />
          <DateTimePicker
            label="Access End (Your Local Time)"
            value={currentExam.access_end ? new Date(currentExam.access_end) : null}
            onChange={(newValue) => {
              setCurrentExam({ ...currentExam, access_end: newValue ? newValue.toISOString() : '' });
            }}
            minDateTime={new Date()}
            sx={{ width: '100%', mt: 2 }}
          />
          <TextField
            label="Duration (minutes)"
            name="duration_minutes"
            fullWidth
            margin="normal"
            type="number"
            value={currentExam.duration_minutes}
            onChange={handleChange}
            required
          />
          <TextField
            label="Total Marks"
            name="total_marks"
            fullWidth
            margin="normal"
            type="number"
            value={currentExam.total_marks}
            onChange={handleChange}
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>School</InputLabel>
            <Select
              name="school_id"
              value={currentExam.school_id}
              onChange={handleChange}
              label="School"
            >
              {schools.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name} ({school.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveExam}
            variant="contained"
            disabled={!currentExam.title || !currentExam.duration_minutes || !currentExam.total_marks}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openQuestionDialog} onClose={handleCloseQuestionDialog} maxWidth="md" fullWidth>
        <DialogTitle>Add Question</DialogTitle>
        <DialogContent>
          <TextField
            label="Question Text"
            name="text"
            fullWidth
            margin="normal"
            value={currentQuestion.text}
            onChange={handleQuestionChange}
            required
          />
          <TextField
            label="Option A"
            name="option_a"
            fullWidth
            margin="normal"
            value={currentQuestion.option_a}
            onChange={handleQuestionChange}
          />
          <TextField
            label="Option B"
            name="option_b"
            fullWidth
            margin="normal"
            value={currentQuestion.option_b}
            onChange={handleQuestionChange}
          />
          <TextField
            label="Option C"
            name="option_c"
            fullWidth
            margin="normal"
            value={currentQuestion.option_c}
            onChange={handleQuestionChange}
          />
          <TextField
            label="Option D"
            name="option_d"
            fullWidth
            margin="normal"
            value={currentQuestion.option_d}
            onChange={handleQuestionChange}
          />
          <TextField
            label="Correct Answer"
            name="correct_answer"
            fullWidth
            margin="normal"
            value={currentQuestion.correct_answer}
            onChange={handleQuestionChange}
          />
          <TextField
            label="Marks"
            name="marks"
            fullWidth
            margin="normal"
            type="number"
            value={currentQuestion.marks}
            onChange={handleQuestionChange}
          />
          <TextField
            label="Image Path"
            name="image_path"
            fullWidth
            margin="normal"
            value={currentQuestion.image_path}
            onChange={handleQuestionChange}
          />
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" component="label">
              Select Image
              <input type="file" hidden onChange={handleImageChange} accept="image/*" />
            </Button>
            <Button variant="contained" onClick={handleUploadImage} disabled={!imageFile}>
              Upload Image
            </Button>
            <Button variant="contained" component="label">
              Upload CSV
              <input type="file" hidden onChange={handleUploadCSV} accept=".csv" />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuestionDialog}>Cancel</Button>
          <Button
            onClick={handleSaveQuestion}
            variant="contained"
            disabled={!currentQuestion.text}
          >
            Add Question
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAssignmentDialog} onClose={handleCloseAssignmentDialog} maxWidth="md" fullWidth>
        <DialogTitle>Assign Students</DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Checkbox
                checked={assignmentFilters.assign_all}
                onChange={handleAssignmentChange}
                name="assign_all"
              />
            }
            label="Assign to all schools"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>School</InputLabel>
            <Select
              name="school_id"
              value={assignmentFilters.school_id}
              onChange={handleAssignmentChange}
              label="School"
              disabled={assignmentFilters.assign_all}
            >
              {schools.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name} ({school.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Class"
            name="class"
            fullWidth
            margin="normal"
            value={assignmentFilters.class}
            onChange={handleAssignmentChange}
          />
          <TextField
            label="Roll Number"
            name="roll_number"
            fullWidth
            margin="normal"
            value={assignmentFilters.roll_number}
            onChange={handleAssignmentChange}
          />
          <TextField
            label="Student IDs (comma separated)"
            name="student_ids"
            fullWidth
            margin="normal"
            value={assignmentFilters.student_ids}
            onChange={handleAssignmentChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignmentDialog}>Cancel</Button>
          <Button onClick={handleSaveAssignment} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
