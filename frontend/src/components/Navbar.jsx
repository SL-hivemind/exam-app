import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useScrollTrigger,
  Stack,
  Menu,
  MenuItem
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import SchoolIcon from "@mui/icons-material/School";
import useAuth from "../hooks/useAuth";

// --- SCROLL HANDLER (FIXED) ---
const ScrollHandler = (props) => {
  const { children, window, isHome } = props; // Added isHome prop
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
    target: window ? window() : undefined,
  });

  return React.cloneElement(children, {
    elevation: trigger ? 4 : 0,
    sx: {
      // Always white background to ensure visibility
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",

      // Always blue text for consistency
      color: "#1a237e",

      transition: "all 0.3s ease",
      borderBottom: "1px solid rgba(0,0,0,0.05)",
    },
  });
};

export default function Navbar(props) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Check if we are on home or public exams
  const isHome = location.pathname === "/";
  const isPublicExams = location.pathname.startsWith("/public");

  // --- SMART DASHBOARD NAVIGATION ---
  const handleDashboardClick = () => {
    if (!user) return navigate("/login");
    
    if (user.role === 'admin') navigate("/admin");
    else if (user.role === 'school_admin') navigate("/school");
    else if (user.role === 'subject_specialist') navigate("/specialist");
    else if (user.role === 'student') navigate("/student");
    else if (user.role === 'public_user') navigate("/public/dashboard");
    else navigate("/"); 
    
    setMobileOpen(false);
  };

  // --- SCROLL NAVIGATION HANDLER ---
  const handleNavClick = (sectionId) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileOpen(false);
  };

  const menuItems = [
    { label: "Thinklets", id: "thinklets" },
    { label: "Publications", id: "publications" },
    { label: "Radio", id: "radio" },
    { label: "LSRW", id: "lsrw" },
    { label: "Ambassador", id: "ambassador" },
    { label: "SJIS", id: "sjis" },
    { label: "Ecosystem", id: "services" },
    { label: "Plans", id: "plans" },
    { label: "Gallery", id: "gallery" },
  ];

  // Mobile Drawer Content
  const drawer = (
    <Box sx={{ width: 250, pt: 2 }} role="presentation">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pb: 2 }}>
        <SchoolIcon color="primary" />
        <Typography variant="h6" fontWeight={700} color="primary">SL Exams</Typography>
      </Stack>
      <List>
        {!isPublicExams && menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton onClick={() => handleNavClick(item.id)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        {isPublicExams && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => { navigate("/"); setMobileOpen(false); }}>
              <ListItemText primary="Back to Home" />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton onClick={() => { navigate("/public"); setMobileOpen(false); }}>
            <ListItemText primary="Public Exams" primaryTypographyProps={{ fontWeight: 600, color: '#2563eb' }} />
          </ListItemButton>
        </ListItem>
        {isAuthenticated ? (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={handleDashboardClick}>
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { navigate(isPublicExams ? "/public/login" : "/login"); setMobileOpen(false); }}>
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { navigate(isPublicExams ? "/public/register" : "/register"); setMobileOpen(false); }}>
                <ListItemText primary={isPublicExams ? "Register" : "Get Started"} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <>
      {/* Pass isHome to the ScrollHandler */}
      <ScrollHandler {...props} isHome={isHome}>
        <AppBar position="fixed">
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
              
              {/* BRAND LOGO */}
              <Stack 
                direction="row" 
                alignItems="center" 
                spacing={1} 
                onClick={() => navigate("/")} 
                sx={{ cursor: "pointer" }}
              >
                <SchoolIcon fontSize="large" color="inherit" />
                <Typography
                  variant="h5"
                  noWrap
                  sx={{
                    fontWeight: 800,
                    letterSpacing: ".05rem",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  SL EXAMS
                </Typography>
              </Stack>

              {/* DESKTOP MENU */}
              <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: 'center', gap: 1 }}>
                {!isPublicExams ? (
                  <>
                    <Button onClick={() => handleNavClick("thinklets")} sx={{ color: "inherit", fontWeight: 500 }}>Thinklets</Button>
                    <Button onClick={() => handleNavClick("publications")} sx={{ color: "inherit", fontWeight: 500 }}>Publications</Button>
                    
                    <Button onClick={handleMenuClick} sx={{ color: "inherit", fontWeight: 500 }}>Initiatives ▾</Button>
                    <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
                      <MenuItem onClick={() => { handleNavClick("radio"); handleMenuClose(); }}>Radio</MenuItem>
                      <MenuItem onClick={() => { handleNavClick("lsrw"); handleMenuClose(); }}>LSRW</MenuItem>
                      <MenuItem onClick={() => { handleNavClick("ambassador"); handleMenuClose(); }}>Ambassador</MenuItem>
                      <MenuItem onClick={() => { handleNavClick("sjis"); handleMenuClose(); }}>SJIS</MenuItem>
                    </Menu>

                    <Button onClick={() => handleNavClick("services")} sx={{ color: "inherit", fontWeight: 500 }}>Ecosystem</Button>
                    <Button onClick={() => handleNavClick("plans")} sx={{ color: "inherit", fontWeight: 500 }}>Plans</Button>
                    <Button onClick={() => handleNavClick("gallery")} sx={{ color: "inherit", fontWeight: 500 }}>Gallery</Button>
                  </>
                ) : (
                  <Button onClick={() => navigate("/")} sx={{ color: "inherit", fontWeight: 500 }}>Back to Home</Button>
                )}
                
                <Button onClick={() => navigate("/public")} sx={{ color: "inherit", fontWeight: 600, bgcolor: 'rgba(59,130,246,0.08)', borderRadius: '8px', mx: 0.5 }}>Public Exams</Button>

                {isAuthenticated ? (
                  <>
                    <Button variant="outlined" color="inherit" onClick={handleDashboardClick} sx={{ ml: 2, borderColor: 'currentColor' }}>
                      Dashboard
                    </Button>
                    <Button variant="contained" color="warning" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button color="inherit" onClick={() => navigate(isPublicExams ? "/public/login" : "/login")}>
                      Login
                    </Button>
                    <Button 
                      variant="contained" 
                      color={isHome ? "warning" : "primary"} 
                      onClick={() => navigate(isPublicExams ? "/public/register" : "/register")}
                      sx={{ borderRadius: 5, px: 3, textTransform: 'none', fontWeight: 700 }}
                    >
                      {isPublicExams ? "Register" : "Get Started"}
                    </Button>
                  </>
                )}
              </Box>

              {/* MOBILE MENU ICON */}
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={() => setMobileOpen(!mobileOpen)}
                sx={{ display: { xs: "flex", md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>
      </ScrollHandler>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}