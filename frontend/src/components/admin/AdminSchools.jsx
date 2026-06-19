import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, MenuItem, Select, InputLabel, 
  FormControl, Alert, IconButton, Stack, Paper, Grid, Chip, InputAdornment,
  TableRow, TableCell, Tooltip, Card, CardContent, useMediaQuery, useTheme
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SchoolIcon from '@mui/icons-material/School';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import api from '../../utils/api';
import { PageHeader, DataTableShell } from '../common';

const SCHOOL_COLUMNS = [
  { key: 'name', label: 'School' },
  { key: 'code', label: 'Code' },
  { key: 'students', label: 'Students' },
  { key: 'id', label: 'System ID' },
  { key: 'actions', label: 'Actions', align: 'right' },
];

export default function AdminSchools() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState(null);

  // --- STATE FOR SCHOOL FORM (Add/Edit School) ---
  const [openSchoolDialog, setOpenSchoolDialog] = useState(false);
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [currentSchoolId, setCurrentSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  // --- STATE FOR USER FORM (Create Admin/Specialist) ---
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('school_admin'); 
  const [email, setEmail] = useState('');
  const [specialistSubject, setSpecialistSubject] = useState('');

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    const results = schools.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSchools(results);
  }, [searchTerm, schools]);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/admin/schools');
      setSchools(res.data.schools || []);
    } catch (err) {
      console.error(err);
    }
  };

  // --- HANDLERS ---

  const handleOpenAddSchool = () => {
    setIsEditingSchool(false);
    setSchoolName('');
    setSchoolCode('');
    setOpenSchoolDialog(true);
  };

  const handleOpenEditSchool = (school) => {
    setIsEditingSchool(true);
    setCurrentSchoolId(school.id);
    setSchoolName(school.name);
    setSchoolCode(school.code);
    setOpenSchoolDialog(true);
  };

  const handleSaveSchool = async () => {
    if (!schoolName || !schoolCode) {
      setMsg({ type: 'error', text: 'School Name and Code are required' });
      return;
    }

    try {
      if (isEditingSchool) {
        await api.put(`/admin/schools/${currentSchoolId}`, { name: schoolName, code: schoolCode });
        setMsg({ type: 'success', text: 'School updated successfully' });
      } else {
        await api.post('/admin/schools', { name: schoolName, code: schoolCode });
        setMsg({ type: 'success', text: 'School created successfully' });
      }
      setOpenSchoolDialog(false);
      fetchSchools();
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'Operation failed' });
    }
  };

  const handleDeleteSchool = async (id) => {
    if(!window.confirm("Are you sure? This will delete the school and likely unassign its students.")) return;
    try {
      await api.delete(`/admin/schools/${id}`);
      setMsg({ type: 'success', text: 'School deleted' });
      fetchSchools();
    } catch (err) {
      setMsg({ type: 'error', text: 'Delete failed' });
    }
  };

  const createUser = async () => {
    if (!username || !role) {
      setMsg({ type: 'error', text: 'username and role required' });
      return;
    }
    if (role === 'school_admin' && !selectedSchool) {
      setMsg({ type: 'error', text: 'select a school for school_admin' });
      return;
    }
    if (role === 'subject_specialist' && !specialistSubject) {
       setMsg({ type: 'error', text: 'Subject is required for specialists' });
       return;
    }
    try {
      const payload = {
        username,
        password: password || undefined,
        email: email || undefined,
        role,
        school_id: role === 'school_admin' ? selectedSchool : undefined,
        specialist_subject: role === 'subject_specialist' ? specialistSubject : undefined
      };
      const res = await api.post('/admin/users/create', payload);
      setMsg({ type: 'success', text: `Created user: ${res.data.user.username}. Password: ${res.data.password || 'provided'}`});
      setOpenUserDialog(false);
      // Reset form
      setUsername(''); setPassword(''); setEmail(''); setSpecialistSubject('');
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: err.response?.data?.message || 'create failed' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="School Management"
        subtitle="Manage registered schools and assign administrative roles."
        actions={<>
          <Button variant="contained" startIcon={<AddCircleIcon />} onClick={handleOpenAddSchool}>
            Add School
          </Button>
          <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={() => setOpenUserDialog(true)}>
            Create User
          </Button>
        </>}
      />

      {/* ALERTS */}
      {msg && <Alert severity={msg.type} onClose={() => setMsg(null)} sx={{ mb: 3, borderRadius: 2 }}>{msg.text}</Alert>}

      {/* SEARCH BAR */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
        <TextField 
            fullWidth 
            placeholder="Search by school name or code..." 
            variant="outlined" 
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Paper>

      {/* SCHOOLS TABLE */}
      <DataTableShell
        columns={SCHOOL_COLUMNS}
        rows={filteredSchools}
        emptyIcon={<SchoolIcon />}
        emptyTitle="No schools found"
        emptyMessage="Add a school to get started, or adjust your search."
        renderMobileCard={(s) => (
          <Card key={s.id} sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.10)', boxShadow: 'none' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg,#2f6bff,#f68914)', color: '#fff',
                  }}>
                    <SchoolIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography fontWeight={700} sx={{ color: '#cfe0ff' }}>{s.name}</Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                      <Chip label={s.code} size="small" sx={{ bgcolor: 'rgba(47,107,255,0.18)', color: '#cfe0ff', fontWeight: 700 }} />
                      <Chip label={`${s.total_students ?? '—'} students`} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" sx={{ color: '#93c5fd' }} onClick={() => handleOpenEditSchool(s)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteSchool(s.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>System ID: #{s.id}</Typography>
            </CardContent>
          </Card>
        )}
        renderRow={(s) => (
          <TableRow key={s.id} hover>
            <TableCell>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 2, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,#2f6bff,#f68914)', color: '#fff',
                }}>
                  <SchoolIcon fontSize="small" />
                </Box>
                <Typography fontWeight={600}>{s.name}</Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Chip label={s.code} size="small" sx={{ bgcolor: 'rgba(47,107,255,0.18)', color: '#cfe0ff', fontWeight: 700 }} />
            </TableCell>
            <TableCell>{s.total_students ?? '—'}</TableCell>
            <TableCell><Typography variant="body2" color="text.secondary">#{s.id}</Typography></TableCell>
            <TableCell align="right">
              <Tooltip title="Edit">
                <IconButton size="small" sx={{ color: '#93c5fd' }} onClick={() => handleOpenEditSchool(s)}><EditIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => handleDeleteSchool(s.id)}><DeleteIcon fontSize="small" /></IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        )}
      />

      {/* ======================= */}
      {/* DIALOG 1: SCHOOL FORM   */}
      {/* ======================= */}
      <Dialog open={openSchoolDialog} onClose={() => setOpenSchoolDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{isEditingSchool ? 'Edit School' : 'Add New School'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
                autoFocus
                label="School Name"
                fullWidth
                variant="outlined"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
            />
            <TextField
                label="School Code (Unique)"
                fullWidth
                variant="outlined"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                helperText="e.g. SCH-001"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenSchoolDialog(false)} size="large" sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleSaveSchool} variant="contained" size="large" sx={{ borderRadius: 2 }}>Save School</Button>
        </DialogActions>
      </Dialog>

      {/* ======================= */}
      {/* DIALOG 2: USER FORM     */}
      {/* ======================= */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New User</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            
            <FormControl fullWidth>
                <InputLabel id="role-label">Select Role</InputLabel>
                <Select labelId="role-label" value={role} label="Select Role" onChange={(e) => setRole(e.target.value)}>
                <MenuItem value="school_admin">School Admin</MenuItem>
                <MenuItem value="subject_specialist">Subject Specialist</MenuItem>
                </Select>
            </FormControl>

            {role === 'school_admin' && (
                <FormControl fullWidth>
                <InputLabel id="school-select-label">Assign to School</InputLabel>
                <Select labelId="school-select-label" value={selectedSchool} label="Assign to School" onChange={(e) => setSelectedSchool(e.target.value)}>
                    {schools.map(s => <MenuItem key={s.id} value={s.id}>{s.name} ({s.code})</MenuItem>)}
                </Select>
                </FormControl>
            )}

            {role === 'subject_specialist' && (
                <TextField 
                    fullWidth 
                    label="Assigned Subject" 
                    placeholder="e.g. Math, Science, Physics"
                    value={specialistSubject} 
                    onChange={(e) => setSpecialistSubject(e.target.value)} 
                    helperText="This user will ONLY see questions tagged with this subject."
                />
            )}

            <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField fullWidth label="Password (Optional)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="Leave blank for auto-generated password"/>
            <TextField fullWidth label="Email (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenUserDialog(false)} size="large" sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button variant="contained" onClick={createUser} size="large" sx={{ borderRadius: 2 }}>Create User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}