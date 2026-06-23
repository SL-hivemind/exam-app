import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Container, Stack, IconButton } from "@mui/material";

import SplitText from "./ui/SplitText";
import BlurText from "./ui/BlurText";
import LightRays from "./ui/LightRays";
import Squares from "./ui/Squares";
import Particles from "./ui/Particles";
import Waves from "./ui/Waves";
import DomeGallery from "./ui/DomeGallery";

/* ── Fonts ── */
const oswald = "'Oswald', sans-serif";
const inter = "'Inter', sans-serif";

/* ── Animated Counter Hook ── */
function useCountUp(target, duration = 2000, trigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [trigger, target, duration]);
  return count;
}

/* ── Stat Card ── */
function StatCard({ value, suffix = "+", label, delay = 0 }) {
  const ref = useRef();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const num = useCountUp(value, 2000, visible);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay }}>
      <Box sx={{ textAlign: 'center', p: { xs: 3, md: 4 }, borderRadius: '20px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', transition: 'all 0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', transform: 'translateY(-4px)' } }}>
        <Typography sx={{ fontFamily: oswald, fontSize: { xs: '2.8rem', md: '3.5rem' }, fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #f68914)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {num}{suffix}
        </Typography>
        <Typography sx={{ fontFamily: inter, color: '#9fb0d6', fontWeight: 500, fontSize: '0.95rem', mt: 0.5 }}>{label}</Typography>
      </Box>
    </motion.div>
  );
}

/* ── Data ── */
const examPillars = [
  {
    title: "SCHOOL EXAMS",
    icon: "🏫",
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
    border: "rgba(59,130,246,0.3)",
    desc: "Proctored, timed assessments managed by schools. Tab-switch detection, auto-submit, and detailed analytics for every student.",
    features: ["Timed & Proctored", "Anti-Cheat Detection", "Result Analytics & Rankings", "School Admin Dashboard"],
    cta: "Student Login",
    link: "/login",
  },
  {
    title: "PUBLIC EXAMS",
    icon: "🌍",
    gradient: "linear-gradient(135deg, rgba(246,137,20,0.15), rgba(246,137,20,0.05))",
    border: "rgba(246,137,20,0.3)",
    desc: "Open course catalog for anyone. Browse subjects, enroll in courses, practice with unlimited attempts, and take timed assessments.",
    features: ["Open Registration", "Course-Based Structure", "Practice & Timed Modes", "Progress Tracking"],
    cta: "Explore Courses",
    link: "/public",
  },
  {
    title: "QUICK EXAMS",
    icon: "⚡",
    gradient: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))",
    border: "rgba(34,197,94,0.3)",
    desc: "Zero sign-up instant exams. Teachers share a code, students enter their name and start. Results delivered immediately.",
    features: ["No Registration Needed", "Shareable Exam Code", "Instant Results", "Perfect for Classrooms"],
    cta: "Enter Exam Code",
    link: "/quick",
  },
];

const steps = [
  { num: "01", title: "Register", desc: "Create an account to access the dashboard.", icon: "📝" },
  { num: "02", title: "Choose Exam", desc: "Browse school assignments or public courses.", icon: "📋" },
  { num: "03", title: "Take Assessment", desc: "Secure, timed interface with anti-cheat proctoring built in.", icon: "✍️" },
  { num: "04", title: "Get Results", desc: "Instant scoring, detailed analytics, rankings, and performance insights.", icon: "📊" },
];

const features = [
  { title: "Secure Proctoring", desc: "Tab-switch detection & auto-submit keeps assessments fair.", icon: "🔒" },
  { title: "Real-time Analytics", desc: "Charts, rankings, subject-wise breakdown for every student.", icon: "📈" },
  { title: "Multi-Role Dashboard", desc: "Admin, School, Specialist, Student — each gets a tailored view.", icon: "👥" },
  { title: "Question Repository", desc: "Curated question bank with tagging, difficulty levels, and bulk import.", icon: "🗃️" },
  { title: "NEP 2020 Aligned", desc: "Content and assessments designed around India's education policy.", icon: "🎯" },
  { title: "DPIIT Recognized", desc: "Government-recognized startup committed to education innovation.", icon: "🏛️" },
];

