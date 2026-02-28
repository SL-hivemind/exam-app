import React, { useState } from "react";
import Slider from "react-slick";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, Grid, Container, Card, CardContent, CardMedia,
  CardActions, Paper, Stack, Dialog, DialogTitle, DialogContent, IconButton,
  Avatar, List, ListItem, ListItemText, ListItemIcon
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
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SecurityIcon from "@mui/icons-material/Security";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import GroupsIcon from "@mui/icons-material/Groups";

// --- UI COMPONENTS ---
import AnimatedText from "./ui/AnimatedText";
import BookStack from "./ui/BookStack";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

/* ─────────────────────── SVG Wave Dividers ─────────────────────── */
const WaveDivider = ({ color = "#f5f7fa", flip = false }) => (
  <Box sx={{ lineHeight: 0, overflow: 'hidden', transform: flip ? 'rotate(180deg)' : 'none', mt: flip ? 0 : '-1px', mb: flip ? '-1px' : 0 }}>
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ width: '100%', height: 80, display: 'block' }}>
      <path d="M0,40 C360,120 1080,0 1440,80 L1440,120 L0,120 Z" fill={color} />
    </svg>
  </Box>
);

/* ─────────────────────── Floating Orb Background ─────────────────────── */
const FloatingOrb = ({ size, color, top, left, delay = 0 }) => (
  <motion.div
    style={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: color, filter: 'blur(80px)', top, left, opacity: 0.5, zIndex: 0,
    }}
    animate={{ y: [0, -30, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }}
    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

/* ─────────────────────── Animated Counter (Stats) ─────────────────────── */
const StatCard = ({ icon, value, label, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
  >
    <Paper
      elevation={0}
      sx={{
        p: 4, textAlign: 'center', borderRadius: 4,
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        transition: 'all 0.4s cubic-bezier(0.25,0.8,0.25,1)',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 16px 48px rgba(25,118,210,0.12)',
        }
      }}
    >
      <Box sx={{ color: '#1976d2', mb: 1.5 }}>{icon}</Box>
      <Typography variant="h3" fontWeight={900} sx={{
        background: 'linear-gradient(135deg, #1976d2, #0d47a1)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>{label}</Typography>
    </Paper>
  </motion.div>
);

/* ─────────────────────── Stagger Container ─────────────────────── */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } }
};
const staggerItem = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.8, 0.25, 1] } }
};

