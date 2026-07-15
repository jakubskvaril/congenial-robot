'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface Option<T extends string> {
  value: T;
  label: string;
  description: string;
  icon?: LucideIcon;
}

export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const colClass = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[columns];

  return (
    <div className={cn('grid grid-cols-2 gap-3', colClass)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition-colors',
              active ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20',
            )}
          >
            <div className="flex items-center gap-2">
              {opt.icon && <opt.icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />}
              <span className="font-medium">{opt.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{opt.description}</p>
          </button>
        );
      })}
    </div>
  );
}
