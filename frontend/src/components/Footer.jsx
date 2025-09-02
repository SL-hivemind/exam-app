import React from "react";
import { Box, Typography, Link } from "@mui/material";

export default function Footer() {
  return (
    <Box component="footer" sx={{ py: 3, textAlign: "center", bgcolor: "grey.100", mt: 4 }}>
      <Typography variant="body2">
        © {new Date().getFullYear()} Online Exam System ·{" "}
        <Link href="#" underline="hover">Privacy</Link> ·{" "}
        <Link href="#" underline="hover">Terms</Link>
      </Typography>
    </Box>
  );
}
