import React, { useCallback, useMemo, useState } from "react";
import {
  Box, Button, Chip, Container, Stack, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ExtensionIcon from "@mui/icons-material/Extension";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ArticleIcon from "@mui/icons-material/Article";
import { useNavigate } from "react-router-dom";

import { g } from "../games/gameTheme";
import { ARTICLES, BOOKS, TOPICS } from "../../data/thinklets";
import ArticleReader from "./ArticleReader";
import RiddleSection from "./RiddleSection";
import PublicGamesSection from "../games/PublicGamesSection";
import { Seo } from "../common";

/**
 * Thinklets — read, solve, play.
 *
 * The page was previously a masonry of hover-flip cards. Three problems drove
 * the rebuild: a flip needs a mouse, so on a phone the writing was simply
 * unreachable; masonry orders items down each column, so "next" on a phone is
 * nowhere near where the eye expects it; and the back of a card is a hard
 * ceiling on how much an article can say.
 *
 * Now it is a plain responsive grid — every card the same shape, reading order
 * matching visual order — with the full piece in a reader sheet. Sections are
 * separate and jumpable, because someone arriving to play a puzzle should not
 * have to scroll past twelve articles to reach it.
 */

const SECTIONS = [
  { id: "read", label: "Read", icon: <ArticleIcon sx={{ fontSize: 18 }} /> },
  { id: "riddles", label: "Riddles", icon: <LightbulbOutlinedIcon sx={{ fontSize: 18 }} /> },
  { id: "play", label: "Play", icon: <ExtensionIcon sx={{ fontSize: 18 }} /> },
  { id: "books", label: "Books", icon: <MenuBookIcon sx={{ fontSize: 18 }} /> },
];

function SectionHeading({ id, icon, title, blurb, sx }) {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        {icon}
        <Typography
          id={`${id}-heading`}
          variant="h4"
          component="h2"
          sx={{
            color: "#fff", fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-0.02em", fontSize: { xs: "1.6rem", md: "2.125rem" },
          }}
        >
          {title}
        </Typography>
      </Stack>
      {blurb && <Typography sx={{ color: g.textSoft, maxWidth: 620 }}>{blurb}</Typography>}
    </Box>
  );
}