const galleryPhotos = [
  { id: 1, image: 'https://e2eindia.org/images/gallery/_6.jpg' },
  { id: 2, image: 'https://e2eindia.org/images/gallery/new-gal-1.jpg' },
  { id: 3, image: 'https://yt3.ggpht.com/BCuzBBeyi0YSo_g_VuDTc1MSzEXZzstSJNHsBk2O4h_T6nY3JBm5CGDNRKljVoZGa6LvAChmmu1A9g=s628-c-fcrop64=1,00004133ffffbecc-rw-nd-v1' },
  { id: 4, image: 'https://e2eindia.org/images/gallery/new-gal-3.jpg' },
  { id: 5, image: 'https://e2eindia.org/images/gallery/_9.jpg' },
  { id: 6, image: 'https://yt3.ggpht.com/QDt4RdMrVmJBcMTkrpjbrmhOSHryXhOZP9LU1sw3tBEhwNE0RcSqNCwP3wo7iGYQ2JKmYZFAC7PZkQ=s640-c-fcrop64=1,20000000dfffffff-rw-nd-v1' },
  { id: 7, image: 'https://e2eindia.org/images/gallery/new-gal-4.jpg' },
  { id: 8, image: 'https://e2eindia.org/images/gallery/_11.jpg' },
  { id: 9, image: 'https://yt3.ggpht.com/EMy1VhGR9qBsiJOa7D2Nl6jTaXZivYuxuDgPyE8BzLZVQNRQUW6UUnFa7_A5lCSyL7vJztevnt4wvg=s640-c-fcrop64=1,35e60000ca19ffff-rw-nd-v1' },
];

const stats = [
  { value: 150, suffix: "+", label: "Schools Onboarded" },
  { value: 8000, suffix: "+", label: "Students Assessed" },
  { value: 25000, suffix: "+", label: "Exams Conducted" },
  { value: 50000, suffix: "+", label: "Questions in Repository" },
];

