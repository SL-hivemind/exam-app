import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Lanyard from './Lanyard';

export default function DynamicIDBadge({ profile }) {
  const [frontUrl, setFrontUrl] = useState(null);
  const [backUrl, setBackUrl] = useState(null);

  useEffect(() => {
    if (!profile) return;

    // Dimensions for the badge texture
    const W = 512;
    const H = 768;

    // Generate Front Image (SL Logo)
    const generateFront = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // Load SL Logo from S3
      // We append ?cors=1 to bypass browser cache, as the Navbar loads it without CORS headers first!
      const img = new Image();
      img.crossOrigin = 'anonymous'; 
      img.src = 'https://sl-exam-images.s3.ap-south-2.amazonaws.com/SL+LOGO.png?cors=1';
      
      await new Promise((resolve) => {
        img.onload = () => {
          // Draw image centered
          const scale = Math.min(W * 0.8 / img.width, H * 0.8 / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const x = (W - drawW) / 2;
          const y = (H - drawH) / 2;
          ctx.drawImage(img, x, y, drawW, drawH);
          resolve();
        };
        img.onerror = () => {
          // Fallback text if logo fails to load
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 80px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SL', W / 2, H / 2);
          resolve();
        };
      });

      setFrontUrl(canvas.toDataURL('image/png'));
    };

    // Generate Back Image (Profile Info)
    const generateBack = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // White Card Area
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(24, 24, W - 48, H - 48, 20);
      ctx.fill();

      // Header Banner
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(24, 24, W - 48, 120, [20, 20, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STAFF ID', W / 2, 84);

      // Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(profile.username || 'User', W / 2, 280);

      // Role
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 32px sans-serif';
      let roleDisplay = profile.role || 'Staff';
      if (roleDisplay === 'school_admin') roleDisplay = 'School Admin';
      if (roleDisplay === 'subject_specialist') roleDisplay = 'Subject Specialist';
      if (roleDisplay === 'admin') roleDisplay = 'System Admin';
      ctx.fillText(roleDisplay.toUpperCase(), W / 2, 340);

      // Divider
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(60, 400, W - 120, 2);

      // Extra Info
      ctx.fillStyle = '#475569';
      ctx.font = '28px sans-serif';
      if (profile.school_name) {
        ctx.fillText('School', W / 2, 460);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(profile.school_name, W / 2, 500);
      } else if (profile.specialist_subject) {
        ctx.fillText('Subject', W / 2, 460);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(profile.specialist_subject, W / 2, 500);
      } else {
        ctx.fillText('Access Level', W / 2, 460);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText('Global', W / 2, 500);
      }

      setBackUrl(canvas.toDataURL('image/png'));
    };

    generateFront();
    generateBack();
  }, [profile]);

  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        top: 64, // Anchor below the navbar
        right: { xs: 0, md: 40 }, // Hang on the right side
        width: { xs: 280, md: 350 }, 
        height: 600, 
        zIndex: 1200, 
        pointerEvents: 'none' // Let clicks pass through empty canvas areas
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, '& .lanyard-wrapper': { height: '100% !important' }, pointerEvents: 'auto', cursor: 'grab' }}>
        <Lanyard
          position={[0, 0, 16]}
          gravity={[0, -20, 0]}
          frontImage={backUrl} // Display the text info on the front
          backImage={frontUrl} // Display the SL logo on the back
          imageFit="cover"
        />
      </Box>
    </Box>
  );
}
