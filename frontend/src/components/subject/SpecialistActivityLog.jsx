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

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Button startIcon={<ArrowBackIcon/>} onClick={() => navigate(-1)}>Back</Button>
            <Typography variant="h5" fontWeight={700}>Activity Log</Typography>
        </Stack>

        <Paper elevation={2}>
            <Table>
                <TableHead sx={{ bgcolor: '#e3f2fd' }}>
                    <TableRow>
                        <TableCell><strong>Time</strong></TableCell>
                        <TableCell><strong>User</strong></TableCell>
                        <TableCell><strong>Action</strong></TableCell>
                        <TableCell><strong>Question ID</strong></TableCell>
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
                                    label={log.action} 
                                    color={log.action === 'UPDATE' ? 'info' : 'default'} 
                                    size="small" 
                                />
                            </TableCell>
                            <TableCell>#{log.question_id}</TableCell>
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