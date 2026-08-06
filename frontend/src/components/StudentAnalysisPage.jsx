import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Toolbar,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  TablePagination,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Fade,
  Grow
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Insights as InsightsIcon,
  School as SchoolIcon,
  EmojiEvents as EmojiEventsIcon,
  Search as SearchIcon,
  DonutLarge as DonutLargeIcon,
  BubbleChart as BubbleChartIcon,
  Assessment as AssessmentIcon,
  TableChart as TableChartIcon,
  AutoAwesome as AutoAwesomeIcon
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";
import InfoTip from "./common/InfoTip";
import { ComposedTrendChart, RingChart, SubjectRadarChart } from "./common/charts";

const ff = "'Inter', sans-serif";
const PALETTE = {
  blue: "#3b82f6",
  blueLight: "#60a5fa",
  green: "#34d399",
  pink: "#f472b6",
  red: "#f87171",
  amber: "#fbbf24",
  purple: "#8b5cf6",
  slate: "#334155"
};

/* --------------------------------------------------------------------- */
/* Small animated building blocks                                        */
/* --------------------------------------------------------------------- */

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function RevealBox({ children, delay = 0, sx = {} }) {
  const [ref, inView] = useInView();
  return (
    <Box
      ref={ref}
      sx={{
        height: "100%",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity .7s cubic-bezier(.16,.84,.44,1) ${delay}ms, transform .7s cubic-bezier(.16,.84,.44,1) ${delay}ms`,
        ...sx
      }}
    >
      {children}
    </Box>
  );
}

function AnimatedNumber({ value, decimals = 0, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const to = Number(value) || 0;
    let startTs = null;
    let raf;
    const step = (ts) => {
      if (startTs === null) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(to * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
      else setDisplay(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toFixed(decimals)}</>;
}

function MiniHeader({ icon, iconBg, title, subtitle }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
      <Box sx={{ p: 1, bgcolor: iconBg, borderRadius: 2, display: "flex" }}>{icon}</Box>
      <Box>
        <Typography variant="h6" fontWeight={700} sx={{ fontFamily: ff, color: "#f8fafc", fontSize: "1.05rem" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "#64748b", fontFamily: ff }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function AnimatedBar({ value, color, delayMs = 150 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return (
    <Box sx={{ height: 5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", overflow: "hidden", mt: 1.5 }}>
      <Box
        sx={{
          height: "100%",
          borderRadius: 3,
          width: visible ? `${Math.min(Math.max(value, 0), 100)}%` : "0%",
          bgcolor: color,
          transition: "width 1.3s cubic-bezier(.16,.84,.44,1)"
        }}
      />
    </Box>
  );
}

function tierFor(pct) {
  if (pct >= 75) return { label: "Excellent", color: PALETTE.green, bg: "rgba(52,211,153,0.12)" };
  if (pct >= 60) return { label: "Good", color: PALETTE.blueLight, bg: "rgba(96,165,250,0.12)" };
  if (pct >= 40) return { label: "Average", color: PALETTE.amber, bg: "rgba(251,191,36,0.12)" };
  return { label: "Needs Focus", color: PALETTE.red, bg: "rgba(248,113,113,0.12)" };
}

/* Glass dashboard card with an accent hairline on top + hover lift/glow.
   Used by every tile so the whole page reads as one cohesive grid. */
const cardSx = (accent = PALETTE.blue) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: "20px",
  bgcolor: "rgba(13,20,40,0.55)",
  border: "1px solid rgba(148,163,184,0.10)",
  backdropFilter: "blur(14px)",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0) 55%)",
  boxShadow: "0 12px 34px rgba(2,6,23,0.45)",
  transition: "transform .25s ease, border-color .25s ease, box-shadow .25s ease",
  "&:hover": {
    transform: "translateY(-3px)",
    borderColor: "rgba(148,163,184,0.22)",
    boxShadow: `0 18px 44px rgba(2,6,23,0.55), 0 0 26px ${accent}26`,
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0, left: 0, right: 0, height: 2,
    background: `linear-gradient(90deg, transparent 5%, ${accent} 50%, transparent 95%)`,
    opacity: 0.9,
  },
});

// Hoisted so it isn't recreated (and remounted by recharts) on every render.
function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ bgcolor: "rgba(15,23,42,0.92)", border: "1px solid rgba(255,255,255,0.1)", p: 1.5, borderRadius: 2, backdropFilter: "blur(8px)" }}>
        <Typography sx={{ color: "#fff", fontFamily: ff, fontSize: "0.85rem", fontWeight: 600, mb: 0.5 }}>{label}</Typography>
        {payload.map((entry, index) => (
          <Typography key={index} sx={{ color: entry.color, fontFamily: ff, fontSize: "0.85rem" }}>
            {entry.name}: {entry.value}%
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
}

/* --------------------------------------------------------------------- */
/* Main page                                                              */
/* --------------------------------------------------------------------- */

export default function StudentAnalysisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [lastX, setLastX] = useState("5");

  // Ledger controls
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!user?.id) return;
      try {
        const res = await api.get(`/student/analysis/${user.id}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load analysis");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [user?.id]);

  useEffect(() => {
    setPage(0);
  }, [search, lastX]);

  // Debounce ledger search so filtering a long exam history isn't recomputed per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  // Chart/KPI aggregation depends only on the fetched data + selected window.
  // Memoize it so ledger search/sort/paging never re-crunches every chart.
  const derived = useMemo(() => {
    if (!data) return null;
    const { chapter_breakdown, subject_breakdown, exam_wise } = data;
    const allExamWise = exam_wise || [];
    const win = lastX === "all" ? allExamWise : allExamWise.slice(-Number(lastX));
    const timeline = win.map((e) => ({
      label: e.submitted_time ? new Date(e.submitted_time).toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : "-",
      percentage: e.percentage || 0,
      exam_title: e.exam_title,
    }));
    const attempted = win.length;
    const avgPct = attempted ? Math.round(win.reduce((a, e) => a + (e.percentage || 0), 0) / attempted) : 0;
    const validPct = win.filter((e) => e.percentile !== null && e.percentile !== undefined);
    const avgPercentile = validPct.length ? Math.round(validPct.reduce((a, e) => a + (e.percentile || 0), 0) / validPct.length) : 0;
    const trendDelta = attempted >= 2 ? Math.round((win[attempted - 1].percentage || 0) - (win[attempted - 2].percentage || 0)) : 0;
    const earned = win.reduce((a, e) => a + Number(e.score || 0), 0);
    const total = win.reduce((a, e) => a + Number(e.total_marks || 0), 0);
    const piePct = total > 0 ? Math.round((earned / total) * 100) : 0;
    const marksPieData = [
      { name: "Marks Earned", value: earned, color: PALETTE.green },
      { name: "Marks Remaining", value: Math.max(total - earned, 0), color: PALETTE.slate },
    ];
    const rowsWithTrend = win.map((e, idx) => {
      const prev = idx > 0 ? win[idx - 1] : null;
      return { ...e, _delta: prev ? Math.round((e.percentage || 0) - (prev.percentage || 0)) : null };
    });
    return {
      timeline, attempted, avgPct, avgPercentile, trendDelta, pieTotal: total, piePct,
      marksPieData, rowsWithTrend,
      chapterChartData: (chapter_breakdown || []).slice(0, 12),
      subjectChartData: (subject_breakdown || []).slice(0, 10),
    };
  }, [data, lastX]);

  const sortedRows = useMemo(() => {
    if (!derived) return [];
    const q = debouncedSearch.toLowerCase();
    const searched = derived.rowsWithTrend.filter((e) => (e.exam_title || "").toLowerCase().includes(q));
    const cmp = (a, b) => {
      let av, bv;
      switch (orderBy) {
        case "date": av = a.submitted_time ? new Date(a.submitted_time).getTime() : 0; bv = b.submitted_time ? new Date(b.submitted_time).getTime() : 0; break;
        case "score": av = a.score || 0; bv = b.score || 0; break;
        case "percentage": av = a.percentage || 0; bv = b.percentage || 0; break;
        case "percentile": av = a.percentile || 0; bv = b.percentile || 0; break;
        case "rank": av = a.rank || Infinity; bv = b.rank || Infinity; break;
        default: av = (a.exam_title || "").toLowerCase(); bv = (b.exam_title || "").toLowerCase();
      }
      if (av < bv) return order === "asc" ? -1 : 1;
      if (av > bv) return order === "asc" ? 1 : -1;
      return 0;
    };
    return [...searched].sort(cmp);
  }, [derived, debouncedSearch, order, orderBy]);

  const paginatedRows = useMemo(
    () => sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedRows, page, rowsPerPage]
  );

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", bgcolor: "#0b1120" }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress sx={{ color: "#3b82f6" }} />
          <Typography sx={{ color: "#64748b", fontFamily: ff, fontSize: "0.9rem" }}>Crunching your numbers…</Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, bgcolor: "#0b1120", minHeight: "100vh" }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const { improvement_needed, strengths } = data;
  const {
    timeline: filteredTimeline,
    attempted: filteredAttempted,
    avgPct: filteredAvgPct,
    avgPercentile: filteredAvgPercentile,
    trendDelta: filteredTrendDelta,
    pieTotal, piePct, marksPieData, chapterChartData, subjectChartData,
  } = derived;
  const trendPositive = filteredTrendDelta >= 0;

  const handleSort = (key) => {
    if (orderBy === key) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(key);
      setOrder("desc");
    }
  };

  const columns = [
    { key: "title", label: "Exam Name", sortable: false },
    { key: "date", label: "Date Submitted", sortable: true },
    { key: "score", label: "Raw Score", sortable: true },
    { key: "percentage", label: "Accuracy", sortable: true },
    { key: "percentile", label: "Percentile", sortable: true },
    { key: "rank", label: "Cohort Rank", sortable: true },
    { key: "trend", label: "Trend", sortable: false }
  ];

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: "#020617", minHeight: "100vh", color: "#f8fafc" }}>
      <Toolbar />
      {/* One master grid — every card is a tile, so the full width is always
          covered with no dead space beside any section. */}
      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(12, 1fr)" },
          alignItems: "stretch",
        }}
      >
        {/* ── HEADER BAR (slim, full width) ── */}
        <Paper
          sx={{
            gridColumn: { xs: "span 2", lg: "span 12" },
            ...cardSx("#f68914"),
            p: { xs: 2, md: 2.5 },
          }}
        >
          <Box
            sx={{
              position: "absolute", top: -110, right: -60, width: 280, height: 280, pointerEvents: "none",
              background: "radial-gradient(circle, rgba(246,137,20,0.18) 0%, transparent 70%)", borderRadius: "50%",
            }}
          />
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2} sx={{ position: "relative", zIndex: 1 }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <AutoAwesomeIcon sx={{ fontSize: 20, color: "#ffce9e" }} />
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    fontFamily: ff,
                    letterSpacing: "-0.02em",
                    backgroundImage: "linear-gradient(90deg, #ffffff 0%, #ffce9e 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Analytics Intelligence
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.4, fontFamily: ff }}>
                Performance trends, subject proficiency and focus areas — {lastX === "all" ? "full history" : `last ${lastX} exams`}.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <FormControl size="small" sx={{ minWidth: 160, "& .MuiOutlinedInput-root": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", borderRadius: 2, "& fieldset": { borderColor: "rgba(255,255,255,0.2)" }, "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" } }, "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" }, "& .MuiSvgIcon-root": { color: "#fff" } }}>
                <InputLabel id="last-x-label">Analysis Window</InputLabel>
                <Select labelId="last-x-label" label="Analysis Window" value={lastX} onChange={(e) => setLastX(e.target.value)}>
                  <MenuItem value="3">Last 3 Exams</MenuItem>
                  <MenuItem value="5">Last 5 Exams</MenuItem>
                  <MenuItem value="10">Last 10 Exams</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/student")}
                variant="contained"
                sx={{ bgcolor: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", color: "#fff", borderRadius: 2, textTransform: "none", fontWeight: 600, fontFamily: ff, boxShadow: "none", border: "1px solid rgba(255,255,255,0.2)", "&:hover": { bgcolor: "rgba(255,255,255,0.2)", boxShadow: "none" } }}
              >
                Exams
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* ── KPI TILES ── */}
        {[
          { title: "Exams Attempted", accent: PALETTE.blueLight, info: "How many exams you completed in the selected window (change it with the Analysis Window dropdown above).", value: filteredAttempted, decimals: 0, icon: <SchoolIcon sx={{ fontSize: 22 }} /> },
          { title: "Average Score", accent: PALETTE.green, info: "Your average percentage across these exams. 75%+ is excellent, 60%+ is good.", value: filteredAvgPct, decimals: 0, suffix: "%", bar: true, barColor: PALETTE.green, icon: <EmojiEventsIcon sx={{ fontSize: 22 }} /> },
          { title: "Avg Percentile", accent: PALETTE.pink, info: "Percentile compares you with classmates who took the same exams. 80 means you scored better than 80% of them — higher is better.", value: filteredAvgPercentile, decimals: 0, bar: true, barColor: PALETTE.pink, icon: <InsightsIcon sx={{ fontSize: 22 }} /> },
          {
            title: "Recent Trend",
            accent: trendPositive ? PALETTE.green : PALETTE.red,
            info: "The change between your last two exam scores. +5% means your latest score was 5 points higher than the one before.",
            value: filteredTrendDelta,
            decimals: 0,
            suffix: "%",
            prefix: trendPositive ? "+" : "",
            icon: trendPositive ? <TrendingUpIcon sx={{ fontSize: 22 }} /> : <TrendingDownIcon sx={{ fontSize: 22 }} />,
          }
        ].map((kpi, index) => (
          <Box key={index} sx={{ gridColumn: { xs: "span 1", lg: "span 3" } }}>
            <RevealBox delay={index * 80}>
              <Paper sx={{ ...cardSx(kpi.accent), p: { xs: 1.75, md: 2.25 }, height: "100%", display: "flex", alignItems: "center", gap: 1.75 }}>
                <Box
                  sx={{
                    width: 46, height: 46, borderRadius: "14px", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff",
                    background: `linear-gradient(135deg, ${kpi.accent}, ${kpi.accent}88)`,
                    boxShadow: `0 8px 20px ${kpi.accent}40`,
                  }}
                >
                  {kpi.icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={0.6}>
                    <Typography variant="caption" noWrap sx={{ color: "#94a3b8", fontFamily: ff, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.66rem" }}>
                      {kpi.title}
                    </Typography>
                    {kpi.info && <InfoTip text={kpi.info} size={14} />}
                  </Stack>
                  <Typography sx={{ fontFamily: ff, fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.85rem" }, color: "#f8fafc", lineHeight: 1.15 }}>
                    {kpi.prefix || ""}<AnimatedNumber value={kpi.value} decimals={kpi.decimals} />{kpi.suffix || ""}
                  </Typography>
                  {kpi.bar && <AnimatedBar value={Math.max(kpi.value, 0)} color={kpi.barColor} delayMs={200 + index * 100} />}
                </Box>
              </Paper>
            </RevealBox>
          </Box>
        ))}

        {/* ── PERFORMANCE VELOCITY ── */}
        <Box sx={{ gridColumn: { xs: "span 2", lg: "span 8" } }}>
            <RevealBox>
              <Paper sx={{ ...cardSx(PALETTE.blue), p: { xs: 2, md: 2.75 }, height: { xs: 340, md: 400 } }}>
                <MiniHeader
                  icon={<TrendingUpIcon sx={{ color: "#60a5fa", fontSize: 20 }} />}
                  iconBg="rgba(96,165,250,0.12)"
                  title="Performance Velocity"
                  subtitle="Score progression across recent examinations"
                />
                {/* Bars for each attempt, plus a running average. The area
                    chart it replaces showed the same scores but nothing to
                    read them against, so a run of 60s looked identical
                    whether the student was improving or sliding. */}
                <ComposedTrendChart
                  data={filteredTimeline.map((t) => ({ label: t.label, value: t.percentage }))}
                  barName="Score"
                  lineName="Running average"
                  average={filteredAvgPct}
                  colorByScore
                  height={280}
                />
              </Paper>
            </RevealBox>
        </Box>

        {/* ── MARKS DISTRIBUTION ── */}
        <Box sx={{ gridColumn: { xs: "span 2", lg: "span 4" } }}>
            <RevealBox delay={100}>
              <Paper sx={{ ...cardSx(PALETTE.green), p: { xs: 2, md: 2.75 }, height: { xs: 340, md: 400 }, display: "flex", flexDirection: "column" }}>
                <MiniHeader
                  icon={<DonutLargeIcon sx={{ color: "#34d399", fontSize: 20 }} />}
                  iconBg="rgba(52,211,153,0.12)"
                  title="Subject Mastery"
                  subtitle="How far through each subject, with marks earned overall"
                />
                {pieTotal > 0 ? (
                  <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                    {/* Rings rather than a two-slice pie. "Earned vs remaining"
                        is progress toward a ceiling, and a ring shows the gap
                        left; a pie of two slices makes the reader compare two
                        angles to learn one number. Each subject gets its own
                        ring, so the weakest one is visible immediately. */}
                    <RingChart
                      data={[
                        { label: 'Marks earned', value: piePct, maxValue: 100 },
                        ...subjectChartData.slice(0, 4).map((s) => ({
                          label: s.subject,
                          value: s.percentage || 0,
                          maxValue: 100,
                        })),
                      ]}
                      byScore
                      centerLabel="Overall earned"
                      height={250}
                    />
                  </Box>
                ) : (
                  <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography sx={{ color: "#475569", fontFamily: ff, fontSize: "0.9rem", textAlign: "center" }}>
                      No marks recorded yet.<br />Attempt an exam to see this chart.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </RevealBox>
        </Box>

        {/* ── SUBJECT PROFICIENCY (radar) ── */}
        <Box sx={{ gridColumn: { xs: "span 2", md: "span 1", lg: "span 4" } }}>
            <RevealBox>
              <Paper sx={{ ...cardSx(PALETTE.purple), p: { xs: 2, md: 2.5 }, height: { xs: 340, md: 360 }, display: "flex", flexDirection: "column" }}>
                <MiniHeader
                  icon={<BubbleChartIcon sx={{ color: "#8b5cf6", fontSize: 20 }} />}
                  iconBg="rgba(139,92,246,0.12)"
                  title="Subject Proficiency"
                  subtitle="Multidimensional skill map"
                />
                <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                  {/* Accuracy against the student's own average on the same
                      axes. The single-series radar it replaces drew a shape
                      with nothing to compare it to, so "is 62% in Physics
                      good?" was still unanswerable from the chart. */}
                  <SubjectRadarChart
                    data={subjectChartData.map((s) => ({
                      axis: s.subject,
                      accuracy: s.percentage || 0,
                      average: filteredAvgPct,
                    }))}
                    series={[
                      { key: 'accuracy', label: 'Accuracy' },
                      { key: 'average', label: 'Your average' },
                    ]}
                    height={250}
                  />
                </Box>
              </Paper>
            </RevealBox>
        </Box>

        {/* ── CORE STRENGTHS ── */}
        <Box sx={{ gridColumn: { xs: "span 2", md: "span 1", lg: "span 4" } }}>
            <RevealBox delay={100}>
              <Paper sx={{ ...cardSx(PALETTE.green), p: { xs: 2, md: 2.5 }, height: { xs: 320, md: 360 }, display: "flex", flexDirection: "column" }}>
                <MiniHeader
                  icon={<EmojiEventsIcon sx={{ color: "#34d399", fontSize: 20 }} />}
                  iconBg="rgba(52,211,153,0.2)"
                  title="Core Strengths"
                  subtitle="Top-performing chapters"
                />
                <Box sx={{ overflowY: "auto", flexGrow: 1, pr: 0.5, "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 4 } }}>
                  {(strengths || []).length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 2, fontFamily: ff }}>No strong chapters identified yet.</Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {strengths.map((item, i) => (
                        <Grow in key={i} timeout={500} style={{ transitionDelay: `${i * 70}ms` }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 2, borderLeft: "4px solid #34d399", transition: "background .2s ease", "&:hover": { bgcolor: "rgba(0,0,0,0.32)" } }}>
                            <Typography sx={{ color: "#cbd5e1", fontFamily: ff, fontSize: "0.9rem", fontWeight: 500 }}>{item.chapter}</Typography>
                            <Typography sx={{ color: "#34d399", fontFamily: ff, fontWeight: 700 }}>{item.percentage}%</Typography>
                          </Box>
                        </Grow>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>
            </RevealBox>
        </Box>

        {/* ── GROWTH OPPORTUNITIES ── */}
        <Box sx={{ gridColumn: { xs: "span 2", lg: "span 4" } }}>
            <RevealBox delay={200}>
              <Paper sx={{ ...cardSx(PALETTE.red), p: { xs: 2, md: 2.5 }, height: { xs: 320, md: 360 }, display: "flex", flexDirection: "column" }}>
                <MiniHeader
                  icon={<TrendingDownIcon sx={{ color: "#f87171", fontSize: 20 }} />}
                  iconBg="rgba(248,113,113,0.2)"
                  title="Growth Opportunities"
                  subtitle="Chapters requiring immediate focus"
                />
                <Box sx={{ overflowY: "auto", flexGrow: 1, pr: 0.5, "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 4 } }}>
                  {(improvement_needed || []).length === 0 ? (
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 2, fontFamily: ff }}>No weak chapters detected.</Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {improvement_needed.map((item, i) => (
                        <Grow in key={i} timeout={500} style={{ transitionDelay: `${i * 70}ms` }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "rgba(0,0,0,0.2)", borderRadius: 2, borderLeft: "4px solid #f87171", transition: "background .2s ease", "&:hover": { bgcolor: "rgba(0,0,0,0.32)" } }}>
                            <Typography sx={{ color: "#cbd5e1", fontFamily: ff, fontSize: "0.9rem", fontWeight: 500 }}>{item.chapter}</Typography>
                            <Typography sx={{ color: "#f87171", fontFamily: ff, fontWeight: 700 }}>{item.percentage}%</Typography>
                          </Box>
                        </Grow>
                      ))}
                    </Stack>
                  )}
                </Box>
              </Paper>
            </RevealBox>
        </Box>

        {/* ── CHAPTER ACCURACY ── */}
        <Box sx={{ gridColumn: { xs: "span 2", lg: "span 12" } }}>
            <RevealBox>
              <Paper sx={{ ...cardSx(PALETTE.amber), p: { xs: 2, md: 2.75 }, height: { xs: 400, md: 440 } }}>
                <MiniHeader
                  icon={<AssessmentIcon sx={{ color: "#fbbf24", fontSize: 20 }} />}
                  iconBg="rgba(251,191,36,0.12)"
                  title="Chapter-Level Accuracy"
                  subtitle="Green 70%+ · amber 40–70% · red needs focus"
                />
                <ResponsiveContainer width="100%" height="84%">
                  <BarChart data={chapterChartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: isMobile ? 0 : 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal vertical={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="chapter" width={isMobile ? 100 : 180} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} content={<ChartTooltip />} />
                    <Bar dataKey="percentage" name="Accuracy" radius={[0, 4, 4, 0]} barSize={isMobile ? 16 : 24} isAnimationActive animationDuration={1300} animationEasing="ease-out">
                      {chapterChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage > 70 ? "#34d399" : entry.percentage > 40 ? "#fbbf24" : "#f87171"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </RevealBox>
        </Box>

        {/* ── EXAMINATION LEDGER ── */}
        <Box sx={{ gridColumn: { xs: "span 2", lg: "span 12" } }}>
        <RevealBox>
          <Paper sx={{ ...cardSx(PALETTE.blueLight), p: { xs: 2, md: 3 } }}>
            <MiniHeader
              icon={<TableChartIcon sx={{ color: "#60a5fa", fontSize: 20 }} />}
              iconBg="rgba(96,165,250,0.12)"
              title="Examination Ledger"
              subtitle="Complete, searchable history of every attempt"
            />
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 3, px: { xs: 1, md: 0 } }}>
              <Typography sx={{ color: "#64748b", fontFamily: ff, fontSize: "0.85rem" }}>
                {sortedRows.length} exam{sortedRows.length === 1 ? "" : "s"} {search ? "matching your search" : "on record"}
              </Typography>
              <TextField
                size="small"
                placeholder="Search exams…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  minWidth: { xs: "100%", sm: 240 },
                  "& .MuiOutlinedInput-root": { color: "#e2e8f0", bgcolor: "rgba(255,255,255,0.03)", borderRadius: 2, fontFamily: ff, "& fieldset": { borderColor: "rgba(255,255,255,0.1)" }, "&:hover fieldset": { borderColor: "rgba(255,255,255,0.25)" } }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#64748b", fontSize: 20 }} />
                    </InputAdornment>
                  )
                }}
              />
            </Stack>

            {sortedRows.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Typography sx={{ color: "#475569", fontFamily: ff }}>No exams match your search.</Typography>
              </Box>
            ) : isMobile ? (
              /* MOBILE CARDS */
              <Stack spacing={2}>
                {paginatedRows.map((e, idx) => {
                  const tier = tierFor(e.percentage || 0);
                  return (
                    <Fade in key={idx} timeout={450} style={{ transitionDelay: `${idx * 60}ms` }}>
                      <Card sx={{ bgcolor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3, boxShadow: "none", transition: "border-color .2s ease", "&:hover": { borderColor: "rgba(255,255,255,0.2)" } }}>
                        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                            <Typography sx={{ fontFamily: ff, fontWeight: 700, color: "#e2e8f0", fontSize: "1rem", pr: 2 }}>{e.exam_title}</Typography>
                            <Chip label={`${e.percentage ?? 0}%`} size="small" sx={{ fontFamily: ff, fontWeight: 700, bgcolor: tier.bg, color: tier.color }} />
                          </Box>
                          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                            <Chip label={tier.label} size="small" sx={{ fontFamily: ff, fontSize: "0.7rem", bgcolor: tier.bg, color: tier.color }} />
                            {e._delta !== null && (
                              <Chip
                                icon={e._delta >= 0 ? <TrendingUpIcon sx={{ fontSize: "14px !important" }} /> : <TrendingDownIcon sx={{ fontSize: "14px !important" }} />}
                                label={`${e._delta >= 0 ? "+" : ""}${e._delta}%`}
                                size="small"
                                sx={{ fontFamily: ff, fontSize: "0.7rem", bgcolor: e._delta >= 0 ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: e._delta >= 0 ? "#34d399" : "#f87171" }}
                              />
                            )}
                          </Stack>
                          <Stack spacing={1}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#64748b", fontFamily: ff, fontSize: "0.85rem" }}>Submitted</Typography>
                              <Typography sx={{ color: "#cbd5e1", fontFamily: ff, fontSize: "0.85rem" }}>{e.submitted_time ? new Date(e.submitted_time).toLocaleDateString() : "-"}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#64748b", fontFamily: ff, fontSize: "0.85rem" }}>Score</Typography>
                              <Typography sx={{ color: "#cbd5e1", fontFamily: ff, fontSize: "0.85rem", fontWeight: 600 }}>{`${e.score ?? 0} / ${e.total_marks ?? 0}`}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#64748b", fontFamily: ff, fontSize: "0.85rem" }}>Percentile</Typography>
                              <Typography sx={{ color: "#cbd5e1", fontFamily: ff, fontSize: "0.85rem" }}>{e.percentile ?? 0}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#64748b", fontFamily: ff, fontSize: "0.85rem" }}>Rank</Typography>
                              <Typography sx={{ color: "#cbd5e1", fontFamily: ff, fontSize: "0.85rem" }}>{e.rank && e.participants ? `${e.rank} / ${e.participants}` : "-"}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Fade>
                  );
                })}
              </Stack>
            ) : (
              /* DESKTOP TABLE */
              <TableContainer sx={{ maxHeight: 480, "&::-webkit-scrollbar": { width: 8, height: 8 }, "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(255,255,255,0.1)", borderRadius: 4 } }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell key={col.key} sx={{ bgcolor: "#0f172a", color: "#94a3b8", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                          {col.sortable ? (
                            <TableSortLabel
                              active={orderBy === col.key}
                              direction={orderBy === col.key ? order : "asc"}
                              onClick={() => handleSort(col.key)}
                              sx={{ color: "#94a3b8 !important", "& .MuiTableSortLabel-icon": { color: "#60a5fa !important" } }}
                            >
                              {col.label}
                            </TableSortLabel>
                          ) : (
                            col.label
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedRows.map((e, idx) => {
                      const tier = tierFor(e.percentage || 0);
                      return (
                        <Fade in key={idx} timeout={450} style={{ transitionDelay: `${idx * 55}ms` }}>
                          <TableRow sx={{ transition: "background .2s ease", "&:hover": { bgcolor: "rgba(255,255,255,0.03)" } }}>
                            <TableCell sx={{ color: "#e2e8f0", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: 500 }}>{e.exam_title}</TableCell>
                            <TableCell sx={{ color: "#94a3b8", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{e.submitted_time ? new Date(e.submitted_time).toLocaleString() : "-"}</TableCell>
                            <TableCell sx={{ color: "#e2e8f0", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: 600 }}>{`${e.score ?? 0} / ${e.total_marks ?? 0}`}</TableCell>
                            <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={`${e.percentage ?? 0}%`} size="small" sx={{ fontFamily: ff, fontWeight: 700, bgcolor: tier.bg, color: tier.color }} />
                                <Typography sx={{ color: "#475569", fontFamily: ff, fontSize: "0.72rem" }}>{tier.label}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ color: "#e2e8f0", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{e.percentile ?? 0}</TableCell>
                            <TableCell sx={{ color: "#cbd5e1", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>{e.rank && e.participants ? `${e.rank} / ${e.participants}` : "-"}</TableCell>
                            <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                              {e._delta !== null ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  {e._delta >= 0 ? <TrendingUpIcon sx={{ fontSize: 16, color: "#34d399" }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: "#f87171" }} />}
                                  <Typography sx={{ fontFamily: ff, fontSize: "0.8rem", fontWeight: 600, color: e._delta >= 0 ? "#34d399" : "#f87171" }}>
                                    {e._delta >= 0 ? "+" : ""}{e._delta}%
                                  </Typography>
                                </Stack>
                              ) : (
                                <Typography sx={{ color: "#475569", fontFamily: ff, fontSize: "0.8rem" }}>—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        </Fade>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {sortedRows.length > 0 && (
              <TablePagination
                component="div"
                count={sortedRows.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 8, 15, 25]}
                sx={{
                  color: "#94a3b8", fontFamily: ff, mt: 1,
                  "& .MuiTablePagination-selectIcon": { color: "#94a3b8" },
                  "& .MuiTablePagination-actions button": { color: "#94a3b8" }
                }}
              />
            )}
          </Paper>
        </RevealBox>
        </Box>
      </Box>
    </Box>
  );
}
