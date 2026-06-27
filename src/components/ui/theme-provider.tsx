'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: 'gradient' | 'solid' | 'animated';
  glassEffect: boolean;
  animations: boolean;
  mode: 'dark' | 'light';
}

interface ThemeContextValue {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
  toggleMode: () => void;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#6366F1',
  accentColor: '#2563EB',
  backgroundStyle: 'solid',
  glassEffect: true,
  animations: true,
  mode: 'dark',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('heypass-theme');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTheme(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;

    // Apply mode
    root.classList.remove('dark', 'light');
    root.classList.add(theme.mode);

    // Set data-theme attribute
    root.setAttribute('data-theme', theme.mode);

    // Apply custom colors if they differ from defaults
    if (theme.primaryColor !== DEFAULT_THEME.primaryColor) {
      root.style.setProperty('--hp-primary', theme.primaryColor);
      root.style.setProperty('--hp-primary-glow', `${theme.primaryColor}40`);
    }
    if (theme.accentColor !== DEFAULT_THEME.accentColor) {
      root.style.setProperty('--hp-accent', theme.accentColor);
    }

    // Apply animations toggle
    if (!theme.animations) {
      root.classList.add('hp-no-animations');
    } else {
      root.classList.remove('hp-no-animations');
    }

    // Save to localStorage
    try {
      localStorage.setItem('heypass-theme', JSON.stringify(theme));
    } catch { /* ignore */ }
  }, [theme]);

  const updateTheme = useCallback((updates: Partial<ThemeConfig>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
    const root = document.documentElement;
    root.style.removeProperty('--hp-primary');
    root.style.removeProperty('--hp-primary-glow');
    root.style.removeProperty('--hp-accent');
    try { localStorage.removeItem('heypass-theme'); } catch { /* ignore */ }
  }, []);

  const toggleMode = useCallback(() => {
    setTheme(prev => ({
      ...prev,
      mode: prev.mode === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const value = useMemo(() => ({
    theme,
    updateTheme,
    resetTheme,
    toggleMode,
  }), [theme, updateTheme, resetTheme, toggleMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
