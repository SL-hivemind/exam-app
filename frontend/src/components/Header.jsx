import React from "react";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";

export default function Header() {
  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar>
        <img
          src="/SLlogo.png"
          alt="Logo"
          style={{ width: '60px', height: '60px', marginRight: '16px', backgroundColor: 'white', padding: '5px' }}
        />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          SAARADAA LEARKNOWATIONS
        </Typography>
        <Box sx={{ flex: 1 }} />
      </Toolbar>
    </AppBar>
  );
}
