import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Button, Stack, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow, Alert, Snackbar,
  CircularProgress, Tooltip,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import api from '../../utils/api';
import { BOARD_LABELS } from '../ui/FilterSidebar';

const ALL_CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];

/**
 * Admin control over what each subject specialist can see and edit.
 *
 * A specialist's reach is the OR of their scope rows; within a row a blank
 * class/board means "no restriction on that axis". The boundary is enforced
 * server-side on every read and write path, so what is set here is the whole
 * of what that user can reach — including by direct URL or CSV upload.
 */
export default function SpecialistScopeManager() {
  const [specialists, setSpecialists] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);   // { id, username, scopes: [] }
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [specRes, metaRes] = await Promise.all([
        api.get('/admin/specialists'),
        api.get('/api/metadata/repository'),
      ]);
      setSpecialists(specRes.data.specialists || []);
      setSubjects(metaRes.data.subjects || []);
    } catch (err) {
      setSnack({ open: true, severity: 'error', message: 'Could not load specialists' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEditor = (s) => setEditing({
    id: s.id,
    username: s.username,
    // Copy so Cancel genuinely discards.
    scopes: s.scopes.map((x) => ({ ...x })),
  });

  const addRow = () => setEditing((e) => ({
    ...e,
    scopes: [...e.scopes, { subject: '', class_number: '', board: '', paper_code: '' }],
  }));

  const updateRow = (i, field, value) => setEditing((e) => {
    const scopes = e.scopes.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
    return { ...e, scopes };
  });

  const removeRow = (i) => setEditing((e) => ({
    ...e, scopes: e.scopes.filter((_, idx) => idx !== i),
  }));

  const save = async () => {
    if (editing.scopes.some((s) => !s.subject)) {
      setSnack({ open: true, severity: 'error', message: 'Every row needs a subject' });
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/specialists/${editing.id}/scopes`, { scopes: editing.scopes });
      setSnack({
        open: true,
        severity: 'success',
        message: editing.scopes.length
          ? `Scope updated for ${editing.username}`
          : `${editing.username} now has no repository access`,
      });
      setEditing(null);
      load();
    } catch (err) {
      setSnack({
        open: true, severity: 'error',
        message: err.response?.data?.message || 'Could not save scope',
      });
    } finally {
      setSaving(false);
    }
  };

  const describe = (s) => {
    const cls = s.class_number ? `Class ${s.class_number}` : 'All classes';
    const extra = [
      s.board ? (BOARD_LABELS[s.board] || s.board) : null,
      s.paper_code || null,
    ].filter(Boolean).join(' · ');
    return `${s.subject} — ${cls}${extra ? ` · ${extra}` : ''}`;
  };

  if (loading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Subject Specialist Access
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Decide which subjects and classes each specialist may view and edit. They
        cannot reach anything outside what you grant here.
      </Typography>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Specialist</TableCell>
              <TableCell>Granted access</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {specialists.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{s.username}</Typography>
                  {s.email && (
                    <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  {s.scopes.length === 0 ? (
                    <Tooltip title="This user currently sees an empty repository">
                      <Chip size="small" color="warning" variant="outlined"
                            icon={<LockIcon />} label="No access" />
                    </Tooltip>
                  ) : (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {s.scopes.map((sc, i) => (
                        <Chip key={i} size="small" label={describe(sc)} />
                      ))}
                    </Stack>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEditor(s)}>
                    Edit access
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {specialists.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No subject specialists yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>Access for {editing?.username}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Each row grants one subject. Leave Class blank to allow every class.
            Board and Paper are optional — use them to limit a specialist to one
            syllabus.
          </Typography>

          {editing?.scopes.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              With no rows, this specialist will not see any questions at all.
            </Alert>
          )}

          <Stack spacing={2}>
            {editing?.scopes.map((s, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField
                  select size="small" label="Subject" value={s.subject}
                  onChange={(e) => updateRow(i, 'subject', e.target.value)}
                  sx={{ flex: 2, minWidth: 160 }}
                >
                  {subjects.map((sub) => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                </TextField>

                <TextField
                  select size="small" label="Class" value={s.class_number || ''}
                  onChange={(e) => updateRow(i, 'class_number', e.target.value)}
                  sx={{ flex: 1, minWidth: 120 }}
                >
                  <MenuItem value="">All classes</MenuItem>
                  {ALL_CLASSES.map((c) => <MenuItem key={c} value={c}>Class {c}</MenuItem>)}
                </TextField>

                <TextField
                  select size="small" label="Board" value={s.board || ''}
                  onChange={(e) => updateRow(i, 'board', e.target.value)}
                  sx={{ flex: 1, minWidth: 140 }}
                >
                  <MenuItem value="">All boards</MenuItem>
                  {Object.keys(BOARD_LABELS).map((b) => (
                    <MenuItem key={b} value={b}>{BOARD_LABELS[b]}</MenuItem>
                  ))}
                </TextField>

                <IconButton onClick={() => removeRow(i)} title="Remove">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>

          <Button startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 2 }}>
            Add subject
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save access'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open} autoHideDuration={5000}
        onClose={() => setSnack({ ...snack, open: false })}
      >
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
