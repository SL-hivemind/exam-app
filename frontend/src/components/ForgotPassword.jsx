import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert,
  IconButton, InputAdornment, Toolbar, Stack
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

/* ═══════════════════════════════════════════════
   INJECT CSS — reuse Login page styles
   ═══════════════════════════════════════════════ */
if (!document.getElementById('fp-style-inject')) {
  const style = document.createElement('style');
  style.id = 'fp-style-inject';
  style.textContent = `
    @keyframes fpEnter { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fpMorph {
      0%, 100% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
      50%      { border-radius: 28% 72% 44% 56% / 49% 40% 60% 51%; }
    }
  `;
  document.head.appendChild(style);
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

  // Steps: 'username' → 'otp' → 'done' or 'student_done'
  const [step, setStep] = useState('username');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [emailHint, setEmailHint] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleInit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Please enter your username or student ID'); return; }
    setBusy(true);
    try {
      const res = await api.post('/forgot-password/init', { username: username.trim() });
      const action = res.data?.action;

      if (action === 'otp_sent') {
        setEmailHint(res.data?.email_hint || '');
        setStep('otp');
      } else if (action === 'student_request') {
        setSuccessMsg(res.data?.message);
        setStep('student_done');
      } else if (action === 'no_email') {
        setError(res.data?.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp) { setError('Please enter the OTP'); return; }
    if (!newPw || !confirmPw) { setError('Please fill all fields'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return; }

    setBusy(true);
    try {
      await api.post('/forgot-password/reset', {
        username: username.trim(), otp, new_password: newPw,
      });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', fontFamily: ff,
      background: 'linear-gradient(135deg, #eff6ff 0%, #f8faff 40%, #e0f2fe 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <Toolbar />

      {/* Decorative blobs */}
      <Box sx={{
        position: 'fixed', width: 350, height: 350, top: '-8%', right: '-6%',
        background: 'linear-gradient(135deg, rgba(99,182,255,0.15), rgba(56,189,248,0.12))',
        animation: 'fpMorph 12s ease-in-out infinite',
        filter: 'blur(2px)', zIndex: 0,
      }} />
      <Box sx={{
        position: 'fixed', width: 280, height: 280, bottom: '-5%', left: '-4%',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(59,130,246,0.1))',
        animation: 'fpMorph 15s ease-in-out infinite reverse',
        filter: 'blur(2px)', zIndex: 0,
      }} />

      <Box sx={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: 'calc(100vh - 64px)', position: 'relative', zIndex: 1,
        px: 2,
      }}>
        <Box sx={{
          width: '100%', maxWidth: 440, bgcolor: '#fff',
          borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)',
          p: { xs: 3.5, sm: 4.5 },
          animation: 'fpEnter 0.6s ease-out both',
        }}>

          {/* ── Step 1: Enter Username ── */}
          {step === 'username' && (
            <Box component="form" onSubmit={handleInit}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <LockResetIcon sx={{ color: '#3b82f6', fontSize: 28 }} />
                <Typography sx={{ fontFamily: ff, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                  Forgot Password
                </Typography>
              </Stack>
              <Typography sx={{ fontFamily: ff, fontSize: '0.88rem', color: '#94a3b8', mb: 3 }}>
                Enter your username or student ID to get started
              </Typography>

              {error && (
                <Alert severity="error" onClose={() => setError('')}
                  sx={{ mb: 2, borderRadius: '12px', fontFamily: ff, fontSize: '0.85rem' }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth placeholder="Username or Student ID"
                value={username} onChange={(e) => setUsername(e.target.value)}
                autoFocus required variant="outlined" size="small"
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    fontFamily: ff, fontSize: '0.9rem', borderRadius: '10px',
                    bgcolor: '#f8fafc', height: 46,
                    '& fieldset': { borderColor: '#e2e8f0' },
                    '&:hover fieldset': { borderColor: '#93c5fd' },
                    '&.Mui-focused': { bgcolor: '#fff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 },
                  },
                }}
              />

              <Button type="submit" fullWidth disabled={busy}
                sx={{
                  height: 46, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
                  fontSize: '0.92rem', textTransform: 'none', color: '#fff',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                  '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)', transform: 'translateY(-1px)' },
                }}>
                {busy ? 'Checking...' : 'Continue'}
              </Button>

              <Button fullWidth onClick={() => navigate('/login')} startIcon={<ArrowBackIcon />}
                sx={{ mt: 1.5, fontFamily: ff, textTransform: 'none', color: '#64748b' }}>
                Back to Login
              </Button>
            </Box>
          )}

          {/* ── Step 2: OTP + New Password (Admin roles) ── */}
          {step === 'otp' && (
            <Box component="form" onSubmit={handleReset}>
              <Typography sx={{ fontFamily: ff, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                Verify OTP
              </Typography>
              <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#64748b', mb: 3 }}>
                We sent a 6-digit code to <strong>{emailHint}</strong>
              </Typography>

              {error && (
                <Alert severity="error" onClose={() => setError('')}
                  sx={{ mb: 2, borderRadius: '12px', fontFamily: ff }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth label="OTP Code" placeholder="Enter 6-digit code"
                value={otp} onChange={(e) => setOtp(e.target.value)}
                inputProps={{ maxLength: 6 }} autoFocus
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { fontFamily: ff, borderRadius: '10px' } }}
              />
              <TextField
                fullWidth label="New Password" type={showPw ? 'text' : 'password'}
                value={newPw} onChange={(e) => setNewPw(e.target.value)}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { fontFamily: ff, borderRadius: '10px' } }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small">
                        {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth label="Confirm Password" type={showPw ? 'text' : 'password'}
                value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { fontFamily: ff, borderRadius: '10px' } }}
              />

              <Button type="submit" fullWidth disabled={busy}
                sx={{
                  height: 46, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
                  textTransform: 'none', color: '#fff',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                  '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)' },
                }}>
                {busy ? 'Resetting...' : 'Reset Password'}
              </Button>

              <Button fullWidth onClick={() => { setStep('username'); setError(''); }}
                sx={{ mt: 1, fontFamily: ff, textTransform: 'none', color: '#64748b' }}>
                ← Try a different username
              </Button>
            </Box>
          )}

          {/* ── Done: Password reset ── */}
          {step === 'done' && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#22c55e', mb: 2 }} />
              <Typography sx={{ fontFamily: ff, fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', mb: 1 }}>
                Password Reset!
              </Typography>
              <Typography sx={{ fontFamily: ff, color: '#64748b', mb: 3 }}>
                Your password has been updated. You can now log in with your new password.
              </Typography>
              <Button fullWidth variant="contained" onClick={() => navigate('/login')}
                sx={{
                  height: 46, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                }}>
                Go to Login
              </Button>
            </Box>
          )}

          {/* ── Done: Student request submitted ── */}
          {step === 'student_done' && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#f59e0b', mb: 2 }} />
              <Typography sx={{ fontFamily: ff, fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', mb: 1 }}>
                Request Submitted
              </Typography>
              <Typography sx={{ fontFamily: ff, color: '#64748b', mb: 3 }}>
                {successMsg || 'Your password reset request has been sent to your school admin. They will set a new password for you.'}
              </Typography>
              <Button fullWidth variant="contained" onClick={() => navigate('/login')}
                sx={{
                  height: 46, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                }}>
                Back to Login
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
