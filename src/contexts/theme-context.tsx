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
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// Keep the same export signature for downward compatibility
export function useTheme() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme();
  
  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    }
  };

  return { 
    theme: theme as 'light' | 'dark' | 'system', 
    resolvedTheme: resolvedTheme as 'light' | 'dark',
    toggleTheme, 
    setTheme 
  };
}
