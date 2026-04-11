import React, { useState } from "react";
import Slider from "react-slick";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Grid, Container, Card, CardContent, CardMedia,
  CardActions, Paper, Stack, Dialog, DialogTitle, DialogContent, IconButton,
  Avatar, List, ListItem, ListItemText, ListItemIcon, Fab
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
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import MicIcon from "@mui/icons-material/Mic";
import PublicIcon from "@mui/icons-material/Public";

// --- UI COMPONENTS ---
import AnimatedText from "./ui/AnimatedText";
import BookStack from "./ui/BookStack";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import Particles from "./ui/Particles";
import Squares from "./ui/Squares";
import Waves from "./ui/Waves";
import DomeGallery from "./ui/DomeGallery";
import FloatingText from "./ui/FloatingText";
import RisingStars from "./ui/RisingStars";
import FloatingPapers from "./ui/FloatingPapers";

/* ─────────────────────── SVG Divider ─────────────────────── */
const StraightDivider = ({ color = "#f8fafc", flip = false }) => (
  <Box sx={{ height: 40, bgcolor: color, mt: flip ? 0 : '-1px', mb: flip ? '-1px' : 0 }} />
);

/* ─────────────────────── Section Heading ─────────────────────── */
const SectionHeading = ({ overline, title, subtitle, align = 'center', light = false }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
    <Box textAlign={align} mb={8} position="relative" zIndex={1}>
      {overline && (
        <Typography variant="overline" fontWeight={800} letterSpacing={4} sx={{
          display: 'inline-block', px: 3, py: 0.5, borderRadius: 20,
          bgcolor: light ? 'rgba(255,255,255,0.1)' : '#e2e8f0', 
          color: light ? '#cbd5e1' : '#475569', mb: 2,
        }}>{overline}</Typography>
      )}
      <Typography variant="h3" fontWeight={800} sx={{ color: light ? '#fff' : '#0f172a', mb: 2 }}>{title}</Typography>
      {subtitle && <Typography variant="h6" sx={{ color: light ? '#94a3b8' : '#64748b', maxWidth: align === 'center' ? 700 : '100%', mx: align === 'center' ? 'auto' : 0, fontWeight: 400, lineHeight: 1.6 }}>{subtitle}</Typography>}
    </Box>
  </motion.div>
);

