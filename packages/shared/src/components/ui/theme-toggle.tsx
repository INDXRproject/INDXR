"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="cursor-pointer relative overflow-hidden"
    >
      <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-warning" />
      <Moon className="absolute inset-0 m-auto size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-accent" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
