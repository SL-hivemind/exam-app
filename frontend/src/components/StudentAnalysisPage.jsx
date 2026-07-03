import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Divider,
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
  Speed as SpeedIcon,
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

function SectionHeader({ icon, title, subtitle }) {
  return (
    <RevealBox sx={{ mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Box sx={{ color: "#60a5fa", display: "flex" }}>{icon}</Box>
        <Typography
          variant="overline"
          sx={{ fontFamily: ff, letterSpacing: "0.12em", color: "#93a3b8", fontWeight: 700, fontSize: "0.78rem" }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "#475569", fontFamily: ff, display: { xs: "none", sm: "block" } }}>
            · {subtitle}
          </Typography>
        )}
      </Stack>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
    </RevealBox>
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

  const { chapter_breakdown, subject_breakdown, exam_wise, improvement_needed, strengths } = data;
  const allExamWise = exam_wise || [];
  const filteredExamWise = lastX === "all" ? allExamWise : allExamWise.slice(-Number(lastX));

  const filteredTimeline = filteredExamWise.map((e) => ({
    label: e.submitted_time ? new Date(e.submitted_time).toLocaleDateString("en-US", { day: "2-digit", month: "short" }) : "-",
    percentage: e.percentage || 0,
    exam_title: e.exam_title
  }));

  const filteredAttempted = filteredExamWise.length;
  const filteredAvgPct = filteredAttempted
    ? Math.round(filteredExamWise.reduce((acc, e) => acc + (e.percentage || 0), 0) / filteredAttempted)
    : 0;
  const filteredValidPercentiles = filteredExamWise.filter((e) => e.percentile !== null && e.percentile !== undefined);
  const filteredAvgPercentile = filteredValidPercentiles.length
    ? Math.round(filteredValidPercentiles.reduce((acc, e) => acc + (e.percentile || 0), 0) / filteredValidPercentiles.length)
    : 0;
  const filteredTrendDelta = filteredAttempted >= 2
    ? Math.round((filteredExamWise[filteredAttempted - 1].percentage || 0) - (filteredExamWise[filteredAttempted - 2].percentage || 0))
    : 0;
  const trendPositive = filteredTrendDelta >= 0;

  const pieEarned = filteredExamWise.reduce((acc, e) => acc + Number(e.score || 0), 0);
  const pieTotal = filteredExamWise.reduce((acc, e) => acc + Number(e.total_marks || 0), 0);
  const pieRemaining = Math.max(pieTotal - pieEarned, 0);
  const piePct = pieTotal > 0 ? Math.round((pieEarned / pieTotal) * 100) : 0;

  const marksPieData = [
    { name: "Marks Earned", value: pieEarned, color: PALETTE.green },
    { name: "Marks Remaining", value: pieRemaining, color: PALETTE.slate }
  ];

  const chapterChartData = (chapter_breakdown || []).slice(0, 12);
  const subjectChartData = (subject_breakdown || []).slice(0, 10);

  // ---- Ledger: trend deltas, search, sort, pagination ----
  const rowsWithTrend = filteredExamWise.map((e, idx) => {
    const prev = idx > 0 ? filteredExamWise[idx - 1] : null;
    const delta = prev ? Math.round((e.percentage || 0) - (prev.percentage || 0)) : null;
    return { ...e, _delta: delta };
  });

  const searchedRows = rowsWithTrend.filter((e) =>
    (e.exam_title || "").toLowerCase().includes(search.toLowerCase())
  );

  const comparator = (a, b) => {
    let av, bv;
    switch (orderBy) {
      case "date":
        av = a.submitted_time ? new Date(a.submitted_time).getTime() : 0;
        bv = b.submitted_time ? new Date(b.submitted_time).getTime() : 0;
        break;
      case "score":
        av = a.score || 0;
        bv = b.score || 0;
        break;
      case "percentage":
        av = a.percentage || 0;
        bv = b.percentage || 0;
        break;
      case "percentile":
        av = a.percentile || 0;
        bv = b.percentile || 0;
        break;
      case "rank":
        av = a.rank || Infinity;
        bv = b.rank || Infinity;
        break;
      default:
        av = (a.exam_title || "").toLowerCase();
        bv = (b.exam_title || "").toLowerCase();
    }
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
    return 0;
  };
  const sortedRows = [...searchedRows].sort(comparator);
  const paginatedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (key) => {
    if (orderBy === key) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(key);
      setOrder("desc");
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
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
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#020617", minHeight: "100vh", color: "#f8fafc" }}>
      <Toolbar />
      <Container maxWidth="xl" disableGutters sx={{ px: { xs: 1, md: 2 } }}>

        {/* ── HEADER CARD ── */}
        <Paper
          sx={{
            p: { xs: 2.5, md: 4 },
            mb: 4,
            borderRadius: 4,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
          }}
        >
          <Box
            sx={{
              position: "absolute", top: -100, right: -50, width: 320, height: 320,
              background: "radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)", borderRadius: "50%",
              animation: "floatBlob 9s ease-in-out infinite",
              "@keyframes floatBlob": { "0%,100%": { transform: "translate(0,0)" }, "50%": { transform: "translate(-25px, 20px)" } }
            }}
          />
          <Box
            sx={{
              position: "absolute", bottom: -60, left: 100, width: 220, height: 220,
              background: "radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)", borderRadius: "50%",
              animation: "floatBlob2 11s ease-in-out infinite",
              "@keyframes floatBlob2": { "0%,100%": { transform: "translate(0,0)" }, "50%": { transform: "translate(20px, -18px)" } }
            }}
          />

          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={3} sx={{ position: "relative", zIndex: 1 }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.2}>
                <AutoAwesomeIcon sx={{ fontSize: 20, color: "#c7d2fe" }} />
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{
                    fontFamily: ff,
                    letterSpacing: "-0.02em",
                    backgroundImage: "linear-gradient(90deg, #ffffff 0%, #c7d2fe 45%, #ffffff 100%)",
                    backgroundSize: "200% 100%",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    animation: "shimmer 5s linear infinite",
                    "@keyframes shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } }
                  }}
                >
                  Analytics Intelligence
                </Typography>
              </Stack>
              <Typography variant="body1" sx={{ opacity: 0.8, mt: 0.8, fontFamily: ff, maxWidth: 520 }}>
                AI-driven insights into your performance trends, subject proficiencies, and strategic improvement areas.
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

        {/* ── OVERVIEW / KPI METRICS ── */}
        <SectionHeader icon={<SpeedIcon fontSize="small" />} title="Overview" subtitle={`Based on your ${lastX === "all" ? "full history" : `last ${lastX} exams`}`} />
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          {[
            { title: "Exams Attempted", value: filteredAttempted, decimals: 0, icon: <SchoolIcon sx={{ color: "#60a5fa" }} />, color: "rgba(96,165,250,0.1)" },
            { title: "Average Score", value: filteredAvgPct, decimals: 0, suffix: "%", bar: true, barColor: PALETTE.green, icon: <EmojiEventsIcon sx={{ color: "#34d399" }} />, color: "rgba(52,211,153,0.1)" },
            { title: "Avg Percentile", value: filteredAvgPercentile, decimals: 0, bar: true, barColor: PALETTE.pink, icon: <InsightsIcon sx={{ color: "#f472b6" }} />, color: "rgba(244,114,182,0.1)" },
            {
              title: "Recent Trend",
              value: filteredTrendDelta,
              decimals: 0,
              suffix: "%",
              prefix: trendPositive ? "+" : "",
              icon: trendPositive ? <TrendingUpIcon sx={{ color: "#34d399" }} /> : <TrendingDownIcon sx={{ color: "#f87171" }} />,
              color: trendPositive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)"
            }
          ].map((kpi, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <RevealBox delay={index * 90}>
                <Paper
                  sx={{
                    p: 3, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: "#0f172a",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)", position: "relative", overflow: "hidden", height: "100%",
                    transition: "transform .3s cubic-bezier(.16,.84,.44,1), box-shadow .3s ease, border-color .3s ease",
                    "&:hover": { transform: "translateY(-4px)", boxShadow: "0 16px 40px rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.12)" }
                  }}
                >
                  <Box sx={{ position: "absolute", top: 0, right: 0, p: 2, bgcolor: kpi.color, borderBottomLeftRadius: 24 }}>
                    {kpi.icon}
                  </Box>
                  <Typography variant="caption" sx={{ color: "#94a3b8", fontFamily: ff, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {kpi.title}
                  </Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ fontFamily: ff, color: "#f8fafc", mt: 1 }}>
                    {kpi.prefix || ""}<AnimatedNumber value={kpi.value} decimals={kpi.decimals} />{kpi.suffix || ""}
                  </Typography>
                  {kpi.bar && <AnimatedBar value={Math.max(kpi.value, 0)} color={kpi.barColor} delayMs={200 + index * 100} />}
                </Paper>
              </RevealBox>
            </Grid>
          ))}
        </Grid>

        {/* ── PERFORMANCE TRENDS ── */}
        <SectionHeader icon={<TrendingUpIcon fontSize="small" />} title="Performance Trends" subtitle="Score progression and mark distribution" />
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} lg={7}>
            <RevealBox>
              <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", height: { xs: 400, md: 460 } }}>
                <MiniHeader
                  icon={<TrendingUpIcon sx={{ color: "#60a5fa", fontSize: 20 }} />}
                  iconBg="rgba(96,165,250,0.12)"
                  title="Performance Velocity"
                  subtitle="Score progression across recent examinations"
                />
                <ResponsiveContainer width="100%" height="82%">
                  <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone" dataKey="percentage" name="Score" stroke="#3b82f6" strokeWidth={3}
                      fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: "#60a5fa" }}
                      isAnimationActive animationDuration={1300} animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </RevealBox>
          </Grid>

          <Grid item xs={12} lg={5}>
            <RevealBox delay={100}>
              <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", height: { xs: 400, md: 460 }, display: "flex", flexDirection: "column" }}>
                <MiniHeader
                  icon={<DonutLargeIcon sx={{ color: "#34d399", fontSize: 20 }} />}
                  iconBg="rgba(52,211,153,0.12)"
                  title="Marks Distribution"
                  subtitle="Earned vs. remaining across all attempts"
                />
                {pieTotal > 0 ? (
                  <Box sx={{ flexGrow: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={marksPieData} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%"
                          paddingAngle={3} startAngle={90} endAngle={-270}
                          isAnimationActive animationDuration={1300} animationEasing="ease-out"
                        >
                          {marksPieData.map((entry, i) => (
                            <Cell key={`slice-${i}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} marks`, name]}
                          contentStyle={{ background: "rgba(15,23,42,0.92)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: ff }}
                          itemStyle={{ fontFamily: ff }}
                        />
                        <Legend
                          verticalAlign="bottom" height={36}
                          formatter={(value) => <span style={{ color: "#94a3b8", fontFamily: ff, fontSize: 12 }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ position: "absolute", top: "44%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none" }}>
                      <Typography variant="h4" fontWeight={800} sx={{ fontFamily: ff, color: "#f8fafc" }}>
                        <AnimatedNumber value={piePct} decimals={0} />%
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b", fontFamily: ff }}>earned</Typography>
                    </Box>
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
          </Grid>
        </Grid>

        {/* ── PROFICIENCY & FOCUS AREAS ── */}
        <SectionHeader icon={<InsightsIcon fontSize="small" />} title="Proficiency & Focus Areas" subtitle="Where you're strong and where to focus next" />
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12} md={6} lg={4}>
            <RevealBox>
              <Paper sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", height: { xs: 400, md: 440 }, display: "flex", flexDirection: "column" }}>
                <MiniHeader
                  icon={<BubbleChartIcon sx={{ color: "#8b5cf6", fontSize: 20 }} />}
                  iconBg="rgba(139,92,246,0.12)"
                  title="Subject Proficiency"
                  subtitle="Multidimensional skill map"
                />
                <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {subjectChartData.length > 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjectChartData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: ff }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Radar name="Accuracy" dataKey="percentage" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} isAnimationActive animationDuration={1300} animationEasing="ease-out" />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Typography sx={{ color: "#475569", fontFamily: ff, fontSize: "0.9rem", textAlign: "center" }}>
                      Not enough subjects for radar mapping.<br />Keep practicing!
                    </Typography>
                  )}
                </Box>
              </Paper>
            </RevealBox>
          </Grid>

          <Grid item xs={12} md={6} lg={4}>
            <RevealBox delay={100}>
              <Paper sx={{ p: 3, borderRadius: 4, border: "1px solid rgba(52,211,153,0.2)", bgcolor: "rgba(52,211,153,0.03)", height: { xs: "auto", md: 440 }, display: "flex", flexDirection: "column" }}>
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
          </Grid>

          <Grid item xs={12} md={12} lg={4}>
            <RevealBox delay={200}>
              <Paper sx={{ p: 3, borderRadius: 4, border: "1px solid rgba(248,113,113,0.2)", bgcolor: "rgba(248,113,113,0.03)", height: { xs: "auto", md: 440 }, display: "flex", flexDirection: "column" }}>
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
          </Grid>
        </Grid>

        {/* ── CHAPTER ACCURACY ── */}
        <SectionHeader icon={<AssessmentIcon fontSize="small" />} title="Chapter-Level Accuracy" subtitle="Detailed breakdown across all tested chapters" />
        <Grid container spacing={3} sx={{ mb: 5 }}>
          <Grid item xs={12}>
            <RevealBox>
              <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", height: { xs: 420, md: 480 } }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chapterChartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: isMobile ? 0 : 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal vertical={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="chapter" width={isMobile ? 100 : 180} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} content={<CustomTooltip />} />
                    <Bar dataKey="percentage" name="Accuracy" radius={[0, 4, 4, 0]} barSize={isMobile ? 16 : 24} isAnimationActive animationDuration={1300} animationEasing="ease-out">
                      {chapterChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage > 70 ? "#34d399" : entry.percentage > 40 ? "#fbbf24" : "#f87171"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </RevealBox>
          </Grid>
        </Grid>

        {/* ── EXAMINATION LEDGER ── */}
        <SectionHeader icon={<TableChartIcon fontSize="small" />} title="Examination Ledger" subtitle="Complete, searchable history of every attempt" />
        <RevealBox>
          <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: "#0f172a", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
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
      </Container>
    </Box>
  );
}
