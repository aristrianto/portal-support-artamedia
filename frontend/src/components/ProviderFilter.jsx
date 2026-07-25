import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Filter } from 'lucide-react';

/**
 * ProviderFilter — auto-detected chip buttons from a list of records.
 * Props:
 *  - items: array of records
 *  - getProvider: (item) => string | null  (return provider display name)
 *  - value: currently selected provider ('all' or a specific name)
 *  - onChange: (name) => void
 *  - testKey: string used for data-testid
 */
export default function ProviderFilter({ items = [], getProvider, value = 'all', onChange, testKey = 'provider' }) {
  const providers = useMemo(() => {
    const set = new Map();
    items.forEach((it) => {
      const name = getProvider(it);
      if (!name) return;
      set.set(name, (set.get(name) || 0) + 1);
    });
    return Array.from(set.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items, getProvider]);

  if (providers.length === 0) return null;

  const totalNoProv = items.filter((i) => !getProvider(i)).length;

  return (
    <div className="flex items-start gap-2 flex-wrap py-1">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground pt-1 pr-1 shrink-0">
        <Filter className="w-3 h-3" /> Provider
      </div>
      <button
        onClick={() => onChange('all')}
        data-testid={`${testKey}-filter-all`}
        className={cn(
          'text-xs px-2.5 py-1 rounded-full border transition-colors',
          value === 'all'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background border-border text-foreground hover:bg-accent'
        )}
      >
        Semua <span className="opacity-70 tabular-nums">· {items.length}</span>
      </button>
      {providers.map(([name, cnt]) => (
        <button
          key={name}
          onClick={() => onChange(name)}
          data-testid={`${testKey}-filter-${name.toLowerCase().replace(/\s+/g, '-')}`}
          className={cn(
            'text-xs px-2.5 py-1 rounded-full border transition-colors',
            value === name
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-foreground hover:bg-accent'
          )}
        >
          {name} <span className="opacity-70 tabular-nums">· {cnt}</span>
        </button>
      ))}
      {totalNoProv > 0 && (
        <button
          onClick={() => onChange('__none__')}
          data-testid={`${testKey}-filter-none`}
          className={cn(
            'text-xs px-2.5 py-1 rounded-full border transition-colors',
            value === '__none__'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border text-muted-foreground hover:bg-accent'
          )}
        >
          Tanpa Provider <span className="opacity-70 tabular-nums">· {totalNoProv}</span>
        </button>
      )}
    </div>
  );
}
