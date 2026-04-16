
'use client';

import React, { useEffect, useMemo } from 'react';
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

    const applyTheme = () => {
      // Theme is managed by ThemeContextProvider, we only handle color settings here

      // Apply Global Layout Width regardless of theme
      if (settings?.webMaxContainerWidth) {
          root.style.setProperty('--container-width', `${settings.webMaxContainerWidth}px`);
      } else {
          // Robust default matching premium wideness
          root.style.setProperty('--container-width', '95rem'); 
      }

      // Define which CSS variables are customizable
      const customColorVars = ['--primary', '--success', '--destructive', '--background'];
      
      // Always reset body styles before applying new ones with smooth transition
      body.style.transition = 'background 0.7s ease-in-out, background-color 0.7s ease-in-out';
      body.style.backgroundImage = '';
      body.style.backgroundColor = '';
      body.style.backgroundSize = '';
      body.style.backgroundPosition = '';
      body.style.backgroundAttachment = '';

      // Apply custom colors from Firestore settings - theme is handled by ThemeContextProvider
      {
        if (settings) {
            // Accent colors
            const colors: { key: keyof Settings, cssVar: string }[] = [
                { key: 'colorPrimary', cssVar: '--primary' },
                { key: 'colorSuccess', cssVar: '--success' },
                { key: 'colorDestructive', cssVar: '--destructive' },
            ];

            colors.forEach(({ key, cssVar }) => {
                const hexValue = settings[key] as string | undefined;
                if (hexValue) {
                    root.style.setProperty(cssVar, hexToHslString(hexValue));
                } else {
                    root.style.removeProperty(cssVar);
                }
            });

            // Handle Body Background and Component --background variable
            const backgroundStyle = settings.backgroundStyle || 'solid';
    
            if (backgroundStyle === 'image' && settings.backgroundImageUrl) {
                body.style.backgroundImage = `url('${settings.backgroundImageUrl}')`;
                body.style.backgroundSize = 'cover';
                body.style.backgroundPosition = 'center';
                body.style.backgroundAttachment = 'fixed';
                // Use a slightly more transparent background for cards when an image is active
                if (settings.colorBackground) {
                    root.style.setProperty('--background', hexToHslString(settings.colorBackground));
                }
            } else if (backgroundStyle === 'gradient' && settings.backgroundGradientStart && settings.backgroundGradientEnd) {
                body.style.backgroundImage = `linear-gradient(to bottom right, ${settings.backgroundGradientStart}, ${settings.backgroundGradientEnd})`;
                body.style.backgroundAttachment = 'fixed';
                // Fallback for UI components
                root.style.setProperty('--background', hexToHslString(settings.backgroundGradientStart));
            } else if (backgroundStyle === 'solid' && settings.colorBackground) {
                // Set both body and UI background from the same source
                root.style.setProperty('--background', hexToHslString(settings.colorBackground));
                body.style.backgroundColor = settings.colorBackground;
            } else if (backgroundStyle === 'video') {
                // The video is handled by a separate component.
                body.style.backgroundColor = '#000';
                // Set the UI background color for cards, etc.
                if (settings.colorBackground) {
                    root.style.setProperty('--background', hexToHslString(settings.colorBackground));
                }
            } else {
                // No specific background setting, remove custom property to use default from CSS
                root.style.removeProperty('--background');
                // Ensure body gets the CSS variable background in dark mode
                body.style.backgroundColor = '';
            }
        } else {
            // If there are no settings, ensure all custom styles are removed to fall back to defaults.
            customColorVars.forEach(v => root.style.removeProperty(v));
            body.style.backgroundColor = '';
        }
      }
      
      // Always ensure the body uses the CSS variable background as fallback
      if (!body.style.backgroundImage) {
        body.style.backgroundColor = '';
      }
    };
    
    applyTheme();
  }, [settings]);

  return <>{children}</>;
}
