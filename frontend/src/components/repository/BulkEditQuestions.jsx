import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Box, Typography, Button, Paper, Alert, Stack, Snackbar, 
  LinearProgress, TextField, MenuItem 
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Restore as RestoreIcon,
  PlayArrow as ApplyIcon
} from '@mui/icons-material';
import api from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function BulkEditQuestions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // --- DATA STATE ---
  const [rows, setRows] = useState([]);
  const [modifiedRows, setModifiedRows] = useState({});
  const [loading, setLoading] = useState(false);
  
  // --- SELECTION & MASS UPDATE STATE ---
  const [selectionModel, setSelectionModel] = useState([]);
  const [massUpdate, setMassUpdate] = useState({ field: 'class_number', value: '' });
  
  // --- SNACKBAR STATE ---
  const [snack, setSnack] = useState({ open: false, msg: '', type: 'info' });

  // --- ROLE LOGIC ---
  const isSpecialist = user?.role === 'subject_specialist';
  const specialistSubject = user?.specialist_subject || '';

  // --- 1. OPTIMIZED FETCH WITH SUBJECT FILTER ---
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      // Determine the initial subject filter
      // If Specialist, always force their subject. If Admin, check URL.
      const subjectFilter = isSpecialist ? specialistSubject : (query.get('subject') || '');
      
      const params = new URLSearchParams({
        subject: subjectFilter,
        class_number: query.get('class_number') || '',
        search: query.get('search') || ''
      });

      const res = await api.get(`/admin/repository/questions?${params.toString()}`);
      setRows(res.data.questions || []);
    } catch (err) {
      setSnack({ open: true, msg: "Failed to load questions", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [isSpecialist, specialistSubject, query]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // --- 2. MASS UPDATE LOGIC (Client-side sync) ---
  const handleApplyMassChange = () => {
    if (selectionModel.length === 0 || !massUpdate.value) return;

    const newModifiedRows = { ...modifiedRows };
    const updatedRows = rows.map((row) => {
      if (selectionModel.includes(row.id)) {
        const updatedRow = { ...row, [massUpdate.field]: massUpdate.value };
        newModifiedRows[row.id] = updatedRow; // Track for final save
        return updatedRow;
      }
      return row;
    });

    setRows(updatedRows);
    setModifiedRows(newModifiedRows);
    setSnack({ open: true, msg: `Applied change to ${selectionModel.length} items. Don't forget to Save.`, type: 'info' });
  };

  // --- 3. SAVE LOGIC (API Call) ---
  const handleSaveAll = async () => {
    const updates = Object.values(modifiedRows);
    if (updates.length === 0) return;

    try {
      setLoading(true);
      const res = await api.put('/admin/repository/questions/bulk', updates);
      setSnack({ open: true, msg: res.data.message, type: "success" });
      setModifiedRows({});
      fetchQuestions(); // Refresh to ensure DB sync
    } catch (err) {
      setSnack({ open: true, msg: "Save failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const processRowUpdate = (newRow, oldRow) => {
    if (JSON.stringify(newRow) !== JSON.stringify(oldRow)) {
      setModifiedRows((prev) => ({ ...prev, [newRow.id]: newRow }));
      return newRow;
    }
    return oldRow;
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'subject', headerName: 'Subject', width: 120, editable: false },
    { field: 'class_number', headerName: 'Class', width: 90, editable: true },
    { field: 'text', headerName: 'Question Text', width: 350, editable: true },
    { field: 'correct_answer', headerName: 'Ans', width: 70, editable: true },
    { field: 'marks', headerName: 'Marks', width: 80, type: 'number', editable: true },
  ];

  const pendingCount = Object.keys(modifiedRows).length;

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f7fa' }}>
      
      {/* HEADER ACTIONS */}
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
          <Typography variant="h5" fontWeight={700}>Bulk Editor</Typography>
          {pendingCount > 0 && <Chip label={`${pendingCount} Unsaved Changes`} color="warning" size="small" />}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => { setModifiedRows({}); fetchQuestions(); }} startIcon={<RestoreIcon />}>
            Discard
          </Button>
          <Button 
            variant="contained" color="success" startIcon={<SaveIcon />} 
            onClick={handleSaveAll} disabled={pendingCount === 0 || loading}
          >
            Save All Changes
          </Button>
        </Stack>
      </Stack>

      {/* MASS ACTION TOOLBAR */}
      {selectionModel.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle2" fontWeight="bold">Update {selectionModel.length} Selected:</Typography>
            <TextField
              select size="small" sx={{ width: 140, bgcolor: 'white' }}
              value={massUpdate.field}
              onChange={(e) => setMassUpdate({ ...massUpdate, field: e.target.value })}
            >
              <MenuItem value="class_number">Class</MenuItem>
              <MenuItem value="marks">Marks</MenuItem>
            </TextField>
            <TextField
              size="small" placeholder="Enter Value..." sx={{ bgcolor: 'white' }}
              value={massUpdate.value}
              onChange={(e) => setMassUpdate({ ...massUpdate, value: e.target.value })}
            />
            <Button variant="contained" startIcon={<ApplyIcon />} onClick={handleApplyMassChange}>
              Apply
            </Button>
          </Stack>
        </Paper>
      )}

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <Paper sx={{ flexGrow: 1, boxShadow: 3 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          checkboxSelection
          onRowSelectionModelChange={(newModel) => setSelectionModel(newModel)}
          processRowUpdate={processRowUpdate}
          slots={{ toolbar: GridToolbar }}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#eceff1' } }}
        />
      </Paper>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}