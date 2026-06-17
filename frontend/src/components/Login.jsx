import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Alert, IconButton, InputAdornment, Stack, Divider,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SchoolIcon from '@mui/icons-material/School';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';
import { GlassCard } from './common';

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
    if (!identifier || !password) { setError('Please fill in all fields.'); return; }
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
          background: 'linear-gradient(150deg, rgba(47,107,255,0.22), rgba(246,137,20,0.16))',
          border: '1px solid rgba(255,255,255,0.10)', borderRight: 'none',
          backdropFilter: 'blur(16px)', position: 'relative', overflow: 'hidden',
        }}>
          <Box sx={{
            position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(246,137,20,0.35), transparent 65%)', filter: 'blur(24px)',
          }} />
          <Stack direction="row" alignItems="center" spacing={1.4} sx={{ mb: 4, position: 'relative' }}>
            <Box sx={{
              width: 46, height: 46, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#2f6bff,#f68914)', boxShadow: '0 8px 22px rgba(246,137,20,0.45)',
            }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Typography sx={{
              fontWeight: 800, fontSize: '1.4rem',
              background: 'linear-gradient(120deg,#ffffff,#ffce9e)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              SL EXAMS
            </Typography>
          </Stack>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#f5f8ff', lineHeight: 1.2, mb: 1.5, position: 'relative' }}>
            Your learning{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(120deg,#6f9bff,#ffb054)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>starts here</Box>
          </Typography>
          <Typography sx={{ color: '#b4c0e4', lineHeight: 1.7, mb: 3.5, maxWidth: 360, position: 'relative' }}>
            Comprehensive exams, real-time analytics and a secure testing environment — all in one place.
          </Typography>
          <Stack spacing={1.25} sx={{ position: 'relative' }}>
            {FEATURES.map((f) => (
              <Stack key={f} direction="row" alignItems="center" spacing={1.25}>
                <Box sx={{
                  width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,#2f6bff,#f68914)', color: '#fff', fontSize: 13, fontWeight: 800,
                }}>✓</Box>
                <Typography sx={{ color: '#dbe3ff', fontWeight: 500 }}>{f}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* ── Form panel ── */}
        <GlassCard
          sx={{
            p: { xs: 3.5, sm: 5 },
            borderRadius: { xs: '24px', md: '0 24px 24px 0' },
          }}
        >
          <Box component="form" onSubmit={handleSubmit}>
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
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} sx={{ mb: 2.5 }}
            />

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
                <Box component="span" sx={{ color: '#6f9bff', fontWeight: 700 }}>Use the public portal</Box>
              </RouterLink>
            </Typography>
          </Box>
        </GlassCard>
      </Box>
    </Box>
  );
}
