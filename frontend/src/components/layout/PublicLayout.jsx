import React, { useState } from 'react';
import {
  Box, Typography, Button, AppBar, Toolbar, Container, IconButton,
  Drawer, List, ListItem, ListItemButton, ListItemText, Avatar, Divider,
  useMediaQuery, useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import PlatformBot from '../common/PlatformBot';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = user && user.role === 'public_user';

  const handleLogout = () => {
    logout();
    navigate('/public');
  };

  const navLinks = [
    { label: '← Home', path: '/', exact: true, isHome: true },
    { label: 'Explore Courses', path: '/public', exact: true },
    ...(isLoggedIn ? [{ label: 'My Dashboard', path: '/public/dashboard' }] : []),
  ];

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'transparent', fontFamily: ff }}>
      {/* ── Top Navigation Bar ── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(15,23,42,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ height: 50, gap: 1.5 }}>
            {/* Brand */}
            <Box
              component={RouterLink}
              to="/public"
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.2,
                textDecoration: 'none', mr: 4,
              }}
            >
              <Box component="img" src="/sl-logo-master.svg" alt="SL Logo" sx={{ height: 34, width: 34, borderRadius: '22%' }} />
              <Typography sx={{
                fontFamily: ff, fontWeight: 800, fontSize: '1rem',
                color: '#fff', letterSpacing: '-0.02em',
                display: { xs: 'none', sm: 'block' },
              }}>
                SL Exams
              </Typography>
            </Box>

            {/* Desktop Nav Links */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                {navLinks.map(link => (
                  <Button
                    key={link.path}
                    component={link.isHome ? 'a' : RouterLink}
                    href={link.isHome ? '/' : undefined}
                    to={link.isHome ? undefined : link.path}
                    sx={{
                      fontFamily: ff, fontWeight: 600, fontSize: '0.8rem',
                      textTransform: 'none', px: 1.5, py: 0.6, borderRadius: '8px',
                      color: link.isHome ? '#60a5fa' : isActive(link.path, link.exact) ? '#fff' : '#94a3b8',
                      bgcolor: link.isHome ? 'transparent' : isActive(link.path, link.exact) ? 'rgba(59,130,246,0.15)' : 'transparent',
                      '&:hover': {
                        color: '#fff',
                        bgcolor: 'rgba(255,255,255,0.06)',
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
              </Box>
            )}

            <Box sx={{ flex: isMobile ? 1 : 'unset' }} />

            {/* Auth Buttons / User Menu */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isLoggedIn ? (
                  <>
                    {/* Avatar chip → profile page */}
                    <Box
                      component={RouterLink}
                      to="/public/profile"
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.2,
                        px: 1.5, py: 0.6, borderRadius: '10px',
                        bgcolor: 'rgba(255,255,255,0.06)',
                        textDecoration: 'none', cursor: 'pointer',
                        border: '1px solid transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(246,137,20,0.35)' },
                        transition: 'all .15s ease',
                      }}
                      title="My profile & settings"
                    >
                      <Avatar sx={{
                        width: 30, height: 30, bgcolor: '#2563eb',
                        fontSize: '0.8rem', fontWeight: 800,
                      }}>
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                      <Typography sx={{
                        fontFamily: ff, fontWeight: 600, fontSize: '0.85rem',
                        color: '#e2e8f0',
                      }}>
                        {user?.username}
                      </Typography>
                    </Box>
                    <Button
                      onClick={handleLogout}
                      startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        fontFamily: ff, fontWeight: 600, fontSize: '0.82rem',
                        textTransform: 'none', color: '#ef4444', borderRadius: '8px',
                        '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' },
                      }}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      component={RouterLink}
                      to="/public/login"
                      sx={{
                        fontFamily: ff, fontWeight: 600, fontSize: '0.85rem',
                        textTransform: 'none', color: '#e2e8f0', borderRadius: '8px',
                        '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/public/register"
                      sx={{
                        fontFamily: ff, fontWeight: 700, fontSize: '0.85rem',
                        textTransform: 'none', color: '#fff', borderRadius: '10px',
                        px: 2.5,
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                        '&:hover': {
                          boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
                          transform: 'translateY(-1px)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Create Account
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} sx={{ color: '#fff' }}>
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* ── Mobile Drawer ── */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 280, bgcolor: '#0f172a', color: '#fff',
            borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1.5 }}>
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#aeb9e0' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {isLoggedIn && (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.05)',
            }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: '#2563eb', fontWeight: 800, fontSize: '0.9rem' }}>
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                  {user?.username}
                </Typography>
                <Typography sx={{ fontFamily: ff, fontSize: '0.75rem', color: '#a9b4dd' }}>
                  {user?.email}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />

        <List sx={{ px: 1.5, pt: 1.5 }}>
          {navLinks.map(link => (
            <ListItem key={link.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
                sx={{
                  borderRadius: '10px', py: 1.2,
                  bgcolor: isActive(link.path, link.exact) ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: isActive(link.path, link.exact) ? '#60a5fa' : '#94a3b8',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
                }}
              >
                <ListItemText
                  primary={link.label}
                  primaryTypographyProps={{ fontFamily: ff, fontWeight: 600, fontSize: '0.9rem' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 'auto', p: 2 }}>
          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 2 }} />
          {isLoggedIn ? (
            <Button
              fullWidth onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                fontFamily: ff, fontWeight: 600, textTransform: 'none',
                color: '#ef4444', borderRadius: '10px', py: 1,
                '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' },
              }}
            >
              Logout
            </Button>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                fullWidth onClick={() => { navigate('/public/login'); setMobileOpen(false); }}
                variant="outlined"
                sx={{
                  fontFamily: ff, fontWeight: 600, textTransform: 'none',
                  borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0',
                  borderRadius: '10px', py: 1,
                }}
              >
                Sign In
              </Button>
              <Button
                fullWidth onClick={() => { navigate('/public/register'); setMobileOpen(false); }}
                sx={{
                  fontFamily: ff, fontWeight: 700, textTransform: 'none',
                  color: '#fff', borderRadius: '10px', py: 1,
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                }}
              >
                Create Account
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* ── Page Content ── */}
      <Outlet />

      {/* ── Chat Bot (logged-in users, never on live test surfaces) ── */}
      {isLoggedIn
        && !location.pathname.includes('/mock')
        && !location.pathname.includes('/viewer')
        && !location.pathname.includes('/practice')
        && <PlatformBot />}
    </Box>
  );
}
