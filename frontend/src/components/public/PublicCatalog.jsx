import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardMedia, Chip, Button,
  Container, Grid, TextField, InputAdornment, Skeleton, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import QuizIcon from '@mui/icons-material/Quiz';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PaymentIcon from '@mui/icons-material/Payment';
import TimerIcon from '@mui/icons-material/Timer';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StarIcon from '@mui/icons-material/Star';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

/* ── reusable section heading ── */
const SectionTitle = ({ overline, title, subtitle, light }) => (
  <Box sx={{ textAlign: 'center', mb: 6 }}>
    {overline && (
      <Typography sx={{
        fontSize: '0.72rem', fontWeight: 700, letterSpacing: 2, fontFamily: ff,
        color: light ? '#60a5fa' : '#3b82f6', mb: 1.5, textTransform: 'uppercase',
      }}>{overline}</Typography>
    )}
    <Typography sx={{
      fontFamily: ff, fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 800,
      color: light ? '#fff' : '#0f172a', mb: 1.5, lineHeight: 1.25,
    }}>{title}</Typography>
    {subtitle && (
      <Typography sx={{
        fontFamily: ff, fontSize: '0.95rem', color: light ? '#94a3b8' : '#64748b',
        maxWidth: 560, mx: 'auto', lineHeight: 1.7,
      }}>{subtitle}</Typography>
    )}
  </Box>
);

