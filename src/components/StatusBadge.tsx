import React from 'react';
import { cn } from '../lib/utils';
import { IssueStatus } from '../types';

interface StatusBadgeProps {
  status: IssueStatus;
  className?: string;
}

const statusConfig: Record<IssueStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  dismissed: { label: 'Dismissed', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
};
