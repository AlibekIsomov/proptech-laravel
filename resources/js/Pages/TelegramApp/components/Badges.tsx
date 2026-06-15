import type { RequestPriority, RequestStatus } from '../types';

export const STATUS_COLOR: Record<RequestStatus, { bg: string; text: string }> = {
  open: { bg: 'rgba(251,191,36,0.15)', text: '#b45309' },
  assigned: { bg: 'rgba(168,85,247,0.15)', text: '#7c3aed' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', text: '#2563eb' },
  completed: { bg: 'rgba(16,185,129,0.15)', text: '#0d9488' },
  cancelled: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
};

export const PRIORITY_COLOR: Record<RequestPriority, { bg: string; text: string }> = {
  emergency: { bg: 'rgba(239,68,68,0.15)', text: '#dc2626' },
  high: { bg: 'rgba(251,146,60,0.15)', text: '#ea580c' },
  medium: { bg: 'rgba(59,130,246,0.15)', text: '#2563eb' },
  low: { bg: 'rgba(100,116,139,0.12)', text: '#64748b' },
};

export function StatusBadge({ status, label }: { status: RequestStatus; label: string }) {
  const c = STATUS_COLOR[status] ?? STATUS_COLOR.open;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {label}
    </span>
  );
}

export function PriorityBadge({ priority, label }: { priority: RequestPriority; label: string }) {
  const c = PRIORITY_COLOR[priority] ?? PRIORITY_COLOR.medium;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {label}
    </span>
  );
}
