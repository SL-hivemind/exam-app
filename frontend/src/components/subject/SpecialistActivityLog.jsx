import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, Chip, Stack, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

export default function SpecialistActivityLog() {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/audit-logs').then(res => setLogs(res.data.logs)).catch(console.error);
  }, []);

  const getLogColor = (action) => {
    if (action.includes('PASSWORD')) return 'error';
    if (action.includes('REPORT')) return 'success';
    return 'info';
  };

  const getLogLabel = (action) => {
    if (action === 'QUESTION_EDIT') return 'Question Edit';
    if (action === 'LOCAL_QUESTION_EDIT') return 'Local Edit';
    if (action === 'PASSWORD_RESET') return 'Password Reset';
    if (action === 'REPORT_RESOLVED') return 'Report Resolved';
    return action;
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'transparent', minHeight: '100vh' }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Button startIcon={<ArrowBackIcon/>} onClick={() => navigate(-1)}>Back</Button>
            <Typography variant="h5" fontWeight={700}>System Activity Log</Typography>
        </Stack>

        <Paper elevation={2} sx={{ overflowX: 'auto' }}>
            <Table>
                <TableHead sx={{ bgcolor: 'rgba(99,102,241,0.20)' }}>
                    <TableRow>
                        <TableCell><strong>Time</strong></TableCell>
                        <TableCell><strong>Author</strong></TableCell>
                        <TableCell><strong>Action Category</strong></TableCell>
                        <TableCell><strong>Target ID</strong></TableCell>
                        <TableCell><strong>Change Details</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {logs.map(log => (
                        <TableRow key={log.id} hover>
                            <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                            <TableCell>{log.username}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={getLogLabel(log.action)} 
                                    color={getLogColor(log.action)} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </TableCell>
                            <TableCell>
                                {log.target_type === 'question' && `Repo Q#${log.target_id || ''}`}
                                {log.target_type === 'user' && `User #${log.target_id || ''}`}
                                {log.target_type === 'report' && `Report #${log.target_id || ''}`}
                                {!log.target_type && `#${log.target_id || ''}`}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#444' }}>
                                {log.details}
                            </TableCell>
                        </TableRow>
                    ))}
                    {logs.length === 0 && (
                        <TableRow><TableCell colSpan={5} align="center">No activity recorded yet.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </Paper>
    </Box>
  );
}