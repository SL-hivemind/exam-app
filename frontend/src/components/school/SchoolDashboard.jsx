import React, { useState } from "react";
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Avatar,
  Stack,
  IconButton
} from "@mui/material";
import { 
  School as SchoolIcon, 
  People as PeopleIcon, 
  Quiz as QuizIcon, 
  LibraryBooks as RepoIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon
} from "@mui/icons-material";
import { Link as RouterLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const DRAWER_WIDTH = 260;

export default function SchoolDashboard(props) {
  const { window } = props;
  const { user, logout } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // --- MENU CONFIGURATION ---
  const menuSections = [
    {
      title: "Academics",
      items: [
        { 
          text: "Manage Exams", 
          icon: <QuizIcon />, 
          path: "/school/exams" 
        },
        { 
          text: "Question Repository", 
          icon: <RepoIcon />, 
          path: "/school/repository/questions" 
        },
      ]
    },
    {
      title: "Management",
      items: [
        { 
          text: "Manage Students", 
          icon: <PeopleIcon />, 
          path: "/school/students" 
        },
      ]
    }
  ];

  const drawerContent = (
    <div>
      {/* Brand Area */}
      <Toolbar sx={{ bgcolor: '#1a237e', color: 'white' }}>
         <SchoolIcon sx={{ mr: 2 }} />
         <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
           {user?.name || user?.username}
         </Typography>
      </Toolbar>
      <Divider />
      
      <Box sx={{ overflow: "auto", py: 2 }}>
        {menuSections.map((section, index) => (
          <React.Fragment key={index}>
            <Typography variant="caption" sx={{ px: 3, pt: 2, pb: 1, color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {section.title}
            </Typography>
            <List>
              {section.items.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton 
                    component={RouterLink} 
                    to={item.path}
                    selected={location.pathname.startsWith(item.path)}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      mx: 1, borderRadius: 2,
                      '&.Mui-selected': { bgcolor: '#e8eaf6', color: '#1a237e', '& .MuiListItemIcon-root': { color: '#1a237e' } },
                      '&:hover': { bgcolor: '#f0f2f5' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            {index < menuSections.length - 1 && <Divider sx={{ my: 1, mx: 2 }} />}
          </React.Fragment>
        ))}
      </Box>
    </div>
  );

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      
      {/* --- TOP APP BAR --- */}
      <AppBar 
        position="fixed" 
        sx={{ 
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          bgcolor: '#1a237e' 
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <DashboardIcon sx={{ mr: 1, opacity: 0.8 }} />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
             Dashboard
          </Typography>
          
          <Stack direction="row" alignItems="center" spacing={2}>
            {/* <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name || user?.username} 
            </Typography> */}
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: 14 }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <IconButton color="inherit" onClick={handleLogout} title="Logout">
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* --- NAVIGATION DRAWERS --- */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, bgcolor: '#f8f9fa' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* --- MAIN CONTENT --- */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: '#ffffff', 
          minHeight: '100vh' 
        }}
      >
        <Toolbar /> {/* Spacer */}
        <Outlet />
      </Box>
    </Box>
  );
}