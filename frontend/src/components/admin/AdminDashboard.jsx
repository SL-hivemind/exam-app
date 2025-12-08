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
  Menu as MenuIcon // Added Menu Icon
} from "@mui/icons-material";
import { Link as RouterLink, Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const DRAWER_WIDTH = 260;

export default function AdminDashboard(props) {
  const { window } = props; // For responsive container
  const { user, logout } = useAuth() || {};
  const location = useLocation();
  const navigate = useNavigate();
  
  // --- STATE FOR MOBILE DRAWER ---
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // --- 1. DETERMINE ROLES & PATHS ---
  const isSchoolAdmin = user?.role === "school_admin";
  const isSubjectSpecialist = user?.role === "subject_specialist";
  const isAdmin = user?.role === "admin";

  const basePath = isSchoolAdmin ? "/school" : "/admin";

  // --- 2. DEFINE MENU SECTIONS ---
  const menuSections = [
    {
      title: "Academics",
      items: [
        { 
          text: "Manage Exams", 
          icon: <QuizIcon />, 
          path: `${basePath}/exams`,
          allowed: !isSubjectSpecialist 
        },
        { 
          text: "Question Repository", 
          icon: <RepoIcon />, 
          path: `${basePath}/repository/questions`,
          allowed: true 
        },
      ]
    },
    {
      title: "Management",
      items: [
        { 
          text: "Manage Students", 
          icon: <PeopleIcon />, 
          path: `${basePath}/students`,
          allowed: !isSubjectSpecialist 
        },
        { 
          text: "Manage Schools", 
          icon: <SchoolIcon />, 
          path: `${basePath}/schools`,
          allowed: isAdmin 
        },
      ]
    }
  ];

  // --- 3. DRAWER CONTENT (Extracted for reuse in Mobile & Desktop) ---
  const drawerContent = (
    <div>
      {/* Brand / Logo Area */}
      <Toolbar sx={{ bgcolor: '#1a237e', color: 'white' }}>
         <DashboardIcon sx={{ mr: 2 }} />
         <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
            {isSchoolAdmin ? "School Portal" : "Admin Console"}
         </Typography>
      </Toolbar>
      <Divider />
      
      <Box sx={{ overflow: "auto", py: 2 }}>
        {menuSections.map((section, index) => (
          <React.Fragment key={index}>
            {section.items.some(i => i.allowed) && (
              <>
                <Typography variant="caption" sx={{ px: 3, pt: 2, pb: 1, color: 'text.secondary', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {section.title}
                </Typography>
                <List>
                  {section.items.map((item) => (
                    item.allowed && (
                      <ListItem key={item.text} disablePadding>
                        <ListItemButton 
                          component={RouterLink} 
                          to={item.path}
                          selected={location.pathname.startsWith(item.path)}
                          onClick={() => setMobileOpen(false)} // Close drawer on mobile click
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
                    )
                  ))}
                </List>
                {index < menuSections.length - 1 && <Divider sx={{ my: 1, mx: 2 }} />}
              </>
            )}
          </React.Fragment>
        ))}
      </Box>
    </div>
  );

  // --- REDIRECT LOGIC ---
  if (isSubjectSpecialist && (location.pathname === "/admin" || location.pathname === "/admin/")) {
    return <Navigate to="/admin/repository/questions" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const container = window !== undefined ? () => window().document.body : undefined;

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      
      {/* --- TOP BAR --- */}
      <AppBar 
        position="fixed" 
        sx={{ 
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, // Desktop: Width - Sidebar
          ml: { sm: `${DRAWER_WIDTH}px` },                // Desktop: Push right
          bgcolor: '#1a237e' 
        }}
      >
        <Toolbar>
          {/* HAMBURGER MENU (Mobile Only) */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
               sx={{ mr: 2, display: { sm: 'none' } }} // Hide on Desktop (sm and up)
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
             {/* Title changes based on path could go here, otherwise generic */}
             Dashboard
          </Typography>
          
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name || user?.username} ({user?.role?.replace('_', ' ')})
            </Typography>
            <Avatar sx={{ bgcolor: 'orange', width: 32, height: 32, fontSize: 14 }}>
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
        aria-label="mailbox folders"
      >
        {/* 1. MOBILE DRAWER (Temporary) */}
        <Drawer
          container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }} // Better open performance on mobile.
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* 2. DESKTOP DRAWER (Permanent) */}
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

      {/* --- MAIN CONTENT AREA --- */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, // Prevent overflow on desktop
          bgcolor: '#ffffff', 
          minHeight: '100vh' 
        }}
      >
        <Toolbar /> {/* Spacer for top bar */}
        <Outlet />
      </Box>
    </Box>
  );
}