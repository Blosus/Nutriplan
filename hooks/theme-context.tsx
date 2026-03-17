import { auth } from "@/services/firebase";
import {
  ensureUserSettingsInitialized,
  saveUserThemePreference,
  type AppThemePreference,
} from "@/services/user-settings";
import { onAuthStateChanged } from "firebase/auth";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type ThemeType = AppThemePreference;

export interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  border: string;
  error: string;
}

export const themes: Record<ThemeType, Theme> = {
  dark: {
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFF8E1",
    textSecondary: "#FFD54F",
    accent: "#FFD54F",
    border: "#333333",
    error: "#FF5252",
  },
  light: {
    background: "#FFFFFF",
    surface: "#F5F5F5",
    text: "#000000",
    textSecondary: "#666666",
    accent: "#000000",
    border: "#E0E0E0",
    error: "#D32F2F",
  },
};

interface ThemeContextType {
  theme: ThemeType;
  colors: Theme;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setTheme("dark");
          return;
        }

        const settings = await ensureUserSettingsInitialized(firebaseUser.uid);
        setTheme(settings.theme);
      } catch (error) {
        console.error("Error loading theme:", error);
        setTheme("dark");
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    if (!auth.currentUser) {
      return;
    }

    try {
      await saveUserThemePreference(auth.currentUser.uid, newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: themes[theme],
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
