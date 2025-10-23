// src/components/Home.jsx
import React, { useState, useRef } from 'react';
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
    { id: 1, title: '2025 Medical Laureates', summary: 'Explore the groundbreaking work that earned this year\'s Nobel Prize in Medicine.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Noble.png', link: '#', fullSummary: 'The Nobel Assembly at the Karolinska Institutet has decided to award the 2025 Nobel Prize in Physiology or Medicine to Mary E.Brunkow, Fred Ramsdell and Shimon Sakaguchi...' },
    { id: 2, title: 'AI Co-Developer', summary: 'How AI is changing the landscape of software development.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/AiCo.png', link: '#', fullSummary: 'A major shift in software engineering has solidified in 2025 with the widespread adoption of agentic AI systems...' },
    { id: 3, title: 'Breakthroughs in Cancer Research', summary: 'Recent advancements in understanding and treating cancer.', image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Cancer.png', link: '#', fullSummary: 'Researchers at ETH Zurich, led by Sabine Werner, have made a key discovery "for identifying how cancer cells transfer their mitochondria... ' },
];
const suggestedBooks = [
    { id: 1, title: 'Indias Biggest Coverup', author: 'Anuj Dhar', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Indias_biggest_coverup.jpg', summary: 'This book investigates the mystery of Netaji Subhas Chandra Bose s disappearance...', takeaways: ['Question the accepted narrative; the pursuit of truth is a duty'] },
    { id: 2, title: 'Serpents Revenge', author: 'Sudha Murthy', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/serpents_revenge.jpg', summary: 'This is not one single story but a collection of many short, "unusual" tales...', takeaways: ['Dharma (duty/righteousness) is complex...'] },
    { id: 3, title: 'Wings Of Fire', author: 'Dr. A.P.J. Abdul Kalam', cover: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/wingsoffire.jpg', summary: 'This is the autobiography of Dr. A. P. J. Abdul Kalam...', takeaways: ['Your dreams and your hard work define your future...'] },
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
    const riddleAnswer = "A Candle";

    const [openBookModal, setOpenBookModal] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [openThinkletModal, setOpenThinkletModal] = useState(false);
    const [selectedThinklet, setSelectedThinklet] = useState(null);

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
        }}>
            <Box sx={{ position: 'relative', zIndex: 1 }}>

                <Box sx={{ py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
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
                        {carouselImages.map((image) => ( <Box key={image.id} sx={{ height: { xs: '50vh', md: '75vh' } }}><Box component="img" src={image.src} alt={image.alt} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} /></Box> ))}
                    </Slider>
                </Box>

                <Container maxWidth="xl" sx={{ py: 6, mt: 4 }}>

                    {/* --- Thinklets Section --- */}
                    <Box id="thinklets" sx={{ mb: 8 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" mb={4}>
                             <ArticleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            <Typography variant="h4" component="h2" fontWeight={600} > Thinklets & News </Typography>
                        </Stack>
                        <Grid container spacing={4} justifyContent="center">
                            {thinkletArticles.map(article => (
                                <Grid item key={article.id} xs={12} sm={6} md={4}>
                                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
                                        <CardMedia component="img" height="200" image={article.image} alt={article.title} />
                                        <CardContent sx={{ flexGrow: 1 }}><Typography gutterBottom variant="h6">{article.title}</Typography></CardContent>
                                        <CardActions sx={{ justifyContent: 'center', pb: 2 }}><Button size="small" variant="outlined" onClick={() => handleOpenThinkletModal(article)} endIcon={<ArrowForwardIcon/>}>Read More</Button></CardActions>
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
                                        <CardContent sx={{ flexGrow: 1 }}><Typography fontWeight="bold" variant="body1">{book.title}</Typography></CardContent>
                                        <CardActions sx={{ justifyContent: 'center', pb: 2 }}><Button size="small" variant="outlined" onClick={() => handleOpenBookModal(book)}>Read More</Button></CardActions>
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
                            <Typography variant="h6" mb={3} sx={{ fontStyle: 'italic', color: 'text.secondary' }}> "You measure my life in hours and I serve you by expiring. I’m quick when I’m thin and slow when I’m fat. The wind is my enemy." </Typography>
                            {!showRiddleAnswer && (<Button variant="contained" size="small" onClick={() => setShowRiddleAnswer(true)}>Show Answer</Button>)}
                            {showRiddleAnswer && (<Box mt={2}><Typography fontWeight="bold" variant="h6" color="success.main"> Answer: {riddleAnswer} </Typography></Box>)}
                        </Paper>
                    </Box>

                    {/* --- Announcements Section --- */}
                    <Box id="announcements" sx={{ textAlign: 'center', mb: 8 }}>
                        <CampaignIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" component="h2" fontWeight={600} mb={3}>Announcements</Typography>
                        <Paper sx={{ maxWidth: '800px', mx: 'auto', border: '1px solid #ddd', boxShadow: 3 }} variant='outlined'>
                            <List>
                                <ListItem><ListItemIcon><CampaignIcon color="primary" /></ListItemIcon><ListItemText primary="Exams: Monthly Exams (Oct)" secondary={`Announced on ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric'})}`} /></ListItem>
                                <ListItem><ListItemIcon><CampaignIcon color="primary" /></ListItemIcon><ListItemText primary="Upcoming: Winter Olympiad" secondary="Registrations open from Nov 1, 2025" /></ListItem>
                                <ListItem><ListItemIcon><CampaignIcon color="primary" /></ListItemIcon><ListItemText primary="New Feature: Practice Mode" secondary="Now available for all registered students!" /></ListItem>
                            </List>
                        </Paper>
                    </Box>

                </Container>
            </Box>

            {/* --- Book Detail Modal --- */}
            <Dialog open={openBookModal} onClose={handleCloseBookModal} maxWidth="sm" fullWidth>
                {selectedBook && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{selectedBook.title}<IconButton edge="end" color="inherit" onClick={handleCloseBookModal} aria-label="close"><CloseIcon /></IconButton></DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={2}><Grid item xs={12} sm={4}><Box component="img" src={selectedBook.cover} alt={selectedBook.title} sx={{ width: '100%', borderRadius: 1 }}/></Grid><Grid item xs={12} sm={8}><Typography variant="subtitle1" color="text.secondary" gutterBottom>By {selectedBook.author}</Typography><Typography variant="body1" paragraph>{selectedBook.summary}</Typography></Grid></Grid>
                            <Divider sx={{ my: 2 }} /><Typography variant="h6" gutterBottom>Key Takeaways:</Typography>
                            <List dense>{selectedBook.takeaways.map((takeaway, index) => (<ListItem key={index}><ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>•</ListItemIcon><ListItemText primary={takeaway} /></ListItem>))}</List>
                        </DialogContent>
                        <DialogActions><Button onClick={handleCloseBookModal}>Close</Button></DialogActions>
                    </>
                )}
            </Dialog>

            {/* --- Thinklet Detail Modal --- */}
            <Dialog open={openThinkletModal} onClose={handleCloseThinkletModal} maxWidth="md" fullWidth>
                {selectedThinklet && (
                    <>
                        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{selectedThinklet.title}<IconButton edge="end" color="inherit" onClick={handleCloseThinkletModal} aria-label="close"><CloseIcon /></IconButton></DialogTitle>
                        <DialogContent dividers>
                            <Box sx={{ width: '100%', maxHeight: '400px', overflow: 'hidden', mb: 2, borderRadius: 1 }}><img src={selectedThinklet.image} alt={selectedThinklet.title} style={{ width: '100%', height: 'auto', objectFit: 'cover' }} /></Box>
                            <Typography variant="body1" paragraph>{selectedThinklet.fullSummary || selectedThinklet.summary}</Typography>
                        </DialogContent>
                        <DialogActions><Button onClick={handleCloseThinkletModal}>Close</Button></DialogActions>
                    </>
                )}
            </Dialog>

        </Box>
    );
}