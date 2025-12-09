// API endpoint for checking job status
const ProcessingAPI = require('./processing');

// Initialize processing API
const processingAPI = new ProcessingAPI();

/**
 * Transform backend job status to match frontend expectations
 */
function transformStatusForFrontend(job) {
  // Calculate overall progress percentage
  const totalFiles = job.files.length;
  const processedFiles = job.results.length;
  const percentage = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

  // Transform files to include processing status
  const files = job.files.map(file => {
    const result = job.results.find(r => r.filename === file.filename);
    let status = 'pending';
    let progress = 0;
    let error = null;
    let startedAt = null;
    let completedAt = null;

    if (result) {
      if (result.success) {
        status = 'completed';
        progress = 100;
        completedAt = result.processedAt;
      } else {
        status = 'failed';
        error = result.error;
        completedAt = result.processedAt;
      }
      startedAt = file.uploadedAt; // Use upload time as start time
    } else if (job.status === 'processing') {
      status = 'processing';
      progress = Math.floor(Math.random() * 80) + 10; // Mock progress for demo
      startedAt = file.uploadedAt;
    } else if (job.status === 'uploading') {
      status = 'pending';
    }

    return {
      filename: file.filename,
      status,
      progress,
      error,
      startedAt,
      completedAt
    };
  });

  // Calculate estimated completion time
  const activeFiles = files.filter(f => f.status === 'processing');
  let estimatedCompletion = null;
  if (activeFiles.length > 0 && processedFiles > 0) {
    const avgProcessingTime = 30000; // 30 seconds per file (mock)
    const remainingFiles = activeFiles.length;
    estimatedCompletion = new Date(Date.now() + (remainingFiles * avgProcessingTime));
  }

  return {
    jobId: job.id,
    status: job.status,
    progress: {
      total: totalFiles,
      completed: job.progress.successful,
      failed: job.progress.failed,
      percentage
    },
    files,
    estimatedCompletion,
    startedAt: job.created,
    completedAt: job.completed
  };
}

module.exports = (app) => {
  // GET /api/status - Get all jobs with their status
  app.get('/api/status', async (req, res) => {
    try {
      // Get all jobs from the processing API
      const allJobs = processingAPI.getAllJobs().map(job => {
        // Transform each job to frontend format
        const totalFiles = job.files.length;
        const processedFiles = job.results.length;
        const percentage = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

        return {
          id: job.id,
          status: job.status,
          created: job.created,
          completed: job.completed,
          progress: {
            total: totalFiles,
            completed: job.results.filter(r => r.success).length,
            failed: job.results.filter(r => !r.success).length,
            percentage
          },
          files: job.files.map(f => ({
            filename: f.filename,
            status: job.results.find(r => r.filename === f.filename)
              ? (job.results.find(r => r.filename === f.filename).success ? 'completed' : 'failed')
              : (job.status === 'processing' ? 'processing' : 'pending')
          }))
        };
      });

      // Sort by creation date (newest first)
      allJobs.sort((a, b) => new Date(b.created) - new Date(a.created));

      res.status(200).json({
        success: true,
        data: allJobs
      });

    } catch (error) {
      console.error('Failed to fetch all jobs:', error);
      res.status(500).json({
        error: 'Failed to fetch jobs',
        message: error.message
      });
    }
  });

  // GET /api/status/:jobId - Get job processing status
  app.get('/api/status/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;

      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Get job status
      const job = processingAPI.getJobStatus(jobId);

      res.status(200).json({
        success: true,
        job: job
      });

    } catch (error) {
      console.error('Status check error:', error);

      if (error.message === 'Job not found') {
        return res.status(404).json({
          error: 'Job not found',
          message: 'The specified job ID does not exist'
        });
      }

      res.status(500).json({
        error: 'Status check failed',
        message: error.message
      });
    }
  });

  // POST /api/status/:jobId/cancel - Cancel a processing job
  app.post('/api/status/:jobId/cancel', async (req, res) => {
    try {
      const { jobId } = req.params;

      // Validate jobId format
      if (!jobId || !jobId.startsWith('job_')) {
        return res.status(400).json({
          error: 'Invalid job ID',
          message: 'Job ID must be provided and start with "job_"'
        });
      }

      // Cancel the job
      const result = processingAPI.cancelJob(jobId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Job cancellation error:', error);

      if (error.message === 'Job not found') {
        return res.status(404).json({
          error: 'Job not found',
          message: 'The specified job ID does not exist'
        });
      }

      res.status(500).json({
        error: 'Cancellation failed',
        message: error.message
      });
    }
  });
};