import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel,
  IconButton, Chip, Divider, Alert, CircularProgress, Select, MenuItem,
  InputLabel, FormControl, Tabs, Tab, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PublishIcon from '@mui/icons-material/Publish';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import QuizIcon from '@mui/icons-material/Quiz';
import { publicApi } from '../../utils/api';

const ff = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

export default function AdminPublicManager() {
  const [tab, setTab] = useState(0);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [contents, setContents] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Dialogs
  const [courseDialog, setCourseDialog] = useState(false);
  const [contentDialog, setContentDialog] = useState(false);
  const [answerKeyDialog, setAnswerKeyDialog] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [editContent, setEditContent] = useState(null);

  // Form
  const [courseForm, setCourseForm] = useState({ title: '', description: '', price: 0, status: 'draft', thumbnail_url: '' });
  const [contentForm, setContentForm] = useState({ title: '', content_type: 'pdf_material', is_free: true, total_questions: '', answer_key_json: '', duration_minutes: '60', order_index: '0' });
  const fileRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [busy, setBusy] = useState(false);

  // Smart Paste
  const [smartPasteDialog, setSmartPasteDialog] = useState(false);
  const [smartPasteText, setSmartPasteText] = useState('');
  const [smartPasteTarget, setSmartPasteTarget] = useState(null);
  const [parsedPreview, setParsedPreview] = useState([]);
  const [questionPreview, setQuestionPreview] = useState({ open: false, contentId: null, questions: [] });

  const loadCourses = () => {
    setLoading(true);
    publicApi.adminListCourses()
      .then(r => setCourses(r.data.courses || []))
      .catch(() => setError('Failed to load courses'))
      .finally(() => setLoading(false));
  };

  const loadContents = (courseId) => {
    publicApi.adminListContents(courseId)
      .then(r => setContents(r.data.contents || []))
      .catch(() => {});
  };

  const loadSubs = () => {
    publicApi.adminSubscriptions()
      .then(r => setSubs(r.data.subscriptions || []))
      .catch(() => {});
  };

  useEffect(() => { loadCourses(); loadSubs(); }, []);
  useEffect(() => { if (selectedCourse) loadContents(selectedCourse.id); }, [selectedCourse]);

  // ── COURSE CRUD ──
  const openCourseDialog = (course = null) => {
    setEditCourse(course);
    setCourseForm(course ? {
      title: course.title, description: course.description || '',
      price: course.price || 0, status: course.status, thumbnail_url: course.thumbnail_url || '',
    } : { title: '', description: '', price: 0, status: 'draft', thumbnail_url: '' });
    setCourseDialog(true);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim()) { setError('Title is required'); return; }
    setBusy(true);
    try {
      if (editCourse) {
        await publicApi.adminUpdateCourse(editCourse.id, courseForm);
        setMsg('Course updated');
      } else {
        await publicApi.adminCreateCourse(courseForm);
        setMsg('Course created');
      }
      setCourseDialog(false);
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm('Delete this course and all its content?')) return;
    try {
      await publicApi.adminDeleteCourse(id);
      setMsg('Course deleted');
      if (selectedCourse?.id === id) setSelectedCourse(null);
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const togglePublish = async (course) => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      await publicApi.adminUpdateCourse(course.id, { status: newStatus });
      setMsg(`Course ${newStatus === 'published' ? 'published' : 'unpublished'}`);
      loadCourses();
    } catch { setError('Failed to update status'); }
  };

  // ── CONTENT CRUD ──
  const openContentDialog = (content = null) => {
    setEditContent(content);
    setSelectedFile(null);
    setContentForm(content ? {
      title: content.title, content_type: content.content_type,
      is_free: content.is_free, total_questions: content.total_questions || '',
      answer_key_json: content.answer_key_json || '', duration_minutes: content.duration_minutes || '60',
      order_index: content.order_index || '0',
    } : { title: '', content_type: 'pdf_material', is_free: true, total_questions: '', answer_key_json: '', duration_minutes: '60', order_index: '0' });
    setContentDialog(true);
  };

  const saveContent = async () => {
    if (!contentForm.title.trim()) { setError('Title is required'); return; }
    setBusy(true);
    try {
      if (editContent) {
        await publicApi.adminUpdateContent(editContent.id, contentForm);
        setMsg('Content updated');
      } else {
        const fd = new FormData();
        fd.append('title', contentForm.title);
        fd.append('content_type', contentForm.content_type);
        fd.append('is_free', contentForm.is_free);
        fd.append('total_questions', contentForm.total_questions);
        fd.append('answer_key_json', contentForm.answer_key_json);
        fd.append('duration_minutes', contentForm.duration_minutes);
        fd.append('order_index', contentForm.order_index);
        if (selectedFile) fd.append('file', selectedFile);
        await publicApi.adminUploadContent(selectedCourse.id, fd);
        setMsg('Content uploaded');
      }
      setContentDialog(false);
      loadContents(selectedCourse.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  const deleteContent = async (id) => {
    if (!window.confirm('Delete this content?')) return;
    try {
      await publicApi.adminDeleteContent(id);
      setMsg('Content deleted');
      loadContents(selectedCourse.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const openSmartPaste = (content) => {
    setSmartPasteTarget(content);
    setSmartPasteText('');
    setParsedPreview([]);
    setSmartPasteDialog(true);
  };

  const submitSmartPaste = async () => {
    if (!smartPasteText.trim() || !smartPasteTarget) return;
    setBusy(true);
    try {
      const r = await publicApi.adminSmartPaste(smartPasteTarget.id, smartPasteText);
      setMsg(r.data.message || 'Questions parsed!');
      setParsedPreview(r.data.questions || []);
      loadContents(selectedCourse.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Parsing failed');
    } finally { setBusy(false); }
  };

  const viewQuestions = async (contentId) => {
    try {
      const r = await publicApi.adminListQuestions(contentId);
      setQuestionPreview({ open: true, contentId, questions: r.data.questions || [] });
    } catch { setError('Failed to load questions'); }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      fontFamily: ff, borderRadius: '10px', fontSize: '0.9rem',
    },
  };

  return (
    <Box sx={{ fontFamily: ff }}>
      <Typography sx={{ fontFamily: ff, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
        Public Exam Manager
      </Typography>
      <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#64748b', mb: 3 }}>
        Create courses, upload content, and manage public exams.
      </Typography>

      {msg && <Alert severity="success" onClose={() => setMsg('')} sx={{ mb: 2, borderRadius: '12px' }}>{msg}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
        mb: 3,
        '& .MuiTab-root': { fontFamily: ff, fontWeight: 600, textTransform: 'none' },
        '& .Mui-selected': { color: '#2563eb' },
        '& .MuiTabs-indicator': { bgcolor: '#2563eb' },
      }}>
        <Tab icon={<DescriptionIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Courses" />
        <Tab icon={<PeopleIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Subscriptions" />
      </Tabs>

      {tab === 0 ? (
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Course List */}
          <Box sx={{ flex: '0 0 360px', maxWidth: { xs: '100%', md: 360 } }}>
            <Button startIcon={<AddIcon />} onClick={() => openCourseDialog()} variant="contained"
              sx={{
                mb: 2, fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)', width: '100%',
              }}>
              New Course
            </Button>

            {loading ? (
              <CircularProgress size={28} />
            ) : courses.length === 0 ? (
              <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 4 }}>No courses yet</Typography>
            ) : (
              courses.map(c => (
                <Card key={c.id}
                  onClick={() => setSelectedCourse(c)}
                  sx={{
                    mb: 1.5, borderRadius: '12px', cursor: 'pointer',
                    border: selectedCourse?.id === c.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    boxShadow: 'none', transition: 'all 0.2s',
                    '&:hover': { borderColor: '#93c5fd' },
                  }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', mb: 0.5 }}>
                          {c.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Chip label={c.status} size="small"
                            sx={{
                              fontFamily: ff, fontWeight: 600, fontSize: '0.7rem',
                              bgcolor: c.status === 'published' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                              color: c.status === 'published' ? '#16a34a' : '#eab308',
                            }} />
                          <Chip label={c.price > 0 ? `₹${c.price}` : 'Free'} size="small"
                            sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.7rem', bgcolor: '#f1f5f9', color: '#64748b' }} />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={c.status === 'published' ? 'Unpublish' : 'Publish'}>
                          <IconButton size="small" onClick={e => { e.stopPropagation(); togglePublish(c); }}>
                            <PublishIcon fontSize="small" sx={{ color: c.status === 'published' ? '#16a34a' : '#94a3b8' }} />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={e => { e.stopPropagation(); openCourseDialog(c); }}>
                          <EditIcon fontSize="small" sx={{ color: '#64748b' }} />
                        </IconButton>
                        <IconButton size="small" onClick={e => { e.stopPropagation(); deleteCourse(c.id); }}>
                          <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>

          {/* Content Panel */}
          <Box sx={{ flex: 1 }}>
            {selectedCourse ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                    Content — {selectedCourse.title}
                  </Typography>
                  <Button startIcon={<UploadFileIcon />} onClick={() => openContentDialog()} variant="outlined"
                    sx={{ fontFamily: ff, fontWeight: 600, textTransform: 'none', borderRadius: '10px' }}>
                    Add Content
                  </Button>
                </Box>
                {contents.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <UploadFileIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
                    <Typography sx={{ color: '#94a3b8', fontFamily: ff }}>No content yet. Upload a PDF or use Smart Paste.</Typography>
                  </Box>
                ) : (
                  contents.map((c, i) => (
                    <Card key={c.id} sx={{ mb: 1.5, borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography sx={{ fontFamily: ff, fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                            {c.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Chip label={c.content_type} size="small" sx={{ fontFamily: ff, fontSize: '0.68rem', bgcolor: '#f1f5f9', color: '#64748b' }} />
                            <Chip label={c.is_free ? 'Free' : 'Paid'} size="small"
                              sx={{
                                fontFamily: ff, fontSize: '0.68rem',
                                bgcolor: c.is_free ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                                color: c.is_free ? '#16a34a' : '#a855f7',
                              }} />
                            {c.total_questions && (
                              <Chip label={`${c.total_questions} Q`} size="small"
                                sx={{ fontFamily: ff, fontSize: '0.68rem', bgcolor: 'rgba(59,130,246,0.1)', color: '#2563eb' }} />
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {c.content_type === 'cbt_exam' && (
                            <Tooltip title="View Questions">
                              <IconButton size="small" onClick={() => viewQuestions(c.id)}>
                                <QuizIcon fontSize="small" sx={{ color: '#2563eb' }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Smart Paste Questions">
                            <IconButton size="small" onClick={() => openSmartPaste(c)}>
                              <ContentPasteIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small" onClick={() => openContentDialog(c)}>
                            <EditIcon fontSize="small" sx={{ color: '#64748b' }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => deleteContent(c.id)}>
                            <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <VisibilityIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontFamily: ff }}>Select a course to manage its content</Typography>
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        /* ── Subscriptions Tab ── */
        <Box sx={{ bgcolor: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'auto' }}>
          {subs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography sx={{ color: '#94a3b8', fontFamily: ff }}>No subscriptions yet</Typography>
            </Box>
          ) : (
            <Box sx={{ minWidth: 600 }}>
              <Box sx={{ display: 'flex', px: 2.5, py: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['User', 'Email', 'Course', 'Status', 'Date'].map(h => (
                  <Typography key={h} sx={{ flex: 1, fontFamily: ff, fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                    {h}
                  </Typography>
                ))}
              </Box>
              {subs.map(s => (
                <Box key={s.id} sx={{ display: 'flex', px: 2.5, py: 1.5, borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                  <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    {s.username || '—'}
                  </Typography>
                  <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.82rem', color: '#64748b' }}>
                    {s.email || '—'}
                  </Typography>
                  <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.82rem', color: '#0f172a' }}>
                    {s.course_title || '—'}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Chip label={s.status} size="small"
                      sx={{
                        fontFamily: ff, fontWeight: 600,
                        bgcolor: s.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                        color: s.status === 'active' ? '#16a34a' : '#eab308',
                      }} />
                  </Box>
                  <Typography sx={{ flex: 1, fontFamily: ff, fontSize: '0.78rem', color: '#94a3b8' }}>
                    {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : '—'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ── Course Dialog ── */}
      <Dialog open={courseDialog} onClose={() => setCourseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>
          {editCourse ? 'Edit Course' : 'Create Course'}
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Title" value={courseForm.title}
            onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
            sx={{ ...inputSx, mt: 1, mb: 2 }} size="small" required />
          <TextField fullWidth label="Description" value={courseForm.description}
            onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
            sx={{ ...inputSx, mb: 2 }} size="small" multiline rows={3} />
          <TextField fullWidth label="Price (₹)" type="number" value={courseForm.price}
            onChange={e => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })}
            sx={{ ...inputSx, mb: 2 }} size="small" />
          <TextField fullWidth label="Thumbnail URL (optional)" value={courseForm.thumbnail_url}
            onChange={e => setCourseForm({ ...courseForm, thumbnail_url: e.target.value })}
            sx={{ ...inputSx, mb: 2 }} size="small" />
          <FormControl fullWidth size="small" sx={{ ...inputSx }}>
            <InputLabel>Status</InputLabel>
            <Select value={courseForm.status} label="Status"
              onChange={e => setCourseForm({ ...courseForm, status: e.target.value })}>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="published">Published</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseDialog(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={saveCourse} disabled={busy} variant="contained"
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}>
            {busy ? <CircularProgress size={20} /> : editCourse ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Content Dialog ── */}
      <Dialog open={contentDialog} onClose={() => setContentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>
          {editContent ? 'Edit Content' : 'Upload Content'}
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Title" value={contentForm.title}
            onChange={e => setContentForm({ ...contentForm, title: e.target.value })}
            sx={{ ...inputSx, mt: 1, mb: 2 }} size="small" required />
          <FormControl fullWidth size="small" sx={{ ...inputSx, mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select value={contentForm.content_type} label="Type"
              onChange={e => setContentForm({ ...contentForm, content_type: e.target.value })}>
              <MenuItem value="pdf_material">Study Material (PDF)</MenuItem>
              <MenuItem value="pdf_exam">PDF Exam (PDF + OMR Sheet)</MenuItem>
              <MenuItem value="cbt_exam">Interactive Exam (Smart Paste / CBT)</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={contentForm.is_free}
              onChange={e => setContentForm({ ...contentForm, is_free: e.target.checked })} />}
            label={<Typography sx={{ fontFamily: ff, fontSize: '0.85rem' }}>Free access (visible to all registered users)</Typography>}
            sx={{ mb: 2 }}
          />
          {contentForm.content_type === 'pdf_exam' && (
            <>
              <TextField fullWidth label="Total Questions" type="number" value={contentForm.total_questions}
                onChange={e => setContentForm({ ...contentForm, total_questions: e.target.value })}
                sx={{ ...inputSx, mb: 2 }} size="small" />
              <TextField fullWidth label="Duration (minutes)" type="number" value={contentForm.duration_minutes}
                onChange={e => setContentForm({ ...contentForm, duration_minutes: e.target.value })}
                sx={{ ...inputSx, mb: 2 }} size="small" />
              <TextField fullWidth label='Answer Key JSON (e.g. {"1":"A","2":"C"})' value={contentForm.answer_key_json}
                onChange={e => setContentForm({ ...contentForm, answer_key_json: e.target.value })}
                sx={{ ...inputSx, mb: 2 }} size="small" multiline rows={3}
                helperText={'Format: {"1":"A","2":"B","3":"C",...}'} />
            </>
          )}
          {!editContent && (
            <Box sx={{ mb: 2 }}>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => setSelectedFile(e.target.files[0])} />
              <Button startIcon={<UploadFileIcon />} onClick={() => fileRef.current?.click()} variant="outlined"
                sx={{ fontFamily: ff, textTransform: 'none', borderRadius: '10px' }}>
                {selectedFile ? selectedFile.name : 'Choose PDF File'}
              </Button>
            </Box>
          )}
          <TextField fullWidth label="Order Index" type="number" value={contentForm.order_index}
            onChange={e => setContentForm({ ...contentForm, order_index: e.target.value })}
            sx={{ ...inputSx }} size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContentDialog(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={saveContent} disabled={busy} variant="contained"
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}>
            {busy ? <CircularProgress size={20} /> : editContent ? 'Update' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Smart Paste Dialog */}
      <Dialog open={smartPasteDialog} onClose={() => setSmartPasteDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContentPasteIcon sx={{ color: '#f59e0b' }} /> Smart Paste {smartPasteTarget ? `— ${smartPasteTarget.title}` : ''}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: ff, fontSize: '0.82rem', color: '#64748b', mb: 2 }}>
            Paste raw question text below. Supported format: <code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>1. Question? A) opt B) opt C) opt D) opt Answer: B</code>
          </Typography>
          <TextField fullWidth multiline rows={14} placeholder={"1. What is the capital of India?\nA) Mumbai\nB) New Delhi\nC) Chennai\nD) Kolkata\nAnswer: B\nExplanation: New Delhi is the capital.\n\n2. Who wrote Hamlet?\nA) Dickens\nB) Shakespeare\nC) Austen\nD) Twain\nAnswer: B"}
            value={smartPasteText} onChange={e => setSmartPasteText(e.target.value)}
            sx={{ ...inputSx, mb: 2, '& textarea': { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
          {parsedPreview.length > 0 && (
            <Alert severity="success" sx={{ borderRadius: '10px', mb: 1 }}>
              {parsedPreview.length} questions parsed successfully!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSmartPasteDialog(false)} sx={{ fontFamily: ff, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={submitSmartPaste} disabled={busy || !smartPasteText.trim()} variant="contained"
            startIcon={busy ? <CircularProgress size={16} /> : <ContentPasteIcon />}
            sx={{ fontFamily: ff, fontWeight: 700, textTransform: 'none', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            Parse & Save Questions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Question Preview Dialog */}
      <Dialog open={questionPreview.open} onClose={() => setQuestionPreview({ open: false, contentId: null, questions: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: ff, fontWeight: 700 }}>
          Questions Preview ({questionPreview.questions.length} total)
        </DialogTitle>
        <DialogContent>
          {questionPreview.questions.map((q) => {
            const opts = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
            return (
              <Box key={q.id} sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Typography sx={{ fontFamily: ff, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', mb: 1 }}>
                  Q{q.order_index}. {q.question_text}
                </Typography>
                {['A', 'B', 'C', 'D'].map(letter => (
                  <Box key={letter} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, pl: 1 }}>
                    <Chip label={letter} size="small"
                      sx={{ fontFamily: ff, fontWeight: 700, width: 28, height: 24,
                        bgcolor: q.correct_option === letter ? 'rgba(34,197,94,0.15)' : '#fff',
                        color: q.correct_option === letter ? '#16a34a' : '#64748b',
                        border: q.correct_option === letter ? '1.5px solid #16a34a' : '1px solid #e2e8f0' }} />
                    <Typography sx={{ fontFamily: ff, fontSize: '0.85rem', color: '#334155' }}>
                      {opts[letter] || ''}
                    </Typography>
                  </Box>
                ))}
                {q.explanation && (
                  <Typography sx={{ fontFamily: ff, fontSize: '0.78rem', color: '#64748b', mt: 1, fontStyle: 'italic' }}>
                    Explanation: {q.explanation}
                  </Typography>
                )}
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionPreview({ open: false, contentId: null, questions: [] })}
            sx={{ fontFamily: ff, textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
