import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, Button, Alert,
  IconButton, InputAdornment, Toolbar
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

/* ═══════════════════════════════════════════════
   INJECT CSS — Google Font + animations
   ═══════════════════════════════════════════════ */
if (!document.getElementById('login-style-inject')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.id = 'login-style-inject';
  style.textContent = `
    @keyframes lgMorph {
      0%, 100% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
      25%      { border-radius: 73% 27% 52% 48% / 26% 59% 41% 74%; }
      50%      { border-radius: 28% 72% 44% 56% / 49% 40% 60% 51%; }
      75%      { border-radius: 65% 35% 27% 73% / 58% 68% 32% 42%; }
    }
    @keyframes lgFloat1 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(30px, -20px) scale(1.05); } }
    @keyframes lgFloat2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-20px, 25px) scale(0.95); } }
    @keyframes lgFloat3 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(15px, 15px); } }
    @keyframes lgEnter  { from { opacity: 0; transform: translateY(32px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes lgCheck  { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => { setReady(true); }, []);

  /* redirect if logged in */
  useEffect(() => {
    if (!user) return;
    const routes = {
      subject_specialist: '/specialist/repository/questions',
      admin: '/admin/exams',
      school_admin: '/school',
      student: '/student',
      public_user: '/portal/dashboard',
    };
    navigate(routes[user.role] || '/', { replace: true });
  }, [user, navigate]);

  /* parallax mouse tracking */
  const handleMouse = useCallback((e) => {
    setMousePos({
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    });
  }, []);

  /* submit */
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

  /* ─── style helpers ─── */
  const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  const px = (mousePos.x - 0.5) * 18;
  const py = (mousePos.y - 0.5) * 18;

  return (
    <Box
      onMouseMove={handleMouse}
      sx={{
        minHeight: '100vh',
        fontFamily: ff,
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8faff 40%, #e0f2fe 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Toolbar />

      {/* ─── Morphing blobs ─── */}
      <Box sx={{
        position: 'fixed', width: 420, height: 420, top: '-5%', right: '-8%',
        background: 'linear-gradient(135deg, rgba(99,182,255,0.18), rgba(56,189,248,0.14))',
        animation: 'lgMorph 12s ease-in-out infinite, lgFloat1 8s ease-in-out infinite',
        filter: 'blur(2px)', zIndex: 0,
        transform: `translate(${px * 0.6}px, ${py * 0.6}px)`,
        transition: 'transform 0.3s ease-out',
      }} />
      <Box sx={{
        position: 'fixed', width: 320, height: 320, bottom: '-3%', left: '-5%',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(59,130,246,0.12))',
        animation: 'lgMorph 15s ease-in-out infinite reverse, lgFloat2 10s ease-in-out infinite',
        filter: 'blur(2px)', zIndex: 0,
        transform: `translate(${px * -0.4}px, ${py * -0.4}px)`,
        transition: 'transform 0.3s ease-out',
      }} />
      <Box sx={{
        position: 'fixed', width: 180, height: 180, top: '55%', left: '45%',
        background: 'rgba(96,165,250,0.1)',
        animation: 'lgMorph 18s ease-in-out infinite, lgFloat3 12s ease-in-out infinite',
        filter: 'blur(1px)', zIndex: 0,
        transform: `translate(${px * 0.3}px, ${py * 0.3}px)`,
        transition: 'transform 0.3s ease-out',
      }} />

      {/* ─── Main Layout ─── */}
      <Box sx={{
        display: 'flex', minHeight: 'calc(100vh - 64px)',
        position: 'relative', zIndex: 1,
        flexDirection: { xs: 'column', md: 'row' },
      }}>

        {/* ═══ LEFT PANEL — Brand + Information ═══ */}
        <Box sx={{
          flex: { md: '0 0 44%' },
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          px: { xs: 3, sm: 5, md: 7 }, py: { xs: 5, md: 0 },
          order: { xs: 2, md: 1 },
        }}>
          <Box sx={{
            animation: ready ? 'lgEnter 0.7s ease-out both' : 'none',
          }}>
            {/* Brand mark */}
            <Box sx={{
              width: 52, height: 52, borderRadius: '16px', mb: 3,
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59,130,246,0.25)',
              transition: 'transform 0.4s ease, box-shadow 0.4s ease',
              cursor: 'default',
              '&:hover': {
                transform: 'rotate(-8deg) scale(1.1)',
                boxShadow: '0 12px 32px rgba(59,130,246,0.35)',
              },
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" fill="#fff" />
                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="rgba(255,255,255,0.7)" />
              </svg>
            </Box>

            <Typography sx={{
              fontFamily: ff, fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 800, color: '#0f172a', lineHeight: 1.2, mb: 1.5,
              letterSpacing: '-0.03em',
            }}>
              Your learning{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                starts here
              </Box>
            </Typography>

            <Typography sx={{
              fontFamily: ff, fontSize: '1rem', color: '#64748b',
              lineHeight: 1.7, maxWidth: 420, mb: 4,
            }}>
              Access comprehensive exams, real-time analytics, and a secure
              testing environment — all from one seamless platform.
            </Typography>

            {/* Feature pills */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
              {['Real-Time Analytics', 'Secure Exams', 'Question Bank', 'Multi-Device'].map((label, i) => (
                <Box key={i} sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.8,
                  px: 2, py: 0.8, borderRadius: '100px',
                  bgcolor: 'rgba(59,130,246,0.06)',
                  border: '1px solid rgba(59,130,246,0.12)',
                  fontFamily: ff, fontSize: '0.82rem', fontWeight: 500,
                  color: '#3b82f6',
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                  animation: ready ? `lgEnter 0.5s ease-out ${0.1 * (i + 2)}s both` : 'none',
                  '&:hover': {
                    bgcolor: 'rgba(59,130,246,0.1)',
                    borderColor: 'rgba(59,130,246,0.25)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.12)',
                  },
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" style={{
                      strokeDasharray: 30,
                      animation: ready ? `lgCheck 0.6s ease-out ${0.1 * (i + 3)}s both` : 'none',
                    }} />
                  </svg>
                  {label}
                </Box>
              ))}
            </Box>

            {/* Trust line - Removd as per requested */}
          </Box>
        </Box>

        {/* ═══ RIGHT PANEL — Login Form ═══ */}
        <Box sx={{
          flex: { md: '1 1 auto' },
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          px: { xs: 2.5, sm: 4, md: 5 }, py: { xs: 4, md: 0 },
          order: { xs: 1, md: 2 },
        }}>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              width: '100%', maxWidth: 420,
              bgcolor: '#fff',
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)',
              p: { xs: 3.5, sm: 4.5 },
              animation: ready ? 'lgEnter 0.6s ease-out 0.1s both' : 'none',
              transition: 'box-shadow 0.4s ease, transform 0.4s ease',
              '&:hover': {
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 20px 56px rgba(0,0,0,0.09)',
              },
            }}
          >
            {/* Header */}
            <Typography sx={{
              fontFamily: ff, fontSize: '1.6rem', fontWeight: 800,
              color: '#0f172a', letterSpacing: '-0.02em', mb: 0.5,
            }}>
              Sign in
            </Typography>
            <Typography sx={{
              fontFamily: ff, fontSize: '0.88rem', color: '#94a3b8', mb: 3.5,
            }}>
              Welcome back — enter your details below
            </Typography>

            {/* Error */}
            {error && (
              <Alert
                severity="error"
                onClose={() => setError('')}
                sx={{
                  mb: 2.5, borderRadius: '12px', fontFamily: ff, fontSize: '0.85rem',
                  bgcolor: '#fef2f2', border: '1px solid #fecaca',
                  '& .MuiAlert-message': { color: '#dc2626' },
                  '& .MuiAlert-icon': { color: '#ef4444' },
                }}
              >
                {error}
              </Alert>
            )}

            {/* Username */}
            <Box sx={{ mb: 2.5 }}>
              <Typography component="label" htmlFor="login-user" sx={{
                fontFamily: ff, fontSize: '0.82rem', fontWeight: 600,
                color: '#334155', display: 'block', mb: 0.8,
              }}>
                Username or Student ID
              </Typography>
              <TextField
                id="login-user"
                placeholder="e.g. john_doe or STU2024001"
                fullWidth
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoFocus
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: ff, fontSize: '0.9rem', borderRadius: '10px',
                    bgcolor: '#f8fafc', height: 46,
                    transition: 'all 0.25s ease',
                    '& fieldset': { borderColor: '#e2e8f0', transition: 'border-color 0.25s ease' },
                    '&:hover fieldset': { borderColor: '#93c5fd' },
                    '&.Mui-focused': {
                      bgcolor: '#fff',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 },
                  },
                }}
              />
            </Box>

            {/* Password */}
            <Box sx={{ mb: 1 }}>
              <Typography component="label" htmlFor="login-pw" sx={{
                fontFamily: ff, fontSize: '0.82rem', fontWeight: 600,
                color: '#334155', display: 'block', mb: 0.8,
              }}>
                Password
              </Typography>
              <TextField
                id="login-pw"
                placeholder="••••••••"
                type={showPw ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: ff, fontSize: '0.9rem', borderRadius: '10px',
                    bgcolor: '#f8fafc', height: 46,
                    transition: 'all 0.25s ease',
                    '& fieldset': { borderColor: '#e2e8f0', transition: 'border-color 0.25s ease' },
                    '&:hover fieldset': { borderColor: '#93c5fd' },
                    '&.Mui-focused': {
                      bgcolor: '#fff',
                      boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
                    },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPw(!showPw)}
                        edge="end"
                        size="small"
                        sx={{
                          color: '#94a3b8',
                          transition: 'color 0.2s ease',
                          '&:hover': { color: '#3b82f6', bgcolor: 'rgba(59,130,246,0.06)' },
                        }}
                      >
                        {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Forgot Password */}
            <Box sx={{ textAlign: 'right', mt: 0.5 }}>
              <RouterLink to="/forgot-password" style={{ textDecoration: 'none' }}>
                <Typography sx={{
                  fontFamily: ff, fontSize: '0.82rem', color: '#3b82f6',
                  fontWeight: 500, cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  '&:hover': { color: '#2563eb' },
                }}>
                  Forgot password?
                </Typography>
              </RouterLink>
            </Box>

            {/* Submit */}
            <Button
              id="login-submit"
              type="submit"
              fullWidth
              disabled={busy}
              sx={{
                mt: 3, height: 48, borderRadius: '12px',
                fontFamily: ff, fontWeight: 700, fontSize: '0.92rem',
                textTransform: 'none', color: '#fff',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                position: 'relative', overflow: 'hidden',
                '&::before': {
                  content: '""', position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                  transform: 'translateX(-100%)',
                  transition: 'transform 0.5s ease',
                },
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(59,130,246,0.4)',
                  transform: 'translateY(-2px)',
                  '&::before': { transform: 'translateX(100%)' },
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
                },
                '&.Mui-disabled': {
                  background: 'linear-gradient(135deg, #93c5fd, #60a5fa)',
                  color: '#fff', boxShadow: 'none',
                },
              }}
            >
              {busy ? 'Signing in…' : 'Sign in →'}
            </Button>

            {/* Divider — hidden for now */}
            <Box sx={{
              display: 'none', /* set to 'flex' to re-enable */
              alignItems: 'center', my: 3,
              '&::before, &::after': {
                content: '""', flex: 1, height: '1px', bgcolor: '#e2e8f0',
              },
            }}>
              <Typography sx={{
                fontFamily: ff, fontSize: '0.75rem', color: '#94a3b8',
                px: 2, fontWeight: 500,
              }}>
                New to SL Exams?
              </Typography>
            </Box>

            {/* Register link — hidden for now */}
            <RouterLink to="/register" style={{ textDecoration: 'none', display: 'none' }}>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  height: 44, borderRadius: '12px',
                  fontFamily: ff, fontWeight: 600, fontSize: '0.88rem',
                  textTransform: 'none',
                  borderColor: '#e2e8f0', color: '#334155',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: '#3b82f6', color: '#3b82f6',
                    bgcolor: 'rgba(59,130,246,0.04)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(59,130,246,0.1)',
                  },
                }}
              >
                Create an account
              </Button>
            </RouterLink>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}