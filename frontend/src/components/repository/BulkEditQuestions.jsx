import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, Typography, Button, Paper, Alert, Stack, Snackbar, LinearProgress 
} from '@mui/material';
import { DataGrid, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestoreIcon from '@mui/icons-material/Restore';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function BulkEditQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [modifiedRows, setModifiedRows] = useState({});
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', type: 'info' });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/repository/questions');
      // DataGrid needs a unique 'id' property
      setRows(res.data.questions || []);
    } catch (err) {
      console.error(err);
      setSnack({ open: true, msg: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // This triggers whenever a user edits a cell and clicks away/enters
  const processRowUpdate = (newRow, oldRow) => {
    const hasChanged = JSON.stringify(newRow) !== JSON.stringify(oldRow);
    if (hasChanged) {
      setModifiedRows((prev) => ({ ...prev, [newRow.id]: newRow }));
      return newRow;
    }
    return oldRow;
  };

  const handleSave = async () => {
    const updates = Object.values(modifiedRows);
    if (updates.length === 0) return;

    try {
      setLoading(true);
      const res = await api.put('/admin/repository/questions/bulk', updates);
      setSnack({ open: true, msg: res.data.message, type: "success" });
      setModifiedRows({}); // Clear pending changes
      fetchQuestions(); // Refresh data
    } catch (err) {
      setSnack({ open: true, msg: "Bulk update failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Columns Definition
  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { 
        field: 'subject', 
        headerName: 'Subject', 
        width: 120, 
        editable: false // Subject is locked to prevent specialists moving Qs
    },
    { field: 'class_number', headerName: 'Class', width: 80, editable: true },
    { field: 'text', headerName: 'Question Text', width: 300, editable: true },
    { field: 'option_a', headerName: 'Option A', width: 130, editable: true },
    { field: 'option_b', headerName: 'Option B', width: 130, editable: true },
    { field: 'option_c', headerName: 'Option C', width: 130, editable: true },
    { field: 'option_d', headerName: 'Option D', width: 130, editable: true },
    { field: 'correct_answer', headerName: 'Ans', width: 60, editable: true },
    { field: 'marks', headerName: 'Marks', width: 70, type: 'number', editable: true },
  ];

  const pendingCount = Object.keys(modifiedRows).length;

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', bgcolor: '#f5f7fa' }}>
      
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={2} alignItems="center">
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
            <Typography variant="h5" fontWeight={700}>Bulk Editor</Typography>
            {pendingCount > 0 && (
                <Alert severity="warning" sx={{ py: 0 }}>
                    {pendingCount} unsaved changes
                </Alert>
            )}
        </Stack>

        <Stack direction="row" spacing={2}>
            <Button onClick={() => { setModifiedRows({}); fetchQuestions(); }} startIcon={<RestoreIcon />}>
                Discard Changes
            </Button>
            <Button 
                variant="contained" 
                startIcon={<SaveIcon />} 
                onClick={handleSave}
                disabled={pendingCount === 0 || loading}
                color="success"
            >
                {loading ? "Saving..." : "Save All Changes"}
            </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress />}

      <Paper sx={{ flexGrow: 1, width: '100%', mt: 1, boxShadow: 3 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={(err) => console.log(err)}
          loading={loading}
          slots={{ toolbar: GridToolbar }} // Adds Filter/Export buttons automatically
          disableRowSelectionOnClick
          sx={{
             '& .MuiDataGrid-cell:hover': { color: 'primary.main' },
          }}
        />
      </Paper>

      <Snackbar 
        open={snack.open} 
        autoHideDuration={4000} 
        onClose={() => setSnack({...snack, open:false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}