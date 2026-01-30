import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, Stack, Drawer, TextField, 
  IconButton, Divider, Grid, Snackbar, Alert, Collapse, Tooltip, Chip
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { 
  Edit as EditIcon, Save as SaveIcon, Close as CloseIcon,
  ArrowBack as ArrowBackIcon, MenuOpen as CollapseIcon,
  FilterAlt as FilterIcon, ContentCopy as CopyIcon 
} from '@mui/icons-material';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import FilterSidebar from '../ui/FilterSidebar';
export default function BulkEditQuestions() {
  const navigate = useNavigate();
  
  // UI Layout State
  const [filterOpen, setFilterOpen] = useState(true);
  
  // Data State
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  // Filter & Edit State
  const [filters, setFilters] = useState({ search: '', class_number: '', subject: '', chapter: '', topic: '' });
  const [editingRow, setEditingRow] = useState(null); 
  const [modifiedRows, setModifiedRows] = useState({});
  const [snack, setSnack] = useState({ open: false, msg: '', type: 'success' });

  useEffect(() => { fetchQuestions(); }, [paginationModel.page, paginationModel.pageSize, filters]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = { page: paginationModel.page + 1, per_page: paginationModel.pageSize, ...filters };
      const res = await api.get('/admin/repository/questions', { params });
      setRows(res.data.questions);
      setTotal(res.data.total);
    } catch (err) {
      setSnack({ open: true, msg: "Failed to sync repository", type: "error" });
    } finally { setLoading(false); }
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setSnack({ open: true, msg: "Question Code copied!", type: "success" });
  };

  const handleDrawerSave = () => {
    setModifiedRows(prev => ({ ...prev, [editingRow.id]: editingRow }));
    setRows(prev => prev.map(r => r.id === editingRow.id ? editingRow : r));
    setEditingRow(null);
  };

  

  const columns = [
    { 
      field: 'custom_id', 
      headerName: 'Question Code', 
      width: 180,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography 
            variant="caption" 
            sx={{ 
              fontFamily: 'JetBrains Mono, monospace', 
              fontWeight: 700, 
              color: 'primary.main',
              bgcolor: '#eff6ff',
              px: 1, py: 0.5,
              borderRadius: 1,
              border: '1px solid #dbeafe'
            }}
          >
            {params.value || 'GEN-AUTO'}
          </Typography>
          <IconButton size="small" onClick={() => handleCopyId(params.value)} title="Copy Code">
            <CopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      )
    },
    { field: 'class_number', headerName: 'Class', width: 80 },
    { field: 'subject', headerName: 'Subject', width: 120 },
    { field: 'text', headerName: 'Content Preview', flex: 1, renderCell: (params) => (
        <Typography variant="body2" sx={{ 
          fontWeight: modifiedRows[params.row.id] ? 700 : 400,
          color: modifiedRows[params.row.id] ? 'primary.main' : 'inherit',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
            {params.value}
        </Typography>
    )},
    { field: 'actions', type: 'actions', width: 80, getActions: (params) => [
      <IconButton onClick={() => setEditingRow(params.row)} title="Edit Question">
        <EditIcon color="primary" />
      </IconButton>
    ]}
  ];

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
      
      {/* HEADER BAR */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
          <Tooltip title={filterOpen ? "Hide Filters" : "Show Filters"}>
            <IconButton 
              onClick={() => setFilterOpen(!filterOpen)} 
              sx={{ bgcolor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
               {filterOpen ? <CollapseIcon /> : <FilterIcon />}
            </IconButton>
          </Tooltip>
          <Typography variant="h5" fontWeight={900}>Bulk Content Manager</Typography>
          {Object.keys(modifiedRows).length > 0 && (
            <Chip 
              label={`${Object.keys(modifiedRows).length} Unsaved Changes`} 
              color="warning" 
              size="small" 
              sx={{ fontWeight: 700 }} 
            />
          )}
        </Stack>
        
        <Button 
            variant="contained" 
            startIcon={<SaveIcon />} 
            disabled={Object.keys(modifiedRows).length === 0 || loading}
            onClick={async () => {
                setLoading(true);
                try {
                  await api.put('/admin/repository/questions/bulk', Object.values(modifiedRows));
                  setModifiedRows({});
                  fetchQuestions();
                  setSnack({ open: true, msg: "Repository synced successfully", type: "success" });
                } catch (e) {
                  setSnack({ open: true, msg: "Sync failed", type: "error" });
                } finally {
                  setLoading(false);
                }
            }}
            sx={{ borderRadius: 3, px: 4, fontWeight: 700 }}
        >
          {loading ? "Syncing..." : `Save All Changes`}
        </Button>
      </Stack>

      {/* MAIN CONTENT AREA */}
      <Box sx={{ display: 'flex', flexGrow: 1, gap: filterOpen ? 3 : 0, transition: 'gap 0.3s ease', overflow: 'hidden' }}>
        
        {/* COLLAPSIBLE SIDEBAR */}
        <Collapse in={filterOpen} orientation="horizontal" unmountOnExit sx={{ height: '100%' }}>
            <Box sx={{ width: 300, height: '100%', overflowY: 'auto' }}>
                <FilterSidebar 
                    filters={filters} 
                    onFilterChange={setFilters} 
                    onReset={() => setFilters({search: '', class_number: '', subject: '', chapter: '', topic: ''})} 
                />
            </Box>
        </Collapse>

        {/* QUESTION TABLE CARD */}
        <Paper sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: 2, 
            overflow: 'hidden', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            minWidth: 0 
        }}>
            <DataGrid
              rows={rows}
              columns={columns}
              paginationMode="server"
              rowCount={total}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              loading={loading}
              slots={{ toolbar: GridToolbar }}
              disableRowSelectionOnClick
              sx={{ 
                border: 'none',
                '& .MuiDataGrid-main': { width: '100%' },
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc' },
                '& .MuiDataGrid-cell:focus': { outline: 'none' }
              }}
            />
        </Paper>
      </Box>

      {/* DETAILED EDITOR DRAWER */}
      <Drawer anchor="right" open={!!editingRow} onClose={() => setEditingRow(null)}>
        <Box sx={{ width: { xs: '100vw', md: 750 }, p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
                <Typography variant="h6" fontWeight={900}>Detailed Editor</Typography>
                <Chip 
                    label={`ID: ${editingRow?.custom_id || 'AUTO-GEN'}`} 
                    size="small" 
                    color="primary" 
                    sx={{ mt: 1, fontWeight: 800, borderRadius: 1, fontFamily: 'monospace' }} 
                />
            </Box>
            <IconButton onClick={() => setEditingRow(null)}><CloseIcon /></IconButton>
          </Stack>
          
          <Divider sx={{ mb: 4 }} />
          
          {editingRow && (
            <Stack spacing={4}>
              <TextField 
                label="Question Content" 
                multiline rows={10} fullWidth 
                variant="outlined"
                value={editingRow.text}
                onChange={(e) => setEditingRow({...editingRow, text: e.target.value})}
              />
              
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Options & Answer Key
                </Typography>
                <Grid container spacing={2}>
                    {['option_a', 'option_b', 'option_c', 'option_d'].map(opt => (
                    <Grid item xs={6} key={opt}>
                        <TextField 
                            label={opt.toUpperCase().replace('_', ' ')} 
                            fullWidth 
                            value={editingRow[opt] || ''} 
                            onChange={(e) => setEditingRow({...editingRow, [opt]: e.target.value})} 
                        />
                    </Grid>
                    ))}
                </Grid>
              </Box>

              <Stack direction="row" spacing={2}>
                <TextField 
                    select 
                    label="Correct Key" 
                    fullWidth 
                    value={editingRow.correct_answer || ''}
                    onChange={(e) => setEditingRow({...editingRow, correct_answer: e.target.value})}
                    SelectProps={{ native: true }}
                >
                    <option value="A">A</option><option value="B">B</option>
                    <option value="C">C</option><option value="D">D</option>
                </TextField>
                <TextField 
                    label="Marks" 
                    type="number" 
                    fullWidth 
                    value={editingRow.marks || 1} 
                    onChange={(e) => setEditingRow({...editingRow, marks: e.target.value})} 
                />
              </Stack>

              <Button 
                variant="contained" 
                size="large" 
                fullWidth 
                onClick={handleDrawerSave} 
                sx={{ py: 2, fontWeight: 900, borderRadius: 3, boxShadow: 3 }}
              >
                Apply Changes to Batch
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({...snack, open: false})}>
        <Alert severity={snack.type} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}