/* ─────────────────────── Section Heading ─────────────────────── */
const SectionHeading = ({ overline, title, subtitle, light = false }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
    <Box textAlign="center" mb={8}>
      {overline && (
        <Typography variant="overline" fontWeight={800} letterSpacing={4} sx={{
          display: 'inline-block', px: 3, py: 0.5, borderRadius: 20,
          background: light ? 'rgba(255,255,255,0.15)' : 'rgba(25,118,210,0.08)',
          color: light ? '#90caf9' : '#1976d2', mb: 2,
        }}>{overline}</Typography>
      )}
      <Typography variant="h3" fontWeight={800} sx={{ color: light ? '#fff' : '#0d1b2a', mb: 2 }}>{title}</Typography>
      {subtitle && <Typography variant="h6" sx={{ color: light ? 'rgba(255,255,255,0.7)' : '#546e7a', maxWidth: 700, mx: 'auto', fontWeight: 400, lineHeight: 1.6 }}>{subtitle}</Typography>}
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
  { id: 1, title: 'Wings of Fire', author: 'APJ Abdul Kalam', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/wingsoffire.jpg', moral: "Determination and humility can overcome any obstacle.", summary: "An autobiography of A.P.J. Abdul Kalam, former President of India. It narrates his journey from a humble background in Rameswaram to becoming a key player in Indian space research and missile programs. The book is not just about his personal life but also a tribute to the unflagging spirit of the countless unsung heroes of Indian science. It inspires the youth to dream big and work hard to achieve those dreams, emphasizing that resilience is key to success." },
  { id: 2, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80', moral: "Understanding our past is the only way to shape a better future.", summary: "This ground-breaking narrative explores the history of our species, Homo sapiens, from the Stone Age to the Silicon Age. Harari takes us on a journey through the Cognitive Revolution, the Agricultural Revolution, and the Scientific Revolution, explaining how biology and history have defined us. It challenges everything we thought we knew about being human: our thoughts, our actions, our power, and our future. It forces the reader to confront the reality that while we have mastered the world around us, we have yet to master ourselves. It is a must-read for understanding why society functions the way it does today." },
  { id: 3, title: 'The Palace of Illusions', author: 'Chitra Banerjee Divakaruni', cover: 'https://images.unsplash.com/photo-1629196914375-f7e48f477b6d?auto=format&fit=crop&w=500&q=80', moral: "Destiny is powerful, but how we react to it defines our character.", summary: "A reimagining of the world-famous Indian epic, the Mahabharata, told from the perspective of Panchaali (Draupadi). While the original epic focuses on the wars and the men who fought them, this novel brings to light the life of a woman living in a patriarchal world. It weaves a tale of magic, destiny, and the struggle for identity. Through Panchaali's voice, we experience the complexities of friendship, marriage, and war. It teaches us that even in the midst of divine prophecies and great battles, human emotions—pride, love, and regret—remain the true drivers of history." },
  { id: 4, title: 'The Hobbit', author: 'J.R.R. Tolkien', cover: 'https://images.unsplash.com/photo-1618666012174-83b441c0bc76?auto=format&fit=crop&w=500&q=80', moral: "Even the smallest person can change the course of the future.", summary: "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling further than the pantry of his hobbit-hole. But his contentment is disturbed when the wizard Gandalf and a company of thirteen dwarves arrive on his doorstep to whisk him away on an unexpected journey. They seek to raid the treasure hoard of Smaug the Magnificent, a large and very dangerous dragon. This classic fantasy tale is not just about dragons and magic; it is a story about finding courage in the most unlikely places and stepping out of your comfort zone to discover who you really are." },
  { id: 5, title: 'Man\'s Search for Meaning', author: 'Viktor E. Frankl', cover: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=80', moral: "He who has a why to live can bear almost any how.", summary: "Based on Viktor Frankl's horrific experiences in Nazi concentration camps, this book argues that the primary human drive is not pleasure but the pursuit of what we find meaningful. Frankl introduces 'logotherapy,' a theory that suggests our primary drive in life is not pleasure, as Freud maintained, but the discovery and pursuit of what we personally find meaningful. It is a profound exploration of resilience, suggesting that we cannot avoid suffering, but we can choose how to cope with it, find meaning in it, and move forward with renewed purpose. It is a life-changing book on self-awareness." },
  { id: 6, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle', cover: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=500&q=80', moral: "Data! Data! Data! I can't make bricks without clay.", summary: "This collection of twelve short stories introduces the world to the brilliant and eccentric detective Sherlock Holmes and his loyal friend Dr. Watson. Through pure observation and deductive reasoning, Holmes solves mysteries that baffle the police and the public alike. From 'A Scandal in Bohemia' to 'The Adventure of the Speckled Band', these stories are not just thrillers; they are a masterclass in critical thinking and attention to detail. Reading this sharpens the mind, teaching the reader to look beyond the obvious and question assumptions, proving that logic is the ultimate tool for solving life's puzzles." },
  { id: 7, title: 'Atomic Habits', author: 'James Clear', cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=500&q=80', moral: "Tiny changes, remarkable results.", summary: "James Clear reveals practical strategies that will teach you exactly how to form good habits, break bad ones, and master the tiny behaviors that lead to remarkable results. If you're having trouble changing your habits, the problem isn't you. The problem is your system. Bad habits repeat themselves again and again not because you don't want to change, but because you have the wrong system for change. This book gives you a proven system to reach new heights, showing how 1% improvements every day compound into massive success over time." },
  { id: 8, title: 'The Alchemist', author: 'Paulo Coelho', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80', moral: "When you want something, all the universe conspires in helping you to achieve it.", summary: "This enchanting novel tells the story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure. His quest leads him to riches far different—and far more satisfying—than he ever imagined. Santiago's journey teaches us about the essential wisdom of listening to our hearts, of recognizing opportunity and learning to read the omens strewn along life's path, and, above all, following our dreams. It is a simple yet powerful fable about finding one's destiny and understanding that the journey itself is often the reward." }
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
  { title: "Tier 1: Essential", subtitle: "Academic Package", color: "#4db6ac", gradient: "linear-gradient(135deg, #4db6ac 0%, #26a69a 100%)", features: ["Printed Book Set (Full Year)", "Basic LMS & Exam Portal", "Digital Worksheets", "Mobile App (Basic)", "Offline Monthly Exams"], missing: ["STEM Activities", "Lab Setup", "Book Fair Setup", "SJIS (Not included)"] },
  { title: "Tier 2: Comprehensive", subtitle: "Most Opted by Schools", color: "#1e88e5", gradient: "linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)", recommended: true, features: ["Everything in Tier 1", "Advanced LMS (Analytics)", "Full Exam Portal", "2 Student Workshops", "Digital Question Bank"], missing: ["Lab Setup", "Large Book Fair Events", "SJIS (Not included)"] },
  { title: "Tier 3: Premium", subtitle: "Complete Transformation", color: "#ff9800", gradient: "linear-gradient(135deg, #ff9800 0%, #e65100 100%)", features: ["Everything in Tier 2", "Custom-Branded App", "Premium LMS (AI)", "Full Book Fair Setup", "STEM Kits & Lab Support", "Monthly Academic Coordinator", "⭐ SJIS Journal Included"], missing: [] }
];

const schoolServices = [
  { title: "School Lab Setup", icon: <ScienceIcon sx={{ fontSize: 48 }} />, desc: "Complete basic to advanced science lab infrastructure setup and consulting.", gradient: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)" },
  { title: "Library Management", icon: <LocalLibraryIcon sx={{ fontSize: 48 }} />, desc: "Curating books and digital cataloging systems for modern school libraries.", gradient: "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)" },
  { title: "Guest Faculty", icon: <SupervisorAccountIcon sx={{ fontSize: 48 }} />, desc: "Expert faculty visits twice a month to boost academic performance.", gradient: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)" },
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

  return (
    <Box sx={{ bgcolor: "#ffffff", minHeight: "100vh", overflowX: 'hidden' }}>

      {/* ═══════════════════ 1. HERO SECTION ═══════════════════ */}
      <Box sx={{
        position: "relative", minHeight: "100vh", display: 'flex', alignItems: 'center',
        background: 'linear-gradient(160deg, #f0f6ff 0%, #e8f0fe 30%, #ffffff 60%, #f5f0ff 100%)',
        overflow: 'hidden',
      }}>
        {/* Soft decorative blobs - very subtle on light bg */}
        <Box sx={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,118,210,0.06) 0%, transparent 70%)',
          top: '-10%', left: '-8%', zIndex: 0,
        }} />
        <Box sx={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(156,39,176,0.05) 0%, transparent 70%)',
          bottom: '5%', right: '-5%', zIndex: 0,
        }} />
        <Box sx={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(25,118,210,0.04) 0%, transparent 70%)',
          top: '60%', left: '50%', zIndex: 0,
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center">


            {/* Animated Rotating Title */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                <AnimatedText
                  type="rotate"
                  text="Your Partner for"
                  words={["Secure Exams", "Publications", "School Growth", "Innovation"]}
                  color="#1976d2"
                />
              </Box>
            </motion.div>

            {/* Subtitle */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }}>
              <Typography variant="h5" sx={{
                color: '#546e7a', mb: 6, lineHeight: 1.8, fontWeight: 400,
                maxWidth: 750, mx: 'auto', fontSize: { xs: '1.1rem', md: '1.35rem' },
              }}>
                A comprehensive ecosystem for Schools, Aspirants, and Educators.
                From advanced lab setups to secure competitive exams.
              </Typography>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} justifyContent="center">
                <Button
                  variant="contained" size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    px: 5, py: 1.8, fontSize: '1.1rem', borderRadius: 50,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 8px 32px rgba(25,118,210,0.3)',
                    fontWeight: 700, letterSpacing: 0.5,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 40px rgba(25,118,210,0.4)',
                    }
                  }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined" size="large"
                  onClick={() => document.getElementById('plans').scrollIntoView({ behavior: 'smooth' })}
                  sx={{
                    px: 5, py: 1.8, fontSize: '1.1rem', borderRadius: 50,
                    borderWidth: 2, borderColor: '#1976d2',
                    color: '#1976d2', fontWeight: 700,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#1565c0', color: '#fff',
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      transform: 'translateY(-3px)',
                    }
                  }}
                >
                  View Plans
                </Button>
              </Stack>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* ═══════════════════ 2. THINKLETS ═══════════════════ */}
      <WaveDivider color="#f8fafc" />
      <Box sx={{ py: 10, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
        <Container maxWidth="xl">
          <SectionHeading
            overline="STAY INFORMED"
            title="Thinklets & Contemporary News"
            subtitle="Curated articles and breakthrough discoveries to keep you at the forefront of knowledge."
          />
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Box sx={{
              px: 2,
              '& .slick-dots li button:before': { fontSize: 10, color: '#1976d2' },
              '& .slick-dots li.slick-active button:before': { color: '#0d47a1' },
              '& .slick-slide': { display: 'flex', height: 'auto' },
              '& .slick-slide > div': { display: 'flex', width: '100%' },
              '& .slick-track': { display: 'flex', alignItems: 'stretch' },
            }}>
              <Slider {...carouselSettings}>
                {thinkletArticles.map((article) => (
                  <Box key={article.id} sx={{ p: 2, display: 'flex !important' }}>
                    <Card sx={{
                      display: 'flex', flexDirection: 'column', width: '100%',
                      borderRadius: 4, overflow: 'hidden',
                      background: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                      transition: 'all 0.4s cubic-bezier(0.25,0.8,0.25,1)',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                      }
                    }}>
                      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                        <CardMedia
                          component="img" height="200" image={article.image} alt={article.title}
                          sx={{ transition: 'transform 0.5s ease', '&:hover': { transform: 'scale(1.05)' } }}
                        />
                        <Box sx={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.3))',
                        }} />
                      </Box>
                      <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>{article.title}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{article.summary}</Typography>
                      </CardContent>
                      <CardActions sx={{ p: 3, pt: 0 }}>
                        <Button
                          size="small" endIcon={<ArrowForwardIcon />}
                          onClick={() => window.open(article.link, '_blank')}
                          sx={{
                            fontWeight: 700, borderRadius: 20, px: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': { background: 'rgba(25,118,210,0.08)', transform: 'translateX(4px)' }
                          }}
                        >Read Full Story</Button>
                      </CardActions>
                    </Card>
                  </Box>
                ))}
              </Slider>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 3. BOOKS WE SUGGEST ═══════════════════ */}
      <WaveDivider color="#ffffff" />
      <Box sx={{ py: 10, bgcolor: '#fff' }}>
        <Container maxWidth="xl">
          <SectionHeading
            overline="CURATED BY EXPERTS"
            title="Books We Suggest"
            subtitle="Handpicked reads that inspire, educate, and transform thinking."
          />
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            <Grid container spacing={3}>
              {suggestedBooks.map((book) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
                  <motion.div variants={staggerItem}>
                    <Card sx={{
                      height: '100%', borderRadius: 4, overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                      transition: 'all 0.4s cubic-bezier(0.25,0.8,0.25,1)',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                        '& .book-cover': { transform: 'scale(1.08) rotate(-2deg)' }
                      }
                    }}>
                      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          className="book-cover"
                          component="img" src={book.cover}
                          sx={{
                            width: 80, height: 120, objectFit: 'cover', borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            transition: 'transform 0.4s ease',
                          }}
                        />
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>{book.title}</Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>by {book.author}</Typography>
                          <Button
                            size="small" variant="outlined"
                            startIcon={<MenuBookIcon />}
                            onClick={() => setOpenBook(book)}
                            sx={{
                              mt: 1, borderRadius: 20, fontWeight: 600, fontSize: '0.75rem',
                              borderColor: 'rgba(25,118,210,0.3)',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                borderColor: '#1976d2',
                                background: 'rgba(25,118,210,0.06)',
                              }
                            }}
                          >Read Summary</Button>
                        </Box>
                      </Box>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 4. OUR PUBLICATIONS ═══════════════════ */}
      <WaveDivider color="#f8fafc" />
      <Box id="publications" sx={{ py: 12, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
        <Container maxWidth="xl">
          <SectionHeading
            overline="NEP ALIGNED"
            title="Our Publications"
            subtitle="From Pre-Primary to Competitive Exams. High-quality content aligned with NEP."
          />
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

      {/* ═══════════════════ 5. PRICING ═══════════════════ */}
      <WaveDivider color="#ffffff" />
      <Box id="plans" sx={{ py: 12, bgcolor: '#ffffff' }}>
        <Container maxWidth="lg">
          <SectionHeading
            overline="PARTNERSHIP MODELS"
            title="Book Your Comfort"
            subtitle="Flexible academic plans designed to suit every school's budget and vision."
          />
          <Grid container spacing={4} alignItems="stretch" justifyContent="center">
            {pricingPlans.map((plan, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  style={{ height: '100%' }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 0, borderRadius: 5, overflow: 'hidden',
                      position: 'relative',
                      height: '100%', display: 'flex', flexDirection: 'column',
                      border: plan.recommended ? 'none' : '1px solid rgba(0,0,0,0.08)',
                      boxShadow: plan.recommended
                        ? `0 20px 60px rgba(30,136,229,0.25), 0 0 0 2px ${plan.color}`
                        : '0 4px 20px rgba(0,0,0,0.06)',
                      transform: plan.recommended ? 'scale(1.04)' : 'scale(1)',
                      transition: 'all 0.4s cubic-bezier(0.25,0.8,0.25,1)',
                      '&:hover': {
                        transform: plan.recommended ? 'scale(1.06) translateY(-8px)' : 'translateY(-8px)',
                        boxShadow: plan.recommended
                          ? `0 30px 80px rgba(30,136,229,0.35), 0 0 0 2px ${plan.color}`
                          : '0 20px 60px rgba(0,0,0,0.12)',
                      }
                    }}
                  >
                    {/* Gradient Header */}
                    <Box sx={{
                      background: plan.gradient, color: 'white', textAlign: 'center', py: 4, px: 3,
                      position: 'relative',
                    }}>
                      {plan.recommended && (
                        <Box sx={{
                          position: 'absolute', top: 12, right: -30,
                          bgcolor: '#fff', color: plan.color,
                          px: 4, py: 0.5, fontWeight: 800, fontSize: '0.7rem',
                          transform: 'rotate(45deg)', letterSpacing: 1,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}>
                          POPULAR
                        </Box>
                      )}
                      <Typography variant="h5" fontWeight={800}>{plan.title}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>{plan.subtitle}</Typography>
                    </Box>

                    {/* Content */}
                    <Box sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <List dense sx={{ flex: 1 }}>
                        {plan.features.map((feat, i) => (
                          <ListItem key={i} disableGutters sx={{ py: 0.8 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon sx={{ color: plan.color, fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary={feat} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                          </ListItem>
                        ))}
                        {plan.missing.map((miss, i) => (
                          <ListItem key={i} disableGutters sx={{ py: 0.8 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CancelIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                            </ListItemIcon>
                            <ListItemText primary={miss} primaryTypographyProps={{ variant: 'body2', color: 'text.disabled' }} />
                          </ListItem>
                        ))}
                      </List>
                      <Button
                        variant={plan.recommended ? "contained" : "outlined"}
                        fullWidth size="large"
                        onClick={() => navigate('/contact')}
                        sx={{
                          mt: 3, borderRadius: 50, fontWeight: 700, py: 1.5,
                          background: plan.recommended ? plan.gradient : 'transparent',
                          color: plan.recommended ? 'white' : plan.color,
                          borderColor: plan.color, borderWidth: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: plan.gradient, color: 'white', borderColor: plan.color,
                            transform: 'translateY(-2px)',
                            boxShadow: `0 8px 24px ${plan.color}44`,
                          }
                        }}
                      >Select Plan</Button>
                    </Box>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════════════ 6. ECOSYSTEM ═══════════════════ */}
      <WaveDivider color="#f0f4f8" />
      <Box id="ecosystem" sx={{
        py: 12,
        background: 'linear-gradient(180deg, #f0f4f8 0%, #e8edf3 100%)',
        position: 'relative',
      }}>
        <Container maxWidth="lg">
          <SectionHeading
            overline="HOLISTIC SUPPORT"
            title="School Support Ecosystem"
            subtitle="End-to-end services to help schools thrive academically and operationally."
          />
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Grid container spacing={4} justifyContent="center">
              {schoolServices.map((service, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div variants={staggerItem}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 5, height: '100%', borderRadius: 5, textAlign: 'center',
                        background: service.gradient,
                        border: '1px solid rgba(0,0,0,0.05)',
                        transition: 'all 0.4s cubic-bezier(0.25,0.8,0.25,1)',
                        cursor: 'default',
                        '&:hover': {
                          transform: 'translateY(-10px)',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                        }
                      }}
                    >
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                      >
                        <Box sx={{ color: '#1976d2', mb: 3 }}>{service.icon}</Box>
                      </motion.div>
                      <Typography variant="h6" fontWeight={700} gutterBottom>{service.title}</Typography>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.8}>{service.desc}</Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 7. LSRW ═══════════════════ */}
      <Box sx={{
        py: 12, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #e8f5e9 100%)',
      }}>
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(46,125,50,0.06)', top: -80, right: -80 }} />
        <Box sx={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(46,125,50,0.08)', bottom: -60, left: -40 }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Grid container spacing={6} alignItems="center">
              <Grid item xs={12} md={6}>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <RecordVoiceOverIcon sx={{ fontSize: 80, color: '#2e7d32', mb: 2 }} />
                </motion.div>
                <Typography variant="h3" fontWeight={800} gutterBottom color="success.dark">
                  English LSRW
                </Typography>
                <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontWeight: 500 }}>
                  Listening • Speaking • Reading • Writing
                </Typography>
                <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, color: '#37474f' }}>
                  A dedicated program to enhance communication skills by expert faculty. Build confidence, fluency, and command over the English language.
                </Typography>
                <Button
                  variant="contained" color="success" size="large"
                  sx={{
                    borderRadius: 50, px: 5, py: 1.5, fontWeight: 700,
                    boxShadow: '0 8px 32px rgba(46,125,50,0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 40px rgba(46,125,50,0.4)' }
                  }}
                >Request Demo</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{
                  p: 8, bgcolor: 'rgba(255,255,255,0.9)', borderRadius: 5,
                  textAlign: 'center', backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(165,214,167,0.5)',
                  boxShadow: '0 20px 60px rgba(46,125,50,0.1)',
                }}>
                  <Typography variant="h1" fontWeight={900} sx={{
                    background: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    fontSize: { xs: '4rem', md: '6rem' },
                  }}>LSRW</Typography>
                  <Typography variant="body2" sx={{ display: 'block', mt: 1, color: '#546e7a', fontWeight: 600 }}>
                    Language Lab Certified
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 8. AMBASSADOR ═══════════════════ */}
      <Box id="ambassador" sx={{
        py: 14, textAlign: 'center', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a0533 0%, #2d1659 50%, #1a0533 100%)',
      }}>
        {/* Decorative Orbs */}
        <FloatingOrb size={350} color="rgba(156,39,176,0.3)" top="-20%" left="20%" delay={0} />
        <FloatingOrb size={250} color="rgba(233,30,99,0.2)" top="60%" left="70%" delay={3} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              <Avatar sx={{
                width: 100, height: 100, mx: 'auto', mb: 4,
                background: 'linear-gradient(135deg, #9c27b0, #e91e63)',
                boxShadow: '0 8px 32px rgba(156,39,176,0.4)',
              }}>
                <CampaignIcon sx={{ fontSize: 48 }} />
              </Avatar>
            </motion.div>
            <Typography variant="h3" fontWeight={800} gutterBottom sx={{ color: '#fff' }}>
              Student Ambassador Program
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', mb: 5 }}>
              "To teach is to learn twice."
            </Typography>
            <Button
              variant="contained" size="large"
              sx={{
                borderRadius: 50, px: 6, py: 1.8, fontWeight: 700, fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #9c27b0, #e91e63)',
                boxShadow: '0 8px 32px rgba(156,39,176,0.4)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 16px 48px rgba(156,39,176,0.5)',
                }
              }}
            >Apply Now</Button>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ 9. PAPERS / SJIS ═══════════════════ */}
      <Box sx={{
        py: 12, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #263238 100%)',
        color: 'white',
      }}>
        {/* Subtle pattern */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '30px 30px',
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
              <Box flex={1}>
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                    <PublishIcon sx={{ fontSize: 48, color: '#4fc3f7' }} />
                  </motion.div>
                  <Typography variant="h4" fontWeight={800}>SJIS: Call for Papers</Typography>
                </Stack>
                <Typography variant="h6" gutterBottom sx={{ color: '#b3e5fc', fontWeight: 500 }}>
                  Saradaa Journal of Interdisciplinary Studies
                </Typography>
                <Typography variant="body1" paragraph sx={{ opacity: 0.7, lineHeight: 1.8 }}>
                  We invite researchers, academicians, and students to submit their original work. Contribute to the growing body of interdisciplinary knowledge.
                </Typography>
              </Box>
              <Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained" size="large"
                    href="mailto:editor.sjis@e2eindia.org"
                    sx={{
                      borderRadius: 50, px: 4, py: 1.5, fontWeight: 700,
                      background: 'linear-gradient(135deg, #0288d1, #01579b)',
                      boxShadow: '0 8px 24px rgba(2,136,209,0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 32px rgba(2,136,209,0.4)' }
                    }}
                  >Submit Manuscript</Button>
                  <Button
                    variant="outlined" size="large"
                    onClick={() => window.open('https://journal.e2eindia.org/', '_blank')}
                    sx={{
                      borderRadius: 50, px: 4, py: 1.5, fontWeight: 700,
                      borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)',
                      borderWidth: 2,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#4fc3f7', color: '#fff',
                        background: 'rgba(79,195,247,0.08)',
                        transform: 'translateY(-3px)',
                      }
                    }}
                  >Know More</Button>
                </Stack>
              </Box>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      {/* ═══════════════════ BOOK DETAILS DIALOG ═══════════════════ */}
      <Dialog
        open={!!openBook}
        onClose={() => setOpenBook(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
          }
        }}
      >
        {openBook && (
          <>
            <DialogTitle sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #1976d2, #0d47a1)',
              color: '#fff',
            }}>
              <Typography variant="h6" fontWeight={700}>{openBook.title}</Typography>
              <IconButton onClick={() => setOpenBook(null)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={4}>
                  <Box component="img" src={openBook.cover} sx={{
                    width: '100%', borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  }} />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="h6" color="primary" gutterBottom fontWeight={700}>About the Book</Typography>
                  <Typography paragraph sx={{ lineHeight: 1.8 }}>{openBook.summary}</Typography>
                  <Box sx={{
                    mt: 3, p: 3, borderRadius: 3,
                    background: 'linear-gradient(135deg, #fff8e1, #fff3e0)',
                    borderLeft: '4px solid #ffb300',
                  }}>
                    <Stack direction="row" gap={1} alignItems="center">
                      <LightbulbIcon sx={{ color: '#ffb300' }} />
                      <Typography variant="subtitle1" fontWeight={700}>Moral of the Story</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.6 }}>{openBook.moral}</Typography>
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