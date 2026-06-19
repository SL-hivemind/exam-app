import React, { useState } from "react";
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton,
  Container, Drawer, List, ListItem, ListItemButton, ListItemText,
  useScrollTrigger, Stack, Divider,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import useAuth from "../hooks/useAuth";

const oswald = "'Oswald', sans-serif";
const inter = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const ScrollHandler = (props) => {
  const { children, window } = props;
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 0, target: window ? window() : undefined });
  return React.cloneElement(children, {
    elevation: trigger ? 4 : 0,
    sx: {
      backgroundColor: trigger ? "rgba(10, 16, 46, 0.85)" : "rgba(10, 16, 46, 0.35)",
      backdropFilter: "blur(20px)", color: "#eaf0ff", transition: "all 0.3s ease",
      borderBottom: trigger ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(255,255,255,0.05)",
    },
  });
};

export default function Navbar(props) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location.pathname === "/";

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

  const handleNavClick = (sectionId) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => { document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" }); }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
    setMobileOpen(false);
  };

  const handleLogout = () => { logout(); navigate("/login"); setMobileOpen(false); };

  const navItems = [
    { label: "Exams", id: "exams" },
    { label: "How It Works", id: "how-it-works" },
    { label: "Why Us", id: "why" },
  ];

  const drawer = (
    <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'rgba(10,16,46,0.95)', backdropFilter: 'blur(20px)' }} role="presentation">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Stack direction="row" alignItems="center" spacing={1} onClick={() => { navigate("/"); setMobileOpen(false); }} sx={{ cursor: 'pointer' }}>
          <Box component="img" src="https://sl-exam-images.s3.ap-south-2.amazonaws.com/SL+LOGO.png" alt="SL Logo" sx={{ height: 32, width: 'auto' }} />
          <Typography sx={{ fontFamily: oswald, fontWeight: 700, fontSize: '1.3rem', color: '#eaf0ff', letterSpacing: '0.05em' }}>SL EXAMS</Typography>
        </Stack>
        <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#a9b4dd' }}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {isHome && navItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton onClick={() => handleNavClick(item.id)} sx={{ px: 2.5, py: 1.5 }}>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontFamily: oswald, fontWeight: 600, fontSize: '1rem', color: '#c7d2fe', letterSpacing: '0.04em' }} />
            </ListItemButton>
          </ListItem>
        ))}

        {!isHome && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => { navigate("/"); setMobileOpen(false); }} sx={{ px: 2.5, py: 1.5 }}>
              <ListItemText primary="← Home" primaryTypographyProps={{ fontFamily: oswald, fontWeight: 600, fontSize: '1rem', color: '#3b82f6', letterSpacing: '0.04em' }} />
            </ListItemButton>
          </ListItem>
        )}
        <Divider sx={{ my: 1, mx: 2, borderColor: 'rgba(255,255,255,0.06)' }} />
      </Box>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', p: 2.5 }}>
        {isAuthenticated ? (
          <Stack spacing={1.5}>
            <Button fullWidth variant="contained" onClick={handleDashboardClick} sx={{ fontFamily: oswald, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '10px', py: 1.2, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>Dashboard</Button>
            <Button fullWidth variant="outlined" onClick={handleLogout} sx={{ fontFamily: oswald, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '10px', py: 1.2, borderColor: '#fecaca', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.04)', borderColor: '#ef4444' } }}>Logout</Button>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Button fullWidth variant="contained" onClick={() => { navigate("/login"); setMobileOpen(false); }} sx={{ fontFamily: oswald, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '10px', py: 1.2, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>Login</Button>
            <Button fullWidth variant="outlined" onClick={() => { navigate("/register"); setMobileOpen(false); }} sx={{ fontFamily: oswald, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '10px', py: 1.2, borderColor: 'rgba(255,255,255,0.15)', color: '#c7d2fe' }}>Get Started</Button>
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
            <Toolbar disableGutters sx={{ justifyContent: "space-between", height: 70 }}>
              <Stack direction="row" alignItems="center" spacing={1} onClick={() => navigate("/")} sx={{ cursor: "pointer", '&:hover': { opacity: 0.85 }, transition: 'opacity 0.2s' }}>
                <Box component="img" src="https://sl-exam-images.s3.ap-south-2.amazonaws.com/SL+LOGO.png" alt="SL Logo" sx={{ height: 40, width: 'auto' }} />
                <Typography noWrap sx={{ fontFamily: oswald, fontWeight: 700, fontSize: '1.4rem', color: "inherit", letterSpacing: "0.06em" }}>SL EXAMS</Typography>
              </Stack>

              <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: 'center', gap: 0.5 }}>
                {isHome ? (
                  <>
                    {navItems.map((item) => (
                      <Button key={item.id} onClick={() => handleNavClick(item.id)} sx={{ fontFamily: oswald, color: "inherit", fontWeight: 500, fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '8px', px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                        {item.label}
                      </Button>
                    ))}

                  </>
                ) : (
                  <Button onClick={() => navigate("/")} sx={{ fontFamily: oswald, color: "#3b82f6", fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '8px', px: 2, '&:hover': { bgcolor: 'rgba(59,130,246,0.06)' } }}>
                    ← Home
                  </Button>
                )}

                <Box sx={{ width: 8 }} />

                {isAuthenticated ? (
                  <>
                    <Button variant="outlined" onClick={handleDashboardClick} sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '8px', borderColor: 'rgba(255,255,255,0.15)', color: '#c7d2fe', px: 2.5, '&:hover': { borderColor: '#93c5fd', bgcolor: 'rgba(37,99,235,0.04)' } }}>
                      Dashboard
                    </Button>
                    <Button onClick={handleLogout} sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '8px', color: '#ef4444', px: 2, '&:hover': { bgcolor: 'rgba(239,68,68,0.04)' } }}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => navigate("/login")} sx={{ fontFamily: oswald, fontWeight: 500, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '8px', color: 'inherit', px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                      Login
                    </Button>
                    <Button variant="contained" onClick={() => navigate("/register")} sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: '10px', px: 3, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 2px 10px rgba(37,99,235,0.25)', '&:hover': { boxShadow: '0 4px 16px rgba(37,99,235,0.35)', transform: 'translateY(-1px)' }, transition: 'all 0.2s ease' }}>
                      Get Started
                    </Button>
                  </>
                )}
              </Box>

              <IconButton color="inherit" aria-label="open drawer" edge="end" onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { xs: "flex", md: "none" } }}>
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>
      </ScrollHandler>

      <Drawer anchor="right" variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: 300, border: 'none', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px', bgcolor: 'transparent' } }}>
        {drawer}
      </Drawer>
    </>
  );
}