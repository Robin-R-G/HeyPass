'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  backgroundStyle: 'gradient' | 'solid' | 'animated';
  glassEffect: boolean;
  animations: boolean;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#FCA311',
  accentColor: '#E5E5E5',
  backgroundStyle: 'gradient',
  glassEffect: true,
  animations: true,
};

interface ThemeContextType {
  theme: ThemeConfig;
  updateTheme: (updates: Partial<ThemeConfig>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  useEffect(() => {
    const saved = localStorage.getItem('heypass-theme');
    if (saved) {
      try {
        setTheme(JSON.parse(saved));
      } catch {
        localStorage.removeItem('heypass-theme');
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--hp-primary', theme.primaryColor);
    root.style.setProperty('--hp-primary-glow', `${theme.primaryColor}66`);
    root.style.setProperty('--hp-accent', theme.accentColor);
    root.style.setProperty('--hp-gradient-start', theme.primaryColor);
    root.style.setProperty('--hp-gradient-end', theme.accentColor);

    if (!theme.animations) {
      root.classList.add('hp-no-animations');
    } else {
      root.classList.remove('hp-no-animations');
    }

    localStorage.setItem('heypass-theme', JSON.stringify(theme));
  }, [theme]);

  const updateTheme = (updates: Partial<ThemeConfig>) => {
    setTheme((prev) => ({ ...prev, ...updates }));
  };

  const resetTheme = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('heypass-theme');
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
