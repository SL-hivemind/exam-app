import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Alert, IconButton,
  InputAdornment, CircularProgress, Container,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { publicApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PublicLogin() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user && user.role === 'public_user') navigate('/public/dashboard', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('All fields are required'); return; }
    setBusy(true);
    try {
      const res = await publicApi.login({ email, password });
      const token = res.data.auth_token;
      const userData = res.data.user;
      if (token && userData) {
        login(userData, token);
        navigate('/public/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setBusy(false); }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontFamily: ff, fontSize: '0.9rem', borderRadius: '10px',
      bgcolor: 'transparent', height: 46,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: '#93c5fd' },
      '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.05)', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
      '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 },
    },
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Box sx={{ maxWidth: 420, mx: 'auto' }}>
        <Box
          component="form" onSubmit={handleSubmit}
          sx={{
            bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '20px', p: { xs: 3.5, sm: 4.5 },
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px', mb: 2,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(59,130,246,0.25)',
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>SL</Typography>
          </Box>

          <Typography sx={{ fontFamily: ff, fontSize: '1.5rem', fontWeight: 800, color: '#eaf0ff', mb: 0.5 }}>
            Sign In
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#aeb9e0', mb: 3 }}>
            Access your public exam dashboard
          </Typography>

          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

          <Box sx={{ mb: 2 }}>
            <Typography component="label" htmlFor="public-email" sx={{
              fontFamily: ff, fontSize: '0.82rem', fontWeight: 600, color: '#c7d2fe', display: 'block', mb: 0.8,
            }}>Email</Typography>
            <TextField id="public-email" fullWidth placeholder="your@email.com" type="email"
              value={email} onChange={e => setEmail(e.target.value)} required size="small" sx={inputSx} />
          </Box>

          <Box sx={{ mb: 1 }}>
            <Typography component="label" htmlFor="public-pw" sx={{
              fontFamily: ff, fontSize: '0.82rem', fontWeight: 600, color: '#c7d2fe', display: 'block', mb: 0.8,
            }}>Password</Typography>
            <TextField id="public-pw" fullWidth placeholder="••••••••" type={showPw ? 'text' : 'password'}
              value={password} onChange={e => setPassword(e.target.value)} required size="small" sx={inputSx}
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
          </Box>

          <Box sx={{ textAlign: 'right', mt: 0.5 }}>
            <RouterLink to="/public/forgot-password" style={{ textDecoration: 'none' }}>
              <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#9fc1ff', fontWeight: 500, cursor: 'pointer' }}>
                Forgot password?
              </Typography>
            </RouterLink>
          </Box>

          <Button fullWidth type="submit" disabled={busy} sx={{
            mt: 3, height: 48, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
            textTransform: 'none', color: '#fff',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
            '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)', transform: 'translateY(-2px)' },
            transition: 'all 0.2s ease',
          }}>
            {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign in →'}
          </Button>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#aeb9e0' }}>
              Don't have an account?{' '}
              <RouterLink to="/public/register" style={{ color: '#9fc1ff', fontWeight: 600, textDecoration: 'none' }}>
                Create one
              </RouterLink>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