function ArticleCard({ article, onOpen }) {
  const topic = TOPICS.find((t) => t.id === article.topic);
  return (
    <Box
      component="article"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(article)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(article);
        }
      }}
      aria-label={`${article.title} — ${article.minutes} minute read`}
      sx={{
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        bgcolor: "rgba(30, 41, 59, 0.6)",
        border: `1px solid ${g.border}`,
        borderRadius: 3,
        overflow: "hidden",
        cursor: "pointer",
        height: "100%",
        transition: "transform .18s ease, border-color .18s ease",
        "&:hover": { transform: "translateY(-4px)", borderColor: g.accent },
        "&:focus-visible": { outline: `2px solid ${g.accent}`, outlineOffset: 3 },
      }}
    >
      {/* Phone: a thumbnail beside the text, so a screenful holds three or four
          cards instead of one. Tablet up: a proper cover image. */}
      <Box
        component="img"
        src={article.image}
        alt=""
        loading="lazy"
        sx={{
          flexShrink: 0,
          width: { xs: 104, sm: "100%" },
          height: { xs: "auto", sm: 150 },
          minHeight: { xs: 104, sm: "auto" },
          objectFit: "cover",
          alignSelf: "stretch",
        }}
      />
      <Box
        sx={{
          p: { xs: 1.75, sm: 2.25 },
          display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1, flexWrap: "wrap" }}>
          {topic && (
            <Chip
              size="small"
              label={topic.label}
              sx={{
                height: 22, fontSize: "0.7rem", fontWeight: 700,
                bgcolor: `${topic.hue}22`, color: topic.hue,
                border: `1px solid ${topic.hue}44`,
                "& .MuiChip-label": { color: "inherit", px: 0.9 },
              }}
            />
          )}
          <Stack direction="row" alignItems="center" spacing={0.4} sx={{ color: g.textMuted }}>
            <AccessTimeIcon sx={{ fontSize: 13 }} />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {article.minutes} min
            </Typography>
          </Stack>
        </Stack>

        <Typography
          component="h3"
          sx={{
            color: "#fff", fontWeight: 700, lineHeight: 1.3, mb: 0.75,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: { xs: "0.98rem", sm: "1.08rem" },
          }}
        >
          {article.title}
        </Typography>

        <Typography
          sx={{
            color: g.textSoft, fontSize: { xs: "0.83rem", sm: "0.88rem" }, lineHeight: 1.5,
            display: "-webkit-box", WebkitBoxOrient: "vertical",
            WebkitLineClamp: { xs: 2, sm: 3 }, overflow: "hidden",
          }}
        >
          {article.blurb}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ThinkletsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

  const [topic, setTopic] = useState("all");
  const [reading, setReading] = useState(null);

  // The puzzles come from the server, so the Play section may legitimately not
  // exist (games switched off school-wide). Advertising a jump link to a region
  // that renders nothing is worse than not offering it at all.
  const [hasPlay, setHasPlay] = useState(true);
  const onPlayAvailability = useCallback((available) => setHasPlay(available), []);

  const sections = useMemo(
    () => SECTIONS.filter((s) => s.id !== "play" || hasPlay),
    [hasPlay]
  );

  const visible = useMemo(
    () => (topic === "all" ? ARTICLES : ARTICLES.filter((a) => a.topic === topic)),
    [topic]
  );

  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
    <Seo
      path="/thinklets"
      title="Daily Practice Puzzles & Brain Teasers for Classes 6–10"
      description="A fresh set of logic puzzles, maths riddles and reasoning questions every day for students in classes 6 to 10. Free, no sign-up needed to try."
    />
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0f172a",
        pb: { xs: 8, md: 12 },
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 5 }, pt: { xs: 3, md: 6 } }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{ color: g.textSoft, mb: { xs: 2, md: 3 }, textTransform: "none", minHeight: 44 }}
        >
          Back to Home
        </Button>

        <Typography
          variant="h3"
          component="h1"
          sx={{
            color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", mb: 1.5,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: { xs: "2.1rem", sm: "2.6rem", md: "3rem" },
          }}
        >
          Thinklets
        </Typography>
        <Typography
          sx={{
            color: g.textSoft, maxWidth: 640, fontWeight: 400,
            fontSize: { xs: "1rem", md: "1.15rem" },
          }}
        >
          Short reads, riddles and daily puzzles. Nothing here takes longer than a
          bus ride, and none of it needs an account.
        </Typography>
      </Container>

      {/* ── Sticky section jumper ── */}
      <Box
        sx={{
          position: "sticky", top: 0, zIndex: 10, mt: 3,
          bgcolor: "rgba(15,23,42,0.85)", backdropFilter: "blur(14px)",
          borderTop: `1px solid ${g.border}`, borderBottom: `1px solid ${g.border}`,
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 3, lg: 5 } }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              py: 1.25, overflowX: "auto",
              scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {sections.map((s) => (
              <Button
                key={s.id}
                onClick={() => jump(s.id)}
                startIcon={s.icon}
                sx={{
                  flexShrink: 0, minHeight: 40, color: g.textSoft, textTransform: "none",
                  fontWeight: 700, borderRadius: 999, px: 2,
                  "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.06)" },
                }}
              >
                {s.label}
              </Button>
            ))}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 5 } }}>
        {/* ── READ ── */}
        <Box
          component="section"
          id="read"
          sx={{ pt: { xs: 5, md: 7 }, scrollMarginTop: 64 }}
          aria-labelledby="read-heading"
        >
          <SectionHeading
            id="read"
            icon={<ArticleIcon sx={{ color: g.accent, fontSize: 30 }} />}
            title="Short reads"
            blurb="Pick a topic, or read straight through. Every card opens the full piece."
            sx={{ mb: 2.5 }}
          />

          {/* Topic filter. Horizontally scrollable on a phone rather than
              wrapping into rows that push the articles off screen. */}
          <Stack
            direction="row"
            spacing={1}
            role="group"
            aria-label="Filter articles by topic"
            sx={{
              mb: 3, pb: 0.5, overflowX: "auto",
              scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {TOPICS.map((t) => {
              const active = t.id === topic;
              const count =
                t.id === "all" ? ARTICLES.length : ARTICLES.filter((a) => a.topic === t.id).length;
              if (!count) return null;
              return (
                <Chip
                  key={t.id}
                  label={isSmall ? t.label : `${t.label} · ${count}`}
                  clickable
                  aria-pressed={active}
                  onClick={() => setTopic(t.id)}
                  sx={{
                    flexShrink: 0, fontWeight: 700, height: 36, borderRadius: 999,
                    bgcolor: active ? `${t.hue}26` : "rgba(255,255,255,0.05)",
                    color: active ? t.hue : g.textSoft,
                    border: `1px solid ${active ? `${t.hue}77` : g.border}`,
                    "& .MuiChip-label": { color: "inherit", px: 1.5 },
                    "&:hover": { bgcolor: active ? `${t.hue}33` : "rgba(255,255,255,0.09)" },
                  }}
                />
              );
            })}
          </Stack>

          {/* Everything at once: four across on a desktop, two on a tablet,
              a single readable column on a phone. */}
          <Box
            sx={{
              display: "grid",
              gap: { xs: 1.5, sm: 2.5 },
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
                xl: "repeat(5, 1fr)",
              },
            }}
          >
            {visible.map((article) => (
              <ArticleCard key={article.id} article={article} onOpen={setReading} />
            ))}
          </Box>
        </Box>

        {/* ── RIDDLES ── */}
        <Box sx={{ pt: { xs: 7, md: 10 } }}>
          <RiddleSection />
        </Box>

        {/* ── PLAY ── */}
        <Box id="play" sx={{ scrollMarginTop: 64 }}>
          <PublicGamesSection onAvailability={onPlayAvailability} />
        </Box>

        {/* ── BOOKS ── */}
        <Box
          component="section"
          id="books"
          sx={{ pt: { xs: 7, md: 10 }, scrollMarginTop: 64 }}
          aria-labelledby="books-heading"
        >
          <SectionHeading
            id="books"
            icon={<MenuBookIcon sx={{ color: g.accent, fontSize: 30 }} />}
            title="Worth reading"
            blurb="Four books our students keep coming back to."
          />
          <Box
            sx={{
              display: "grid",
              gap: { xs: 1.5, sm: 2.5 },
              gridTemplateColumns: {
                xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)", xl: "repeat(5, 1fr)",
              },
            }}
          >
            {BOOKS.map((book) => (
              <Box
                key={book.id}
                sx={{
                  display: "flex", flexDirection: { xs: "row", sm: "column" },
                  bgcolor: "rgba(30, 41, 59, 0.6)", border: `1px solid ${g.border}`,
                  borderRadius: 3, overflow: "hidden", height: "100%",
                }}
              >
                <Box
                  component="img"
                  src={book.cover}
                  alt={`Cover of ${book.title}`}
                  loading="lazy"
                  sx={{
                    flexShrink: 0,
                    width: { xs: 92, sm: "100%" },
                    height: { xs: "auto", sm: 200 },
                    objectFit: "cover", alignSelf: "stretch",
                  }}
                />
                <Box sx={{ p: { xs: 1.75, sm: 2.25 }, minWidth: 0 }}>
                  <Typography
                    component="h3"
                    sx={{
                      color: "#fff", fontWeight: 700, lineHeight: 1.3,
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: { xs: "0.98rem", sm: "1.05rem" },
                    }}
                  >
                    {book.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: g.accent, fontWeight: 700 }}>
                    {book.author}
                  </Typography>
                  <Typography
                    sx={{
                      color: g.textSoft, fontSize: "0.85rem", lineHeight: 1.55, mt: 1,
                      display: "-webkit-box", WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 4, overflow: "hidden",
                    }}
                  >
                    {book.summary}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1.5, pt: 1.5, borderTop: `1px solid ${g.border}`,
                      color: g.text, fontSize: "0.82rem", fontStyle: "italic",
                    }}
                  >
                    {book.moral}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>

      <ArticleReader article={reading} open={Boolean(reading)} onClose={() => setReading(null)} />
    </Box>
    </>
  );
}
