import React from 'react';
import { BadgeCheck, HeartHandshake } from 'lucide-react';
import { Badge } from './ui';
import { cn } from '../lib/utils';

interface SupporterBadgeProps {
  compact?: boolean;
  className?: string;
}

export function SupporterBadge({ compact = false, className }: SupporterBadgeProps) {
  if (compact) {
    return (
      <span
        className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-100 text-success-600 ring-1 ring-success-600/10', className)}
        title="Apoiador recorrente"
        aria-label="Apoiador recorrente"
      >
        <BadgeCheck size={13} />
      </span>
    );
  }

  return (
    <Badge tone="success" className={cn('gap-1.5 rounded-md px-2 py-0.5', className)}>
      <HeartHandshake size={13} />
      Apoiador
    </Badge>
  );
}
