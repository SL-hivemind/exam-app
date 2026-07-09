import React from 'react';
import { Box, Typography,  Stack, Chip } from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import WavingHandIcon from '@mui/icons-material/WavingHand';
import useAuth from '../../hooks/useAuth';
import { getDashboardSections } from './dashboardNav';
import { ActionCard } from '../common';

const ROLE_LABEL = {
  admin: 'Platform Administrator',
  school_admin: 'School Administrator',
  subject_specialist: 'Subject Specialist',
};

/**
 * Landing page for admin / school_admin / subject_specialist. Surfaces all
 * permitted actions as organized glass cards in the main screen instead of
 * dropping the user straight onto a sub-page.
 */
export default function DashboardHome() {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const sections = getDashboardSections(user?.role);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Box>
      {/* Welcome banner */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        sx={{
          position: 'relative', overflow: 'hidden', borderRadius: '22px', mb: 4,
          p: { xs: 3, md: 4 },
          background: 'linear-gradient(120deg, rgba(47,107,255,0.18), rgba(246,137,20,0.14))',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Box sx={{
          position: 'absolute', top: -40, right: -30, width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(246,137,20,0.35), transparent 65%)', filter: 'blur(20px)',
        }} />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, position: 'relative' }}>
          <WavingHandIcon sx={{ color: '#ffb054', fontSize: 22 }} />
          <Chip
            size="small"
            label={ROLE_LABEL[user?.role] || 'Dashboard'}
            sx={{ bgcolor: 'rgba(246,137,20,0.16)', color: '#ffce9e', border: '1px solid rgba(246,137,20,0.30)', fontWeight: 700 }}
          />
        </Stack>
        <Typography variant="h4" sx={{ fontWeight: 800, position: 'relative', color: '#f5f8ff' }}>
          {greeting}, {user?.username || 'there'}.
        </Typography>
        <Typography sx={{ color: '#b4c0e4', mt: 0.75, position: 'relative', maxWidth: 620 }}>
          Choose where you’d like to go. Everything you can manage is laid out below.
        </Typography>
      </Box>

      {/* Action sections */}
      {sections.map((section, si) => (
        <Box key={section.title} sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <Box sx={{ width: 4, height: 20, borderRadius: 2, background: 'linear-gradient(#2f6bff,#f68914)' }} />
            <Typography sx={{ fontWeight: 700, color: '#f5f8ff', letterSpacing: '-0.01em' }}>
              {section.title}
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.08)' }} />
          </Stack>
          <Grid container spacing={2.5}>
            {section.items.map((item, ii) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.path}>
                <Box
                  component={motion.div}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.04 * ii + 0.05 * si }}
                  sx={{ height: '100%' }}
                >
                  <ActionCard
                    icon={item.icon}
                    title={item.text}
                    description={item.desc}
                    color={item.color}
                    onClick={() => navigate(item.path)}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
