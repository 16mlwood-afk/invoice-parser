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
