import React, { useState } from 'react';
import { 
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, Divider, 
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Avatar, Stack, useTheme, useMediaQuery, Tooltip, Fade
} from '@mui/material';
import { 
  School as SchoolIcon, 
  People as PeopleIcon, 
  Quiz as QuizIcon, 
  LibraryBooks as RepoIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  NotificationsActive as NotificationsIcon
} from '@mui/icons-material';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 88;

export default function DashboardLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  
  // Sidebar state: Closed by default on mobile, open on desktop
  const [open, setOpen] = useState(!isMobile);

  const isAdmin = user?.role === "admin";
  const isSchoolAdmin = user?.role === "school_admin";
  const isSubjectSpecialist = user?.role === "subject_specialist";

  // Base path logic
  const basePath = isSchoolAdmin ? "/school" : isSubjectSpecialist ? "/specialist" : "/admin";

  const menuItems = [
    { text: "Exams", icon: <QuizIcon />, path: `${basePath}/exams`, allowed: !isSubjectSpecialist },
    { text: "Question Repo", icon: <RepoIcon />, path: `${basePath}/repository/questions`, allowed: true },
    { text: "Students", icon: <PeopleIcon />, path: `${basePath}/students`, allowed: !isSubjectSpecialist },
    { text: "Schools", icon: <SchoolIcon />, path: `${basePath}/schools`, allowed: isAdmin },
    { text: "Activity Log", icon: <HistoryIcon />, path: `${basePath}/activity-log`, allowed: isAdmin || isSubjectSpecialist },
    { text: "Requests", icon: <NotificationsIcon />, path: `${basePath}/requests`, allowed: isAdmin || isSchoolAdmin },
    { text: "Profile", icon: <PersonIcon />, path: `${basePath}/profile`, allowed: true },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#111827', color: '#fff' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', px: 2 }}>
        {open && (
          <Typography variant="h6" fontWeight={800} sx={{ color: '#3b82f6', letterSpacing: 1 }}>
            PORTAL
          </Typography>
        )}
        <IconButton onClick={() => setOpen(!open)} sx={{ color: 'inherit' }}>
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>
      
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
      
      <List sx={{ flexGrow: 1, px: 2, pt: 2 }}>
        {menuItems.filter(item => item.allowed).map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 1 }}>
              <Tooltip title={!open ? item.text : ""} placement="right">
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    borderRadius: '10px',
                    bgcolor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: isActive ? '#60a5fa' : '#9ca3af',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  {open && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, fontSize: '0.875rem' }} />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <ListItemButton sx={{ borderRadius: '10px', color: '#ef4444' }} onClick={handleLogout}>
          <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', color: 'inherit' }}><LogoutIcon /></ListItemIcon>
          {open && <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600 }} />}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: '100vh', bgcolor: '#f3f4f6' }}>
      <CssBaseline />
      
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          width: { md: `calc(100% - ${open ? DRAWER_WIDTH : COLLAPSED_WIDTH}px)` },
          ml: { md: `${open ? DRAWER_WIDTH : COLLAPSED_WIDTH}px` },
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #e5e7eb',
          color: '#111827',
          transition: theme.transitions.create(['width', 'margin'], { duration: 200 })
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center">
            {isMobile && <IconButton onClick={() => setOpen(!open)} sx={{ mr: 2 }}><MenuIcon /></IconButton>}
            <Typography variant="subtitle1" fontWeight={700} sx={{ textTransform: 'capitalize', color: '#374151' }}>
              {location.pathname.split('/').pop().replace(/-/g, ' ')}
            </Typography>
          </Stack>
          
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={700}>{user?.name || user?.username}</Typography>
              <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase' }}>
                {user?.role?.replace('_', ' ')}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: '#3b82f6', width: 36, height: 36, fontSize: '1rem', fontWeight: 700 }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : COLLAPSED_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            transition: theme.transitions.create('width', { duration: 200 }),
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
        <Toolbar /> 
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflowY: 'auto' }}>
          {/* Outlet renders the sub-pages automatically */}
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
