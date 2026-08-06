import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Container, Card, Chip, Button,
  Skeleton, List, ListItem, ListItemIcon, ListItemText, Divider, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, Stack, Tooltip, LinearProgress,
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TimerIcon from '@mui/icons-material/Timer';
import InsightsIcon from '@mui/icons-material/Insights';
import BoltIcon from '@mui/icons-material/Bolt';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LaunchIcon from '@mui/icons-material/Launch';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useParams, useNavigate } from 'react-router-dom';
import { publicApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';
import { Seo } from '../common';
import { absoluteUrl, courseUrl, ORG_NAME, SITE_URL } from '../../utils/site';
import { guideFor, COURSE_FAQ } from './examGuides';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

/* Google truncates around 160 characters. */
const SEO_DESC_MAX = 158;

function seoDescription(course) {
  const own = (course.description || '').trim().replace(/\s+/g, ' ');
  const tail = `${course.title} online practice: mock tests, previous year question papers `
    + `and chapter-wise questions with instant results.`
    + (course.price === 0 ? ' Free to start.' : '');

  if (!own) return tail.slice(0, SEO_DESC_MAX);
  if (own.length >= SEO_DESC_MAX) return own.slice(0, SEO_DESC_MAX);

  const room = SEO_DESC_MAX - own.length - 1;
  const extra = `${course.title} mock tests, previous year papers and chapter-wise practice.`;
  return room > 40 ? `${own} ${extra.slice(0, room)}` : own;
}

const CARD_SX = {
  bgcolor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '16px',
};

/* Below this many questions a course is still being stocked, and the page says
   so rather than advertising a practice bank that runs out in one session. */
const STOCKED_THRESHOLD = 50;

const FORMAT_LABELS = {
  mcq: 'Single correct (MCQ)',
  msq: 'Multiple correct (MSQ)',
  nat: 'Numeric answer (NAT)',
  assertion_reason: 'Assertion & Reason',
  match: 'Match the following',
  statement: 'Statement based',
};

/* What every enrolled learner gets — the course page never said this before. */
const COURSE_BENEFITS = [
  { icon: <MenuBookIcon />, title: 'Chapter-wise practice', desc: 'Work the repository subject by subject or drill a single chapter until it sticks.' },
  { icon: <BoltIcon />, title: 'Adaptive sessions', desc: 'Questions get harder as you get them right, and ease off when you slip.' },
  { icon: <TimerIcon />, title: 'Timed mock tests', desc: 'Full-length papers under real timing and real marking, with auto-submit.' },
  { icon: <InsightsIcon />, title: 'Instant analysis', desc: 'Score the moment you submit, plus subject-wise accuracy on your dashboard.' },
];

function SectionTitle({ overline, title, sx }) {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      {overline && (
        <Typography sx={{
          fontFamily: ff, fontWeight: 800, fontSize: '0.7rem', letterSpacing: 2.2,
          color: '#ffb054', textTransform: 'uppercase', mb: 1,
        }}>
          {overline}
        </Typography>
      )}
      <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.55rem' }, color: '#eaf0ff' }}>
        {title}
      </Typography>
    </Box>
  );
}

