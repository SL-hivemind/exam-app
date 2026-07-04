import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Container, Grid, TextField, InputAdornment, Chip, Button,
  Skeleton, Stack, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltIcon from '@mui/icons-material/Bolt';
import QuizIcon from '@mui/icons-material/Quiz';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TimerIcon from '@mui/icons-material/Timer';
import InsightsIcon from '@mui/icons-material/Insights';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { publicApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import { GlassCard } from '../common';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const CATEGORIES = ['NEET', 'JEE', 'UPSC', 'SSC', 'Banking', 'Railways', 'GATE', 'CAT'];

const FLOATING = [
  { t: 'UPSC', top: '12%', left: '6%', s: '2.6rem', o: 0.06 },
  { t: 'NEET', top: '22%', left: '82%', s: '3rem', o: 0.05 },
  { t: 'SSC CGL', top: '64%', left: '10%', s: '2.4rem', o: 0.05 },
  { t: 'JEE', top: '74%', left: '86%', s: '2.8rem', o: 0.06 },
  { t: 'IBPS PO', top: '40%', left: '90%', s: '2rem', o: 0.05 },
  { t: 'GATE', top: '80%', left: '44%', s: '2.2rem', o: 0.05 },
  { t: 'CAT', top: '14%', left: '46%', s: '2.4rem', o: 0.05 },
];

const FEATURES = [
  { icon: <QuizIcon />, title: 'Extensive Question Repository', desc: 'Practice with thousands of high-quality questions for your target exam.', color: 'blue' },
  { icon: <TimerIcon />, title: 'Computer-Based Tests', desc: 'Take timed CBT mock tests under real conditions with auto-submit.', color: 'orange' },
  { icon: <InsightsIcon />, title: 'Instant scoring & analytics', desc: 'Get your score the moment you submit and track progress on your dashboard.', color: 'indigo' },
  { icon: <BoltIcon />, title: 'Daily challenge + streaks', desc: '5 fresh questions every day from your courses to keep momentum going.', color: 'success' },
];

const STEPS = [
  { icon: <MenuBookIcon />, title: 'Pick your exam', desc: 'Choose a course for your target exam — enrollment is free.' },
  { icon: <PlayArrowIcon />, title: 'Practice free', desc: 'Access free question banks and chapter practice. Unlock premium when ready.' },
  { icon: <QuizIcon />, title: 'Test & improve', desc: 'Take timed mocks, get instant results, and track your growth.' },
];

export default function PublicCatalog() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = user && user.role === 'public_user';

  useEffect(() => {
    publicApi.listCourses()
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const matches = c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    if (filter === 'free') return matches && (!c.price || c.price === 0);
    if (filter === 'premium') return matches && c.price > 0;
    return matches;
  }).sort((a, b) => {
    // Sort Free first, then alphabetically
    const aFree = !a.price || a.price === 0;
    const bFree = !b.price || b.price === 0;
    if (aFree && !bFree) return -1;
    if (!aFree && bFree) return 1;
    return a.title.localeCompare(b.title);
  });

  const freeCount = courses.filter(c => !c.price || c.price === 0).length;
  const scrollToCatalog = () => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });

  const sectionLabel = (overline, title) => (
    <Box sx={{ textAlign: 'center', mb: 5 }}>
      <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '0.72rem', letterSpacing: 2.5, color: '#ffb054', textTransform: 'uppercase', mb: 1.5 }}>
        {overline}
      </Typography>
      <Typography sx={{
        fontFamily: ff, fontWeight: 800, fontSize: { xs: '1.7rem', md: '2.2rem' }, lineHeight: 1.2,
        background: 'linear-gradient(120deg,#ffffff,#c7d2fe 78%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ fontFamily: ff }}>

      {/* ═══════════ HERO ═══════════ */}
      <Box sx={{ position: 'relative', overflow: 'hidden', py: { xs: 7, md: 12 }, px: 3 }}>
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {FLOATING.map((e, i) => (
            <Typography key={i} sx={{ position: 'absolute', top: e.top, left: e.left, fontSize: e.s, fontWeight: 900, color: '#fff', opacity: e.o, letterSpacing: 2, whiteSpace: 'nowrap', transform: 'translate(-50%,-50%)' }}>
              {e.t}
            </Typography>
          ))}
        </Box>

        <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          >
            <Chip
              icon={<WorkspacePremiumIcon sx={{ fontSize: 16 }} />}
              label="Competitive exam preparation, done right"
              sx={{ mb: 3, px: 1, py: 2, bgcolor: 'rgba(246,137,20,0.14)', color: '#ffce9e', border: '1px solid rgba(246,137,20,0.30)', fontWeight: 700, '& .MuiChip-icon': { color: '#ffb054' } }}
            />
            <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: { xs: '2.1rem', md: '3.3rem' }, lineHeight: 1.12, letterSpacing: '-0.025em', color: '#f5f8ff', mb: 2 }}>
              Crack your exam with{' '}
              <Box component="span" sx={{ background: 'linear-gradient(120deg,#6f9bff,#f68914)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                extensive question banks
              </Box>
            </Typography>
            <Typography sx={{ fontFamily: ff, fontSize: { xs: '1rem', md: '1.15rem' }, color: '#b4c0e4', maxWidth: 600, mx: 'auto', lineHeight: 1.7, mb: 4 }}>
              Browse courses for NEET, JEE, UPSC, SSC, Banking and more. Start free, practice with
              our massive question repository, and get instant results.
            </Typography>

            {/* Search */}
            <TextField
              fullWidth placeholder="Search exams or courses…" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') scrollToCatalog(); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#aeb9e0' }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><Button variant="gradient" onClick={scrollToCatalog} sx={{ borderRadius: '10px' }}>Search</Button></InputAdornment>,
              }}
              sx={{ maxWidth: 560, mx: 'auto', mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.05)', height: 56, fontFamily: ff } }}
            />

            {/* Category quick chips */}
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
              {CATEGORIES.map(c => (
                <Chip key={c} label={c} clickable onClick={() => { setSearch(c); scrollToCatalog(); }}
                  sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#cdd6f4', '&:hover': { bgcolor: 'rgba(246,137,20,0.14)', borderColor: 'rgba(246,137,20,0.4)', color: '#ffce9e' } }} />
              ))}
            </Stack>

            {/* Primary CTAs */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              {isLoggedIn ? (
                <Button variant="gradient" size="large" onClick={() => navigate('/public/dashboard')} sx={{ px: 4, height: 50, fontSize: '1.02rem' }} endIcon={<ArrowForwardIcon />}>
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="gradient" size="large" onClick={() => navigate('/public/register')} sx={{ px: 4, height: 50, fontSize: '1.02rem' }}>
                    Create free account
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate('/public/login')} sx={{ px: 4, height: 50, fontSize: '1.02rem' }}>
                    Sign in
                  </Button>
                </>
              )}
            </Stack>

            {/* Trust row */}
            <Stack direction="row" spacing={4} justifyContent="center" flexWrap="wrap" useFlexGap sx={{ mt: 5 }}>
              {[`${courses.length || '50'}+ courses`, '10,000+ Questions', 'Instant results'].map(t => (
                <Stack key={t} direction="row" alignItems="center" spacing={0.8}>
                  <CheckCircleIcon sx={{ fontSize: 17, color: '#34d399' }} />
                  <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#b4c0e4', fontWeight: 600 }}>{t}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* ═══════════ CATALOG ═══════════ */}
      <Box id="catalog" sx={{ py: { xs: 5, md: 7 } }}>
        <Container maxWidth="lg">
          {sectionLabel('Explore courses', 'Find your exam, start in minutes')}

          {/* Filter row */}
          <Stack direction="row" spacing={1.25} justifyContent="center" sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
            {[{ k: 'all', l: 'All' }, { k: 'free', l: 'Free' }, { k: 'premium', l: 'Premium' }].map(f => (
              <Chip key={f.k} label={f.l} clickable onClick={() => setFilter(f.k)}
                sx={{ fontFamily: ff, fontWeight: 700, px: 1.5, py: 2, borderRadius: '10px',
                  background: filter === f.k ? 'linear-gradient(135deg,#2f6bff,#f68914)' : 'rgba(255,255,255,0.05)',
                  color: filter === f.k ? '#fff' : '#aeb9e0', border: filter === f.k ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: filter === f.k ? '0 6px 18px rgba(246,137,20,0.30)' : 'none',
                  '&:hover': { background: filter === f.k ? 'linear-gradient(135deg,#2f6bff,#f68914)' : 'rgba(255,255,255,0.10)' } }} />
            ))}
          </Stack>

          {loading ? (
            <Grid container spacing={3}>{[1, 2, 3, 4, 5, 6].map(i => (
              <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={260} sx={{ borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.05)' }} /></Grid>
            ))}</Grid>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <MenuBookIcon sx={{ fontSize: 44, color: '#7e8abb', mb: 1 }} />
              <Typography sx={{ fontFamily: ff, color: '#aeb9e0', fontSize: '1.05rem' }}>
                {search ? `No courses match “${search}”.` : 'No courses available yet.'}
              </Typography>
              {search && <Button onClick={() => setSearch('')} sx={{ mt: 1, color: '#ffb054' }}>Clear search</Button>}
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filtered.map((course, i) => {
                const isFree = !course.price || course.price === 0;
                return (
                  <Grid item xs={12} sm={6} md={4} key={course.id} sx={{ display: 'flex' }}>
                    <Box component={motion.div} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: (i % 3) * 0.05 }} sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                      <GlassCard interactive glow={isFree ? 'success' : 'orange'} onClick={() => navigate(`/public/course/${course.id}`)} sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Media */}
                        <Box sx={{
                          height: 130, position: 'relative', display: 'flex', alignItems: 'flex-end', p: 2,
                          background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : 'linear-gradient(135deg, rgba(47,107,255,0.4), rgba(246,137,20,0.35))',
                        }}>
                          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(7,11,29,0.55))' }} />
                          <Chip
                            icon={isFree ? <LockOpenIcon sx={{ fontSize: 14 }} /> : <LockIcon sx={{ fontSize: 14 }} />}
                            label={isFree ? 'Free' : `₹${course.price}`}
                            size="small"
                            sx={{ position: 'relative', fontFamily: ff, fontWeight: 800, color: '#fff',
                              bgcolor: isFree ? 'rgba(16,185,129,0.92)' : 'rgba(246,137,20,0.95)', '& .MuiChip-icon': { color: '#fff' } }}
                          />
                        </Box>
                        {/* Body */}
                        <Box sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1.05rem', color: '#f5f8ff', mb: 1, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {course.title}
                          </Typography>
                          <Typography sx={{ fontFamily: ff, fontSize: '0.83rem', color: '#a9b4dd', lineHeight: 1.6, mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {course.description || 'Explore questions and CBT mock tests for this exam.'}
                          </Typography>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto' }}>
                            <Stack direction="row" alignItems="center" spacing={0.7}>
                              <MenuBookIcon sx={{ fontSize: 16, color: '#9fc1ff' }} />
                              <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#aeb9e0', fontWeight: 600 }}>{course.content_count || 0} items</Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#ffb054' }}>
                              <Typography sx={{ fontFamily: ff, fontSize: '0.8rem', fontWeight: 700 }}>View</Typography>
                              <ArrowForwardIcon sx={{ fontSize: 16 }} />
                            </Stack>
                          </Stack>
                        </Box>
                      </GlassCard>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>
      </Box>

      {/* ═══════════ FEATURES ═══════════ */}
      <Box sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="lg">
          {sectionLabel('Why SL Exams', 'Built for serious preparation')}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
            {FEATURES.map((f, i) => (
              <Box key={i} sx={{ width: { xs: '100%', sm: 320, md: 260 }, display: 'flex' }}>
                <GlassCard glow={f.color} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 240 }}>
                  <Box sx={{ width: 50, height: 50, borderRadius: '14px', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    background: f.color === 'orange' ? 'linear-gradient(135deg,#f68914,#ff7a00)' : f.color === 'success' ? 'linear-gradient(135deg,#10b981,#34d399)' : f.color === 'indigo' ? 'linear-gradient(135deg,#5b6cff,#818cf8)' : 'linear-gradient(135deg,#2f6bff,#60a5fa)',
                    boxShadow: '0 8px 22px rgba(47,107,255,0.3)' }}>
                    {f.icon}
                  </Box>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#f5f8ff', mb: 0.75 }}>{f.title}</Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.83rem', color: '#a9b4dd', lineHeight: 1.6, flex: 1 }}>{f.desc}</Typography>
                </GlassCard>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <Box sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="md">
          {sectionLabel('How it works', 'From sign-up to your first score')}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 3 }}>
            {STEPS.map((s, i) => (
              <Box key={i} sx={{ width: { xs: '100%', sm: 320, md: 260 }, display: 'flex' }}>
                <GlassCard sx={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
                  <Box sx={{ position: 'relative', width: 60, height: 60, mx: 'auto', mb: 2, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'linear-gradient(135deg,#2f6bff,#f68914)', boxShadow: '0 8px 22px rgba(246,137,20,0.35)' }}>
                    {s.icon}
                    <Box sx={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(9,14,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffb054', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</Box>
                  </Box>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#f5f8ff', mb: 0.75 }}>{s.title}</Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.83rem', color: '#a9b4dd', lineHeight: 1.6, flex: 1 }}>{s.desc}</Typography>
                </GlassCard>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ═══════════ FREE vs PREMIUM ═══════════ */}
      <Box sx={{ py: { xs: 6, md: 9 } }}>
        <Container maxWidth="md">
          {sectionLabel('Access model', 'Start free, upgrade when ready')}
          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
              <GlassCard glow="success" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(16,185,129,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LockOpenIcon sx={{ color: '#34d399' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#f5f8ff' }}>Free</Typography>
                    <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#a9b4dd' }}>₹0 — no payment needed</Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ flex: 1 }}>
                  {['Free question bank practice', 'Free mock tests', '1 attempt per free exam', 'Instant score', 'Course enrollment included'].map(t => (
                    <Stack key={t} direction="row" alignItems="center" spacing={1.2} sx={{ mb: 1.2 }}>
                      <CheckCircleIcon sx={{ fontSize: 18, color: '#34d399' }} />
                      <Typography sx={{ fontFamily: ff, fontSize: '0.86rem', color: '#cdd6f4' }}>{t}</Typography>
                    </Stack>
                  ))}
                </Box>
              </GlassCard>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
              <GlassCard glow="orange" sx={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(246,137,20,0.45)' }}>
                <Box sx={{ position: 'absolute', top: 14, right: 14 }}>
                  <Chip label="RECOMMENDED" size="small" sx={{ fontFamily: ff, fontWeight: 800, fontSize: '0.62rem', letterSpacing: 1, color: '#1a1206', background: 'linear-gradient(135deg,#f68914,#ffb054)' }} />
                </Box>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: 'rgba(246,137,20,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WorkspacePremiumIcon sx={{ color: '#ffb054' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#f5f8ff' }}>Premium</Typography>
                    <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#a9b4dd' }}>One-time payment per course</Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                {['Everything in Free', 'All premium questions & tests', 'Unlimited re-attempts', 'Full course unlocked', 'Priority support'].map(t => (
                  <Stack key={t} direction="row" alignItems="center" spacing={1.2} sx={{ mb: 1.2 }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: '#ffb054' }} />
                    <Typography sx={{ fontFamily: ff, fontSize: '0.86rem', color: '#cdd6f4' }}>{t}</Typography>
                  </Stack>
                ))}
              </GlassCard>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ═══════════ CTA ═══════════ */}
      <Box sx={{ py: { xs: 7, md: 10 }, px: 3 }}>
        <Container maxWidth="md">
          <Box sx={{
            position: 'relative', overflow: 'hidden', borderRadius: '26px', textAlign: 'center', p: { xs: 4, md: 6 },
            background: 'linear-gradient(120deg, rgba(47,107,255,0.28), rgba(246,137,20,0.24))',
            border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)',
          }}>
            <Box sx={{ position: 'absolute', top: -60, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(246,137,20,0.4), transparent 65%)', filter: 'blur(24px)' }} />
            <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: { xs: '1.6rem', md: '2.2rem' }, color: '#f5f8ff', mb: 1.5, position: 'relative' }}>
              Ready to start preparing?
            </Typography>
            <Typography sx={{ fontFamily: ff, fontSize: '1rem', color: '#dbe3ff', mb: 4, maxWidth: 480, mx: 'auto', lineHeight: 1.7, position: 'relative' }}>
              Create a free account, pick your exam, and start practicing with our question repository right away.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ position: 'relative' }}>
              <Button variant="gradient" size="large" onClick={() => navigate(isLoggedIn ? '/public/dashboard' : '/public/register')} sx={{ px: 4, height: 50, fontSize: '1.02rem' }} endIcon={<ArrowForwardIcon />}>
                {isLoggedIn ? 'Go to Dashboard' : 'Get started — it’s free'}
              </Button>
              <Button variant="outlined" size="large" onClick={scrollToCatalog} sx={{ px: 4, height: 50, fontSize: '1.02rem' }}>
                Browse courses
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
