
import React from 'react';

type StatusType = 'tour' | 'issue' | 'expense' | 'float';

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'tour' }) => {
  const getStyles = () => {
    const s = status.toUpperCase();
    switch (s) {
      case 'ACTIVE':
      case 'APPROVED':
      case 'DONE':
      case 'OPEN':
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'CLOSED':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PLANNED':
      case 'SCHEDULED':
      case 'PENDING':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'UNASSIGNED':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'CANCELLED':
      case 'REJECTED':
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'IN_PROGRESS':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyles()}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default StatusBadge;
