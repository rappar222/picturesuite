import { useState, useEffect } from "react";
import { ThemeMode } from "../types";

export function useTheme() {
  const [themePreference, setThemePreference] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem("picturesuite_theme") as ThemeMode | null;
      if (stored === "system" || stored === "light" || stored === "dark") {
        return stored;
      }
    } catch {
      // ignore
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("picturesuite_theme");
        if (stored === "light" || stored === "dark") return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } catch {
        // fallback
      }
    }
    return "dark";
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolved = () => {
      const systemDark = mediaQuery.matches;
      const effective = themePreference === "system" ? (systemDark ? "dark" : "light") : themePreference;
      setResolvedTheme(effective);
      document.documentElement.setAttribute("data-theme", effective);
      document.body.setAttribute("data-theme", effective);
    };

    updateResolved();

    const handleChange = () => {
      if (themePreference === "system") {
        updateResolved();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themePreference]);

  const setTheme = (mode: ThemeMode) => {
    setThemePreference(mode);
    try {
      localStorage.setItem("picturesuite_theme", mode);
    } catch {
      // ignore
    }
  };

  const cycleTheme = () => {
    if (themePreference === "system") {
      setTheme("dark");
    } else if (themePreference === "dark") {
      setTheme("light");
    } else {
      setTheme("system");
    }
  };

  return { themePreference, resolvedTheme, setTheme, cycleTheme };
}
