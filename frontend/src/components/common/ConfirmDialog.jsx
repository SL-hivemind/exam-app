import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Stack, Box, TextField,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

/**
 * Confirmation dialog for destructive / important actions. Optionally requires
 * the user to type a confirmation phrase (generalizes the safe-reset dialog in
 * AdminExamDetail).
 *
 * <ConfirmDialog open={open} onClose={c} onConfirm={doIt} destructive
 *   title="Delete exam?" message="This cannot be undone."
 *   confirmText="DELETE" />
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  confirmText,
  loading = false,
}) {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);

  const blocked = confirmText ? typed.trim() !== confirmText : false;
  const color = destructive ? 'error' : 'primary';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: destructive ? 'error.main' : 'warning.main',
              bgcolor: destructive ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.12)',
            }}
          >
            <WarningAmberRoundedIcon />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {message && (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            {message}
          </Typography>
        )}
        {confirmText && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Type <strong>{confirmText}</strong> to confirm
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmText}
              sx={{ mt: 0.75 }}
              autoFocus
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ color: 'text.secondary' }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={color}
          disabled={blocked || loading}
        >
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
