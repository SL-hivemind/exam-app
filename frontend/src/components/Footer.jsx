// src/components/Footer.jsx
import React, { useState } from "react";
import {
  Box, Typography, Link, Container, Grid, IconButton, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider
} from "@mui/material";
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import PinterestIcon from '@mui/icons-material/Pinterest';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import SchoolIcon from "@mui/icons-material/School";

export default function Footer() {
  const [openAbout, setOpenAbout] = useState(false);

  return (
    <>
      <Box
        component="footer"
        sx={{
          backgroundColor: '#0d1b2a', // Dark Navy for contrast with the Blue Navbar
          color: 'rgba(255,255,255,0.8)',
          py: 8,
          mt: 'auto'
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={6}>

            {/* Column 1: Brand and Mission */}
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <SchoolIcon sx={{ fontSize: 40, mr: 1, color: 'white' }} />
                <Typography variant="h5" fontWeight={800} color="white">
                  SL EXAMS
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ lineHeight: 1.8, maxWidth: 300 }}>
                A unit of Saaradaa Learknowations. We are dedicated to revolutionizing education through secure assessments, high-quality publications, and comprehensive school support services.
              </Typography>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <IconButton href="https://x.com/saradapubl" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}><XIcon /></IconButton>
                <IconButton href="https://www.linkedin.com/company/sarada-publications" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}><LinkedInIcon /></IconButton>
                <IconButton href="https://www.instagram.com/saradapublications" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}><InstagramIcon /></IconButton>
                <IconButton href="https://in.pinterest.com/infosaradapublications/" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}><PinterestIcon /></IconButton>
                <IconButton href="https://www.youtube.com/@SaradaPublications-v1l" target="_blank" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}><YouTubeIcon /></IconButton>
              </Box>
            </Grid>

            {/* Column 2: Quick Links */}
            <Grid item xs={6} md={2}>
              <Typography variant="subtitle1" fontWeight={700} color="white" gutterBottom>
                Platform
              </Typography>
              <Stack spacing={1.5}>
                <Link href="#" color="inherit" underline="hover" onClick={(e) => { e.preventDefault(); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }) }}>Services</Link>
                <Link href="#" color="inherit" underline="hover" onClick={(e) => { e.preventDefault(); document.getElementById('exams')?.scrollIntoView({ behavior: 'smooth' }) }}>Exams</Link>
                <Link href="#" color="inherit" underline="hover" onClick={(e) => { e.preventDefault(); document.getElementById('publications')?.scrollIntoView({ behavior: 'smooth' }) }}>Publications</Link>
                <Link href="/login" color="inherit" underline="hover">Student Login</Link>
                <Link href="/register" color="inherit" underline="hover">Register School</Link>
              </Stack>
            </Grid>

            {/* Column 3: Resources */}
            <Grid item xs={6} md={3}>
              <Typography variant="subtitle1" fontWeight={700} color="white" gutterBottom>
                Resources
              </Typography>
              <Stack spacing={1.5}>
                <Link href="https://e2eindia.org" target="_blank" color="inherit" underline="hover">E2E India</Link>
                <Link href="https://journal.e2eindia.org/" target="_blank" color="inherit" underline="hover">Scientific Journals</Link>
                <Link component="button" variant="body2" onClick={() => setOpenAbout(true)} color="inherit" underline="hover" sx={{ textAlign: 'left' }}>
                  About Us
                </Link>
                <Link href="mailto:Saradapublications18@gmail.com" color="inherit" underline="hover">
                  Report an Issue
                </Link>
              </Stack>
            </Grid>

            {/* Column 4: Contact */}
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" fontWeight={700} color="white" gutterBottom>
                Contact Us
              </Typography>
              <Typography variant="body2" paragraph>
                Hyderabad, Telangana, India
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Email:</strong>
                directorops@e2eindia.org<br />
                <strong>Phone:</strong> 040 45632683
              </Typography>
              <Button variant="outlined" color="inherit" size="small" href="mailto:directorops@e2eindia.org">
                Send Message
              </Button>
            </Grid>

          </Grid>

          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

          <Box textAlign="center">
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              © {new Date().getFullYear()} Saaradaa Learknowations. Recognized by DPIIT and MSME, Govt of India.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* About Us Dialog */}
      <Dialog open={openAbout} onClose={() => setOpenAbout(false)} maxWidth="md">
        <DialogTitle variant="h4">About Saaradaa Learknowations</DialogTitle>
        <DialogContent>
          <Typography gutterBottom><strong>Our Mission:</strong> To revolutionize the assessment process by providing a secure, intuitive, and reliable online examination platform.</Typography>
          <Typography color="text.secondary" paragraph>
            We are a forward-thinking EdTech company dedicated to solving the real-world challenges faced by schools. Our core offering is a comprehensive online examination system designed for students from the 6th to the 10th grade, and we are proudly recognized by the <strong>DPIIT</strong> and <strong>MSME, Government of India</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAbout(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}