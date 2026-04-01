import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function RepoReports() {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [resolveDialog, setResolveDialog] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/repository/reports');
            setReports(res.data.reports || []);
        } catch (err) {
            console.error('Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        try {
            await api.post(`/admin/repository/reports/${selectedReport.id}/resolve`, { notes });
            setResolveDialog(false);
            setNotes('');
            fetchReports();
        } catch (err) {
            alert('Failed to resolve report');
        }
    };

    if (loading) return <Box p={3}><Typography>Loading reports...</Typography></Box>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight={700} color="primary.main" mb={1}>
                Question Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={4}>
                Review and resolve mistakes reported by School Admins
            </Typography>

            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell>ID / Repo ID</TableCell>
                            <TableCell>Question Snippet</TableCell>
                            <TableCell>Report Detail</TableCell>
                            <TableCell>Reported By</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {reports.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={600}>#{r.id}</Typography>
                                    <Typography variant="caption" color="text.secondary">{r.question_custom_id}</Typography>
                                </TableCell>
                                <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {r.question_text}
                                </TableCell>
                                <TableCell>{r.message}</TableCell>
                                <TableCell>{r.reporter_name}</TableCell>
                                <TableCell>
                                    <Chip 
                                        size="small" 
                                        label={r.status.toUpperCase()} 
                                        color={r.status === 'resolved' ? 'success' : 'warning'} 
                                    />
                                    {r.status === 'resolved' && (
                                        <Typography variant="caption" display="block" color="text.secondary" mt={0.5}>
                                            by {r.resolver_name}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="right">
                                    {r.status === 'pending' && (
                                        <IconButton size="small" color="primary" onClick={() => { setSelectedReport(r); setResolveDialog(true); }}>
                                            <CheckCircleIcon />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {reports.length === 0 && (
                            <TableRow><TableCell colSpan={6} align="center">No reports found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>

            <Dialog open={resolveDialog} onClose={() => setResolveDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle>Resolve Report #{selectedReport?.id}</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" gutterBottom>
                        Marking this report as resolved. Please ensure you have fixed the question in the repository.
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Resolution Notes (Optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setResolveDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="success" onClick={handleResolve}>Mark Resolved</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