/* ══════════════════════════ MAIN ══════════════════════════ */
export default function Home() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: "transparent", minHeight: "100vh", overflowX: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap');`}</style>

      {/* ═══ 1. HERO ═══ */}
      <Box id="hero" sx={{ position: "relative", minHeight: "100vh", display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <LightRays raysOrigin="top-center" raysColor="#3b82f6" raysSpeed={0.4} lightSpread={1.2} rayLength={2.5} fadeDistance={1.2} saturation={0.7} followMouse mouseInfluence={0.05} />
        </Box>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.25 }}>
          <Squares direction="Right" speed={0.3} borderColor="rgba(255,255,255,0.04)" squareSize={70} hoverFillColor="rgba(59,130,246,0.08)" />
        </Box>

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center', pt: { xs: 14, md: 0 } }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }}>
            <Box sx={{ mb: 2 }}>
              <SplitText
                text="THE EXAM ECOSYSTEM"
                style={{ fontFamily: oswald, fontSize: 'clamp(2rem, 6vw, 5rem)', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.05, color: '#fff', textAlign: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}
                delay={60}
              />
            </Box>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}>
            <BlurText
              text="Secure. Intelligent. Instant."
              delay={300}
              style={{ fontFamily: oswald, fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 300, letterSpacing: '0.15em', color: '#9fb0d6', justifyContent: 'center', textTransform: 'uppercase' }}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.1 }}>
            <Typography sx={{ fontFamily: inter, fontSize: '0.85rem', color: '#8a9ac4', mt: 1, mb: 1, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Powered by Saaradaa Learknowations Pvt Ltd
            </Typography>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.4 }}>
            <Typography sx={{ fontFamily: inter, color: '#8a9ac4', fontSize: { xs: '0.95rem', md: '1.1rem' }, maxWidth: 600, mx: 'auto', mt: 3, mb: 5, lineHeight: 1.8 }}>
              A comprehensive assessment platform for schools, aspirants, and educators.
              From proctored school tests to instant quick exams — all in one place.
            </Typography>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.8 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button variant="contained" size="large" onClick={() => navigate('/login')} sx={{ fontFamily: oswald, px: 5, py: 1.8, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', borderRadius: '14px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 8px 30px rgba(37,99,235,0.35)', transition: 'all 0.3s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 40px rgba(37,99,235,0.5)' } }}>
                LOGIN / DASHBOARD
              </Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/public')} sx={{ fontFamily: oswald, px: 5, py: 1.8, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', borderRadius: '14px', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', color: '#c7d2fe', transition: 'all 0.3s', '&:hover': { borderColor: '#f68914', color: '#fff', transform: 'translateY(-3px)' } }}>
                EXPLORE PUBLIC EXAMS
              </Button>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      {/* ═══ 2. EXAM PILLARS ═══ */}
      <Box id="exams" sx={{ py: { xs: 10, md: 14 }, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.5 }}>
          <Particles particleCount={30} particleColor="#475569" lineColor="rgba(255,255,255,0.06)" speed={0.2} linkDistance={160} />
        </Box>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Box textAlign="center" mb={8}>
              <Typography sx={{ fontFamily: oswald, display: 'inline-block', px: 3, py: 0.5, mb: 2, borderRadius: 20, fontWeight: 600, letterSpacing: 4, fontSize: '0.85rem', bgcolor: 'rgba(148,163,255,0.12)', border: '1px solid rgba(148,163,255,0.20)', color: '#c7d2fe', textTransform: 'uppercase' }}>
                TWO PILLARS
              </Typography>
              <Typography sx={{ fontFamily: oswald, fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, background: 'linear-gradient(120deg,#ffffff,#c7d2fe 75%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1.5 }}>
                EXAM MODULES
              </Typography>
              <Typography sx={{ fontFamily: inter, color: '#9fb0d6', maxWidth: 600, mx: 'auto', fontSize: '1.05rem', lineHeight: 1.7 }}>
                Choose the exam format that fits your needs — from school-managed assessments to open public courses.
              </Typography>
            </Box>
          </motion.div>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4, maxWidth: 900, mx: 'auto' }}>
            {examPillars.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.15 }}>
                <Box sx={{
                  p: 4, borderRadius: '24px', height: '100%', display: 'flex', flexDirection: 'column',
                  background: p.gradient, border: `1px solid ${p.border}`,
                  backdropFilter: 'blur(16px)', transition: 'all 0.4s ease',
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 20px 50px rgba(0,0,0,0.2)` },
                }}>
                  <Typography sx={{ fontSize: '3rem', mb: 2 }}>{p.icon}</Typography>
                  <Typography sx={{ fontFamily: oswald, fontWeight: 700, fontSize: '1.6rem', color: '#fff', letterSpacing: '0.04em', mb: 1.5 }}>
                    {p.title}
                  </Typography>
                  <Typography sx={{ fontFamily: inter, color: '#9fb0d6', fontSize: '0.92rem', lineHeight: 1.7, mb: 3, flex: 1 }}>
                    {p.desc}
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    {p.features.map((f) => (
                      <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: p.border, flexShrink: 0 }} />
                        <Typography sx={{ fontFamily: inter, color: '#b4c0e4', fontSize: '0.85rem', fontWeight: 500 }}>{f}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button fullWidth variant="outlined" onClick={() => navigate(p.link)} sx={{
                    fontFamily: oswald, fontWeight: 600, letterSpacing: '0.06em', fontSize: '0.95rem',
                    borderRadius: '12px', py: 1.3, borderColor: p.border, color: '#fff',
                    '&:hover': { bgcolor: p.border, borderColor: p.border },
                  }}>
                    {p.cta}
                  </Button>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ═══ 3. HOW IT WORKS ═══ */}
      <Box id="how-it-works" sx={{ py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Box textAlign="center" mb={8}>
              <Typography sx={{ fontFamily: oswald, display: 'inline-block', px: 3, py: 0.5, mb: 2, borderRadius: 20, fontWeight: 600, letterSpacing: 4, fontSize: '0.85rem', bgcolor: 'rgba(148,163,255,0.12)', border: '1px solid rgba(148,163,255,0.20)', color: '#c7d2fe', textTransform: 'uppercase' }}>
                WORKFLOW
              </Typography>
              <Typography sx={{ fontFamily: oswald, fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, background: 'linear-gradient(120deg,#ffffff,#c7d2fe 75%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                HOW IT WORKS
              </Typography>
            </Box>
          </motion.div>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 4 }}>
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}>
                <Box sx={{ textAlign: 'center', position: 'relative' }}>
                  <Typography sx={{ fontFamily: oswald, fontSize: '4rem', fontWeight: 700, color: 'rgba(59,130,246,0.12)', lineHeight: 1 }}>{s.num}</Typography>
                  <Typography sx={{ fontSize: '2.5rem', mt: -1, mb: 2 }}>{s.icon}</Typography>
                  <Typography sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '1.2rem', color: '#fff', letterSpacing: '0.04em', mb: 1 }}>{s.title}</Typography>
                  <Typography sx={{ fontFamily: inter, color: '#8a9ac4', fontSize: '0.88rem', lineHeight: 1.6 }}>{s.desc}</Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ═══ 4. STATS ═══ */}
      <Box id="stats" sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
            {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.1} />)}
          </Box>
        </Container>
      </Box>

      {/* ═══ 5. WHY SL EXAMS ═══ */}
      <Box id="why" sx={{ py: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Box textAlign="center" mb={8}>
              <Typography sx={{ fontFamily: oswald, display: 'inline-block', px: 3, py: 0.5, mb: 2, borderRadius: 20, fontWeight: 600, letterSpacing: 4, fontSize: '0.85rem', bgcolor: 'rgba(148,163,255,0.12)', border: '1px solid rgba(148,163,255,0.20)', color: '#c7d2fe', textTransform: 'uppercase' }}>
                PLATFORM
              </Typography>
              <Typography sx={{ fontFamily: oswald, fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, background: 'linear-gradient(120deg,#ffffff,#c7d2fe 75%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                WHY SL EXAMS
              </Typography>
            </Box>
          </motion.div>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}>
                <Box sx={{
                  p: 3.5, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  transition: 'all 0.3s', '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', transform: 'translateY(-4px)' },
                }}>
                  <Typography sx={{ fontSize: '2rem', mb: 1.5 }}>{f.icon}</Typography>
                  <Typography sx={{ fontFamily: oswald, fontWeight: 600, fontSize: '1.15rem', color: '#fff', letterSpacing: '0.03em', mb: 1 }}>{f.title}</Typography>
                  <Typography sx={{ fontFamily: inter, color: '#8a9ac4', fontSize: '0.88rem', lineHeight: 1.6 }}>{f.desc}</Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ═══ 6. E2E INDIA CTA ═══ */}
      <Box sx={{ position: 'relative', py: { xs: 10, md: 14 }, overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.5 }}>
          <Waves lineColor="rgba(246,137,20,0.5)" speed={0.02} />
        </Box>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Typography sx={{ fontFamily: oswald, fontWeight: 700, fontSize: { xs: '1.8rem', md: '2.8rem' }, color: '#fff', letterSpacing: '0.03em', mb: 2 }}>
              MORE THAN JUST EXAMS
            </Typography>
            <Typography sx={{ fontFamily: inter, color: '#9fb0d6', fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.8, mb: 5, maxWidth: 550, mx: 'auto' }}>
              Discover publications, school lab setups, SJIS research journal, English LSRW programs, and the complete E2E India ecosystem.
            </Typography>
            <Button variant="contained" size="large" onClick={() => window.open('https://e2eindia.org', '_blank')} sx={{
              fontFamily: oswald, px: 6, py: 1.8, fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.06em',
              borderRadius: '14px', background: 'linear-gradient(135deg, #f68914, #ff9a3c)',
              boxShadow: '0 8px 30px rgba(246,137,20,0.35)', color: '#fff',
              transition: 'all 0.3s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 40px rgba(246,137,20,0.5)' },
            }}>
              VISIT E2E INDIA →
            </Button>
          </motion.div>
        </Container>
      </Box>

      {/* ═══ 7. GALLERY ═══ */}
      <Box id="gallery" sx={{ py: { xs: 10, md: 14 }, overflow: 'hidden' }}>
        <Container maxWidth="xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Box textAlign="center" mb={8}>
              <Typography sx={{ fontFamily: oswald, display: 'inline-block', px: 3, py: 0.5, mb: 2, borderRadius: 20, fontWeight: 600, letterSpacing: 4, fontSize: '0.85rem', bgcolor: 'rgba(148,163,255,0.12)', border: '1px solid rgba(148,163,255,0.20)', color: '#c7d2fe', textTransform: 'uppercase' }}>
                GALLERY
              </Typography>
              <Typography sx={{ fontFamily: oswald, fontWeight: 700, fontSize: { xs: '2rem', md: '3rem' }, background: 'linear-gradient(120deg,#ffffff,#c7d2fe 75%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                OUR WORKS IN ACTION
              </Typography>
            </Box>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <DomeGallery data={galleryPhotos} />
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
}