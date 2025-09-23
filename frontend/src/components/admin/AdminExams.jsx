import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, IconButton, Paper, Alert, Grid,
  List, ListItemButton, ListItemText, Divider, Stack, Dialog,
  DialogActions, DialogContent, DialogTitle, TextField, Table,
  TableBody, TableCell, TableHead, TableRow, Tabs, Tab, Checkbox,
  FormControlLabel, FormControl, InputLabel, Select, MenuItem, ListItemIcon, UploadIcon
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import api from '../../utils/api';

const initialExamState = { id: null, title: '', description: '', access_start: null, access_end: null, duration_minutes: 60, total_marks: 100 };
const initialQuestionState = { id: null, text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '', marks: 1, image_path: '' };
const initialAssignmentFilters = { assign_all: false, school_id: '', class: '', roll_number: '', student_ids: '' };

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [schools, setSchools] = useState([]);

  // Consolidated state for managing all dialogs
  const [dialog, setDialog] = useState({ name: null, data: null });

  // State for data used inside the dialogs
  const [questions, setQuestions] = useState([]);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [currentExam, setCurrentExam] = useState(initialExamState);
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestionState);
  const [imageFile, setImageFile] = useState(null);
  const [assignmentTab, setAssignmentTab] = useState(0);
  const [assignmentFilters, setAssignmentFilters] = useState(initialAssignmentFilters);
  const [studentsInSchool, setStudentsInSchool] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());

  useEffect(() => {
    fetchExams();
    fetchSchools();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get('/admin/exams');
      setExams(res.data.exams || []);
    } catch (err) { setError('Failed to fetch exams'); }
  };

  const fetchSchools = async () => {
    try {
      const res = await api.get('/admin/schools');
      setSchools(res.data.schools || []);
    } catch (err) { console.error('Error fetching schools:', err); }
  };

  const handleOpenDialog = (name, data = null) => setDialog({ name, data });
  const handleCloseDialog = () => {
    setDialog({ name: null, data: null });
    // Reset forms when closing dialogs
    setCurrentExam(initialExamState);
    setCurrentQuestion(initialQuestionState);
    setAssignmentFilters(initialAssignmentFilters);
    setImageFile(null);
    setAssignmentTab(0);
  };

  const handleSaveExam = async () => {
    const isEdit = !!currentExam.id;
    const method = isEdit ? 'put' : 'post';
    const url = isEdit ? `/admin/exams/${currentExam.id}` : '/admin/exams';
    try {
      await api[method](url, currentExam);
      setSuccess('Exam saved successfully.');
      fetchExams();
      handleCloseDialog();
    } catch (err) { setError('Failed to save exam.'); }
  };

  const handleDeleteExam = async (examId) => {
    if (window.confirm('Delete this exam and all its data?')) {
      try {
        await api.delete(`/admin/exams/${examId}`);
        setSuccess('Exam deleted.');
        setSelectedExam(null);
        fetchExams();
      } catch (err) { setError('Failed to delete exam.'); }
    }
  };

  const handleCloneExam = async (examId) => {
    if (window.confirm('Create a copy of this exam?')) {
      try {
        await api.post(`/admin/exams/${examId}/clone`);
        setSuccess('Exam cloned successfully!');
        fetchExams();
      } catch (err) { setError('Failed to clone exam.'); }
    }
  };

  const fetchQuestions = async (examId) => {
    try {
      const res = await api.get(`/admin/exams/${examId}/questions`);
      setQuestions(res.data.questions || []);
    } catch (err) { setError('Failed to fetch questions'); }
  };

  const handleOpenQuestionsDialog = (exam) => {
    fetchQuestions(exam.id);
    handleOpenDialog('manageQuestions', exam);
  };

  const handleOpenEditQuestion = (question) => {
    setCurrentQuestion(question || initialQuestionState);
    handleOpenDialog('editQuestion', selectedExam);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm('Delete this question?')) {
      try {
        await api.delete(`/admin/exams/${selectedExam.id}/questions/${questionId}`);
        fetchQuestions(selectedExam.id);
      } catch (err) { setError('Failed to delete question.'); }
    }
  };

  const handleSaveQuestion = async () => {
    const isEdit = !!currentQuestion.id;
    const method = isEdit ? 'put' : 'post';
    const url = isEdit
      ? `/admin/exams/${selectedExam.id}/questions/${currentQuestion.id}`
      : `/admin/exams/${selectedExam.id}/questions`;
    try {
      await api[method](url, currentQuestion);
      setSuccess('Question saved.');
      handleCloseDialog();
      fetchQuestions(selectedExam.id);
      handleOpenDialog('manageQuestions', selectedExam); // Re-open the main question dialog
    } catch (err) { setError('Failed to save question.'); }
  };

  const handleUploadImage = async () => {
    if (!imageFile) return;
    const formData = new FormData();
    formData.append("file", imageFile);
    try {
      const res = await api.post("/admin/upload_image", formData);
      setCurrentQuestion({ ...currentQuestion, image_path: res.data.url });
      setSuccess("Image uploaded!");
      setImageFile(null);
    } catch (err) { setError("Image upload failed."); }
  };

  const fetchAssignedStudents = async (examId) => {
    try {
      const res = await api.get(`/admin/exams/${examId}/students`);
      setAssignedStudents(res.data || []);
    } catch (err) { setError('Failed to fetch assigned students.'); }
  };

  const handleOpenAssignmentsDialog = (exam) => {
    fetchAssignedStudents(exam.id);
    handleOpenDialog('manageAssignments', exam);
  };

  const handleRemoveAssignment = async (studentUserId) => {
    if (window.confirm('Unassign this student?')) {
      try {
        await api.delete(`/admin/exams/${selectedExam.id}/students/${studentUserId}`);
        fetchAssignedStudents(selectedExam.id);
      } catch (err) { setError('Failed to unassign student.'); }
    }
  };

  const handleOpenEditExam = (exam) => {
    // If an exam object is passed, we're editing.
    // If not, we're creating a new one, so use the initial empty state.
    setCurrentExam(exam || initialExamState);
    handleOpenDialog('editExam');
  };

  const handleSchoolFilterChange = async (schoolId) => {
    if (!schoolId) {
      setStudentsInSchool([]);
      return;
    }
    try {
      // This assumes you have an endpoint to get all students from a school.
      // If not, you'd need to add one.
      const res = await api.get(`/admin/schools/${schoolId}/students`);
      setStudentsInSchool(res.data.students || []);
    } catch (err) {
      setError('Failed to fetch students for this school.');
    }
  };

  const handleStudentSelect = (studentId) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const handleSaveAssignment = async () => {
    try {
      await api.post(`/admin/exams/${selectedExam.id}/assign`, {
        student_ids: Array.from(selectedStudents), // Send the array of selected IDs
        replace: false // Set to false to add to existing assignments
      });
      setSuccess(`${selectedStudents.size} students assigned successfully.`);
      fetchAssignedStudents(selectedExam.id);
      setAssignmentTab(0);
    } catch (err) {
      setError('Failed to assign students.');
    }
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedExam) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      // The backend route for POST /questions already handles multipart/form-data
      await api.post(`/admin/exams/${selectedExam.id}/questions`, formData);
      setSuccess('Questions imported from CSV successfully!');
      fetchQuestions(selectedExam.id); // Refresh the question list
      handleCloseDialog();
    } catch (err) {
      setError('CSV import failed. Please check the file format.');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom>Manage Exams</Typography>
        <Button variant="contained" onClick={() => handleOpenEditExam()} startIcon={<AddIcon />}>Create New Exam</Button>
      </Box>

      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Exam List</Typography>
            <List component="nav" sx={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {exams.map((exam) => (
                <ListItemButton key={exam.id} selected={selectedExam?.id === exam.id} onClick={() => setSelectedExam(exam)}>
                  <ListItemText primary={exam.title} secondary={`ID: ${exam.id}`} />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, minHeight: '70vh' }}>
            {selectedExam ? (
              <Box>
                <Typography variant="h5" fontWeight={700}>{selectedExam.title}</Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>Actions</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" startIcon={<EditIcon />} onClick={() => handleOpenEditExam(selectedExam)}>Edit Details</Button>
                  <Button variant="outlined" startIcon={<QuestionAnswerIcon />} onClick={() => handleOpenQuestionsDialog(selectedExam)}>Manage Questions</Button>
                  <Button variant="outlined" startIcon={<AssignmentIcon />} onClick={() => handleOpenAssignmentsDialog(selectedExam)}>Manage Assignments</Button>
                  <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => handleCloneExam(selectedExam.id)}>Clone Exam</Button>
                  <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteExam(selectedExam.id)}>Delete Exam</Button>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', pt: 8 }}><Typography color="text.secondary">Select an exam to manage</Typography></Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* --- DIALOGS --- */}

      <Dialog open={dialog.name === 'editExam'} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.data?.id ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
        <DialogContent>
          <TextField name="title" label="Title" value={currentExam.title} onChange={(e) => setCurrentExam({ ...currentExam, title: e.target.value })} fullWidth margin="normal" />
          <TextField name="description" label="Description" value={currentExam.description} onChange={(e) => setCurrentExam({ ...currentExam, description: e.target.value })} fullWidth margin="normal" multiline rows={3} />
          <DateTimePicker label="Access Start" value={currentExam.access_start ? new Date(currentExam.access_start) : null} onChange={(val) => setCurrentExam({ ...currentExam, access_start: val?.toISOString() })} sx={{ width: '100%', mt: 2 }} />
          <DateTimePicker label="Access End" value={currentExam.access_end ? new Date(currentExam.access_end) : null} onChange={(val) => setCurrentExam({ ...currentExam, access_end: val?.toISOString() })} sx={{ width: '100%', mt: 2 }} />
          <TextField name="duration_minutes" label="Duration (minutes)" type="number" value={currentExam.duration_minutes} onChange={(e) => setCurrentExam({ ...currentExam, duration_minutes: e.target.value })} fullWidth margin="normal" />
          <TextField name="total_marks" label="Total Marks" type="number" value={currentExam.total_marks} onChange={(e) => setCurrentExam({ ...currentExam, total_marks: e.target.value })} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions><Button onClick={handleCloseDialog}>Cancel</Button><Button onClick={handleSaveExam} variant="contained">Save</Button></DialogActions>
      </Dialog>

      <Dialog open={dialog.name === 'manageQuestions'} onClose={handleCloseDialog} fullWidth maxWidth="lg">
        <DialogTitle>Manage Questions for: {dialog.data?.title}</DialogTitle>
        <DialogContent>
           <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenEditQuestion()}>
              Add New Question
            </Button>
            {/* --- NEW: Bulk Upload CSV Button --- */}
            <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
              Bulk Upload (.csv)
              <input type="file" hidden onChange={handleUploadCSV} accept=".csv" />
            </Button>
          </Stack>
          <Table size="small">
            <TableHead><TableRow><TableCell>Question Text</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {questions.map(q => (
                <TableRow key={q.id}>
                  <TableCell>{q.text}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpenEditQuestion(q)}><EditIcon /></IconButton>
                    <IconButton size="small" onClick={() => handleDeleteQuestion(q.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={handleCloseDialog}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={dialog.name === 'editQuestion'} onClose={() => handleOpenDialog('manageQuestions', selectedExam)}>
        <DialogTitle>{currentQuestion.id ? 'Edit Question' : 'Add New Question'}</DialogTitle>
        <DialogContent>
          <TextField name="text" label="Question Text" value={currentQuestion.text} onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })} fullWidth multiline rows={3} margin="normal" />
          <TextField name="option_a" label="Option A" value={currentQuestion.option_a} onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })} fullWidth margin="dense" />
          <TextField name="option_b" label="Option B" value={currentQuestion.option_b} onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })} fullWidth margin="dense" />
          <TextField name="option_c" label="Option C" value={currentQuestion.option_c} onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })} fullWidth margin="dense" />
          <TextField name="option_d" label="Option D" value={currentQuestion.option_d} onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })} fullWidth margin="dense" />
          <TextField name="correct_answer" label="Correct Answer (A, B, C, or D)" value={currentQuestion.correct_answer} onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })} fullWidth margin="normal" />
          <TextField name="marks" label="Marks" type="number" value={currentQuestion.marks} onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: e.target.value })} fullWidth margin="normal" />
          <TextField name="image_path" label="Image Path" value={currentQuestion.image_path} disabled fullWidth margin="normal" />
          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="outlined" component="label">Select Image<input type="file" hidden onChange={(e) => setImageFile(e.target.files[0])} /></Button>
            <Button variant="contained" onClick={handleUploadImage} disabled={!imageFile}>Upload Image</Button>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => handleOpenDialog('manageQuestions', selectedExam)}>Cancel</Button><Button onClick={handleSaveQuestion}>Save Question</Button></DialogActions>
      </Dialog>

      <Dialog open={dialog.name === 'manageAssignments'} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>Manage Assignments for: {dialog.data?.title}</DialogTitle>
        <DialogContent>
          <Tabs value={assignmentTab} onChange={(e, val) => setAssignmentTab(val)}>
            <Tab label="View Assigned Students" />
            <Tab label="Assign New Students" />
          </Tabs>

          {/* View Assigned Students Tab */}
          {assignmentTab === 0 && (
            <Table size="small" sx={{ mt: 2 }}>
              {/* ... (Your existing table to view assigned students) ... */}
            </Table>
          )}

          {/* Assign New Students Tab */}
          {assignmentTab === 1 && (
            <Box sx={{ p: 2 }}>
              <Typography sx={{ mb: 2 }}>Select students to add to this exam.</Typography>
              <FormControl fullWidth>
                <InputLabel>Filter by School</InputLabel>
                <Select
                  label="Filter by School"
                  onChange={(e) => handleSchoolFilterChange(e.target.value)}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {schools.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>

              <Paper sx={{ maxHeight: 300, overflow: 'auto', mt: 2 }}>
                <List dense>
                  {studentsInSchool.map(student => (
                    <ListItemButton key={student.user_id} onClick={() => handleStudentSelect(student.user_id)}>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedStudents.has(student.user_id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText primary={student.name} secondary={student.student_id} />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
              <Typography sx={{ mt: 1, fontSize: '0.9rem' }}>
                {selectedStudents.size} student(s) selected.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {/* Only show the Assign button on the second tab */}
          {assignmentTab === 1 && (
            <Button variant="contained" onClick={handleSaveAssignment} disabled={selectedStudents.size === 0}>
              Assign Selected Students
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}