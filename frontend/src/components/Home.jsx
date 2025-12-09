import React, { useState } from "react";
import Slider from "react-slick"; 
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Grid, Container, Card, CardContent, CardMedia,
  CardActions, Paper, Stack, Dialog, DialogTitle, DialogContent, IconButton,
  Chip, Avatar, List, ListItem, ListItemText, useTheme, useMediaQuery, ListItemIcon,
  Divider
} from "@mui/material";

// Icons
import CampaignIcon from "@mui/icons-material/Campaign";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ScienceIcon from "@mui/icons-material/Science";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import SchoolIcon from "@mui/icons-material/School";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import PublishIcon from "@mui/icons-material/Publish";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel"; 
import StarIcon from "@mui/icons-material/Star";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LightbulbIcon from "@mui/icons-material/Lightbulb"; 

// --- UI COMPONENTS ---
import AnimatedText from "./ui/AnimatedText";
import BookStack from "./ui/BookStack"; 

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// --- DATA ---

const thinkletArticles = [
    { id: 1, title: '2025 Medical Laureates', summary: 'Discoveries regarding regulatory T cells earned the Nobel Prize.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Noble.png', link: 'https://www.nobelprize.org/' },
    { id: 2, title: 'Milk Capital: India', summary: 'India stands as the largest milk producer. Anand is the heart.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/dr_kurien_amul.jpg', link: 'https://en.wikipedia.org/wiki/Operation_Flood' },
    { id: 3, title: 'AI Co-Developer', summary: 'Agentic AI systems are revolutionizing software engineering.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/AiCo.png', link: 'https://openai.com/blog' },
    { id: 4, title: 'Vasuki indicus', summary: 'Discover a colossal serpent that ruled 47 million years ago.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Vasuki_Indicus_Thinklet.jpg', link: 'https://www.nature.com/articles/s41598-024-58377-0' },
    { id: 5, title: 'Quantum Computing', summary: 'The next frontier in computational power and security.', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=500&q=80', link: 'https://science.nasa.gov/mission/quantum-technologies/' },
];

const suggestedBooks = [
  { 
      id: 1, 
      title: 'Wings of Fire', 
      author: 'APJ Abdul Kalam', 
      cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/wingsoffire.jpg',
      moral: "Determination and humility can overcome any obstacle.",
      summary: "An autobiography of A.P.J. Abdul Kalam, former President of India. It narrates his journey from a humble background in Rameswaram to becoming a key player in Indian space research and missile programs. The book is not just about his personal life but also a tribute to the unflagging spirit of the countless unsung heroes of Indian science. It inspires the youth to dream big and work hard to achieve those dreams, emphasizing that resilience is key to success."
  },
  { 
      id: 2, 
      title: 'The Alchemist', 
      author: 'Paulo Coelho', 
      cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=500&q=80',
      moral: "When you want something, all the universe conspires in helping you to achieve it.",
      summary: "This enchanting novel tells the story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure. His quest leads him to riches far different—and far more satisfying—than he ever imagined. Santiago's journey teaches us about the essential wisdom of listening to our hearts, of recognizing opportunity and learning to read the omens strewn along life's path, and, above all, following our dreams."
  },
  { 
      id: 3, 
      title: 'Atomic Habits', 
      author: 'James Clear', 
      cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=500&q=80',
      moral: "Tiny changes, remarkable results.",
      summary: "James Clear reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results. If you're having trouble changing your habits, the problem isn't you. The problem is your system. Bad habits repeat themselves again and again not because you don't want to change, but because you have the wrong system for change. This book gives you a proven system to reach new heights."
  },
];

const publicationStacks = [
    {
        id: 'pre',
        category: 'Baby Steps (Pre-Primary)',
        color: '#FFAB91', 
        books: [
            { title: 'Tiny Steps Math', desc: 'Interactive basics', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/wingsoffire.jpg' },
            { title: 'Alpha Fun', desc: 'Learning alphabets', cover: '' },
            { title: 'World Around Us', desc: 'EVS for kids', cover: '' },
        ]
    },
    {
        id: 'primary',
        category: 'Little Leaps (Primary)',
        color: '#81D4FA', 
        books: [
            { title: 'Science Explorer', desc: 'Curiosity driven', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/serpents_revenge.jpg' },
            { title: 'Math Magic', desc: 'Foundation logic', cover: '' },
            { title: 'Social Life', desc: 'Community basics', cover: '' },
        ]
    },
    {
        id: 'secondary',
        category: 'ROM (Competitive)',
        color: '#CE93D8', 
        books: [
            { title: 'IIT Foundation', desc: 'Physics & Math', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Indias_biggest_coverup.jpg' },
            { title: 'NEET Biology', desc: 'Masterclass', cover: '' },
            { title: 'UPSC Inclusion', desc: 'General Studies', cover: '' },
        ]
    }
];

const pricingPlans = [
    {
        title: "Tier 1: Essential",
        subtitle: "Academic Package",
        // priceDesc: "School Discount: 70-75%",
        color: "#4db6ac", 
        features: ["Printed Book Set (Full Year)", "Basic LMS & Exam Portal", "Digital Worksheets", "Mobile App (Basic)", "Offline Monthly Exams"], 
        missing: ["STEM Activities", "Lab Setup", "Book Fair Setup", "SJIS (Not included)"] 
    },
    {
        title: "Tier 2: Comprehensive",
        subtitle: "Most Opted by Schools",
        // priceDesc: "School Discount: 60-65%",
        color: "#1e88e5", 
        recommended: true,
        features: ["Everything in Tier 1", "Advanced LMS (Analytics)", "Full Exam Portal", "2 Student Workshops", "Digital Question Bank"], 
        missing: ["Lab Setup", "Large Book Fair Events", "SJIS (Not included)"] 
    },
    {
        title: "Tier 3: Premium",
        subtitle: "Complete Transformation",
        // priceDesc: "School Discount: 35-45%",
        color: "#ff9800", 
        features: ["Everything in Tier 2", "Custom-Branded App", "Premium LMS (AI)", "Full Book Fair Setup", "STEM Kits & Lab Support", "Monthly Academic Coordinator", "⭐ SJIS Journal Included"], 
        missing: [] 
    }
];

const schoolServices = [
  { title: "School Lab Setup", icon: <ScienceIcon fontSize="large"/>, desc: "Complete basic to advanced science lab infrastructure setup and consulting.", color: "#e3f2fd" },
  { title: "Library Management", icon: <LocalLibraryIcon fontSize="large"/>, desc: "Curating books and digital cataloging systems for modern school libraries.", color: "#f3e5f5" },
  { title: "Guest Faculty", icon: <SupervisorAccountIcon fontSize="large"/>, desc: "Expert faculty visits twice a month to boost academic performance.", color: "#fff3e0" },
];

const FadeInSection = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: delay }}
    >
      {children}
    </motion.div>
  );
};

