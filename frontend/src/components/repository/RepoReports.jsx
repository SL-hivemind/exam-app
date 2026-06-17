import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TableCell, TableRow, IconButton, TextField, Tooltip, Snackbar, Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  FlagOutlined as FlagIcon,
} from '@mui/icons-material';
import api from '../../utils/api';
import { PageHeader, DataTableShell, StatusChip, FormDialog } from '../common';

const COLUMNS = [
  { key: 'id', label: 'Report' },
  { key: 'question', label: 'Question' },
  { key: 'detail', label: 'Report Detail' },
  { key: 'by', label: 'Reported By' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' },
];

export default function RepoReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

  const notify = (msg, severity = 'success') => setToast({ open: true, msg, severity });

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/repository/reports');
      setReports(res.data.reports || []);
    } catch (err) {
      notify('Failed to fetch reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    try {
      setBusy(true);
      await api.post(`/admin/repository/reports/${selectedReport.id}/resolve`, { notes });
      setResolveDialog(false);
      setNotes('');
      notify('Report marked as resolved');
      fetchReports();
    } catch (err) {
      notify('Failed to resolve report', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<FlagIcon />}
        title="Question Reports"
        subtitle="Review and resolve issues reported on repository questions"
      />

      <DataTableShell
        columns={COLUMNS}
        rows={reports}
        loading={loading}
        emptyIcon={<FlagIcon />}
        emptyTitle="No reports"
        emptyMessage="Reported question issues will appear here for review."
        renderRow={(r) => (
          <TableRow key={r.id} hover>
            <TableCell>
              <Typography variant="body2" fontWeight={700}>#{r.id}</Typography>
              <Typography variant="caption" color="text.secondary">{r.question_custom_id}</Typography>
            </TableCell>
            <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.question_text}
            </TableCell>
            <TableCell sx={{ maxWidth: 260 }}>{r.message}</TableCell>
            <TableCell>{r.reporter_name}</TableCell>
            <TableCell>
              <StatusChip status={r.status} />
              {r.status === 'resolved' && r.resolver_name && (
                <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                  by {r.resolver_name}
                </Typography>
              )}
            </TableCell>
            <TableCell align="right">
              {r.status === 'pending' && (
                <Tooltip title="Mark resolved">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => { setSelectedReport(r); setNotes(''); setResolveDialog(true); }}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                </Tooltip>
              )}
            </TableCell>
          </TableRow>
        )}
      />

      <FormDialog
        open={resolveDialog}
        onClose={() => setResolveDialog(false)}
        title={`Resolve Report #${selectedReport?.id || ''}`}
        subtitle="Confirm you have fixed the underlying question in the repository."
        submitLabel="Mark Resolved"
        submitColor="success"
        loading={busy}
        onSubmit={handleResolve}
      >
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Resolution notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormDialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
