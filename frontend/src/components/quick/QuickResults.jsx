import React from 'react';
import {
  Box, Typography, Card, Chip, Button, LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';
import MatrixFormatter from '../../utils/MatrixFormatter';
import HomeIcon from '@mui/icons-material/Home';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const ff = "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function QuickResults() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const result = location.state?.result;
  const questions = location.state?.questions || [];

  if (!result) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'transparent', p: 3 }}>
        <Card sx={{ maxWidth: 400, p: 4, borderRadius: '20px', textAlign: 'center' }}>
          <Typography sx={{ fontFamily: ff, fontWeight: 700, mb: 2 }}>No results found</Typography>
          <Button onClick={() => navigate(`/quick/${code}`)} variant="outlined"
            sx={{ fontFamily: ff, textTransform: 'none', borderRadius: '10px' }}>Go Back</Button>
        </Card>
      </Box>
    );
  }

  const { name, score, total, percentage, answer_key, user_answers } = result;
  const passed = percentage >= 60;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: passed
        ? 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)'
        : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)',
      p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Score Card */}
      <Card sx={{
        maxWidth: 500, width: '100%', borderRadius: '24px', p: { xs: 3, md: 4 },
        textAlign: 'center', mb: 3, boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Trophy or X */}
        <Box sx={{
          width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 2,
          background: passed ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'linear-gradient(135deg, #dc2626, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: passed ? '0 8px 30px rgba(34,197,94,0.4)' : '0 8px 30px rgba(239,68,68,0.4)',
        }}>
          {passed ? <EmojiEventsIcon sx={{ fontSize: 40, color: '#fff' }} /> : <CancelIcon sx={{ fontSize: 40, color: '#fff' }} />}
        </Box>

        <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.3rem', color: '#eaf0ff', mb: 0.5 }}>
          {passed ? 'Congratulations!' : 'Keep Trying!'}
        </Typography>
        <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#a9b4dd', mb: 3 }}>
          {name}
        </Typography>

        {/* Score Display */}
        <Box sx={{
          p: 3, borderRadius: '18px', mb: 3,
          background: 'linear-gradient(135deg, #f8fafc, rgba(255,255,255,0.06))',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <Typography sx={{ fontFamily: ff, fontWeight: 900, fontSize: '3rem', color: passed ? '#16a34a' : '#ef4444', lineHeight: 1 }}>
            {score}/{total}
          </Typography>
          <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#a9b4dd', mt: 1 }}>
            {percentage}%
          </Typography>
          <LinearProgress
            variant="determinate" value={percentage}
            sx={{
              mt: 2, height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.12)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: passed ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #dc2626, #ef4444)',
              }
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Chip label={`Correct: ${score}`} icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(34,197,94,0.1)', color: '#16a34a', '& .MuiChip-icon': { color: '#16a34a' } }} />
          <Chip label={`Wrong: ${total - score}`} icon={<CancelIcon sx={{ fontSize: 16 }} />}
            sx={{ fontFamily: ff, fontWeight: 700, bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444', '& .MuiChip-icon': { color: '#ef4444' } }} />
        </Box>
      </Card>

      {/* Answer Review */}
      <Card sx={{ maxWidth: 700, width: '100%', borderRadius: '20px', p: { xs: 2, md: 3 }, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
        <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: '1.1rem', color: '#eaf0ff', mb: 2 }}>
          Answer Review
        </Typography>
        {questions.map((q) => {
          const idx = String(q.order_index);
          const userA = (user_answers[idx] || '').toUpperCase();
          const correctA = (answer_key[idx] || '').toUpperCase();
          const isCorrect = userA === correctA;
          const opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;

          return (
            <Box key={q.id} sx={{
              mb: 2, p: 2, borderRadius: '14px',
              bgcolor: isCorrect ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
              border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                {isCorrect
                  ? <CheckCircleIcon sx={{ fontSize: 20, color: '#16a34a', mt: 0.3 }} />
                  : <CancelIcon sx={{ fontSize: 20, color: '#ef4444', mt: 0.3 }} />}
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.88rem', color: '#eaf0ff', flex: 1, whiteSpace: 'pre-wrap' }}>
                    Q{q.order_index}. <MatrixFormatter text={q.question_text} />
                  </Typography>
              </Box>
              <Box sx={{ pl: 3.5 }}>
                {['A', 'B', 'C', 'D'].map(letter => {
                  const isUserChoice = userA === letter;
                  const isCorrectOpt = correctA === letter;
                  let color = '#64748b';
                  let fontWeight = 400;
                  if (isCorrectOpt) { color = '#16a34a'; fontWeight = 700; }
                  else if (isUserChoice && !isCorrectOpt) { color = '#ef4444'; fontWeight = 600; }
                    return (
                      <Typography key={letter} sx={{ fontFamily: ff, fontSize: '0.82rem', color, fontWeight, mb: 0.3, whiteSpace: 'pre-wrap' }}>
                        {letter}) <MatrixFormatter text={opts[letter] || ''} /> {isCorrectOpt ? ' ✅' : ''}{isUserChoice && !isCorrectOpt ? ' ❌' : ''}
                      </Typography>
                    );
                })}
                {!userA && (
                  <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#aeb9e0', fontStyle: 'italic' }}>
                    Not answered — Correct: {correctA}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Card>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button onClick={() => navigate(`/quick/${code}`)} variant="outlined" startIcon={<ReplayIcon />}
          sx={{ fontFamily: ff, textTransform: 'none', borderRadius: '12px', fontWeight: 600,
            color: '#fff', borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          Take Again
        </Button>
        <Button onClick={() => navigate('/quick')} variant="contained" startIcon={<HomeIcon />}
          sx={{ fontFamily: ff, textTransform: 'none', borderRadius: '12px', fontWeight: 700,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            '&:hover': { background: 'rgba(255,255,255,0.25)' } }}>
          Home
        </Button>
      </Box>
    </Box>
  );
}
