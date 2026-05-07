"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="cursor-pointer"
    >
      {mounted && resolvedTheme === "dark" ? (
        <Moon className="size-5 text-accent" />
      ) : (
        <Sun className="size-5 text-warning" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
