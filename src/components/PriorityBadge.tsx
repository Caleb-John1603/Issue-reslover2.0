import React from 'react';
import { cn } from '../lib/utils';
import { IssuePriority } from '../types';

interface PriorityBadgeProps {
  priority: IssuePriority;
  className?: string;
}

const priorityConfig: Record<IssuePriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  medium: { label: 'Medium', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  high: { label: 'High', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  critical: { label: 'Critical', color: 'bg-red-50 text-red-600 border-red-100' },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const config = priorityConfig[priority];
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-tight border",
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
};
