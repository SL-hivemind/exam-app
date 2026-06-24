// components/common/PlatformBot.jsx
// ─────────────────────────────────────────────────────────────
// In-House Platform Assistant — Floating Chat Widget
// ─────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, IconButton, Typography, TextField, Stack, Chip, Avatar,
  Fade, useMediaQuery, useTheme, CircularProgress,
  SpeedDial, SpeedDialIcon, SpeedDialAction
} from '@mui/material';
import {
  SmartToy as BotIcon,
  Close as CloseIcon,
  Send as SendIcon,
  AutoAwesome as SparkleIcon,
  NavigateNext as NavIcon,
  MenuBook as MenuBookIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';

const MotionBox = motion.create(Box);

const oswald = "'Oswald', sans-serif";

/* ──── markdown-lite: bold **text** + `code` ──── */
function renderBotText(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => (
    <Typography
      key={i}
      variant="body2"
      sx={{ mb: line === '' ? 0.5 : 0.25, lineHeight: 1.55, fontSize: '0.82rem', color: 'inherit' }}
      dangerouslySetInnerHTML={{
        __html: line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-size:0.78rem">$1</code>'),
      }}
    />
  ));
}

export default function PlatformBot() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [botMode, setBotMode] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const scrollRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Load initial suggestions on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      if (botMode === 'dashboard') {
        setMessages([{
          role: 'bot',
          text: "Hello! 👋 I'm your **Platform Assistant**. I can:\n\n• 📊 **Query data** — \"How many students in class 10?\"\n• 🏫 **Look up schools** — \"Tell me about school Eesha\"\n• 🔍 **Find students** — \"Find student Rahul\"\n• ✅ **Validate questions** — \"Check my questions for errors\"\n• 📝 **Platform guides** — \"How do I create an exam?\"\n\nJust ask!",
          time: new Date(),
        }]);
        setSuggestions([
          'How many students do I have?',
          'Tell me about my school',
          'Check questions for errors',
          'Show recent exams',
          'Find student...',
        ]);
      } else {
        setMessages([{
          role: 'bot',
          text: "Hello! 📚 I'm your **Study Assistant**. Ask me any academic or textbook questions!",
          time: new Date(),
        }]);
        setSuggestions([]);
      }
    }
  }, [open, botMode, messages.length]);

  const basePath = location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/school') ? '/school'
    : location.pathname.startsWith('/specialist') ? '/specialist' : '/admin';

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg, time: new Date() }]);
    setLoading(true);
    setSuggestions([]);

    try {
      const { data } = await api.post('/bot/chat', { message: msg, mode: botMode });
      setMessages(prev => [...prev, {
        role: 'bot',
        text: data.response,
        link: data.link || null,
        time: new Date(),
      }]);
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: '⚠️ Sorry, something went wrong. Please try again.',
        time: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNavLink = (link) => {
    navigate(`${basePath}/${link}`);
  };

  /* ───── Floating Action Button ───── */
  const fabSize = isMobile ? 52 : 58;

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <MotionBox
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            sx={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 1400,
            }}
          >
            <SpeedDial
              ariaLabel="SL Assistant Options"
              icon={<SpeedDialIcon icon={<BotIcon sx={{ fontSize: 28 }} />} />}
              direction="up"
              sx={{
                '& .MuiSpeedDial-fab': {
                  width: fabSize, height: fabSize,
                  background: 'linear-gradient(135deg, #2f6bff 0%, #f68914 100%)',
                  color: '#fff',
                  boxShadow: '0 6px 28px rgba(47,107,255,0.45), 0 2px 8px rgba(246,137,20,0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1d5ae0 0%, #e07b0e 100%)',
                    transform: 'scale(1.08)',
                  },
                  transition: 'all 0.25s ease',
                  animation: 'botPulse 2.5s ease-in-out infinite',
                },
                '@keyframes botPulse': {
                  '0%, 100%': { boxShadow: '0 6px 28px rgba(47,107,255,0.45), 0 2px 8px rgba(246,137,20,0.3)' },
                  '50%': { boxShadow: '0 8px 38px rgba(47,107,255,0.65), 0 4px 14px rgba(246,137,20,0.5)' },
                },
              }}
            >
              <SpeedDialAction
                icon={<MenuBookIcon sx={{ color: '#fff', fontSize: 22 }} />}
                tooltipTitle={<Typography sx={{ fontFamily: oswald, fontWeight: 500, fontSize: '0.85rem' }}>Study Mode</Typography>}
                onClick={() => { setBotMode('study'); setMessages([]); setOpen(true); }}
                sx={{ 
                  bgcolor: '#f59e0b',
                  width: 48, height: 48,
                  boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
                  '&:hover': { bgcolor: '#d97706', transform: 'scale(1.1)' },
                  transition: 'all 0.2s ease'
                }}
              />
              <SpeedDialAction
                icon={<DashboardIcon sx={{ color: '#fff', fontSize: 22 }} />}
                tooltipTitle={<Typography sx={{ fontFamily: oswald, fontWeight: 500, fontSize: '0.85rem' }}>Dashboard Mode</Typography>}
                onClick={() => { setBotMode('dashboard'); setMessages([]); setOpen(true); }}
                sx={{ 
                  bgcolor: '#3b82f6',
                  width: 48, height: 48,
                  boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
                  '&:hover': { bgcolor: '#2563eb', transform: 'scale(1.1)' },
                  transition: 'all 0.2s ease'
                }}
              />
            </SpeedDial>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <MotionBox
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            id="platform-bot-window"
            sx={{
              position: 'fixed',
              bottom: isMobile ? 0 : 20,
              right: isMobile ? 0 : 20,
              width: isMobile ? '100vw' : 400,
              height: isMobile ? '100dvh' : 560,
              maxHeight: '90dvh',
              zIndex: 1500,
              display: 'flex', flexDirection: 'column',
              borderRadius: isMobile ? 0 : '20px',
              overflow: 'hidden',
              border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* ── Header ── */}
            <Box sx={{
              px: 2.5, py: 1.8,
              background: 'linear-gradient(135deg, rgba(15,20,55,0.97), rgba(25,35,80,0.97))',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{
                  width: 36, height: 36,
                  background: 'linear-gradient(135deg, #2f6bff, #f68914)',
                  boxShadow: '0 4px 14px rgba(47,107,255,0.35)',
                }}>
                  <SparkleIcon sx={{ fontSize: 20 }} />
                </Avatar>
                <Box>
                  <Typography sx={{
                    fontFamily: oswald, fontWeight: 700, fontSize: '1rem',
                    color: '#fff', letterSpacing: '0.04em',
                  }}>
                    SL Assistant — {botMode === 'study' ? 'Study' : 'Dashboard'}
                  </Typography>
                  <Typography sx={{
                    fontSize: '0.68rem', color: '#6ee7b7', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                  }}>
                    <Box component="span" sx={{
                      width: 6, height: 6, borderRadius: '50%', bgcolor: '#6ee7b7',
                      display: 'inline-block',
                    }} />
                    Online
                  </Typography>
                </Box>
              </Stack>
              <IconButton onClick={() => setOpen(false)} sx={{ color: '#aab4dd', '&:hover': { color: '#fff' } }}>
                <CloseIcon />
              </IconButton>
            </Box>

            {/* ── Messages ── */}
            <Box
              ref={scrollRef}
              sx={{
                flex: 1, overflowY: 'auto', px: 2, py: 2,
                background: 'linear-gradient(180deg, rgba(9,14,42,0.95), rgba(12,18,50,0.98))',
                display: 'flex', flexDirection: 'column', gap: 1.5,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2 },
              }}
            >
              {messages.map((msg, idx) => (
                <Fade in key={idx} timeout={300}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <Box sx={{
                      maxWidth: '85%',
                      px: 2, py: 1.5,
                      borderRadius: msg.role === 'user'
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                        : 'rgba(255,255,255,0.06)',
                      border: msg.role === 'user'
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.08)',
                      color: msg.role === 'user' ? '#fff' : '#d1d5f0',
                      boxShadow: msg.role === 'user'
                        ? '0 4px 14px rgba(37,99,235,0.25)'
                        : 'none',
                    }}>
                      {msg.role === 'user' ? (
                        <Typography variant="body2" sx={{ fontSize: '0.84rem', lineHeight: 1.5 }}>
                          {msg.text}
                        </Typography>
                      ) : (
                        <>
                          {renderBotText(msg.text)}
                          {msg.link && (
                            <Chip
                              label={`Go to ${msg.link.replace(/[/-]/g, ' ').trim()} →`}
                              onClick={() => handleNavLink(msg.link)}
                              icon={<NavIcon sx={{ fontSize: 16 }} />}
                              size="small"
                              sx={{
                                mt: 1, fontWeight: 600, fontSize: '0.72rem',
                                background: 'rgba(47,107,255,0.18)',
                                color: '#93c5fd', border: '1px solid rgba(47,107,255,0.25)',
                                cursor: 'pointer',
                                '&:hover': { background: 'rgba(47,107,255,0.3)' },
                              }}
                            />
                          )}
                        </>
                      )}
                      <Typography sx={{
                        fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)',
                        mt: 0.5, textAlign: msg.role === 'user' ? 'right' : 'left',
                      }}>
                        {msg.time?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                </Fade>
              ))}

              {/* Typing indicator */}
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                  <Box sx={{
                    display: 'flex', gap: 0.5, px: 2, py: 1.2,
                    borderRadius: '16px 16px 16px 4px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {[0, 1, 2].map(i => (
                      <Box key={i} sx={{
                        width: 7, height: 7, borderRadius: '50%',
                        bgcolor: '#6ee7b7',
                        animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                        '@keyframes typingBounce': {
                          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                          '30%': { transform: 'translateY(-6px)', opacity: 1 },
                        },
                      }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            {/* ── Suggestions ── */}
            {suggestions.length > 0 && (
              <Box sx={{
                px: 2, py: 1,
                background: 'rgba(9,14,42,0.92)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexWrap: 'wrap', gap: 0.75,
              }}>
                {suggestions.slice(0, 4).map((s, i) => (
                  <Chip
                    key={i}
                    label={s}
                    size="small"
                    onClick={() => sendMessage(s)}
                    sx={{
                      fontSize: '0.7rem', fontWeight: 600,
                      background: 'rgba(255,255,255,0.06)',
                      color: '#c7d2fe',
                      border: '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      '&:hover': {
                        background: 'rgba(47,107,255,0.15)',
                        borderColor: 'rgba(47,107,255,0.3)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </Box>
            )}

            {/* ── Input ── */}
            <Box sx={{
              px: 2, py: 1.5,
              background: 'rgba(9,14,42,0.97)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask me anything..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="off"
                id="platform-bot-input"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    fontSize: '0.84rem',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  },
                  '& .MuiInputBase-input::placeholder': { color: '#7e8abb', opacity: 1 },
                }}
              />
              <IconButton
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                id="platform-bot-send"
                sx={{
                  width: 40, height: 40, borderRadius: '12px',
                  background: input.trim() ? 'linear-gradient(135deg, #2f6bff, #3b82f6)' : 'rgba(255,255,255,0.06)',
                  color: input.trim() ? '#fff' : '#7e8abb',
                  boxShadow: input.trim() ? '0 4px 12px rgba(47,107,255,0.3)' : 'none',
                  '&:hover': input.trim() ? {
                    background: 'linear-gradient(135deg, #1d5ae0, #2563eb)',
                  } : {},
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? <CircularProgress size={18} sx={{ color: '#7e8abb' }} /> : <SendIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Box>
          </MotionBox>
        )}
      </AnimatePresence>
    </>
  );
}
