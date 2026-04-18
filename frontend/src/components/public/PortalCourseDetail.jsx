import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Container, Toolbar, Button, Chip, Divider,
  List, ListItem, ListItemIcon, ListItemText, Alert, CircularProgress, Skeleton,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import QuizIcon from '@mui/icons-material/Quiz';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { portalApi } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PortalCourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [contents, setContents] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollBusy, setEnrollBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadCourse = () => {
    portalApi.getCourse(courseId)
      .then(r => {
        setCourse(r.data.course);
        setContents(r.data.contents || []);
        setIsSubscribed(r.data.is_subscribed || false);
      })
      .catch(() => setError('Course not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCourse(); }, [courseId]);

  const handleEnroll = async () => {
    if (!user) { navigate('/portal/login'); return; }
    if (user.role !== 'public_user') { setError('Please use a public portal account'); return; }
    setEnrollBusy(true); setError(''); setMsg('');
    try {
      if (course.price > 0) {
        // Razorpay flow
        const orderRes = await portalApi.createOrder(courseId);
        const { order_id, amount, currency, key_id } = orderRes.data;

        const options = {
          key: key_id,
          amount,
          currency,
          name: 'SL Exams Portal',
          description: course.title,
          order_id,
          handler: async (response) => {
            try {
              await portalApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setMsg('Payment successful! You now have full access.');
              setIsSubscribed(true);
              loadCourse();
            } catch {
              setError('Payment verification failed. Contact support.');
            }
          },
          prefill: { email: user.email },
          theme: { color: '#2563eb' },
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          setError('Payment SDK not loaded. Please refresh and try again.');
        }
      } else {
        await portalApi.enrollFree(courseId);
        setMsg('Enrolled successfully!');
        setIsSubscribed(true);
        loadCourse();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment failed');
    } finally { setEnrollBusy(false); }
  };

  const handleContentClick = (content) => {
    if (content.locked) {
      setError('Subscribe to access this content');
      return;
    }
    if (content.content_type === 'pdf_exam') {
      navigate(`/portal/exam/${content.id}`);
    } else {
      // Open PDF viewer
      window.open(`/portal/viewer/${content.id}`, '_blank');
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <Toolbar />
        <Container maxWidth="md" sx={{ py: 5 }}>
          <Skeleton variant="rounded" height={200} sx={{ mb: 3, borderRadius: '16px' }} />
          <Skeleton variant="text" height={40} width="60%" sx={{ mb: 1 }} />
          <Skeleton variant="text" height={20} width="80%" />
        </Container>
      </Box>
    );
  }

  if (!course) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: '#64748b' }}>Course not found</Typography>
      </Box>
    );
  }

  const freeCount = contents.filter(c => c.is_free).length;
  const paidCount = contents.filter(c => !c.is_free).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', fontFamily: ff }}>
      <Toolbar />

      {/* Course Hero */}
      <Box sx={{
        background: course.thumbnail_url
          ? `linear-gradient(rgba(15,23,42,0.85),rgba(15,23,42,0.92)), url(${course.thumbnail_url}) center/cover`
          : 'linear-gradient(135deg, #0f172a, #1e293b)',
        py: { xs: 5, md: 8 }, px: 3,
      }}>
        <Container maxWidth="md">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/portal')}
            sx={{ color: '#94a3b8', fontFamily: ff, textTransform: 'none', mb: 3, fontWeight: 500, '&:hover': { color: '#fff' } }}>
            Back to Catalog
          </Button>
          <Typography sx={{
            fontSize: { xs: '1.6rem', md: '2.2rem' }, fontWeight: 800, color: '#fff',
            lineHeight: 1.2, mb: 2, letterSpacing: '-0.02em',
          }}>
            {course.title}
          </Typography>
          <Typography sx={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.7, mb: 3, maxWidth: 600 }}>
            {course.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={course.price > 0 ? `₹${course.price}` : 'Free'}
              sx={{
                bgcolor: course.price > 0 ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                color: course.price > 0 ? '#eab308' : '#22c55e',
                fontWeight: 700, fontFamily: ff, fontSize: '0.9rem',
              }} />
            <Chip label={`${freeCount} free item${freeCount !== 1 ? 's' : ''}`}
              sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontFamily: ff, fontWeight: 600 }} />
            {paidCount > 0 && (
              <Chip label={`${paidCount} premium item${paidCount !== 1 ? 's' : ''}`}
                sx={{ bgcolor: 'rgba(168,85,247,0.15)', color: '#a855f7', fontFamily: ff, fontWeight: 600 }} />
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
        {msg && <Alert severity="success" onClose={() => setMsg('')} sx={{ mb: 3, borderRadius: '12px' }}>{msg}</Alert>}

        {/* Enrollment button */}
        {!isSubscribed && (
          <Box sx={{
            bgcolor: '#fff', borderRadius: '16px', p: 3, mb: 4,
            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 2,
          }}>
            <Box>
              <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                {course.price > 0 ? 'Unlock All Premium Content' : 'Enroll for Free'}
              </Typography>
              <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#64748b' }}>
                {course.price > 0
                  ? 'Get access to all question papers, solutions, and mock tests.'
                  : 'Register on this course to track your progress.'}
              </Typography>
            </Box>
            <Button onClick={handleEnroll} disabled={enrollBusy}
              variant="contained" sx={{
                fontFamily: ff, fontWeight: 700, textTransform: 'none',
                borderRadius: '12px', px: 4, py: 1.5,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
                '&:hover': { boxShadow: '0 8px 24px rgba(59,130,246,0.4)' },
              }}>
              {enrollBusy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> :
                course.price > 0 ? `Buy Now — ₹${course.price}` : 'Enroll Free'}
            </Button>
          </Box>
        )}

        {isSubscribed && (
          <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 3, borderRadius: '12px', fontFamily: ff }}>
            You have full access to this course!
          </Alert>
        )}

        {/* Content List */}
        <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', mb: 2 }}>
          Course Content
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <List sx={{ bgcolor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {contents.map((content, i) => (
            <React.Fragment key={content.id}>
              {i > 0 && <Divider />}
              <ListItem
                onClick={() => handleContentClick(content)}
                sx={{
                  cursor: content.locked ? 'not-allowed' : 'pointer',
                  py: 2, px: 3, opacity: content.locked ? 0.6 : 1,
                  transition: 'background 0.2s',
                  '&:hover': { bgcolor: content.locked ? 'transparent' : '#f8fafc' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 44 }}>
                  {content.content_type === 'pdf_exam' ? (
                    <QuizIcon sx={{ color: content.locked ? '#94a3b8' : '#2563eb' }} />
                  ) : (
                    <PictureAsPdfIcon sx={{ color: content.locked ? '#94a3b8' : '#ef4444' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={content.title}
                  secondary={
                    content.content_type === 'pdf_exam'
                      ? `${content.total_questions || '?'} questions · ${content.duration_minutes || 60} min`
                      : 'Study Material'
                  }
                  primaryTypographyProps={{ fontFamily: ff, fontWeight: 600, fontSize: '0.92rem', color: '#0f172a' }}
                  secondaryTypographyProps={{ fontFamily: ff, fontSize: '0.78rem', color: '#64748b' }}
                />
                <Box sx={{ ml: 2 }}>
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
          {contents.length === 0 && (
            <ListItem sx={{ py: 4, justifyContent: 'center' }}>
              <Typography sx={{ color: '#94a3b8', fontFamily: ff }}>No content available yet.</Typography>
            </ListItem>
          )}
        </List>
      </Container>
    </Box>
  );
}