export default function Home() {
  const navigate = useNavigate();
  const [openThinklet, setOpenThinklet] = useState(null);
  const [openBook, setOpenBook] = useState(null); // STATE FOR BOOK MODAL

  const carouselSettings = {
    dots: true, infinite: true, speed: 500, slidesToShow: 3, slidesToScroll: 1,
    responsive: [
        { breakpoint: 1024, settings: { slidesToShow: 2 } },
        { breakpoint: 600, settings: { slidesToShow: 1 } }
    ]
  };

  return (
    <Box sx={{ bgcolor: "#ffffff", minHeight: "100vh", overflowX: 'hidden' }}>
      
      {/* 1. HERO SECTION */}
      <Box sx={{ position: "relative", minHeight: "85vh", display: 'flex', alignItems: 'center', background: "radial-gradient(circle at 50% 50%, rgb(242, 246, 252) 0%, rgb(255, 255, 255) 80%)" }}>
        <Container maxWidth="xl">
           <FadeInSection>
              <Box textAlign="center">
                  <Chip label="Admissions Open 2025-26" color="warning" sx={{ mb: 4, fontWeight: 'bold', px: 2 }} />
                  <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                    <AnimatedText 
                        type="rotate"
                        text="Your Partner for" 
                        words={["Secure Exams", "Publications", "School Growth", "Innovation"]} 
                        color="#1976d2"
                    />
                  </Box>
                  <Typography variant="h5" sx={{ color: '#455a64', mb: 6, lineHeight: 1.8, fontWeight: 400, maxWidth: 800, mx: 'auto' }}>
                      A comprehensive ecosystem for Schools, Aspirants, and Educators. From advanced lab setups to secure competitive exams.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
                    <Button variant="contained" size="large" sx={{ px: 6, py: 1.8, fontSize: '1.2rem', borderRadius: 10 }} onClick={() => navigate('/register')}>Get Started</Button>
                    <Button variant="outlined" size="large" sx={{ px: 6, py: 1.8, fontSize: '1.2rem', borderRadius: 10, borderWidth: 2 }} onClick={() => document.getElementById('plans').scrollIntoView({behavior:'smooth'})}>View Plans</Button>
                  </Stack>
              </Box>
           </FadeInSection>
        </Container>
      </Box>

      {/* 2. THINKLETS */}
      <Box sx={{ py: 10, bgcolor: '#f5f7fa' }}>
        <Container maxWidth="xl">
            <FadeInSection>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 4, pl: 2, borderLeft: '6px solid #1a237e' }}>Thinklets & Contemporary News</Typography>
                <Box sx={{ px: 2 }}>
                    <Slider {...carouselSettings}>
                        {thinkletArticles.map((article) => (
                            <Box key={article.id} sx={{ p: 2 }}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, boxShadow: 3 }}>
                                    <CardMedia component="img" height="180" image={article.image} alt={article.title} />
                                    <CardContent sx={{ flexGrow: 1 }}>
                                        <Typography variant="h6" fontWeight={700} gutterBottom>{article.title}</Typography>
                                        <Typography variant="body2" color="text.secondary" noWrap>{article.summary}</Typography>
                                    </CardContent>
                                    <CardActions sx={{ p: 2, pt: 0 }}>
                                        <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => window.open(article.link, '_blank')}>Read Full Story</Button>
                                    </CardActions>
                                </Card>
                            </Box>
                        ))}
                    </Slider>
                </Box>
            </FadeInSection>
        </Container>
      </Box>

      {/* 3. BOOKS WE SUGGEST */}
      <Box sx={{ py: 10, bgcolor: '#fff' }}>
        <Container maxWidth="xl">
            <FadeInSection>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                    <Box>
                        <Typography variant="overline" color="secondary" fontWeight={700}>Curated by Experts</Typography>
                        <Typography variant="h4" fontWeight={800}>Books We Suggest</Typography>
                    </Box>
                </Stack>

                <Grid container spacing={4}>
                    {suggestedBooks.map((book) => (
                        <Grid item xs={12} sm={6} md={4} key={book.id}>
                            <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3, transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
                                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box component="img" src={book.cover} sx={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 1 }} />
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>{book.title}</Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>by {book.author}</Typography>
                                        {/* CLICK TO OPEN DIALOG */}
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            startIcon={<MenuBookIcon />}
                                            onClick={() => setOpenBook(book)}
                                            sx={{ mt: 1, borderRadius: 20 }}
                                        >
                                            Read Summary
                                        </Button>
                                    </Box>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </FadeInSection>
        </Container>
      </Box>

      {/* 4. OUR PUBLICATIONS */}
      <Box id="publications" sx={{ py: 12, bgcolor: '#fff', borderTop: '1px solid #eee' }}>
        <Container maxWidth="xl">
            <FadeInSection>
                <Box textAlign="center" mb={10}>
                    <AutoStoriesIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h3" fontWeight={800} gutterBottom>Our Publications</Typography>
                    <Typography variant="h6" color="text.secondary">From Pre-Primary to Competitive Exams. High-quality content aligned with NEP.</Typography>
                </Box>

                <Grid container spacing={8} justifyContent="center" alignItems="flex-end">
                    {publicationStacks.map((stack, index) => (
                        <Grid item xs={12} md={4} key={stack.id}>
                            <BookStack category={stack.category} books={stack.books} color={stack.color} />
                        </Grid>
                    ))}
                </Grid>
            </FadeInSection>
        </Container>
      </Box>

      {/* 5. PRICING */}
      <Box id="plans" sx={{ py: 12, bgcolor: "#f4f6f8" }}>
          <Container maxWidth="xl">
              <FadeInSection>
                <Box textAlign="center" mb={8}>
                    <Typography variant="overline" fontWeight={800} letterSpacing={3} color="secondary">Partnership Models</Typography>
                    <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>Book Your Comfort</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Flexible academic plans designed to suit every school's budget and vision.</Typography>
                </Box>
                <Grid container spacing={4} alignItems="flex-start" justifyContent="center">
                    {pricingPlans.map((plan, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <FadeInSection delay={index * 0.2}>
                                <Paper elevation={plan.recommended ? 12 : 2} sx={{ p: 0, borderRadius: 4, overflow: 'hidden', position: 'relative', transform: plan.recommended ? 'scale(1.05)' : 'scale(1)', border: plan.recommended ? `2px solid ${plan.color}` : 'none', height: '100%' }}>
                                    {plan.recommended && <Box sx={{ bgcolor: plan.color, color: 'white', textAlign: 'center', py: 1 }}><Typography variant="caption" fontWeight={700} letterSpacing={1} display="flex" justifyContent="center" alignItems="center" gap={1}><StarIcon fontSize="small" /> MOST POPULAR</Typography></Box>}
                                    <Box sx={{ p: 4, bgcolor: plan.recommended ? 'rgba(0,0,0,0.02)' : 'white' }}>
                                        <Typography variant="h5" fontWeight={800} sx={{ color: plan.color }}>{plan.title}</Typography>
                                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>{plan.subtitle}</Typography>
                                        <Chip label={plan.priceDesc} size="small" sx={{ mt: 1, bgcolor: plan.color, color: 'white', fontWeight: 'bold' }} />
                                        <Divider sx={{ my: 3 }} />
                                        <List dense>
                                            {plan.features.map((feat, i) => (
                                                <ListItem key={i} alignItems="flex-start" disableGutters><ListItemIcon sx={{ minWidth: 32 }}><CheckCircleIcon sx={{ color: plan.color, fontSize: 20 }} /></ListItemIcon><ListItemText primary={feat} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} /></ListItem>
                                            ))}
                                            {plan.missing.map((miss, i) => (
                                                <ListItem key={i} alignItems="flex-start" disableGutters><ListItemIcon sx={{ minWidth: 32 }}><CancelIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></ListItemIcon><ListItemText primary={miss} primaryTypographyProps={{ variant: 'body2', color: 'text.disabled' }} /></ListItem>
                                            ))}
                                        </List>
                                        <Button variant={plan.recommended ? "contained" : "outlined"} fullWidth size="large" sx={{ mt: 4, borderRadius: 3, bgcolor: plan.recommended ? plan.color : 'transparent', color: plan.recommended ? 'white' : plan.color, borderColor: plan.color, '&:hover': { bgcolor: plan.color, color: 'white' } }} onClick={() => navigate('/contact')}>Select Plan</Button>
                                    </Box>
                                </Paper>
                            </FadeInSection>
                        </Grid>
                    ))}
                </Grid>
              </FadeInSection>
          </Container>
      </Box>

      {/* 6. ECOSYSTEM */}
      <Box id="ecosystem" sx={{ py: 12, bgcolor: "#fff" }}>
        <Container maxWidth="xl">
          <FadeInSection>
            <Box textAlign="center" mb={8}>
              <SchoolIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h3" fontWeight={800}>School Support Ecosystem</Typography>
            </Box>
          </FadeInSection>
          <Grid container spacing={4} justifyContent="center">
            {schoolServices.map((service, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <FadeInSection delay={index * 0.1}>
                  <Paper elevation={2} sx={{ p: 4, height: '100%', borderRadius: 4, bgcolor: service.color, textAlign: 'center', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
                    <Box sx={{ color: 'text.primary', mb: 3 }}>{service.icon}</Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>{service.title}</Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.6}>{service.desc}</Typography>
                  </Paper>
                </FadeInSection>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 7. LSRW */}
      <Box sx={{ py: 10, bgcolor: "#e8f5e9" }}>
        <Container maxWidth="lg">
            <FadeInSection>
                <Grid container spacing={6} alignItems="center">
                    <Grid item xs={12} md={6}>
                         <RecordVoiceOverIcon sx={{ fontSize: 80, color: '#2e7d32', mb: 2 }} />
                         <Typography variant="h3" fontWeight={800} gutterBottom color="success.dark">English LSRW </Typography>
                         <Typography variant="h6" color="text.secondary" gutterBottom>Listening • Speaking • Reading • Writing</Typography>
                         <Typography variant="body1" paragraph>A dedicated program to enhance communication skills by expert faculty.</Typography>
                         <Button variant="outlined" color="success" size="large">Request Demo</Button>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper sx={{ p: 6, bgcolor: '#fff', borderRadius: 4, textAlign: 'center', border: '2px dashed #a5d6a7' }}><Typography variant="h2" fontWeight={900} sx={{ color: '#81c784' }}>LSRW</Typography><Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Language Lab Certified</Typography></Paper>
                    </Grid>
                </Grid>
            </FadeInSection>
        </Container>
      </Box>

      {/* 8. AMBASSADOR */}
      <Box id="ambassador" sx={{ py: 12, bgcolor: "#ede7f6", textAlign: 'center' }}>
        <Container maxWidth="md">
            <FadeInSection>
                <Avatar sx={{ width: 90, height: 90, bgcolor: 'secondary.main', mx: 'auto', mb: 3 }}><CampaignIcon fontSize="large" /></Avatar>
                <Typography variant="h3" fontWeight={800} gutterBottom color="secondary.main">Student Ambassador Program</Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontStyle: 'italic' }}>"To teach is to learn twice."</Typography>
                <Button variant="contained" color="secondary" size="large" sx={{ borderRadius: 5, px: 4 }}>Apply Now</Button>
            </FadeInSection>
        </Container>
      </Box>

      {/* 9. PAPERS */}
      <Box sx={{ py: 10, bgcolor: "#263238", color: 'white' }}>
        <Container maxWidth="lg">
            <FadeInSection>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
                    <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={2}><PublishIcon sx={{ fontSize: 40, color: '#4fc3f7' }} /><Typography variant="h4" fontWeight={800}>SJIS: Call for Papers</Typography></Stack>
                        <Typography variant="h6" gutterBottom sx={{ color: '#b3e5fc' }}>Saradaa Journal of Interdiciplinary Studies</Typography>
                        <Typography variant="body1" paragraph sx={{ opacity: 0.8 }}>We invite researchers, academicians, and students to submit their original work.</Typography>
                    </Box>
                    <Box>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="info" size="large" href="mailto:Saradapublications18@gmail.com">Submit Manuscript</Button>
                            <Button variant="outlined" color="info" size="large" onClick={() => window.open('https://journal.e2eindia.org/', '_blank')}>Know More</Button>
                        </Stack>
                    </Box>
                </Stack>
            </FadeInSection>
        </Container>
      </Box>

      {/* --- BOOK DETAILS DIALOG (Global Modal) --- */}
      <Dialog 
        open={!!openBook} 
        onClose={() => setOpenBook(null)} 
        maxWidth="md" 
        fullWidth
      >
        {openBook && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>{openBook.title}</Typography>
              <IconButton onClick={() => setOpenBook(null)}><CloseIcon/></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={4}>
                  <Grid item xs={12} sm={4}>
                     <Box component="img" src={openBook.cover} sx={{ width: '100%', borderRadius: 2, boxShadow: 3 }} />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                     <Typography variant="h6" color="primary" gutterBottom>About the Book</Typography>
                     <Typography paragraph>{openBook.summary}</Typography>
                     
                     <Box sx={{ mt: 3, p: 2, bgcolor: '#fff8e1', borderRadius: 2, borderLeft: '4px solid #ffb300' }}>
                        <Stack direction="row" gap={1} alignItems="center">
                            <LightbulbIcon sx={{ color: '#ffb300' }} />
                            <Typography variant="subtitle1" fontWeight={700}>Moral of the Story</Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1 }}>{openBook.moral}</Typography>
                     </Box>
                  </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

    </Box>
  );
}