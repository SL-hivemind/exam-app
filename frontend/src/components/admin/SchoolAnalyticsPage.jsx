import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from "@mui/material";
import {
  Search as SearchIcon,
  PeopleAlt as PeopleAltIcon,
  EmojiEvents as EmojiEventsIcon,
  Insights as InsightsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Dashboard as DashboardIcon
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import api from "../../utils/api";
import useAuth from "../../hooks/useAuth";
import InfoTip from "../common/InfoTip";

const ff = "'Inter', sans-serif";
const PALETTE = {
  blue: "#3b82f6",
  green: "#34d399",
  red: "#f87171",
  purple: "#8b5cf6",
  amber: "#fbbf24",
  orange: "#f68914"
};

function tierFor(pct) {
  if (pct >= 75) return { label: "Excellent", color: PALETTE.green, bg: "rgba(52,211,153,0.15)" };
  if (pct >= 60) return { label: "Good", color: PALETTE.blue, bg: "rgba(59,130,246,0.15)" };
  if (pct >= 40) return { label: "Average", color: PALETTE.amber, bg: "rgba(251,191,36,0.15)" };
  return { label: "Needs Focus", color: PALETTE.red, bg: "rgba(248,113,113,0.15)" };
}

const WidgetCard = ({ title, info, children, sx, extraHeader }) => (
  <Paper sx={{
    p: 1.5,
    borderRadius: 2,
    bgcolor: "#0f172a",
    border: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...sx
  }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
      {title && (
        <Stack direction="row" alignItems="center" spacing={0.6}>
          <Typography sx={{ color: "#94a3b8", fontFamily: ff, fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </Typography>
          {info && <InfoTip text={info} size={14} />}
        </Stack>
      )}
      {extraHeader}
    </Box>
    <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "hidden" }}>
      {children}
    </Box>
  </Paper>
);

export default function SchoolAnalyticsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [search, setSearch] = useState("");

  const fetchAnalysis = async (cFilter, sFilter) => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const res = await api.get(`/school/analysis/${user.school_id}?class=${cFilter}&subject=${sFilter}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis(classFilter, subjectFilter);
  }, [user?.school_id, classFilter, subjectFilter]);

  // Debounce search so filtering a large exam ledger doesn't recompute on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  // Memoize the heavy derived views so typing/re-renders don't re-scan the full dataset.
  const searchedRows = useMemo(() => {
    const rows = data?.exam_wise || [];
    const q = debouncedSearch.toLowerCase();
    return rows
      .filter((e) =>
        (e.exam_title || "").toLowerCase().includes(q) ||
        (e.student_id || "").toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.submitted_time || 0) - new Date(a.submitted_time || 0));
  }, [data, debouncedSearch]);

  const classChartData = useMemo(() => (data?.class_breakdown || []).slice(0, 8), [data]);
  const subjectChartData = useMemo(() => (data?.subject_breakdown || []).slice(0, 8), [data]);

  if (loading && !data) {
    return (
      <Box sx={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress sx={{ color: PALETTE.orange }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const { strengths, summary, timeline, filters } = data;
  const trendPositive = summary.trend_delta >= 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", p: 1, borderRadius: 1 }}>
          <Typography sx={{ color: "#fff", fontFamily: ff, fontSize: "0.7rem", fontWeight: 600 }}>{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} sx={{ color: entry.color || '#fff', fontFamily: ff, fontSize: "0.7rem" }}>
              {entry.name}: {entry.value}%
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{
      height: { xs: 'auto', lg: 'calc(100vh - 108px)' }, // fill viewport on desktop, flow on mobile
      display: 'flex',
      flexDirection: 'column',
      bgcolor: "transparent",
      gap: 1.5,
      overflow: { xs: 'visible', lg: 'hidden' },
      pb: { xs: 2, lg: 0 }
    }}>
      {loading && <LinearProgress sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, bgcolor: "rgba(246,137,20,0.2)", "& .MuiLinearProgress-bar": { bgcolor: PALETTE.orange } }} />}
      
      {/* ── TOP CONTROL BAR ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <DashboardIcon sx={{ color: PALETTE.orange, fontSize: 24 }} />
          <Typography variant="h6" sx={{ color: "#fff", fontFamily: ff, fontWeight: 700, fontSize: "1.1rem" }}>
            Analytics Dashboard
          </Typography>
        </Stack>
        
        <Stack direction="row" spacing={1.5}>
          <FormControl size="small" sx={{ width: 140, "& .MuiOutlinedInput-root": { height: 36, color: "#fff", bgcolor: "#0f172a", borderRadius: 1.5, "& fieldset": { borderColor: "rgba(255,255,255,0.1)" }, "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" } }, "& .MuiInputLabel-root": { color: "#94a3b8", fontSize: "0.8rem", transform: "translate(14px, 9px) scale(1)", "&.Mui-focused, &.MuiFormLabel-filled": { transform: "translate(14px, -9px) scale(0.75)" } }, "& .MuiSvgIcon-root": { color: "#94a3b8" } }}>
            <InputLabel>Class Filter</InputLabel>
            <Select label="Class Filter" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} sx={{ fontSize: "0.8rem", fontFamily: ff }}>
              <MenuItem value="all">All Classes</MenuItem>
              {filters.classes.map(c => <MenuItem key={c} value={c}>Class {c}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 140, "& .MuiOutlinedInput-root": { height: 36, color: "#fff", bgcolor: "#0f172a", borderRadius: 1.5, "& fieldset": { borderColor: "rgba(255,255,255,0.1)" }, "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" } }, "& .MuiInputLabel-root": { color: "#94a3b8", fontSize: "0.8rem", transform: "translate(14px, 9px) scale(1)", "&.Mui-focused, &.MuiFormLabel-filled": { transform: "translate(14px, -9px) scale(0.75)" } }, "& .MuiSvgIcon-root": { color: "#94a3b8" } }}>
            <InputLabel>Subject Filter</InputLabel>
            <Select label="Subject Filter" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} sx={{ fontSize: "0.8rem", fontFamily: ff }}>
              <MenuItem value="all">All Subjects</MenuItem>
              {filters.subjects.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* ── KPI ROW (CSS grid — MUI v7 removed legacy Grid item/xs props) ── */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, flexShrink: 0 }}>
        {[
          { title: "Active Students", info: "Students who submitted at least one exam within the selected class/subject filters.", value: summary.total_students_attempted, icon: <PeopleAltIcon sx={{ color: PALETTE.blue, fontSize: 18 }} />, color: PALETTE.blue },
          { title: "School Average", info: "Average percentage across all submitted attempts in the current filters.", value: `${summary.average_percentage}%`, icon: <EmojiEventsIcon sx={{ color: PALETTE.green, fontSize: 18 }} />, color: PALETTE.green },
          { title: "Total Attempts", info: "Total number of exam submissions counted in these numbers.", value: summary.attempted_exams, icon: <InsightsIcon sx={{ color: PALETTE.purple, fontSize: 18 }} />, color: PALETTE.purple },
          { title: "Recent Trend", info: "How the latest exam average compares with the one before it — a quick health check of the newest results.", value: `${trendPositive ? "+" : ""}${summary.trend_delta}%`, icon: trendPositive ? <TrendingUpIcon sx={{ color: PALETTE.green, fontSize: 18 }} /> : <TrendingDownIcon sx={{ color: PALETTE.red, fontSize: 18 }} />, color: trendPositive ? PALETTE.green : PALETTE.red }
        ].map((kpi, i) => (
          <Box key={i}>
            <Paper sx={{ p: 1.5, borderRadius: 2, bgcolor: "#0f172a", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
              <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${kpi.color}15`, display: "flex" }}>{kpi.icon}</Box>
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography sx={{ color: "#94a3b8", fontFamily: ff, fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>{kpi.title}</Typography>
                  {kpi.info && <InfoTip text={kpi.info} size={13} />}
                </Stack>
                <Typography sx={{ color: "#fff", fontFamily: ff, fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.2 }}>{kpi.value}</Typography>
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>

      {/* ── MAIN DASHBOARD GRID (Fills remaining height) ── */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, flexGrow: 1, minHeight: 0 }}>

        {/* LEFT COLUMN: 8/12 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: { xs: 'auto', lg: '100%' }, minWidth: 0, minHeight: 0 }}>
          
          {/* Top Half: Macro Trends */}
          <WidgetCard title="Macro Trends (30 Days)" info="The school's average exam score per day over the last 30 days. A rising line means recent exams are going better." sx={{ flex: { lg: 1 }, minHeight: 0, height: { xs: 340, lg: 'auto' } }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.orange} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={PALETTE.orange} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10, fontFamily: ff }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 10, fontFamily: ff }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="percentage" name="Avg Score" stroke={PALETTE.orange} strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 4, strokeWidth: 0, fill: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Bottom Half: Ledger */}
          <WidgetCard title="Detailed Exam Ledger" info="Every submitted attempt, newest first (latest 50 shown). Search by student ID or exam name." sx={{ flex: { lg: 1 }, minHeight: 0, height: { xs: 340, lg: 'auto' } }} extraHeader={
            <TextField
              size="small"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                width: 160,
                "& .MuiOutlinedInput-root": { height: 28, color: "#e2e8f0", bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1, fontSize: "0.75rem", fontFamily: ff, "& fieldset": { borderColor: "rgba(255,255,255,0.1)" }, "&:hover fieldset": { borderColor: "rgba(255,255,255,0.25)" }, "&.Mui-focused fieldset": { borderColor: "rgba(255,255,255,0.4)" } }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#64748b", fontSize: 14 }} />
                  </InputAdornment>
                )
              }}
            />
          }>
            <TableContainer sx={{ height: '100%', overflowY: 'auto', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 } }}>
              <Table size="small" stickyHeader sx={{ minWidth: 500 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#0f172a", color: "#64748b", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.65rem", textTransform: "uppercase", py: 0.5 }}>Student ID</TableCell>
                    <TableCell sx={{ bgcolor: "#0f172a", color: "#64748b", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.65rem", textTransform: "uppercase", py: 0.5 }}>Class</TableCell>
                    <TableCell sx={{ bgcolor: "#0f172a", color: "#64748b", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.65rem", textTransform: "uppercase", py: 0.5 }}>Exam Name</TableCell>
                    <TableCell sx={{ bgcolor: "#0f172a", color: "#64748b", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.65rem", textTransform: "uppercase", py: 0.5 }}>Date</TableCell>
                    <TableCell sx={{ bgcolor: "#0f172a", color: "#64748b", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.65rem", textTransform: "uppercase", py: 0.5 }}>Score</TableCell>
                    <TableCell sx={{ bgcolor: "#0f172a", color: "#64748b", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.65rem", textTransform: "uppercase", py: 0.5 }}>Accuracy</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ borderBottom: "none", py: 4, color: "#64748b", fontFamily: ff, fontSize: "0.8rem" }}>
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchedRows.slice(0, 50).map((row, idx) => {
                      const tier = tierFor(row.percentage || 0);
                      return (
                        <TableRow key={idx} sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.02)" } }}>
                          <TableCell sx={{ color: "#cbd5e1", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: "0.75rem", py: 0.5 }}>{row.student_id}</TableCell>
                          <TableCell sx={{ color: "#94a3b8", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: "0.75rem", py: 0.5 }}>{row.class_number}</TableCell>
                          <TableCell sx={{ color: "#cbd5e1", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: "0.75rem", py: 0.5 }}>{row.exam_title}</TableCell>
                          <TableCell sx={{ color: "#64748b", fontFamily: ff, borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: "0.75rem", py: 0.5 }}>{row.submitted_time ? new Date(row.submitted_time).toLocaleDateString() : "-"}</TableCell>
                          <TableCell sx={{ color: "#cbd5e1", fontFamily: ff, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: "0.75rem", py: 0.5 }}>{`${row.score ?? 0} / ${row.total_marks ?? 0}`}</TableCell>
                          <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.02)", py: 0.5 }}>
                            <Chip label={`${row.percentage ?? 0}%`} size="small" sx={{ fontFamily: ff, fontWeight: 700, bgcolor: tier.bg, color: tier.color, height: 18, fontSize: "0.65rem", borderRadius: 0.75 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </WidgetCard>
        </Box>

        {/* RIGHT COLUMN: 4/12 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: { xs: 'auto', lg: '100%' }, minWidth: 0, minHeight: 0 }}>
          
          {/* Radar Chart */}
          <WidgetCard title="Subject Mastery" info="Average accuracy per subject across the whole school. A dent in the shape shows the subject that needs attention." sx={{ flex: { lg: 1 }, minHeight: 0, height: { xs: 340, lg: 'auto' } }}>
            {subjectChartData.length > 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={subjectChartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: ff }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Radar name="Accuracy" dataKey="percentage" stroke={PALETTE.purple} strokeWidth={1.5} fill={PALETTE.purple} fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Typography sx={{ color: "#475569", fontFamily: ff, fontSize: "0.75rem" }}>Insufficient data.</Typography>
              </Box>
            )}
          </WidgetCard>

          {/* Bar Chart */}
          <WidgetCard title="Class Accuracy" info="Average score by class. Green = 70%+, amber = 40–70%, red = below 40% and needs focus." sx={{ flex: { lg: 1 }, minHeight: 0, height: { xs: 340, lg: 'auto' } }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classChartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="class_number" width={40} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: ff }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} content={<CustomTooltip />} />
                <Bar dataKey="percentage" name="Accuracy" radius={[0, 3, 3, 0]} barSize={12}>
                  {classChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage > 70 ? PALETTE.green : entry.percentage > 40 ? PALETTE.amber : PALETTE.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </WidgetCard>

          {/* Top Subjects */}
          <WidgetCard title="Top Subjects" info="Your school's three strongest subjects by average accuracy." sx={{ flex: { lg: 0.8 }, minHeight: { xs: 180, lg: 0 } }}>
            <Box sx={{ overflowY: "auto", pr: 0.5, height: '100%', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 } }}>
              {strengths.length === 0 ? (
                 <Typography sx={{ color: "#64748b", fontFamily: ff, fontSize: "0.75rem" }}>No strengths identified.</Typography>
              ) : (
                <Stack spacing={0.75}>
                  {strengths.slice(0, 3).map((item, i) => (
                    <Box key={i} sx={{ display: "flex", justifyContent: "space-between", p: 1, bgcolor: "rgba(255,255,255,0.02)", borderRadius: 1, borderLeft: `3px solid ${PALETTE.green}` }}>
                      <Typography sx={{ color: "#cbd5e1", fontFamily: ff, fontSize: "0.75rem" }}>{item.subject}</Typography>
                      <Typography sx={{ color: PALETTE.green, fontFamily: ff, fontWeight: 700, fontSize: "0.75rem" }}>{item.percentage}%</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </WidgetCard>
        </Box>
      </Box>
    </Box>
  );
}
