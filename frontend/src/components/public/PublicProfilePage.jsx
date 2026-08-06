import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, TextField, Button, Stack, Chip, Alert,
  CircularProgress, Divider, InputAdornment, IconButton, Snackbar,
} from '@mui/material';
import {
  Person as PersonIcon,
  WorkspacePremium as PremiumIcon,
  Visibility, VisibilityOff,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { GlassCard } from '../common';

const ff = "'Plus Jakarta Sans', 'Inter', sans-serif";

/**
 * Public learner profile: account details, plan tier + enrolled course tags,
 * and self-service password change.
 */
export default function PublicProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
  const notify = (msg, severity = 'success') => setToast({ open: true, msg, severity });

  const [form, setForm] = useState({ username: '', phone_number: '', address: '' });
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/public/me/profile'), api.get('/public/me/plan')])
      .then(([p, pl]) => {
        const prof = p.data.profile || {};
        setProfile(prof);
        setForm({
          username: prof.username || '',
          phone_number: prof.phone_number || '',
          address: prof.address || '',
        });
        setPlan(pl.data || null);
      })
      .catch(() => notify('Failed to load your profile', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!form.username.trim() || form.username.trim().length < 3) {
      notify('Username must be at least 3 characters.', 'warning'); return;
    }
    try {
      setSaving(true);
      const res = await api.put('/public/me/profile', form);
      setProfile(res.data.profile);
      notify('Profile updated');
    } catch (err) {
      notify(err.response?.data?.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pw.current) { notify('Enter your current password first.', 'warning'); return; }
    if (pw.next.length < 8) { notify('New password must be at least 8 characters.', 'warning'); return; }
    if (pw.next !== pw.confirm) { notify("New passwords don't match — retype them.", 'warning'); return; }
    try {
      setPwSaving(true);
      await api.post('/public/me/change-password', { current_password: pw.current, new_password: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      notify('Password changed successfully');
    } catch (err) {
      notify(err.response?.data?.message || 'Password change failed', 'error');
    } finally { setPwSaving(false); }
  };

  if (loading) {
    return <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, fontFamily: ff }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 46, height: 46, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#2563eb', color: '#fff',
          }}>
            <PersonIcon />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.4rem', color: '#f5f8ff' }}>My Profile</Typography>
            <Typography sx={{ fontFamily: ff, color: '#aeb9e0', fontSize: '0.85rem' }}>Account details, plan and security</Typography>
          </Box>
        </Stack>
        <Chip
          icon={plan?.is_premium ? <PremiumIcon sx={{ fontSize: 18 }} /> : undefined}
          label={plan?.is_premium ? 'Premium plan' : plan?.enrolled ? 'Free plan' : 'No course yet'}
          sx={{
            fontFamily: ff, fontWeight: 800,
            background: plan?.is_premium ? '#f68914' : 'rgba(255,255,255,0.08)',
            color: plan?.is_premium ? '#1a1206' : '#aeb9e0',
            border: plan?.is_premium ? 'none' : '1px solid rgba(255,255,255,0.14)',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Stack>

      {/* Plan summary */}
      <GlassCard sx={{ p: 2.5, mb: 3 }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#f5f8ff', mb: 1 }}>Your courses</Typography>
        {(plan?.allowed_tags || []).length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {plan.allowed_tags.map((t) => (
              <Chip key={t} label={t} size="small" sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(47,107,255,0.16)', color: '#93c5fd', border: '1px solid rgba(47,107,255,0.3)' }} />
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontFamily: ff, color: '#aeb9e0', fontSize: '0.85rem' }}>
            You're not enrolled in any course yet.
          </Typography>
        )}
        {!plan?.is_premium && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
            <Typography sx={{ fontFamily: ff, color: '#aeb9e0', fontSize: '0.82rem' }}>
              {plan?.enrolled
                ? `Free plan: ${plan?.limits?.practice_per_day ?? 2} practice sessions/day and ${plan?.limits?.mock_attempts ?? 2} attempts per mock. Upgrade to a paid course for unlimited practice, Adaptive mode, chapter drills and format-based questions.`
                : 'Enroll in a course to unlock practice, mocks and the daily challenge.'}
            </Typography>
            <Button variant="gradient" size="small" sx={{ mt: 1.5 }} onClick={() => navigate('/public')}>
              {plan?.enrolled ? 'Explore premium courses' : 'Browse courses'}
            </Button>
          </>
        )}
      </GlassCard>

      {/* Account details */}
      <GlassCard sx={{ p: 2.5, mb: 3 }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#f5f8ff', mb: 2 }}>Account details</Typography>
        <Stack spacing={2}>
          <TextField label="Email" value={profile?.email || ''} fullWidth disabled
            helperText="Email is your login and cannot be changed." />
          <TextField label="Username" value={form.username} fullWidth
            onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} />
          <TextField label="Phone number" value={form.phone_number} fullWidth
            onChange={(e) => setForm(f => ({ ...f, phone_number: e.target.value }))} />
          <TextField label="Address" value={form.address} fullWidth multiline rows={2}
            onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          <Button variant="gradient" onClick={saveProfile} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Stack>
      </GlassCard>

      {/* Security */}
      <GlassCard sx={{ p: 2.5 }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#f5f8ff', mb: 2 }}>Change password</Typography>
        <Stack spacing={2}>
          <TextField label="Current password" type={showPw ? 'text' : 'password'} fullWidth
            value={pw.current} onChange={(e) => setPw(p => ({ ...p, current: e.target.value }))}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPw(!showPw)} sx={{ color: '#aeb9e0' }}>
                    {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }} />
          <TextField label="New password" type={showPw ? 'text' : 'password'} fullWidth
            value={pw.next} onChange={(e) => setPw(p => ({ ...p, next: e.target.value }))}
            helperText="At least 8 characters." />
          <TextField label="Confirm new password" type={showPw ? 'text' : 'password'} fullWidth
            value={pw.confirm} onChange={(e) => setPw(p => ({ ...p, confirm: e.target.value }))} />
          <Button variant="outlined" onClick={changePassword} disabled={pwSaving} sx={{ alignSelf: 'flex-start' }}>
            {pwSaving ? 'Updating…' : 'Update password'}
          </Button>
        </Stack>
      </GlassCard>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
