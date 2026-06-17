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
  MenuItem,
  Divider,
  Collapse,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import SchoolIcon from "@mui/icons-material/School";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import useAuth from "../hooks/useAuth";

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// --- SCROLL HANDLER ---
const ScrollHandler = (props) => {
  const { children, window } = props;
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
    target: window ? window() : undefined,
  });

  return React.cloneElement(children, {
    elevation: trigger ? 4 : 0,
    sx: {
      backgroundColor: trigger
        ? "rgba(10, 16, 46, 0.72)"
        : "rgba(10, 16, 46, 0.45)",
      backdropFilter: "blur(20px)",
      color: "#eaf0ff",
      transition: "all 0.3s ease",
      borderBottom: trigger
        ? "1px solid rgba(255,255,255,0.10)"
        : "1px solid rgba(255,255,255,0.05)",
    },
  });
};

export default function Navbar(props) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreAnchor, setExploreAnchor] = useState(null);
  const [initiativesAnchor, setInitiativesAnchor] = useState(null);
  // Mobile drawer collapsibles
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const [mobileInitiativesOpen, setMobileInitiativesOpen] = useState(false);

  const isHome = location.pathname === "/";

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
    setExploreAnchor(null);
    setInitiativesAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileOpen(false);
  };

  // Grouped nav items
  const exploreItems = [
    { label: "Thinklets", id: "thinklets" },
    { label: "Publications", id: "publications" },
    { label: "Ecosystem", id: "services" },
    { label: "Gallery", id: "gallery" },
  ];

  const initiativesItems = [
    { label: "Radio", id: "radio" },
    { label: "LSRW", id: "lsrw" },
    { label: "Ambassador", id: "ambassador" },
    { label: "SJIS", id: "sjis" },
  ];

  // Mobile Drawer Content
  const drawer = (
    <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(255,255,255,0.05)' }} role="presentation">
      {/* Drawer Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Stack direction="row" alignItems="center" spacing={1} onClick={() => { navigate("/"); setMobileOpen(false); }} sx={{ cursor: 'pointer' }}>
          <Box component="img" src="https://sl-exam-images.s3.ap-south-2.amazonaws.com/SL+LOGO.png" alt="SL Logo" sx={{ height: 32, width: 'auto' }} />
          <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#eaf0ff', letterSpacing: '-0.02em' }}>SL EXAMS</Typography>
        </Stack>
        <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#a9b4dd' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Drawer Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {isHome && (
          <>
            {/* Explore Section */}
            <ListItemButton onClick={() => setMobileExploreOpen(!mobileExploreOpen)} sx={{ px: 2.5, py: 1.5 }}>
              <ListItemText primary="Explore" primaryTypographyProps={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }} />
              {mobileExploreOpen ? <ExpandLess sx={{ color: '#64748b' }} /> : <ExpandMore sx={{ color: '#64748b' }} />}
            </ListItemButton>
            <Collapse in={mobileExploreOpen} timeout="auto" unmountOnExit>
              <List disablePadding>
                {exploreItems.map((item) => (
                  <ListItem key={item.id} disablePadding>
                    <ListItemButton onClick={() => handleNavClick(item.id)} sx={{ pl: 4.5, py: 1.2 }}>
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontFamily: ff, fontWeight: 500, fontSize: '0.88rem', color: '#475569' }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            {/* Initiatives Section */}
            <ListItemButton onClick={() => setMobileInitiativesOpen(!mobileInitiativesOpen)} sx={{ px: 2.5, py: 1.5 }}>
              <ListItemText primary="Initiatives" primaryTypographyProps={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }} />
              {mobileInitiativesOpen ? <ExpandLess sx={{ color: '#64748b' }} /> : <ExpandMore sx={{ color: '#64748b' }} />}
            </ListItemButton>
            <Collapse in={mobileInitiativesOpen} timeout="auto" unmountOnExit>
              <List disablePadding>
                {initiativesItems.map((item) => (
                  <ListItem key={item.id} disablePadding>
                    <ListItemButton onClick={() => handleNavClick(item.id)} sx={{ pl: 4.5, py: 1.2 }}>
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontFamily: ff, fontWeight: 500, fontSize: '0.88rem', color: '#475569' }} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>

            {/* Plans */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleNavClick("plans")} sx={{ px: 2.5, py: 1.5 }}>
                <ListItemText primary="Plans" primaryTypographyProps={{ fontFamily: ff, fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }} />
              </ListItemButton>
            </ListItem>

            <Divider sx={{ my: 1, mx: 2 }} />
          </>
        )}

        {!isHome && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => { navigate("/"); setMobileOpen(false); }} sx={{ px: 2.5, py: 1.5 }}>
              <ListItemText primary="← Home" primaryTypographyProps={{ fontFamily: ff, fontWeight: 600, fontSize: '0.95rem', color: '#2563eb' }} />
            </ListItemButton>
          </ListItem>
        )}
      </Box>

      {/* Drawer Footer — Auth */}
      <Box sx={{ borderTop: '1px solid #f1f5f9', p: 2.5 }}>
        {isAuthenticated ? (
          <Stack spacing={1.5}>
            <Button
              fullWidth variant="contained" onClick={handleDashboardClick}
              sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px', py: 1.2, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}
            >
              Dashboard
            </Button>
            <Button
              fullWidth variant="outlined" onClick={handleLogout}
              sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '10px', py: 1.2, borderColor: '#fecaca', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.04)', borderColor: '#ef4444' } }}
            >
              Logout
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Button
              fullWidth variant="contained" onClick={() => { navigate("/login"); setMobileOpen(false); }}
              sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px', py: 1.2, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}
            >
              Login
            </Button>
            <Button
              fullWidth variant="outlined" onClick={() => { navigate("/register"); setMobileOpen(false); }}
              sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '10px', py: 1.2, borderColor: '#e2e8f0', color: '#334155' }}
            >
              Get Started
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <ScrollHandler {...props}>
        <AppBar position="fixed">
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ justifyContent: "space-between", height: 64 }}>

              {/* BRAND LOGO */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                onClick={() => navigate("/")}
                sx={{ cursor: "pointer", '&:hover': { opacity: 0.85 }, transition: 'opacity 0.2s' }}
              >
                <Box component="img" src="https://sl-exam-images.s3.ap-south-2.amazonaws.com/SL+LOGO.png" alt="SL Logo" sx={{ height: 38, width: 'auto' }} />
                <Typography
                  noWrap
                  sx={{
                    fontFamily: ff,
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: "inherit",
                    letterSpacing: "-0.02em",
                    textDecoration: "none",
                  }}
                >
                  SL EXAMS
                </Typography>
              </Stack>

              {/* DESKTOP MENU */}
              <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: 'center', gap: 0.5 }}>
                {isHome ? (
                  <>
                    {/* Explore Dropdown */}
                    <Button
                      onClick={(e) => setExploreAnchor(e.currentTarget)}
                      sx={{ fontFamily: ff, color: "inherit", fontWeight: 600, fontSize: '0.88rem', textTransform: 'none', borderRadius: '8px', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                    >
                      Explore ▾
                    </Button>
                    <Menu
                      anchorEl={exploreAnchor} open={Boolean(exploreAnchor)}
                      onClose={() => setExploreAnchor(null)}
                      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #f1f5f9', mt: 1, minWidth: 180 } }}
                    >
                      {exploreItems.map((item) => (
                        <MenuItem key={item.id} onClick={() => handleNavClick(item.id)}
                          sx={{ fontFamily: ff, fontWeight: 500, fontSize: '0.88rem', py: 1.2, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                          {item.label}
                        </MenuItem>
                      ))}
                    </Menu>

                    {/* Initiatives Dropdown */}
                    <Button
                      onClick={(e) => setInitiativesAnchor(e.currentTarget)}
                      sx={{ fontFamily: ff, color: "inherit", fontWeight: 600, fontSize: '0.88rem', textTransform: 'none', borderRadius: '8px', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                    >
                      Initiatives ▾
                    </Button>
                    <Menu
                      anchorEl={initiativesAnchor} open={Boolean(initiativesAnchor)}
                      onClose={() => setInitiativesAnchor(null)}
                      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #f1f5f9', mt: 1, minWidth: 180 } }}
                    >
                      {initiativesItems.map((item) => (
                        <MenuItem key={item.id} onClick={() => handleNavClick(item.id)}
                          sx={{ fontFamily: ff, fontWeight: 500, fontSize: '0.88rem', py: 1.2, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                          {item.label}
                        </MenuItem>
                      ))}
                    </Menu>

                    {/* Plans — direct link */}
                    <Button
                      onClick={() => handleNavClick("plans")}
                      sx={{ fontFamily: ff, color: "inherit", fontWeight: 600, fontSize: '0.88rem', textTransform: 'none', borderRadius: '8px', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                    >
                      Plans
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => navigate("/")}
                    sx={{ fontFamily: ff, color: "#2563eb", fontWeight: 600, fontSize: '0.88rem', textTransform: 'none', borderRadius: '8px', px: 2, '&:hover': { bgcolor: 'rgba(37,99,235,0.06)' } }}
                  >
                    ← Home
                  </Button>
                )}

                {/* Spacer */}
                <Box sx={{ width: 8 }} />

                {/* Auth Buttons */}
                {isAuthenticated ? (
                  <>
                    <Button
                      variant="outlined" onClick={handleDashboardClick}
                      sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', borderRadius: '8px', borderColor: '#e2e8f0', color: '#0f172a', px: 2.5, '&:hover': { borderColor: '#93c5fd', bgcolor: 'rgba(37,99,235,0.04)' } }}
                    >
                      Dashboard
                    </Button>
                    <Button
                      onClick={handleLogout}
                      sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', borderRadius: '8px', color: '#ef4444', px: 2, '&:hover': { bgcolor: 'rgba(239,68,68,0.04)' } }}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => navigate("/login")}
                      sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.85rem', textTransform: 'none', borderRadius: '8px', color: 'inherit', px: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}
                    >
                      Login
                    </Button>
                    <Button
                      variant="contained" onClick={() => navigate("/register")}
                      sx={{
                        fontFamily: ff, fontWeight: 700, fontSize: '0.85rem', textTransform: 'none',
                        borderRadius: '10px', px: 3,
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        boxShadow: '0 2px 10px rgba(37,99,235,0.25)',
                        '&:hover': { boxShadow: '0 4px 16px rgba(37,99,235,0.35)', transform: 'translateY(-1px)' },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </Box>

              {/* MOBILE MENU ICON */}
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="end"
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
        anchor="right"
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 300, border: 'none', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
}