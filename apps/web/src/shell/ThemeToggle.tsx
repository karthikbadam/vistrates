import { useEffect, useState, type JSX } from 'react';

type Theme = 'dark' | 'light';
type Density = 'comfy' | 'compact';

const STORAGE_KEY = 'vistrates.theme';

interface ThemePref {
  readonly theme: Theme;
  readonly density: Density;
}

const DEFAULT: ThemePref = { theme: 'dark', density: 'comfy' };

function load(): ThemePref {
  if (typeof localStorage === 'undefined') return DEFAULT;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemePref>;
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      density: parsed.density === 'compact' ? 'compact' : 'comfy',
    };
  } catch {
    return DEFAULT;
  }
}

function save(pref: ThemePref): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
}

function apply(pref: ThemePref): void {
  const root = document.documentElement;
  root.dataset['theme'] = pref.theme;
  root.dataset['density'] = pref.density;
}

export function ThemeToggle(): JSX.Element {
  const [pref, setPref] = useState<ThemePref>(load);

  useEffect(() => {
    apply(pref);
    save(pref);
  }, [pref]);

  return (
    <div className="theme-toggle">
      <button
        type="button"
        title="Toggle light/dark"
        onClick={() =>
          setPref((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))
        }
      >
        {pref.theme === 'dark' ? '☾' : '☀︎'}
      </button>
      <button
        type="button"
        title="Toggle density"
        onClick={() =>
          setPref((p) => ({ ...p, density: p.density === 'comfy' ? 'compact' : 'comfy' }))
        }
      >
        {pref.density === 'comfy' ? '◉' : '◎'}
      </button>
    </div>
  );
}
