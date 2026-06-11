import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Avatar, Divider,
  Skeleton, List, ListItem, ListItemIcon, ListItemText, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton, Drawer,
  useMediaQuery, useTheme, LinearProgress,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import QuizIcon from '@mui/icons-material/Quiz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HistoryIcon from '@mui/icons-material/History';
import ExploreIcon from '@mui/icons-material/Explore';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ScienceIcon from '@mui/icons-material/Science';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const SIDEBAR_W = 220;

export default function PublicDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [tab, setTab] = useState('overview');
  const [dashboardCourses, setDashboardCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNewCourse, setSelectedNewCourse] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      publicApi.myDashboardData().catch(() => ({ data: { dashboard_courses: [], available_courses: [] } })),
      publicApi.myAttempts().catch(() => ({ data: { attempts: [] } })),
    ]).then(([d, a]) => {
      setDashboardCourses(d.data.dashboard_courses || []);
      setAvailableCourses(d.data.available_courses || []);
      setAttempts(a.data.attempts || []);
    }).finally(() => setLoading(false));
    // Load streak info
    publicApi.myProfile().then(r => {
      setDailyStreak(r.data?.profile?.daily_streak || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!user || user.role !== 'public_user') { navigate('/public/login'); return; }
    loadData();
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate('/public/login'); };

  const handleAddCourse = async () => {
    if (!selectedNewCourse) return;
    setActionBusy(true); setError(''); setMsg('');
    try {
      await publicApi.enrollFree(selectedNewCourse);
      setMsg('Course added!'); setSelectedNewCourse(''); loadData();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActionBusy(false); }
  };

  const handlePayment = async (courseId, courseTitle) => {
    setActionBusy(true); setError(''); setMsg('');
    try {
      const r = await publicApi.createOrder(courseId);
      const { order_id, amount, currency, key_id } = r.data;
      const opts = {
        key: key_id, amount, currency, name: 'SL Exams', description: courseTitle, order_id,
        handler: async (res) => {
          try {
            await publicApi.verifyPayment({ razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature });
            setMsg('Payment successful!'); loadData();
          } catch { setError('Verification failed.'); }
        },
        prefill: { email: user.email }, theme: { color: '#2563eb' },
      };
      if (window.Razorpay) new window.Razorpay(opts).open();
      else setError('Payment SDK not loaded.');
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setActionBusy(false); }
  };

  const handleContentClick = (content) => {
    if (content.locked) { setError('Subscribe to access premium content'); return; }
    if (content.attempt_submitted && content.content_type === 'pdf_exam') {
      setError(`Already completed. Score: ${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}`); return;
    }
    navigate(`/public/viewer/${content.id}`, { state: { content } });
  };

  const completedAttempts = attempts.filter(a => a.submitted_at);
  const bestScore = attempts.length > 0 ? Math.max(...attempts.filter(a => a.score != null).map(a => a.score), 0) : null;

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
    { id: 'courses', label: 'My Courses', icon: <MenuBookIcon /> },
    { id: 'history', label: 'Exam History', icon: <HistoryIcon /> },
  ];

  const sidebar = (
    <Box sx={{ width: SIDEBAR_W, height: '100%', bgcolor: '#0f172a', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* User info */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: '#2563eb', fontWeight: 800, fontSize: '0.9rem' }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.88rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.username}</Typography>
            <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user?.email}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, py: 1, px: 1 }}>
        {sidebarItems.map(item => (
          <Box key={item.id} onClick={() => { setTab(item.id); setMobileOpen(false); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.2, px: 1.5, py: 0.8,
              borderRadius: '8px', cursor: 'pointer', mb: 0.3,
              bgcolor: tab === item.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: tab === item.id ? '#60a5fa' : '#94a3b8',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
            }}>
            {React.cloneElement(item.icon, { sx: { fontSize: 18 } })}
            <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.8rem' }}>{item.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Bottom actions */}
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Box onClick={() => navigate('/public')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, borderRadius: '10px', cursor: 'pointer', color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}>
          <ExploreIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem' }}>Browse Catalog</Typography>
        </Box>
        <Box onClick={handleLogout}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, borderRadius: '10px', cursor: 'pointer', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}>
          <LogoutIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem' }}>Logout</Typography>
        </Box>
      </Box>
    </Box>
  );

  /* ── OVERVIEW TAB ── */
  const renderOverview = () => {
    const handleStartChallenge = async () => {
      try {
        const r = await publicApi.challengeStart();
        if (r.data.already_completed) {
          setChallengeCompleted(true);
          setDailyStreak(r.data.streak || 0);
          setMsg(`Already completed today! Score: ${r.data.score}/5`);
        } else {
          // For now, show a message - full CBT player integration comes later
          setMsg(`Daily Challenge started! ${r.data.questions?.length || 5} questions loaded.`);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not start challenge');
      }
    };

    return (
    <>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'Enrolled', value: dashboardCourses.length, icon: <SchoolIcon />, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
          { label: 'Exams Taken', value: completedAttempts.length, icon: <QuizIcon />, color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
          { label: 'Daily Streak', value: dailyStreak > 0 ? `${dailyStreak} Days` : '0 Days', icon: <LocalFireDepartmentIcon />, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
          { label: 'Best Score', value: bestScore != null ? bestScore : '—', icon: <TrendingUpIcon />, color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2.5 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</Box>
                <Box>
                  <Typography sx={{ fontFamily: ff, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#94a3b8', mt: 0.3 }}>{s.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Quick Prep Hub ── */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Quick Prep Hub</Typography>
        <Grid container spacing={2}>
          {[
            { label: 'Chapter Practice', desc: 'Focus on one topic', icon: <AutoStoriesIcon />, color: '#2563eb', bg: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(59,130,246,0.04))', action: () => setTab('courses') },
            { label: 'Subject Practice', desc: 'Mix all chapters', icon: <ScienceIcon />, color: '#7c3aed', bg: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(139,92,246,0.04))', action: () => setTab('courses') },
            { label: 'Full Mock Test', desc: 'Complete exam mix', icon: <EmojiEventsIcon />, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))', action: () => setTab('courses') },
            { label: 'Previous Papers', desc: 'PYQ question papers', icon: <HistoryIcon />, color: '#0d9488', bg: 'linear-gradient(135deg, rgba(13,148,136,0.08), rgba(20,184,166,0.04))', action: () => setTab('courses') },
            { label: 'Study Materials', desc: 'PDFs & videos', icon: <MenuBookIcon />, color: '#dc2626', bg: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(239,68,68,0.04))', action: () => setTab('courses') },
          ].map((item, i) => (
            <Grid item xs={6} sm={4} md={2.4} key={i}>
              <Card onClick={item.action} sx={{
                borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none',
                cursor: 'pointer', transition: 'all 0.2s ease', background: item.bg,
                '&:hover': { borderColor: item.color, transform: 'translateY(-2px)', boxShadow: `0 6px 20px ${item.color}15` },
              }}>
                <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: `${item.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1, color: item.color }}>
                    {React.cloneElement(item.icon, { sx: { fontSize: 22 } })}
                  </Box>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.78rem', color: '#0f172a', lineHeight: 1.2 }}>{item.label}</Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.65rem', color: '#94a3b8', mt: 0.3 }}>{item.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          {/* Quick access courses */}
          <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>My Courses</Typography>
          {dashboardCourses.length === 0 ? (
            <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none', textAlign: 'center', py: 5 }}>
              <SchoolIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
              <Typography sx={{ fontFamily: ff, color: '#64748b', mb: 2 }}>No courses yet.</Typography>
              <Button size="small" onClick={() => navigate('/public')} sx={{ fontFamily: ff, textTransform: 'none' }}>Browse Catalog</Button>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {dashboardCourses.slice(0, 4).map(dc => (
                <Grid item xs={12} sm={6} key={dc.subscription.id}>
                  <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#93c5fd' } }}
                    onClick={() => setTab('courses')}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 1 }}>{dc.course.title}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                        <Chip label={dc.subscription.status === 'active' ? 'Full Access' : 'Free Only'} size="small"
                          sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.7rem', bgcolor: dc.subscription.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: dc.subscription.status === 'active' ? '#16a34a' : '#2563eb' }} />
                        <Chip label={`${dc.contents.length} items`} size="small" sx={{ fontFamily: ff, fontSize: '0.7rem', bgcolor: '#f1f5f9', color: '#64748b' }} />
                      </Box>
                      <LinearProgress variant="determinate" value={dc.contents.length > 0 ? (dc.contents.filter(c => c.attempt_submitted).length / dc.contents.filter(c => c.content_type === 'pdf_exam').length * 100) || 0 : 0}
                        sx={{ height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#2563eb', borderRadius: 2 } }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Daily Challenge</Typography>
          <Card sx={{ borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', boxShadow: '0 10px 25px rgba(15,23,42,0.15)', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, transform: 'scale(2)' }}>
              <LocalFireDepartmentIcon sx={{ fontSize: 100 }} />
            </Box>
            <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip label="Quiz of the Day" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#60a5fa', fontWeight: 700, fontFamily: ff, fontSize: '0.7rem' }} />
                {dailyStreak > 0 && <Chip label={`\uD83D\uDD25 ${dailyStreak} Day Streak`} size="small" sx={{ bgcolor: 'rgba(249,115,22,0.2)', color: '#fb923c', fontWeight: 700, fontFamily: ff, fontSize: '0.7rem' }} />}
              </Box>
              <Typography sx={{ fontFamily: ff, fontSize: '1.1rem', fontWeight: 800, mb: 1, lineHeight: 1.3 }}>
                5 Mixed Questions
              </Typography>
              <Typography sx={{ fontFamily: ff, fontSize: '0.8rem', color: '#94a3b8', mb: 3 }}>
                Based on your enrolled courses
              </Typography>
              <Button fullWidth onClick={handleStartChallenge} variant="contained" endIcon={challengeCompleted ? <CheckCircleIcon /> : <PlayCircleOutlineIcon />}
                disabled={challengeCompleted}
                sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px', background: challengeCompleted ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', '&:hover': { background: challengeCompleted ? 'rgba(34,197,94,0.2)' : '#2563eb' }, '&.Mui-disabled': { color: '#22c55e' } }}>
                {challengeCompleted ? 'Completed Today' : 'Start Challenge'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent attempts */}
      {completedAttempts.length > 0 && (
        <Box sx={{ mt: 0 }}>
          <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 2 }}>Recent Exam Results</Typography>
          <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
            {completedAttempts.slice(0, 5).map((a, i) => (
              <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.8, borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                <QuizIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{a.content_title || 'Exam'}</Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', color: '#94a3b8' }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : ''}</Typography>
                </Box>
                <Chip label={`${a.score ?? '?'}/${a.total ?? '?'}`} size="small"
                  sx={{ fontFamily: ff, fontWeight: 700, bgcolor: (a.score >= (a.total * 0.6)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: (a.score >= (a.total * 0.6)) ? '#16a34a' : '#ef4444' }} />
              </Box>
            ))}
          </Card>
        </Box>
      )}
    </>
  )};

  /* ── COURSES TAB ── */
  const renderCourses = () => (
    <>
      {availableCourses.length > 0 && (
        <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none', mb: 3, p: 2.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>Add Another Course</Typography>
              <Typography sx={{ fontFamily: ff, fontSize: '0.8rem', color: '#64748b' }}>Enroll in more public exams</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: { xs: '100%', sm: 300 } }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontFamily: ff }}>Select</InputLabel>
                <Select value={selectedNewCourse} onChange={e => setSelectedNewCourse(e.target.value)} label="Select" sx={{ fontFamily: ff, borderRadius: '8px' }}>
                  {availableCourses.map(c => <MenuItem key={c.id} value={c.id} sx={{ fontFamily: ff }}>{c.title} {c.price > 0 ? `(₹${c.price})` : '(Free)'}</MenuItem>)}
                </Select>
              </FormControl>
              <Button onClick={handleAddCourse} disabled={!selectedNewCourse || actionBusy} variant="contained" startIcon={<AddIcon />}
                sx={{ fontFamily: ff, textTransform: 'none', fontWeight: 600, borderRadius: '8px', boxShadow: 'none', whiteSpace: 'nowrap' }}>Add</Button>
            </Box>
          </Box>
        </Card>
      )}

      {dashboardCourses.map(dc => (
        <Card key={dc.subscription.id} sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none', mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9', bgcolor: '#fafbfc', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box>
              <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', mb: 0.5 }}>{dc.course.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={dc.subscription.status === 'active' ? 'Full Access' : dc.subscription.status === 'enrolled' ? 'Free Content' : 'Pending'} size="small"
                  sx={{ fontFamily: ff, fontWeight: 600, bgcolor: dc.subscription.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: dc.subscription.status === 'active' ? '#16a34a' : '#2563eb' }} />
              </Box>
            </Box>
            {dc.subscription.status !== 'active' && dc.course.price > 0 && (
              <Button onClick={() => handlePayment(dc.course.id, dc.course.title)} disabled={actionBusy} variant="contained" size="small"
                sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
                {actionBusy ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : `Unlock — ₹${dc.course.price}`}
              </Button>
            )}
          </Box>
          {/* ── Grouped Content Sections ── */}
          {(() => {
            const exams = dc.contents.filter(c => c.content_type === 'pdf_exam' || c.content_type === 'cbt_exam');
            const materials = dc.contents.filter(c => c.content_type !== 'pdf_exam' && c.content_type !== 'cbt_exam');

            const renderContentItem = (content) => (
              <ListItem key={content.id} onClick={() => handleContentClick(content)}
                sx={{ cursor: content.locked ? 'not-allowed' : 'pointer', py: 1.8, px: 2.5, opacity: content.locked ? 0.6 : 1, '&:hover': { bgcolor: content.locked ? 'transparent' : '#f8fafc' }, borderBottom: '1px solid #f1f5f9' }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {(content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam')
                    ? <QuizIcon sx={{ color: content.locked ? '#94a3b8' : '#2563eb', fontSize: 20 }} />
                    : <PictureAsPdfIcon sx={{ color: content.locked ? '#94a3b8' : '#ef4444', fontSize: 20 }} />}
                </ListItemIcon>
                <ListItemText primary={content.title}
                  secondary={(content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam') ? `${content.total_questions || '?'} Q · ${content.duration_minutes || 60} min` : 'Study Material'}
                  primaryTypographyProps={{ fontFamily: ff, fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}
                  secondaryTypographyProps={{ fontFamily: ff, fontSize: '0.75rem', color: '#64748b' }} />
                <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexShrink: 0, ml: 1 }}>
                  {content.attempt_submitted && <Chip icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label={`${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}`} size="small"
                    sx={{ bgcolor: (content.attempt_score >= (content.attempt_total * 0.6)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: (content.attempt_score >= (content.attempt_total * 0.6)) ? '#16a34a' : '#ef4444', fontWeight: 700, fontFamily: ff, '& .MuiChip-icon': { color: 'inherit' } }} />}
                  {!content.attempt_submitted && !content.locked && (
                    <Button size="small" variant="outlined" sx={{ fontFamily: ff, textTransform: 'none', borderRadius: '8px', fontSize: '0.75rem' }}>
                      {(content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam') ? 'Take Exam' : 'View'}
                    </Button>
                  )}
                  <Chip icon={content.is_free ? <LockOpenIcon sx={{ fontSize: 13 }} /> : content.locked ? <LockIcon sx={{ fontSize: 13 }} /> : <CheckCircleIcon sx={{ fontSize: 13 }} />}
                    label={content.is_free ? 'Free' : content.locked ? 'Premium' : 'Unlocked'} size="small"
                    sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.68rem',
                      bgcolor: content.is_free ? 'rgba(34,197,94,0.08)' : content.locked ? 'rgba(168,85,247,0.08)' : 'rgba(34,197,94,0.08)',
                      color: content.is_free ? '#16a34a' : content.locked ? '#a855f7' : '#16a34a',
                      '& .MuiChip-icon': { color: 'inherit' } }} />
                </Box>
              </ListItem>
            );

            return (
              <>
                {/* ── Practice Exams Section ── */}
                {exams.length > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.5, bgcolor: 'rgba(37,99,235,0.04)', borderBottom: '1px solid #e2e8f0' }}>
                      <QuizIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                      <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.82rem', color: '#1e40af', letterSpacing: 0.3 }}>
                        Practice Exams
                      </Typography>
                      <Chip label={exams.length} size="small" sx={{ fontFamily: ff, fontWeight: 800, fontSize: '0.68rem', height: 20, bgcolor: 'rgba(37,99,235,0.1)', color: '#2563eb' }} />
                    </Box>
                    <List sx={{ p: 0 }}>
                      {exams.map(renderContentItem)}
                    </List>
                  </Box>
                )}

                {/* ── Study Materials Section ── */}
                {materials.length > 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.5, bgcolor: 'rgba(239,68,68,0.03)', borderBottom: '1px solid #e2e8f0', borderTop: exams.length > 0 ? '1px solid #e2e8f0' : 'none' }}>
                      <MenuBookIcon sx={{ fontSize: 18, color: '#dc2626' }} />
                      <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.82rem', color: '#991b1b', letterSpacing: 0.3 }}>
                        Study Materials
                      </Typography>
                      <Chip label={materials.length} size="small" sx={{ fontFamily: ff, fontWeight: 800, fontSize: '0.68rem', height: 20, bgcolor: 'rgba(239,68,68,0.08)', color: '#dc2626' }} />
                    </Box>
                    <List sx={{ p: 0 }}>
                      {materials.map(renderContentItem)}
                    </List>
                  </Box>
                )}

                {dc.contents.length === 0 && (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontFamily: ff }}>No content yet.</Typography>
                  </Box>
                )}
              </>
            );
          })()}
        </Card>
      ))}
    </>
  );

  /* ── HISTORY TAB ── */
  const renderHistory = () => (
    <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
      {completedAttempts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><Typography sx={{ fontFamily: ff, color: '#94a3b8' }}>No exam attempts yet.</Typography></Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', px: 2.5, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            {['Exam', 'Date', 'Score', 'Result'].map(h => (
              <Typography key={h} sx={{ flex: 1, fontFamily: ff, fontWeight: 700, fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>{h}</Typography>
            ))}
          </Box>
          {completedAttempts.map(a => (
            <Box key={a.id} sx={{ display: 'flex', px: 2.5, py: 1.5, borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
              <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{a.content_title || 'Exam'}</Typography>
              <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.82rem', color: '#64748b' }}>{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}</Typography>
              <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{a.score ?? '?'}/{a.total ?? '?'}</Typography>
              <Box sx={{ flex: 1 }}>
                <Chip label={(a.score >= (a.total * 0.6)) ? 'Pass' : 'Needs Work'} size="small"
                  sx={{ fontFamily: ff, fontWeight: 600, bgcolor: (a.score >= (a.total * 0.6)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: (a.score >= (a.total * 0.6)) ? '#16a34a' : '#ef4444' }} />
              </Box>
            </Box>
          ))}
        </>
      )}
    </Card>
  );

  const tabTitles = { overview: 'Dashboard Overview', courses: 'My Courses', history: 'Exam History' };

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 50px)', fontFamily: ff }}>
      {/* Desktop sidebar */}
      {!isMobile && <Box sx={{ width: SIDEBAR_W, flexShrink: 0 }}>{sidebar}</Box>}

      {/* Mobile drawer */}
      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: SIDEBAR_W, border: 'none' } }}>
        {sidebar}
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, bgcolor: '#f8fafc', overflow: 'auto' }}>
        {/* Top bar */}
        <Box sx={{ px: { xs: 2, md: 3.5 }, py: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} sx={{ color: '#0f172a' }}><MenuIcon /></IconButton>
          )}
          <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>{tabTitles[tab]}</Typography>
        </Box>

        <Box sx={{ p: { xs: 2, md: 3.5 }, maxWidth: 960 }}>
          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5, borderRadius: '12px' }}>{error}</Alert>}
          {msg && <Alert severity="success" onClose={() => setMsg('')} sx={{ mb: 2.5, borderRadius: '12px' }}>{msg}</Alert>}

          {loading ? (
            <Box>{[1,2,3].map(i => <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2, borderRadius: '14px' }} />)}</Box>
          ) : (
            <>
              {tab === 'overview' && renderOverview()}
              {tab === 'courses' && renderCourses()}
              {tab === 'history' && renderHistory()}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
