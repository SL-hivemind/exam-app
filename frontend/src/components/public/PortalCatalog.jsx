import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, CardMedia, Chip, Button,
  Container, Grid, TextField, InputAdornment, Toolbar, Skeleton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '../../utils/api';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PortalCatalog() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    portalApi.listCourses()
      .then(r => setCourses(r.data.courses || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', fontFamily: ff }}>
      <Toolbar />

      {/* Hero Banner */}
      <Box sx={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        py: { xs: 6, md: 10 }, px: 3, textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <Box sx={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)',
          top: '-10%', right: '-5%',
        }} />
        <Box sx={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)',
          bottom: '-5%', left: '10%',
        }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            px: 2, py: 0.5, borderRadius: '100px',
            bgcolor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
            mb: 3,
          }}>
            <SchoolIcon sx={{ fontSize: 16, color: '#60a5fa' }} />
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#60a5fa', letterSpacing: 1 }}>
              PUBLIC EXAM PORTAL
            </Typography>
          </Box>

          <Typography sx={{
            fontSize: { xs: '1.8rem', md: '2.8rem' }, fontWeight: 800,
            color: '#fff', lineHeight: 1.2, mb: 2, letterSpacing: '-0.02em',
          }}>
            Prepare for{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Public Exams
            </Box>
          </Typography>
          <Typography sx={{
            fontSize: { xs: '0.95rem', md: '1.1rem' }, color: '#94a3b8',
            maxWidth: 520, mx: 'auto', lineHeight: 1.7,
          }}>
            Access question papers, study materials, and mock tests for competitive and public examinations.
          </Typography>
        </Container>
      </Box>

      {/* Search & Course Grid */}
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <TextField
          fullWidth
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 4, maxWidth: 500,
            '& .MuiOutlinedInput-root': {
              borderRadius: '14px', bgcolor: '#fff', fontFamily: ff,
              '& fieldset': { borderColor: '#e2e8f0' },
              '&:hover fieldset': { borderColor: '#93c5fd' },
              '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
            },
          }}
        />

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map(i => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rounded" height={320} sx={{ borderRadius: '16px' }} />
              </Grid>
            ))}
          </Grid>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: '1.1rem', color: '#64748b' }}>
              {search ? 'No courses match your search.' : 'No courses available yet. Check back soon!'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filtered.map(course => (
              <Grid item xs={12} sm={6} md={4} key={course.id}>
                <Card
                  onClick={() => navigate(`/portal/course/${course.id}`)}
                  sx={{
                    borderRadius: '16px', overflow: 'hidden', cursor: 'pointer',
                    border: '1px solid #e2e8f0', boxShadow: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                      borderColor: '#93c5fd',
                    },
                  }}
                >
                  <CardMedia
                    sx={{
                      height: 160,
                      background: course.thumbnail_url
                        ? `url(${course.thumbnail_url}) center/cover`
                        : 'linear-gradient(135deg, #1e293b, #334155)',
                      display: 'flex', alignItems: 'flex-end', p: 2,
                    }}
                  >
                    <Chip
                      icon={course.price > 0 ? <LockIcon sx={{ fontSize: 14 }} /> : <LockOpenIcon sx={{ fontSize: 14 }} />}
                      label={course.price > 0 ? `₹${course.price}` : 'Free'}
                      size="small"
                      sx={{
                        bgcolor: course.price > 0 ? 'rgba(234,179,8,0.9)' : 'rgba(34,197,94,0.9)',
                        color: '#fff', fontWeight: 700, fontFamily: ff,
                        '& .MuiChip-icon': { color: '#fff' },
                      }}
                    />
                  </CardMedia>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography sx={{
                      fontFamily: ff, fontSize: '1.05rem', fontWeight: 700,
                      color: '#0f172a', mb: 1, lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {course.title}
                    </Typography>
                    <Typography sx={{
                      fontFamily: ff, fontSize: '0.82rem', color: '#64748b',
                      lineHeight: 1.6, mb: 2,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {course.description || 'Explore this course to learn more.'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: ff }}>
                        {course.content_count} item{course.content_count !== 1 ? 's' : ''}
                      </Typography>
                      <Button size="small" sx={{
                        fontFamily: ff, fontWeight: 600, fontSize: '0.78rem',
                        textTransform: 'none', color: '#3b82f6',
                      }}>
                        View →
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
