import React, { useEffect, useState } from 'react';
import {
  Box, Stack, Typography, MenuItem, TextField, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Chip, Alert, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../utils/api';

/**
 * Per-exam monitoring configuration.
 *
 * A profile sets the baseline; individual switches below record only the
 * DIFFERENCES from it. Storing overrides as a sparse patch rather than a full
 * copy is what lets a later change to a profile reach exams that already use
 * it, instead of being silently shadowed by a snapshot taken at create time.
 */

const GROUPS = [
  {
    title: 'Browser restrictions',
    items: [
      ['disableRightClick', 'Disable right click'],
      ['disableCopy', 'Disable copy / cut'],
      ['disablePaste', 'Disable paste'],
      ['disableShortcuts', 'Block keyboard shortcuts'],
      ['warnOnUnload', 'Warn before leaving the page'],
    ],
  },
  {
    title: 'Focus & fullscreen',
    items: [
      ['detectTabSwitch', 'Detect tab switching'],
      ['detectWindowBlur', 'Detect window losing focus'],
      ['requireFullscreen', 'Require fullscreen'],
    ],
  },
  {
    title: 'Camera',
    items: [
      ['cameraRequired', 'Turn on camera presence check'],
      ['facePresence', 'Face presence monitoring'],
    ],
  },
  {
    title: 'Enforcement',
    items: [
      ['autoSubmitOnMaxViolations', 'Auto-submit after repeated violations'],
    ],
  },
];

export default function ProctoringSettings({
  profileId, overrides, onProfileChange, onOverridesChange, disabled,
}) {
  const [profiles, setProfiles] = useState([]);
  const [defaults, setDefaults] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/admin/proctor-profiles')
      .then((res) => {
        if (cancelled) return;
        setProfiles(res.data.profiles || []);
        setDefaults(res.data.defaults || {});
      })
      .catch(() => { if (!cancelled) setError('Could not load monitoring profiles.'); });
    return () => { cancelled = true; };
  }, []);

  const selected = profiles.find((p) => String(p.id) === String(profileId));
  const baseline = { ...defaults, ...(selected?.settings || {}) };
  const effective = { ...baseline, ...(overrides || {}) };

  const setToggle = (key, value) => {
    const next = { ...(overrides || {}) };
    // Matching the baseline again means "no override" — drop the key rather
    // than storing a redundant one, so the patch stays a true diff.
    if (baseline[key] === value) delete next[key];
    else next[key] = value;
    onOverridesChange(next);
  };

  const cameraOn = effective.cameraRequired === true;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
        <Box sx={{ width: 3, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
        <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.1em' }}>
          Exam Security
        </Typography>
      </Stack>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        select fullWidth label="Monitoring profile" disabled={disabled}
        value={profileId ?? ''}
        onChange={(e) => {
          onProfileChange(e.target.value === '' ? null : Number(e.target.value));
          // Overrides were diffs against the old baseline; keeping them would
          // silently mean something different under the new one.
          onOverridesChange({});
        }}
        helperText={selected?.description || 'Platform defaults — full browser lockdown, no camera.'}
      >
        <MenuItem value=""><em>Platform defaults</em></MenuItem>
        {profiles.map((p) => (
          <MenuItem key={p.id} value={p.id}>
            {p.label}{p.is_system ? '' : ' (school)'}
          </MenuItem>
        ))}
      </TextField>

      {cameraOn && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Students will be asked for camera access. Nothing is recorded or uploaded —
          only whether the camera stays connected. A student who denies access can
          still sit the exam; it is flagged for you to review.
        </Alert>
      )}

      <Accordion
        disableGutters elevation={0}
        sx={{ mt: 2, bgcolor: 'transparent', '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body2" fontWeight={600}>Customise individual settings</Typography>
            {Object.keys(overrides || {}).length > 0 && (
              <Chip size="small" color="primary" label={`${Object.keys(overrides).length} changed`} />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0 }}>
          <Stack spacing={2.5}>
            {GROUPS.map((group) => (
              <Box key={group.title}>
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {group.title}
                </Typography>
                <Divider sx={{ mt: 0.5, mb: 1 }} />
                {group.items.map(([key, label]) => {
                  const isOverridden = Object.prototype.hasOwnProperty.call(overrides || {}, key);
                  // Face detection has no meaning without a camera stream.
                  const itemDisabled = disabled || (key === 'facePresence' && !cameraOn);
                  return (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            size="small" disabled={itemDisabled}
                            checked={effective[key] === true}
                            onChange={(e) => setToggle(key, e.target.checked)}
                          />
                        }
                        label={<Typography variant="body2">{label}</Typography>}
                      />
                      {isOverridden && (
                        <Chip size="small" variant="outlined" label="overridden"
                          sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}

            <TextField
              type="number" size="small" label="Violations before auto-submit"
              disabled={disabled || effective.autoSubmitOnMaxViolations !== true}
              value={effective.maxViolations ?? 3}
              onChange={(e) => setToggle('maxViolations', Math.max(1, Number(e.target.value) || 1))}
              sx={{ maxWidth: 260 }}
              helperText="Counts only tab switches, lost focus and fullscreen exits."
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
