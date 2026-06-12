import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Avatar, Divider,
  Skeleton, List, ListItem, ListItemIcon, ListItemText, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton, Drawer, Collapse,
  useMediaQuery, useTheme, LinearProgress, Badge, Chip as MuiChip,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import QuizIcon from '@mui/icons-material/Quiz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
const SIDEBAR_W = 260;

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
  const [expandedCourse, setExpandedCourse] = useState(null);

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

  const handleContentClick = (content, mode = 'exam') => {
    if (content.locked) { setError('Subscribe to access premium content'); return; }
    if (mode === 'exam' && content.attempt_submitted && (content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam')) {
      setError(`Already completed. Score: ${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}. Use "Practice Again" for study mode.`); return;
    }
    navigate(`/public/viewer/${content.id}`, { state: { content, mode } });
  };

  const completedAttempts = attempts.filter(a => a.submitted_at);
  const bestScore = attempts.length > 0 ? Math.max(...attempts.filter(a => a.score != null).map(a => a.score), 0) : null;

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
    { id: 'courses', label: 'My Courses', icon: <MenuBookIcon /> },
    { id: 'history', label: 'Exam History', icon: <HistoryIcon /> },
  ];

  const sidebar = (
    <Box sx={{ width: SIDEBAR_W, height: '100%', bgcolor: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{
          width: 30, height: 30, borderRadius: '8px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <SchoolIcon sx={{ color: '#fff', fontSize: 16 }} />
        </Box>
        <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.05em' }}>
          STUDENT WORKSPACE
        </Typography>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, py: 1.5, px: 1.5, overflowY: 'auto' }}>
        {/* Overview */}
        <Box onClick={() => { setTab('overview'); setMobileOpen(false); }}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, borderRadius: '10px', cursor: 'pointer', mb: 0.5,
            bgcolor: tab === 'overview' ? 'rgba(59,130,246,0.15)' : 'transparent', color: tab === 'overview' ? '#60a5fa' : '#94a3b8',
            transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}>
          <DashboardIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem' }}>Overview</Typography>
        </Box>

        {/* My Courses — with expandable sub-items */}
        <Box onClick={() => { setTab('courses'); setMobileOpen(false); }}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, borderRadius: '10px', cursor: 'pointer', mb: 0.5,
            bgcolor: tab === 'courses' ? 'rgba(59,130,246,0.15)' : 'transparent', color: tab === 'courses' ? '#60a5fa' : '#94a3b8',
            transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}>
          <MenuBookIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>My Courses</Typography>
          {dashboardCourses.length > 0 && (
            <Badge badgeContent={dashboardCourses.length} sx={{ '& .MuiBadge-badge': { bgcolor: '#3b82f6', color: '#fff', fontFamily: ff, fontSize: '0.65rem', fontWeight: 700, minWidth: 18, height: 18 } }} />
          )}
        </Box>

        {/* Expandable enrolled courses */}
        {dashboardCourses.length > 0 && (
          <Box sx={{ ml: 2, pl: 1, borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
            {dashboardCourses.map(dc => (
              <Box key={dc.subscription.id}>
                <Box onClick={() => setExpandedCourse(expandedCourse === dc.course.id ? null : dc.course.id)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.8, borderRadius: '8px', cursor: 'pointer', mb: 0.3,
                    color: expandedCourse === dc.course.id ? '#93c5fd' : '#64748b', '&:hover': { color: '#e2e8f0', bgcolor: 'rgba(255,255,255,0.03)' }, transition: 'all 0.15s' }}>
                  <Typography sx={{ fontFamily: ff, fontWeight: 500, fontSize: '0.78rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dc.course.title}</Typography>
                  {expandedCourse === dc.course.id ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                </Box>
                <Collapse in={expandedCourse === dc.course.id} timeout="auto">
                  <Box sx={{ pl: 1.5, pb: 1 }}>
                    {dc.contents.length === 0 ? (
                      <Typography sx={{ fontFamily: ff, fontSize: '0.7rem', color: '#475569', px: 1.5, py: 0.5 }}>No content yet</Typography>
                    ) : dc.contents.map(content => (
                      <Box key={content.id} onClick={() => handleContentClick(content)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.6, borderRadius: '6px', cursor: content.locked ? 'not-allowed' : 'pointer',
                          opacity: content.locked ? 0.5 : 1, color: '#94a3b8', '&:hover': { color: content.locked ? '#94a3b8' : '#e2e8f0', bgcolor: content.locked ? 'transparent' : 'rgba(255,255,255,0.03)' } }}>
                        {(content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam')
                          ? <QuizIcon sx={{ fontSize: 14, color: content.locked ? '#475569' : '#60a5fa' }} />
                          : content.content_type === 'video'
                            ? <OndemandVideoIcon sx={{ fontSize: 14, color: content.locked ? '#475569' : '#a855f7' }} />
                            : <PictureAsPdfIcon sx={{ fontSize: 14, color: content.locked ? '#475569' : '#f87171' }} />}
                        <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{content.title}</Typography>
                        {content.attempt_submitted && <CheckCircleIcon sx={{ fontSize: 12, color: '#22c55e' }} />}
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Box>
        )}

        {/* History */}
        <Box onClick={() => { setTab('history'); setMobileOpen(false); }}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, borderRadius: '10px', cursor: 'pointer', mb: 0.5, mt: 0.5,
            bgcolor: tab === 'history' ? 'rgba(59,130,246,0.15)' : 'transparent', color: tab === 'history' ? '#60a5fa' : '#94a3b8',
            transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}>
          <HistoryIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem' }}>Exam History</Typography>
        </Box>
      </Box>

      {/* Bottom actions */}
      <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Box onClick={() => navigate('/public')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, borderRadius: '10px', cursor: 'pointer', color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}>
          <ExploreIcon sx={{ fontSize: 20 }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem' }}>Browse Catalog</Typography>
        </Box>
      </Box>
    </Box>
  );

  /* ── OVERVIEW TAB ── */
  const renderOverview = () => {
    return (
    <>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { label: 'Enrolled', value: dashboardCourses.length, icon: <SchoolIcon />, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
          { label: 'Exams Taken', value: completedAttempts.length, icon: <QuizIcon />, color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
          { label: 'Completion', value: (() => {
            const totalItems = dashboardCourses.reduce((sum, dc) => sum + dc.contents.filter(c => c.content_type === 'pdf_exam' || c.content_type === 'cbt_exam').length, 0);
            const doneItems = dashboardCourses.reduce((sum, dc) => sum + dc.contents.filter(c => c.attempt_submitted).length, 0);
            return totalItems > 0 ? `${Math.round((doneItems / totalItems) * 100)}%` : '—';
          })(), icon: <LocalFireDepartmentIcon />, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
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
              {dashboardCourses.slice(0, 4).map(dc => {
                const totalExams = dc.contents.filter(c => c.content_type === 'pdf_exam' || c.content_type === 'cbt_exam').length;
                const doneExams = dc.contents.filter(c => c.attempt_submitted).length;
                const totalAll = dc.contents.length;
                const progressPct = totalExams > 0 ? Math.round((doneExams / totalExams) * 100) : 0;
                return (
                <Grid item xs={12} sm={6} key={dc.subscription.id}>
                  <Card sx={{ borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#93c5fd', boxShadow: '0 4px 12px rgba(37,99,235,0.08)' } }}
                    onClick={() => setTab('courses')}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 1 }}>{dc.course.title}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <Chip label={dc.subscription.status === 'active' ? 'Full Access' : 'Free Only'} size="small"
                              sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.7rem', bgcolor: dc.subscription.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: dc.subscription.status === 'active' ? '#16a34a' : '#2563eb' }} />
                            <Chip label={`${totalAll} items`} size="small" sx={{ fontFamily: ff, fontSize: '0.7rem', bgcolor: '#f1f5f9', color: '#64748b' }} />
                          </Box>
                        </Box>
                        {/* Circular Progress Ring */}
                        <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                          <CircularProgress variant="determinate" value={progressPct} size={52} thickness={4}
                            sx={{ color: progressPct >= 100 ? '#16a34a' : '#2563eb', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
                          <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', fontWeight: 800, color: progressPct >= 100 ? '#16a34a' : '#0f172a' }}>{progressPct}%</Typography>
                          </Box>
                        </Box>
                      </Box>
                      <LinearProgress variant="determinate" value={progressPct}
                        sx={{ height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: progressPct >= 100 ? '#16a34a' : '#2563eb', borderRadius: 2 } }} />
                      <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', color: '#94a3b8', mt: 0.8 }}>
                        {doneExams} of {totalExams} exams completed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )})}
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
              <Chip label="Quiz of the Day" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#60a5fa', fontWeight: 700, fontFamily: ff, mb: 2, fontSize: '0.7rem' }} />
              <Typography sx={{ fontFamily: ff, fontSize: '1.15rem', fontWeight: 800, mb: 1, lineHeight: 1.3 }}>
                General Knowledge Mini-Test
              </Typography>
              <Typography sx={{ fontFamily: ff, fontSize: '0.8rem', color: '#94a3b8', mb: 3 }}>
                5 Questions • 10 Minutes
              </Typography>
              <Button fullWidth onClick={() => navigate('/public')} variant="contained" endIcon={<PlayCircleOutlineIcon />}
                sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', '&:hover': { background: '#2563eb' } }}>
                Start Challenge
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
                <Chip label={`${a.score ?? '?'}/${a.total_questions ?? '?'}`} size="small"
                  sx={{ fontFamily: ff, fontWeight: 700, bgcolor: (a.score >= (a.total_questions * 0.6)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: (a.score >= (a.total_questions * 0.6)) ? '#16a34a' : '#ef4444' }} />
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
            const previousPapers = dc.contents.filter(c => c.is_previous_paper);
            const standardContents = dc.contents.filter(c => !c.is_previous_paper);

            // Group standard contents by subject
            const subjectGroups = {};
            standardContents.forEach(c => {
              const subName = (c.subject || '').trim() || 'General Materials & Practice';
              if (!subjectGroups[subName]) subjectGroups[subName] = [];
              subjectGroups[subName].push(c);
            });

            // Sort subjects so "General Materials & Practice" is at the end
            const subjects = Object.keys(subjectGroups).sort((a, b) => {
              if (a === 'General Materials & Practice') return 1;
              if (b === 'General Materials & Practice') return -1;
              return a.localeCompare(b);
            });

            const renderContentItem = (content) => (
              <ListItem key={content.id} onClick={() => handleContentClick(content)}
                sx={{ cursor: content.locked ? 'not-allowed' : 'pointer', py: 1.8, px: 2.5, opacity: content.locked ? 0.6 : 1, '&:hover': { bgcolor: content.locked ? 'transparent' : '#f8fafc' }, borderBottom: '1px solid #f1f5f9' }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {(content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam')
                    ? <QuizIcon sx={{ color: content.locked ? '#94a3b8' : '#2563eb', fontSize: 20 }} />
                    : <PictureAsPdfIcon sx={{ color: content.locked ? '#94a3b8' : '#ef4444', fontSize: 20 }} />}
                </ListItemIcon>
                <ListItemText primary={content.title}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.3, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#64748b' }}>
                        {(content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam') ? `${content.total_questions || '?'} Q · ${content.duration_minutes || 60} min` : 'Study Material'}
                      </Typography>
                      {content.subject && (
                        <Chip label={content.subject} size="small" sx={{ fontFamily: ff, fontSize: '0.62rem', height: 16, bgcolor: '#f1f5f9', color: '#64748b' }} />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ fontFamily: ff, fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}
                />
                <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexShrink: 0, ml: 1 }}>
                  {content.attempt_submitted && <Chip icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label={`${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}`} size="small"
                    sx={{ bgcolor: (content.attempt_score >= (content.attempt_total * 0.6)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: (content.attempt_score >= (content.attempt_total * 0.6)) ? '#16a34a' : '#ef4444', fontWeight: 700, fontFamily: ff, '& .MuiChip-icon': { color: 'inherit' } }} />}
                  {content.attempt_submitted && (content.content_type === 'pdf_exam' || content.content_type === 'cbt_exam') && (
                    <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleContentClick(content, 'study'); }}
                      sx={{ fontFamily: ff, textTransform: 'none', borderRadius: '8px', fontSize: '0.72rem', borderColor: '#a855f7', color: '#a855f7', '&:hover': { bgcolor: 'rgba(168,85,247,0.06)', borderColor: '#9333ea' } }}>
                      Practice Again
                    </Button>
                  )}
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
                {/* ── 1. PREVIOUS QUESTION PAPERS SECTION ── */}
                {previousPapers.length > 0 && (
                  <Box sx={{ borderBottom: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.5, bgcolor: 'rgba(13,148,136,0.04)' }}>
                      <HistoryIcon sx={{ fontSize: 18, color: '#0d9488' }} />
                      <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.82rem', color: '#115e59', letterSpacing: 0.3 }}>
                        Previous Years\' Question Papers (PQP)
                      </Typography>
                      <Chip label={previousPapers.length} size="small" sx={{ fontFamily: ff, fontWeight: 800, fontSize: '0.68rem', height: 20, bgcolor: 'rgba(13,148,136,0.1)', color: '#0d9488' }} />
                    </Box>
                    <List sx={{ p: 0 }}>
                      {previousPapers.map(renderContentItem)}
                    </List>
                  </Box>
                )}

                {/* ── 2. SUBJECT SECTIONS ── */}
                {subjects.map((sub, sIdx) => {
                  const items = subjectGroups[sub];
                  const isGeneral = sub === 'General Materials & Practice';
                  return (
                    <Box key={sub} sx={{ borderBottom: sIdx < subjects.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.5, bgcolor: isGeneral ? 'rgba(100,116,139,0.04)' : 'rgba(37,99,235,0.04)' }}>
                        <MenuBookIcon sx={{ fontSize: 18, color: isGeneral ? '#475569' : '#2563eb' }} />
                        <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.82rem', color: isGeneral ? '#334155' : '#1e40af', letterSpacing: 0.3 }}>
                          {sub}
                        </Typography>
                        <Chip label={items.length} size="small" sx={{ fontFamily: ff, fontWeight: 800, fontSize: '0.68rem', height: 20, bgcolor: isGeneral ? 'rgba(100,116,139,0.08)' : 'rgba(37,99,235,0.08)', color: isGeneral ? '#475569' : '#2563eb' }} />
                      </Box>
                      <List sx={{ p: 0 }}>
                        {items.map(renderContentItem)}
                      </List>
                    </Box>
                  );
                })}

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
              <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{a.score ?? '?'}/{a.total_questions ?? '?'}</Typography>
              <Box sx={{ flex: 1 }}>
                <Chip label={(a.score >= (a.total_questions * 0.6)) ? 'Pass' : 'Needs Work'} size="small"
                  sx={{ fontFamily: ff, fontWeight: 600, bgcolor: (a.score >= (a.total_questions * 0.6)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: (a.score >= (a.total_questions * 0.6)) ? '#16a34a' : '#ef4444' }} />
              </Box>
            </Box>
          ))}
        </>
      )}
    </Card>
  );

  const tabTitles = { overview: 'Dashboard Overview', courses: 'My Courses', history: 'Exam History' };

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)', fontFamily: ff }}>
      {/* Desktop sidebar */}
      {!isMobile && <Box sx={{ width: SIDEBAR_W, flexShrink: 0 }}>{sidebar}</Box>}

      {/* Mobile drawer */}
      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: SIDEBAR_W, border: 'none' } }}>
        {sidebar}
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, bgcolor: '#f8fafc', overflow: 'auto' }}>
        {/* Transparent Page Header (removes double header background) */}
        <Box sx={{ px: { xs: 2, md: 3.5 }, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)}
              sx={{ color: '#0f172a', bgcolor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', '&:hover': { bgcolor: '#f1f5f9' } }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.5rem', color: '#0f172a' }}>
            {tabTitles[tab]}
          </Typography>
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
