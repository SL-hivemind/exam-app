import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  IconButton, Button, Stack, Typography, Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Standard CRUD dialog shell: title bar (with close), divided content, and a
 * Cancel / submit action row. Children render the form fields.
 *
 * <FormDialog open={open} onClose={close} title="Create Exam"
 *             submitLabel="Create" onSubmit={save} loading={saving}>
 *   ...fields...
 * </FormDialog>
 */
export default function FormDialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitColor = 'primary',
  submitVariant = 'contained',
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
  maxWidth = 'sm',
  hideActions = false,
  extraActions,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Typography component="div" sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 14, right: 14, color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2.5 }}>
        <Box component="form" onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(e); }}>
          {children}
        </Box>
      </DialogContent>
      {!hideActions && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          {extraActions}
          <Stack direction="row" spacing={1.5} sx={{ ml: 'auto' }}>
            <Button onClick={onClose} color="inherit" sx={{ color: 'text.secondary' }}>
              {cancelLabel}
            </Button>
            {onSubmit && (
              <Button
                onClick={onSubmit}
                variant={submitVariant}
                color={submitColor}
                disabled={disabled || loading}
              >
                {loading ? 'Saving…' : submitLabel}
              </Button>
            )}
          </Stack>
        </DialogActions>
      )}
    </Dialog>
  );
}
