import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(v => !v)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/60 dark:bg-slate-900/60 backdrop-blur hover:shadow transition"
      title={dark ? 'Passer en clair' : 'Passer en sombre'}
    >
      {dark ? <Sun size={16}/> : <Moon size={16}/>}
      <span className="text-sm">{dark ? 'Clair' : 'Sombre'}</span>
    </button>
  );
}
