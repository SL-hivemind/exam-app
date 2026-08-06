import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Card, Chip, Alert,
  CircularProgress, InputAdornment,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import TimerIcon from '@mui/icons-material/Timer';
import QuizIcon from '@mui/icons-material/Quiz';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useParams, useNavigate } from 'react-router-dom';
import { quickApi } from '../../utils/api';
import { Seo } from '../common';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function QuickLanding() {
  const { code: urlCode } = useParams();
  const navigate = useNavigate();

  const [code, setCode] = useState(urlCode || '');
  const [name, setName] = useState('');
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Look up exam by code
  const lookupExam = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    setExamInfo(null);
    try {
      const res = await quickApi.getInfo(code.trim().toUpperCase());
      setExamInfo(res.data.exam);
    } catch (err) {
      setError(err.response?.data?.message || 'Exam not found. Check your code.');
    } finally { setLoading(false); }
  };

  // Step 2: Start exam
  const startExam = () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    navigate(`/quick/${examInfo.code}/exam`, { state: { name: name.trim(), exam: examInfo } });
  };

  // Auto-lookup if code came from URL
  React.useEffect(() => {
    if (urlCode) lookupExam();
  }, []);

  return (
    <>
    {/* Only the bare /quick landing is indexable. A /quick/:code URL is an
        ephemeral invitation to one specific test — indexing those would
        publish exam codes and leave dead links behind when they expire. */}
    <Seo
      path="/quick"
      title="Take a Quick Test with an Exam Code"
      description="Enter the code your teacher gave you to start a quick online test. No account needed."
      noindex={Boolean(urlCode)}
    />
    <Box sx={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 2,
    }}>
      <Card sx={{
        maxWidth: 480, width: '100%', borderRadius: '24px', p: { xs: 3, sm: 4 },
        background: 'rgba(255,255,255,0.97)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 64, height: 64, borderRadius: '18px', mx: 'auto', mb: 2,
            background: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <QuizIcon sx={{ fontSize: 32, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.5rem', color: '#eaf0ff' }}>
            Quick Exam
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#a9b4dd', mt: 0.5 }}>
            No sign-up needed. Enter the code and start.
          </Typography>
        </Box>

        {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '12px', mb: 2.5, fontFamily: ff }}>{error}</Alert>}

        {!examInfo ? (
          /* ── Step 1: Enter Code ── */
          <Box>
            <TextField
              fullWidth
              label="Exam Code"
              placeholder="e.g. ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && lookupExam()}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LinkIcon sx={{ color: '#aeb9e0' }} /></InputAdornment>,
                sx: { fontFamily: ff, fontWeight: 700, fontSize: '1.2rem', letterSpacing: 3, borderRadius: '14px', textAlign: 'center' },
              }}
              sx={{ mb: 3 }}
            />
            <Button
              fullWidth variant="contained" size="large"
              onClick={lookupExam}
              disabled={loading || !code.trim()}
              sx={{
                fontFamily: ff, fontWeight: 700, fontSize: '1rem', textTransform: 'none',
                borderRadius: '14px', py: 1.5,
                background: '#2563eb',
                boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Find Exam'}
            </Button>
          </Box>
        ) : (
          /* ── Step 2: Exam Found — Enter Name ── */
          <Box>
            {/* Exam Info Card */}
            <Box sx={{
              p: 2.5, mb: 3, borderRadius: '16px',
              background: 'rgba(37,99,235,0.06)',
              border: '1px solid rgba(37,99,235,0.12)',
            }}>
              <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#eaf0ff', mb: 1.5 }}>
                {examInfo.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip icon={<QuizIcon sx={{ fontSize: 16 }} />}
                  label={`${examInfo.total_questions} Questions`} size="small"
                  sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(37,99,235,0.1)', color: '#cfe0ff' }} />
                <Chip icon={<TimerIcon sx={{ fontSize: 16 }} />}
                  label={`${examInfo.duration_minutes} min`} size="small"
                  sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706' }} />
                <Chip label={`Code: ${examInfo.code}`} size="small"
                  sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(255,255,255,0.06)', color: '#9fb0d6' }} />
              </Box>
            </Box>

            {/* Name Input */}
            <TextField
              fullWidth
              label="Your Name"
              placeholder="Enter your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startExam()}
              InputProps={{
                startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: '#aeb9e0' }} /></InputAdornment>,
                sx: { fontFamily: ff, fontWeight: 600, borderRadius: '14px' },
              }}
              sx={{ mb: 3 }}
            />
            <Button
              fullWidth variant="contained" size="large"
              onClick={startExam}
              disabled={!name.trim()}
              endIcon={<ArrowForwardIcon />}
              sx={{
                fontFamily: ff, fontWeight: 700, fontSize: '1rem', textTransform: 'none',
                borderRadius: '14px', py: 1.5,
                background: '#16a34a',
                boxShadow: '0 8px 24px rgba(34,197,94,0.3)',
              }}
            >
              Start Exam
            </Button>
            <Button
              fullWidth size="small"
              onClick={() => { setExamInfo(null); setCode(''); }}
              sx={{ fontFamily: ff, textTransform: 'none', mt: 1.5, color: '#a9b4dd' }}
            >
              Use a different code
            </Button>
          </Box>
        )}
      </Card>
    </Box>
    </>
  );
}
