
'use client';

import { useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Settings } from '@/lib/types';
import { hexToHslString } from '@/lib/color-utils';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settings } = useDoc<Settings>(settingsRef);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;

    // Apply light/dark theme class
    const theme = settings?.theme || 'system';
    const applyThemeClass = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };
    applyThemeClass();

    // Apply custom colors
    if (settings) {
        // Handle solid colors
        const colors: (keyof Settings)[] = ['colorPrimary', 'colorSuccess', 'colorDestructive'];
        const cssVarMap = {
            colorPrimary: '--primary',
            colorSuccess: '--success',
            colorDestructive: '--destructive'
        };

        colors.forEach(colorKey => {
            const cssVar = cssVarMap[colorKey as keyof typeof cssVarMap];
            const hexValue = settings[colorKey] as string | undefined;
            if (hexValue) {
                root.style.setProperty(cssVar, hexToHslString(hexValue));
            } else {
                root.style.removeProperty(cssVar);
            }
        });

        // Handle background
        if (settings.useBackgroundGradient && settings.backgroundGradientStart && settings.backgroundGradientEnd) {
            body.style.backgroundImage = `linear-gradient(to bottom right, ${settings.backgroundGradientStart}, ${settings.backgroundGradientEnd})`;
            // For popovers, cards etc., we might want a solid fallback. Using the start of the gradient.
            root.style.setProperty('--background', hexToHslString(settings.backgroundGradientStart));
        } else {
            body.style.backgroundImage = '';
            if (settings.colorBackground) {
                root.style.setProperty('--background', hexToHslString(settings.colorBackground));
            } else {
                root.style.removeProperty('--background');
            }
        }

    } else {
      // Reset all custom properties if no settings are found
      const cssVars = ['--primary', '--success', '--destructive', '--background'];
      cssVars.forEach(v => root.style.removeProperty(v));
      body.style.backgroundImage = '';
    }


    // Add listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyThemeClass();
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [settings]);

  return <>{children}</>;
}

