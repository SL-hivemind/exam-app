import React from "react";
import { Box, Typography, Container, Grid, Card, CardMedia, CardContent, Button } from "@mui/material";
import Masonry from '@mui/lab/Masonry';
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const THINKLETS_DATA = [
  {
    id: 1,
    title: "The Physics of Sound",
    description: "Discover how sound waves travel through different mediums and how our ears translate them into the music we love.",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 2,
    title: "How AI Learns",
    description: "An intro to neural networks and machine learning. See how artificial intelligence finds patterns in massive amounts of data.",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 3,
    title: "History of Algorithms",
    description: "From ancient Babylonian clay tablets to modern search engines, explore the fascinating evolution of step-by-step problem solving.",
    image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 4,
    title: "The Golden Ratio in Nature",
    description: "Why do sunflower seeds spiral in perfect patterns? Uncover the mathematical beauty hidden in the natural world.",
    image: "https://images.unsplash.com/photo-1518176510344-77dbdfc2491b?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 5,
    title: "The Mechanics of Flight",
    description: "Lift, thrust, drag, and weight. Learn the fundamental principles that allow massive metal airplanes to soar through the sky.",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 6,
    title: "The Chemistry of Colors",
    description: "Why is the sky blue and the grass green? Dive into the chemical compounds and light absorption that color our universe.",
    image: "https://images.unsplash.com/photo-1502691876148-a84978e59af8?auto=format&fit=crop&q=80&w=800"
  }
];

export default function ThinkletsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a', pt: 8, pb: 12, fontFamily: "'Inter', sans-serif" }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/')}
            sx={{ color: '#94a3b8', mb: 4, textTransform: 'none' }}
          >
            Back to Home
          </Button>
          <Typography variant="h3" fontWeight={800} color="#fff" gutterBottom sx={{ letterSpacing: '-0.02em', fontFamily: "'Space Grotesk', sans-serif" }}>
            Thinklets
          </Typography>
          <Typography variant="h6" color="#94a3b8" sx={{ maxWidth: 600, fontWeight: 400 }}>
            Bite-sized knowledge to feed your curiosity. Explore fascinating facts and foundational concepts across various disciplines.
          </Typography>
        </Box>



        {/* Masonry Layout */}
        <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={4}>
          {THINKLETS_DATA.map((thinklet) => (
            <Box key={thinklet.id} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box 
                sx={{
                  width: '100%',
                  maxWidth: 450,
                  margin: '0 auto',
                  perspective: '1000px',
                  cursor: 'pointer',
                  '&:hover .flip-card-inner': {
                    transform: 'rotateY(180deg)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                  }
                }}
              >
                <Box 
                  className="flip-card-inner"
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    borderRadius: 3,
                  }}
                >
                  {/* FRONT FACE (Relative Flow - dictates variable size) */}
                  <Card 
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      bgcolor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <CardMedia
                        component="img"
                        image={thinklet.image}
                        alt={thinklet.title}
                        sx={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.05)', 
                          objectFit: 'cover',
                          // Adding variable height logic based on odd/even IDs to simulate Pinterest look
                          height: thinklet.id % 2 === 0 ? 350 : 220 
                        }}
                      />
                      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                        <Typography variant="h5" component="h2" color="#fff" fontWeight={600} sx={{ fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>
                          {thinklet.title}
                        </Typography>
                      </CardContent>
                    </Box>
                  </Card>

                  {/* BACK FACE (Absolute Overlay) */}
                  <Card 
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      bgcolor: 'rgba(30, 41, 59, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(96, 165, 250, 0.3)',
                      borderRadius: 3,
                      overflowY: 'auto'
                    }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        minHeight: '100%', 
                        p: 4, 
                        textAlign: 'center' 
                      }}
                    >
                      <Typography gutterBottom variant="h4" component="h2" color="#60a5fa" fontWeight={700} sx={{ fontFamily: "'Space Grotesk', sans-serif", mb: 3 }}>
                        {thinklet.title}
                      </Typography>
                      <Typography 
                        color="#e2e8f0" 
                        variant="body1" 
                        sx={{ 
                          lineHeight: 1.8,
                          fontSize: '1.05rem'
                        }}
                      >
                        {thinklet.description}
                      </Typography>
                    </Box>
                  </Card>
                </Box>
              </Box>
            </Box>
          ))}
        </Masonry>
      </Container>
    </Box>
  );
}
