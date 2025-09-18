// src/App.jsx
import React from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
} from '@mui/material';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
  shape: { borderRadius: 12 },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Box minHeight="100vh" display="flex" flexDirection="column">
          <Header />
          <Navbar /> {/* Ensure it uses useAuth for login/logout */}
          <Container maxWidth={false} disableGutters sx={{ flex: 1 }}>
            <AppRoutes />
          </Container>
          <Footer />
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}