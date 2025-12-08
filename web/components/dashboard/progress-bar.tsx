'use client';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  indeterminate?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function ProgressBar({
  progress,
  size = 'md',
  showLabel = false,
  indeterminate = false,
  className = '',
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const sizeClasses = {
    sm: {
      container: 'h-1',
      bar: 'h-1',
      text: 'text-xs',
    },
    md: {
      container: 'h-2',
      bar: 'h-2',
      text: 'text-sm',
    },
    lg: {
      container: 'h-3',
      bar: 'h-3',
      text: 'text-base',
    },
  };

  const currentSize = sizeClasses[size];

  const getProgressColor = (progress: number) => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-yellow-500';
    if (progress < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${currentSize.container}`}>
        <div
          className={`rounded-full transition-all duration-300 ease-out ${currentSize.bar} ${
            indeterminate
              ? 'bg-blue-500 animate-pulse'
              : getProgressColor(clampedProgress)
          }`}
          style={{
            width: indeterminate ? '100%' : `${clampedProgress}%`,
            transform: indeterminate ? 'translateX(-100%)' : 'none',
            animation: indeterminate ? 'shimmer 1.5s ease-in-out infinite' : undefined,
          }}
        />
      </div>
      {showLabel && (
        <div className={`mt-1 text-center ${currentSize.text} text-gray-600`}>
          {indeterminate ? 'Processing...' : `${clampedProgress}%`}
        </div>
      )}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
