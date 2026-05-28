import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Container, Grid, Card, CardContent, Chip, Button,
  Skeleton, List, ListItem, ListItemIcon, ListItemText, Divider, Alert,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useParams, useNavigate } from 'react-router-dom';
import { publicApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PublicCourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = user && user.role === 'public_user';

  const [course, setCourse] = useState(null);
  const [contents, setContents] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);

  useEffect(() => {
    publicApi.getCourse(courseId)
      .then(r => {
        setCourse(r.data.course);
        setContents(r.data.contents || []);
        setIsEnrolled(r.data.is_enrolled);
        setIsSubscribed(r.data.is_subscribed);
      })
      .catch(() => setError('Course not found'))
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleEnroll = async () => {
    if (!isLoggedIn) { setLoginPrompt(true); return; }
    setBusy(true); setError(''); setMsg('');
    try {
      await publicApi.enrollFree(courseId);
      setMsg('Enrolled successfully! You now have access to free content.');
      // Reload data
      const r = await publicApi.getCourse(courseId);
      setCourse(r.data.course);
      setContents(r.data.contents || []);
      setIsEnrolled(r.data.is_enrolled);
      setIsSubscribed(r.data.is_subscribed);
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
            const r = await publicApi.getCourse(courseId);
            setCourse(r.data.course);
            setContents(r.data.contents || []);
            setIsEnrolled(r.data.is_enrolled);
            setIsSubscribed(r.data.is_subscribed);
          } catch {
            setError('Payment verification failed. Contact support.');
          }
        },
        prefill: { email: user?.email },
        theme: { color: '#2563eb' },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
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
    if (content.attempt_submitted && content.content_type === 'pdf_exam') {
      setError(`You already completed this exam. Score: ${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}`);
      return;
    }
    navigate(`/public/viewer/${content.id}`, { state: { content } });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: '16px', mb: 3 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: '16px' }} />
      </Container>
    );
  }

  if (!course) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: ff, color: '#64748b', fontSize: '1.1rem' }}>Course not found.</Typography>
        <Button onClick={() => navigate('/public')} sx={{ mt: 2, fontFamily: ff, textTransform: 'none' }}>
          ← Back to Catalog
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ fontFamily: ff }}>
      {/* Course Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        py: { xs: 4, md: 6 }, px: 3,
      }}>
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/public')}
            sx={{
              fontFamily: ff, fontWeight: 500, textTransform: 'none',
              color: '#94a3b8', mb: 3, borderRadius: '8px',
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            Back to Catalog
          </Button>

          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography sx={{
                fontFamily: ff, fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 800,
                color: '#fff', lineHeight: 1.3, mb: 1.5,
              }}>
                {course.title}
              </Typography>
              <Typography sx={{
                fontFamily: ff, fontSize: '1rem', color: '#94a3b8',
                lineHeight: 1.7, mb: 3, maxWidth: 600,
              }}>
                {course.description || 'No description available.'}
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
                <Chip
                  label={`${course.content_count} Items`}
                  sx={{ fontFamily: ff, fontWeight: 600, bgcolor: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}
                />
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
                    sx={{
                      fontFamily: ff, fontWeight: 600,
                      bgcolor: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                    }}
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)', p: 3, textAlign: 'center',
              }}>
                {isSubscribed ? (
                  <Button fullWidth onClick={() => navigate('/public/dashboard')}
                    sx={{
                      fontFamily: ff, fontWeight: 700, textTransform: 'none', py: 1.5,
                      borderRadius: '12px', color: '#fff',
                      background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                      boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
                      '&:hover': { boxShadow: '0 8px 24px rgba(22,163,74,0.4)' },
                    }}>
                    Go to Dashboard
                  </Button>
                ) : isEnrolled && course.price > 0 ? (
                  <Button fullWidth onClick={handlePayment} disabled={busy}
                    startIcon={<ShoppingCartIcon />}
                    sx={{
                      fontFamily: ff, fontWeight: 700, textTransform: 'none', py: 1.5,
                      borderRadius: '12px', color: '#fff',
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                      '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)' },
                    }}>
                    {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : `Unlock Premium — ₹${course.price}`}
                  </Button>
                ) : (
                  <Button fullWidth onClick={handleEnroll} disabled={busy}
                    startIcon={<PlayArrowIcon />}
                    sx={{
                      fontFamily: ff, fontWeight: 700, textTransform: 'none', py: 1.5,
                      borderRadius: '12px', color: '#fff',
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                      '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)' },
                    }}>
                    {busy ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                      : course.price > 0 ? 'Enroll (Free Content)' : 'Enroll for Free'}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Content / Syllabus */}
      <Container maxWidth="lg" sx={{ py: 5 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
        {msg && <Alert severity="success" onClose={() => setMsg('')} sx={{ mb: 3, borderRadius: '12px' }}>{msg}</Alert>}

        <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', mb: 3 }}>
          Course Syllabus
        </Typography>

        {contents.length === 0 ? (
          <Box sx={{
            textAlign: 'center', py: 8, bgcolor: '#fff', borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}>
            <Typography sx={{ fontFamily: ff, color: '#94a3b8' }}>
              No content has been added to this course yet.
            </Typography>
          </Box>
        ) : (
          <Card sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
            <List sx={{ p: 0 }}>
              {contents.map((content, i) => (
                <React.Fragment key={content.id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    onClick={() => handleContentClick(content)}
                    sx={{
                      cursor: content.locked && !isLoggedIn ? 'pointer' : content.locked ? 'not-allowed' : 'pointer',
                      py: 2.5, px: 3,
                      opacity: content.locked ? 0.7 : 1,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: content.locked ? 'rgba(0,0,0,0.02)' : '#f8fafc' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 48 }}>
                      {content.content_type === 'pdf_exam' ? (
                        <Box sx={{
                          width: 38, height: 38, borderRadius: '10px',
                          bgcolor: content.locked ? '#f1f5f9' : 'rgba(59,130,246,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <QuizIcon sx={{ color: content.locked ? '#94a3b8' : '#2563eb', fontSize: 20 }} />
                        </Box>
                      ) : (
                        <Box sx={{
                          width: 38, height: 38, borderRadius: '10px',
                          bgcolor: content.locked ? '#f1f5f9' : 'rgba(239,68,68,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <PictureAsPdfIcon sx={{ color: content.locked ? '#94a3b8' : '#ef4444', fontSize: 20 }} />
                        </Box>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={content.title}
                      secondary={
                        content.content_type === 'pdf_exam'
                          ? `${content.total_questions || '?'} questions · ${content.duration_minutes || 60} min`
                          : 'Study Material'
                      }
                      primaryTypographyProps={{
                        fontFamily: ff, fontWeight: 600, fontSize: '0.92rem', color: '#0f172a',
                      }}
                      secondaryTypographyProps={{
                        fontFamily: ff, fontSize: '0.78rem', color: '#64748b',
                      }}
                    />
                    <Box sx={{ ml: 2, display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                      {content.content_type === 'pdf_exam' && content.attempt_submitted ? (
                        <Chip
                          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                          label={`Score: ${content.attempt_score ?? '?'}/${content.attempt_total ?? '?'}`}
                          size="small"
                          sx={{
                            bgcolor: (content.attempt_score >= (content.attempt_total * 0.6)) ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: (content.attempt_score >= (content.attempt_total * 0.6)) ? '#16a34a' : '#ef4444',
                            fontWeight: 700, fontFamily: ff,
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      ) : null}
                      {content.is_free ? (
                        <Chip icon={<LockOpenIcon sx={{ fontSize: 14 }} />} label="Free" size="small"
                          sx={{ bgcolor: 'rgba(34,197,94,0.1)', color: '#16a34a', fontWeight: 600, fontFamily: ff, '& .MuiChip-icon': { color: '#16a34a' } }} />
                      ) : (
                        <Chip icon={content.locked ? <LockIcon sx={{ fontSize: 14 }} /> : <CheckCircleIcon sx={{ fontSize: 14 }} />}
                          label={content.locked ? 'Premium' : 'Unlocked'} size="small"
                          sx={{
                            bgcolor: content.locked ? 'rgba(168,85,247,0.1)' : 'rgba(34,197,94,0.1)',
                            color: content.locked ? '#a855f7' : '#16a34a',
                            fontWeight: 600, fontFamily: ff,
                            '& .MuiChip-icon': { color: content.locked ? '#a855f7' : '#16a34a' },
                          }} />
                      )}
                    </Box>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Card>
        )}
      </Container>

      {/* Login Prompt Dialog */}
      <Dialog open={loginPrompt} onClose={() => setLoginPrompt(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>Sign In Required</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: ff, color: '#64748b' }}>
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
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            }}>
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
