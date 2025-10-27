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
{
        id: 3,
        // Title and image updated to reflect the new content
        title: 'Vasuki indicus: India\'s Prehistoric Serpent Monarch',
        summary: 'Discover a colossal serpent that ruled 47 million years ago.', // Updated summary
        image: 'https://sl-exams-uploads-2025.s3.ap-south-1.amazonaws.com/Home/Vasuki-Indicus.jpg', // Placeholder for a relevant Vasuki image
        link: '#',
        fullSummary: `Vasuki indicus: India's Prehistoric Serpent Monarch\n\nWhere Continents Drifted and Serpents Reigned: The Story of Vasuki Indicus\n\nStudents, Student Leaders, Teachers, Young Researchers, Budding Scientists,\nLet me take you back; not hundreds, not thousands, but forty-seven million years into the past. A journey into the past! The Earth looked very different then. The Indian subcontinent was a lush, tropical island drifting slowly northward through the ancient seas. How many of you are aware of the name Vasuki, a name that is very much related to snakes? The story, dated back to tens of millions years ago, is quite interesting, didactic and informative.\n\nNearly 47 million years ago, when the Indian subcontinent was a lush, tropical world of swamps and dense forests, a colossal serpent ruled its ecosystems - the Vasuki indicus, a snake so vast it could stretch nearly the length of a tour bus. Measuring between 10.9 and 15.2 metres.\n\nLet us see the exact meaning of the word 'Vasuki Indicus'. "Vasuki" is attributed to the Mythological age. So, the generic name "Vasuki" comes from Hindu mythology. In Sanskrit, Vasuki (वासुकी) is the name of the King of the Nagas - the divine serpent beings staying in Nagaloka. Vasuki is most famously known as the serpent wrapped around Lord Shiva's neck, symbolizing 1) Power and fearlessness 2) Eternity (the cycle of life and death) 3) Balance between destruction and regeneration. In the epic Samudra Manthan (also termed Ksheerasaagara Madhanam) (the Churning of the Ocean of Milk), Vasuki served as the churning rope used by gods (Devas) and demons (Asuras) to extract amrita, ambrosia, the nectar of immortality.\n\nSo, moving further, naming this giant prehistoric snake "Vasuki" pays homage to India's mythological serpent deity, perfectly capturing its grandeur, strength, and cultural resonance. "Indicus" also is the other part of the name for this gigantic snake. "indicus" is the Scientific Descriptor. The second part, "indicus", is Latin for "of India" or "from India." It's a standard suffix used in zoological naming to denote geographical origin similar to: 1)Panthera tigris indicus → the Bengal tiger ("the tiger from India") 2) Elephas maximus indicus → the Indian elephant. Thus, "indicus" identifies where the species was found or originated.\n\nUnearthed from a lignite mine in Gujarat's Kutch region, paleontologists discovered 27 remarkably preserved vertebrae, each up to 11 cm wide - a testament to the serpent's monumental form. Using data from modern snakes and fossil analogues, Dr. Sunil Bajpai and Dr. Debajit Datta of IIT Roorkee reconstructed the life of this ancient titan. Their study revealed that Vasuki indicus was a slow-moving ambush predator, relying on sheer strength to coil around its prey and suffocate it. This is almost like that of modern pythons but on an unbelievable and uncanny scale.\n\nVasuki indicus descended from a lineage that stretched back 100 million years, across the Late Cretaceous to Late Pleistocene epochs. These snakes once spanned India, Africa, and Europe, suggesting a vast evolutionary journey that mirrored the drifting continents themselves. Scientists believe India was the birthplace of this serpentine family around 88 million years ago, during its isolation after the breakup of Gondwana. As the subcontinent drifted northward and collided with Asia, it forged land bridges that allowed species like Vasuki to migrate westward; giving rise to other giants such as Gigantophis garstini (we shall discuss on this in the next storyboard) in North Africa.\n\nIndia is never without mythological significance of various people, places, events, actions and many non-living things and gigantic and unbelievable people. So is the case with Vasuki indicus. The name Vasuki carries deep spiritual resonance. In Hindu mythology, Vasuki is the mighty serpent king (Nāgarāja) who coils around Lord Shiva's neck; a symbol of cosmic power, eternity, and control over fear and death.\n\nThe discovery of Vasuki indicus does more than rewrite the record of giant snakes. It positions India as a cradle of serpentine evolution, a land whose deep geological and mythological stories now converge. From the Eocene forests of Kutch to the pages of the Puranas (we shall also talk about this from the scientific evolution point of view), Vasuki indicus embodies the continuity between science and spirit, evolution and eternity. It is both a relic of Earth's ancient warmth and a reminder of how life, myth, and the movements of continents shape the story of the planet; one vertebra, one legend at a time. Vasuki indicus coils through history like time itself; ancient, eternal, unseen yet ever-present. It bridges India's mythic imagination with the truth of its prehistoric Earth. In its bones, we find a reminder: that what we call legend may simply be memory, worn smooth by time.\n\nFollow these articles for deeper research tint on this:\nSpringer paper: https://link.springer.com/article/10.1007/s43538-024-00315-9\nNature news summary: https://www.nature.com/articles/d44151-024-00048-0\nEurekAlert news release: https://www.eurekalert.org/news-releases/1041395`
    },];
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