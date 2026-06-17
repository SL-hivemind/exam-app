import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Container,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { publicApi } from '../../utils/api';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PublicForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [emailHint, setEmailHint] = useState('');

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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email) { setError('Email is required'); return; }
    setBusy(true);
    try {
      const res = await publicApi.forgotInit({ email });
      setEmailHint(res.data.email_hint || '');
      setSuccess(res.data.message);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setBusy(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!otp || !newPassword) { setError('OTP and new password are required'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setBusy(true);
    try {
      const res = await publicApi.forgotReset({ email, otp, new_password: newPassword });
      setSuccess(res.data.message);
      setTimeout(() => navigate('/public/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally { setBusy(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Box sx={{ maxWidth: 420, mx: 'auto' }}>
        <Box sx={{
          bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '20px', p: { xs: 3.5, sm: 4.5 },
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)',
        }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px', mb: 2,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(59,130,246,0.25)',
          }}>
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>SL</Typography>
          </Box>

          <Typography sx={{ fontFamily: ff, fontSize: '1.5rem', fontWeight: 800, color: '#eaf0ff', mb: 0.5 }}>
            Reset Password
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#aeb9e0', mb: 3 }}>
            {step === 0 ? 'Enter your registered email to receive an OTP' : `Enter the OTP sent to ${emailHint}`}
          </Typography>

          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{success}</Alert>}

          {step === 0 ? (
            <Box component="form" onSubmit={handleSendOTP}>
              <TextField fullWidth placeholder="your@email.com" type="email"
                value={email} onChange={e => setEmail(e.target.value)} required size="small"
                sx={{ ...inputSx, mb: 3 }} />
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
            <Box component="form" onSubmit={handleReset}>
              <TextField fullWidth placeholder="6-digit OTP" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                sx={{ ...inputSx, mb: 2, '& input': { textAlign: 'center', letterSpacing: 8, fontSize: '1.4rem', fontWeight: 700 } }}
                size="small" required />
              <TextField fullWidth placeholder="New password (min 8 chars)" type="password"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                sx={{ ...inputSx, mb: 3 }} size="small" required />
              <Button fullWidth type="submit" disabled={busy} sx={{
                height: 48, borderRadius: '12px', fontFamily: ff, fontWeight: 700,
                textTransform: 'none', color: '#fff',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)', transform: 'translateY(-2px)' },
              }}>
                {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Reset Password'}
              </Button>
              <Button fullWidth onClick={() => { setStep(0); setSuccess(''); }} sx={{
                mt: 1.5, fontFamily: ff, fontWeight: 500, textTransform: 'none', color: '#a9b4dd',
              }}>
                ← Back
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <RouterLink to="/public/login" style={{ textDecoration: 'none' }}>
              <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#9fc1ff', fontWeight: 500 }}>
                Back to Sign In
              </Typography>
            </RouterLink>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
