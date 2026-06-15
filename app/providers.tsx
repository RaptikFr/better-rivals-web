"use client";

import { ThemeProvider } from 'next-themes';
import { PreferencesProvider } from '@/hooks/usePreferences';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <PreferencesProvider>{children}</PreferencesProvider>
    </ThemeProvider>
  );
}
