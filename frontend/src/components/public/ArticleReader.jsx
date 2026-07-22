import React, { useEffect, useRef } from "react";
import {
  Box, Chip, Dialog, IconButton, Slide, Stack, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import { g } from "../games/gameTheme";
import { TOPICS } from "../../data/thinklets";

/**
 * Full-screen reading view for one Thinklet.
 *
 * Replaces the hover-flip card the page used before. A flip needs a mouse, so
 * on a phone the entire description was unreachable; worse, it capped an
 * article at whatever fitted on the back of a card. This opens as a sheet from
 * the bottom on small screens and a centred dialog on large ones, which is the
 * pattern students already meet everywhere else on a phone.
 *
 * Measure is capped at ~68 characters. Long lines are the single easiest way
 * to make a page tiring to read, and this is a page whose only job is reading.
 */

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ArticleReader({ article, open, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const bodyRef = useRef(null);

  // Reopening a different article must not inherit the last one's scroll.
  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [open, article?.id]);

  if (!article) return null;

  const topic = TOPICS.find((t) => t.id === article.topic);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      TransitionComponent={fullScreen ? SlideUp : undefined}
      scroll="paper"
      aria-labelledby="reader-title"
      PaperProps={{
        sx: {
          bgcolor: "#111a35",
          backgroundImage: "none",
          borderRadius: { xs: 0, sm: 4 },
          border: { sm: `1px solid ${g.border}` },
        },
      }}
    >
      {/* Header stays put so the way out is always one tap away. */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 2, py: 1.5, position: "sticky", top: 0, zIndex: 2,
          bgcolor: "rgba(17,26,53,0.92)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${g.border}`,
        }}
      >
        {topic && (
          <Chip
            size="small"
            label={topic.label}
            sx={{
              bgcolor: `${topic.hue}22`, color: topic.hue,
              border: `1px solid ${topic.hue}55`, fontWeight: 700,
              "& .MuiChip-label": { color: "inherit" },
            }}
          />
        )}
        <Chip
          size="small"
          icon={<AccessTimeIcon sx={{ fontSize: 15 }} />}
          label={`${article.minutes} min`}
          sx={{
            bgcolor: "rgba(255,255,255,0.07)", color: g.textSoft, fontWeight: 600,
            "& .MuiChip-icon": { color: `${g.textSoft} !important` },
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose} aria-label="Close article" sx={{ color: g.textSoft }}>
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box ref={bodyRef} sx={{ overflowY: "auto" }}>
        <Box
          component="img"
          src={article.image}
          alt=""
          sx={{ width: "100%", height: { xs: 180, sm: 220 }, objectFit: "cover", display: "block" }}
        />

        <Box sx={{ px: { xs: 2.5, sm: 4 }, py: { xs: 3, sm: 4 }, maxWidth: "68ch", mx: "auto" }}>
          <Typography
            id="reader-title"
            variant="h4"
            component="h1"
            sx={{
              color: "#fff", fontWeight: 800, lineHeight: 1.2, mb: 3,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: { xs: "1.6rem", sm: "2rem" },
            }}
          >
            {article.title}
          </Typography>

          {article.body.map((block, i) => {
            if (block.type === "heading") {
              return (
                <Typography
                  key={i}
                  variant="h6"
                  component="h2"
                  sx={{
                    color: g.accent, fontWeight: 800, mt: 4, mb: 1.5,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: { xs: "1.05rem", sm: "1.15rem" },
                  }}
                >
                  {block.text}
                </Typography>
              );
            }

            if (block.type === "points") {
              return (
                <Box
                  key={i}
                  component="ul"
                  sx={{
                    my: 3, pl: 0, listStyle: "none",
                    borderLeft: `3px solid ${g.accent}`,
                    bgcolor: "rgba(246,137,20,0.06)",
                    borderRadius: "0 12px 12px 0", py: 2, pr: 2,
                  }}
                >
                  {block.items.map((item, k) => (
                    <Box
                      component="li"
                      key={k}
                      sx={{
                        color: g.text, pl: 2.5, position: "relative",
                        mb: k === block.items.length - 1 ? 0 : 1.25,
                        fontSize: { xs: "0.95rem", sm: "1rem" }, lineHeight: 1.65,
                        "&::before": {
                          content: '""', position: "absolute", left: 12, top: "0.62em",
                          width: 5, height: 5, borderRadius: "50%", bgcolor: g.accent,
                        },
                      }}
                    >
                      {item}
                    </Box>
                  ))}
                </Box>
              );
            }

            const isLead = block.type === "lead";
            const isClosing = block.type === "closing";
            return (
              <Typography
                key={i}
                sx={{
                  color: isLead ? "#fff" : g.text,
                  fontSize: isLead
                    ? { xs: "1.05rem", sm: "1.15rem" }
                    : { xs: "0.97rem", sm: "1.05rem" },
                  fontWeight: isLead ? 500 : 400,
                  lineHeight: 1.75,
                  mb: 2.5,
                  ...(isClosing && {
                    mt: 4, pt: 3, borderTop: `1px solid ${g.border}`, color: g.textSoft,
                    fontStyle: "italic",
                  }),
                }}
              >
                {block.text}
              </Typography>
            );
          })}

          {article.source && (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              component="a"
              href={article.source}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                mt: 3, color: g.info, textDecoration: "none", fontWeight: 700,
                fontSize: "0.9rem", "&:hover": { textDecoration: "underline" },
              }}
            >
              <span>Read the source</span>
              <OpenInNewIcon sx={{ fontSize: 15 }} />
            </Stack>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
