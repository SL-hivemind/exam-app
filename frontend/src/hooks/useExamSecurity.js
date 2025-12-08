import { useEffect } from 'react';

export default function useExamSecurity(isActive, onViolation) {
  useEffect(() => {
    if (!isActive) return;

    // 1. Disable Right Click
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // 2. Disable Copy/Cut/Paste
    const handleCopyPaste = (e) => {
      e.preventDefault();
      alert("Copy/Paste is disabled during the exam.");
    };

    // 3. Disable Keyboard Shortcuts (F12, Ctrl+C, Ctrl+V, Alt+Tab attempt)
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 's' || e.key === 'p')) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 4. Detect Tab Switching / Visibility Change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Trigger a warning or penalty
        if (onViolation) onViolation("tab_switch");
      }
    };

    // 5. Prevent accidental back button / refresh
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // Most modern browsers show a generic message, custom text is ignored for security
      e.returnValue = 'You have an active exam. Leaving will submit it.'; 
      return e.returnValue;
    };

    // Add Listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, onViolation]);
}