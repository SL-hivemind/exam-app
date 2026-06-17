import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Alert, CircularProgress, IconButton, Tooltip,
  Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Table, TableHead, TableRow, TableCell, TableBody, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PeopleIcon from '@mui/icons-material/People';
import TimerIcon from '@mui/icons-material/Timer';
import QuizIcon from '@mui/icons-material/Quiz';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { quickApi } from '../../utils/api';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function AdminQuickExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [duration, setDuration] = useState(30);
  const [expiresIn, setExpiresIn] = useState('7d');

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailExam, setDetailExam] = useState(null);
  const [detailQuestions, setDetailQuestions] = useState([]);
  const [detailResponses, setDetailResponses] = useState([]);

  const loadExams = async () => {
    try {
      const res = await quickApi.listExams();
      setExams(res.data.exams || []);
    } catch { setError('Failed to load exams'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadExams(); }, []);

  const handleCreate = async () => {
    if (!title.trim() || !rawText.trim()) return;
    setBusy(true);
    try {
      const res = await quickApi.createExam({
        title: title.trim(),
        raw_text: rawText,
        duration_minutes: duration,
        expires_in: expiresIn,
      });
      setMsg(`Exam created! Code: ${res.data.share_code}`);
      setCreateOpen(false);
      setTitle(''); setRawText('');
      loadExams();
    } catch (err) {
      setError(err.response?.data?.message || 'Creation failed');
    } finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quick exam and all responses?')) return;
    try {
      await quickApi.deleteExam(id);
      setMsg('Exam deleted');
      loadExams();
    } catch { setError('Delete failed'); }
  };

  const handleToggle = async (id, currentActive) => {
    try {
      await quickApi.toggleExam(id, { is_active: !currentActive });
      loadExams();
    } catch { setError('Toggle failed'); }
  };

  const openDetail = async (examId) => {
    try {
      const res = await quickApi.getExam(examId);
      setDetailExam(res.data.exam);
      setDetailQuestions(res.data.questions || []);
      setDetailResponses(res.data.responses || []);
      setDetailOpen(true);
    } catch { setError('Failed to load details'); }
  };

  const copyLink = (code) => {
    const url = `${window.location.origin}/quick/${code}`;
    navigator.clipboard.writeText(url);
    setMsg('Link copied to clipboard!');
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontFamily: ff, borderRadius: '12px', fontSize: '0.9rem',
    },
    '& .MuiInputLabel-root': { fontFamily: ff },
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.5rem' }, color: '#eaf0ff' }}>
            Quick Exams
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#a9b4dd' }}>
            Create link-based exams — no login required for participants
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}
          sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
          Create Quick Exam
        </Button>
      </Box>

      {msg && <Alert severity="success" onClose={() => setMsg('')} sx={{ mb: 2, borderRadius: '12px', fontFamily: ff }}>{msg}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '12px', fontFamily: ff }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : exams.length === 0 ? (
        <Card sx={{ borderRadius: '18px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none', p: 6, textAlign: 'center' }}>
          <ContentPasteIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#a9b4dd', mb: 1 }}>No Quick Exams Yet</Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#aeb9e0' }}>
            Create your first quick exam — paste questions, get a shareable link.
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {exams.map(exam => (
            <Card key={exam.id} sx={{
              borderRadius: '16px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'none',
              p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center',
              opacity: exam.is_expired ? 0.6 : 1,
            }}>
              {/* Info */}
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#eaf0ff', mb: 0.5 }}>
                  {exam.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Chip label={`Code: ${exam.code}`} size="small"
                    sx={{ fontFamily: ff, fontWeight: 800, bgcolor: 'rgba(255,255,255,0.06)', color: '#9fb0d6', letterSpacing: 1 }} />
                  <Chip icon={<QuizIcon sx={{ fontSize: 14 }} />} label={`${exam.total_questions} Q`} size="small"
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(37,99,235,0.08)', color: '#cfe0ff', '& .MuiChip-icon': { color: '#cfe0ff' } }} />
                  <Chip icon={<TimerIcon sx={{ fontSize: 14 }} />} label={`${exam.duration_minutes} min`} size="small"
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(245,158,11,0.08)', color: '#d97706', '& .MuiChip-icon': { color: '#d97706' } }} />
                  <Chip icon={<PeopleIcon sx={{ fontSize: 14 }} />} label={`${exam.response_count || 0} responses`} size="small"
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(168,85,247,0.08)', color: '#f68914', '& .MuiChip-icon': { color: '#f68914' } }} />
                  {exam.is_expired && <Chip label="Expired" size="small" sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444' }} />}
                  {!exam.is_active && !exam.is_expired && <Chip label="Paused" size="small" sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706' }} />}
                </Box>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Tooltip title="Copy Link">
                  <IconButton onClick={() => copyLink(exam.code)}><ContentCopyIcon sx={{ fontSize: 20, color: '#cfe0ff' }} /></IconButton>
                </Tooltip>
                <Tooltip title="View Responses">
                  <IconButton onClick={() => openDetail(exam.id)}><VisibilityIcon sx={{ fontSize: 20, color: '#f68914' }} /></IconButton>
                </Tooltip>
                <Tooltip title={exam.is_active ? 'Pause' : 'Activate'}>
                  <Switch size="small" checked={exam.is_active && !exam.is_expired} onChange={() => handleToggle(exam.id, exam.is_active)}
                    disabled={exam.is_expired} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' } }} />
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton onClick={() => handleDelete(exam.id)}><DeleteIcon sx={{ fontSize: 20, color: '#ef4444' }} /></IconButton>
                </Tooltip>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContentPasteIcon sx={{ color: '#cfe0ff' }} /> Create Quick Exam
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Exam Title" value={title} onChange={e => setTitle(e.target.value)}
            sx={{ ...inputSx, mb: 2, mt: 1 }} size="small" placeholder="e.g. GK Quiz - May 2026" />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField label="Duration (min)" type="number" value={duration}
              onChange={e => setDuration(e.target.value)} sx={{ ...inputSx, width: 140 }} size="small" />
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel sx={{ fontFamily: ff }}>Expires In</InputLabel>
              <Select value={expiresIn} onChange={e => setExpiresIn(e.target.value)} label="Expires In"
                sx={{ fontFamily: ff, borderRadius: '12px' }}>
                <MenuItem value="1h">1 Hour</MenuItem>
                <MenuItem value="6h">6 Hours</MenuItem>
                <MenuItem value="24h">24 Hours</MenuItem>
                <MenuItem value="7d">7 Days</MenuItem>
                <MenuItem value="30d">30 Days</MenuItem>
                <MenuItem value="never">Never</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#a9b4dd', mb: 1 }}>
            Paste your questions below. Format: <code style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>1. Question? A) opt B) opt C) opt D) opt Answer: B</code>
          </Typography>
          <TextField fullWidth multiline rows={14} value={rawText} onChange={e => setRawText(e.target.value)}
            placeholder={"1. What is the capital of India?\nA) Mumbai\nB) New Delhi\nC) Chennai\nD) Kolkata\nAnswer: B\nExplanation: New Delhi is the capital.\n\n2. Who wrote Hamlet?\nA) Dickens\nB) Shakespeare\nC) Austen\nD) Twain\nAnswer: B"}
            sx={{ ...inputSx, '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={busy || !title.trim() || !rawText.trim()} variant="contained"
            startIcon={busy ? <CircularProgress size={16} /> : <ContentPasteIcon />}
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
            Parse & Create Exam
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail / Responses Dialog ── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>
          {detailExam?.title || 'Exam'} — Responses
        </DialogTitle>
        <DialogContent>
          {detailExam && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`Code: ${detailExam.code}`} size="small" sx={{ fontFamily: ff, fontWeight: 800 }} />
              <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyLink(detailExam.code)}
                sx={{ fontFamily: ff, textTransform: 'none', fontSize: '0.75rem' }}>
                Copy Link
              </Button>
            </Box>
          )}

          {detailResponses.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
              <Typography sx={{ fontFamily: ff, color: '#aeb9e0' }}>No responses yet. Share the link!</Typography>
            </Box>
          ) : (
            <>
              {/* Leaderboard */}
              <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.9rem', color: '#eaf0ff', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmojiEventsIcon sx={{ fontSize: 18, color: '#f59e0b' }} /> Leaderboard
              </Typography>
              <Box sx={{ overflowX: 'auto', mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'transparent' }}>
                      <TableCell sx={{ fontFamily: ff, fontWeight: 700, color: '#9fb0d6' }}>#</TableCell>
                      <TableCell sx={{ fontFamily: ff, fontWeight: 700, color: '#9fb0d6' }}>Name</TableCell>
                      <TableCell align="center" sx={{ fontFamily: ff, fontWeight: 700, color: '#9fb0d6' }}>Score</TableCell>
                      <TableCell align="center" sx={{ fontFamily: ff, fontWeight: 700, color: '#9fb0d6' }}>%</TableCell>
                      <TableCell sx={{ fontFamily: ff, fontWeight: 700, color: '#9fb0d6' }}>Submitted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...detailResponses]
                      .sort((a, b) => b.score - a.score)
                      .map((r, i) => (
                        <TableRow key={r.id} sx={{ bgcolor: i === 0 ? 'rgba(245,158,11,0.05)' : 'inherit' }}>
                          <TableCell sx={{ fontFamily: ff, fontWeight: 700, color: i === 0 ? '#f59e0b' : '#64748b' }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </TableCell>
                          <TableCell sx={{ fontFamily: ff, fontWeight: 600, color: '#eaf0ff' }}>{r.participant_name}</TableCell>
                          <TableCell align="center" sx={{ fontFamily: ff, fontWeight: 700, color: r.score >= r.total * 0.6 ? '#16a34a' : '#ef4444' }}>
                            {r.score}/{r.total}
                          </TableCell>
                          <TableCell align="center" sx={{ fontFamily: ff, color: '#a9b4dd' }}>
                            {r.total > 0 ? Math.round((r.score / r.total) * 100) : 0}%
                          </TableCell>
                          <TableCell sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#aeb9e0' }}>
                            {r.submitted_at ? new Date(r.submitted_at + 'Z').toLocaleString() : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