function FactTile({ label, value }) {
  return (
    <Box sx={{ ...CARD_SX, p: 2, height: '100%' }}>
      <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', letterSpacing: 1, textTransform: 'uppercase', color: '#8f9cc9', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.05rem', color: '#f5f8ff' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function PublicCourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = user && user.role === 'public_user';

  const [course, setCourse] = useState(null);
  const [contents, setContents] = useState([]);
  const [syllabus, setSyllabus] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);

  const applyCourse = (data) => {
    setCourse(data.course);
    setContents(data.contents || []);
    setSyllabus(data.syllabus || null);
    setIsEnrolled(data.is_enrolled);
    setIsSubscribed(data.is_subscribed);
  };

  useEffect(() => {
    setLoading(true);
    publicApi.getCourse(courseId)
      .then(r => applyCourse(r.data))
      .catch(() => setError('Course not found'))
      .finally(() => setLoading(false));
  }, [courseId]);

  const cbtTests = useMemo(() => contents.filter(c => c.content_type === 'cbt_exam'), [contents]);
  const materials = useMemo(() => contents.filter(c => c.content_type !== 'cbt_exam'), [contents]);
  const guide = useMemo(() => guideFor(course, syllabus?.tags), [course, syllabus]);

  const questionCount = syllabus?.total_questions ?? course?.question_count ?? 0;
  const subjects = syllabus?.subjects || [];
  const hasAccess = isSubscribed || (isEnrolled && (course?.price || 0) === 0);
  // Newly-launched courses carry only sample questions — pitching them as a
  // ready practice bank would be a lie the first session immediately exposes.
  const isSeedStage = questionCount > 0 && questionCount < STOCKED_THRESHOLD;
  const namedFormats = (syllabus?.formats || []).filter(f => FORMAT_LABELS[f]);

  const reload = async () => {
    const r = await publicApi.getCourse(courseId);
    applyCourse(r.data);
  };

  const handleEnroll = async () => {
    if (!isLoggedIn) { setLoginPrompt(true); return; }
    setBusy(true); setError(''); setMsg('');
    try {
      await publicApi.enrollFree(courseId);
      setMsg('Enrolled successfully! You now have access to free content.');
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment failed');
    } finally { setBusy(false); }
  };

  const handlePayment = async () => {
    if (!isLoggedIn) { setLoginPrompt(true); return; }
    setBusy(true); setError(''); setMsg('');
    try {
      const orderRes = await publicApi.createOrder(courseId);
      const { order_id, amount, currency, key_id } = orderRes.data;

      const options = {
        key: key_id, amount, currency,
        name: 'SL Exams',
        description: course.title,
        order_id,
        handler: async (response) => {
          try {
            await publicApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setMsg('Payment successful! You now have full access.');
            await reload();
          } catch {
            setError('Payment verification failed. Contact support.');
          }
        },
        prefill: { email: user?.email },
        theme: { color: '#cfe0ff' },
      };

      if (window.Razorpay) {
        new window.Razorpay(options).open();
      } else {
        setError('Payment SDK not loaded. Please refresh and try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initiation failed');
    } finally { setBusy(false); }
  };

  const handleContentClick = (content) => {
    if (!isLoggedIn) { setLoginPrompt(true); return; }
    if (content.locked) {
      setError('This content requires a premium subscription. Please upgrade to access.');
      return;
    }
    if (content.attempt_submitted && content.content_type === 'cbt_exam') {
      setError(`You already completed this exam. Score: ${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}`);
      return;
    }
    navigate(`/public/viewer/${content.id}`, { state: { content } });
  };

  const goPractice = (subject) => {
    if (!isLoggedIn) { setLoginPrompt(true); return; }
    if (!hasAccess) {
      setError('Enroll in this course first — practice is scoped to the courses you are enrolled in.');
      return;
    }
    navigate(subject ? `/public/practice?mode=subject&subject=${encodeURIComponent(subject)}` : '/public/practice');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: '16px', mb: 3, bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.05)' }} />
      </Container>
    );
  }

  if (!course) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: ff, color: '#a9b4dd', fontSize: '1.1rem' }}>Course not found.</Typography>
        <Button onClick={() => navigate('/public')} sx={{ mt: 2, fontFamily: ff, textTransform: 'none' }}>
          ← Back to Catalog
        </Button>
      </Container>
    );
  }

  const description = course.description
    || guide?.tagline
    || 'Practice questions and timed mock tests for this exam.';

  return (
    <Box sx={{ fontFamily: ff }}>
      {/* Per-course metadata. Every course page previously served the same
          title and description as the homepage, so the whole catalog looked
          to a crawler like one duplicated page. */}
      <Seo
        path={courseUrl(course)}
        title={`${course.title} — Mock Tests, Practice Questions & PYQs`}
        /* Lead with the course's own description — it is specific and unique,
           which is what a snippet needs — then spend whatever room is left on
           the words people actually type. A description that is only keywords
           reads as spam; one with none never surfaces. */
        description={seoDescription(course)}
        image={course.thumbnail_url}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: course.title,
          description: course.description || undefined,
          url: absoluteUrl(courseUrl(course)),
          isAccessibleForFree: course.price === 0,
          provider: {
            '@type': 'EducationalOrganization',
            name: ORG_NAME,
            url: SITE_URL,
          },
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'online',
            courseWorkload: 'PT1H',
          },
        }}
      />

      {/* ═══════════ HEADER ═══════════ */}
      <Box sx={{ background: '#0f172a', py: { xs: 4, md: 6 }, px: 3 }}>
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/public')}
            sx={{
              fontFamily: ff, fontWeight: 500, textTransform: 'none',
              color: '#aeb9e0', mb: 3, borderRadius: '8px',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            Back to Catalog
          </Button>

          <Grid container spacing={4} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              {guide && (
                <Typography sx={{ fontFamily: ff, fontSize: '0.8rem', letterSpacing: 1.4, textTransform: 'uppercase', color: '#ffb054', fontWeight: 700, mb: 1 }}>
                  {guide.fullName}
                </Typography>
              )}
              <Typography sx={{
                fontFamily: ff, fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800,
                color: '#fff', lineHeight: 1.3, mb: 1.5,
              }}>
                {course.title}
              </Typography>
              <Typography sx={{
                fontFamily: ff, fontSize: '1rem', color: '#aeb9e0',
                lineHeight: 1.75, mb: 3, maxWidth: 680,
              }}>
                {description}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={course.price > 0 ? `₹${course.price}` : 'Free'}
                  sx={{
                    fontFamily: ff, fontWeight: 700,
                    bgcolor: course.price > 0 ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                    color: course.price > 0 ? '#eab308' : '#22c55e',
                  }}
                />
                {questionCount > 0 && (
                  <Chip
                    icon={<QuizIcon sx={{ fontSize: 16 }} />}
                    label={`${questionCount.toLocaleString()} questions`}
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(59,130,246,0.15)', color: '#60a5fa', '& .MuiChip-icon': { color: '#60a5fa' } }}
                  />
                )}
                {subjects.length > 0 && (
                  <Chip
                    icon={<MenuBookIcon sx={{ fontSize: 16 }} />}
                    label={`${subjects.length} subject${subjects.length > 1 ? 's' : ''}`}
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(168,85,247,0.15)', color: '#c084fc', '& .MuiChip-icon': { color: '#c084fc' } }}
                  />
                )}
                {cbtTests.length > 0 && (
                  <Chip
                    icon={<TimerIcon sx={{ fontSize: 16 }} />}
                    label={`${cbtTests.length} mock test${cbtTests.length > 1 ? 's' : ''}`}
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(246,137,20,0.15)', color: '#ffb054', '& .MuiChip-icon': { color: '#ffb054' } }}
                  />
                )}
                {syllabus?.pyq_years?.length > 0 && (
                  <Chip
                    icon={<HistoryEduIcon sx={{ fontSize: 16 }} />}
                    label={`PYQs ${syllabus.pyq_years[syllabus.pyq_years.length - 1]}–${syllabus.pyq_years[0]}`}
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(20,184,166,0.15)', color: '#2dd4bf', '& .MuiChip-icon': { color: '#2dd4bf' } }}
                  />
                )}
                {isSubscribed && (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    label="Full Access"
                    sx={{
                      fontFamily: ff, fontWeight: 600,
                      bgcolor: 'rgba(34,197,94,0.15)', color: '#22c55e',
                      '& .MuiChip-icon': { color: '#22c55e' },
                    }}
                  />
                )}
                {isEnrolled && !isSubscribed && (
                  <Chip
                    label="Enrolled — Free Content Only"
                    sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}
                  />
                )}
              </Box>
            </Grid>

            {/* Enroll / access card */}
            <Grid item xs={12} md={4}>
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)', p: 3,
              }}>
                <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.4rem', color: '#f5f8ff', textAlign: 'center', mb: 0.5 }}>
                  {course.price > 0 ? `₹${course.price}` : 'Free'}
                </Typography>
                <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#8f9cc9', textAlign: 'center', mb: 2.5 }}>
                  {course.price > 0 ? 'One-time payment · lifetime access' : 'No payment needed · enroll and start'}
                </Typography>

                {isSubscribed ? (
                  <Stack spacing={1.25}>
                    <Button fullWidth onClick={() => goPractice()} startIcon={<PlayArrowIcon />}
                      sx={{
                        fontFamily: ff, fontWeight: 700, textTransform: 'none', py: 1.5,
                        borderRadius: '12px', color: '#fff',
                        background: '#16a34a',
                        boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
                        '&:hover': { boxShadow: '0 8px 24px rgba(22,163,74,0.4)' },
                      }}>
                      Start practising
                    </Button>
                    <Button fullWidth onClick={() => navigate('/public/dashboard')}
                      sx={{
                        fontFamily: ff, fontWeight: 600, textTransform: 'none', py: 1.25,
                        borderRadius: '12px', color: '#cdd6f4', border: '1px solid rgba(255,255,255,0.16)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                      }}>
                      Go to Dashboard
                    </Button>
                  </Stack>
                ) : isEnrolled && course.price > 0 ? (
                  <Button fullWidth onClick={handlePayment} disabled={busy} startIcon={<ShoppingCartIcon />}
                    sx={{
                      fontFamily: ff, fontWeight: 700, textTransform: 'none', py: 1.5,
                      borderRadius: '12px', color: '#fff',
                      background: '#2563eb',
                      boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                      '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)' },
                    }}>
                    {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : `Unlock Premium — ₹${course.price}`}
                  </Button>
                ) : (
                  <Button fullWidth onClick={handleEnroll} disabled={busy} startIcon={<PlayArrowIcon />}
                    sx={{
                      fontFamily: ff, fontWeight: 700, textTransform: 'none', py: 1.5,
                      borderRadius: '12px', color: '#fff',
                      background: '#2563eb',
                      boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                      '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)' },
                    }}>
                    {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                      : course.price > 0 ? 'Enroll (Free Content)' : 'Enroll for Free'}
                  </Button>
                )}

                <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                <Stack spacing={1.2}>
                  {[
                    questionCount > 0 && !isSeedStage
                      ? `${questionCount.toLocaleString()} practice questions`
                      : 'Question bank as it grows — no extra cost',
                    'Timed mock tests with real marking',
                    'Instant scoring & subject analysis',
                    'Works on phone, tablet or computer',
                  ].map(t => (
                    <Stack key={t} direction="row" spacing={1.2} alignItems="flex-start">
                      <CheckCircleIcon sx={{ fontSize: 17, color: '#34d399', mt: '2px' }} />
                      <Typography sx={{ fontFamily: ff, fontSize: '0.83rem', color: '#cdd6f4', lineHeight: 1.5 }}>{t}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
        {msg && <Alert severity="success" onClose={() => setMsg('')} sx={{ mb: 3, borderRadius: '12px' }}>{msg}</Alert>}

        {/* ═══════════ ABOUT THE EXAM ═══════════ */}
        {guide && (
          <Box sx={{ mb: 6 }}>
            <SectionTitle overline="About the exam" title={`${course.title} at a glance`} />

            <Grid container spacing={2} sx={{ mb: 3 }}>
              {guide.facts.map(f => (
                <Grid item xs={6} md={3} key={f.label}>
                  <FactTile label={f.label} value={f.value} />
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3}>
              {/* Paper pattern */}
              <Grid item xs={12} md={7}>
                <Box sx={{ ...CARD_SX, p: 3, height: '100%' }}>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1rem', color: '#f5f8ff', mb: 2 }}>
                    Paper pattern
                  </Typography>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{
                      width: '100%', borderCollapse: 'collapse', fontFamily: ff,
                      '& th, & td': { textAlign: 'left', py: 1.1, px: 1, fontSize: '0.86rem', borderBottom: '1px solid rgba(255,255,255,0.07)' },
                      '& th': { color: '#8f9cc9', fontWeight: 700, fontSize: '0.72rem', letterSpacing: 1, textTransform: 'uppercase' },
                      '& td': { color: '#cdd6f4' },
                      '& tr:last-of-type td': { borderBottom: 'none' },
                    }}>
                      <Box component="thead">
                        <Box component="tr">
                          <Box component="th">Section</Box>
                          <Box component="th" sx={{ textAlign: 'right !important' }}>Questions</Box>
                          <Box component="th" sx={{ textAlign: 'right !important' }}>Marks</Box>
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {guide.pattern.map(row => (
                          <Box component="tr" key={row.section}>
                            <Box component="td" sx={{ fontWeight: 600, color: '#eaf0ff !important' }}>{row.section}</Box>
                            <Box component="td" sx={{ textAlign: 'right !important' }}>{row.questions}</Box>
                            <Box component="td" sx={{ textAlign: 'right !important' }}>{row.marks}</Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: '#8f9cc9', mt: '2px' }} />
                    <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#8f9cc9', lineHeight: 1.6 }}>
                      {guide.note ? `${guide.note} ` : ''}
                      Patterns change between notification cycles — always confirm against the official notification before you plan around them.
                    </Typography>
                  </Stack>
                </Box>
              </Grid>

              {/* Conducting body + eligibility */}
              <Grid item xs={12} md={5}>
                <Box sx={{ ...CARD_SX, p: 3, height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Box sx={{
                      width: 38, height: 38, borderRadius: '11px', flexShrink: 0,
                      bgcolor: 'rgba(59,130,246,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AccountBalanceIcon sx={{ color: '#60a5fa', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.72rem', letterSpacing: 1, textTransform: 'uppercase', color: '#8f9cc9' }}>
                        Conducted by
                      </Typography>
                      <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#f5f8ff' }}>
                        {guide.authority}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mb: 2.5 }} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={guide.mode} sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(255,255,255,0.06)', color: '#cdd6f4' }} />
                    <Chip size="small" label={guide.frequency} sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(255,255,255,0.06)', color: '#cdd6f4' }} />
                  </Stack>

                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.9rem', color: '#eaf0ff', mb: 1.5 }}>
                    Eligibility & key points
                  </Typography>
                  <Stack spacing={1.2}>
                    {guide.eligibility.map(e => (
                      <Stack key={e} direction="row" spacing={1.2} alignItems="flex-start">
                        <CheckCircleIcon sx={{ fontSize: 16, color: '#34d399', mt: '3px', flexShrink: 0 }} />
                        <Typography sx={{ fontFamily: ff, fontSize: '0.84rem', color: '#cdd6f4', lineHeight: 1.6 }}>{e}</Typography>
                      </Stack>
                    ))}
                  </Stack>

                  {guide.official && (
                    <Button
                      href={guide.official} target="_blank" rel="noopener noreferrer"
                      endIcon={<LaunchIcon sx={{ fontSize: 15 }} />}
                      sx={{
                        mt: 2.5, fontFamily: ff, fontWeight: 600, textTransform: 'none',
                        fontSize: '0.83rem', color: '#ffb054', px: 0,
                        '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                      }}
                    >
                      Official website
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ═══════════ WHAT YOU GET ═══════════ */}
        <Box sx={{ mb: 6 }}>
          <SectionTitle overline="What's included" title="What this course gives you" />
          <Grid container spacing={2}>
            {COURSE_BENEFITS.map(b => (
              <Grid item xs={12} sm={6} md={3} key={b.title}>
                <Box sx={{ ...CARD_SX, p: 2.5, height: '100%' }}>
                  <Box sx={{
                    width: 42, height: 42, borderRadius: '12px', mb: 1.75,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    background: '#2f6bff',
                  }}>
                    {b.icon}
                  </Box>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#f5f8ff', mb: 0.75 }}>
                    {b.title}
                  </Typography>
                  <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#a9b4dd', lineHeight: 1.6 }}>
                    {b.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* ═══════════ SYLLABUS COVERAGE (live from the repository) ═══════════ */}
        {subjects.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <SectionTitle
              overline="Syllabus coverage"
              title={isSeedStage
                ? 'Subjects covered in this course'
                : `${questionCount.toLocaleString()} questions ready to practise`}
            />
            <Typography sx={{ fontFamily: ff, fontSize: '0.88rem', color: '#a9b4dd', mb: 2.5, mt: -2, lineHeight: 1.7 }}>
              {isSeedStage
                ? `Live from our question repository. This course is newly launched — ${questionCount} sample question${questionCount === 1 ? '' : 's'} ${questionCount === 1 ? 'is' : 'are'} in place across the sections below while the full bank is being built, so you can see the format and marking before you commit.`
                : 'Live from our question repository — this is exactly what is available in this course right now.'}
              {namedFormats.length > 1 && ` Formats include ${namedFormats.map(f => FORMAT_LABELS[f]).join(', ')}.`}
            </Typography>

            {subjects.map(s => (
              <Accordion key={s.subject} disableGutters sx={{
                ...CARD_SX, mb: 1.5, '&:before': { display: 'none' },
                boxShadow: 'none', overflow: 'hidden',
              }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#8f9cc9' }} />} sx={{ px: 2.5, py: 0.5 }}>
                  <Box sx={{ width: '100%', pr: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                      <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.98rem', color: '#eaf0ff' }}>
                        {s.subject}
                      </Typography>
                      <Typography sx={{ fontFamily: ff, fontSize: '0.8rem', color: '#a9b4dd', fontWeight: 600, whiteSpace: 'nowrap', ml: 2 }}>
                        {s.question_count.toLocaleString()} Q · {s.chapter_count} chapter{s.chapter_count === 1 ? '' : 's'}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={questionCount ? Math.round((s.question_count / questionCount) * 100) : 0}
                      sx={{
                        height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.07)',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, background: '#2f6bff' },
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                  <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.07)' }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {s.chapters.map(ch => (
                      <Tooltip key={ch.chapter} title={`${ch.question_count} question${ch.question_count === 1 ? '' : 's'}`} arrow>
                        <Chip
                          label={ch.chapter}
                          size="small"
                          sx={{
                            fontFamily: ff, fontWeight: 500, fontSize: '0.76rem',
                            bgcolor: 'rgba(255,255,255,0.05)', color: '#cdd6f4',
                            border: '1px solid rgba(255,255,255,0.09)',
                          }}
                        />
                      </Tooltip>
                    ))}
                    {s.chapters.length === 0 && (
                      <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#8f9cc9' }}>
                        Chapter breakdown coming soon.
                      </Typography>
                    )}
                  </Box>
                  <Button
                    onClick={() => goPractice(s.subject)}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      mt: 2, fontFamily: ff, fontWeight: 700, textTransform: 'none',
                      fontSize: '0.83rem', color: '#ffb054', px: 0,
                      '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                    }}
                  >
                    Practise {s.subject}
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* ═══════════ MOCK TESTS ═══════════ */}
        <Box sx={{ mb: 6 }}>
          <SectionTitle
            overline="Mock tests"
            title={cbtTests.length ? `${cbtTests.length} full-length CBT mock${cbtTests.length === 1 ? '' : 's'}` : 'Full-length CBT mocks'}
          />

          {cbtTests.length === 0 ? (
            <Box sx={{ ...CARD_SX, p: { xs: 3, md: 4 }, textAlign: 'center' }}>
              <TimerIcon sx={{ fontSize: 40, color: '#7e8abb', mb: 1.5 }} />
              <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1.05rem', color: '#eaf0ff', mb: 1 }}>
                Full-length mocks for this course are being assembled
              </Typography>
              <Typography sx={{ fontFamily: ff, color: '#a9b4dd', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 560, mx: 'auto', mb: 3 }}>
                {isSeedStage
                  ? `This course is newly launched. ${questionCount} sample question${questionCount === 1 ? '' : 's'} across ${subjects.length} section${subjects.length === 1 ? '' : 's'} ${questionCount === 1 ? 'is' : 'are'} live so you can try the interface and the marking — enroll free now and the full bank and mocks open up as they land, at no extra cost.`
                  : questionCount > 0
                    ? `You don't have to wait — ${questionCount.toLocaleString()} questions across ${subjects.length} subject${subjects.length === 1 ? '' : 's'} are already open for practice. Build a timed session of any length, scoped to a subject or a single chapter.`
                    : 'Questions for this course are being added. Enroll now and you will get access the moment they land.'}
              </Typography>
              {questionCount > 0 && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                  <Button onClick={() => goPractice()} startIcon={<PlayArrowIcon />}
                    sx={{
                      fontFamily: ff, fontWeight: 700, textTransform: 'none', px: 3, py: 1.25,
                      borderRadius: '12px', color: '#fff',
                      background: '#2f6bff',
                      '&:hover': { boxShadow: '0 8px 24px rgba(246,137,20,0.35)' },
                    }}>
                    {!hasAccess ? 'Enroll free to start'
                      : isSeedStage ? 'Try the sample questions'
                        : 'Start a practice session'}
                  </Button>
                  {!isSeedStage && syllabus?.mock_minutes && (
                    <Button onClick={() => goPractice()}
                      sx={{
                        fontFamily: ff, fontWeight: 600, textTransform: 'none', px: 3, py: 1.25,
                        borderRadius: '12px', color: '#cdd6f4', border: '1px solid rgba(255,255,255,0.16)',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                      }}>
                      Build a {syllabus.mock_minutes}-min timed set
                    </Button>
                  )}
                </Stack>
              )}
            </Box>
          ) : (
            <Card sx={{ ...CARD_SX, boxShadow: 'none', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.03)' }}>
              <List sx={{ p: 0 }}>
                {cbtTests.map((content, i) => (
                  <React.Fragment key={content.id}>
                    {i > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />}
                    <ListItem
                      onClick={() => handleContentClick(content)}
                      sx={{
                        cursor: content.locked && isLoggedIn ? 'not-allowed' : 'pointer',
                        py: 2.5, px: 3,
                        opacity: content.locked ? 0.7 : 1,
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: content.locked ? 'transparent' : 'rgba(255,255,255,0.05)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 48 }}>
                        <Box sx={{
                          width: 38, height: 38, borderRadius: '10px',
                          bgcolor: content.locked ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.14)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <QuizIcon sx={{ color: content.locked ? '#94a3b8' : '#60a5fa', fontSize: 20 }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={content.title}
                        secondary={`${content.total_questions || '?'} questions · ${content.duration_minutes || 60} min`}
                        primaryTypographyProps={{ fontFamily: ff, fontWeight: 600, fontSize: '0.92rem', color: '#eaf0ff' }}
                        secondaryTypographyProps={{ fontFamily: ff, fontSize: '0.78rem', color: '#a9b4dd' }}
                      />
                      <Box sx={{ ml: 2, display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                        {content.attempt_submitted && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                            label={`Score: ${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}`}
                            size="small"
                            sx={{
                              bgcolor: (content.attempt_score >= (content.attempt_total * 0.6)) ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)',
                              color: (content.attempt_score >= (content.attempt_total * 0.6)) ? '#4ade80' : '#f87171',
                              fontWeight: 700, fontFamily: ff,
                              '& .MuiChip-icon': { color: 'inherit' },
                            }}
                          />
                        )}
                        {content.is_free ? (
                          <Chip icon={<LockOpenIcon sx={{ fontSize: 14 }} />} label="Free" size="small"
                            sx={{ bgcolor: 'rgba(34,197,94,0.14)', color: '#4ade80', fontWeight: 600, fontFamily: ff, '& .MuiChip-icon': { color: '#4ade80' } }} />
                        ) : (
                          <Chip icon={content.locked ? <LockIcon sx={{ fontSize: 14 }} /> : <CheckCircleIcon sx={{ fontSize: 14 }} />}
                            label={content.locked ? 'Premium' : 'Unlocked'} size="small"
                            sx={{
                              bgcolor: content.locked ? 'rgba(246,137,20,0.14)' : 'rgba(34,197,94,0.14)',
                              color: content.locked ? '#ffb054' : '#4ade80',
                              fontWeight: 600, fontFamily: ff,
                              '& .MuiChip-icon': { color: content.locked ? '#ffb054' : '#4ade80' },
                            }} />
                        )}
                      </Box>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Card>
          )}
        </Box>

        {/* ═══════════ STUDY MATERIAL (PDFs etc.) ═══════════ */}
        {materials.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <SectionTitle overline="Study material" title={`${materials.length} downloadable resource${materials.length === 1 ? '' : 's'}`} />
            <Card sx={{ ...CARD_SX, boxShadow: 'none', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.03)' }}>
              <List sx={{ p: 0 }}>
                {materials.map((content, i) => (
                  <React.Fragment key={content.id}>
                    {i > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />}
                    <ListItem
                      onClick={() => handleContentClick(content)}
                      sx={{
                        cursor: 'pointer', py: 2.25, px: 3, opacity: content.locked ? 0.7 : 1,
                        '&:hover': { bgcolor: content.locked ? 'transparent' : 'rgba(255,255,255,0.05)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 48 }}>
                        <Box sx={{
                          width: 38, height: 38, borderRadius: '10px', bgcolor: 'rgba(168,85,247,0.14)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <PictureAsPdfIcon sx={{ color: '#c084fc', fontSize: 20 }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={content.title}
                        secondary={content.subject || content.content_type.replace(/_/g, ' ')}
                        primaryTypographyProps={{ fontFamily: ff, fontWeight: 600, fontSize: '0.92rem', color: '#eaf0ff' }}
                        secondaryTypographyProps={{ fontFamily: ff, fontSize: '0.78rem', color: '#a9b4dd', textTransform: 'capitalize' }}
                      />
                      {content.locked && (
                        <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Premium" size="small"
                          sx={{ bgcolor: 'rgba(246,137,20,0.14)', color: '#ffb054', fontWeight: 600, fontFamily: ff, '& .MuiChip-icon': { color: '#ffb054' } }} />
                      )}
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Card>
          </Box>
        )}

        {/* ═══════════ FAQ ═══════════ */}
        <Box sx={{ mb: 6 }}>
          <SectionTitle overline="Questions" title="Before you enroll" />
          {COURSE_FAQ.map(item => (
            <Accordion key={item.q} disableGutters sx={{
              ...CARD_SX, mb: 1.25, '&:before': { display: 'none' }, boxShadow: 'none',
            }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#8f9cc9' }} />} sx={{ px: 2.5 }}>
                <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.92rem', color: '#eaf0ff' }}>
                  {item.q}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                <Typography sx={{ fontFamily: ff, fontSize: '0.86rem', color: '#a9b4dd', lineHeight: 1.75 }}>
                  {item.a}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        {/* ═══════════ BOTTOM CTA ═══════════ */}
        {!isSubscribed && (
          <Box sx={{
            position: 'relative', overflow: 'hidden', borderRadius: '22px',
            textAlign: 'center', p: { xs: 3.5, md: 5 },
            background: 'rgba(47,107,255,0.26)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, color: '#f5f8ff', mb: 1.25 }}>
              Ready to start {course.title}?
            </Typography>
            <Typography sx={{ fontFamily: ff, fontSize: '0.95rem', color: '#dbe3ff', mb: 3, maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
              {course.price > 0
                ? 'Enroll free to open the free content, and upgrade whenever you want the full course.'
                : 'Enrollment is free and takes a few seconds. Your first practice session starts right after.'}
            </Typography>
            <Button onClick={isEnrolled && course.price > 0 ? handlePayment : handleEnroll} disabled={busy}
              endIcon={<ArrowForwardIcon />}
              sx={{
                fontFamily: ff, fontWeight: 700, textTransform: 'none', px: 4, py: 1.4,
                borderRadius: '12px', color: '#fff', fontSize: '1rem',
                background: '#2f6bff',
                '&:hover': { boxShadow: '0 10px 28px rgba(246,137,20,0.4)' },
              }}>
              {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                : isEnrolled && course.price > 0 ? `Unlock Premium — ₹${course.price}`
                  : course.price > 0 ? 'Enroll for free content' : 'Enroll for free'}
            </Button>
          </Box>
        )}
      </Container>

      {/* Login Prompt Dialog */}
      <Dialog open={loginPrompt} onClose={() => setLoginPrompt(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>Sign In Required</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: ff, color: '#a9b4dd' }}>
            Please sign in or create an account to access course content and enroll.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setLoginPrompt(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={() => navigate('/public/register')} variant="outlined"
            sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '10px' }}>
            Create Account
          </Button>
          <Button onClick={() => navigate('/public/login')} variant="contained"
            sx={{
              fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px',
              background: '#2563eb',
            }}>
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
