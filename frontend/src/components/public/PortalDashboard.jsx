import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Container, Toolbar, Grid, Card, CardContent,
  Chip, Button, Tabs, Tab, Avatar, Divider, Skeleton,
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import QuizIcon from '@mui/icons-material/Quiz';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PortalDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [subs, setSubs] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'public_user') { navigate('/portal/login'); return; }
    Promise.all([
      portalApi.mySubscriptions().catch(() => ({ data: { subscriptions: [] } })),
      portalApi.myAttempts().catch(() => ({ data: { attempts: [] } })),
    ]).then(([subsRes, attRes]) => {
      setSubs(subsRes.data.subscriptions || []);
      setAttempts(attRes.data.attempts || []);
    }).finally(() => setLoading(false));
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate('/portal/login'); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', fontFamily: ff }}>
      <Toolbar />

      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        py: { xs: 4, md: 6 }, px: 3,
      }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
            <Avatar sx={{
              width: 56, height: 56, bgcolor: '#2563eb', fontSize: '1.4rem', fontWeight: 800,
              boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
            }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: ff, fontWeight: 800, color: '#fff', fontSize: '1.3rem' }}>
                {user?.username || 'User'}
              </Typography>
              <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#94a3b8' }}>
                {user?.email}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<SchoolIcon />} onClick={() => navigate('/portal')}
                sx={{ fontFamily: ff, textTransform: 'none', color: '#94a3b8', fontWeight: 500, '&:hover': { color: '#fff' } }}>
                Browse Courses
              </Button>
              <Button startIcon={<LogoutIcon />} onClick={handleLogout}
                sx={{ fontFamily: ff, textTransform: 'none', color: '#ef4444', fontWeight: 500 }}>
                Logout
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: 'Enrolled Courses', value: subs.length, icon: <SchoolIcon />, color: '#2563eb' },
            { label: 'Exams Taken', value: attempts.filter(a => a.submitted_at).length, icon: <QuizIcon />, color: '#16a34a' },
            { label: 'Best Score', value: attempts.length > 0 ? `${Math.max(...attempts.filter(a => a.score != null).map(a => a.score), 0)}` : '—', icon: <TrendingUpIcon />, color: '#eab308' },
          ].map((stat, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: '12px',
                    bgcolor: `${stat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: stat.color,
                  }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: ff, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#94a3b8' }}>
                      {stat.label}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3, '& .MuiTab-root': { fontFamily: ff, fontWeight: 600, textTransform: 'none' },
            '& .Mui-selected': { color: '#2563eb' },
            '& .MuiTabs-indicator': { bgcolor: '#2563eb', borderRadius: 2 },
          }}>
          <Tab icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="My Courses" />
          <Tab icon={<QuizIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Exam History" />
        </Tabs>

        {loading ? (
          <Box>
            {[1, 2].map(i => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 2, borderRadius: '12px' }} />)}
          </Box>
        ) : tab === 0 ? (
          /* ── My Courses ── */
          subs.length === 0 ? (
            <Box sx={{
              textAlign: 'center', py: 8, bgcolor: '#fff', borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <SchoolIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
              <Typography sx={{ fontFamily: ff, color: '#64748b', mb: 2 }}>
                You haven't enrolled in any courses yet.
              </Typography>
              <Button onClick={() => navigate('/portal')} variant="contained"
                sx={{
                  fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)', px: 4,
                }}>
                Browse Courses
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {subs.map(sub => (
                <Grid item xs={12} sm={6} md={4} key={sub.id}>
                  <Card
                    onClick={() => navigate(`/portal/course/${sub.course_id}`)}
                    sx={{
                      borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: 'none',
                      cursor: 'pointer', transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
                    }}>
                    <CardContent>
                      <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#0f172a', mb: 1, fontSize: '0.95rem' }}>
                        {sub.course_title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={sub.status} size="small"
                          sx={{
                            fontFamily: ff, fontWeight: 600,
                            bgcolor: sub.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                            color: sub.status === 'active' ? '#16a34a' : '#eab308',
                          }} />
                        <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', color: '#94a3b8' }}>
                          {sub.enrolled_at ? new Date(sub.enrolled_at).toLocaleDateString() : ''}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )
        ) : (
          /* ── Exam History ── */
          attempts.length === 0 ? (
            <Box sx={{
              textAlign: 'center', py: 8, bgcolor: '#fff', borderRadius: '16px',
              border: '1px solid #e2e8f0',
            }}>
              <QuizIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
              <Typography sx={{ fontFamily: ff, color: '#64748b' }}>
                No exam attempts yet.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {attempts.map((att, i) => (
                <React.Fragment key={att.id}>
                  {i > 0 && <Divider />}
                  <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ fontFamily: ff, fontWeight: 600, color: '#0f172a', fontSize: '0.92rem' }}>
                        {att.content_title || `Exam #${att.content_id}`}
                      </Typography>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#94a3b8' }}>
                        {att.submitted_at ? new Date(att.submitted_at).toLocaleString() : 'In Progress'}
                      </Typography>
                    </Box>
                    {att.score !== null && att.score !== undefined ? (
                      <Chip label={`${att.score} / ${att.total_questions}`} size="small"
                        sx={{
                          fontFamily: ff, fontWeight: 700,
                          bgcolor: att.score >= (att.total_questions * 0.6) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: att.score >= (att.total_questions * 0.6) ? '#16a34a' : '#ef4444',
                        }} />
                    ) : (
                      <Chip label={att.submitted_at ? 'Submitted' : 'In Progress'} size="small"
                        sx={{
                          fontFamily: ff, fontWeight: 600,
                          bgcolor: 'rgba(59,130,246,0.1)', color: '#2563eb',
                        }} />
                    )}
                  </Box>
                </React.Fragment>
              ))}
            </Box>
          )
        )}
      </Container>
    </Box>
  );
}
