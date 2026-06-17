import React, { useState, useMemo } from 'react';
import {
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, Divider,
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Stack, useTheme, useMediaQuery, Tooltip,
} from '@mui/material';
import {
  School as SchoolIcon,
  GridViewRounded as HomeIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getDashboardSections, getBasePath } from './dashboardNav';

const DRAWER_WIDTH = 264;
const COLLAPSED_WIDTH = 84;

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [open, setOpen] = useState(!isMobile);

  const role = user?.role;
  const basePath = getBasePath(role);
  const sections = useMemo(() => getDashboardSections(role), [role]);

  const homeItem = { text: 'Dashboard', icon: <HomeIcon />, path: basePath };

  // Longest-prefix match → the single active item (Home included).
  const allPaths = useMemo(
    () => [homeItem.path, ...sections.flatMap((s) => s.items.map((i) => i.path))],
    [sections] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const activeItemPath = useMemo(() => {
    return allPaths
      .filter((p) => pathname === p || pathname.startsWith(p + '/'))
      .sort((a, b) => b.length - a.length)[0];
  }, [allPaths, pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeOnMobile = () => { if (isMobile) setOpen(false); };

  const navItem = (item) => {
    const isActive = item.path === activeItemPath;
    return (
      <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 0.6 }}>
        <Tooltip title={!open ? item.text : ''} placement="right">
          <ListItemButton
            component={RouterLink}
            to={item.path}
            onClick={closeOnMobile}
            sx={{
              minHeight: 46, justifyContent: open ? 'initial' : 'center', px: 2,
              borderRadius: '12px', position: 'relative', overflow: 'hidden',
              color: isActive ? '#fff' : '#aab4dd',
              background: isActive ? 'linear-gradient(135deg, rgba(47,107,255,0.22), rgba(246,137,20,0.20))' : 'transparent',
              border: '1px solid', borderColor: isActive ? 'rgba(246,137,20,0.30)' : 'transparent',
              boxShadow: isActive ? '0 8px 22px rgba(47,107,255,0.22)' : 'none',
              '&::before': isActive ? {
                content: '""', position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 3,
                borderRadius: 3, background: 'linear-gradient(#2f6bff,#f68914)',
              } : {},
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            {open && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, fontSize: '0.86rem' }} />}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{
      height: '100%', display: 'flex', flexDirection: 'column', color: '#fff',
      bgcolor: 'rgba(9,14,42,0.62)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', px: 2 }}>
        {open && (
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px',
              background: 'linear-gradient(135deg, #2f6bff, #f68914)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(246,137,20,0.5)',
            }}>
              <SchoolIcon sx={{ color: '#fff', fontSize: 19 }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{
              background: 'linear-gradient(120deg,#ffffff,#ffce9e)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              SL Admin
            </Typography>
          </Stack>
        )}
        <IconButton onClick={() => setOpen(!open)} sx={{ color: '#aab4dd' }}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: open ? 2 : 1.25, py: 2 }}>
        <List disablePadding>{navItem(homeItem)}</List>

        {sections.map((section) => (
          <Box key={section.title} sx={{ mt: 1.5 }}>
            {open && (
              <Typography variant="caption" sx={{
                px: 1.25, color: '#7e8abb', fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', fontSize: '0.66rem',
              }}>
                {section.title}
              </Typography>
            )}
            {!open && <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />}
            <List disablePadding sx={{ mt: open ? 0.75 : 0 }}>
              {section.items.map(navItem)}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: open ? 2 : 1.25, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {navItem({ text: 'Profile', icon: <PersonIcon />, path: `${basePath}/profile` })}
        <Tooltip title={!open ? 'Logout' : ''} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: '12px', color: '#fb7185', justifyContent: open ? 'initial' : 'center', minHeight: 46, px: 2,
              '&:hover': { bgcolor: 'rgba(251,113,133,0.12)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: 'inherit' }}>
              <LogoutIcon />
            </ListItemIcon>
            {open && <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.86rem' }} />}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const pageTitle = pathname === basePath
    ? 'Dashboard'
    : (pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || '');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'transparent' }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${open ? DRAWER_WIDTH : COLLAPSED_WIDTH}px)` },
          ml: { md: `${open ? DRAWER_WIDTH : COLLAPSED_WIDTH}px` },
          bgcolor: 'rgba(9,14,42,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'text.primary',
          transition: theme.transitions.create(['width', 'margin'], { duration: 200 }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {isMobile && (
              <IconButton onClick={() => setOpen(!open)} edge="start" sx={{ color: 'text.primary' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
              {pageTitle}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={700}>{user?.username}</Typography>
              <Typography variant="caption" sx={{ color: '#ffb054', fontWeight: 600, textTransform: 'uppercase' }}>
                {user?.role?.replace('_', ' ')}
              </Typography>
            </Box>
            <Avatar sx={{ background: 'linear-gradient(135deg,#2f6bff,#f68914)', width: 38, height: 38, fontSize: '1rem', fontWeight: 700 }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH, flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH, boxSizing: 'border-box', border: 'none',
            transition: theme.transitions.create('width', { duration: 200 }), overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
        <Toolbar />
        <Box sx={{ flex: 1, p: { xs: 1.75, sm: 2.5, md: 3 }, overflowY: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
