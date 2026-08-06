// src/components/Footer.jsx
import React, { useState } from "react";
import {
  Box, Typography, Link, Container, IconButton, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import PinterestIcon from '@mui/icons-material/Pinterest';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import PlaceIcon from '@mui/icons-material/Place';

// Brand font (matches the app theme) — previously Oswald, which clashed.
const oswald = "'Plus Jakarta Sans', 'Inter', sans-serif";
const inter = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// 17°21'55.9"N 78°33'38.2"E, in decimal.
const OFFICE = { lat: 17.365528, lng: 78.560611 };
const MAP_EMBED = `https://maps.google.com/maps?q=${OFFICE.lat},${OFFICE.lng}&z=15&output=embed`;
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${OFFICE.lat},${OFFICE.lng}`;

// One size for both marks, and one for every column heading — the two logos
// were 56px and 100px side by side, and the columns each set their own.
const LOGO = 56;

const headingSx = {
  fontFamily: oswald, fontWeight: 600, fontSize: '1.05rem',
  letterSpacing: '0.06em', color: 'white', mb: 2.5, height: 26,
  display: 'flex', alignItems: 'center',
};

const linkSx = {
  fontFamily: inter, fontSize: '0.9rem', transition: 'color 0.2s',
  '&:hover': { color: '#fff' },
};

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
              {/* Both marks at the same size. They were 56px and 100px, which
                  read as one logo and one mistake. The SL EXAMS asset is the
                  cropped mark — the full one bakes in its own "SL EXAMS",
                  which sat immediately left of the wordmark. */}
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                <Box
                  component="img"
                  src="/sl-logo-master.svg"
                  alt="Saaradaa Learknowations"
                  sx={{ width: LOGO, height: LOGO, objectFit: 'contain', borderRadius: '22%', flexShrink: 0 }}
                />
                <Box
                  component="img"
                  src="/logo-mark.png"
                  alt="SL Exams"
                  sx={{ width: LOGO, height: LOGO, objectFit: 'contain', flexShrink: 0 }}
                />
                <Typography sx={{
                  fontFamily: oswald, fontWeight: 700, fontSize: '1.4rem',
                  letterSpacing: '0.06em', color: '#fff',
                }}>
                  SL EXAMS
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ lineHeight: 1.8, maxWidth: 340, fontFamily: inter }}>
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
              <Typography sx={headingSx}>PLATFORM</Typography>
              <Stack spacing={1.5} alignItems="flex-start">
                <Link href="#" color="inherit" underline="hover" sx={linkSx} onClick={(e) => { e.preventDefault(); document.getElementById('lifecycle')?.scrollIntoView({ behavior: 'smooth' }) }}>Product Lifecycle</Link>
                <Link href="/public" color="inherit" underline="hover" sx={linkSx}>Public Exams</Link>
                <Link href="/login" color="inherit" underline="hover" sx={linkSx}>Student Login</Link>
                {/* Was /register, which is not a route — it rendered the
                    homepage on a 200, and now renders the 404 page. Schools
                    sign up by talking to us, so it points where that happens. */}
                <Link href="mailto:directorops@e2eindia.org?subject=School%20registration" color="inherit" underline="hover" sx={linkSx}>Register School</Link>
              </Stack>
            </Grid>

            {/* Column 3: Resources */}
            <Grid item xs={6} md={2}>
              <Typography sx={headingSx}>RESOURCES</Typography>
              <Stack spacing={1.5} alignItems="flex-start">
                <Link href="https://e2eindia.org" target="_blank" rel="noopener" color="inherit" underline="hover" sx={linkSx}>E2E India</Link>
                <Link href="https://journal.e2eindia.org/" target="_blank" rel="noopener" color="inherit" underline="hover" sx={linkSx}>Scientific Journals</Link>
                <Link component="button" onClick={() => setOpenAbout(true)} color="inherit" underline="hover" sx={{ ...linkSx, textAlign: 'left', p: 0, border: 0, background: 'none', cursor: 'pointer' }}>
                  About Us
                </Link>
                <Link href="mailto:Saradapublications18@gmail.com" color="inherit" underline="hover" sx={linkSx}>
                  Report an Issue
                </Link>
              </Stack>
            </Grid>

            {/* Column 4: Contact + where we are */}
            <Grid item xs={12} md={4}>
              <Typography sx={headingSx}>CONTACT US</Typography>

              <Stack spacing={1.25} sx={{ mb: 2.5 }}>
                <Typography variant="body2" sx={{ fontFamily: inter }}>
                  Hyderabad, Telangana, India
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: inter }}>
                  <Box component="strong" sx={{ color: '#fff' }}>Email:</Box>{' '}
                  <Link href="mailto:directorops@e2eindia.org" color="inherit" underline="hover">
                    directorops@e2eindia.org
                  </Link>
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: inter }}>
                  <Box component="strong" sx={{ color: '#fff' }}>Phone:</Box>{' '}
                  <Link href="tel:+914045632683" color="inherit" underline="hover">
                    040 45632683
                  </Link>
                </Typography>
              </Stack>

              {/* Lazy so a map iframe on every page does not cost the page
                  load — the footer is below the fold everywhere. */}
              <Box
                sx={{
                  borderRadius: 2, overflow: 'hidden', mb: 1.5,
                  border: '1px solid rgba(255,255,255,0.10)',
                  lineHeight: 0,
                }}
              >
                <Box
                  component="iframe"
                  title="SL Exams office location"
                  src={MAP_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  sx={{ width: '100%', height: 180, border: 0, display: 'block' }}
                />
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  size="small"
                  href={MAP_LINK}
                  target="_blank"
                  rel="noopener"
                  startIcon={<PlaceIcon />}
                  sx={{
                    fontFamily: oswald, fontWeight: 600, letterSpacing: '0.04em',
                    textTransform: 'uppercase', fontSize: '0.78rem',
                    color: '#fff', borderColor: 'rgba(255,255,255,0.22)',
                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  Directions
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  href="mailto:directorops@e2eindia.org"
                  sx={{
                    fontFamily: oswald, fontWeight: 600, letterSpacing: '0.04em',
                    textTransform: 'uppercase', fontSize: '0.78rem',
                    color: '#fff', borderColor: 'rgba(255,255,255,0.22)',
                    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  Send Message
                </Button>
              </Stack>
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