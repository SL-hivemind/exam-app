// src/components/admin/AdminDashboard.jsx
import React from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import AdminSchools from './AdminSchools';
import AdminExams from './AdminExams';
import AdminStudents from './AdminStudents';   // 👈 new
import useAuth from '../../hooks/useAuth';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = React.useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard - Welcome, {user?.username || 'Admin'}
      </Typography>
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Manage Schools" />
        <Tab label="Manage Students" />
        <Tab label="Manage Exams" />
      </Tabs>
      {tabValue === 0 && <AdminSchools />}
      {tabValue === 1 && <AdminStudents />}
      {tabValue === 2 && <AdminExams />}
    </Box>
  );
}
