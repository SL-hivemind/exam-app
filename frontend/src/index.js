import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

const container = document.getElementById("root");

const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Public routes are prerendered to static HTML at build time (see
// scripts/prerender.js), so crawlers — and slow connections — get real content
// in the first response instead of an empty #root. Adopt that markup rather
// than throwing it away and painting the same thing again.
if (document.documentElement.dataset.prerendered && container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, tree);
} else {
  ReactDOM.createRoot(container).render(tree);
}

// ── Dismiss the HTML splash once React has painted ──────────────
requestAnimationFrame(() => {
  const splash = document.getElementById("sl-splash");
  if (splash) {
    // Let the full intro play (labels blow out ~0.5s + pull back ~1.85s)
    const MIN_SPLASH_MS = 2200;
    const elapsed = performance.now();
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(() => {
      splash.classList.add("splash-hidden");
      // Remove after fade-out transition completes
      splash.addEventListener("transitionend", () => splash.remove(), { once: true });
    }, wait);
  }
});
