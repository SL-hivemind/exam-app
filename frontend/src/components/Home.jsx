// src/components/Home.jsx
import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Button, Stack, Card, CardContent, Grid,
  List, ListItem, ListItemIcon, ListItemText // Added List components
} from "@mui/material";
import { Masonry } from '@mui/lab';
import { useNavigate } from "react-router-dom";

// All required icons
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BarChartIcon from '@mui/icons-material/BarChart';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import BookIcon from '@mui/icons-material/Book';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkIcon from '@mui/icons-material/Work';


// --- Mock Data ---
const galleryImages = [
  '/images/gallery1.jpg',
  '/images/gallery2.jpg',
  '/images/gallery3.jpg',
  '/images/gallery4.jpg',
];

const recognitionImages = [
  '/images/DPIIT.jpeg',
  '/images/ISBN.png',
  '/images/DPIIT(2).png',
  '/images/SONASIS-MSME.png'
];

// --- Fading Image Carousel Component ---
const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
    return () => clearInterval(intervalId);
  }, [images.length]);

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      height: '200px',
      overflow: 'hidden',
      borderRadius: 2,
    }}>
      {images.map((src, index) => (
        <Box
          key={index}
          component="img"
          src={src}
          alt={`Carousel image ${index + 1}`}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            opacity: index === currentIndex ? 1 : 0,
            transition: 'opacity 0.7s ease-in-out',
          }}
        />
      ))}
    </Box>
  );
};

export default function Home() {
  const navigate = useNavigate();

  // Common card styling for a consistent, "glass" look
  const cardStyle = {
    p: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

  return (
    <Box sx={{
      width: '100%',
      minHeight: '100vh',
      backgroundImage: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>
      {/* --- Marquee Announcement --- */}
      <Box component="section" sx={{ background: "#ff1744", color: "white", py: 1, overflow: "hidden" }}>
        <Box sx={{
          display: "inline-block", whiteSpace: "nowrap", px: 2, fontWeight: 700,
          animation: "ticker 20s linear infinite",
          "@keyframes ticker": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(-100%)" } },
        }}>
          📢 Results for the National Science Olympiad are out now! | We are now recognized by DPIIT and MSME, Govt of India 🎉 | New exam schedules will be announced soon!
        </Box>
      </Box>

      {/* --- Hero Section --- */}
      <Box sx={{
        height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', textAlign: 'center', position: 'relative', my: 2
      }}>
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1, borderRadius: 3
        }} />
        <Box sx={{ zIndex: 2, p: 3 }}>
          <Typography variant="h2" fontWeight={700} gutterBottom>
            A Seamless Online Examination Experience
          </Typography>
          <Typography variant="h6" color="inherit" sx={{ mb: 4, fontWeight: 300 }}>
            Empowering educational institutions with a secure, intuitive, and robust platform.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button size="large" variant="contained" onClick={() => navigate("/login")}>Login</Button>
            {/* <Button size="large" variant="outlined" sx={{ color: 'white', borderColor: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }} onClick={() => navigate("/register")}>
              Register as Student
            </Button> */}
          </Stack>
        </Box>
      </Box>

      {/* --- Main Content with Masonry Layout --- */}
      <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
        <Masonry columns={{ xs: 1, sm: 2, lg: 2 }} spacing={3}>

          {/* SECTION 1: What We Offer */}
          <Card sx={cardStyle}>
            <CardContent>
              <Typography variant="h4" fontWeight={600} gutterBottom>What We Offer</Typography>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}><Stack direction="row" spacing={2} alignItems="center"><SchoolIcon color="primary" sx={{ fontSize: 40 }} /><Box><Typography variant="h6" fontWeight="bold">For Students</Typography><Typography color="text.secondary">A simple and secure portal to take exams and track progress.</Typography></Box></Stack></Grid>
                <Grid item xs={12} sm={6}><Stack direction="row" spacing={2} alignItems="center"><AdminPanelSettingsIcon color="primary" sx={{ fontSize: 40 }} /><Box><Typography variant="h6" fontWeight="bold">For Admins</Typography><Typography color="text.secondary">Effortlessly manage schools, students, and the entire exam lifecycle.</Typography></Box></Stack></Grid>
                <Grid item xs={12} sm={6}><Stack direction="row" spacing={2} alignItems="center"><AutoStoriesIcon color="primary" sx={{ fontSize: 40 }} /><Box><Typography variant="h6" fontWeight="bold">Grade-Specific Content</Typography><Typography color="text.secondary">A diverse question bank tailored for students from the 6th to 10th grade.</Typography></Box></Stack></Grid>
                <Grid item xs={12} sm={6}><Stack direction="row" spacing={2} alignItems="center"><BarChartIcon color="primary" sx={{ fontSize: 40 }} /><Box><Typography variant="h6" fontWeight="bold">Performance Analytics</Typography><Typography color="text.secondary">Instant results and detailed reports to help students understand their strengths.</Typography></Box></Stack></Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* SECTION 2: The Exam Experience */}
          <Card sx={cardStyle}>
            <CardContent>
              <FactCheckIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>A Fair & Focused Exam Experience</Typography>
              <Typography color="text.secondary">
                We provide a secure and intuitive testing environment designed to ensure fairness and focus. Our platform includes a real-time countdown timer to keep students on track, and robust anti-cheating measures that discourage tab-switching and unauthorized actions. With full support for image-based questions, we deliver a comprehensive assessment process. After submission, students can access detailed results and performance insights once they are released by the administrator.
              </Typography>
            </CardContent>
          </Card>

          {/* SECTION 3: Completed Exams */}
          <Card sx={cardStyle}>
            <CardContent>
              <CheckCircleOutlineIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>Completed Exams</Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
                  <ListItemText primary="Monthly Exams (Sept)" secondary="Results Announced" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
                  <ListItemText primary="SWL 2025" secondary="Results Announced" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* SECTION 4: Our Other Works */}
          <Card sx={cardStyle}>
            <CardContent>
              <MiscellaneousServicesIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>Our Other Works</Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><BookIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Write Your Own Journals" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><EmojiEventsIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Olympiad Exams for Students" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><SchoolIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Materials for Higher Aims" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><WorkIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Internships and Publications" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* SECTION 5: Image Gallery */}
          <Card sx={{ ...cardStyle, overflow: 'hidden' }}>
            <CardContent>
              <Typography variant="h5" fontWeight={600} gutterBottom>Our Platform in Action</Typography>
              <ImageCarousel images={galleryImages} />
            </CardContent>
          </Card>

          {/* SECTION 6: Our Recognitions */}
          <Card sx={{ ...cardStyle, overflow: 'hidden' }}>
            <CardContent>
              <ApartmentIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>Recognitions</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                We are proud to be recognized by leading governmental bodies for our innovation in educational technology.
              </Typography>
              <ImageCarousel images={recognitionImages} />
            </CardContent>
          </Card>

        </Masonry>
      </Box>
    </Box>
  );
}