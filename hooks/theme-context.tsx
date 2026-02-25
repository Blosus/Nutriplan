import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type ThemeType = "dark" | "light";

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
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = (await AsyncStorage.getItem("@theme")) as ThemeType | null;
      if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("@theme", newTheme);
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
