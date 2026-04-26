import type { JSX } from 'react';
import { activeDemo, demos } from '../defaultDoc.js';

/**
 * Switch demos via URL `?demo=...` and reload. Reloading is the simplest way
 * to fully tear down the runtime + DocStore so the new demo's controllers
 * boot cleanly.
 */
export function DemoPicker(): JSX.Element {
  const onChange = (id: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', id);
    window.location.href = url.toString();
  };

  return (
    <div className="demo-picker">
      <label htmlFor="demo-select">Demo</label>
      <select
        id="demo-select"
        value={activeDemo.id}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        {demos.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title}
          </option>
        ))}
      </select>
    </div>
  );
}
