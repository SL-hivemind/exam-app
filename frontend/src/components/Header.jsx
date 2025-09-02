import React from "react";
import { AppBar, Toolbar, Typography, IconButton, Box } from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";

export default function Header() {
  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <IconButton size="large" edge="start" color="inherit" aria-label="logo" sx={{ mr: 1 }}>
          <SchoolIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Online Exam System
        </Typography>
        <Box sx={{ flex: 1 }} />
      </Toolbar>
    </AppBar>
  );
}
