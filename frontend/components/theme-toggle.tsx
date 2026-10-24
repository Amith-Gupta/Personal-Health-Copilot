"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t === "dark");
  }, []);
  function flip() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setDark(!dark);
  }
  return (
    <button onClick={flip} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-fg-2 transition-colors hover:bg-hover hover:text-fg">
      {dark ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
    </button>
  );
}
