'use client';

interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'uploading' | 'cancelled';
  size?: 'sm' | 'md';
}

const statusConfig = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
  },
  uploading: {
    label: 'Uploading',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  processing: {
    label: 'Processing',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  completed: {
    label: 'Completed',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  failed: {
    label: 'Failed',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-0.5 text-sm';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-medium ${config.bgColor} ${config.textColor}`}>
      <span className="mr-1.5 flex-shrink-0">
        {config.icon}
      </span>
      {config.label}
    </span>
  );
}
