import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Stack, Typography, Box,
  Alert, CircularProgress, FormControlLabel, RadioGroup, Radio, Divider
} from '@mui/material';
import { repoApi } from '../../utils/api';
import api from '../../utils/api';

export default function AutoGenerateExamDialog({ open, onClose, onSuccess, initialFilters }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [examType, setExamType] = useState('school'); // 'school' or 'quick'
  const [title, setTitle] = useState('Auto-Generated Exam');
  const [questionCount, setQuestionCount] = useState(20);
  const [duration, setDuration] = useState(30);
  
  // Dates (only for school exams)
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Filters State
  const [filters, setFilters] = useState({
    class_number: '',
    subject: '',
    chapter: '',
    topic: '',
    difficulty: ''
  });

  // Metadata dropdowns
  const [metadata, setMetadata] = useState({ classes: [], subjects: [], chapters: [], topics: [] });

  useEffect(() => {
    if (open) {
      setFilters(initialFilters);
      fetchMetadata(initialFilters);
    }
  }, [open, initialFilters]);

  const fetchMetadata = async (currentFilters) => {
    try {
      const p = new URLSearchParams(currentFilters);
      const res = await api.get(`/api/metadata/repository?${p}`);
      setMetadata(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (field, val) => {
    const nextFilters = { ...filters, [field]: val };
    setFilters(nextFilters);
    fetchMetadata(nextFilters);
  };

  const handleSubmit = async () => {
    setError('');
    if (!title || questionCount < 1) {
      setError('Please provide a valid title and number of questions.');
      return;
    }
    
    setBusy(true);
    try {
      const payload = {
        filters,
        question_count: questionCount,
        exam_type: examType,
        title,
        duration_minutes: duration
      };
      
      if (examType === 'school') {
        if (startTime) payload.start_time = new Date(startTime).toISOString();
        if (endTime) payload.end_time = new Date(endTime).toISOString();
      }

      const res = await repoApi.autoGenerate(payload);
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Auto-Generate Exam</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              1. Source Filters (Which questions to pick from?)
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField 
                select size="small" label="Class" value={filters.class_number || ''} 
                onChange={e => handleFilterChange('class_number', e.target.value)} fullWidth
              >
                <MenuItem value="">Any</MenuItem>
                {metadata.classes.map(c => <MenuItem key={c} value={c}>Class {c}</MenuItem>)}
              </TextField>
              <TextField 
                select size="small" label="Subject" value={filters.subject || ''} 
                onChange={e => handleFilterChange('subject', e.target.value)} fullWidth
              >
                <MenuItem value="">Any</MenuItem>
                {metadata.subjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField 
                select size="small" label="Chapter" value={filters.chapter || ''} 
                onChange={e => handleFilterChange('chapter', e.target.value)} fullWidth
              >
                <MenuItem value="">Any</MenuItem>
                {metadata.chapters.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField 
                select size="small" label="Difficulty" value={filters.difficulty || ''} 
                onChange={e => handleFilterChange('difficulty', e.target.value)} fullWidth
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </TextField>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              2. Exam Settings
            </Typography>
            <Stack spacing={2}>
              <TextField 
                label="Exam Title" size="small" value={title} 
                onChange={e => setTitle(e.target.value)} fullWidth 
              />
              <Stack direction="row" spacing={2}>
                <TextField 
                  label="Number of Questions" type="number" size="small" 
                  value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} fullWidth 
                />
                <TextField 
                  label="Duration (mins)" type="number" size="small" 
                  value={duration} onChange={e => setDuration(Number(e.target.value))} fullWidth 
                />
              </Stack>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              3. Exam Type & Assignment
            </Typography>
            <RadioGroup row value={examType} onChange={e => setExamType(e.target.value)}>
              <FormControlLabel value="school" control={<Radio />} label="School Exam" />
              <FormControlLabel value="quick" control={<Radio />} label="Quick Exam (Link)" />
            </RadioGroup>

            {examType === 'school' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
                {filters.class_number ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This exam will be automatically assigned to all Class {filters.class_number} students.
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No class filter selected. The exam will be created, but you must assign it to students manually later.
                  </Alert>
                )}
                <Stack direction="row" spacing={2}>
                  <TextField 
                    label="Start Time (Optional)" type="datetime-local" size="small" 
                    InputLabelProps={{ shrink: true }} value={startTime} onChange={e => setStartTime(e.target.value)} fullWidth 
                  />
                  <TextField 
                    label="End Time (Optional)" type="datetime-local" size="small" 
                    InputLabelProps={{ shrink: true }} value={endTime} onChange={e => setEndTime(e.target.value)} fullWidth 
                  />
                </Stack>
              </Box>
            )}

            {examType === 'quick' && (
              <Alert severity="info" sx={{ mt: 1 }}>
                This will generate a 6-character code. Anyone with the link can join instantly without logging in.
              </Alert>
            )}
          </Box>

        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button 
          variant="contained" color="secondary" onClick={handleSubmit} disabled={busy}
          startIcon={busy && <CircularProgress size={16} />}
        >
          {busy ? 'Generating...' : 'Generate Exam'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
