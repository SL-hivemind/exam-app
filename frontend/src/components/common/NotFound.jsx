import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import Seo from './Seo';

/**
 * A real 404.
 *
 * The catch-all route rendered the homepage for every unknown URL, with a 200.
 * That is a soft-404 factory: Google indexes arbitrary garbage as duplicates
 * of the front page, and it was already happening — the navbar linked to
 * /register, which is not a route.
 *
 * A static host cannot return a 404 status for a client-side route, so the
 * noindex tag is what actually keeps these out of the index.
 */
export default function NotFound() {
  return (
    <>
      <Seo
        title="Page not found"
        description="This page does not exist. Browse mock tests and practice papers on SL Exams."
        noindex
      />
      <Container maxWidth="sm">
        <Box sx={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Box>
            <Typography variant="h2" fontWeight={800} sx={{ opacity: 0.25 }}>404</Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              We couldn’t find that page
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              The link may be old, or the page may have moved.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
              <Button component={RouterLink} to="/" variant="contained" sx={{ textTransform: 'none' }}>
                Go to the homepage
              </Button>
              <Button component={RouterLink} to="/public" variant="outlined" sx={{ textTransform: 'none' }}>
                Browse test series
              </Button>
            </Stack>
          </Box>
        </Box>
      </Container>
    </>
  );
}
