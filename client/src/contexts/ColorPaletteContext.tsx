import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ColorPalette {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  accent: {
    from: string;
    to: string;
  };
  name: string;
  description: string;
}

export const predefinedPalettes: Record<string, ColorPalette> = {
  crimson: {
    name: 'Crimson',
    description: 'Rich red tones',
    primary: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    accent: {
      from: '#fbbf24',
      to: '#f59e0b',
    },
  },
  blue: {
    name: 'Ocean Blue',
    description: 'Professional blue tones',
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    accent: {
      from: '#06b6d4',
      to: '#0891b2',
    },
  },
  emerald: {
    name: 'Emerald',
    description: 'Fresh green tones',
    primary: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    accent: {
      from: '#f59e0b',
      to: '#d97706',
    },
  },
  purple: {
    name: 'Royal Purple',
    description: 'Elegant purple tones',
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
    accent: {
      from: '#ec4899',
      to: '#db2777',
    },
  },
  orange: {
    name: 'Sunset Orange',
    description: 'Warm orange tones',
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    accent: {
      from: '#fbbf24',
      to: '#f59e0b',
    },
  },
};

interface ColorPaletteContextType {
  currentPalette: ColorPalette;
  setPalette: (paletteKey: string) => void;
  availablePalettes: Record<string, ColorPalette>;
  customPalette: ColorPalette | null;
  setCustomPalette: (palette: ColorPalette) => void;
}

const ColorPaletteContext = createContext<ColorPaletteContextType | undefined>(undefined);

export function ColorPaletteProvider({ children }: { children: React.ReactNode }) {
  const [currentPaletteKey, setCurrentPaletteKey] = useState<string>('crimson');
  const [customPalette, setCustomPalette] = useState<ColorPalette | null>(null);

  // Load saved palette from localStorage
  useEffect(() => {
    const savedPalette = localStorage.getItem('colorPalette');
    const savedCustomPalette = localStorage.getItem('customColorPalette');
    
    if (savedPalette) {
      setCurrentPaletteKey(savedPalette);
    }
    
    if (savedCustomPalette) {
      setCustomPalette(JSON.parse(savedCustomPalette));
    }
  }, []);

  const setPalette = (paletteKey: string) => {
    setCurrentPaletteKey(paletteKey);
    localStorage.setItem('colorPalette', paletteKey);
    
    // Apply CSS custom properties
    const palette = paletteKey === 'custom' && customPalette ? customPalette : predefinedPalettes[paletteKey];
    if (palette) {
      applyPaletteToCSS(palette);
    }
  };

  const setCustomPaletteAndApply = (palette: ColorPalette) => {
    setCustomPalette(palette);
    localStorage.setItem('customColorPalette', JSON.stringify(palette));
    
    if (currentPaletteKey === 'custom') {
      applyPaletteToCSS(palette);
    }
  };

  const applyPaletteToCSS = (palette: ColorPalette) => {
    const root = document.documentElement;
    Object.entries(palette.primary).forEach(([shade, color]) => {
      root.style.setProperty(`--color-primary-${shade}`, color);
    });
    root.style.setProperty(`--color-accent-from`, palette.accent.from);
    root.style.setProperty(`--color-accent-to`, palette.accent.to);
  };

  // Apply palette on mount and when palette changes
  useEffect(() => {
    const palette = currentPaletteKey === 'custom' && customPalette ? customPalette : predefinedPalettes[currentPaletteKey];
    if (palette) {
      applyPaletteToCSS(palette);
    }
  }, [currentPaletteKey, customPalette]);

  const currentPalette = currentPaletteKey === 'custom' && customPalette ? customPalette : predefinedPalettes[currentPaletteKey];

  return (
    <ColorPaletteContext.Provider
      value={{
        currentPalette,
        setPalette,
        availablePalettes: predefinedPalettes,
        customPalette,
        setCustomPalette: setCustomPaletteAndApply,
      }}
    >
      {children}
    </ColorPaletteContext.Provider>
  );
}

export function useColorPalette() {
  const context = useContext(ColorPaletteContext);
  if (context === undefined) {
    throw new Error('useColorPalette must be used within a ColorPaletteProvider');
  }
  return context;
}
