import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Alert,
  IconButton, InputAdornment, Stack, Grid, Card, Toolbar
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quotes = [
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
    { text: "The only time you truly fail, is when you decided to giveup.", author: "Virat Kohli" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" }
  ];

  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    if (user) {
      if (user.role === 'subject_specialist') navigate('/specialist/repository/questions', { replace: true });
      else if (user.role === 'admin') navigate('/admin/exams', { replace: true });
      else if (user.role === 'school_admin') navigate('/school', { replace: true });
      else if (user.role === 'student') navigate('/student', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier || !password) {
      setError('Username and Password are required.');
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await api.post('/login', {
        username: identifier,
        password: password,
      });

      const token = response.data.auth_token || response.data.token;
      const userData = response.data.user;

      if (!token || !userData) throw new Error('Invalid server response');

      login(userData, token);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* 1. Navbar Spacer: Prevents content from hiding behind fixed Navbar */}
      <Toolbar /> 

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 2,
          minHeight: 'calc(100vh - 64px)', // Subtract toolbar height
        }}
      >
        <Card
          elevation={6}
          sx={{
            width: '100%',
            maxWidth: '1100px',
            minHeight: '600px',
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Grid Container */}
          <Grid container sx={{ flexGrow: 1 }}>
            
            {/* MOBILE OPTIMIZATION:
               On 'xs' (mobile), the Form comes first (order 1).
               On 'md' (desktop), the Form comes second (order 2).
            */}
            
            {/* RIGHT SIDE: Login Form */}
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                order: { xs: 1, md: 2 }, // Show first on mobile, second on desktop
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: { xs: 4, md: 6 },
                bgcolor: 'white',
              }}
            >
              <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: '400px' }}>
                <Stack spacing={1} mb={4} textAlign="center">
                  <Typography variant="h4" fontWeight={800} color="primary">
                    Sign In
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enter your credentials to access your dashboard.
                  </Typography>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <TextField
                  label="Username / Student ID"
                  fullWidth
                  margin="normal"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                  variant="outlined"
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
                
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  margin="normal"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  variant="outlined"
                  InputProps={{
                    sx: { borderRadius: 2 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isSubmitting}
                  sx={{
                    mt: 4, mb: 3, height: 50, borderRadius: 2,
                    fontWeight: 700, fontSize: '1rem', textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  }}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>

                <Stack direction="row" justifyContent="center">
                  <Typography variant="body2" color="text.secondary">
                    Don't have an account?{' '}
                    <RouterLink to="/register" style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 600 }}>
                      Register here
                    </RouterLink>
                  </Typography>
                </Stack>
              </Box>

              <Paper
  sx={{
    mt: 3,
    mx: "auto",
    maxWidth: 420,
    p: 3.5,
    borderRadius: 4,
    textAlign: "center",
    background: "linear-gradient(135deg,#fde68a,#a7f3d0)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
    border: "1px solid rgba(255,255,255,0.6)"
  }}
>
  <Typography
    variant="h6"
    fontWeight={900}
    sx={{ letterSpacing: "-0.02em" }}
  >
    🎈 Primary Practice
  </Typography>

  <Typography
    variant="body2"
    sx={{ color: "rgba(0,0,0,0.7)", mt: 0.5, mb: 2.5 }}
  >
    Fun exams for Classes 1–5  
    <br />
    <strong>No login required</strong>
  </Typography>

  <Button
    variant="contained"
    color="secondary"
    sx={{
      borderRadius: 4,
      px: 4,
      py: 1.2,
      fontWeight: 800,
      textTransform: "none",
      boxShadow: "0 6px 14px rgba(0,0,0,0.25)"
    }}
    onClick={() => navigate("/primary")}
  >
    🚀 Start Primary Exam
  </Button>
</Paper>

            </Grid>

            {/* LEFT SIDE: Inspirational Quotes */}
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                order: { xs: 2, md: 1 }, // Show second on mobile, first on desktop
                background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 4,
                textAlign: 'center',
                position: 'relative',
                minHeight: { xs: '300px', md: 'auto' } // Ensure height on mobile
              }}
            >
              <Box sx={{ position: 'absolute', top: -50, left: -50, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
              
              <Typography variant="h3" fontWeight={700} gutterBottom sx={{ zIndex: 1 }}>
                Welcome Back
              </Typography>
              <Typography variant="h6" sx={{ mb: 6, opacity: 0.9, zIndex: 1 }}>
                Continue your learning journey
              </Typography>

              <Box sx={{ maxWidth: '400px', minHeight: '120px', zIndex: 1 }}>
                <Typography variant="h6" fontStyle="italic" sx={{ mb: 2, fontWeight: 300 }}>
                  "{quotes[currentQuote].text}"
                </Typography>
                <Typography variant="subtitle2" sx={{ opacity: 0.8, fontWeight: 600 }}>
                  — {quotes[currentQuote].author}
                </Typography>
              </Box>

              <Box sx={{ mt: 4, display: 'flex', gap: 1, zIndex: 1 }}>
                {quotes.map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: currentQuote === index ? 'white' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer', transition: 'all 0.3s ease'
                    }}
                    onClick={() => setCurrentQuote(index)}
                  />
                ))}
              </Box>
            </Grid>

          </Grid>
        </Card>
        
      </Box>
    </Box>
  );
}