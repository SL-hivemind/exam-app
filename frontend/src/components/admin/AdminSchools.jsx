import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function AdminSchools() {
  const { authToken } = useAuth();
  const [schools, setSchools] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentSchool, setCurrentSchool] = useState({ id: null, name: '', branch: '', code: '' });
  const [isEdit, setIsEdit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSchools();
  }, [authToken]);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/admin/schools', {
        headers: { auth_token: authToken },
      });
      setSchools(res.data.schools || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch schools');
      console.error('Error fetching schools:', err);
    }
  };

  const handleOpenDialog = (school = { id: null, name: '', branch: '', code: '' }) => {
    setCurrentSchool(school);
    setIsEdit(!!school.id);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentSchool({ id: null, name: '', branch: '', code: '' });
  };

  const handleSaveSchool = async () => {
    try {
      const payload = { name: currentSchool.name, branch: currentSchool.branch, code: currentSchool.code };
      if (isEdit) {
        await api.put(`/admin/schools/${currentSchool.id}`, payload, {
          headers: { auth_token: authToken },
        });
      } else {
        await api.post('/admin/schools', payload, {
          headers: { auth_token: authToken },
        });
      }
      fetchSchools();
      handleCloseDialog();
      setError('');
      setSuccess(isEdit ? 'School updated successfully!' : 'School added successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save school');
      setSuccess('');
      console.error('Error saving school:', err);
    }
  };

  const handleDeleteSchool = async (id) => {
    if (window.confirm('Are you sure you want to delete this school?')) {
      try {
        await api.delete(`/admin/schools/${id}`, {
          headers: { auth_token: authToken },
        });
        fetchSchools();
        setError('');
        setSuccess('School deleted successfully!');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete school');
        setSuccess('');
        console.error('Error deleting school:', err);
      }
    }
  };

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (school.branch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (school.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Manage Schools
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {schools.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No schools found. Add a new school to get started.
        </Alert>
      )}
      <Box display="flex" justifyContent="space-between" mb={2}>
        <TextField
          label="Search Schools"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: '300px' }}
        />
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          <AddIcon /> Add School
        </Button>
      </Box>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
             <TableCell>Branch</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSchools.map((school) => (
              <TableRow key={school.id}>
                <TableCell>{school.id}</TableCell>
                <TableCell>{school.name}</TableCell>
                <TableCell>{school.code || 'N/A'}</TableCell>
                <TableCell>{school.branch || 'N/A'}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(school)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteSchool(school.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{isEdit ? 'Edit School' : 'Add School'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            name="name"
            value={currentSchool.name}
            onChange={(e) => setCurrentSchool({ ...currentSchool, name: e.target.value })}
            required
          />
          <TextField
            label="Branch"
            fullWidth
            margin="normal"
            name="branch"
            value={currentSchool.branch}
            onChange={(e) => setCurrentSchool({ ...currentSchool, branch: e.target.value })}
          />
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            name="code"
            value={currentSchool.code}
            onChange={(e) => setCurrentSchool({ ...currentSchool, code: e.target.value })}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveSchool} variant="contained" disabled={!currentSchool.name || !currentSchool.code}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
