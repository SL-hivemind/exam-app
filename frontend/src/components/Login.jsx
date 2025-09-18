// src/components/Login.jsx
import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  IconButton, 
  InputAdornment, 
  Stack 
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../utils/api';
import useAuth from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier || !password) {
      setError('Username/Student ID and Password are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/login', {
        username: identifier, // 'username' is the key expected by the backend
        password: password,
      });
      // The login function from AuthContext handles saving the token and user data
      auth.login(response.data.user, response.data.auth_token);

      // Redirect based on user role
      if (response.data.user.role === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/dashboard/student');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)', // Adjust height to fit within layout
        width: '100%',
        backgroundImage: 'url(/background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: '450px',
          backgroundColor: 'rgba(255, 255, 255, 1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom textAlign="center">
          Student Login
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <TextField
          label="Username or Student ID"
          fullWidth
          margin="normal"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
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
          sx={{ mt: 2, mb: 2 }}
        >
          {isSubmitting ? 'Logging In...' : 'Login'}
        </Button>

        <Stack direction="row" justifyContent="center" alignItems="center">
          <Typography variant="body2">
            Don't have an account?{' '}
            <RouterLink to="/register">
              Register here
            </RouterLink>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}