import React, { useEffect, useState } from "react";
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
  useTheme,
  useMediaQuery,
  Card,
  CardContent
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  Insights as InsightsIcon,
  School as SchoolIcon,
  EmojiEvents as EmojiEventsIcon
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

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", bgcolor: '#0b1120' }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, bgcolor: '#0b1120', minHeight: '100vh' }}>
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
  const filteredTrendPositive = filteredTrendDelta >= 0;
  
  const pieEarned = filteredExamWise.reduce((acc, e) => acc + Number(e.score || 0), 0);
  const pieTotal = filteredExamWise.reduce((acc, e) => acc + Number(e.total_marks || 0), 0);
  const pieRemaining = Math.max(pieTotal - pieEarned, 0);
  
  const marksPieData = [
    { name: "Earned", value: pieEarned, color: "#10b981" },
    { name: "Remaining", value: pieRemaining, color: "#334155" }
  ];
  
  const chapterChartData = (chapter_breakdown || []).slice(0, 12);
  const subjectChartData = (subject_breakdown || []).slice(0, 10);
  const trendPositive = filteredTrendPositive;

  // Reusable custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', p: 1.5, borderRadius: 2, backdropFilter: 'blur(8px)' }}>
          <Typography sx={{ color: '#fff', fontFamily: ff, fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} sx={{ color: entry.color, fontFamily: ff, fontSize: '0.85rem' }}>
              {entry.name}: {entry.value}%
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#020617", minHeight: "100vh", color: '#f8fafc' }}>
      <Toolbar />
      <Container maxWidth="xl" sx={{ px: { xs: 0, md: 2 } }}>
      
      {/* ── HEADER CARD ── */}
      <Paper
        sx={{
          p: { xs: 2.5, md: 4 },
          mb: 4,
          borderRadius: 4,
          color: "#fff",
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        {/* Decorative background elements */}
        <Box sx={{ position: 'absolute', top: -100, right: -50, width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: -50, left: 100, width: 200, height: 200, background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: ff, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              Analytics Intelligence
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, mt: 0.8, fontFamily: ff, maxWidth: 500 }}>
              AI-driven insights into your performance trends, subject proficiencies, and strategic improvement areas.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: "rgba(255,255,255,0.1)", backdropFilter: 'blur(10px)', borderRadius: 2, '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }, '& .MuiSvgIcon-root': { color: '#fff' } }}>
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
              sx={{ bgcolor: "rgba(255,255,255,0.1)", backdropFilter: 'blur(10px)', color: "#fff", borderRadius: 2, textTransform: 'none', fontWeight: 600, fontFamily: ff, boxShadow: 'none', border: '1px solid rgba(255,255,255,0.2)', "&:hover": { bgcolor: "rgba(255,255,255,0.2)", boxShadow: 'none' } }}
            >
              Exams
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── KPI METRICS ── */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {[
          { title: 'Exams Attempted', value: filteredAttempted, icon: <SchoolIcon sx={{ color: '#60a5fa' }} />, color: 'rgba(96,165,250,0.1)' },
          { title: 'Average Score', value: `${filteredAvgPct}%`, icon: <EmojiEventsIcon sx={{ color: '#34d399' }} />, color: 'rgba(52,211,153,0.1)' },
          { title: 'Avg Percentile', value: filteredAvgPercentile, icon: <InsightsIcon sx={{ color: '#f472b6' }} />, color: 'rgba(244,114,182,0.1)' },
          { title: 'Recent Trend', value: `${trendPositive ? "+" : ""}${filteredTrendDelta}%`, icon: <TrendingUpIcon sx={{ color: trendPositive ? '#34d399' : '#f87171' }} />, color: trendPositive ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)' }
        ].map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper sx={{ p: 3, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: '#0f172a', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'absolute', top: 0, right: 0, p: 2, bgcolor: kpi.color, borderBottomLeftRadius: 24 }}>
                {kpi.icon}
              </Box>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: ff, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {kpi.title}
              </Typography>
              <Typography variant="h3" fontWeight={800} sx={{ fontFamily: ff, color: '#f8fafc', mt: 1 }}>
                {kpi.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── CHARTS SECTION ── */}
      <Grid container spacing={3}>
        
        {/* Score Trend - Area Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: '#0f172a', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', height: { xs: 360, md: 430 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ fontFamily: ff, color: '#f8fafc' }}>Performance Velocity</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3, fontFamily: ff }}>Score progression across recent examinations</Typography>
            
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={filteredTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="percentage" name="Score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Radar Chart - Subject Proficiency */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: '#0f172a', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', height: { xs: 380, md: 430 }, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={700} sx={{ fontFamily: ff, color: '#f8fafc' }}>Subject Proficiency</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1, fontFamily: ff }}>Multidimensional skill map</Typography>
            
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {subjectChartData.length > 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjectChartData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: ff }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Radar name="Accuracy" dataKey="percentage" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <Typography sx={{ color: '#475569', fontFamily: ff, fontSize: '0.9rem', textAlign: 'center' }}>
                  Not enough subjects for radar mapping.<br/>Keep practicing!
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Strengths & Weaknesses */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 4, border: "1px solid rgba(52,211,153,0.2)", bgcolor: 'rgba(52,211,153,0.03)', height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Box sx={{ p: 1, bgcolor: 'rgba(52,211,153,0.2)', borderRadius: 2 }}><EmojiEventsIcon sx={{ color: '#34d399' }} /></Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: ff, color: '#f8fafc' }}>Core Strengths</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: ff }}>Top-performing chapters</Typography>
              </Box>
            </Stack>
            {(strengths || []).length === 0 ? (
              <Typography variant="body2" sx={{ color: '#64748b', mt: 2, fontFamily: ff }}>No strong chapters identified yet.</Typography>
            ) : (
              <Stack spacing={1.5} mt={3}>
                {strengths.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, borderLeft: '4px solid #34d399' }}>
                    <Typography sx={{ color: '#cbd5e1', fontFamily: ff, fontSize: '0.9rem', fontWeight: 500 }}>{item.chapter}</Typography>
                    <Typography sx={{ color: '#34d399', fontFamily: ff, fontWeight: 700 }}>{item.percentage}%</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 4, border: "1px solid rgba(248,113,113,0.2)", bgcolor: 'rgba(248,113,113,0.03)', height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Box sx={{ p: 1, bgcolor: 'rgba(248,113,113,0.2)', borderRadius: 2 }}><TrendingUpIcon sx={{ color: '#f87171' }} /></Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: ff, color: '#f8fafc' }}>Growth Opportunities</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: ff }}>Chapters requiring immediate focus</Typography>
              </Box>
            </Stack>
            {(improvement_needed || []).length === 0 ? (
              <Typography variant="body2" sx={{ color: '#64748b', mt: 2, fontFamily: ff }}>No weak chapters detected.</Typography>
            ) : (
              <Stack spacing={1.5} mt={3}>
                {improvement_needed.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, borderLeft: '4px solid #f87171' }}>
                    <Typography sx={{ color: '#cbd5e1', fontFamily: ff, fontSize: '0.9rem', fontWeight: 500 }}>{item.chapter}</Typography>
                    <Typography sx={{ color: '#f87171', fontFamily: ff, fontWeight: 700 }}>{item.percentage}%</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Chapter Accuracy Bar Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: '#0f172a', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', height: { xs: 450, md: 500 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ fontFamily: ff, color: '#f8fafc' }}>Granular Chapter Accuracy</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3, fontFamily: ff }}>Score breakdown across all tested chapters</Typography>
            
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chapterChartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: isMobile ? 0 : 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="chapter" width={isMobile ? 100 : 180} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 12, fontFamily: ff }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                <Bar dataKey="percentage" name="Accuracy" radius={[0, 4, 4, 0]} barSize={isMobile ? 16 : 24}>
                  {chapterChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage > 70 ? '#34d399' : entry.percentage > 40 ? '#fbbf24' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Exam-wise Performance - Responsive Table/Cards */}
        <Grid item xs={12}>
          <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", bgcolor: '#0f172a', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ fontFamily: ff, color: '#f8fafc', mb: 3, px: { xs: 1, md: 0 } }}>Examination Ledger</Typography>
            
            {isMobile ? (
              /* MOBILE CARDS FOR EXAM HISTORY */
              <Stack spacing={2}>
                {filteredExamWise.map((e, idx) => (
                  <Card key={idx} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, boxShadow: 'none' }}>
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography sx={{ fontFamily: ff, fontWeight: 700, color: '#e2e8f0', fontSize: '1rem', pr: 2 }}>{e.exam_title}</Typography>
                        <Chip 
                          label={`${e.percentage ?? 0}%`} 
                          size="small" 
                          sx={{ 
                            fontFamily: ff, fontWeight: 700, 
                            bgcolor: (e.percentage||0) >= 60 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', 
                            color: (e.percentage||0) >= 60 ? '#34d399' : '#f87171' 
                          }} 
                        />
                      </Box>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography sx={{ color: '#64748b', fontFamily: ff, fontSize: '0.85rem' }}>Submitted</Typography>
                          <Typography sx={{ color: '#cbd5e1', fontFamily: ff, fontSize: '0.85rem' }}>{e.submitted_time ? new Date(e.submitted_time).toLocaleDateString() : "-"}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography sx={{ color: '#64748b', fontFamily: ff, fontSize: '0.85rem' }}>Score</Typography>
                          <Typography sx={{ color: '#cbd5e1', fontFamily: ff, fontSize: '0.85rem', fontWeight: 600 }}>{`${e.score ?? 0} / ${e.total_marks ?? 0}`}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography sx={{ color: '#64748b', fontFamily: ff, fontSize: '0.85rem' }}>Percentile</Typography>
                          <Typography sx={{ color: '#cbd5e1', fontFamily: ff, fontSize: '0.85rem' }}>{e.percentile ?? 0}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography sx={{ color: '#64748b', fontFamily: ff, fontSize: '0.85rem' }}>Rank</Typography>
                          <Typography sx={{ color: '#cbd5e1', fontFamily: ff, fontSize: '0.85rem' }}>{e.rank && e.participants ? `${e.rank} / ${e.participants}` : "-"}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              /* DESKTOP TABLE */
              <TableContainer sx={{ maxHeight: 420, '&::-webkit-scrollbar': { width: 8, height: 8 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 } }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      {['Exam Name', 'Date Submitted', 'Raw Score', 'Accuracy', 'Percentile', 'Cohort Rank'].map((head) => (
                        <TableCell key={head} sx={{ bgcolor: '#0f172a', color: '#94a3b8', fontFamily: ff, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{head}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredExamWise.map((e, idx) => (
                      <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell sx={{ color: '#e2e8f0', fontFamily: ff, borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 500 }}>{e.exam_title}</TableCell>
                        <TableCell sx={{ color: '#94a3b8', fontFamily: ff, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{e.submitted_time ? new Date(e.submitted_time).toLocaleString() : "-"}</TableCell>
                        <TableCell sx={{ color: '#e2e8f0', fontFamily: ff, borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>{`${e.score ?? 0} / ${e.total_marks ?? 0}`}</TableCell>
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <Chip label={`${e.percentage ?? 0}%`} size="small" sx={{ fontFamily: ff, fontWeight: 700, bgcolor: (e.percentage||0) >= 60 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: (e.percentage||0) >= 60 ? '#34d399' : '#f87171' }} />
                        </TableCell>
                        <TableCell sx={{ color: '#e2e8f0', fontFamily: ff, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{e.percentile ?? 0}</TableCell>
                        <TableCell sx={{ color: '#cbd5e1', fontFamily: ff, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{e.rank && e.participants ? `${e.rank} / ${e.participants}` : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
}
