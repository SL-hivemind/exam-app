// src/components/Footer.jsx
import React, { useState } from "react";
import { 
  Box, Typography, Link, Container, Grid, IconButton, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Button 
} from "@mui/material";
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import PinterestIcon from '@mui/icons-material/Pinterest';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LanguageIcon from '@mui/icons-material/Language';

export default function Footer() {
  const [openAbout, setOpenAbout] = useState(false);

  return (
    <>
      <Box
        component="footer"
        sx={{
          backgroundColor: '#ff6600ee', // Deep orange
          color: 'white',
          py: 6,
          mt: 'auto'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>

            {/* Column 1: Brand and Mission */}
            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <img
                  src="/sllogo.png"
                  alt="Logo"
                  style={{ width: '50px', height: '50px', marginRight: '10px', backgroundColor: 'white', padding: '4px', borderRadius: '8px' }}
                />
                <Typography variant="h6" fontWeight={700}>
                  SAARADAA LEARKNOWATIONS
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Providing a seamless and secure online examination experience to empower educational institutions.
              </Typography>
            </Grid>

            {/* Column 2: Our Websites */}
            <Grid item xs={12} sm={2}>
              <Typography variant="h6" gutterBottom>
                Websites
              </Typography>
              <Stack spacing={1}>
                <Link href="https://e2eindia.org" target="_blank" rel="noopener" color="inherit" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LanguageIcon fontSize="small"/> e2eindia.org</Link>
                <Link href="https://journal.e2eindia.org/" target="_blank" rel="noopener" color="inherit" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LanguageIcon fontSize="small"/> Our Journals</Link>
              </Stack>
            </Grid>

            {/* Column 3: About & Feedback */}
            <Grid item xs={12} sm={3}>
              <Typography variant="h6" gutterBottom>
                Information
              </Typography>
              <Link component="button" variant="body2" onClick={() => setOpenAbout(true)} color="inherit" display="block" underline="hover" sx={{ mb: 1, textAlign: 'left', p: 0 }}>
                About Us
              </Link>
              <Link href="mailto:Saradapublications18@gmail.com" color="inherit" display="block" underline="hover" sx={{ textAlign: 'left', p: 0 }}>
                Send Feedback
              </Link>
            </Grid>
            
            {/* Column 4: Social Media */}
            <Grid item xs={12} sm={3}>
              <Typography variant="h6" gutterBottom>
                Follow Us
              </Typography>
              <IconButton href="https://x.com/saradapubl" target="_blank" rel="noopener" aria-label="X" sx={{ color: 'white' }}><XIcon /></IconButton>
              <IconButton href="https://www.instagram.com/saradapublications" target="_blank" rel="noopener" aria-label="Instagram" sx={{ color: 'white' }}><InstagramIcon /></IconButton>
              <IconButton href="https://in.pinterest.com/infosaradapublications/" target="_blank" rel="noopener" aria-label="Pinterest" sx={{ color: 'white' }}><PinterestIcon /></IconButton>
              <IconButton href="https://www.youtube.com/@saradapublications-v1l" target="_blank" rel="noopener" aria-label="YouTube" sx={{ color: 'white' }}><YouTubeIcon /></IconButton>
              <IconButton href="https://www.linkedin.com/company/sarada-publications" target="_blank" rel="noopener" aria-label="LinkedIn" sx={{ color: 'white' }}><LinkedInIcon /></IconButton>
            </Grid>

          </Grid>
          
          {/* Bottom Bar with Copyright */}
          <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.2)', textAlign: 'center' }}>
            <Typography variant="body2">
              © {new Date().getFullYear()} Saaradaa Learknowations. All Rights Reserved.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* About Us Dialog (Modal) */}
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