// --- DATA ---
const thinkletArticles = [
  { id: 1, title: '2025 Medical Laureates', summary: 'Discoveries regarding regulatory T cells earned the Nobel Prize.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Noble.png', link: 'https://www.nobelprize.org/' },
  { id: 3, title: 'AI Co-Developer', summary: 'Agentic AI systems are revolutionizing software engineering.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/AiCo.png', link: 'https://openai.com/blog' },
  { id: 4, title: 'Vasuki indicus', summary: 'Discover a colossal serpent that ruled 47 million years ago.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Vasuki-Indicus.jpg', link: 'https://www.nature.com/articles/s41598-024-58377-0' },
  { id: 5, title: 'Himalayan Discovery', summary: 'Scientists identify a new catfish species, Exostoma senticosum, in China.', image: 'https://images.unsplash.com/photo-1544552866-d3ed42536cfd?auto=format&fit=crop&q=80&w=800', link: 'https://www.ndtv.com/science/new-catfish-species-discovered-in-southwest-chinas-himalayan-region-9812357' },
  { id: 6, title: 'Semiconductor Success', summary: 'A Student-Professor duo turns a PhD thesis into a ₹15 Cr semiconductor venture.', image: 'https://images.unsplash.com/photo-1581092795360-7f6f5d6b3c3b?auto=format&fit=crop&q=80&w=800', link: 'https://startuppedia.in/smbs/meet-the-student-professor-duo-who-turned-a-phd-thesis-into-a-15-cr-make-in-india-semiconductor-venture-that-supplies-to-iits-govt-labs-10901223' },
  { id: 7, title: 'Nature: Science 2025', summary: 'Key scientific developments and research highlights shaping the year.', image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800', link: 'https://www.nature.com/articles/d41586-025-03711-3' },
  { id: 8, title: 'Singapore: The City-State', summary: 'Understanding the unique status of the only city in Asia that is also a country.', image: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&q=80&w=800', link: 'https://www.indiatoday.in/amp/education-today/gk-current-affairs/story/which-is-the-only-city-in-aisa-that-is-also-a-country-2813262-2025-11-04' }
];

const suggestedBooks = [
  { id: 1, title: 'Wings of Fire', author: 'APJ Abdul Kalam', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/wingsoffire.jpg', moral: "Determination and humility can overcome any obstacle.", summary: "An autobiography of A.P.J. Abdul Kalam, former President of India. It narrates his journey from a humble background in Rameswaram to becoming a key player in Indian space research." },
  { id: 2, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80', moral: "Understanding our past is the only way to shape a better future.", summary: "This ground-breaking narrative explores the history of our species, Homo sapiens..." },
  { id: 3, title: 'The Palace of Illusions', author: 'Chitra Banerjee Divakaruni', cover: 'https://images.unsplash.com/photo-1629196914375-f7e48f477b6d?auto=format&fit=crop&w=500&q=80', moral: "Destiny is powerful, but how we react to it defines our character.", summary: "A reimagining of the world-famous Indian epic, the Mahabharata, told from the perspective of Panchaali (Draupadi)..." },
  { id: 4, title: 'The Hobbit', author: 'J.R.R. Tolkien', cover: 'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?auto=format&fit=crop&w=500&q=80', moral: "Even the smallest person can change the course of the future.", summary: "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling further..." }
];

const publicationStacks = [
  { id: 'pre', category: 'Baby Steps (Pre-Primary)', color: '#FFAB91', books: [{ title: 'English Fun', desc: 'Alphabet basics', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/BS-Eng.png' }, { title: 'Number Joy', desc: 'Counting & logic', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/BS_2.png' }, { title: 'World Around Us', desc: 'EVS & Activities', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/BS-3.png' }] },
  { id: 'primary', category: 'Little Leaps (Primary)', color: '#81D4FA', books: [{ title: 'Math Magic', desc: 'Foundation logic', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/LL-Math.png' }, { title: 'Science Explorer', desc: 'Curiosity driven', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/LL-Science.png' }, { title: 'Social Life', desc: 'Community basics', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/LL_Social.png' }, { title: 'General Knowledge', desc: 'World trivia', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/LL-GK.png' }] },
  { id: 'highschool', category: 'High School (6-10)', color: '#A5D6A7', books: [{ title: 'English Literature', desc: 'Grammar & Prose', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/English.png' }, { title: 'Mathematics', desc: 'Advanced concepts', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/Maths.png' }, { title: 'General Science', desc: 'Physics, Chem, Bio', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/Science.png' }] },
  { id: 'rom', category: 'ROM (Competitive)', color: '#CE93D8', books: [{ title: 'Competitive Math', desc: 'Problem solving', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/ROM-Maths.png' }, { title: 'Physics Concepts', desc: 'IIT Foundation', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/ROM-Physics.png' }, { title: 'Biology Master', desc: 'NEET Foundation', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/ROM-Bio.png' }] },
  { id: 'upsc', category: 'UPSC Preparation', color: '#FFCC80', books: [{ title: 'Geography', desc: 'World & Indian', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/UPSC-Geo-Cover.png' }, { title: 'History', desc: 'Ancient to Modern', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/UPSC-History-Cover.png' }, { title: 'Economics', desc: 'Indian Economy', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/UPSC-Economics-Cover.png' }] },
  { id: 'our books', category: 'Our Books', color: '#90CAF9', books: [{ title: 'Life of Student', desc: 'A Tale of 4our Students', cover: 'https://sl-exams-images.s3.ap-south-2.amazonaws.com/Life+of+Student.png' }] }
];

const pricingPlans = [
  { title: "Tier 1: Essential", subtitle: "Academic Package", color: "#64748b", features: ["Printed Book Set (Full Year)", "Basic LMS & Exam Portal", "Digital Worksheets", "Mobile App (Basic)", "Offline Monthly Exams"], missing: ["STEM Activities", "Lab Setup", "Book Fair Setup", "SJIS (Not included)"] },
  { title: "Tier 2: Comprehensive", subtitle: "Most Opted by Schools", color: "#0f172a", recommended: true, features: ["Everything in Tier 1", "Advanced LMS (Analytics)", "Full Exam Portal", "2 Student Workshops", "Digital Question Bank"], missing: ["Lab Setup", "Large Book Fair Events", "SJIS (Not included)"] },
  { title: "Tier 3: Premium", subtitle: "Complete Transformation", color: "#334155", features: ["Everything in Tier 2", "Custom-Branded App", "Premium LMS (AI)", "Full Book Fair Setup", "STEM Kits & Lab Support", "Monthly Academic Coordinator", "⭐ SJIS Journal Included"], missing: [] }
];

const schoolServices = [
  { title: "School Lab Setup", icon: <ScienceIcon sx={{ fontSize: 48 }} />, desc: "Complete basic to advanced science lab infrastructure setup and consulting.", color: '#0f172a' },
  { title: "Library Management", icon: <LocalLibraryIcon sx={{ fontSize: 48 }} />, desc: "Curating books and digital cataloging systems for modern school libraries.", color: '#334155' },
  { title: "Guest Faculty", icon: <SupervisorAccountIcon sx={{ fontSize: 48 }} />, desc: "Expert faculty visits twice a month to boost academic performance.", color: '#475569' },
];

const ourWorksPhotos = [
  { id: 1, image: 'https://e2eindia.org/images/gallery/_6.jpg', title: '', desc: '' },
  { id: 2, image: 'https://e2eindia.org/images/gallery/new-gal-1.jpg', title: '', desc: '' },
  { id: 3, image: 'https://yt3.ggpht.com/BCuzBBeyi0YSo_g_VuDTc1MSzEXZzstSJNHsBk2O4h_T6nY3JBm5CGDNRKljVoZGa6LvAChmmu1A9g=s628-c-fcrop64=1,00004133ffffbecc-rw-nd-v1', title: '', desc: '' },
  { id: 4, image: 'https://e2eindia.org/images/gallery/new-gal-3.jpg', title: '', desc: '' },
  { id: 5, image: 'https://e2eindia.org/images/gallery/_9.jpg', title: '', desc: '' },
  { id: 6, image: 'https://yt3.ggpht.com/QDt4RdMrVmJBcMTkrpjbrmhOSHryXhOZP9LU1sw3tBEhwNE0RcSqNCwP3wo7iGYQ2JKmYZFAC7PZkQ=s640-c-fcrop64=1,20000000dfffffff-rw-nd-v1', title: '', desc: '' },
  { id: 7, image: 'https://e2eindia.org/images/gallery/new-gal-4.jpg', title: '', desc: '' },
  { id: 8, image: 'https://e2eindia.org/images/gallery/_11.jpg', title: '', desc: '' },
  { id: 9, image: 'https://yt3.ggpht.com/EMy1VhGR9qBsiJOa7D2Nl6jTaXZivYuxuDgPyE8BzLZVQNRQUW6UUnFa7_A5lCSyL7vJztevnt4wvg=s640-c-fcrop64=1,35e60000ca19ffff-rw-nd-v1', title: '', desc: '' },  
];

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [openBook, setOpenBook] = useState(null);

  const carouselSettings = {
    dots: true, infinite: true, speed: 500, slidesToShow: 3, slidesToScroll: 1,
    autoplay: true, autoplaySpeed: 4000, pauseOnHover: true,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } }
    ]
  };

  const directorMail = "directorops@e2eindia.org";

  return (
    <Box sx={{ bgcolor: "#ffffff", minHeight: "100vh", overflowX: 'hidden' }}>
      
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Anton&family=Cinzel:wght@600;800&family=Orbitron:wght@600;900&family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Space+Grotesk:wght@400;700&display=swap');
        `}
      </style>

      {/* Floating Action Button */}
      <Fab 
        variant="extended"
        onClick={() => navigate('/public')}
        sx={{
          position: 'fixed',
          bottom: 30, right: 30, zIndex: 1000,
          bgcolor: '#0f172a', color: '#fff', fontWeight: 700,
          boxShadow: '0 8px 32px rgba(15,23,42,0.3)',
          '&:hover': { bgcolor: '#1e293b', transform: 'translateY(-2px)' }
        }}
      >
        <PublicIcon sx={{ mr: 1 }} />
        Visit Public Portal
      </Fab>

      {/* ═══════════════════ 1. HERO SECTION ═══════════════════ */}
      <Box id="hero" sx={{
        position: "relative", minHeight: "100vh", display: 'flex', alignItems: 'center',
        bgcolor: '#ffffff', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity: 0.4 }}>
          <Squares direction="Right" speed={0.5} borderColor="#f1f5f9" squareSize={60} hoverFillColor="#f8fafc" />
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                <AnimatedText type="rotate" text="Your Partner for" words={["Secure Exams", "Publications", "School Growth", "Innovation"]} color="#1976d2" />
              </Box>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }}>
              <Typography variant="h5" sx={{ color: '#475569', mb: 6, lineHeight: 1.8, fontWeight: 400, maxWidth: 750, mx: 'auto', fontSize: { xs: '1.1rem', md: '1.35rem' } }}>
                A comprehensive ecosystem for Schools, Aspirants, and Educators.
                From advanced lab setups to secure competitive exams.
              </Typography>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} justifyContent="center">
                <Button variant="contained" size="large" onClick={() => navigate('/login')} sx={{ px: 5, py: 1.8, fontSize: '1.1rem', borderRadius: 1, bgcolor: '#0f172a', color: '#fff', fontWeight: 700, letterSpacing: 0.5, transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-3px)', bgcolor: '#1e293b', boxShadow: '0 12px 40px rgba(15,23,42,0.15)' } }}>
                  Login / Dashboard
                </Button>
                <Button variant="outlined" size="large" onClick={() => document.getElementById('plans').scrollIntoView({ behavior: 'smooth' })} sx={{ px: 5, py: 1.8, fontSize: '1.1rem', borderRadius: 1, borderWidth: 2, borderColor: '#cbd5e1', color: '#475569', fontWeight: 700, transition: 'all 0.3s ease', '&:hover': { borderColor: '#0f172a', color: '#fff', bgcolor: '#0f172a', transform: 'translateY(-3px)' } }}>
                  View Plans
                </Button>
              </Stack>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* ═══════════════════ 2. KNOWLEDGE HUB (THINKLETS) ═══════════════════ */}
      <StraightDivider color="#ffffff" />
      <Box id="thinklets" sx={{ py: 12, bgcolor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.6 }}>
          <Particles particleCount={40} particleColor="#cbd5e1" lineColor="#e2e8f0" speed={0.3} linkDistance={180} />
        </Box>
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <SectionHeading overline="KNOWLEDGE HUB" title="Thinklets & Suggested Reads" subtitle="Curated articles, breakthrough discoveries, and handpicked books." />
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Slider {...carouselSettings}>
                {thinkletArticles.map((article) => (
                  <Box key={article.id} sx={{ p: 2, display: 'flex !important' }}>
                    <Card sx={{ display: 'flex', flexDirection: 'column', width: '100%', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                      <CardMedia component="img" height="200" image={article.image} alt={article.title} />
                      <CardContent sx={{ flexGrow: 1, p: 3 }}><Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>{article.title}</Typography><Typography variant="body2" sx={{ color: '#64748b' }}>{article.summary}</Typography></CardContent>
                      <CardActions sx={{ p: 3, pt: 0 }}>
                        <Button size="small" onClick={() => window.open(article.link, '_blank')}>Read Article</Button>
                      </CardActions>
                    </Card>
                  </Box>
                ))}
            </Slider>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 3. OUR PUBLICATIONS ═══════════════════ */}
      <StraightDivider color="#f8fafc" />
      <Box id="publications" sx={{ py: 12, bgcolor: '#f8fafc', position: 'relative' }}>
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <SectionHeading overline="NEP ALIGNED" title="Our Publications" subtitle="From Pre-Primary to Competitive Exams. High-quality content aligned with NEP." />
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Grid container spacing={8} justifyContent="center" alignItems="flex-end">
              {publicationStacks.map((stack) => (
                <Grid item xs={12} md={4} key={stack.id}>
                  <BookStack category={stack.category} books={stack.books} color={stack.color} />
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 4. FULL WIDTH SECTION: SL-RADIO ═══════════════════ */}
      <Box id="radio" sx={{ position: 'relative', py: 14, overflow: 'hidden', bgcolor: '#0B1121' }}>
        <Waves lineColor="rgba(56, 189, 248, 0.7)" speed={0.025} />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
             <Avatar sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', width: 90, height: 90, mx: 'auto', mb: 3 }}><MicIcon sx={{ fontSize: 50 }} /></Avatar>
             <Typography variant="h2" sx={{ fontFamily: '"Orbitron", sans-serif', color: '#fff', fontWeight: 900, letterSpacing: 2, mb: 3, textShadow: '0 0 20px rgba(56, 189, 248, 0.5)' }}>SL-RADIO</Typography>
             <Typography variant="h6" sx={{ fontFamily: '"Space Grotesk", sans-serif', color: '#bae6fd', fontWeight: 300, mb: 5, lineHeight: 1.8 }}>Tune in to frequency of innovation. Have a personalised School radio for your school.</Typography>
             <Button variant="outlined" size="large" onClick={() => window.open(`https://youtube.com/@SaradaPublications-v1l`, '_blank')} sx={{ borderColor: '#38bdf8', color: '#38bdf8', borderWidth: 2, borderRadius: 50, px: 6, '&:hover': { bgcolor: '#38bdf8', color: '#0B1121' } }}>Listen Live</Button>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 5. FULL WIDTH SECTION: ENGLISH LSRW ═══════════════════ */}
      <Box id="lsrw" sx={{ py: 16, bgcolor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        <FloatingText color="rgba(15, 23, 42, 0.12)" speed={0.4} />
        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Typography variant="overline" sx={{ fontFamily: '"Cinzel", serif', fontWeight: 800, color: '#94a3b8', letterSpacing: 3, fontSize: '1rem' }}>Mastering Language</Typography>
            <Typography variant="h2" sx={{ fontFamily: '"Cinzel", serif', fontWeight: 600, color: '#0f172a', mt: 1, mb: 4 }}>English LSRW</Typography>
            <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: '#475569', mb: 6, lineHeight: 1.8 }}>Listening. Speaking. Reading. Writing. <br/>A dedicated program curated by expert linguists to foster elegance, fluency, and sheer command over the English language in students.</Typography>
            <Button variant="text" size="large" onClick={() => window.location.href = `mailto:${directorMail}?subject=Inquiry: English LSRW Program`} sx={{ fontFamily: '"Cinzel", serif', color: '#0f172a', borderBottom: '2px solid #0f172a', borderRadius: 0, px: 2 }}>Explore Curriculum</Button>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 6. FULL WIDTH SECTION: AMBASSADOR ═══════════════════ */}
      <Box id="ambassador" sx={{ py: 16, bgcolor: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
        <RisingStars color="rgba(239, 68, 68, 0.15)" count={30} speed={0.8} />
        <Typography sx={{ position: 'absolute', top: -30, right: -50, fontSize: '20rem', fontWeight: 900, color: 'rgba(203, 213, 225, 0.2)', fontFamily: '"Anton", sans-serif', lineHeight: 1, pointerEvents: 'none' }}>LEAD</Typography>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <Typography variant="h1" sx={{ fontFamily: '"Anton", sans-serif', color: '#0f172a', letterSpacing: 2, mb: 2 }}>STUDENT AMBASSADOR</Typography>
            <Typography variant="h5" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', mb: 3 }}>Lead The Change. Voice The Future.</Typography>
            <Typography variant="h6" sx={{ color: '#475569', mb: 5, maxWidth: 600, mx: 'auto' }}>Step up to represent, organize, and inspire. Our ambassador program shapes the leaders of tomorrow through action today.</Typography>
            <Button variant="contained" size="large" onClick={() => window.location.href = `mailto:${directorMail}?subject=Application: Student Ambassador`} sx={{ bgcolor: '#ef4444', color: '#fff', borderRadius: 0, fontWeight: 900, fontSize: '1.2rem', fontFamily: '"Space Grotesk", sans-serif', px: 6, py: 2, '&:hover': { bgcolor: '#dc2626' } }}>Apply To Lead</Button>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 7. FULL WIDTH SECTION: SJIS ═══════════════════ */}
      <Box id="sjis" sx={{ py: 16, bgcolor: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        <FloatingPapers color="rgba(15, 23, 42, 0.12)" count={18} speed={0.3} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={5}>
                <Box sx={{ p: 4, bgcolor: '#f1f5f9', borderLeft: '4px solid #0f172a' }}>
                  <Typography variant="h3" sx={{ fontFamily: '"Playfair Display", serif', fontWeight: 800, color: '#0f172a', mb: 2 }}>SJIS.</Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: '#64748b' }}>Call for Papers & Research</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={7}>
                <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", serif', color: '#334155', mb: 4, lineHeight: 1.8 }}>The Saradaa Journal of Interdisciplinary Studies invites rigorous academic contributions. Submit your original research to shape tomorrow's dialogue today.</Typography>
                <Stack direction="row" spacing={3}>
                  <Button variant="contained" onClick={() => window.location.href = `mailto:${directorMail}?subject=SJIS: Research Paper Submission`} sx={{ bgcolor: '#0f172a', borderRadius: 1, px: 4, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}>Submit</Button>
                  <Button variant="text" onClick={() => window.open('https://journal.e2eindia.org/', '_blank')} sx={{ color: '#475569', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}>Read Journal &rarr;</Button>
                </Stack>
              </Grid>
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 8. ECOSYSTEM & LMS ═══════════════════ */}
      <StraightDivider color="#f8fafc" />
      <Box id="services" sx={{ py: 12, bgcolor: '#f8fafc', position: 'relative' }}>
        <Container maxWidth="lg">
          <SectionHeading overline="WHAT WE DO" title="School Ecosystem Setup" />
          <Grid container spacing={4}>
            {schoolServices.map((service, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Paper elevation={0} sx={{ p: 5, height: '100%', borderRadius: 3, bgcolor: '#fff', border: '1px solid #e2e8f0' }}>
                  <Box sx={{ color: service.color, mb: 3 }}>{service.icon}</Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a', mb: 1 }}>{service.title}</Typography>
                  <Typography variant="body2" sx={{ color: '#475569' }}>{service.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════════════ 9. PLANS ═══════════════════ */}
      <Box id="plans" sx={{ py: 12, bgcolor: '#ffffff' }}>
        <Container maxWidth="lg">
          <SectionHeading overline="PARTNERSHIP MODELS" title="Book Your Comfort" subtitle="Flexible academic plans designed to suit every school's budget and vision." />
          <Grid container spacing={4} alignItems="stretch" justifyContent="center">
            {pricingPlans.map((plan, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.15 }} style={{ height: '100%' }}>
                  <Paper elevation={0} sx={{ p: 0, borderRadius: 3, overflow: 'hidden', position: 'relative', bgcolor: '#fff', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: plan.recommended ? plan.color : '#e2e8f0', boxShadow: plan.recommended ? `0 12px 30px rgba(15,23,42,0.1)` : '0 4px 12px rgba(0,0,0,0.03)', transition: 'all 0.4s ease', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' } }}>
                    <Box sx={{ bgcolor: plan.recommended ? plan.color : '#f1f5f9', color: plan.recommended ? 'white' : '#0f172a', textAlign: 'center', py: 4, px: 3, position: 'relative' }}>
                      {plan.recommended && (
                        <Box sx={{ position: 'absolute', top: 12, right: -30, bgcolor: '#fff', color: plan.color, px: 4, py: 0.5, fontWeight: 800, fontSize: '0.7rem', transform: 'rotate(45deg)', letterSpacing: 1 }}>POPULAR</Box>
                      )}
                      <Typography variant="h5" fontWeight={800}>{plan.title}</Typography>
                    </Box>
                    <Box sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <List dense sx={{ flex: 1 }}>
                        {plan.features.map((feat, i) => (
                          <ListItem key={i} disableGutters sx={{ py: 0.8 }}><ListItemIcon sx={{ minWidth: 32 }}><CheckCircleIcon sx={{ color: plan.recommended ? plan.color : '#64748b', fontSize: 20 }} /></ListItemIcon><ListItemText primary={feat} primaryTypographyProps={{ variant: 'body2', fontWeight: 500, color: '#334155' }} /></ListItem>
                        ))}
                      </List>
                      <Button fullWidth variant={plan.recommended ? 'contained' : 'outlined'} onClick={() => window.location.href = `mailto:${directorMail}?subject=Inquiry: Pricing Plan ${plan.title}`} sx={{ mt: 3, borderRadius: 2, py: 1.5, bgcolor: plan.recommended ? plan.color : 'transparent', color: plan.recommended ? '#fff' : plan.color, borderColor: plan.color }}>
                        Select Plan
                      </Button>
                    </Box>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════════════ 10. OUR WORKS (Dome Gallery) ═══════════════════ */}
      <StraightDivider color="#f8fafc" />
      <Box id="gallery" sx={{ py: 14, bgcolor: '#f8fafc', overflow: 'hidden' }}>
        <Container maxWidth="xl">
          <SectionHeading overline="GALLERY" title="Our Works in Action" subtitle="Glimpses into our school setups, labs, events, and the community we've built." />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <DomeGallery data={ourWorksPhotos} />
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ BOOK DETAILS DIALOG ═══════════════════ */}
      <Dialog open={!!openBook} onClose={() => setOpenBook(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
        {openBook && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#0f172a', color: '#fff' }}>
              <Typography variant="h6" fontWeight={700}>{openBook.title}</Typography>
              <IconButton onClick={() => setOpenBook(null)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={4}>
                  <Box component="img" src={openBook.cover} sx={{ width: '100%', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 700, mb: 2 }}>About the Book</Typography>
                  <Typography paragraph sx={{ lineHeight: 1.8, color: '#475569' }}>{openBook.summary}</Typography>
                  <Box sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: '#f8fafc', borderLeft: '4px solid #0f172a' }}>
                    <Stack direction="row" gap={1} alignItems="center"><LightbulbIcon sx={{ color: '#0f172a' }} /><Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>Moral of the Story</Typography></Stack>
                    <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.6, color: '#475569' }}>{openBook.moral}</Typography>
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