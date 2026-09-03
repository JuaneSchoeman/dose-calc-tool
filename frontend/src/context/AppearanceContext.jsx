// src/context/AppearanceContext.jsx
//
// Drives the page background. Two modes:
//   'clinical' - the original flat #EEF7F9 background (unchanged look)
//   'dynamic'  - a seamless tiled pattern matched to the selected clinical
//                category, per the lecturer's request
//
// The mode is a user preference (persisted in localStorage, defaults to
// 'clinical' so nothing changes for anyone until they opt in). The
// category is shared app-wide so the background can react as soon as the
// user changes the category dropdown on the Calculator page, without
// having to submit a calculation first.

import { createContext, useContext, useEffect, useState } from 'react';

const AppearanceContext = createContext(null);

const STORAGE_KEY = 'doseCalc.bgMode';
const CLINICAL_BG = '#eef7f9';

// Maps each clinical category (must match the CATEGORIES array in
// backend/src/routes/calc.js) to its tile image under /public/backgrounds.
// Add the matching file there when you have the tile ready; until a file
// exists for a category the app quietly falls back to the 'General' tile.
const CATEGORY_TILE_SLUGS = {
  General: 'general',
  'Adult Medical/Surgical': 'adult-medical-surgical',
  Oncology: 'oncology',
  'Outpatient/Ambulatory': 'outpatient-ambulatory',
  'Intensive Care': 'intensive-care',
  'Emergency Department': 'emergency-department',
  Paediatrics: 'paediatrics',
  Pharmacy: 'pharmacy',
};

function tileUrlFor(category) {
  const slug = CATEGORY_TILE_SLUGS[category] || CATEGORY_TILE_SLUGS.General;
  return `/backgrounds/${slug}.png`;
}

export function AppearanceProvider({ children }) {
  const [bgMode, setBgMode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'dynamic' ? 'dynamic' : 'clinical';
    } catch {
      return 'clinical';
    }
  });

  // 'General' until the user picks a category on the Calculator page.
  const [category, setCategory] = useState('General');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, bgMode);
    } catch {
      /* localStorage unavailable (private browsing etc.) - preference just
         won't persist across reloads; not worth surfacing an error for. */
    }
  }, [bgMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (bgMode === 'dynamic') {
      root.style.setProperty('--app-bg-color', 'var(--color-bg)');
      root.style.setProperty('--app-bg-image', `url(${tileUrlFor(category)})`);
    } else {
      root.style.setProperty('--app-bg-color', CLINICAL_BG);
      root.style.setProperty('--app-bg-image', 'none');
    }
  }, [bgMode, category]);

  const toggleBgMode = () => setBgMode((m) => (m === 'dynamic' ? 'clinical' : 'dynamic'));

  return (
    <AppearanceContext.Provider value={{ bgMode, setBgMode, toggleBgMode, category, setCategory }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return ctx;
}
