import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Stack, Drawer, TextField,
  IconButton, Divider, Grid, Snackbar, Alert, Collapse, Tooltip, Chip,
  CardMedia, CircularProgress
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
import useAuth from '../../hooks/useAuth';

export default function BulkEditQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ---------------- UI STATE ---------------- */
  const [filterOpen, setFilterOpen] = useState(true);

  /* ---------------- DATA STATE ---------------- */
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10
  });

  /* ---------------- FILTER / EDIT STATE ---------------- */
  const [filters, setFilters] = useState({
    search: '',
    class_number: '',
    subject: '',
    chapter: '',
    topic: ''
  });

  const [editingRow, setEditingRow] = useState(null);
  const [modifiedRows, setModifiedRows] = useState({});
  const [snack, setSnack] = useState({ open: false, msg: '', type: 'success' });
  const [isSaving, setIsSaving] = useState(false);

  /* ---------------- FETCH ---------------- */
  useEffect(() => {
    fetchQuestions();
  }, [paginationModel.page, paginationModel.pageSize, filters]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = {
        page: paginationModel.page + 1,
        per_page: paginationModel.pageSize,
        ...filters
      };
      const res = await api.get('/admin/repository/questions', { params });
      const fetched = res.data.questions || [];
      // Preserve any unsaved inline edits when paginating
      setRows(fetched.map(r => modifiedRows[r.id] ? { ...r, ...modifiedRows[r.id] } : r));
      setTotal(res.data.total || 0);
    } catch {
      setSnack({ open: true, msg: 'Failed to load questions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- HELPERS ---------------- */
  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setSnack({ open: true, msg: 'Question Code copied', type: 'success' });
  };

  const handleDrawerSave = () => {
    setModifiedRows(prev => ({ ...prev, [editingRow.id]: editingRow }));
    setRows(prev =>
      prev.map(r => (r.id === editingRow.id ? editingRow : r))
    );
    setEditingRow(null);
  };

  /* ✅ INLINE CHAPTER EDIT (SAFE) */
  const handleInlineChapterChange = (id, value) => {
    setRows(prev =>
      prev.map(r => (r.id === id ? { ...r, chapter: value } : r))
    );

    setModifiedRows(prev => ({
      ...prev,
      [id]: { ...(prev[id] || rows.find(r => r.id === id)), chapter: value }
    }));
  };

  /* ✅ INLINE SUBJECT EDIT */
  const handleInlineSubjectChange = (id, value) => {
    setRows(prev =>
      prev.map(r => (r.id === id ? { ...r, subject: value } : r))
    );

    setModifiedRows(prev => ({
      ...prev,
      [id]: { ...(prev[id] || rows.find(r => r.id === id)), subject: value }
    }));
  };

  /* ---------------- COLUMNS ---------------- */
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
              px: 1,
              py: 0.5,
              borderRadius: 1,
              border: '1px solid #dbeafe'
            }}
          >
            {params.value || 'GEN-AUTO'}
          </Typography>
          <IconButton size="small" onClick={() => handleCopyId(params.value)}>
            <CopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      )
    },
    { field: 'class_number', headerName: 'Class', width: 80 },
    
    /* ✅ EDITABLE SUBJECT COLUMN (ADMIN ONLY) */
    {
      field: 'subject',
      headerName: 'Subject',
      width: 160,
      renderCell: (params) => (
        user?.role === 'admin' ? (
          <TextField
            size="small"
            fullWidth
            placeholder="Enter subject"
            value={params.value || ''}
            onChange={(e) =>
              handleInlineSubjectChange(params.row.id, e.target.value)
            }
          />
        ) : (
          <Typography variant="body2">{params.value}</Typography>
        )
      )
    },

    /* ✅ EDITABLE CHAPTER COLUMN */
    {
      field: 'chapter',
      headerName: 'Chapter',
      width: 200,
      renderCell: (params) => (
        <TextField
          size="small"
          fullWidth
          placeholder="Enter chapter"
          value={params.value || ''}
          onChange={(e) =>
            handleInlineChapterChange(params.row.id, e.target.value)
          }
        />
      )
    },

    /* IMAGE THUMBNAIL COLUMN */
    {
      field: 'image_path',
      headerName: 'Img',
      width: 60,
      renderCell: (params) =>
        params.value ? (
          <Box
            component="img"
            src={params.value}
            alt="Q"
            sx={{
              width: 40,
              height: 40,
              objectFit: 'cover',
              borderRadius: 1,
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer'
            }}
            onClick={() => setEditingRow(params.row)}
          />
        ) : null
    },
    {
      field: 'text',
      headerName: 'Content Preview',
      flex: 1,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: modifiedRows[params.row.id] ? 700 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {params.value}
        </Typography>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      width: 80,
      getActions: (params) => [
        <IconButton onClick={() => setEditingRow(params.row)}>
          <EditIcon color="primary" />
        </IconButton>
      ]
    }
  ];

  return (
    <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Tooltip title={filterOpen ? 'Hide Filters' : 'Show Filters'}>
            <IconButton onClick={() => setFilterOpen(!filterOpen)}>
              {filterOpen ? <CollapseIcon /> : <FilterIcon />}
            </IconButton>
          </Tooltip>
          <Typography variant="h5" fontWeight={900}>
            Bulk Content Manager
          </Typography>
          {!!Object.keys(modifiedRows).length && (
            <Chip
              color="warning"
              label={`${Object.keys(modifiedRows).length} Unsaved`}
            />
          )}
        </Stack>

        <Button
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          disabled={!Object.keys(modifiedRows).length || isSaving}
          onClick={async () => {
            setIsSaving(true);
            setSnack({ open: true, msg: 'Uploading changes...', type: 'info' });
            try {
              await api.put(
                '/admin/repository/questions/bulk',
                Object.values(modifiedRows)
              );
              setModifiedRows({});
              await fetchQuestions();
              setSnack({ open: true, msg: 'Saved successfully', type: 'success' });
            } catch {
              setSnack({ open: true, msg: 'Save failed', type: 'error' });
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {isSaving ? 'Saving...' : 'Save All'}
        </Button>
      </Stack>

      {/* MAIN */}
      <Box sx={{ display: 'flex', flexGrow: 1, gap: 2, overflow: 'hidden' }}>
        <Collapse in={filterOpen} orientation="horizontal">
          <Box sx={{ width: 300 }}>
            <FilterSidebar
              filters={filters}
              onFilterChange={setFilters}
              onReset={() =>
                setFilters({
                  search: '',
                  class_number: '',
                  subject: '',
                  chapter: '',
                  topic: ''
                })
              }
            />
          </Box>
        </Collapse>

        <Paper sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',   // 👈 scrollbar stays inside
          borderRadius: 2,
          minWidth: 0
        }}>
          <DataGrid
            rows={rows}
            columns={columns}
            paginationMode="server"
            rowCount={total}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            loading={loading}
            slots={{ toolbar: GridToolbar }}
            disableRowSelectionOnClick
            sx={{
              flexGrow: 1,          // 👈 fills card
              border: 'none'
            }}
          />
        </Paper>
      </Box>

      {/* DRAWER (UNCHANGED) */}
      {/* DETAILED EDITOR DRAWER */}
      <Drawer anchor="right" open={!!editingRow} onClose={() => setEditingRow(null)}>
        <Box sx={{ width: { xs: '100vw', md: 750 }, p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Detailed Editor
              </Typography>
              <Chip
                label={`ID: ${editingRow?.custom_id || 'AUTO-GEN'}`}
                size="small"
                color="primary"
                sx={{ mt: 1, fontWeight: 800, borderRadius: 1, fontFamily: 'monospace' }}
              />
            </Box>
            <IconButton onClick={() => setEditingRow(null)}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Divider sx={{ mb: 4 }} />

          {editingRow && (
            <Stack spacing={4}>
              {/* QUESTION */}
              <TextField
                label="Question Content"
                multiline
                rows={8}
                fullWidth
                value={editingRow.text || ''}
                onChange={(e) =>
                  setEditingRow({ ...editingRow, text: e.target.value })
                }
              />

              {/* QUESTION IMAGE PREVIEW */}
              {editingRow.image_path && (
                <Box sx={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: '#fafafa',
                  textAlign: 'center',
                  p: 1
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Question Image
                  </Typography>
                  <CardMedia
                    component="img"
                    image={editingRow.image_path}
                    alt="Question"
                    sx={{ maxHeight: 250, objectFit: 'contain', borderRadius: 1 }}
                  />
                </Box>
              )}

              {/* OPTIONS */}
              <Box>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontWeight: 700, color: 'text.secondary' }}
                >
                  Options
                </Typography>
                <Grid container spacing={2}>
                  {['option_a', 'option_b', 'option_c', 'option_d'].map((opt) => (
                    <Grid item xs={6} key={opt}>
                      <TextField
                        label={opt.toUpperCase().replace('_', ' ')}
                        fullWidth
                        value={editingRow[opt] || ''}
                        onChange={(e) =>
                          setEditingRow({
                            ...editingRow,
                            [opt]: e.target.value
                          })
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* ANSWER + MARKS */}
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Correct Answer"
                  fullWidth
                  value={editingRow.correct_answer || ''}
                  SelectProps={{ native: true }}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      correct_answer: e.target.value
                    })
                  }
                >
                  <option value="">Select</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </TextField>

                <TextField
                  label="Marks"
                  type="number"
                  fullWidth
                  value={editingRow.marks ?? 1}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      marks: Number(e.target.value)
                    })
                  }
                />
              </Stack>

              {/* SAVE */}
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => {
                  setModifiedRows((prev) => ({
                    ...prev,
                    [editingRow.id]: editingRow
                  }));
                  setRows((prev) =>
                    prev.map((r) => (r.id === editingRow.id ? editingRow : r))
                  );
                  setEditingRow(null);
                }}
                sx={{ py: 2, fontWeight: 900, borderRadius: 3 }}
              >
                Apply Changes to Batch
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>


      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.type}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