export default function PublicCatalog() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = user && user.role === 'public_user';

  useEffect(() => {
    publicApi.listCourses()
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  /* ── how-it-works steps ── */
  const steps = [
    { icon: <PersonAddIcon />, title: 'Create Account', desc: 'Register with your email & pick a course to get started instantly.' },
    { icon: <AutoStoriesIcon />, title: 'Explore Content', desc: 'Browse study materials and exam papers. Free content is available with 1 attempt.' },
    { icon: <PaymentIcon />, title: 'Unlock Premium', desc: 'Pay once per course to get unlimited access to all premium content.' },
    { icon: <QuizIcon />, title: 'Take Exams', desc: 'Attempt timed exams with a real PDF paper + digital OMR. Get instant results.' },
  ];

  /* ── feature cards ── */
  const features = [
    { icon: <PictureAsPdfIcon sx={{ fontSize: 28 }} />, title: 'Real Question Papers', desc: 'Authentic PDF question papers displayed alongside a digital answer sheet.', color: '#ef4444' },
    { icon: <TimerIcon sx={{ fontSize: 28 }} />, title: 'Timed Mock Tests', desc: 'Practice under real exam conditions with countdown timers and auto-submit.', color: '#2563eb' },
    { icon: <LockOpenIcon sx={{ fontSize: 28 }} />, title: 'Free Content Access', desc: 'Every course has free sample papers. One attempt per free exam — make it count!', color: '#16a34a' },
    { icon: <StarIcon sx={{ fontSize: 28 }} />, title: 'Premium Unlimited', desc: 'Unlock all content in a course with a single payment. No recurring fees.', color: '#eab308' },
    { icon: <WarningAmberIcon sx={{ fontSize: 28 }} />, title: '1-Attempt Free Exams', desc: 'Free exams allow only 1 attempt. Upgrade to premium for re-attempts.', color: '#f97316' },
    { icon: <CheckCircleOutlineIcon sx={{ fontSize: 28 }} />, title: 'Instant Scoring', desc: 'Get your score immediately after submission. Track progress on your dashboard.', color: '#8b5cf6' },
  ];

  /* ── floating background exams ── */
  const backgroundExams = [
    { text: 'UPSC', top: '10%', left: '5%', size: '3rem', opacity: 0.08 },
    { text: 'SSC CGL', top: '25%', left: '80%', size: '2.5rem', opacity: 0.06 },
    { text: 'NEET', top: '60%', left: '10%', size: '3.5rem', opacity: 0.05 },
    { text: 'JEE MAIN', top: '75%', left: '85%', size: '3rem', opacity: 0.07 },
    { text: 'RRB NTPC', top: '15%', left: '40%', size: '2.2rem', opacity: 0.05 },
    { text: 'GATE', top: '45%', left: '8%', size: '2.8rem', opacity: 0.06 },
    { text: 'CAT', top: '50%', left: '70%', size: '3.2rem', opacity: 0.08 },
    { text: 'IBPS PO', top: '80%', left: '40%', size: '2.5rem', opacity: 0.06 },
    { text: 'SBI CLERK', top: '35%', left: '60%', size: '2.2rem', opacity: 0.05 },
    { text: 'NDA', top: '10%', left: '70%', size: '2.6rem', opacity: 0.07 },
    { text: 'STATE PSC', top: '90%', left: '60%', size: '2.8rem', opacity: 0.06 },
    { text: 'CLAT', top: '30%', left: '20%', size: '2.4rem', opacity: 0.05 },
    { text: 'RBI GRADE B', top: '65%', left: '30%', size: '2.3rem', opacity: 0.04 },
    { text: 'CTET', top: '85%', left: '20%', size: '2.6rem', opacity: 0.07 },
    { text: 'AFCAT', top: '20%', left: '25%', size: '2.2rem', opacity: 0.06 },  
  ];

  return (
    <Box sx={{ fontFamily: ff }}>

      {/* ═══════ 1. HERO ═══════ */}
      <Box sx={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
        py: { xs: 8, md: 14 }, px: 3, textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* floating text background */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {backgroundExams.map((exam, i) => (
            <Typography key={i} sx={{
              position: 'absolute', top: exam.top, left: exam.left,
              fontSize: exam.size, fontWeight: 900, color: '#fff',
              opacity: exam.opacity, fontFamily: ff, letterSpacing: 2,
              whiteSpace: 'nowrap', userSelect: 'none',
              transform: 'translate(-50%, -50%)',
            }}>
              {exam.text}
            </Typography>
          ))}
        </Box>

        {/* decorative circles */}
        <Box sx={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%)', top: '-20%', right: '-8%' }} />
        <Box sx={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 70%)', bottom: '-12%', left: '5%' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.5,
            borderRadius: '100px', bgcolor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', mb: 3,
          }}>
            <AutoStoriesIcon sx={{ fontSize: 16, color: '#60a5fa' }} />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#60a5fa', letterSpacing: 1.5, fontFamily: ff }}>
              PUBLIC EXAMINATION PLATFORM
            </Typography>
          </Box>

          <Typography sx={{
            fontSize: { xs: '2rem', md: '3.2rem' }, fontWeight: 800, color: '#fff',
            lineHeight: 1.15, mb: 2.5, letterSpacing: '-0.025em', fontFamily: ff,
          }}>
            Prepare. Practice.{' '}
            <Box component="span" sx={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Succeed.
            </Box>
          </Typography>

          <Typography sx={{ fontSize: { xs: '1rem', md: '1.15rem' }, color: '#94a3b8', fontFamily: ff, maxWidth: 560, mx: 'auto', lineHeight: 1.7, mb: 5 }}>
            Access real question papers, study materials, and timed mock tests for competitive exams. 
            Register, pick a course, and start preparing — free content included.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isLoggedIn ? (
              <Button variant="contained" size="large" onClick={() => navigate('/public/dashboard')}
                sx={{ fontFamily: ff, fontWeight: 700, borderRadius: '12px', px: 4, py: 1.5, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 8px 24px rgba(59,130,246,0.3)', textTransform: 'none', fontSize: '1.05rem', '&:hover': { transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
                Go to Dashboard →
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large" onClick={() => navigate('/public/register')}
                  sx={{ fontFamily: ff, fontWeight: 700, borderRadius: '12px', px: 4, py: 1.5, bgcolor: '#fff', color: '#0f172a', '&:hover': { bgcolor: '#f8fafc', transform: 'translateY(-2px)' }, textTransform: 'none', fontSize: '1.05rem', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(255,255,255,0.15)' }}>
                  Create Free Account
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/public/login')}
                  sx={{ fontFamily: ff, fontWeight: 600, borderRadius: '12px', px: 4, py: 1.5, borderColor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { borderColor: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)' }, textTransform: 'none', fontSize: '1.05rem' }}>
                  Sign In
                </Button>
              </>
            )}
          </Box>

          {/* trust badges */}
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 6, flexWrap: 'wrap' }}>
            {['Free Content Included', 'Instant Results', 'Secure Payments'].map(t => (
              <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#34d399' }} />
                <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: ff, fontWeight: 500 }}>{t}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ═══════ 2. HOW IT WORKS ═══════ */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: '#fff' }}>
        <Container maxWidth="lg">
          <SectionTitle overline="HOW IT WORKS" title="Get Started in 4 Simple Steps" subtitle="From registration to taking your first exam — it only takes a few minutes." />
          <Grid container spacing={3} justifyContent="center">
            {steps.map((s, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Box sx={{
                    width: 64, height: 64, borderRadius: '16px', mx: 'auto', mb: 2,
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', boxShadow: '0 6px 20px rgba(59,130,246,0.25)',
                    position: 'relative',
                  }}>
                    {s.icon}
                    <Box sx={{
                      position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%',
                      bgcolor: '#0f172a', color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ff,
                    }}>{i + 1}</Box>
                  </Box>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 0.8 }}>{s.title}</Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>{s.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════ 3. PLATFORM FEATURES ═══════ */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: '#f8fafc' }}>
        <Container maxWidth="lg">
          <SectionTitle overline="PLATFORM FEATURES" title="Everything You Need to Prepare" subtitle="Real papers, timed exams, instant scoring — all in one place." />
          <Grid container spacing={3} justifyContent="center">
            {features.map((f, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card sx={{
                  borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none',
                  height: '100%', transition: 'all 0.25s', p: 3, textAlign: 'center',
                  '&:hover': { borderColor: '#93c5fd', boxShadow: '0 8px 30px rgba(59,130,246,0.08)', transform: 'translateY(-3px)' },
                }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: `${f.color}10`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, mx: 'auto' }}>
                    {f.icon}
                  </Box>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#0f172a', mb: 1 }}>{f.title}</Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.7 }}>{f.desc}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════ 4. PREVIEW SCREENSHOTS ═══════ */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: '#0f172a' }}>
        <Container maxWidth="lg">
          <SectionTitle light overline="PLATFORM PREVIEW" title="See How It Works" subtitle="A real PDF question paper on the left, your digital answer sheet on the right. Timed, scored, and instant results." />
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} md={6}>
              <Box sx={{
                borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                bgcolor: 'rgba(255,255,255,0.03)', p: 2.5, textAlign: 'center'
              }}>
                <Box sx={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <Box component="img" src="/images/previews/exam-interface.png" alt="Exam Interface" sx={{ width: '100%', display: 'block' }} />
                </Box>
                <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#fff', mt: 2.5, fontSize: '1rem' }}>
                  📝 Exam Interface
                </Typography>
                <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, mt: 0.5, mx: 'auto', maxWidth: 400 }}>
                  PDF question paper displayed alongside a digital OMR sheet. Navigate questions, mark answers, and submit — all timed.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{
                borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                bgcolor: 'rgba(255,255,255,0.03)', p: 2.5, textAlign: 'center'
              }}>
                <Box sx={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <Box component="img" src="/images/previews/content-access.png" alt="Content Access" sx={{ width: '100%', display: 'block' }} />
                </Box>
                <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#fff', mt: 2.5, fontSize: '1rem' }}>
                  🔓 Freemium Content Access
                </Typography>
                <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, mt: 0.5, mx: 'auto', maxWidth: 400 }}>
                  Free content is accessible with 1 attempt. Premium content requires a one-time payment per course to unlock unlimited access.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ═══════ 5. FREE vs PREMIUM ═══════ */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: '#fff' }}>
        <Container maxWidth="md">
          <SectionTitle overline="ACCESS MODEL" title="Free vs Premium" subtitle="Start with free content. Upgrade when you're ready." />
          <Grid container spacing={3} justifyContent="center">
            {/* Free Tier */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px', border: '2px solid #e2e8f0', boxShadow: 'none', height: '100%' }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LockOpenIcon sx={{ color: '#16a34a' }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Free Access</Typography>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#64748b' }}>₹0 — No payment required</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {['Access free study materials', 'Attempt free exam papers', '1 attempt per free exam', 'View your score instantly', 'Course enrollment included'].map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.2 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#16a34a' }} />
                      <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#334155' }}>{f}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 1, mb: 1.2 }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: '#f97316' }} />
                    <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#f97316', fontWeight: 600 }}>No re-attempts on free exams</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            {/* Premium Tier */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px', border: '2px solid #2563eb', boxShadow: '0 8px 30px rgba(37,99,235,0.12)', height: '100%', position: 'relative', overflow: 'visible' }}>
                <Box sx={{ position: 'absolute', top: -12, right: 20, px: 2, py: 0.4, bgcolor: '#2563eb', borderRadius: '8px' }}>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.7rem', fontWeight: 700, color: '#fff', letterSpacing: 1 }}>RECOMMENDED</Typography>
                </Box>
                <CardContent sx={{ p: 3.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <StarIcon sx={{ color: '#2563eb' }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Premium Access</Typography>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#64748b' }}>One-time payment per course</Typography>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {['Everything in Free tier', 'All premium study materials', 'All premium exam papers', 'Unlimited re-attempts', 'Full course content unlocked', 'Priority support'].map((f, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.2 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                      <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#334155' }}>{f}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ═══════ 6. COURSE CATALOG ═══════ */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: '#f8fafc' }}>
        <Container maxWidth="lg">
          <SectionTitle overline="AVAILABLE COURSES" title="Browse Our Exam Catalog" subtitle="Click any course to explore its syllabus, free papers, and premium content." />

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <TextField fullWidth placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94a3b8' }} /></InputAdornment> }}
              sx={{ maxWidth: 480, '& .MuiOutlinedInput-root': { borderRadius: '14px', bgcolor: '#fff', fontFamily: ff, '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#93c5fd' }, '&.Mui-focused fieldset': { borderColor: '#3b82f6' } } }}
            />
          </Box>

          {loading ? (
            <Grid container spacing={3} justifyContent="center">{[1,2,3].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={300} sx={{ borderRadius: '16px' }} /></Grid>)}</Grid>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}><Typography sx={{ fontSize: '1.1rem', color: '#64748b', fontFamily: ff }}>{search ? 'No courses match your search.' : 'No courses available yet.'}</Typography></Box>
          ) : (
            <Grid container spacing={3} justifyContent="center">
              {filtered.map(course => (
                <Grid item xs={12} sm={6} md={4} key={course.id}>
                  <Card onClick={() => navigate(`/public/course/${course.id}`)}
                    sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'all 0.25s', '&:hover': { borderColor: '#93c5fd', boxShadow: '0 8px 30px rgba(59,130,246,0.12)', transform: 'translateY(-4px)' } }}>
                    <CardMedia sx={{ height: 150, background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'flex-end', p: 2 }}>
                      <Chip icon={course.price > 0 ? <LockIcon sx={{ fontSize: 14 }} /> : <LockOpenIcon sx={{ fontSize: 14 }} />} label={course.price > 0 ? `₹${course.price}` : 'Free'} size="small"
                        sx={{ bgcolor: course.price > 0 ? 'rgba(234,179,8,0.9)' : 'rgba(34,197,94,0.9)', color: '#fff', fontWeight: 700, fontFamily: ff, '& .MuiChip-icon': { color: '#fff' } }} />
                    </CardMedia>
                    <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography sx={{ fontFamily: ff, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', mb: 1, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.title}</Typography>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6, mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.description || 'Explore this course to learn more.'}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: ff, fontWeight: 600 }}>{course.content_count || 0} Items</Typography>
                        <ArrowForwardIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      {/* ═══════ 7. CTA FOOTER ═══════ */}
      <Box sx={{ py: { xs: 8, md: 10 }, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography sx={{ fontFamily: ff, fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800, color: '#fff', mb: 2 }}>
            Ready to Start Preparing?
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '1rem', color: 'rgba(255,255,255,0.8)', mb: 4, lineHeight: 1.7 }}>
            Create a free account, choose a course, and access study materials and exam papers right away.
          </Typography>
          {!isLoggedIn && (
            <Button variant="contained" size="large" onClick={() => navigate('/public/register')}
              sx={{ fontFamily: ff, fontWeight: 700, borderRadius: '12px', px: 5, py: 1.5, bgcolor: '#fff', color: '#1d4ed8', textTransform: 'none', fontSize: '1.05rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', '&:hover': { bgcolor: '#f8fafc', transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}>
              Get Started — It's Free →
            </Button>
          )}
        </Container>
      </Box>
    </Box>
  );
}
