// src/App.jsx
import React from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import theme from './theme';
import AuroraBackground from './components/common/AuroraBackground';

// Pages that should show the shared Navbar (not managed by a layout)
const NAVBAR_PATHS = ['/', '/login', '/register', '/forgot-password'];

function AppContent() {
  const { authToken } = useAuth();
  const location = useLocation();

  // Show Navbar on home page, auth pages, student dashboard/pages, and exam results
  // Admin, School, Specialist, and Public routes have their own navigation via layouts
  const showNavbar = 
    NAVBAR_PATHS.includes(location.pathname) || 
    location.pathname.startsWith('/student') || 
    location.pathname.startsWith('/exam/');
  const showFooter = !authToken && NAVBAR_PATHS.includes(location.pathname);

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      {showNavbar && <Navbar />}
      <Container maxWidth={false} disableGutters sx={{ flex: 1 }}>
        <AppRoutes />
      </Container>
      {showFooter && <Footer />}
    </Box>
  );
}

export default function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuroraBackground />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}