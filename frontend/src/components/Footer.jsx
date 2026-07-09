// src/components/Footer.jsx
import React, { useState } from "react";
import {
  Box, Typography, Link, Container,  IconButton, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import PinterestIcon from '@mui/icons-material/Pinterest';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import SchoolIcon from "@mui/icons-material/School";

// Brand font (matches the app theme) — previously Oswald, which clashed.
const oswald = "'Plus Jakarta Sans', 'Inter', sans-serif";
const inter = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function Footer() {
  const [openAbout, setOpenAbout] = useState(false);

  return (
    <>
      <Box
        component="footer"
        sx={{
          position: 'relative',
          background: 'linear-gradient(180deg, rgba(7,11,29,0) 0%, rgba(5,8,20,0.65) 100%)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(230,236,255,0.72)',
          py: 8,
          mt: 'auto'
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={6}>

            {/* Column 1: Brand and Mission */}
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" mb={2} sx={{ gap: 1.25 }}>
                <Box sx={{
                  width: 42, height: 42, borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,#f68914,#ffb054)',
                  boxShadow: '0 8px 22px rgba(246,137,20,0.4)',
                }}>
                  <SchoolIcon sx={{ fontSize: 24, color: 'white' }} />
                </Box>
                <Typography sx={{
                  fontFamily: oswald, fontWeight: 700, fontSize: '1.5rem', letterSpacing: '0.06em',
                  background: 'linear-gradient(120deg,#ffffff,#ffce9e)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  SL EXAMS
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ lineHeight: 1.8, maxWidth: 300, fontFamily: inter }}>
                A unit of Saaradaa Learknowations. We are dedicated to revolutionizing education through secure assessments, high-quality publications, and comprehensive school support services.
              </Typography>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <IconButton href="https://x.com/saradapubl" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}><XIcon /></IconButton>
                <IconButton href="https://www.linkedin.com/company/sarada-publications" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}><LinkedInIcon /></IconButton>
                <IconButton href="https://www.instagram.com/saradapublications" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}><InstagramIcon /></IconButton>
                <IconButton href="https://in.pinterest.com/infosaradapublications/" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}><PinterestIcon /></IconButton>
                <IconButton href="https://www.youtube.com/@SaradaPublications-v1l" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' } }}><YouTubeIcon /></IconButton>
              </Box>
            </Grid>

            {/* Column 2: Quick Links */}
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.06em', color: 'white', mb: 2 }}>
                PLATFORM
              </Typography>
              <Stack spacing={1.5}>
                <Link href="#" color="inherit" underline="hover" sx={{ fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#fff' } }} onClick={(e) => { e.preventDefault(); document.getElementById('lifecycle')?.scrollIntoView({ behavior: 'smooth' }) }}>Product Lifecycle</Link>
                <Link href="/public" color="inherit" underline="hover" sx={{ fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>Public Exams</Link>
                <Link href="/login" color="inherit" underline="hover" sx={{ fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>Student Login</Link>
                <Link href="/register" color="inherit" underline="hover" sx={{ fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>Register School</Link>
              </Stack>
            </Grid>

            {/* Column 3: Resources */}
            <Grid item xs={6} md={3}>
              <Typography sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.06em', color: 'white', mb: 2 }}>
                RESOURCES
              </Typography>
              <Stack spacing={1.5}>
                <Link href="https://e2eindia.org" target="_blank" color="inherit" underline="hover" sx={{ fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#f68914' } }}>E2E India</Link>
                <Link href="https://journal.e2eindia.org/" target="_blank" color="inherit" underline="hover" sx={{ fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>Scientific Journals</Link>
                <Link component="button" variant="body2" onClick={() => setOpenAbout(true)} color="inherit" underline="hover" sx={{ textAlign: 'left', fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>
                  About Us
                </Link>
                <Link href="mailto:Saradapublications18@gmail.com" color="inherit" underline="hover" sx={{ fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}>
                  Report an Issue
                </Link>
              </Stack>
            </Grid>

            {/* Column 4: Contact */}
            <Grid item xs={12} md={3}>
              <Typography sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.06em', color: 'white', mb: 2 }}>
                CONTACT US
              </Typography>
              <Typography variant="body2" paragraph sx={{ fontFamily: inter }}>
                Hyderabad, Telangana, India
              </Typography>
              <Typography variant="body2" paragraph sx={{ fontFamily: inter }}>
                <strong>Email:</strong>{' '}
                directorops@e2eindia.org<br />
                <strong>Phone:</strong> 040 45632683
              </Typography>
              <Button variant="gradient" size="small" href="mailto:directorops@e2eindia.org" sx={{ fontFamily: oswald, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                Send Message
              </Button>
            </Grid>

          </Grid>

          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.07)' }} />

          <Box textAlign="center">
            <Typography variant="caption" sx={{ opacity: 0.6, fontFamily: inter }}>
              © {new Date().getFullYear()} Saaradaa Learknowations. Recognized by DPIIT and MSME, Govt of India.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* About Us Dialog */}
      <Dialog open={openAbout} onClose={() => setOpenAbout(false)} maxWidth="md">
        <DialogTitle sx={{ fontFamily: oswald, fontWeight: 700, letterSpacing: '0.03em', fontSize: '1.6rem' }}>About Saaradaa Learknowations</DialogTitle>
        <DialogContent>
          <Typography gutterBottom sx={{ fontFamily: inter }}><strong>Our Mission:</strong> To revolutionize the assessment process by providing a secure, intuitive, and reliable online examination platform.</Typography>
          <Typography color="text.secondary" paragraph sx={{ fontFamily: inter }}>
            We are a forward-thinking EdTech company dedicated to solving the real-world challenges faced by schools. Our core offering is a comprehensive online examination system designed for students from the 6th to the 10th grade, and we are proudly recognized by the <strong>DPIIT</strong> and <strong>MSME, Government of India</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAbout(false)} sx={{ fontFamily: oswald, fontWeight: 600, letterSpacing: '0.04em' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}