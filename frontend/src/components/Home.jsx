// src/components/Home.jsx
import React, { useState, useRef, useEffect } from 'react';
import Slider from 'react-slick';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Container, Card, CardContent,
  CardMedia, CardActions, Paper, Stack,
  List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider
} from '@mui/material';

// Icons
import CampaignIcon from '@mui/icons-material/Campaign';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// --- MOCK DATA ---
// Replace placeholder URLs with your actual S3 URLs
const carouselImages = [
  { id: 1, src: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/slide1.jpg', alt: 'Welcome to Saaradaa Learknowations' },
  { id: 2, src: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/slide2.jpg', alt: 'what we offer' },
  { id: 3, src: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/slide3.jpg', alt: 'Brain training' },
  { id: 4, src: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/slide4.jpg', alt: 'Students feedback' },
  { id: 5, src: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/slide5.jpg', alt: 'Collaborations and recognition' },
];

const thinkletArticles = [
  {
    id: 1,
    title: 'New Study: Nanotyrannus is a Distinct Species',
    summary: 'A 2024 analysis of skull features and bone growth rings suggests the smaller Nanotyrannus was a mature predator, not a teenage T. rex.',
    image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/nanotyrannus.jpg',
    link: 'https://www.sciencenews.org/article/nanotyrannus-not-teenaged-t-rex',
    fullSummary: 'The long-standing debate over Nanotyrannus continues. Was it a separate, \'pygmy\' tyrannosaur species, or simply a teenage T. rex? A new 2024 study by paleontologists re-examines key fossils, focusing on skull features and growth rings within the bones. Their findings contradict previous research, suggesting that the growth patterns indicate the animal was nearing adulthood, not growing rapidly like a juvenile. This evidence points to Nanotyrannus being a distinct, smaller, and more agile species that co-existed with its massive cousin, T. rex.'
  },
  {
    id: 2,
    title: 'Can AI Chatbots Really Help With Your Mental Health?',
    summary: 'AI bots are being used as accessible mental health tools, but experts are cautious about their risks, privacy, and lack of real empathy.',
    image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Ai-chatbot.png',
    link: 'https://www.snexplores.org/article/ai-chatbots-mental-health-therapy',
    fullSummary: 'AI chatbots are increasingly being used as mental health tools, offering instant, accessible support for people who may not be able to access traditional therapy. These bots can listen, offer coping strategies, and provide a non-judgmental space. However, mental health experts are cautious. They raise concerns about the bots\' ability to handle serious crises, the privacy of sensitive user data, and the lack of genuine human empathy and understanding. While they can be a useful first step or supplementary tool, they are not a replacement for professional human therapists.'
  },
  {
    id: 3,
    title: 'Which City in Asia is Also a Country?',
    summary: 'Discover the unique city-state in Asia that functions as both a major global city and a sovereign country.',
    image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/singapore.jpg',
    link: 'https://www.indiatoday.in/amp/education-today/gk-current-affairs/story/which-is-the-only-city-in-aisa-that-is-also-a-country-2813262-2025-11-04',
    fullSummary: 'The answer is Singapore. Officially known as the Republic of Singapore, it is the only city in Asia that is also a sovereign country. It is an island city-state located in maritime Southeast Asia. Despite its small size of about 734 square kilometers, it is a global hub for finance, technology, and trade. Because it is a city-state, its government manages both municipal (city) and national affairs, making it unique in the continent.'
  },
];

const suggestedBooks = [
  {
    id: 1,
    title: 'India\'s Biggest Cover-up',
    author: 'Anuj Dhar',
    cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Indias_biggest_coverup.jpg',
    summary: 'Investigating the enduring mystery surrounding Netaji Subhas Chandra Bose\'s disappearance, this book challenges the official narrative of his death in a 1945 plane crash. Author Anuj Dhar meticulously examines declassified government files, inquiry commission reports, and eyewitness accounts to argue that the official story might be a deliberate cover-up. The book explores compelling alternative theories, including Netaji\'s possible escape to the Soviet Union or his later life in India as an ascetic, prompting readers to question historical certainties and the nature of state secrets.',
    takeaways: ['Question accepted narratives; the pursuit of truth is a duty.'],
    link: 'https://www.amazon.in/Indias-Biggest-Cover-up-Anuj-Dhar/dp/8190913998/'
  },
  {
    id: 2,
    title: 'The Serpent\'s Revenge',
    author: 'Sudha Murty',
    cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/serpents_revenge.jpg',
    summary: 'This collection brings to life lesser-known yet fascinating tales from the epic Mahabharata, often overshadowed by the main conflict. Sudha Murty retells intriguing stories such as why the Serpent King Takshaka cursed King Parikshit, leading to his death; the circumstances under which Yama, the god of death, faced a curse; and the lesson a humble mongoose taught King Yudhishthira about genuine sacrifice. Each concise story delves into themes of dharma, curses, boons, and the intricate web of consequences flowing from actions within Hindu mythology.',
    takeaways: ['Dharma (duty/righteousness) is complex, and every action, big or small, has powerful consequences.'],
    link: 'https://www.amazon.in/Serpents-Revenge-Unusual-Mahabharata-Murty/dp/0143427814/'
  },
  {
    id: 3,
    title: 'Wings Of Fire',
    author: 'Dr. A.P.J. Abdul Kalam',
    cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/wingsoffire.jpg',
    summary: 'The inspiring autobiography of Dr. A. P. J. Abdul Kalam, chronicling his extraordinary life from a modest childhood in Rameswaram, where he distributed newspapers, to becoming India\'s leading rocket scientist and eventually its President. The book details his relentless hard work, his crucial role in developing India\'s space program (including the SLV-3 rocket) and missile technology (Agni, Prithvi), earning him the title "Missile Man." It\'s a profound narrative of overcoming obstacles, embracing failure, fostering teamwork, and unwavering dedication to national progress.',
    takeaways: ['Your dreams and hard work define your future, not your background.', 'Perseverance is key to overcoming challenges.', 'Leadership involves inspiring and enabling teams.'],
    link: 'https://www.amazon.in/Wings-Fire-Autobiography-Abdul-Kalam/dp/8173711461/'
  },
];

export default function Home() {
  const navigate = useNavigate();

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    fade: true,
    arrows: false,
    pauseOnHover: true
  };

  const [showRiddleAnswer, setShowRiddleAnswer] = useState(false);
  const riddleAnswer = "A Postbox";

  const [openBookModal, setOpenBookModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [openThinkletModal, setOpenThinkletModal] = useState(false);
  const [selectedThinklet, setSelectedThinklet] = useState(null);

  // NEW: overlay news dialog
  const [openNewsOverlay, setOpenNewsOverlay] = useState(true);

  useEffect(() => {
    // If you want it to show only once per session:
    const seen = sessionStorage.getItem('seenNewsOverlay');
    if (!seen) {
      setOpenNewsOverlay(true);
      sessionStorage.setItem('seenNewsOverlay', '1');
    } else {
      setOpenNewsOverlay(false);
    }
  }, []);

  const handleOpenBookModal = (book) => { setSelectedBook(book); setOpenBookModal(true); };
  const handleCloseBookModal = () => { setOpenBookModal(false); setSelectedBook(null); };
  const handleOpenThinkletModal = (article) => { setSelectedThinklet(article); setOpenThinkletModal(true); };
  const handleCloseThinkletModal = () => { setOpenThinkletModal(false); setSelectedThinklet(null); };

  return (
    <Box sx={{
      bgcolor: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
      '@keyframes move_glow': {
        '0%': { transform: 'translate(0, 0) rotate(0deg)' },
        '50%': { transform: 'translate(100px, 150px) rotate(180deg)' },
        '100%': { transform: 'translate(0, 0) rotate(360deg)' },
      },
      '@keyframes move_glow_alt': {
        '0%': { transform: 'translate(0, 0) rotate(0deg)' },
        '50%': { transform: 'translate(-100px, -150px) rotate(-180deg)' },
        '100%': { transform: 'translate(0, 0) rotate(-360deg)' },
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '500px',
        height: '500px',
        top: '-150px',
        left: '-150px',
        background: 'radial-gradient(circle, rgba(173, 216, 230, 0.4), transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        zIndex: 0,
        animation: 'move_glow 25s ease-in-out infinite',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        width: '500px',
        height: '500px',
        bottom: '-150px',
        right: '-150px',
        background: 'radial-gradient(circle, rgba(230, 230, 250, 0.4), transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        zIndex: 0,
        animation: 'move_glow_alt 25s ease-in-out infinite',
      },
      // NEW: marquee keyframes
      '@keyframes marqueeSlide': {
        '0%': { transform: 'translateX(100%)' },
        '100%': { transform: 'translateX(-100%)' },
      }
    }}>
      {/* NEW: FLASH NEWS MARQUEE (sticky top) */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: '#d32f2f',
          color: '#fff',
          overflow: 'hidden',
          height: 40,
          display: 'flex',
          alignItems: 'center',
          boxShadow: 3
        }}
      >
        <Box
          sx={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            px: 2,
            animation: 'marqueeSlide 18s linear infinite',
            '&:hover': { animationPlayState: 'paused', cursor: 'pointer' },
            fontSize: { xs: 12, sm: 14 },
            fontWeight: 600
          }}
          title="Pause on hover"
        >
          {/* Use your exact message; lightly cleaned punctuation */}
          Monthly tests results are out now — login and check. | Are you want be the olympiad champion? Don’t just be a king, be an emperor — participate in olympiad tests and compete with state. | New Thinklets and Books added this week! | Try today’s riddle and challenge your friends!
        </Box>
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Button variant="contained" sx={{ boxShadow: 3 }} href="#thinklets">Thinklets</Button>
            <Button variant="contained" sx={{ boxShadow: 3 }} href="#books">Books</Button>
            <Button variant="contained" sx={{ boxShadow: 3 }} href="#riddle">Riddle</Button>
            <Button variant="contained" sx={{ boxShadow: 3 }} href="#announcements">Announcements</Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AccountCircleIcon />}
              sx={{ boxShadow: 3, width: { xs: '80%', sm: 'auto'} }}
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
          </Stack>
        </Box>

        <Box>
          <Slider {...sliderSettings}>
            {carouselImages.map((image) => (
              <Box key={image.id} sx={{ height: { xs: '50vh', md: '75vh' } }}>
                <Box
                  component="img"
                  src={image.src}
                  alt={image.alt}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
            ))}
          </Slider>
        </Box>

        <Container maxWidth="xl" sx={{ py: 6, mt: 4 }}>
          {/* --- Thinklets Section --- */}
          <Box id="thinklets" sx={{ mb: 8 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mb={4}>
              <ArticleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h4" component="h2" fontWeight={600}> Thinklets & News </Typography>
            </Stack>
            <Grid container spacing={4} justifyContent="center">
              {thinkletArticles.map(article => (
                <Grid item key={article.id} xs={12} sm={6} md={4}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
                    <CardMedia component="img" height="200" image={article.image} alt={article.title} />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6">{article.title}</Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                      <Button size="small" variant="outlined" onClick={() => handleOpenThinkletModal(article)} endIcon={<ArrowForwardIcon/>}>
                        Read More
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* --- Books Section --- */}
          <Box id="books" sx={{ textAlign: 'center', mb: 8 }}>
            <MenuBookIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" component="h2" fontWeight={600} mb={4}>Recommended Reading</Typography>
            <Grid container spacing={4} justifyContent="center">
              {suggestedBooks.map(book => (
                <Grid item key={book.id} xs={12} sm={4} md={3}>
                  <Card sx={{ border: '1px solid #ddd', boxShadow: 3, display: 'flex', flexDirection: 'column', height: '100%' }} elevation={0}>
                    <CardMedia component="img" image={book.cover} alt={book.title} sx={{ height: 250, objectFit: 'cover' }}/>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography fontWeight="bold" variant="body1">{book.title}</Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                      <Button size="small" variant="outlined" onClick={() => handleOpenBookModal(book)}>Read More</Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* --- Riddle Section --- */}
          <Box id="riddle" sx={{ textAlign: 'center', mb: 8 }}>
            <LightbulbOutlinedIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
            <Typography variant="h4" component="h2" fontWeight={600} mb={4}>Think Riddles!</Typography>
            <Paper sx={{ maxWidth: '600px', mx: 'auto', p: 4, border: '1px solid #ddd', boxShadow: 3 }} variant="outlined">
              <Typography variant="h6" mb={3} sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                "Iam a seven letter word if you remove 1 letter from me i remain the same , if you remove 2 letter from me i remain the same , if you remove 3 letter from me i remain the same, if you remove 4 letter from me i remain the same, if you remove 5 letter from me i remain the same,  yoifu remove 6 letter from me i remain the same, if you remove all the  letter from me i remain the same. Who Am I?  Hint : "letters" "
              </Typography>
              {!showRiddleAnswer && (
                <Button variant="contained" size="small" onClick={() => setShowRiddleAnswer(true)}>Show Answer</Button>
              )}
              {showRiddleAnswer && (
                <Box mt={2}>
                  <Typography fontWeight="bold" variant="h6" color="success.main">
                    Answer: {riddleAnswer}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* --- Announcements Section --- */}
          <Box id="announcements" sx={{ textAlign: 'center', mb: 8 }}>
            <CampaignIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" component="h2" fontWeight={600} mb={3}>Announcements</Typography>
            <Paper sx={{ maxWidth: '800px', mx: 'auto', border: '1px solid #ddd', boxShadow: 3 }} variant='outlined'>
              <List>
                <ListItem>
                  <ListItemIcon><CampaignIcon color="primary" /></ListItemIcon>
                  <ListItemText
                    primary="Exams: Monthly Exams (October 2025) Results Released"
                    secondary={`Announced on ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric'})}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CampaignIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="Upcoming: Winter Olympiad" secondary="Registrations opens soon" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CampaignIcon color="primary" /></ListItemIcon>
                  <ListItemText primary="New Feature: Practice Mode" secondary="Now available for all registered students!" />
                </ListItem>
              </List>
            </Paper>
          </Box>
        </Container>
      </Box>

      {/* --- Book Detail Modal --- */}
      <Dialog open={openBookModal} onClose={handleCloseBookModal} maxWidth="sm" fullWidth>
        {selectedBook && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedBook.title}
              <IconButton edge="end" color="inherit" onClick={handleCloseBookModal} aria-label="close"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box component="img" src={selectedBook.cover} alt={selectedBook.title} sx={{ width: '100%', borderRadius: 1 }}/>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>By {selectedBook.author}</Typography>
                  <Typography variant="body1" paragraph>{selectedBook.summary}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Key Takeaways:</Typography>
              <List dense>
                {selectedBook.takeaways.map((takeaway, index) => (
                  <ListItem key={index}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>•</ListItemIcon>
                    <ListItemText primary={takeaway} />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions><Button onClick={handleCloseBookModal}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* --- Thinklet Detail Modal --- */}
      <Dialog open={openThinkletModal} onClose={handleCloseThinkletModal} maxWidth="md" fullWidth>
        {selectedThinklet && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedThinklet.title}
              <IconButton edge="end" color="inherit" onClick={handleCloseThinkletModal} aria-label="close"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ width: '100%', maxHeight: '400px', overflow: 'hidden', mb: 2, borderRadius: 1 }}>
                <img src={selectedThinklet.image} alt={selectedThinklet.title} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} />
              </Box>
              <Typography variant="body1" paragraph>{selectedThinklet.fullSummary || selectedThinklet.summary}</Typography>
            </DialogContent>
            <DialogActions><Button onClick={handleCloseThinkletModal}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* NEW: Overlay News / Direct Login */}
      <Dialog open={openNewsOverlay} onClose={() => setOpenNewsOverlay(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CampaignIcon color="error" />
            <Typography variant="h6" fontWeight={700}>Results Are Out!</Typography>
          </Stack>
          <IconButton onClick={() => setOpenNewsOverlay(false)} aria-label="close"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" paragraph>
            Monthly tests results are out now — check your scores by logging in to your account.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Also, have a look at our Thinklets, Books, and today’s Riddle while you’re here!
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={1}>
            <Button
              variant="contained"
              startIcon={<AccountCircleIcon />}
              onClick={() => { setOpenNewsOverlay(false); navigate('/login'); }}
            >
              Login
            </Button>
            <Button variant="outlined" onClick={() => { setOpenNewsOverlay(false); document.querySelector('#thinklets')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Explore Thinklets
            </Button>
            <Button variant="outlined" onClick={() => { setOpenNewsOverlay(false); document.querySelector('#books')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Browse Books
            </Button>
            <Button variant="outlined" onClick={() => { setOpenNewsOverlay(false); document.querySelector('#riddle')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Try the Riddle
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewsOverlay(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
