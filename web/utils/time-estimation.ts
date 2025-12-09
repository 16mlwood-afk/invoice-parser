import { FileProcessingStatus } from '@/types/processing';

export function estimateCompletionTime(files: FileProcessingStatus[]): Date | null {
  const activeFiles = files.filter(file =>
    file.status === 'processing' || file.status === 'pending',
  );

  if (activeFiles.length === 0) {
    return null;
  }

  const completedFiles = files.filter(file =>
    file.status === 'completed' && file.startedAt && file.completedAt,
  );

  if (completedFiles.length === 0) {
    // No historical data, estimate based on typical processing time
    const typicalProcessingTimeMs = 30000; // 30 seconds per file
    const remainingFiles = activeFiles.length;
    return new Date(Date.now() + (remainingFiles * typicalProcessingTimeMs));
  }

  // Calculate average processing time from completed files
  const processingTimes = completedFiles.map(file => {
    if (file.startedAt && file.completedAt) {
      return new Date(file.completedAt).getTime() - new Date(file.startedAt).getTime();
    }
    return 0;
  }).filter(time => time > 0);

  if (processingTimes.length === 0) {
    return null;
  }

  const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;

  // Calculate remaining work
  const processingFiles = activeFiles.filter(file => file.status === 'processing');
  const pendingFiles = activeFiles.filter(file => file.status === 'pending');

  // Estimate time for currently processing files
  const processingTimeRemaining = processingFiles.reduce((total, file) => {
    const progress = file.progress / 100;
    const timeElapsed = file.startedAt
      ? Date.now() - new Date(file.startedAt).getTime()
      : avgProcessingTime * progress;
    const estimatedTotalTime = timeElapsed / Math.max(progress, 0.01);
    return total + Math.max(0, estimatedTotalTime - timeElapsed);
  }, 0);

  // Estimate time for pending files
  const pendingTime = pendingFiles.length * avgProcessingTime;

  const totalEstimatedMs = processingTimeRemaining + pendingTime;

  // Add some buffer for variability (20%)
  const bufferedTimeMs = totalEstimatedMs * 1.2;

  return new Date(Date.now() + bufferedTimeMs);
}

export function formatTimeRemaining(targetDate: Date): string {
  const now = Date.now();
  const target = targetDate.getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return 'Complete';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (diffMinutes > 0) {
    return `${diffMinutes}m ${diffSeconds}s remaining`;
  } else {
    return `${diffSeconds}s remaining`;
  }
}

export function formatEstimatedCompletion(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Complete';
  }

  // If within next 5 minutes, show relative time
  if (diffMs < 5 * 60 * 1000) {
    return formatTimeRemaining(date);
  }

  // Otherwise show absolute time
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    // Future date
    return date.toLocaleString();
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return diffSeconds <= 1 ? 'just now' : `${diffSeconds} seconds ago`;
  }

  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  }

  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (diffDays === 1) {
    return `yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // For older dates, show the date
  return date.toLocaleDateString();
}

export function formatDuration(startDate: Date, endDate: Date): string {
  const diffMs = endDate.getTime() - startDate.getTime();

  if (diffMs <= 0) {
    return '0s';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
  }

  if (diffMinutes > 0) {
    const remainingSeconds = diffSeconds % 60;
    return remainingSeconds > 0 ? `${diffMinutes}m ${remainingSeconds}s` : `${diffMinutes}m`;
  }

  return `${diffSeconds}s`;
}

export function groupJobsByTimePeriod(jobs: any[]): Record<string, any[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: Record<string, any[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Older': []
  };

  jobs.forEach(job => {
    const jobDate = new Date(job.startedAt);
    const jobDateOnly = new Date(jobDate.getFullYear(), jobDate.getMonth(), jobDate.getDate());

    if (jobDateOnly.getTime() === today.getTime()) {
      groups['Today'].push(job);
    } else if (jobDateOnly.getTime() === yesterday.getTime()) {
      groups['Yesterday'].push(job);
    } else if (jobDate >= thisWeek) {
      groups['This Week'].push(job);
    } else if (jobDate >= thisMonth) {
      groups['This Month'].push(job);
    } else {
      groups['Older'].push(job);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

export function calculateProcessingStats(jobs: any[]): {
  avgProcessingTimePerFile: number;
  totalFilesProcessed: number;
  avgJobDuration: number;
  fastestJob: any | null;
  slowestJob: any | null;
} {
  const completedJobs = jobs.filter(job =>
    job.status === 'completed' && job.completedAt && job.startedAt
  );

  if (completedJobs.length === 0) {
    return {
      avgProcessingTimePerFile: 0,
      totalFilesProcessed: 0,
      avgJobDuration: 0,
      fastestJob: null,
      slowestJob: null
    };
  }

  const totalDuration = completedJobs.reduce((sum, job) => {
    return sum + (job.completedAt.getTime() - job.startedAt.getTime());
  }, 0);

  const totalFiles = completedJobs.reduce((sum, job) => sum + job.progress.total, 0);

  // Find fastest and slowest jobs
  let fastestJob = completedJobs[0];
  let slowestJob = completedJobs[0];

  completedJobs.forEach(job => {
    const jobDuration = job.completedAt.getTime() - job.startedAt.getTime();
    const fastestDuration = fastestJob.completedAt.getTime() - fastestJob.startedAt.getTime();
    const slowestDuration = slowestJob.completedAt.getTime() - slowestJob.startedAt.getTime();

    if (jobDuration < fastestDuration) fastestJob = job;
    if (jobDuration > slowestDuration) slowestJob = job;
  });

  return {
    avgProcessingTimePerFile: totalDuration / totalFiles,
    totalFilesProcessed: totalFiles,
    avgJobDuration: totalDuration / completedJobs.length,
    fastestJob,
    slowestJob
  };
}

export function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
