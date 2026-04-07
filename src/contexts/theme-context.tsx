'use client';

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes"

export function ThemeContextProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// Keep the same export signature for downward compatibility
export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return { 
    theme: theme as 'light' | 'dark' | 'system', 
    resolvedTheme: (theme === 'system' ? systemTheme : theme) as 'light' | 'dark',
    toggleTheme, 
    setTheme 
  };
}
