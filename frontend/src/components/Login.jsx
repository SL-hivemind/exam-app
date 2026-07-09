import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Alert, IconButton, InputAdornment, Stack, Divider,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import { GlassCard } from './common';
import PaperIntakeLaptop from './ui/PaperIntakeLaptop';

const FEATURES = ['Secure exams', 'Real-time analytics', 'Question bank', 'Multi-device'];

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Redirect logged-in users to their dashboard home.
  useEffect(() => {
    if (!user) return;
    const routes = {
      admin: '/admin',
      school_admin: '/school',
      subject_specialist: '/specialist',
      student: '/student',
      public_user: '/public/dashboard',
    };
    navigate(routes[user.role] || '/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier && !password) { setError('Please enter your username (or Student ID) and password.'); return; }
    if (!identifier) { setError('Please enter your username — students use the Student ID given by your school.'); return; }
    if (!password) { setError('Please enter your password. Students: if you forgot it, use "Forgot password?" to ask your school admin for a reset.'); return; }
    setBusy(true);
    try {
      const res = await api.post('/login', { username: identifier, password });
      const token = res.data.auth_token || res.data.token;
      const userData = res.data.user;
      if (!token || !userData) throw new Error('Invalid response');
      login(userData, token);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: { xs: 2, sm: 3 },
    }}>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        sx={{
          width: '100%', maxWidth: 980, display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' }, gap: { xs: 0, md: 0 },
        }}
      >
        {/* ── Brand panel ── */}
        <Box sx={{
          display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center',
          p: 5, borderRadius: '24px 0 0 24px',
          background: 'rgba(11, 17, 48, 0.4)', // Darker, matching Home
          border: '1px solid rgba(255,255,255,0.08)', borderRight: 'none',
          backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden',
        }}>
          
          <Box sx={{
            position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(246,137,20,0.15), transparent 65%)', filter: 'blur(24px)',
          }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#f5f8ff', lineHeight: 1.2, mb: 1, mt: 1, position: 'relative' }}>
            Your learning{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(120deg,#ffce9e,#f68914)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>starts here</Box>
          </Typography>
          <Typography sx={{ color: '#b4c0e4', lineHeight: 1.7, mb: 1.5, maxWidth: 360, position: 'relative' }}>
            Papers in — insights out. Exams, answer sheets and mark files, all in one place.
          </Typography>

          {/* Papers → laptop brand animation */}
          <Box sx={{ position: 'relative', my: 1 }}>
            <PaperIntakeLaptop scale={0.92} />
          </Box>

          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ position: 'relative', mt: 1.5 }}>
            {FEATURES.map((f) => (
              <Stack key={f} direction="row" alignItems="center" spacing={0.75} sx={{
                px: 1.25, py: 0.5, borderRadius: 99,
                bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
              }}>
                <Box sx={{
                  width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,#f68914,#ffb054)', color: '#fff', fontSize: 10, fontWeight: 800,
                }}>✓</Box>
                <Typography sx={{ color: '#dbe3ff', fontWeight: 500, fontSize: '0.8rem' }}>{f}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* ── Form panel ── */}
        <GlassCard
          glow="orange"
          sx={{
            p: { xs: 3.5, sm: 5 },
            borderRadius: { xs: '24px', md: '0 24px 24px 0' },
            position: 'relative', overflow: 'hidden',
          }}
        >
          <Box component="form" onSubmit={handleSubmit} sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#f5f8ff', mb: 0.5 }}>Welcome back</Typography>
            <Typography variant="body2" sx={{ color: '#aeb9e0', mb: 3 }}>Sign in to continue to your dashboard</Typography>

            {error && (
              <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5 }}>{error}</Alert>
            )}

            <Typography component="label" htmlFor="login-user" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#c7d2fe', display: 'block', mb: 0.75 }}>
              Username or Student ID
            </Typography>
            <TextField
              id="login-user" placeholder="e.g. john_doe or STU2024001" fullWidth autoFocus required
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} sx={{ mb: 0.5 }}
            />
            <Typography sx={{ fontSize: '0.74rem', color: '#7e8abb', mb: 2, lineHeight: 1.5 }}>
              Students: use the Student ID your school gave you (e.g. SCH01-00042). Teachers &amp; admins: use your username.
            </Typography>

            <Typography component="label" htmlFor="login-pw" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#c7d2fe', display: 'block', mb: 0.75 }}>
              Password
            </Typography>
            <TextField
              id="login-pw" placeholder="••••••••" type={showPw ? 'text' : 'password'} fullWidth required
              value={password} onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small" sx={{ color: '#aeb9e0' }}>
                      {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <RouterLink to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography component="span" sx={{ fontSize: '0.82rem', color: '#ffb054', fontWeight: 600, '&:hover': { color: '#f68914' } }}>
                  Forgot password?
                </Typography>
              </RouterLink>
            </Box>

            <Button
              type="submit" fullWidth variant="gradient" disabled={busy}
              startIcon={!busy && <LoginIcon />}
              sx={{ mt: 3, height: 48, fontSize: '0.95rem' }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>

            <Divider sx={{ my: 3 }}>
              <Typography variant="caption" sx={{ color: '#7e8abb' }}>SL Exams</Typography>
            </Divider>
            <Typography variant="body2" sx={{ textAlign: 'center', color: '#aeb9e0' }}>
              Public learner?{' '}
              <RouterLink to="/public/login" style={{ textDecoration: 'none' }}>
                <Box component="span" sx={{ color: '#ffb054', fontWeight: 700 }}>Use the public portal</Box>
              </RouterLink>
            </Typography>
          </Box>
        </GlassCard>
      </Box>
    </Box>
  );
}
