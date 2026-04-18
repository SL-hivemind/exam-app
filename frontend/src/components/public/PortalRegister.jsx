import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, IconButton,
  InputAdornment, Toolbar, Stepper, Step, StepLabel, CircularProgress,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PortalRegister() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(0); // 0 = form, 1 = OTP verify
  const [form, setForm] = useState({ username: '', email: '', password: '', phone_number: '' });
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailHint, setEmailHint] = useState('');

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleInitRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.email || !form.username || !form.password) {
      setError('All fields are required'); return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters'); return;
    }
    setBusy(true);
    try {
      const res = await portalApi.registerInit(form);
      setEmailHint(res.data.email_hint || '');
      setSuccess(`OTP sent to ${res.data.email_hint || 'your email'}`);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setBusy(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setBusy(true);
    try {
      const res = await portalApi.registerVerify({ ...form, otp });
      const token = res.data.auth_token;
      const user = res.data.user;
      if (token && user) {
        login(user, token);
        navigate('/portal');
      } else {
        setSuccess('Account created! Redirecting...');
        setTimeout(() => navigate('/portal/login'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally { setBusy(false); }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontFamily: ff, fontSize: '0.9rem', borderRadius: '10px',
      bgcolor: '#f8fafc', height: 46,
      '& fieldset': { borderColor: '#e2e8f0' },
      '&:hover fieldset': { borderColor: '#93c5fd' },
      '&.Mui-focused': { bgcolor: '#fff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)' },
      '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 },
    },
  };

  return (
    <Box sx={{
      minHeight: '100vh', fontFamily: ff,
      background: 'linear-gradient(135deg, #eff6ff 0%, #f8faff 40%, #e0f2fe 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <Toolbar />
      <Box sx={{
        width: '100%', maxWidth: 440, mt: { xs: 3, md: 6 }, px: 2,
        animation: 'lgEnter 0.6s ease-out both',
      }}>
        <Box sx={{
          bgcolor: '#fff', borderRadius: '20px', p: { xs: 3, sm: 4.5 },
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)',
        }}>
          {/* Brand */}
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px', mb: 2,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(59,130,246,0.25)',
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>SL</Typography>
          </Box>

          <Typography sx={{ fontFamily: ff, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
            Create Account
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#94a3b8', mb: 3 }}>
            Join the Public Exam Portal
          </Typography>

          <Stepper activeStep={step} sx={{ mb: 3 }}>
            <Step><StepLabel>Details</StepLabel></Step>
            <Step><StepLabel>Verify Email</StepLabel></Step>
          </Stepper>

          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{success}</Alert>}

          {step === 0 ? (
            <Box component="form" onSubmit={handleInitRegister}>
              <TextField fullWidth placeholder="Username" value={form.username}
                onChange={handleChange('username')} sx={{ ...inputSx, mb: 2 }} size="small" required />
              <TextField fullWidth placeholder="Email" type="email" value={form.email}
                onChange={handleChange('email')} sx={{ ...inputSx, mb: 2 }} size="small" required />
              <TextField fullWidth placeholder="Phone (optional)" value={form.phone_number}
                onChange={handleChange('phone_number')} sx={{ ...inputSx, mb: 2 }} size="small" />
              <TextField fullWidth placeholder="Password (min 8 chars)" type={showPw ? 'text' : 'password'}
                value={form.password} onChange={handleChange('password')} sx={{ ...inputSx, mb: 3 }} size="small" required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small" sx={{ color: '#94a3b8' }}>
                        {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button fullWidth type="submit" disabled={busy} sx={{
                height: 48, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
                textTransform: 'none', color: '#fff',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)', transform: 'translateY(-2px)' },
              }}>
                {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Send OTP →'}
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleVerify}>
              <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#64748b', mb: 2, textAlign: 'center' }}>
                Enter the 6-digit code sent to <strong>{emailHint}</strong>
              </Typography>
              <TextField fullWidth placeholder="Enter OTP" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                sx={{ ...inputSx, mb: 3, '& input': { textAlign: 'center', letterSpacing: 8, fontSize: '1.4rem', fontWeight: 700 } }}
                size="small" required
              />
              <Button fullWidth type="submit" disabled={busy} sx={{
                height: 48, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
                textTransform: 'none', color: '#fff',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)', transform: 'translateY(-2px)' },
              }}>
                {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Verify & Create Account'}
              </Button>
              <Button fullWidth onClick={() => { setStep(0); setSuccess(''); }} sx={{
                mt: 1.5, fontFamily: ff, fontWeight: 500, textTransform: 'none', color: '#64748b',
              }}>
                ← Back to details
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#94a3b8' }}>
              Already have an account?{' '}
              <RouterLink to="/portal/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </RouterLink>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
